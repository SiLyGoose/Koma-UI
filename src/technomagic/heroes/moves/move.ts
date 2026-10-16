import { flowAt, type Key } from '../../engine/track';
import { STILL, type Pose } from '../body/pose';

/*
 * A move: what a hero's body does for its attack, a skill, or being hit, as a track of poses
 * (../../engine/track.ts), written to fit how the fight times it (../../sim/heroes/moves.ts: when each of its
 * blows lands, and when it is over). What comes of it (the hits, what they do to the boss, what is drawn) is for
 * whoever is told each part has landed (../../sim/heroes/kit.ts).
 */

/** A track. */
export interface Move {
  keys: Key<Pose>[];
}

/**
 * A movement runs through the body, not all of it at once: the hips and feet go first, the chest with
 * the track, the head and hands a moment behind, and the blade last, dragging after the hand. Each part
 * of the pose is read this much ahead of (or behind) the track's time.
 */
const LEADS = 0.035;
const BEHIND: Partial<Record<keyof Pose, number>> = { nod: 0.02, look: 0.02, lhX: 0.03, lhY: 0.03, lhZ: 0.03, rhX: 0.03, rhY: 0.03, rhZ: 0.03, bTurn: 0.07, bUp: 0.07 };
const FIRST: readonly (keyof Pose)[] = ['hipX', 'hipY', 'hipZ', 'hipTurn', 'lfX', 'lfY', 'lfZ', 'rfX', 'rfY', 'rfZ'];

/** The pose `t` seconds into a move, each part read at its own moment. */
export function flowing(move: Move, t: number): Pose {
  const pose = flowAt(move.keys, t, STILL);
  const early = flowAt(move.keys, t + LEADS, STILL);
  for (const part of FIRST) pose[part] = early[part];
  const late = new Map<number, Pose>();
  for (const [part, by] of Object.entries(BEHIND) as [keyof Pose, number][]) {
    let then = late.get(by);
    if (!then) late.set(by, (then = flowAt(move.keys, Math.max(0, t - by), STILL)));
    pose[part] = then[part];
  }
  return pose;
}
