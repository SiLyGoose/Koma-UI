import type { Ability, HeroClass, HeroDef } from './heroes/kit';
import type { HeroMove } from './heroes/moves';
import { POINTS, share, type HeroStats } from './combat/damage';
import { fine, part, pct } from './shown';
import type { GearBonus, GearStat } from './types';

/*
 * Transcendence perks, as the fight has them. A hero has those the bot says as the fight begins (picked on the heroes
 * page, as far as it is transcended): Transcend 1's, everyone's (COMMON_PERKS); Transcend 2's, its class's (the bot's
 * class-1 to class-5: CLASS_PERKS); and Transcend 3's and 5's, its own (s1-light to s4-dark, t5-light and t5-dark: its
 * HeroDef.perks). Each is King's Raid's, at its numbers, in its words (which the heroes page shows), read for this raid:
 * there is one enemy, the boss, and it isn't a hero, so "per each enemy" counts it once, "if there is only 1 enemy"
 * always holds, and what is against Non-Hero enemies or Bosses is against it. What can't happen here does nothing.
 *
 * Most only add to a hero's stats (`bonus`, as its gear does) or change one of its skills (`skill`). The rest are what
 * PerkDef's other fields say, and ./fight.ts does them; a hero's own that do more are its part's (./heroes/).
 *
 * Each number a perk's words say that the fight uses is written once: in its data (`said` fills its words in from it),
 * or in its hero's own numbers. What the fight hasn't (an archer's, those that do nothing here) its words say as they
 * are. A chance or a share in points (CC resist, crit chance, ATK Spd...) is 10 to 1%: 1000 is 100% (POINTS).
 */

/** Every ally gains this much while a hero with the perk is on the field and standing; with another hero's same perk there too, only `again` more for each. */
export interface Aura {
  first: number;
  again: number;
}

/** What a perk does in a fight (anything left out, nothing). */
export interface PerkDef {
  /** Its name: an own perk's (Transcend 3's, 5's) goes by its skill's on the heroes page, and needs none here. */
  name?: string;
  /** King's Raid's words for it. */
  words: string;
  /** What it adds to its hero's stats, as gear does. */
  bonus?: GearBonus;
  /** DMG its hero deals the boss is this many times as much; and what the boss's blows take of it, of every kind, or of physical ones only. */
  dmg?: number;
  taken?: number;
  takenPhysical?: number;
  /** ACC (points): what of the boss's dodge and block its blows see past. */
  acc?: number;
  /** Its ATK rises by this share of its physical defense. */
  atkFromDefense?: number;
  /** What every ally gains while its hero is on the field and standing (ATK, crit DMG and max HP as shares; crit chance, attack speed, CC ACC and CC resist as points; `mend`, a share of each one's max HP healed every second). */
  allies?: Partial<Record<'atk' | 'crit' | 'critDamage' | 'speed' | 'accuracy' | 'resist' | 'hp' | 'mend', Aura>>;
  /** Hit by the boss: the boss's DMG is `deals` times as much for `lasts` seconds; again no sooner than `every` seconds after. */
  curse?: { deals: number; lasts: number; every: number };
  /** Hurt by the boss: immune to its next `hits` blows; again no sooner than `every` seconds after. */
  immunity?: { hits: number; every: number };
  /** Every second it gains `dodge` points more (up to `most` times), all lost when it dodges. */
  nimble?: { dodge: number; most: number };
  /**
   * A blow of its lands on the boss: what it leaves on it (named `mark`: taking so many times as much, of every kind,
   * dealing so many times as much, and its blows as much less likely to be critical, for `lasts` seconds), no sooner than
   * `every` seconds after the last (missing: whenever one lands). One already on the boss is only made to last again.
   */
  mark?: { name: string; takes?: number; deals?: number; crit?: number; lasts: number; every?: number };
  /**
   * One of its skills (`index`): costing `cost` more mana sections (fewer, less than 0), its cooldown `cooldown` seconds
   * longer (shorter, less than 0) or `cooldownShare` times as long, its blows `dmg` times as hard and (`whole`) through
   * all the boss's defense; and as its first blow lands, leaving `mark` on the boss (taking so many times as much, of
   * every kind or of each it names, for `lasts` seconds).
   */
  skill?: { index: number; cost?: number; cooldown?: number; cooldownShare?: number; dmg?: number; whole?: boolean; mark?: { name: string; takes: number | Partial<Record<'physical' | 'magical', number>>; lasts: number } };
}

