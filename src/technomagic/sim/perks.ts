import type { Ability, HeroClass, HeroDef } from './heroes/kit';
import type { HeroMove } from './heroes/moves';
import type { HeroStats } from './combat/damage';
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

/** What overlaps itself: every ally gains `first` from one hero with it, and `again` more from each other. */
const aura = (first: number, again: number): Aura => ({ first, again });

/** Transcend 1: everyone's. */
export const COMMON_PERKS = {
  'atk-up': { name: 'ATK Up', words: 'ATK is increased by 30%', bonus: { atk: 0.3 } },
  'hp-up': { name: 'HP Up', words: 'HP is increased by 30%', bonus: { hp: 0.3 } },
  'def-up': { name: 'DEF Up', words: 'DEF is increased by 35%', bonus: { defense: 0.35 } },
  'crit-resist-up': { name: 'Crit Resist Up', words: 'Crit Resistance is increased by 250', bonus: { critResist: 250 } },
  'monster-hunting': { name: 'Monster Hunting', words: 'Increases DMG to Non-Hero enemies by 10% and takes 10% reduced DMG', dmg: 1.1, taken: 0.9 },
} as const satisfies Record<string, PerkDef>;

const OPPORTUNE_STRIKE: PerkDef = { name: 'Opportune Strike', words: 'Crit Chance is increased by 150 and Crit DMG is increased by 30%.', bonus: { crit: 150, critDamage: 0.3 } };
const TACTICAL_FORESIGHT: PerkDef = { name: 'Tactical Foresight', words: 'Dodge rate is increased by 200 and takes 10% reduced DMG.', bonus: { dodge: 200 }, taken: 0.9 };
const BLESSING_OF_MANA: PerkDef = { name: 'Blessing of Mana', words: 'Mana recovery per second rises by 250%.', bonus: { manaRegen: 2.5 } };
const TARGET_WEAKNESS: PerkDef = { name: 'Target Weakness', words: 'ATK rises by 20% and DEF Penetration rises by 200.', bonus: { atk: 0.2, pen: 200 } };

/**
 * Transcend 2: each class's five, in the bot's order (class-1 to class-5). An archer's are in words only: there is no
 * archer yet, and they come with the first.
 */
