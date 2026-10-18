import { Vector3 } from 'three';
import type { Status } from '../sim/combat/status';
import type { EffectName } from '../assets';
import type { Effects } from './effects';

/*
 * What is shown as something comes on a fighter (the game's own signs, ../assets/effects.ts): over a hero, a gold
 * shield as its defense is raised (or what it takes lowered), a blue one for its magic defense alone, a winged boot as
 * it is quickened, green arcs as it is healed; over the boss, a shield breaking as its defense is lowered (or what it
 * takes raised), an hourglass as it is slowed, stars going round as it is stunned. Each once, as it comes on (not as
 * it is renewed while it is on, as an aura is: only once it has run out first): the fight is told nothing, only looked at.
 */

/** A sign shows at most this often on each (seconds): what is put on over and over (a heal, a debuff each blow renews) isn't a flicker. */
const AGAIN = 1.5;
/** How high over a hero's head its signs are, and over the boss's middle (where a hit lands) its own. */
const OVER = { hero: 0.75, boss: 1.6 };

export interface Signs {
  /** What is on a hero now (its own statuses and the party's), its head where `head` puts it. */
  hero(who: number, on: readonly Status<unknown>[], head: () => Vector3): void;
  /** A hero is healed. */
  healed(who: number, at: Vector3): void;
  /** What is on the boss now, `hit` its middle. */
  boss(on: readonly Status<unknown>[], hit: Vector3): void;
  /** The boss is stunned (`down`: knocked down), or slowed. */
  dazed(hit: Vector3): void;
  slowed(hit: Vector3): void;
  update(dt: number): void;
  clear(): void;
}

const better = (value: number | Partial<Record<string, number>> | undefined, more: boolean): string[] => {
  if (value === undefined) return [];
  const each = typeof value === 'number' ? { physical: value, magical: value } : value;
  return Object.entries(each).flatMap(([kind, times]) => (times !== undefined && (more ? times > 1 : times < 1) ? [kind] : []));
};

/** A hero's sign for a status put on it (null: none). */
function heroSign(status: Status<unknown>): EffectName | null {
  const kinds = new Set([...better(status.defends, true), ...better(status.takes, false), ...Object.keys(status.blocks ?? {})]);
  if (kinds.has('physical')) return 'guard';
  if (kinds.has('magical')) return 'ward';
  if ((status.pace ?? 1) > 1) return 'haste';
  return null;
}

/** The boss's sign for a status put on it (null: none). (Its being stunned or slowed the fight tells of by itself: dazed, slowed.) */
function bossSign(status: Status<unknown>): EffectName | null {
  return better(status.defends, false).length > 0 || better(status.takes, true).length > 0 ? 'weaken' : null;
}

/**
 * The signs, drawn with `effects`; or, where `own` plays the game's own for a sign (on a hero, by its index among the
 * fighters; on the boss, -1) and says so, with that.
 */
export function makeSigns(effects: Effects, own?: (who: number, sign: EffectName) => boolean): Signs {
  /** The names of the statuses on each when last looked at (by hero, and the boss's under -1). */
  let shown = new Map<number, Set<string>>();
  /** When each sign was last shown on each (by `who:sign`, the boss's as -1). */
  const last = new Map<string, number>();
  let now = 0;
  const at = new Vector3();

  /** The ones among `on` that weren't on last time (and forgets the ones gone). */
  const fresh = (key: number, on: readonly Status<unknown>[]): Status<unknown>[] => {
    const before = shown.get(key);
    shown.set(key, new Set(on.map((status) => status.name)));
    // (The first look at it is how the fight stood: nothing new.)
    return before ? on.filter((status) => !before.has(status.name)) : [];
  };
  const play = (who: number, name: EffectName, where: Vector3, y: number): void => {
    const key = `${who}:${name}`;
    if (now - (last.get(key) ?? -Infinity) < AGAIN) return;
    last.set(key, now);
    if (!own?.(who, name)) effects.play(name, at.copy(where).setY(where.y + y));
  };

  return {
    hero(who, on, head) {
      const signs = new Set(fresh(who, on).map(heroSign).filter((sign) => sign !== null));
      for (const sign of signs) play(who, sign, head(), OVER.hero);
    },
    healed(who, where) {
      play(who, 'heal', where, 0);
    },
    boss(on, hit) {
      if (fresh(-1, on).some((status) => bossSign(status) !== null)) play(-1, 'weaken', hit, 0);
    },
    dazed(hit) {
      play(-1, 'stun', hit, OVER.boss);
    },
    slowed(hit) {
      play(-1, 'slow', hit, 0);
    },
    update(dt) {
      now += dt;
    },
    clear() {
      shown = new Map();
      last.clear();
    },
  };
}
