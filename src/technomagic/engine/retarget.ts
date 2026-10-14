import { AnimationClip, AnimationMixer, LoopOnce, Quaternion, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack, type Bone, type Object3D } from 'three';

/*
 * An animation made for one skeleton, played on another: a skin's animations on the hero it is a skin
 * of. The two stand alike when bound (facing the same way, arms out and down), but their bones have
 * other names, lie along other axes and hang from each other differently, so nothing is copied bone to
 * bone. Instead the animation is played on its own skeleton and, a moment at a time, each bone of the
 * other is turned as far from how it was bound as the one it follows is from how that was bound, both
 * seen in their models' axes; and its hips are moved as the other's are, by as much as its legs are
 * shorter. What comes of it is an animation of the other skeleton's own.
 */

/** Read this many times a second. */
const RATE = 30;

/**
 * A bone and the one of the other skeleton it follows. A limb's is also pointed where the other's
 * points (`along`: the two bones its direction is taken between, in its own skeleton and in the other's),
 * since the arms of the two aren't held quite alike as they are bound.
 */
export interface Follow {
  bone: string;
  from: string;
  along?: { own: readonly [string, string]; other: readonly [string, string] };
}

/**
 * How one skeleton follows another: its bones, the bone that carries each of them along the floor, and a
 * leg of each (thigh, calf, foot) to measure them by. (The game's following Mixamo's: ../heroes/body/skeletons.ts.)
 */
export interface Plan {
  follows: readonly Follow[];
  hips: { bone: string; from: string };
  leg: { own: readonly [string, string, string]; other: readonly [string, string, string] };
}

const turned = new Quaternion();
const frame = new Quaternion();
const place = new Vector3();

/** How a bone is turned, and where it is, in its model's axes. */
function turnIn(model: Object3D, bone: Object3D, into: Quaternion): Quaternion {
  model.getWorldQuaternion(frame).invert();
  return into.copy(bone.getWorldQuaternion(turned)).premultiply(frame);
}
const placeIn = (model: Object3D, bone: Object3D): Vector3 => model.worldToLocal(bone.getWorldPosition(new Vector3()));

/** A model's bones of a name: a bone inside one of its own name is the file's copy of it, and left out. */
function bonesOf(models: readonly Object3D[]): Map<string, { bone: Object3D; model: Object3D }[]> {
  const named = new Map<string, { bone: Object3D; model: Object3D }[]>();
  for (const model of models)
    model.traverse((o) => {
      if (!(o as Bone).isBone || o.parent?.name === o.name) return;
      const list = named.get(o.name);
      if (list) list.push({ bone: o, model });
      else named.set(o.name, [{ bone: o, model }]);
    });
  return named;
}

/**
 * Makes animations of `from`'s into ones for `to`: `from` is another skeleton's model in the axes its
 * poses are in, `to` the models that follow it (a hero's parts, each with its skeleton over again). Both
 * stand as they were bound, now, and are left so.
 */
export function retargeter(from: Object3D, to: readonly Object3D[], plan: Plan): (clip: AnimationClip) => AnimationClip {
  from.updateWorldMatrix(true, true);
  for (const model of to) model.updateWorldMatrix(true, true);
  const own = bonesOf(to);
  const first = (name: string): { bone: Object3D; model: Object3D } | undefined => own.get(name)?.[0];
  const way = (model: Object3D, a: Object3D, b: Object3D): Vector3 => placeIn(model, b).sub(placeIn(model, a)).normalize();
  const depth = (o: Object3D): number => (o.parent ? depth(o.parent) + 1 : 0);

  // Each bone that follows one: how the other was bound (undone), and how it is turned from there itself. Parents before children.
  const followers = plan.follows
    .flatMap((follow) => {
      const other = from.getObjectByName(follow.from);
      const mine = own.get(follow.bone);
      if (!other || !mine) return [];
      const unbound = turnIn(from, other, new Quaternion()).invert();
      const each = mine.map(({ bone, model }) => {
        const bound = turnIn(model, bone, new Quaternion());
        if (follow.along) {
          const [a, b] = follow.along.own.map((name) => first(name));
          const [c, d] = follow.along.other.map((name) => from.getObjectByName(name));
          // Pointed, as bound, the way the other is.
          if (a && b && c && d) bound.premultiply(new Quaternion().setFromUnitVectors(way(a.model, a.bone, b.bone), way(from, c, d)));
        }
        return { bone, model, bound };
      });
      return [{ name: follow.bone, other, unbound, each, deep: depth((mine[0] as { bone: Object3D }).bone) }];
    })
    .sort((a, b) => a.deep - b.deep);

  // Its hips: where each skeleton's are as bound, and how much shorter its legs are.
  const otherHips = from.getObjectByName(plan.hips.from);
  const hips = own.get(plan.hips.bone) ?? [];
  const length = (model: Object3D, bones: (Object3D | undefined)[]): number => (bones[0] && bones[1] && bones[2] ? placeIn(model, bones[0]).distanceTo(placeIn(model, bones[1])) + placeIn(model, bones[1]).distanceTo(placeIn(model, bones[2])) : 1);
  const leg = plan.leg.own.map((name) => first(name));
  const shorter = length(leg[0]?.model ?? from, leg.map((found) => found?.bone)) / length(from, plan.leg.other.map((name) => from.getObjectByName(name)));
  const otherStood = otherHips ? placeIn(from, otherHips) : new Vector3();
  const stood = hips.map(({ bone, model }) => placeIn(model, bone));

  const rest = [...own.values()].flat().map(({ bone }) => ({ bone, position: bone.position.clone(), quaternion: bone.quaternion.clone() }));
  const mixer = new AnimationMixer(from);
  const now = new Quaternion();
  const above = new Quaternion();
  const local = new Quaternion();

  return (clip) => {
    const action = mixer.clipAction(clip);
    action.setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    const steps = Math.max(1, Math.ceil(clip.duration * RATE));
    const times = Array.from({ length: steps + 1 }, (_, i) => (clip.duration * i) / steps);
    const turns = followers.map(() => [] as number[]);
    const moves: number[] = [];
    for (const time of times) {
      action.time = time;
      mixer.update(0);
      from.updateWorldMatrix(true, true);

      if (otherHips) {
        const moved = placeIn(from, otherHips).sub(otherStood).multiplyScalar(shorter);
        hips.forEach(({ bone, model }, i) => {
          if (!bone.parent) return;
          bone.position.copy(bone.parent.worldToLocal(model.localToWorld(place.copy(stood[i] as Vector3).add(moved))));
          if (i === 0) moves.push(...bone.position.toArray());
        });
      }
      followers.forEach(({ other, unbound, each }, n) => {
        // How far the other is turned from how it was bound, in its model's axes.
        turnIn(from, other, now).multiply(unbound);
        each.forEach(({ bone, model, bound }, i) => {
          if (!bone.parent) return;
          turnIn(model, bone.parent, above).invert();
          bone.quaternion.copy(local.copy(above).multiply(now).multiply(bound));
          if (i === 0) (turns[n] as number[]).push(...bone.quaternion.toArray());
        });
      });
    }
    action.stop();
    mixer.uncacheClip(clip);
    for (const { bone, position, quaternion } of rest) {
      bone.position.copy(position);
      bone.quaternion.copy(quaternion);
    }

    const tracks = followers.map(({ name }, n) => new QuaternionKeyframeTrack(`${name}.quaternion`, times, turns[n] as number[]));
    return new AnimationClip(clip.name, clip.duration, moves.length > 0 ? [new VectorKeyframeTrack(`${plan.hips.bone}.position`, times, moves), ...tracks] : tracks);
  };
}
