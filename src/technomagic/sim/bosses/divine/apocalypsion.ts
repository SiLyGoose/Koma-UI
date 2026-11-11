import { NONE, type BossStats } from '../../combat/damage';
import { put } from '../../combat/status';
import { stateArt, type Buff } from '../../shown';
import type { Fight, Fighter } from '../../types';
import type { BossDef, BossPart } from '../boss';
import { addStacks, reachable } from '../dragon/common';
import { kitOf, kitPart, timer, type Skill } from './kit';
import { infiniteStages } from './levels';

/*
 * The Apocalypsion group's final boss dungeon (King's Raid's Raid 1005, chapter 70000's dungeon 5: 180 seconds): one fight
 * against two. Its first wave is Tersio, the Deranged Dragon (60001); at 1% of his health he is gone (his wave skill 5006159:
 * RaiseEventTrigger, Die) and its second, Apocalypsion, Calamity of Destruction (60002), comes in his place, the raid's time
 * running on. Both deal M.DMG, with King's Raid's own numbers at Infinite level 1 (KR-extracted/briefs/divine-punishment.md
 * §3.2: health, ATK, DEF; grown by the level: ./levels.ts), their star-grade lookup 442's 400 penetration, and their Complete
 * Form and Unblemished Form: no CC holds them, their DEF is their own whatever is put on them, their blows always hit, and
 * Tersio's crit resistance is 100% (hers, her crit chance 40% higher). Their kits are stand-ins (./kit.ts), each of its main
 * skills as King's Raid names it:
 * - Tersio: Firstborn, his plain attack (90% and 3% of the target's max HP; the hero struck deals 4% less, stacking, a first
 *   guess of 10 stacks at most); Deathly Dragon's Breath (330% and 1.5% of max HP on every hero, a stun of 2 seconds, a first
 *   guess, and their shields broken); Overwhelming Annihilation (three blows of 200% over the field, a first guess as King's
 *   Raid's grows with the distance, each taking 500 mana; knocked down 1 second); Death's Door (spectral dragons: six blows of
 *   60%, each 5% more M.DMG taken, up to 15 stacks); every 15 seconds from the start, Lost Self (50% more DMG and 40% more crit
 *   chance for 15 seconds); and Hauled Into Hell (100% on the hero with the highest M.DEF, out of the fight 8 seconds, and its
 *   Infernal Curse: 10% less ATK Spd and mana recovery a stack, irremovable). His Incarnation of Hell (at 33.4%: the party wiped
 *   unless its gauge is broken by CC) is not here.
 * - Apocalypsion: her plain attack (300% and 4.5% of max HP); Engraving Aura (four blows of 250% on every hero, the first
 *   stunning 1.5 seconds, a first guess, her health given back 1.5% of her max for each hero each blow lands on, and 20% harder
 *   each time she uses it); Shaking Earth (200% on every hero, their shields broken, 1,000 mana taken and a stun of 1.5 seconds);
 *   Invitation to the Abyss (300% and a stun of 1.5 seconds on every hero, then 500%: its [Abyssal Curse], [Judgment] and the
 *   2500% pull on the cursed are not here); and every 50 seconds Wrath of the Matriarch one stage higher (1: her health given
 *   back 2.5% of her max every second, and 30% less damage taken; 2: 25% more DMG; 3, DEF ignored, is not here). Her
 *   Destructive Demise (at 1%) is not here either.
 * The dragons left alive give both their passives (King's Raid's PunishmentRaidTriggerTable 1 to 4, while a dragon is not
 * cleared): of each, the stats it gives (§3.4): Temeraire 50% more DMG, P.Block +1000 and P.Tough +900; Scalaxia 50% more
 * HP, M.Block +1000, M.Block DEF +100% and M.Tough +200; Zyrrkinoth 50% more HP; Armarta 50% more DMG (what each does besides,
 * its Blessing of the Flame, Cold Snap, poison and storm, is not here). At most two can be cleared, so two to four are alive.
 */

/** The DMG and max HP the dragons alive give Tersio and Apocalypsion (shares more, added up as King's Raid's are), and their block, block DEF and Tough. */
const PASSIVES: Readonly<Record<string, { dmg?: number; hp?: number; block?: Partial<BossStats['block']>; blockDef?: Partial<BossStats['block']>; tough?: Partial<BossStats['block']> }>> = {
  'dp-temeraire': { dmg: 0.5, block: { physical: 1000 }, tough: { physical: 900 } },
  'dp-scalaxia': { hp: 0.5, block: { magical: 1000 }, blockDef: { magical: 1 }, tough: { magical: 200 } },
  'dp-zyrrkinoth': { hp: 0.5 },
  'dp-armarta': { dmg: 0.5 },
};
/** The dragons, in King's Raid's order. */
export const APOCALYPSION_SIDES: readonly string[] = Object.keys(PASSIVES);

