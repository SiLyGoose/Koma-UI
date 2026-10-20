import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { pct, skillArt, type Buff } from '../shown';
import { atTier, MK1, MK1_UP } from '../unique';
import { attackStarts, bookDmg, CLASS_STATS, dmg, type HeroDef, type Passive, played } from './kit';

/*
 * Lakrak's skills, as King's Raid's playtest has them (stats/lakrak.md: how hard each hits at its level 90, and every number
 * here, are its; its words are its own). He is a mechanic, the Hand Cannon's Hunter, as the playtest remade him: each
 * skill he uses may make his next one an [Experiment Success!].
 * - Rapid Fire: a blow that stuns the boss, and a blow more on a Non-Hero enemy. A success: no cooldown.
 * - Smoke Bomb: a blow that stuns the boss a moment and leaves it with [Explosive Substance] for a while (more physical
 *   damage taken).
 * - Glue Bomb: a bomb that bursts some seconds later (a success: at once), stunning the boss, and harder on one with
 *   [Explosive Substance].
 * His passive, Load Cannon: now and then his attack fires a shell that stuns the boss; and as each skill of his ends, a
 * chance of an [Experiment] success, his next skill enhanced (an enhanced one tries none).
 * His unique weapon (../unique.ts) is worked here too: an [Experiment] likelier to succeed, and each success a stack (up to
 * 4), each his ATK, attack speed and DMG to Non-Hero enemies higher.
 * What is drawn for each, and what his body does, are King's Raid's own (../../assets/heroes/lakrak.ts).
 *
 * His own perks (../perks.ts) are King's Raid's. Rapid Fire's Dark (the boss's mana) and Glue Bomb's Dark (its target)
 * do nothing here: the boss has no mana, and is the only one. Smoke Bomb's dispel and Blind do nothing to the boss.
 */
/** Rapid Fire: its blow, how long it stuns, its blow more on a Non-Hero enemy, and the mana a critical one gains him. */
const RAPID = { blow: played('mechanic', 3554, 158_587), stun: 1, boss: played('mechanic', 1854, 72_747), mana: 250 };
/** Smoke Bomb: its blow, its stun (its last book's), and [Explosive Substance]: more physical damage taken, for how long. */
const SMOKE = { blow: played('mechanic', 2135, 95_067), stun: 0.5, takes: 1.2, lasts: 7 };
/** Glue Bomb: how long before it bursts, its blow and how long it stuns, and its blow more on [Explosive Substance]. */
const GLUE = { after: 3, blow: played('mechanic', 7552, 321_900), stun: 1, more: played('mechanic', 4775, 214_809) };
/** Load Cannon: its chance on each part of his attack, its blow, and how long it stuns; an [Experiment]'s chance of success. */
const CANNON = { chance: 0.15, blow: played('mechanic', 1663, 74_033), stun: 1, success: 0.5 };
/** His own perks' numbers: Rapid Fire's Light's DMG; Load Cannon's Light's chance and longer stun, and Dark's mana on a success; Transcend 5's Dark's attack speed and CC ACC on a success, for how long. */
const PERKS = { chance: 0.25, stun: 0.5, mana: 500, dark: { speed: 120, accuracy: 150, lasts: 10 } };

/**
 * His unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Rapid Fire's more DMG and the boss's more
 * physical damage taken; Smoke Bomb's shorter cooldown and longer Blind; Glue Bomb's more DMG and mana on a critical blow;
 * Load Cannon's mana off the boss, and its first shot certain.
 */
const UT = {
  cudgel: { dmg: 0.5, takes: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 },
  mask: { cooldown: 0.3, blind: [1, 1.2, 1.4, 1.7, 2.1, 2.5] },
  gunpowder: { dmg: 0.5, mana: [200, 240, 290, 350, 420, 500] },
  cannonball: { mana: [400, 480, 580, 700, 840, 1000] },
};

const art = skillArt('lakrak');

const CANNON_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Load Cannon', about: `Passive. Each part of his attack has a ${pct(CANNON.chance)} chance to fire a shell that stuns the boss for ${CANNON.stun} second. As each skill ends, a ${pct(CANNON.success)} chance of an [Experiment] success: his next skill enhanced.`, icon: '💣', art: art(3) },
  words: `When performing a Normal Attack, has a ${pct(CANNON.chance)} chance to fire a shell, dealing ${dmg('mechanic', CANNON.blow, bookDmg('lakrak', 3))} Physical DMG to the target and nearby enemies, and stunning them for ${CANNON.stun}sec.\nEach time a skill ends, attempts [Experiment] with a ${pct(CANNON.success)} chance to succeed, enhancing the next skill. Enhanced skills do not attempt [Experiment].`,
};
const SUCCESS: Buff = { name: 'Experiment Success!', about: 'His next skill enhanced.', icon: '🧪', art: art(3) };
const EXPLOSIVE = 'Explosive Substance';
const EXPERIMENTED: Buff = { name: 'Experimenter', about: 'Attack speed and CC ACC higher.', icon: '🧪', art: art(3) };