export const CLASS_PERKS: Readonly<Record<HeroClass, readonly PerkDef[]>> = {
  warrior: [
    OPPORTUNE_STRIKE,
    // (One enemy: one stack.)
    { name: 'Warlike', words: 'Per each enemy, ATK is increased by 7% and CC Resistance is increased by 30. Can be stacked up to max 10 times.', bonus: { atk: 0.07, resist: 30 } },
    { name: 'Offensive Guard', words: 'ATK rises equal to half of P.DEF and received P.DMG decreases by 15%.', atkFromDefense: 0.5, takenPhysical: 0.85 },
    TACTICAL_FORESIGHT,
    { name: 'Blood Wrath', words: 'Increases Lifesteal by 200 and ATK Spd by 200.', bonus: { lifesteal: 200, speed: 200 } },
  ],
  priest: [
    { name: 'Vengeful Curse', words: "When hit by an enemy, attacker's DMG is reduced by 70% for 3 sec. This effect only activates once in 40 sec, and cannot be dispelled.", curse: { deals: 0.3, lasts: 3, every: 40 } },
    { name: 'Goddess Blessing', words: "All allies' Crit Chance is increased by 150. When overlapped with the same perk, only gains 50.", allies: { crit: aura(150, 50) } },
    {
      name: 'Inner Peace',
      words: "Per every sec, all allies' HP is healed by 1%, and CC resistance is increased by 75. When overlapped with the same perk, only 0.3% HP per sec is healed, and CC resistance is increased by 25.",
      allies: { mend: aura(0.01, 0.003), resist: aura(75, 25) },
    },
    BLESSING_OF_MANA,
    { name: 'Swiftness', words: "All allies' ATK Spd is increased by 150. When overlapped with the same perk, only gains 50.", allies: { speed: aura(150, 50) } },
  ],
  wizard: [
    { name: 'Deception', words: 'When receiving DMG, becomes immune to the next 3 hits of DMG. This effect is activated every 40 sec.', immunity: { hits: 3, every: 40 } },
    { name: 'Moral Rise', words: "All allies' ATK is increased by 15%. When overlapped with the same perk, only 3% applies.", allies: { atk: aura(0.15, 0.03) } },
    BLESSING_OF_MANA,
    { name: 'Circuit Burst', words: 'Receives 20% more DMG but gains 40% ATK. ACC is increased by 200.', bonus: { atk: 0.4 }, taken: 1.2, acc: 200 },
    { name: 'Destruction', words: 'Increases Crit Chance by 200 and DEF Penetration by 200.', bonus: { crit: 200, pen: 200 } },
  ],
  assassin: [
    TARGET_WEAKNESS,
    { name: 'Swift and Nimble', words: 'Per every sec, Dodge rate is increased by 100. This effect can be stacked up to max 5 times, and resets upon dodging an attack.', nimble: { dodge: 100, most: 5 } },
    TACTICAL_FORESIGHT,
    OPPORTUNE_STRIKE,
    // (The boss's attacks aren't slowed by attack speed here: only the DMG it takes.)
    { name: 'Vital Detection', words: 'Upon Attack, causes the target to take 10% increased All DMG and have their ATK Spd reduced by 100 for 10 sec. This effect activates once every 3 sec.', mark: { name: 'Vital Detection', takes: 1.1, lasts: 10, every: 3 } },
  ],
  archer: [
    { name: 'Precision Shot', words: 'ATK rises by 20% and ACC rises by 400.' },
    { name: 'Eagle Eye', words: "All allies' Penetration is increased by 150, and ACC is increased by 75. When overlapped with the same perk, gains only 50 Penetration and 25 ACC." },
    { name: 'Mortal Wound', words: 'Successful Crit Attack reduces enemy recovery rate by 50% and deals Physical continuous DMG every second equal to 20% of ATK. Does not stack.' },
    { name: 'Opportune Strike', words: OPPORTUNE_STRIKE.words },
    { name: 'Concentration', words: 'Every 6 sec, increases own Crit DMG by 4%. This effect can be stacked up to a max of 20 times and cannot be dispelled.' },
  ],
  knight: [
    { name: 'Experienced Fighter', words: 'Attacked targets take 20% more DMG. Does not stack.', mark: { name: 'Experienced Fighter', takes: 1.2, lasts: Infinity } },
    { name: 'Excellent Strategy', words: "All allies' CC ACC is increased by 150. When overlapped with the same perk, only 50 applies.", allies: { accuracy: aura(150, 50) } },
    { name: 'Battle Cry', words: "All allies' Max HP is increased by 15%. When overlapped with the same perk, only 5% of effect applies.", allies: { hp: aura(0.15, 0.05) } },
    { name: 'Shield of Protection', words: 'Block Rate is increased by 200 and CC resistance is increased by 300.', bonus: { block: 200, resist: 300 } },
    // (ACC: what of the boss's dodge and block its blows see past.)
    { name: 'Swift Move', words: 'Increases ATK Spd by 400 and ACC by 200.', bonus: { speed: 400 }, acc: 200 },
  ],
  mechanic: [
    TARGET_WEAKNESS,
    { name: 'Ready Cannons', words: 'Mana recovery per second rises by 62.5% per every enemy.', bonus: { manaRegen: 0.625 } },
    { name: 'Pressure Point', words: 'Crit Chance is increased by 400.', bonus: { crit: 400 } },
    { name: 'Special Bullet', words: 'Attacked target loses 15% of ATK and 150 of Crit Chance. Does not stack.', mark: { name: 'Special Bullet', deals: 0.85, crit: -0.15, lasts: Infinity } },
    { name: 'Amplified Gunpowder', words: 'Increases Crit DMG of all allies by 30%. When overlapped with the same perk, only 10% of effect applies.', allies: { critDamage: aura(0.3, 0.1) } },
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

/** A hero's Transcend 5 Light: ATK, DEF and HP +15%, and `more` of its own (as gear gives it). */
export const t5Light = (words: string, more: GearBonus): PerkDef => ({ words, bonus: { atk: 0.15, defense: 0.15, hp: 0.15, ...more } });
