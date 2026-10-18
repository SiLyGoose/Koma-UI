/*
 * How the TechnoMagic Raid's heroes stand to King's Raid's playtest's (CBT2), for the bosses' numbers: each boss's are the
 * playtest's own (its tables': KR-extracted/scripts/boss-stats.mjs), its health and how hard it hits scaled by these.
 *
 * A hero here has what a playtest hero has at level 80 (the King's Raid Index's class stats: 0.794 of one at level 100, 5★,
 * Transcend 5), the same unique weapon, TechnoMagic gear and unique treasures, and the same perks; but none of the playtest's
 * class buffs (+52% ATK and HP in its raids), skill books (+50% to each skill's DMG) or soul weapons (about +60k ATK and
 * +1.1M HP). With a raid's usual gear (UW R5, a TechnoMagic weapon, UT R5, ATK potentials), worked out from those tables:
 * - its ATK about 0.53 of a playtest hero's, and with its skills' books besides, its damage about 0.39 of it;
 * - its health about 0.59 of it.
 */
export const HEROES_DEAL = 0.39;
export const HEROES_HP = 0.59;
/** The heroes of a raid fought with others here (alone: 7). */
export const PARTY = 8;
