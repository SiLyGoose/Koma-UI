import type { HeroStats } from '../combat/damage';
import type { GearBonus } from './types';

/* What a hero's gear does to its stats in the fight (the bot says what it gives: ./types.ts GearBonus). */

/** A hero's stats with what its gear gives it (as ../../heroes/stats.ts shows them). */
export function geared(stats: HeroStats, gear: GearBonus = {}): HeroStats {
  const more = (n: number, by: number | undefined): number => n * (1 + (by ?? 0));
  const plus = (n: number, by: number | undefined): number => n + (by ?? 0);
  return {
    ...stats,
    hp: more(stats.hp, gear.hp),
    atk: more(stats.atk, gear.atk),
    physical: more(stats.physical, gear.defense),
    magical: more(stats.magical, gear.defense),
    crit: plus(stats.crit, gear.crit),
    speed: plus(stats.speed, gear.speed),
    pen: plus(stats.pen, gear.pen),
    resist: plus(stats.resist, gear.resist),
    block: { physical: plus(stats.block.physical, gear.block), magical: plus(stats.block.magical, gear.block) },
    dodge: { physical: plus(stats.dodge.physical, gear.dodge), magical: plus(stats.dodge.magical, gear.dodge) },
  };
}
