import type { BossScale } from '../boss';

/*
 * Divine Punishment's Infinite levels, as King's Raid's playtest has them (its InfinityStatTable, the bosses' team's affixes of
 * groups 10000 and 10001: KR-extracted/briefs/divine-punishment.md §5.1): a boss dungeon is unlocked at a level (1 on, one past
 * the highest cleared at most), and every enemy in it is the stronger for it: ATK and max HP so many thousandths more
 * (ModPowerR from level 2, ModMaxHpR from level 6), the same in both groups. (Taken as added to the enemy's own: an inference,
 * as the brief says; Tersio's, Apocalypsion's and Solenis' OverrideStat of their base ATK may cancel the ATK part in the game.)
 * The fight's stage is the level. Only fought alone (King's Raid's 4 Main and 4 Sub heroes), so its stages alone are the same.
 */

/** The highest level the fight has numbers for (the table goes on past it, +100‰ a level each, as here). */
export const DIVINE_LEVELS = 99;

/** ATK more at a level (thousandths): +100 a level to level 6, then +100 every other level to level 12, then +100 a level. */
export function infiniteAtk(level: number): number {
  if (level < 2) return 0;
  if (level <= 6) return (level - 1) * 100;
  if (level <= 12) return 500 + Math.floor((level - 6) / 2) * 100;
  return 800 + (level - 12) * 100;
}

/** Max HP more at a level (thousandths): none to level 5, then 200 at level 6 and +100 a level. */
export const infiniteHp = (level: number): number => (level < 6 ? 0 : (level - 4) * 100);

/**
 * A boss's levels (1 to DIVINE_LEVELS) as its stages: so many times its health and as hard its blows as its level has them,
 * times `hp` and `deals` besides (what the side fights add to a final boss: ./apocalypsion.ts), at King's Raid's `level`
 * (the wave's creature level: 100, Armarta's 120). Alone the same.
 */
export function infiniteStages({ hp = 1, deals = 1, level = 100 }: { hp?: number; deals?: number; level?: number } = {}): { room: BossScale[]; solo: BossScale[] } {
  const room = Array.from({ length: DIVINE_LEVELS }, (_, i) => ({ hp: hp * (1 + infiniteHp(i + 1) / 1000), deals: deals * (1 + infiniteAtk(i + 1) / 1000), level }));
  return { room, solo: room };
}
