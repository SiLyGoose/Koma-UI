import { Euler, Matrix4, Quaternion, Vector3, type Bone, type Object3D, type SkinnedMesh } from 'three';

/*
 * A model's bones, by name, to pose them in code: the game's files hold the models standing still and no
 * animation, so every movement here is made by turning and moving bones each frame, from how they
 * stand at rest. A hero's parts (body, hair, arms) each have the skeleton over again: a bone's name
 * moves it in all of them.
 */

const turn = new Quaternion();
const spin = new Quaternion();
const frame = new Quaternion();
const above = new Quaternion();
const euler = new Euler();
const hip = new Vector3();
const knee = new Vector3();
const ankle = new Vector3();
const goal = new Vector3();
const bend = new Vector3();
const from = new Vector3();
const to = new Vector3();
const inverse = new Matrix4();

/**
 * Stands a model as its skin was bound to its skeleton: every bone where it was when the mesh was made
 * to follow it. A file that holds an animation leaves its bones as they are in the animation's first
 * frame, which is no pose to work from. `model` is what the file loaded as, wherever it now hangs.
 */
export function toBindPose(model: Object3D): void {
  model.updateWorldMatrix(true, true);
  // Where each bone was at binding, in the file's own space: the opposite of what the skin keeps for it.
  const bound = new Map<Object3D, Matrix4>();
  model.traverse((o) => {
    const mesh = o as SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    mesh.skeleton.bones.forEach((bone, i) => {
      if (!bound.has(bone)) bound.set(bone, (mesh.skeleton.boneInverses[i] as Matrix4).clone().invert());
    });
  });
  // Parents before children: each bone placed under its parent as it now stands.
  model.traverse((o) => {
    const was = bound.get(o);
    if (!was || !o.parent) return;
    o.matrix.copy(o.parent.matrixWorld).invert().multiply(inverse.multiplyMatrices(model.matrixWorld, was));
    o.matrix.decompose(o.position, o.quaternion, o.scale);
    o.matrixWorld.multiplyMatrices(o.parent.matrixWorld, o.matrix);
  });
  model.updateWorldMatrix(false, true);
}

export class Rig {
  private readonly rest = new Map<Object3D, { position: Vector3; quaternion: Quaternion }>();
  private readonly named = new Map<string, Object3D[]>();
  /** The model each bone is in. */
  private readonly model = new Map<Object3D, Object3D>();
  /** How each bone is turned at rest, in its model's axes. */
  private readonly restFrame = new Map<Object3D, Quaternion>();

  constructor(models: readonly Object3D[]) {
    for (const model of models) {
      model.updateWorldMatrix(true, true);
      model.getWorldQuaternion(frame).invert();
      model.traverse((o) => {
        if (!(o as Bone).isBone) return;
        this.rest.set(o, { position: o.position.clone(), quaternion: o.quaternion.clone() });
        this.model.set(o, model);
        this.restFrame.set(o, o.getWorldQuaternion(new Quaternion()).premultiply(frame));
        // A bone inside one of its own name is the file's copy of it: the outer one is the bone.
        if (o.parent?.name === o.name) return;
        const list = this.named.get(o.name);
        if (list) list.push(o);
        else this.named.set(o.name, [o]);
      });
    }
  }

  has(name: string): boolean {
    return this.named.has(name);
  }

  /** Every bone back as it stands at rest: the start of each frame's pose. */
  reset(): void {
    for (const [bone, rest] of this.rest) {
      bone.position.copy(rest.position);
      bone.quaternion.copy(rest.quaternion);
    }
  }

  /** One bone back as it stands at rest (under its parent as that now is). */
  settle(name: string): void {
    for (const bone of this.named.get(name) ?? []) {
      const rest = this.rest.get(bone);
      if (!rest) continue;
      bone.position.copy(rest.position);
      bone.quaternion.copy(rest.quaternion);
    }
  }

  /** Turns a bone about its own axes (radians). */
  turn(name: string, x: number, y: number, z: number): void {
    turn.setFromEuler(euler.set(x, y, z));
    for (const bone of this.named.get(name) ?? []) bone.quaternion.multiply(turn);
  }

  /** Turns a bone about its parent's axes: the model's own, for a bone straight under its root. */
  turnIn(name: string, x: number, y: number, z: number): void {
    turn.setFromEuler(euler.set(x, y, z));
    for (const bone of this.named.get(name) ?? []) bone.quaternion.premultiply(turn);
  }

  /**
   * Turns a bone about its model's axes (z ahead of the model, y up, x to its left), however the bone
   * itself lies: for a body, whose bones each have axes of their own. A bone's parents are turned first.
   */
  turnAbout(name: string, x: number, y: number, z: number): void {
    for (const bone of this.named.get(name) ?? []) {
      if (!bone.parent) continue;
      (this.model.get(bone) as Object3D).getWorldQuaternion(frame);
      bone.parent.getWorldQuaternion(above);
      // The turn, seen from the bone's parent: out to the world, about the model's axes, and back.
      turn.copy(above).invert().multiply(frame).multiply(spin.setFromEuler(euler.set(x, y, z))).multiply(frame.invert()).multiply(above);
      bone.quaternion.premultiply(turn);
    }
  }

