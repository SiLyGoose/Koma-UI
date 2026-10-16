import { POINTS, type HeroStats } from './combat/damage';
import type { GearBonus } from './types';

/* What a hero's gear gives it in the fight (the bot says what it gives: ./types.ts GearBonus). */

/** A hero's stats with what its gear gives it (as ../../heroes/stats.ts shows them). Flat ATK (a unique weapon's) and flat HP (a main unique treasure's) are added before the shares of them. */
export function geared(stats: HeroStats, gear: GearBonus = {}): HeroStats {
  const more = (n: number, by: number | undefined): number => n * (1 + (by ?? 0));
  const plus = (n: number, by: number | undefined): number => n + (by ?? 0);
  const both = (by: number | undefined, one: number | undefined): number => (by ?? 0) + (one ?? 0);
  return {
    ...stats,
    hp: more(plus(stats.hp, gear.hpFlat), gear.hp),
    atk: more(plus(stats.atk, gear.atkFlat), gear.atk),
    physical: more(stats.physical, both(gear.defense, gear.defPhysical)),
    magical: more(stats.magical, both(gear.defense, gear.defMagical)),
    crit: plus(stats.crit, gear.crit),
    speed: plus(stats.speed, gear.speed),
    pen: plus(stats.pen, gear.pen),
    resist: plus(stats.resist, gear.resist),
    block: { physical: plus(stats.block.physical, both(gear.block, gear.blockPhysical)), magical: plus(stats.block.magical, both(gear.block, gear.blockMagical)) },
    dodge: { physical: plus(stats.dodge.physical, gear.dodge), magical: plus(stats.dodge.magical, gear.dodge) },
    // (Block DEF a share more taken off a blocked blow, and gear's in points: 1000 is 100%.)
    blockDef: {
      physical: (stats.blockDef?.physical ?? 0) + both(gear.blockDef, gear.blockDefPhysical) / POINTS,
      magical: (stats.blockDef?.magical ?? 0) + both(gear.blockDef, gear.blockDefMagical) / POINTS,
    },
    tough: { physical: plus(stats.tough?.physical ?? 0, both(gear.tough, gear.toughPhysical)), magical: plus(stats.tough?.magical ?? 0, both(gear.tough, gear.toughMagical)) },
  };
}