/** A perk's id: Transcend 1's (everyone's), 2's (its class's, by its place), 3's (its skills', by their place, Light and Dark) and 5's. */
export type OwnPerkId = `s${1 | 2 | 3 | 4}-${'light' | 'dark'}` | `t5-${'light' | 'dark'}`;
export type PerkId = keyof typeof COMMON_PERKS | `class-${1 | 2 | 3 | 4 | 5}` | OwnPerkId;

/** A perk whose words say its own numbers: `words` is given its data, so each is written once (there). */
export const said = <D extends Omit<PerkDef, 'words'>>(data: D, words: (data: D) => string): D & { words: string } => ({ ...data, words: words(data) });

/** What overlaps itself: every ally gains `first` from one hero with it, and `again` more from each other. */
const aura = (first: number, again: number): Aura => ({ first, again });

/** Transcend 1: everyone's. */
export const COMMON_PERKS = {
  'atk-up': said({ name: 'ATK Up', bonus: { atk: 0.3 } }, ({ bonus }) => `ATK is increased by ${pct(bonus.atk)}`),
  'hp-up': said({ name: 'HP Up', bonus: { hp: 0.3 } }, ({ bonus }) => `HP is increased by ${pct(bonus.hp)}`),
  'def-up': said({ name: 'DEF Up', bonus: { defense: 0.35 } }, ({ bonus }) => `DEF is increased by ${pct(bonus.defense)}`),
  'crit-resist-up': said({ name: 'Crit Resist Up', bonus: { critResist: 250 } }, ({ bonus }) => `Crit Resistance is increased by ${bonus.critResist}`),
  'monster-hunting': said({ name: 'Monster Hunting', dmg: 1.1, taken: 0.9 }, ({ dmg, taken }) => `Increases DMG to Non-Hero enemies by ${pct(dmg - 1)} and takes ${pct(1 - taken)} reduced DMG`),
} as const satisfies Record<string, PerkDef>;

const OPPORTUNE_STRIKE: PerkDef = said({ name: 'Opportune Strike', bonus: { crit: 150, critDamage: 0.3 } }, ({ bonus }) => `Crit Chance is increased by ${bonus.crit} and Crit DMG is increased by ${pct(bonus.critDamage)}.`);
const TACTICAL_FORESIGHT: PerkDef = said({ name: 'Tactical Foresight', bonus: { dodge: 200 }, taken: 0.9 }, ({ bonus, taken }) => `Dodge rate is increased by ${bonus.dodge} and takes ${pct(1 - taken)} reduced DMG.`);
const BLESSING_OF_MANA: PerkDef = said({ name: 'Blessing of Mana', bonus: { manaRegen: 2.5 } }, ({ bonus }) => `Mana recovery per second rises by ${pct(bonus.manaRegen)}.`);
const TARGET_WEAKNESS: PerkDef = said({ name: 'Target Weakness', bonus: { atk: 0.2, pen: 200 } }, ({ bonus }) => `ATK rises by ${pct(bonus.atk)} and DEF Penetration rises by ${bonus.pen}.`);

/**
 * Transcend 2: each class's five, in the bot's order (class-1 to class-5). An archer's are in words only: there is no
 * archer yet, and they come with the first.
 */