export const LAKRAK: HeroDef = {
  id: 'lakrak',
  name: 'Lakrak',
  class: 'mechanic',
  skins: ['Lakrak'],
  stats: { ...CLASS_STATS.mechanic, deals: 'physical' },
  abilities: [
    {
      name: 'Rapid Fire',
      about: `A blow that stuns the boss for ${RAPID.stun} second, and a blow more on a Non-Hero enemy. [Experiment Success!]: no cooldown.`,
      words: `Deals ${dmg('mechanic', RAPID.blow, bookDmg('lakrak', 0))} Physical DMG to enemies in a frontal straight-line area and stuns them for ${RAPID.stun}sec. Non-hero enemies take additional ${dmg('mechanic', RAPID.boss, bookDmg('lakrak', 0))} Physical DMG.\n[Experiment Success!]: This skill does not trigger a cooldown.`,
      icon: '🔫',
      art: art(0),
      move: 'rapid',
      cooldown: 8,
      cost: 2,
    },
    {
      name: 'Smoke Bomb',
      about: `A blow that stuns the boss for ${SMOKE.stun} second; [Explosive Substance] on it for ${SMOKE.lasts} seconds: ${pct(SMOKE.takes - 1)} more physical damage taken.`,
      words: `Deals ${dmg('mechanic', SMOKE.blow, bookDmg('lakrak', 1))} Physical DMG to the target and nearby enemies, inflicting [Explosive Substance] for ${SMOKE.lasts}sec, increasing Physical DMG taken by ${pct(SMOKE.takes - 1)} and inflicting Blind for 1sec. Deals DMG and Stuns the enemy for ${SMOKE.stun} sec.\n[Experiment Success!]: Removes beneficial effects from enemies within the area.`,
      icon: '💨',
      art: art(1),
      move: 'smoke',
      cooldown: 14,
      cost: 2,
    },
    {
      name: 'Glue Bomb',
      about: `A bomb that bursts ${GLUE.after} seconds later, stunning the boss for ${GLUE.stun} second; harder on [Explosive Substance]. [Experiment Success!]: it bursts at once.`,
      words: `Attaches a sticky bomb to a random enemy.\nAfter ${GLUE.after}sec, the bomb explodes, dealing ${dmg('mechanic', GLUE.blow, bookDmg('lakrak', 2))} Physical DMG to the target and nearby enemies, and stunning them for ${GLUE.stun}sec. Enemies afflicted with [Explosive Substance] take additional ${dmg('mechanic', GLUE.more, bookDmg('lakrak', 2))} Physical DMG.\n[Experiment Success!]: The bomb explodes immediately upon attachment.`,
      icon: '💣',
      art: art(2),
      move: 'glue',
      cooldown: 15,
      cost: 3,
    },
  ],
  passive: CANNON_SHOWN,
  treasures: [
    treasure('Cudgel Bullet', (k) => ({
      words: `[Rapid Fire] Increases DMG by ${pct(UT.cudgel.dmg)}, and increases P.DMG target receives by ${pct(k(UT.cudgel.takes))} for ${UT.cudgel.lasts} sec.`,
      skill: { index: 0, dmg: 1 + UT.cudgel.dmg, mark: { name: 'Cudgel Bullet', lasts: UT.cudgel.lasts, takes: { physical: 1 + k(UT.cudgel.takes) } } },
    })),
    treasure('Special Gas Mask', (k) => ({
      words: `[Smoke Bomb] Reduces Cooldown by ${pct(UT.mask.cooldown)} and increases blind duration by ${k(UT.mask.blind)} sec.`,
      skill: { index: 1, cooldownShare: 1 - UT.mask.cooldown },
    })),
    treasure('Goblincraft Special High-Density Gunpowder', (k) => ({
      words: `[Glue Bomb] DMG is increased by ${pct(UT.gunpowder.dmg)}, and upon Crit Hit, recovers ${k(UT.gunpowder.mana)} mana.`,
      skill: { index: 2, dmg: 1 + UT.gunpowder.dmg },
    })),
    treasure('Bada Boom Cannonball', (k) => ({
      words: `[Load Cannon] Reduces Mana of hit enemies by ${k(UT.cannonball.mana)}. The first strike in a battle will activate [Load Cannon].`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, dmg: 1.5 } }, ({ skill }) => `Damage increases by ${pct(skill.dmg - 1)}.`),
    's1-dark': { words: "Reduces the target's Mana by 700." },
    's2-light': said({ skill: { index: 1, cost: -1 } }, ({ skill }) => `Mana cost is reduced by ${-skill.cost}.`),
    's2-dark': { words: 'Increases the duration of Blind by 1 sec.' },
    's3-light': said({ skill: { index: 2, cost: 2 } }, ({ skill }) => `Mana cost increases by ${skill.cost}, and the number of bomb placements is changed to 2.`),
    's3-dark': { words: 'Changes the target to the enemy with the highest ATK.' },
    's4-light': { words: `Shell activation chance increases by ${pct(PERKS.chance - CANNON.chance)}, and stun duration increases by ${PERKS.stun} sec.` },
    's4-dark': { words: `On [Experiment] success, restores ${PERKS.mana} Mana.` },
    't5-light': t5Light({ critDamage: 0.2 }, ({ critDamage }) => `Crit DMG +${pct(critDamage)}`),
    't5-dark': { words: `On [Experiment] success, increases Attack Speed by ${pct(PERKS.dark.speed / 1000)} and Status Ailment Accuracy by ${PERKS.dark.accuracy} for ${PERKS.dark.lasts} sec.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    const starts = attackStarts('lakrak');
    /** His next skill enhanced; whether the skill going is; Glue Bomb's bombs, and how long each has yet; whether his first shell is still to come (Bada Boom Cannonball); his unique weapon's stacks. */
    let success = false;
    let enhanced = false;
    let bombs: number[] = [];
    let first = wearsTreasure(self, 3);
    let stacks = 0;
    /** A skill of his going (its [Experiment] comes as it ends). */
    let skilling = false;

    /** A bomb bursts: on the boss, harder on [Explosive Substance] (Goblincraft Gunpowder: a critical one, mana). */
    const burst = (): void => {
      const critical = fight.hit(self, GLUE.blow);
      fight.stun(GLUE.stun, { by: self });
      if (fight.foe.statuses.some((status) => status.name === EXPLOSIVE)) fight.hit(self, GLUE.more);
      const mana = fromTreasure(self, 2, UT.gunpowder.mana);
      if (critical && mana > 0) self.mana = Math.min(MAX_MANA, self.mana + mana);
    };

    return {
      lands: {
        // His attack; on each part of it, now and then a shell (its Light: likelier, a longer stun; Bada Boom Cannonball: the first certain).
        attack(part) {
          fight.hit(self, fight.basic);
          if (!starts.has(part)) return;
          const chance = self.perks.has('s4-light') ? PERKS.chance : CANNON.chance;
          if (first || fight.roll() < chance) {
            first = false;
            fight.hit(self, CANNON.blow);
            fight.stun(CANNON.stun + (self.perks.has('s4-light') ? PERKS.stun : 0), { by: self });
          }
        },
        // A blow that stuns the boss, and a blow more on a Non-Hero enemy; a critical one gains him mana. A success: no cooldown.
        rapid() {
          const critical = fight.hit(self, RAPID.blow);
          fight.hit(self, RAPID.boss);
          fight.stun(RAPID.stun, { by: self });
          if (critical) self.mana = Math.min(MAX_MANA, self.mana + RAPID.mana);
          if (enhanced) self.cooldowns[0] = 0;
        },
        // A blow that stuns the boss a moment, and [Explosive Substance] on it.
        smoke() {
          fight.hit(self, SMOKE.blow);
          fight.stun(SMOKE.stun, { by: self });
          put(fight.foe.statuses, { name: EXPLOSIVE, left: SMOKE.lasts, takes: { physical: SMOKE.takes }, shown: 'curse' });
        },
        // The bomb (its Light: two): bursting later, or (a success) at once.
        glue() {
          const count = self.perks.has('s3-light') ? 2 : 1;
          for (let i = 0; i < count; i++) {
            if (enhanced) burst();
            else bombs.push(GLUE.after);
          }
        },
      },
      used() {
        // (Whether this one is enhanced: a success before it; an enhanced one tries no [Experiment] as it ends.)
        enhanced = success;
        success = false;
        skilling = true;
        self.statuses = self.statuses.filter((status) => status.name !== SUCCESS.name);
      },
      tick(dt) {
        // Glue Bomb's bombs bursting.
        if (bombs.length > 0) {
          bombs = bombs.map((left) => left - dt);
          for (const left of bombs) if (left <= 0) burst();
          bombs = bombs.filter((left) => left > 0);
        }
        // A skill of his over (not an enhanced one): an [Experiment], likelier with his unique weapon (its Dark: mana on a success;
        // Transcend 5's Dark: quicker, and CC ACC; his unique weapon: a stack more).
        if (!skilling || self.doing?.skill !== undefined) return;
        skilling = false;
        if (enhanced || fight.roll() >= CANNON.success + (tier !== null ? atTier(MK1.success, tier) : 0)) return;
        success = true;
        if (tier !== null) {
          stacks = Math.min(MK1.most, stacks + 1);
          put(self.statuses, { name: MK1_UP.name, left: Infinity, count: stacks, atk: atTier(MK1.atk, tier) * stacks, speed: atTier(MK1.speed, tier) * stacks, deals: 1 + atTier(MK1.boss, tier) * stacks, shown: MK1_UP });
        }
        put(self.statuses, { name: SUCCESS.name, left: Infinity, shown: SUCCESS });
        if (self.perks.has('s4-dark')) self.mana = Math.min(MAX_MANA, self.mana + PERKS.mana);
        if (self.perks.has('t5-dark')) put(self.statuses, { name: EXPERIMENTED.name, left: PERKS.dark.lasts, speed: PERKS.dark.speed, accuracy: PERKS.dark.accuracy, shown: EXPERIMENTED });
      },
      lit: () => success,
    };
  },
};

