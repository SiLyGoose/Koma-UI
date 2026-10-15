import type { Buff } from '../hud/buff';

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
 *   filled a share over 2 seconds, and her Mana Charge raises her ATK more. (Her part does it: ../heroes/gremory/.)
 * - Annette, Crystallized Technomagic, Rascal: every so often she gains a Charge (even while Overcharged) and a
 *   little mana; and while she is Overcharged every ally deals more and takes less, twice as much for the ally with
 *   the highest ATK. (Her part does it: ../heroes/annette/.)
 *
 * The game's shares of ATK are as they are for damage (this raid's blows are counted in thousandths of them, at ATK: ../combat/);
 * a heal is the game's share of ATK scaled by its heroes' HP to their ATK (some 86 to 1, where here it is
 * about 1 to 1), so it mends as much of her health as it would there.
 */

/** Each weapon's numbers at tiers 1 to 5 (index 0 is tier 1). */
export const EXIAN = { name: 'The Guardian, Exian', every: 3, lasts: 15, boost: [0.12, 0.14, 0.17, 0.21, 0.25] };
export const ELICIPIRA = { name: 'Judgment Edge, Elicipira', chance: 0.04, boss: 2, blow: [6000, 7200, 8600, 10000, 12500] };
export const ROSMERTA = { name: 'Angel’s Despair, Rosmerta', lasts: 7, heal: [20, 24, 29, 35, 42], pen: [240, 290, 350, 420, 500] };
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
};
const NAMES: Readonly<Record<string, string>> = { clause: EXIAN.name, kirze: ELICIPIRA.name, 'fallen-frey': ROSMERTA.name, gremory: PIGRITIA.name, annette: RASCAL.name };
/** Each weapon's picture: its item's (the bot's catalog id, public/gear/items/weapons/). */
const PICTURES: Readonly<Record<string, string>> = {
  clause: '/gear/items/weapons/the-guardian-exian.png',
  kirze: '/gear/items/weapons/judgment-edge-elicipira.png',
  'fallen-frey': '/gear/items/weapons/angels-despair-rosmerta.png',
  gremory: '/gear/items/weapons/gateway-to-purgatory-pigritia.png',
  annette: '/gear/items/weapons/crystallized-technomagic-rascal.png',
};

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
export const uniqueBuff = (hero: string, tier: number): Buff => ({ name: `${NAMES[hero] ?? 'Unique weapon'} (★${tier})`, about: uniqueAbout(hero, tier) ?? '', icon: '🗡️', image: PICTURES[hero] });

/** What Exian gives Clause for a while, what Rosmerta gives Fallen Frey, and what Rascal gives every ally while Annette is Overcharged. */
export const EXIAN_UP: Buff = { name: 'The Guardian, Exian', about: 'ATK and defense higher.', icon: '🛡️', image: PICTURES.clause };
export const ROSMERTA_UP: Buff = { name: 'Angel’s Despair, Rosmerta', about: 'Sees past more of the boss’s defense.', icon: '🖤', image: PICTURES['fallen-frey'] };
export const RASCAL_UP: Buff = { name: 'Crystallized Technomagic, Rascal', about: 'Deals more to the boss and takes less from it while Annette is Overcharged.', icon: '🤖', image: PICTURES.annette };
