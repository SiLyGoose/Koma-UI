/*
 * How the TechnoMagic Raid's heroes stand to King's Raid's playtest's (CBT2), for the bosses' numbers: each boss's are the
 * playtest's own (its tables': KR-extracted/scripts/boss-stats.mjs), its health and how hard it hits scaled by these.
 *
 * A hero here has what a playtest hero has at level 80 (the King's Raid Index's class stats: 0.794 of one at level 100, 5★,
 * Transcend 5), the same unique weapon, TechnoMagic gear and unique treasures, the same perks, all its skills' books and the
 * class buffs at their most (../rules.ts CLASS_BUFF); but no soul weapon (about +57k ATK and +1.4M HP at +20). With a raid's
 * usual gear (UW R5, a TechnoMagic weapon, UT R5, ATK potentials), worked out from those tables: its damage about 0.68 of a
 * playtest hero's, and its health about 0.74 of it.
 */
export const HEROES_DEAL = 0.68;
export const HEROES_HP = 0.74;
/** The heroes of a raid fought with others here (alone: 7). */
export const PARTY = 8;