export const CLASS_PERKS: Readonly<Record<HeroClass, readonly PerkDef[]>> = {
  warrior: [
    OPPORTUNE_STRIKE,
    // (One enemy: one stack.)
    said({ name: 'Warlike', bonus: { atk: 0.07, resist: 30 } }, ({ bonus }) => `Per each enemy, ATK is increased by ${pct(bonus.atk)} and CC Resistance is increased by ${bonus.resist}. Can be stacked up to max 10 times.`),
    said({ name: 'Offensive Guard', atkFromDefense: 0.5, takenPhysical: 0.85 }, (p) => `ATK rises equal to ${part(p.atkFromDefense)} of P.DEF and received P.DMG decreases by ${pct(1 - p.takenPhysical)}.`),
    TACTICAL_FORESIGHT,
    said({ name: 'Blood Wrath', bonus: { lifesteal: 200, speed: 200 } }, ({ bonus }) => `Increases Lifesteal by ${bonus.lifesteal} and ATK Spd by ${bonus.speed}.`),
  ],
  priest: [
    said(
      { name: 'Vengeful Curse', curse: { deals: 0.3, lasts: 3, every: 40 } },
      ({ curse }) => `When hit by an enemy, attacker's DMG is reduced by ${pct(1 - curse.deals)} for ${curse.lasts} sec. This effect only activates once in ${curse.every} sec, and cannot be dispelled.`,
    ),
    said({ name: 'Goddess Blessing', allies: { crit: aura(150, 50) } }, ({ allies }) => `All allies' Crit Chance is increased by ${allies.crit.first}. When overlapped with the same perk, only gains ${allies.crit.again}.`),
    said(
      { name: 'Inner Peace', allies: { mend: aura(0.01, 0.003), resist: aura(75, 25) } },
      ({ allies: { mend, resist } }) =>
        `Per every sec, all allies' HP is healed by ${fine(mend.first)}, and CC resistance is increased by ${resist.first}. When overlapped with the same perk, only ${fine(mend.again)} HP per sec is healed, and CC resistance is increased by ${resist.again}.`,
    ),
    BLESSING_OF_MANA,
    said({ name: 'Swiftness', allies: { speed: aura(150, 50) } }, ({ allies }) => `All allies' ATK Spd is increased by ${allies.speed.first}. When overlapped with the same perk, only gains ${allies.speed.again}.`),
  ],
  wizard: [
    said({ name: 'Deception', immunity: { hits: 3, every: 40 } }, ({ immunity }) => `When receiving DMG, becomes immune to the next ${immunity.hits} hits of DMG. This effect is activated every ${immunity.every} sec.`),
    said({ name: 'Moral Rise', allies: { atk: aura(0.15, 0.03) } }, ({ allies }) => `All allies' ATK is increased by ${pct(allies.atk.first)}. When overlapped with the same perk, only ${pct(allies.atk.again)} applies.`),
    BLESSING_OF_MANA,
    said({ name: 'Circuit Burst', bonus: { atk: 0.4 }, taken: 1.2, acc: 200 }, ({ bonus, taken, acc }) => `Receives ${pct(taken - 1)} more DMG but gains ${pct(bonus.atk)} ATK. ACC is increased by ${acc}.`),
    said({ name: 'Destruction', bonus: { crit: 200, pen: 200 } }, ({ bonus }) => `Increases Crit Chance by ${bonus.crit} and DEF Penetration by ${bonus.pen}.`),
  ],
  assassin: [
    TARGET_WEAKNESS,
    said({ name: 'Swift and Nimble', nimble: { dodge: 100, most: 5 } }, ({ nimble }) => `Per every sec, Dodge rate is increased by ${nimble.dodge}. This effect can be stacked up to max ${nimble.most} times, and resets upon dodging an attack.`),
    TACTICAL_FORESIGHT,
    OPPORTUNE_STRIKE,
    // (The boss's attacks aren't slowed by attack speed here: only the DMG it takes.)
    said(
      { name: 'Vital Detection', mark: { name: 'Vital Detection', takes: 1.1, lasts: 10, every: 3 } },
      ({ mark }) => `Upon Attack, causes the target to take ${pct(mark.takes - 1)} increased All DMG and have their ATK Spd reduced by 100 for ${mark.lasts} sec. This effect activates once every ${mark.every} sec.`,
    ),
  ],
  archer: [
    { name: 'Precision Shot', words: 'ATK rises by 20% and ACC rises by 400.' },
    { name: 'Eagle Eye', words: "All allies' Penetration is increased by 150, and ACC is increased by 75. When overlapped with the same perk, gains only 50 Penetration and 25 ACC." },
    { name: 'Mortal Wound', words: 'Successful Crit Attack reduces enemy recovery rate by 50% and deals Physical continuous DMG every second equal to 20% of ATK. Does not stack.' },
    { name: 'Opportune Strike', words: OPPORTUNE_STRIKE.words },
    { name: 'Concentration', words: 'Every 6 sec, increases own Crit DMG by 4%. This effect can be stacked up to a max of 20 times and cannot be dispelled.' },
  ],
  knight: [
    said({ name: 'Experienced Fighter', mark: { name: 'Experienced Fighter', takes: 1.2, lasts: Infinity } }, ({ mark }) => `Attacked targets take ${pct(mark.takes - 1)} more DMG. Does not stack.`),
    said({ name: 'Excellent Strategy', allies: { accuracy: aura(150, 50) } }, ({ allies }) => `All allies' CC ACC is increased by ${allies.accuracy.first}. When overlapped with the same perk, only ${allies.accuracy.again} applies.`),
    said({ name: 'Battle Cry', allies: { hp: aura(0.15, 0.05) } }, ({ allies }) => `All allies' Max HP is increased by ${pct(allies.hp.first)}. When overlapped with the same perk, only ${pct(allies.hp.again)} of effect applies.`),
    said({ name: 'Shield of Protection', bonus: { block: 200, resist: 300 } }, ({ bonus }) => `Block Rate is increased by ${bonus.block} and CC resistance is increased by ${bonus.resist}.`),
    // (ACC: what of the boss's dodge and block its blows see past.)
    said({ name: 'Swift Move', bonus: { speed: 400 }, acc: 200 }, ({ bonus, acc }) => `Increases ATK Spd by ${bonus.speed} and ACC by ${acc}.`),
  ],
  mechanic: [
    TARGET_WEAKNESS,
    said({ name: 'Ready Cannons', bonus: { manaRegen: 0.625 } }, ({ bonus }) => `Mana recovery per second rises by ${fine(bonus.manaRegen)} per every enemy.`),
    said({ name: 'Pressure Point', bonus: { crit: 400 } }, ({ bonus }) => `Crit Chance is increased by ${bonus.crit}.`),
    // (Its Crit Chance as the boss's blows have it: a share, 150 points of it.)
    said(
      { name: 'Special Bullet', mark: { name: 'Special Bullet', deals: 0.85, crit: -share(150), lasts: Infinity } },
      ({ mark }) => `Attacked target loses ${pct(1 - mark.deals)} of ATK and ${Math.round(-mark.crit * POINTS)} of Crit Chance. Does not stack.`,
    ),
    said({ name: 'Amplified Gunpowder', allies: { critDamage: aura(0.3, 0.1) } }, ({ allies }) => `Increases Crit DMG of all allies by ${pct(allies.critDamage.first)}. When overlapped with the same perk, only ${pct(allies.critDamage.again)} of effect applies.`),
  ],
};

