import type { Group, Vector3 } from 'three';
import type { BossAssets } from '../assets';
import type { Scenery } from '../engine/stage';

/*
 * A boss as the page draws it: how it looks and where it stands (BossLook), and its body on the field (Boss), drawn
 * doing what the fight says it does. What a boss is in the fight is ../sim/bosses/; each boss's body is a folder here,
 * ./models.ts lists them.
 */

/** A boss's files, where it stands along the field (and how far it is turned from side-on toward the camera), and from there where a hero's cut reaches it (a little toward the camera) and the floor under it. */
export interface BossLook {
  assets: BossAssets;
  stands: { x: number; turn: number };
  reach: { hit: readonly [number, number, number]; feet: readonly [number, number, number] };
  /** Which of its attacks are its skills, not plain attacks (by their names): as a blow of one lands, the fight holds still and goes dark but for it. */
  skills?: readonly string[];
  /** Where it is fought (without, a plain field). */
  scenery?: Scenery;
  /** What the bar under its health is (the fight's gauge()): its CC gauge (none said), or its mana (Siegfried's, as King's Raid shows it). */
  gauge?: 'cc' | 'mana';
}

/** The boss's body on the field: drawn doing what the sim says it does. */
export interface Boss {
  /** Where it stands on the field: put this in the scene. */
  root: Group;
  /** Begins one of its attacks (by its name). */
  use(attack: string): void;
  /** Stunned for so many seconds (or longer, if it already is): what it was doing is cut short, lower when it is knocked `down`. */
  daze(seconds: number, down?: boolean): void;
  /** Its attacks go at `rate` of their speed for so many seconds. */
  slow(rate: number, seconds: number): void;
  /** Hit: white for a moment, and shaken. */
  hit(): void;
  /** A raid of more than one wave: it flies off the field (then isn't drawn), and lands back on it. */
  leave?(): void;
  arrive?(): void;
  /** Standing where it stands again, as a fight begins (whatever it was doing as the last ended: flown off, lying down). */
  reset?(): void;
  /** Where whoever it is fighting is, on the field (their chest): asked as it attacks, put in `into`. The page sets it. */
  target: (into: Vector3) => Vector3;
  /**
   * Launches its attack's projectile (King's Raid's own: its assets' vfx fly) from `from` to `to`, there in `time`
   * seconds: as its body spits it (Galgoria's heads). The page sets it.
   */
  launch?: (from: Vector3, to: Vector3, time: number) => void;
  /** Drawn so many times its own size (the fight's size(): Siegfried grown as he rises the second time). */
  size?(times: number): void;
  update(now: number, dt: number): void;
}