  /**
   * Moves a bone, along its model's axes and in its model's lengths, whatever its parent's are (a
   * skeleton that comes in other units, under a parent of another size).
   */
  move(name: string, x: number, y: number, z: number): void {
    for (const bone of this.named.get(name) ?? []) {
      if (!bone.parent) continue;
      const model = this.model.get(bone) as Object3D;
      model.updateWorldMatrix(true, false);
      bone.parent.updateWorldMatrix(true, false);
      // The move in the world, then as the bone's parent sees it.
      from.set(0, 0, 0).applyMatrix4(model.matrixWorld);
      to.set(x, y, z).applyMatrix4(model.matrixWorld).sub(from);
      inverse.copy(bone.parent.matrixWorld).invert();
      from.set(0, 0, 0).applyMatrix4(inverse);
      bone.position.add(to.applyMatrix4(inverse).sub(from));
    }
  }

  /** How every bone is placed and turned now, to blend toward later (./blend). `into` is filled in again, when given. */
  keep(into: Map<Object3D, { position: Vector3; quaternion: Quaternion }> = new Map()): Map<Object3D, { position: Vector3; quaternion: Quaternion }> {
    for (const bone of this.rest.keys()) {
      const kept = into.get(bone);
      if (kept) {
        kept.position.copy(bone.position);
        kept.quaternion.copy(bone.quaternion);
      } else into.set(bone, { position: bone.position.clone(), quaternion: bone.quaternion.clone() });
    }
    return into;
  }

  /** Every bone brought `by` (0 to 1) of the way from how it is now to how it was kept: one pose easing into another. */
  blend(kept: Map<Object3D, { position: Vector3; quaternion: Quaternion }>, by: number): void {
    for (const [bone, was] of kept) {
      bone.position.lerp(was.position, by);
      bone.quaternion.slerp(was.quaternion, by);
    }
  }

  /** Where a bone is now, in its model's axes (the first model that has it). */
  at(name: string): Vector3 {
    const bone = this.named.get(name)?.[0];
    if (!bone) return new Vector3();
    const model = this.model.get(bone) as Object3D;
    model.updateWorldMatrix(true, true);
    return model.worldToLocal(bone.getWorldPosition(new Vector3()));
  }

  /** Turns a bone back to how it is turned at rest in its model's axes, whatever its parents have done: a foot kept flat on the floor. */
  level(name: string): void {
    for (const bone of this.named.get(name) ?? []) {
      if (!bone.parent) continue;
      (this.model.get(bone) as Object3D).getWorldQuaternion(frame);
      bone.parent.getWorldQuaternion(above);
      bone.quaternion.copy(above.invert()).multiply(frame).multiply(this.restFrame.get(bone) as Quaternion);
    }
  }

  /**
   * Bends a limb of two bones (a thigh and calf, an upper arm and forearm) so that its end (the foot,
   * the hand) comes to `target`, a place in its model's axes, its joint bending toward `pole`, a way in
   * them. A target out of reach is reached for, the limb straight.
   */
  reach(upperName: string, lowerName: string, endName: string, target: Vector3, pole: Vector3): void {
    for (const upper of this.named.get(upperName) ?? []) {
      const lower = upper.getObjectByName(lowerName);
      const end = lower?.getObjectByName(endName);
      if (!lower || !end) continue;
      const model = this.model.get(upper) as Object3D;
      model.updateWorldMatrix(true, true);
      upper.getWorldPosition(hip);
      lower.getWorldPosition(knee);
      end.getWorldPosition(ankle);
      model.localToWorld(goal.copy(target));
      const first = hip.distanceTo(knee);
      const second = knee.distanceTo(ankle);
      // The way to the target, and how far along it the end can be.
      goal.sub(hip);
      const far = Math.min(Math.max(goal.length(), 1e-4), (first + second) * 0.999);
      goal.normalize();
      // Where the joint goes: on the circle the two bones can meet on, on its side toward the pole.
      const along = (first * first - second * second + far * far) / (2 * far);
      const out = Math.sqrt(Math.max(0, first * first - along * along));
      bend.copy(pole).applyQuaternion(model.getWorldQuaternion(frame));
      bend.addScaledVector(goal, -bend.dot(goal));
      if (bend.lengthSq() < 1e-8) bend.set(0, 0, 1);
      bend.normalize().multiplyScalar(out).addScaledVector(goal, along);

      this.aim(upper, from.copy(knee).sub(hip), bend);
      upper.updateWorldMatrix(false, true);
      lower.getWorldPosition(knee);
      end.getWorldPosition(ankle);
      this.aim(lower, from.copy(ankle).sub(knee), to.copy(goal).multiplyScalar(far).add(hip).sub(knee));
    }
  }

  /**
   * Turns a bone, the shortest way, so that `axis` (a way in the bone's own axes: the way a blade in a
   * hand runs) points along `way`, a way in its model's axes.
   */
  point(name: string, axis: Vector3, way: Vector3): void {
    for (const bone of this.named.get(name) ?? []) {
      const model = this.model.get(bone) as Object3D;
      from.copy(axis).applyQuaternion(bone.getWorldQuaternion(frame));
      bend.copy(way).applyQuaternion(model.getWorldQuaternion(frame));
      this.aim(bone, from, bend);
    }
  }

  /** Turns a bone, the shortest way, so that what pointed along `was` points along `will` (both in the world's axes). */
  private aim(bone: Object3D, was: Vector3, will: Vector3): void {
    if (!bone.parent) return;
    spin.setFromUnitVectors(was.normalize(), to.copy(will).normalize());
    bone.parent.getWorldQuaternion(above);
    bone.quaternion.premultiply(turn.copy(above).invert().multiply(spin).multiply(above));
  }

  /** Moves a bone, along its parent's axes. */
  shift(name: string, x: number, y: number, z: number): void {
    for (const bone of this.named.get(name) ?? []) {
      bone.position.x += x;
      bone.position.y += y;
      bone.position.z += z;
    }
  }
}