/** The perk `id` names for the hero `def` (null: none, or one this fight doesn't know). */
export function perkOf(id: string, def: HeroDef): PerkDef | null {
  if (Object.hasOwn(COMMON_PERKS, id)) return COMMON_PERKS[id as keyof typeof COMMON_PERKS];
  const own = /^class-([1-5])$/.exec(id);
  if (own) return CLASS_PERKS[def.class][Number(own[1]) - 1] ?? null;
  return def.perks?.[id as OwnPerkId] ?? null;
}

/** A hero's perks as the fight has them: the ones the bot says it has (each once), and what each does. */
export const perksOf = (ids: readonly string[] | null | undefined, def: HeroDef): Map<string, PerkDef> =>
  new Map((ids ?? []).flatMap((id) => {
    const perk = perkOf(id, def);
    return perk ? [[id, perk] as const] : [];
  }));

/** Every ally's from `wearers` heroes with an aura: the first's, and each other's `again`. */
export const auraOf = (one: Aura, wearers: number): number => (wearers > 0 ? one.first + one.again * (wearers - 1) : 0);

/** What a hero's perks make of its skills' moves (by the move each skill is): how many times as hard their blows are, which go through all the boss's defense, and what each leaves on the boss as its first blow lands. */
export function moveDmg(def: HeroDef, perks: ReadonlyMap<string, PerkDef>): Partial<Record<HeroMove, number>> {
  const out: Partial<Record<HeroMove, number>> = {};
  for (const perk of perks.values()) {
    const ability = perk.skill?.dmg !== undefined ? def.abilities[perk.skill.index] : undefined;
    if (ability) out[ability.move] = (out[ability.move] ?? 1) * (perk.skill?.dmg ?? 1);
  }
  return out;
}

export function moveWhole(def: HeroDef, perks: ReadonlyMap<string, PerkDef>): Set<HeroMove> {
  return new Set([...perks.values()].flatMap((perk) => (perk.skill?.whole ? [def.abilities[perk.skill.index]?.move].filter((move) => move !== undefined) : [])));
}

export function moveMarks(def: HeroDef, perks: ReadonlyMap<string, PerkDef>): Partial<Record<HeroMove, NonNullable<NonNullable<PerkDef['skill']>['mark']>[]>> {
  const out: Partial<Record<HeroMove, NonNullable<NonNullable<PerkDef['skill']>['mark']>[]>> = {};
  for (const perk of perks.values()) {
    const move = perk.skill?.mark ? def.abilities[perk.skill.index]?.move : undefined;
    if (move && perk.skill?.mark) (out[move] ??= []).push(perk.skill.mark);
  }
  return out;
}

