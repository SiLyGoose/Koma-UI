/*
 * The skeleton the heroes come on: the game's own, and which of its bones are which (what a pose moves).
 */

/**
 * The bones a pose moves, by what they are: a skeleton's own names for them. The hips carry the whole
 * body; a leg is its thigh, calf and foot, an arm its upper arm, forearm and hand.
 */
export interface Skeleton {
  hips: string;
  /** The two bones of the chest: a lean or a twist is shared between them. */
  chest: readonly [string, string];
  head: string;
  legs: { L: readonly [string, string, string]; R: readonly [string, string, string] };
  arms: { L: readonly [string, string, string]; R: readonly [string, string, string] };
}

/** The game's own skeleton. */
export const BIPED: Skeleton = {
  hips: 'Bip001',
  chest: ['Bip001_Spine1', 'Bip001_Spine2'],
  head: 'Bip001_Head',
  legs: { L: ['Bip001_L_Thigh', 'Bip001_L_Calf', 'Bip001_L_Foot'], R: ['Bip001_R_Thigh', 'Bip001_R_Calf', 'Bip001_R_Foot'] },
  arms: { L: ['Bip001_L_UpperArm', 'Bip001_L_Forearm', 'Bip001_L_Hand'], R: ['Bip001_R_UpperArm', 'Bip001_R_Forearm', 'Bip001_R_Hand'] },
};
