import type { Buff } from './shown';

/*
 * The heroes' unique weapons, as the fight has them: a hero wearing its own (the bot says how far it is
 * refined, R1 to R5, as the fight begins: its tier, 1 to 5) has its weapon's effect, on itself alone. ./fight.ts
 * applies them. Each is King's Raid's (kingsraid.shodyra.com, its 1★ to 5★; its 0★ is left out), but only for the
 * hero wielding it:
 *
 * - Clause, The Guardian, Exian: every third skill he uses, his ATK and defense are higher for a while.
 *   (The game's raises every ally's, and the highest ATK's twice over.)
 * - Kirze, Judgment Edge, Elicipira: each of her blows (her attack's and her skills') may deal more, a share
 *   of her ATK, twice over against a boss. (The game's also widens Bloom, Crimson Flower!: there's only the boss.)
 * - Fallen Frey, Angel's Despair, Rosmerta: each skill she uses heals her, and she sees past more of the
 *   boss's defense for a while. (The game's heals the two allies with the highest ATK, and raises theirs.)
 * - Gremory, Gateway to Purgatory, Pigritia: she is quicker; each time she sleeps she is healed and her mana
 *   filled a share over 2 seconds, and her Mana Charge raises her ATK more. (Her part does it: ./heroes/gremory.ts.)
 * - Annette, Crystallized Technomagic, Rascal: every so often she gains a Charge (even while Overcharged) and a
 *   little mana; and while she is Overcharged every ally deals more and takes less, twice as much for the ally with
 *   the highest ATK. (Her part does it: ./heroes/annette.ts.)
 * - Laias, Flowing Circle, Eltoirre: healing reaches every ally the more, and every 5 seconds the ally with the
 *   lowest health is healed. (The game's also raises every ally's M.DEF by a share of her ATK. Her part does it:
 *   ./heroes/laias.ts.)
 * - Seria, Executioner of Domains, Elsion: a critical blow of her skills deals more, leaves the boss healed less for a
 *   while, and her healed more (up to 5 times over). (Her part does it: ./heroes/seria.ts.)
 * - Morrah, Flame of Victory, Carprain: now and then a blow of her attack leaves the boss hitting less hard and
 *   taking more magical damage for a while, twice as much more with her Flame stacked full on it. (Her part does it: ./heroes/morrah.ts.)
 * - Ezekiel, Jailer of Despair, Barbatos: his Fury lasts longer, and while it does his critical blows are harder and
 *   he stands being knocked down better. (His part does it: ./heroes/ezekiel.ts.)
 * - Lorraine, World Tree's Will, Roburu: every 7 seconds, with her Poison on the boss, a blow that leaves it taking more
 *   magical damage for a while. (The game's also lowers its M.DEF: left out. Her part does it: ./heroes/lorraine.ts.)
 * - Valance, Wonder of Magos Le'Flamme, Corbeau Rose: every ally gains by the TechnoMagic gear it wears, the same at
 *   every tier. (Her part does it: ./heroes/valance.ts.)
 *
 * The game's shares of ATK are as they are for damage (this raid's blows are counted in thousandths of them, at ATK: ./combat/);
 * a heal is the game's share of ATK scaled by its heroes' HP to their ATK (some 86 to 1, where here it is
 * about 1 to 1), so it mends as much of her health as it would there.
 */