const TERSIO_ATK = 15_676_182;
const APOCALYPSION_ATK = 28_203_032;

/** Both: magical, DEF 69,998, 400 penetration, every blow a hit (2000 ACC: none dodged). */
const OWN: Omit<BossStats, 'hp'> = { deals: 'magical', physical: 69_998, magical: 69_998, block: NONE, dodge: NONE, crit: 0, resist: 0, pen: 400, acc: 2000 };

const FIRSTBORN: Buff = { name: 'Firstborn', about: 'Deals 4% less DMG a stack (irremovable).', icon: '🐉', art: stateArt('AttackDown'), harmful: true };
const DOOR: Buff = { name: "Death's Door", about: 'Takes 5% more M.DMG a stack.', icon: '👻', art: stateArt('DefenseDown'), harmful: true };
const HAULED: Buff = { name: 'Hauled Into Hell', about: 'Out of the fight.', icon: '🕳️', art: stateArt('Stun'), harmful: true };
const CURSE: Buff = { name: 'Infernal Curse', about: '10% less ATK Spd and mana recovery a stack (irremovable).', icon: '🔥', art: stateArt('SpeedDown'), harmful: true };

/** Breaks a hero's shield (King's Raid's: Deathly Dragon's Fire, Shaking Earth). */
const unshield = (on: Fighter): void => {
  on.shield = 0;
  on.shieldLeft = 0;
};

function tersioSkills(): Skill[] {
  return [
    {
      name: 'firstborn',
      label: 'Firstborn',
      length: 5.5,
      blows: [1.4],
      share: 0.9,
      on: 'target',
      hp: 0.03,
      then: (on) => void addStacks(on, FIRSTBORN.name, 1, 10, Infinity, (n) => ({ deals: 1 - 0.04 * n, shown: FIRSTBORN })),
    },
    // (Its fire on the ground ignores Block.)
    { name: 'breath', label: "Deathly Dragon's Breath", cooldown: 28, first: 15, length: 7, blows: [2], share: 3.3, on: 'all', hp: 0.015, stun: 2, sure: true, then: unshield },
    {
      name: 'annihilation',
      label: 'Overwhelming Annihilation',
      cooldown: 28,
      first: 18,
      length: 6.8,
      blows: [3, 4, 5],
      share: 2,
      on: 'all',
      stun: 1,
      then: (on) => void (on.mana = Math.max(0, on.mana - 500)),
    },
    {
      name: 'door',
      label: "Death's Door",
      cooldown: 32,
      first: 22,
      length: 9.1,
      blows: [2, 3, 4, 5, 6, 7],
      share: 0.6,
      on: 'all',
      then: (on) => void addStacks(on, DOOR.name, 1, 15, Infinity, (n) => ({ takes: { magical: 1 + 0.05 * n }, shown: DOOR })),
    },
  ];
}

/** Tersio's part: his stand-in skills, Lost Self and Hauled Into Hell every 15 seconds, no CC holding him. */
function tersioPart(fight: Fight): BossPart {
  const { foe } = fight;
  const lost = timer(
    15,
    () => put(foe.statuses, { name: 'Lost Self', art: stateArt('AttackUp'), left: 15, deals: 1.5, crit: 0.4, shown: 'rage' }),
    0,
  );
  const hauled = timer(15, () => {
    const heroes = reachable(fight);
    const target = heroes.reduce<Fighter | null>((best, on) => (!best || on.stats.magical > best.stats.magical ? on : best), null);
    if (!target) return;
    fight.hurt(target, TERSIO_ATK, false);
    if (target.hp <= 0) return;
    put(target.statuses, { name: HAULED.name, left: 8, binds: true, away: true, shown: HAULED });
    addStacks(target, CURSE.name, 1, 99, Infinity, (n) => ({ pace: Math.max(0.1, 1 - 0.1 * n), mana: Math.max(0.1, 1 - 0.1 * n), shown: CURSE }));
  });
  return kitPart(fight, tersioSkills(), {
    fixedDefense: true,
    critResist: 1000,
    controlled: () => null,
    tick(dt) {
      lost(dt);
      hauled(dt);
    },
  });
}

