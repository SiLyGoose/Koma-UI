import { put } from '../combat/status';
import type { Fight } from '../types';
import type { BossPart } from './boss';

/*
 * A boss's CC Gauge, as King's Raid's playtest has it (BossCcGauge; each raid's numbers in its CampaignTacticTable): no
 * stun holds the boss. A hero's stun (or knock down) takes PER from the gauge for every second it would have held it,
 * and the gauge doesn't fill again for a thousandth of a second for each it took; then it fills `regen` a second. Empty,
 * the boss is Down for DOWN seconds (what it was doing cut short), taking no more than it would otherwise; up again,
 * its gauge is full within REFILL seconds, and nothing takes from it meanwhile.
 */

/** How big a boss's gauge is, and how much of it fills again a second. */
export interface GaugeSize {
  full: number;
  regen: number;
}
/** Galgoria's (chapter 10's), and the Hard Dragon Raid's (911 to 914's). */
export const GALGORIA_GAUGE: GaugeSize = { full: 100_000, regen: 7_000 };
export const DRAGON_GAUGE: GaugeSize = { full: 30_000, regen: 3_000 };

/** What a second of a stun takes from it (a stun's or a knock down's CC power alike: the game's 1000 for each). */
const PER = 1_000;
/** How long the boss is Down once its gauge is empty; and how long its gauge then takes to fill. */
export const DOWN = 5;
const REFILL = 1;

const DOWNED = { name: 'Down', shown: 'down' } as const;

/** A boss's part (`own`) with its CC Gauge of `size`. */
export function withGauge(fight: Fight, own: BossPart, size: GaugeSize): BossPart {
  const { foe } = fight;
  let gauge = size.full;
  /** How long it is yet before the gauge fills again; how long it is Down for yet; how long its gauge is filling after it, yet. */
  let still = 0;
  let downed = 0;
  let refill = 0;
  return {
    ...own,
    controlled(seconds) {
      // (Down, or getting up: nothing takes from it.)
      if (downed > 0 || refill > 0) return null;
      const took = seconds * PER;
      gauge -= took;
      still = Math.max(still, took / 1000);
      if (gauge > 0) return null;
      gauge = 0;
      downed = DOWN;
      put(foe.statuses, { name: DOWNED.name, left: DOWN, shown: DOWNED.shown });
      fight.cue(null, 'gauge');
      return { seconds: DOWN, down: true };
    },
    tick(dt) {
      if (downed > 0) {
        downed = Math.max(0, downed - dt);
        if (downed === 0) refill = REFILL;
      } else if (refill > 0) {
        gauge = Math.min(size.full, gauge + (size.full / REFILL) * dt);
        refill = Math.max(0, refill - dt);
        if (refill === 0) gauge = size.full;
      } else if (still > 0) still = Math.max(0, still - dt);
      else gauge = Math.min(size.full, gauge + size.regen * dt);
      own.tick?.(dt);
    },
    beaten() {
      gauge = size.full;
      downed = 0;
      refill = 0;
      own.beaten?.();
    },
    // (Down, it is empty: its Down says for how long.)
    gauge: () => gauge / size.full,
  };
}