/** Each weapon's numbers at tiers 1 to 5 (index 0 is tier 1). */
export const EXIAN = { name: 'The Guardian, Exian', every: 3, lasts: 15, boost: [0.12, 0.14, 0.17, 0.21, 0.25] };
export const ELICIPIRA = { name: 'Judgment Edge, Elicipira', chance: 0.04, boss: 2, blow: [6000, 7200, 8600, 10000, 12500] };
export const ROSMERTA = { name: 'Angel’s Despair, Rosmerta', lasts: 7, heal: [2_000, 2_400, 2_900, 3_500, 4_200], pen: [240, 290, 350, 420, 500] };
/** Its attack speed (points), its heal and mana on sleeping (shares of her max HP and max mana, the mana over `over` seconds), and the ATK each Mana Charge adds. */
export const PIGRITIA = {
  name: 'Gateway to Purgatory, Pigritia',
  speed: [240, 290, 350, 420, 500],
  heal: [0.24, 0.29, 0.35, 0.42, 0.5],
  mana: [0.24, 0.29, 0.35, 0.42, 0.5],
  over: 2,
  charge: [0.048, 0.058, 0.07, 0.084, 0.1],
};
/** How often it gives her a Charge and a share of her max mana (seconds), and what every ally deals more and takes less while she is Overcharged (`top` times that for the ally with the highest ATK). */
export const RASCAL = { name: 'Crystallized Technomagic, Rascal', every: [1.4, 1.3, 1.1, 0.9, 0.7], mana: 0.01, dmg: 0.02, taken: 0.02, top: 2 };
/** The chance a blow of her attack has, how long what it leaves on the boss lasts (seconds), and how much less hard it hits and more magical damage it takes (`full` times that more with her Flame stacked full on it). */
export const CARPRAIN = { name: 'Flame of Victory, Carprain', chance: 0.2, lasts: 10, weaker: [0.12, 0.14, 0.17, 0.21, 0.25], full: 2 };
/** A critical skill blow's blow more (at ATK), what it takes off the boss's heals for `lasts` seconds, and what each of its stacks (up to `most`, for `healed` seconds) adds to hers. */
export const ELSION = { name: 'Executioner of Domains, Elsion', blow: [600, 720, 860, 1030, 1250], unhealed: [0.29, 0.35, 0.42, 0.5, 0.6], lasts: 5, heals: [0.05, 0.06, 0.07, 0.09, 0.1], most: 5, healed: 20 };
/** How much more healing reaches every ally, how often (seconds) the ally with the lowest health is healed, and by how much (as a heal at ATK). */
export const ELTOIRRE = { name: 'Flowing Circle, Eltoirre', heals: [0.1, 0.12, 0.14, 0.17, 0.2], every: 5, mend: [1_200, 1_400, 1_700, 2_100, 2_500] };
/** How many seconds longer his Fury lasts, and what it adds to his crit damage (a share more) and CC resist (points) while it does. */
export const BARBATOS = { name: 'Jailer of Despair, Barbatos', longer: [3, 4, 5, 6, 7], critDamage: [0.9, 1, 1.1, 1.2, 1.3], resist: [240, 290, 350, 420, 500] };
/** How often (seconds) it strikes a poisoned boss, how hard (at ATK), and how much more magical damage the boss takes after, for `lasts` seconds. */
export const ROBURU = { name: 'World Tree’s Will, Roburu', every: 7, blow: [1200, 1400, 1700, 2100, 2500], takes: [0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 };

/** What every ally gains by the TechnoMagic gear it wears (the same at every tier): 1 piece, more ATK; 2, more defense; 3, more max HP (here: taking that much less); 4, more DMG. */
export const CORBEAU = { name: 'Wonder of Magos Le’Flamme, Corbeau Rose', atk: 0.06, defense: 0.06, hp: 0.06, dmg: 0.04 };

/** The most a weapon is refined. */
export const TIERS = 5;

/** A tier's number from a weapon's list (1 to TIERS; out of range: the nearest). */
export const atTier = (list: readonly number[], tier: number): number => list[Math.min(list.length, Math.max(1, Math.floor(tier))) - 1] as number;

const pct = (share: number): string => `${Math.round(share * 100)}%`;
/** To a tenth of a percent (4.8%). */
const fine = (share: number): string => `${Math.round(share * 1000) / 10}%`;

/** What each hero's weapon does at a tier, as its card and the heroes page say it. */
const ABOUT: Readonly<Record<string, (tier: number) => string>> = {
  clause: (tier) => `Every ${EXIAN.every}rd skill he uses, his ATK and defense are ${pct(atTier(EXIAN.boost, tier))} higher for ${EXIAN.lasts} seconds.`,
  kirze: (tier) => `Each of her blows has a ${pct(ELICIPIRA.chance)} chance to deal ${pct(atTier(ELICIPIRA.blow, tier) / 1000)} of her ATK more, doubled against the boss.`,
  'fallen-frey': (tier) => `Each skill she uses heals her by ${pct(atTier(ROSMERTA.heal, tier) / 1000)} of her ATK, and gives her +${atTier(ROSMERTA.pen, tier)} penetration for ${ROSMERTA.lasts} seconds.`,
  gremory: (tier) =>
    `+${atTier(PIGRITIA.speed, tier)} attack speed. Each time she sleeps she is healed by ${pct(atTier(PIGRITIA.heal, tier))} of her max HP and recovers ${pct(atTier(PIGRITIA.mana, tier))} of her mana over ${PIGRITIA.over} seconds, and each Mana Charge gives her ${fine(atTier(PIGRITIA.charge, tier))} more ATK.`,
  annette: (tier) =>
    `Every ${atTier(RASCAL.every, tier)} seconds she gains a Charge (even while Overcharged) and ${pct(RASCAL.mana)} of her mana. While she is Overcharged, every ally deals ${pct(RASCAL.dmg)} more and takes ${pct(RASCAL.taken)} less (${pct(RASCAL.dmg * RASCAL.top)} for the ally with the highest ATK).`,
  morrah: (tier) =>
    `Each blow of her attack has a ${pct(CARPRAIN.chance)} chance to leave the boss hitting ${pct(atTier(CARPRAIN.weaker, tier))} less hard and taking ${pct(atTier(CARPRAIN.weaker, tier))} more magical damage for ${CARPRAIN.lasts} seconds (${pct(atTier(CARPRAIN.weaker, tier) * CARPRAIN.full)} more with 100 Flame on it).`,
  laias: (tier) =>
    `Healing reaches every ally ${pct(atTier(ELTOIRRE.heals, tier))} more, and every ${ELTOIRRE.every} seconds she heals the ally with the lowest HP by ${pct(atTier(ELTOIRRE.mend, tier) / 1000)} of her ATK.`,
  seria: (tier) =>
    `Each critical blow of her skills deals ${pct(atTier(ELSION.blow, tier) / 1000)} of her ATK more, leaves the boss healed ${pct(atTier(ELSION.unhealed, tier))} less for ${ELSION.lasts} seconds, and heals her ${pct(atTier(ELSION.heals, tier))} more for ${ELSION.healed} seconds (up to ${ELSION.most} times).`,
  ezekiel: (tier) =>
    `His Fury lasts ${atTier(BARBATOS.longer, tier)} seconds longer, and while it does his crit damage is ${pct(atTier(BARBATOS.critDamage, tier))} higher and his CC resist +${atTier(BARBATOS.resist, tier)}.`,
  lorraine: (tier) =>
    `Every ${ROBURU.every} seconds, with her Poison on the boss, deals ${pct(atTier(ROBURU.blow, tier) / 1000)} of her ATK to it, and it takes ${pct(atTier(ROBURU.takes, tier))} more magical damage for ${ROBURU.lasts} seconds.`,
  valance: () =>
    `Every ally gains by the TechnoMagic gear it wears: with 1 piece, +${pct(CORBEAU.atk)} ATK; 2, +${pct(CORBEAU.defense)} defense; 3, +${pct(CORBEAU.hp)} max HP (it takes that much less); 4, +${pct(CORBEAU.dmg)} DMG.`,
};
const NAMES: Readonly<Record<string, string>> = { clause: EXIAN.name, kirze: ELICIPIRA.name, 'fallen-frey': ROSMERTA.name, gremory: PIGRITIA.name, annette: RASCAL.name, morrah: CARPRAIN.name, laias: ELTOIRRE.name, seria: ELSION.name, ezekiel: BARBATOS.name, lorraine: ROBURU.name, valance: CORBEAU.name };
/** The heroes that have a unique weapon, by id. */
export const UNIQUE_HEROES: readonly string[] = Object.keys(ABOUT);

/** What a hero's unique weapon does at a tier (null: it has none). */
export const uniqueAbout = (hero: string, tier: number): string | null => ABOUT[hero]?.(tier) ?? null;

/** A hero's unique weapon as it fights: its tier (null: none, or not its own, or one this fight doesn't know). */
export function uniqueOf(hero: string, tier: number | null | undefined): number | null {
  if (typeof tier !== 'number' || !Number.isFinite(tier) || !ABOUT[hero]) return null;
  return Math.min(TIERS, Math.max(1, Math.floor(tier)));
}

/** A hero's unique weapon, as a square on its card. */
export const uniqueBuff = (hero: string, tier: number): Buff => ({ name: `${NAMES[hero] ?? 'Unique weapon'} (★${tier})`, about: uniqueAbout(hero, tier) ?? '', icon: '🗡️', art: { uw: hero } });

/** What Exian gives Clause for a while, what Rosmerta gives Fallen Frey, what Rascal gives every ally while Annette is Overcharged, and what Eltoirre gives every ally while Laias is on the field. */
export const EXIAN_UP: Buff = { name: 'The Guardian, Exian', about: 'ATK and defense higher.', icon: '🛡️', art: { uw: 'clause' } };
export const ROSMERTA_UP: Buff = { name: 'Angel’s Despair, Rosmerta', about: 'Sees past more of the boss’s defense.', icon: '🖤', art: { uw: 'fallen-frey' } };
export const RASCAL_UP: Buff = { name: 'Crystallized Technomagic, Rascal', about: 'Deals more to the boss and takes less from it while Annette is [Overcharged].', icon: '🤖', art: { uw: 'annette' } };
export const ELTOIRRE_UP: Buff = { name: 'Flowing Circle, Eltoirre', about: 'Healing reaches it the more while Laias is on the field.', icon: '☥', art: { uw: 'laias' } };
export const ELSION_UP: Buff = { name: 'Executioner of Domains, Elsion', about: 'Healing reaches her the more.', icon: '⚔️', art: { uw: 'seria' } };
export const CORBEAU_UP: Buff = { name: 'Wonder of Magos Le’Flamme, Corbeau Rose', about: 'Gains by the TechnoMagic gear it wears while Valance is on the field.', icon: '🌹', art: { uw: 'valance' } };
