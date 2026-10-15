import type { Bone, Object3D } from 'three';
import type { Follow, Plan } from '../../engine/retarget';

/*
 * The skeletons the heroes come on: the game's own, and Mixamo's (a skin rigged and animated outside
 * the game's files); and how the first follows the second, to be moved by its animations.
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

/** Mixamo's skeleton. */
export const MIXAMO: Skeleton = {
  hips: 'mixamorigHips',
  chest: ['mixamorigSpine1', 'mixamorigSpine2'],
  head: 'mixamorigHead',
  legs: { L: ['mixamorigLeftUpLeg', 'mixamorigLeftLeg', 'mixamorigLeftFoot'], R: ['mixamorigRightUpLeg', 'mixamorigRightLeg', 'mixamorigRightFoot'] },
  arms: { L: ['mixamorigLeftArm', 'mixamorigLeftForeArm', 'mixamorigLeftHand'], R: ['mixamorigRightArm', 'mixamorigRightForeArm', 'mixamorigRightHand'] },
};

const side = (own: 'L' | 'R', other: 'Left' | 'Right'): Follow[] => {
  const limb = (bone: string, from: string, next: string, otherNext: string): Follow => ({ bone: `Bip001_${own}_${bone}`, from: `mixamorig${other}${from}`, along: { own: [`Bip001_${own}_${bone}`, `Bip001_${own}_${next}`], other: [`mixamorig${other}${from}`, `mixamorig${other}${otherNext}`] } });
  return [
    { bone: `Bip001_${own}_Clavicle`, from: `mixamorig${other}Shoulder` },
    limb('UpperArm', 'Arm', 'Forearm', 'ForeArm'),
    limb('Forearm', 'ForeArm', 'Hand', 'Hand'),
    // The bone the forearm's skin twists on hangs from the upper arm, at the elbow: it goes as the forearm does.
    { bone: `Bip001_${own}_ForeTwist`, from: `mixamorig${other}ForeArm`, along: { own: [`Bip001_${own}_Forearm`, `Bip001_${own}_Hand`], other: [`mixamorig${other}ForeArm`, `mixamorig${other}Hand`] } },
    { bone: `Bip001_${own}_Hand`, from: `mixamorig${other}Hand` },
    limb('Thigh', 'UpLeg', 'Calf', 'Leg'),
    // And the thigh's, from the spine, at the hip.
    { bone: `Bip001_${own}ThighTwist`, from: `mixamorig${other}UpLeg`, along: { own: [`Bip001_${own}_Thigh`, `Bip001_${own}_Calf`], other: [`mixamorig${other}UpLeg`, `mixamorig${other}Leg`] } },
    limb('Calf', 'Leg', 'Foot', 'Foot'),
    { bone: `Bip001_${own}_Foot`, from: `mixamorig${other}Foot` },
    { bone: `Bip001_${own}_Toe0`, from: `mixamorig${other}ToeBase` },
  ];
};

/** The bones both skeletons call the same: its ears, hair and tail. */
const SAME = [
  ...['L', 'R'].flatMap((at) => [1, 2].map((n) => `Bone_Ear_${at}0${n}`)),
  ...['F', 'FL', 'FR'].flatMap((at) => [1, 2].map((n) => `Bone_Hair_${at}0${n}`)),
  ...['BL', 'BR'].flatMap((at) => [1, 2, 3, 4].map((n) => `Bone_Hair_${at}0${n}`)),
  ...[1, 2, 3, 4].map((n) => `Bone_Tail_0${n}`),
];

/** The game's skeleton following itself (an animation of the game's own, made for another of its models: a cutscene's): each bone its own, by name, of those `from` has. */
export function bipedFromBiped(from: Object3D): Plan {
  const follows: Follow[] = [];
  from.traverse((o) => {
    if ((o as Bone).isBone && o.parent?.name !== o.name) follows.push({ bone: o.name, from: o.name });
  });
  return { follows, hips: { bone: BIPED.hips, from: BIPED.hips }, leg: { own: BIPED.legs.L, other: BIPED.legs.L } };
}

/** The game's skeleton following Mixamo's. */
export const BIPED_FROM_MIXAMO: Plan = {
  follows: [
    { bone: 'Bip001', from: 'mixamorigHips' },
    { bone: 'Bip001_Spine', from: 'mixamorigSpine' },
    { bone: 'Bip001_Spine1', from: 'mixamorigSpine1' },
    { bone: 'Bip001_Spine2', from: 'mixamorigSpine2' },
    { bone: 'Bip001_Neck', from: 'mixamorigNeck' },
    { bone: 'Bip001_Head', from: 'mixamorigHead' },
    ...side('L', 'Left'),
    ...side('R', 'Right'),
    ...SAME.map((bone) => ({ bone, from: bone })),
  ],
  hips: { bone: 'Bip001', from: 'mixamorigHips' },
  leg: { own: ['Bip001_L_Thigh', 'Bip001_L_Calf', 'Bip001_L_Foot'], other: ['mixamorigLeftUpLeg', 'mixamorigLeftLeg', 'mixamorigLeftFoot'] },
};
