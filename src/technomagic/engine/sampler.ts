import { PropertyBinding, type AnimationClip, type Interpolant, type KeyframeTrack, type Object3D, type Quaternion, type Vector3 } from 'three';

/*
 * An animation put on models at a time of the caller's choosing, every bone it moves written each time. (Three.js's
 * mixer only writes a bone whose value has changed since it last wrote it; but the poses written in code write over
 * the bones every frame, so an animation held still, as it is eased out from where it was left, would show nothing.)
 */

/** (Every track has this, by its kind of interpolation; three.js's types leave it out.) */
type Interpolated = KeyframeTrack & { createInterpolant(): Interpolant };

/** Puts the models as the animation has them `time` seconds into it. */
export type Sampler = (time: number) => void;

/** A sampler for `clip` on `models` (each with the bones its tracks name, found as the mixer would find them). */
export function sampler(clip: AnimationClip, models: readonly Object3D[]): Sampler {
  const tracks = models.flatMap((model) =>
    clip.tracks.flatMap((track) => {
      const dot = track.name.lastIndexOf('.');
      const property = track.name.slice(dot + 1);
      if (property !== 'quaternion' && property !== 'position' && property !== 'scale') return [];
      const bone = PropertyBinding.findNode(model, track.name.slice(0, dot)) as Object3D | null;
      if (!bone) return [];
      return [{ target: bone[property] as Quaternion | Vector3, interpolant: (track as Interpolated).createInterpolant() }];
    }),
  );
  return (time) => {
    for (const { target, interpolant } of tracks) target.fromArray(interpolant.evaluate(time) as unknown as number[]);
  };
}
