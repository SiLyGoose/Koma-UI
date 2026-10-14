/*
 * How a hero's body is at a moment: where its hips are, how its chest and head are turned, where its feet
 * and hands are, and which way its blade points. Nothing here is drawn (the fight's sim reads the moves
 * written with it: ../../sim/); ./posing.ts stands a skeleton so.
 *
 * In the model's own axes z is ahead of it, y up and x to its left; lengths are the model's, before it
 * is drawn bigger.
 */

/** Once round. */
export const TURN = Math.PI * 2;

/**
 * The body: stepped `ahead` along the field, off the floor (`jump`, as the field measures it) and turned
 * head over heels (`flip`); its hips moved and turned to its left; its chest leaning in, twisted to its
 * left and tilted; its head nodding and looking to its left; each foot (lf, rf) from where it stands, and
 * how far it is up on its toes (Tip); and
 * each hand (lh, rh) from the hips; and the way its blade points: turned from straight ahead toward its left
 * (bTurn) and raised (bUp), both angles, so that a sweep from one side to the other goes round through what is
 * between them. Raised past straight up, it points behind.
 */
export type Pose = {
  ahead: number;
  jump: number;
  flip: number;
  /** Spun round where it stands, to its left. */
  spin: number;
  hipX: number;
  hipY: number;
  hipZ: number;
  hipTurn: number;
  lean: number;
  twist: number;
  tilt: number;
  nod: number;
  look: number;
  lfX: number;
  lfY: number;
  lfZ: number;
  rfX: number;
  rfY: number;
  rfZ: number;
  lfTip: number;
  rfTip: number;
  lhX: number;
  lhY: number;
  lhZ: number;
  rhX: number;
  rhY: number;
  rhZ: number;
  bTurn: number;
  bUp: number;
};

export const STILL: Pose = { ahead: 0, jump: 0, flip: 0, spin: 0, hipX: 0, hipY: 0, hipZ: 0, hipTurn: 0, lean: 0, twist: 0, tilt: 0, nod: 0, look: 0, lfX: 0, lfY: 0, lfZ: 0, rfX: 0, rfY: 0, rfZ: 0, lfTip: 0, rfTip: 0, lhX: 0, lhY: 0, lhZ: 0, rhX: 0, rhY: 0, rhZ: 0, bTurn: 0, bUp: 0 };

/**
 * At rest: its weight on its right leg, the left foot out a little; the blade across its back, held low
 * in its right hand behind its hip and running up past its left shoulder; its left hand hanging loose
 * by its side.
 */
export const REST: Pose = {
  ...STILL,
  hipX: -0.045,
  hipY: -0.02,
  hipTurn: -0.12,
  lean: 0.02,
  tilt: 0.05,
  lfX: 0.07,
  lfZ: 0.06,
  rfX: -0.01,
  rfZ: -0.02,
  lhX: 0.21,
  lhY: -0.1,
  lhZ: 0.02,
  rhX: -0.25,
  rhY: 0.02,
  rhZ: -0.1,
  bTurn: 1.9,
  bUp: 0.9,
};

/** A pose as it is, for a track: tracks hold what is added to standing at rest (`from`: how the hero whose track it is stands, REST unless it has a stance of its own). */
export function at(pose: Partial<Pose>, from: Pose = REST): Partial<Pose> {
  const added: Partial<Pose> = {};
  for (const part of Object.keys(pose) as (keyof Pose)[]) added[part] = (pose[part] as number) - from[part];
  return added;
}
