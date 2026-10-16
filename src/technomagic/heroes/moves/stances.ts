/*
 * How a hero's legs are through a move, as they are in the game: never one stance held, but low and
 * long when it strikes and gathered up between. Each is where the feet are and how low the hips, with
 * the lean that goes with it. (Parts of a pose: ../body/pose.ts.)
 */

/** A deep lunge: the left knee bent far ahead, the right leg stretched out straight behind on its toes, the hips low. */
export const LUNGE = { hipX: 0, tilt: 0, hipY: -0.27, hipZ: 0.13, lfX: 0.05, lfZ: 0.5, rfX: -0.06, rfZ: -0.43, rfTip: 0.55 };
/** Low with its feet far apart and its weight between them: the second of two sweeps, its hips swung back. */
export const WIDE = { hipX: 0, tilt: 0, hipY: -0.3, hipZ: -0.05, lfX: 0.06, lfZ: 0.43, rfX: -0.08, rfZ: -0.48, rfTip: 0.2 };
/** Coiled: its feet under it and its knees bent, about to go. */
export const COILED = { hipX: 0, tilt: 0, hipY: -0.2, lfX: 0.04, lfZ: 0.12, rfX: -0.05, rfZ: -0.1 };
/** Drawn up tall, its feet together and the front one lifted to its toes. */
export const TALL = { hipX: 0, tilt: 0, hipY: 0.01, lfX: 0.03, lfY: 0.04, lfZ: 0.07, lfTip: 0.5, rfX: -0.03, rfZ: -0.05 };
/** In the air, its knees pulled up under it. */
export const TUCKED = { hipX: 0, tilt: 0, hipY: 0.03, lfX: 0.04, lfY: 0.3, lfZ: 0.12, rfX: -0.04, rfY: 0.36, rfZ: -0.02 };
/** In the air, its legs thrown apart, one ahead and one behind: going over in the flip. */
export const SPLIT = { hipX: 0, tilt: 0, hipY: 0.03, lfX: 0.05, lfY: 0.22, lfZ: 0.52, lfTip: 0.6, rfX: -0.05, rfY: 0.3, rfZ: -0.5, rfTip: 0.6 };
/** Landed, down almost to one knee. */
export const KNEELING = { hipX: 0, tilt: 0, hipY: -0.42, hipZ: 0.05, lfX: 0.05, lfZ: 0.32, rfX: -0.06, rfZ: -0.3, rfTip: 0.7 };

/** Low and wide, a foot ahead: how it stands to cut. */
export const LOW = { hipX: 0, hipY: -0.1, tilt: 0, lfX: 0.04, lfZ: 0.2, rfX: -0.05, rfZ: -0.14 };
