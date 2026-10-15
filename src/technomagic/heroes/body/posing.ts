import { Vector3 } from 'three';
import type { Rig } from '../../engine/rig';
import type { Bends, Pose } from './pose';
import type { Skeleton } from './skeletons';

/*
 * Standing a skeleton in a pose (./pose.ts). A hero's files have no animation (or none for a skill), so it
 * is moved here, the whole body at once: the legs and arms bent to reach where the pose puts the feet and
 * hands (../../engine/rig.ts).
 */

/** The way each joint bends: knees ahead and a little out, elbows down and behind. */
const KNEE = { L: new Vector3(0.15, 0, 1), R: new Vector3(-0.15, 0, 1) };
const ELBOW = { L: new Vector3(0.4, -0.7, -0.6), R: new Vector3(-0.4, -0.7, -0.6) };
/** The ways a body's own bends have them (where it doesn't say, KNEE's and ELBOW's). */
const bent = { lKnee: new Vector3(), rKnee: new Vector3(), lElbow: new Vector3(), rElbow: new Vector3() };
/** The strands of hair down its back and the bones of each, and of its tail. */
const HAIR = ['Bone_Hair_BL0', 'Bone_Hair_BR0'];
const STRAND = 4;

const target = new Vector3();
const way = new Vector3();

/**
 * Stands a skeleton in a pose, from how it stands at rest: its hips, chest and head; its feet where the
 * pose puts them from `feet` (where they stand at rest), flat on the floor or up on their toes, the legs
 * bending to them; its hands placed from `hips` (where those are at rest), the arms bending to them; and
 * the blade in its right hand, which runs along `blade` in that hand's own axes, pointing where it is told. Its
 * knees and elbows bend the usual ways but where `bends` says otherwise.
 */
export function poseBody(rig: Rig, bones: Skeleton, pose: Pose, hips: Vector3, feet: { L: Vector3; R: Vector3 }, blade: Vector3, bends: Bends = {}): void {
  const bendOf = (own: readonly [number, number, number] | undefined, into: Vector3, usual: Vector3): Vector3 => (own ? into.set(...own) : usual);
  rig.reset();
  rig.move(bones.hips, pose.hipX, pose.hipY, pose.hipZ);
  rig.turnAbout(bones.hips, 0, pose.hipTurn, 0);
  for (const bone of bones.chest) rig.turnAbout(bone, pose.lean / 2, pose.twist / 2, pose.tilt / 2);
  // Its head stays on what is ahead of it, however its body is turned.
  rig.turnAbout(bones.head, pose.nod - pose.lean * 0.6, pose.look - (pose.hipTurn + pose.twist) * 0.8, -pose.tilt);

  // The feet stay where they are put, flat on the floor, the legs bending to them.
  rig.reach(...bones.legs.L, target.set(feet.L.x + pose.lfX, feet.L.y + pose.lfY, feet.L.z + pose.lfZ), bendOf(bends.lKnee, bent.lKnee, KNEE.L));
  rig.reach(...bones.legs.R, target.set(feet.R.x + pose.rfX, feet.R.y + pose.rfY, feet.R.z + pose.rfZ), bendOf(bends.rKnee, bent.rKnee, KNEE.R));
  rig.level(bones.legs.L[2]);
  rig.level(bones.legs.R[2]);
  // Up on its toes: the heel raised.
  rig.turnAbout(bones.legs.L[2], pose.lfTip, 0, 0);
  rig.turnAbout(bones.legs.R[2], pose.rfTip, 0, 0);
  // The hands are placed from the hips, so they go with the body; the blade points the way it is told, whatever the arm does.
  const hx = hips.x + pose.hipX;
  const hy = hips.y + pose.hipY;
  const hz = hips.z + pose.hipZ;
  rig.reach(...bones.arms.L, target.set(hx + pose.lhX, hy + pose.lhY, hz + pose.lhZ), bendOf(bends.lElbow, bent.lElbow, ELBOW.L));
  rig.reach(...bones.arms.R, target.set(hx + pose.rhX, hy + pose.rhY, hz + pose.rhZ), bendOf(bends.rElbow, bent.rElbow, ELBOW.R));
  rig.point(bones.arms.R[2], blade, way.set(Math.sin(pose.bTurn) * Math.cos(pose.bUp), Math.sin(pose.bUp), Math.cos(pose.bTurn) * Math.cos(pose.bUp)));
}

/** Hair and tail: swaying, and streaming back by `trail` when it rushes ahead. Its ears flick now and then. (After poseBody.) */
export function poseLoose(rig: Rig, now: number, trail: number): void {
  for (const strand of HAIR) for (let bone = 1; bone <= STRAND; bone++) rig.turnAbout(`${strand}${bone}`, trail * 0.5 + Math.sin(now * 1.7 - bone * 0.6) * 0.03, 0, Math.sin(now * 1.3 - bone * 0.5) * 0.025);
  for (let bone = 1; bone <= STRAND; bone++) rig.turnAbout(`Bone_Tail_0${bone}`, Math.sin(now * 1.5 - bone * 0.7) * 0.07 - trail * 0.3, Math.sin(now * 1.9 - bone * 0.8) * 0.12, 0);
  const flick = Math.max(0, Math.sin(now * 0.9)) ** 24;
  rig.turnAbout('Bone_Ear_L01', 0, 0, flick * 0.35);
  rig.turnAbout('Bone_Ear_R01', 0, 0, -flick * 0.35);
}