function apocalypsionSkills(fight: Fight): Skill[] {
  return [
    { name: 'strike', label: 'Attack', length: 4.2, blows: [1.5], share: 3, on: 'target', hp: 0.045 },
    {
      name: 'aura',
      label: 'Engraving Aura',
      cooldown: 22,
      first: 15,
      length: 5,
      blows: [1, 1.6, 2.2, 3.2],
      share: 2.5,
      on: 'all',
      stun: 1.5,
      grows: 0.2,
      then: () => fight.mend(fight.foe.maxHp * 0.015),
    },
    { name: 'earth', label: 'Shaking Earth', cooldown: 25, first: 20, length: 4.5, blows: [2], share: 2, on: 'all', stun: 1.5, then: (on) => {
      unshield(on);
      on.mana = Math.max(0, on.mana - 1000);
    } },
    { name: 'abyss', label: 'Invitation to the Abyss', cooldown: 33, first: 30, length: 7, blows: [1.5, 5], share: [3, 5], on: 'all', stun: 1.5 },
  ];
}

/** Apocalypsion's part: her stand-in skills, and Wrath of the Matriarch a stage higher every 50 seconds; no CC holds her. */
function apocalypsionPart(fight: Fight): BossPart {
  const { foe } = fight;
  let wrath = 0;
  let mendFor = 0;
  const rising = timer(50, () => {
    wrath++;
    if (wrath === 1) put(foe.statuses, { name: 'Wrath of the Matriarch', art: stateArt('AttackUp'), left: Infinity, count: 1, shown: 'rage' });
  });
  const part: BossPart = kitPart(fight, apocalypsionSkills(fight), {
    fixedDefense: true,
    controlled: () => null,
    tick(dt) {
      rising(dt);
      if (wrath >= 1) {
        // (Its heal over time, every second; and 2's DMG, put back should a hero's dispel have taken it.)
        mendFor += dt;
        if (mendFor >= 1) {
          mendFor -= 1;
          fight.mend(foe.maxHp * 0.025);
        }
        part.taken = { physical: 0.7, magical: 0.7 };
      }
      if (wrath >= 2 && !foe.statuses.some((status) => status.name === 'Wrath (2)')) put(foe.statuses, { name: 'Wrath (2)', art: stateArt('AttackUp'), left: Infinity, deals: 1.25, shown: 'rage' });
    },
  });
  return part;
}

/** The dragons left alive, of those cleared: what they give (DMG and HP shares more, and its stats with their block and Tough). */
function alive(cleared: readonly string[]): { dmg: number; hp: number; stats(own: Omit<BossStats, 'hp'>, hp: number): BossStats } {
  const living = APOCALYPSION_SIDES.filter((id) => !cleared.includes(id)).map((id) => PASSIVES[id] ?? {});
  const sum = (of: (one: (typeof living)[number]) => number | undefined): number => living.reduce((all, one) => all + (of(one) ?? 0), 0);
  return {
    dmg: 1 + sum((one) => one.dmg),
    hp: 1 + sum((one) => one.hp),
    stats: (own, hp) => ({
      ...own,
      hp,
      block: { physical: own.block.physical + sum((one) => one.block?.physical), magical: own.block.magical + sum((one) => one.block?.magical) },
      blockDef: { physical: (own.blockDef?.physical ?? 0) + sum((one) => one.blockDef?.physical), magical: (own.blockDef?.magical ?? 0) + sum((one) => one.blockDef?.magical) },
      tough: { physical: (own.tough?.physical ?? 0) + sum((one) => one.tough?.physical), magical: (own.tough?.magical ?? 0) + sum((one) => one.tough?.magical) },
    }),
  };
}

/** Apocalypsion herself (wave 2), with the dragons `cleared` (the others alive giving her their passives). */
function apocalypsionOf(cleared: readonly string[]): BossDef {
  const given = alive(cleared);
  // (Only its skills' names, times and shares: what comes of them is the fight's.)
  const kit = kitOf(apocalypsionSkills({} as Fight), APOCALYPSION_ATK);
  return {
    id: 'apocalypsion-boss',
    name: 'Apocalypsion',
    stats: given.stats({ ...OWN, crit: 400 }, 1_055_632_424_239),
    stages: infiniteStages({ hp: given.hp, deals: given.dmg }),
    ...kit,
    rest: 0.3,
    time: 180,
    join: apocalypsionPart,
  };
}

/** The fight (Tersio, then Apocalypsion), with the dragons `cleared` this opening (at most two: the bot keeps to it). */
export function apocalypsionFight(cleared: readonly string[] = []): BossDef {
  const given = alive(cleared);
  const kit = kitOf(tersioSkills(), TERSIO_ATK);
  return {
    id: 'apocalypsion',
    name: 'Apocalypsion',
    stats: given.stats(OWN, 383_614_090_488),
    stages: infiniteStages({ hp: given.hp, deals: given.dmg }),
    ...kit,
    rest: 0.3,
    time: 180,
    next: { at: 0.01, def: apocalypsionOf(cleared) },
    join: tersioPart,
  };
}

/** As it is with no dragon cleared: all four alive (the bot's run says which were: ./index.ts divineBoss). */
export const APOCALYPSION: BossDef = apocalypsionFight();
