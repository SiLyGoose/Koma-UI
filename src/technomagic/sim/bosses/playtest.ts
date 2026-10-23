/*
 * How the TechnoMagic Raid's heroes stand to King's Raid's playtest's (CBT2), for the dragons' numbers: each one's are the
 * playtest's own (its tables': KR-extracted/scripts/boss-stats.mjs), its health and how hard it hits scaled by these.
 * (Galgoria's are King's Raid's own, not scaled: ./galgoria/index.ts.)
 *
 * A hero here has what a playtest hero has at level 100, 5★, Transcend 5 (../heroes/kit.ts), the same unique weapon,
 * TechnoMagic gear and unique treasures, the same perks, all its skills' books and the class buffs at their most (../rules.ts
 * CLASS_BUFF); but no soul weapon (about +57k ATK and +1.4M HP at +20). With a raid's usual gear (UW R5, a TechnoMagic weapon,
 * UT R5, ATK potentials), worked out from those tables: its damage about 0.71 of a playtest hero's, and its health about 0.78.
 */
export const HEROES_DEAL = 0.71;
export const HEROES_HP = 0.78;
/** The heroes of the TechnoMagic Raid fought with others here (alone: 7); a dragon's are dragon/common.ts DRAGON_PARTY. */
export const PARTY = 8;