/** What every ally gains, by `key`, from heroes with these perks (each hero's list): each aura by how many wear it. */
export function auraTotal(heroes: readonly (readonly PerkDef[])[], key: keyof NonNullable<PerkDef['allies']>): number {
  const worn = new Map<string, { aura: Aura; wearers: number }>();
  for (const perks of heroes) {
    for (const perk of perks) {
      const aura = perk.allies?.[key];
      if (!aura) continue;
      const name = perk.name ?? perk.words;
      const one = worn.get(name) ?? { aura, wearers: 0 };
      one.wearers++;
      worn.set(name, one);
    }
  }
  let total = 0;
  for (const { aura, wearers } of worn.values()) total += auraOf(aura, wearers);
  return total;
}

/** A skill as a hero's perks for it change it (its cost and cooldown); with none, as it is. */
export function tweaked(ability: Ability, perks: readonly PerkDef[]): Ability {
  if (perks.length === 0) return ability;
  let { cost, cooldown } = ability;
  for (const { skill } of perks) {
    cost += skill?.cost ?? 0;
    cooldown = (cooldown + (skill?.cooldown ?? 0)) * (skill?.cooldownShare ?? 1);
  }
  return { ...ability, cost: Math.max(0, cost), cooldown: Math.max(0, cooldown) };
}

/** What a hero's gear gives it, with what its perks add to its stats (as gear does). */
export function withPerks(gear: GearBonus, perks: Iterable<PerkDef>): GearBonus {
  const out: GearBonus = { ...gear };
  for (const perk of perks) for (const [stat, more] of Object.entries(perk.bonus ?? {}) as [GearStat, number][]) out[stat] = (out[stat] ?? 0) + more;
  return out;
}

/** A hero's stats (its gear's and its perks' in them) with what its perks make of them besides: Offensive Guard's ATK from its defense. */
export function perkedStats(stats: HeroStats, perks: Iterable<PerkDef>): HeroStats {
  for (const perk of perks) if (perk.atkFromDefense) stats.atk += perk.atkFromDefense * stats.physical;
  return stats;
}

/** What a hero's own perks give every ally, itself among them: each perk's `first` (it is the first of its kind there), by what it raises. */
export function ownAuras(perks: Iterable<PerkDef>): Partial<Record<keyof NonNullable<PerkDef['allies']>, number>> {
  const out: Partial<Record<keyof NonNullable<PerkDef['allies']>, number>> = {};
  for (const perk of perks) {
    for (const [key, aura] of Object.entries(perk.allies ?? {}) as [keyof NonNullable<PerkDef['allies']>, Aura][]) out[key] = (out[key] ?? 0) + aura.first;
  }
  return out;
}

/** The stat each aura raises, as gear's bonus has it (Inner Peace's heal every second is none). */
const AURA_STAT: Partial<Record<keyof NonNullable<PerkDef['allies']>, GearStat>> = { atk: 'atk', crit: 'crit', critDamage: 'critDamage', speed: 'speed', accuracy: 'accuracy', resist: 'resist', hp: 'hp' };

/**
 * What a hero's perks give its own stats, as gear's bonus has them (ATK, max HP and crit DMG shares; chances and the
 * like in points, 10 to 1%): its own, and its share of what they give every ally; and Offensive Guard's ATK, so much
 * of its physical defense, apart. What the heroes page lists as its perks' effects.
 */
export function perkStats(perks: Iterable<PerkDef>): { bonus: GearBonus; atkFromDefense: number } {
  const list = [...perks];
  const bonus = withPerks({}, list);
  for (const [key, more] of Object.entries(ownAuras(list)) as [keyof NonNullable<PerkDef['allies']>, number][]) {
    const stat = AURA_STAT[key];
    if (stat) bonus[stat] = (bonus[stat] ?? 0) + more;
  }
  return { bonus, atkFromDefense: list.reduce((sum, perk) => sum + (perk.atkFromDefense ?? 0), 0) };
}

/** What every hero's Transcend 5 Light gives: ATK, DEF and HP so much more. */
const T5_LIGHT = 0.15;

/** A hero's Transcend 5 Light: ATK, DEF and HP +15%, and `more` of its own (as gear gives it), which `says` puts in words. */
export const t5Light = <M extends GearBonus>(more: M, says: (more: M) => string): PerkDef => ({
  words: `ATK, DEF, HP +${pct(T5_LIGHT)} / ${says(more)}`,
  bonus: { atk: T5_LIGHT, defense: T5_LIGHT, hp: T5_LIGHT, ...more },
});
