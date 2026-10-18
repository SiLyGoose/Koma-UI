import { AnimationClip, QuaternionKeyframeTrack, VectorKeyframeTrack, type KeyframeTrack } from 'three';
import { builtClip } from '../../shared/built';
import { decodeClip, type ClipFile } from './kr-clip-file.js';

/*
 * King's Raid's own animation clips, as KR-extracted/scripts/kr-anims.py writes them from the game's files (each
 * bone's rotation, and its position and scale where they move, sampled so many times a second, already in our
 * models' axes), read as three.js clips; and fitted to how the fight times a move (../sim/motion.ts): its clips one
 * after another, their blows landing when the fight's do, drawn out or hurried evenly between. A build sends each as a
 * .krc (./kr-clip-file.js: the same clip in about half the bytes), read here in place of its JSON.
 */

const PROPERTY = { q: 'quaternion', p: 'position', s: 'scale' } as const;

/** A clip's file as its build made it (gzipped: unpacked here, as a host sends a binary file as it is); null where it can't be read. */
async function readBuilt(url: string): Promise<ClipFile | null> {
  try {
    const res = await fetch(url);
    if (!res.ok || !res.body) return null;
    const unpacked = await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    return decodeClip(new Uint8Array(unpacked));
  } catch {
    return null;
  }
}

/** A clip read from its file (its built one, where there is one: else, or if that can't be read, its JSON). */
export async function loadKrClip(url: string): Promise<AnimationClip> {
  const made = builtClip(url);
  let file = made ? await readBuilt(made) : null;
  if (!file) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    file = (await res.json()) as ClipFile;
  }
  const frames = Math.round(file.duration * file.fps) + 1;
  const every = Array.from({ length: frames }, (_, i) => Math.min(i / file.fps, file.duration));
  const tracks = file.tracks.map(([bone, kind, values, at]): KeyframeTrack => {
    const size = kind === 'q' ? 4 : 3;
    const times = at ? at.map((frame) => Math.min(frame / file.fps, file.duration)) : values.length === size ? [0] : every;
    const name = `${bone}.${PROPERTY[kind]}`;
    return kind === 'q' ? new QuaternionKeyframeTrack(name, times, values) : new VectorKeyframeTrack(name, times, values);
  });
  const clip = new AnimationClip(file.name, file.duration, tracks);
  clip.userData = { top: file.top ?? [] };
  return clip;
}

/** What hangs straight from the creature, beside its skeleton, that `clip` moves (as its file has it). */
export const topOf = (clip: AnimationClip): string[] => (clip.userData as { top?: string[] }).top ?? [];

/** `clips` one after another, as one clip (a bone one of them doesn't move goes from how the one before left it to how the next has it). */
function joined(clips: readonly AnimationClip[]): AnimationClip {
  if (clips.length === 1) return clips[0] as AnimationClip;
  const keys = new Map<string, { make: KeyframeTrack; times: number[]; values: number[] }>();
  let at = 0;
  for (const clip of clips) {
    for (const track of clip.tracks) {
      const size = track.getValueSize();
      let kept = keys.get(track.name);
      if (!kept) keys.set(track.name, (kept = { make: track, times: [], values: [] }));
      // (One that stays as it is through the clip: at its start and its end.)
      const times = track.times.length === 1 ? [0, clip.duration] : Array.from(track.times);
      const values = track.times.length === 1 ? [...track.values, ...track.values] : Array.from(track.values);
      times.forEach((t, i) => {
        // (Where one clip ends and the next begins, a moment apart: never two keys at once.)
        const time = Math.max(at + t, (kept.times.at(-1) ?? -1) + 1e-3);
        kept.times.push(time);
        kept.values.push(...values.slice(i * size, (i + 1) * size));
      });
    }
    at += clip.duration;
  }
  const tracks = [...keys.entries()].map(([name, { make, times, values }]) => (make instanceof QuaternionKeyframeTrack ? new QuaternionKeyframeTrack(name, times, values) : new VectorKeyframeTrack(name, times, values)));
  const made = new AnimationClip(clips.map((clip) => clip.name).join('+'), at, tracks);
  made.userData = { top: [...new Set(clips.flatMap(topOf))] };
  return made;
}

/**
 * `clips` one after another, fitted to a move as the fight times it: their blows (`hits`, seconds in, as the game has
 * them) moved to land at `lands`, and their end to `until`. With as many of each, each blow to its own; otherwise the
 * first and the last (or, the fight having one, the game's last to it).
 */
export function fitted(clips: readonly AnimationClip[], hits: readonly number[], lands: readonly number[], until: number): AnimationClip {
  const clip = joined(clips);
  // (A blow the game has land after its clips are done isn't one of theirs.)
  hits = hits.filter((hit) => hit < clip.duration);
  const pairs: [number, number][] = [[0, 0]];
  if (hits.length === lands.length) hits.forEach((hit, i) => pairs.push([hit, lands[i] as number]));
  else if (hits.length > 0 && lands.length === 1) pairs.push([hits.at(-1) as number, lands[0] as number]);
  else if (hits.length > 0 && lands.length > 0) pairs.push([hits[0] as number, lands[0] as number], [hits.at(-1) as number, lands.at(-1) as number]);
  pairs.push([clip.duration, until]);
  // (Only what goes on forward both ways.)
  const anchors = pairs.filter((pair, i) => i === 0 || (pair[0] > (pairs[i - 1] as [number, number])[0] && pair[1] > (pairs[i - 1] as [number, number])[1]));
  const warp = (t: number): number => {
    for (let i = 1; i < anchors.length; i++) {
      const [a0, b0] = anchors[i - 1] as [number, number];
      const [a1, b1] = anchors[i] as [number, number];
      if (t <= a1 || i === anchors.length - 1) return b0 + ((t - a0) * (b1 - b0)) / (a1 - a0);
    }
    return t;
  };
  for (const track of clip.tracks) track.times = Float32Array.from(track.times, warp);
  const made = new AnimationClip(clip.name, until, clip.tracks);
  made.userData = clip.userData;
  return made;
}

/**
 * What a clip walks along the floor (its root bone's way, smoothed over `sway` seconds either side) taken out of it: it
 * stays where it stands, swaying as it does. What hangs beside its skeleton (what it holds) is kept where it was by it.
 */
export function inPlace(clip: AnimationClip, root = 'Bip001', sway = 0.2): AnimationClip {
  const hips = clip.tracks.find((track) => track.name === `${root}.position`);
  if (!hips || hips.times.length < 2) return clip;
  const { times, values } = hips;
  // How far it has gone along the floor at each key (x and z), smoothed.
  const gone = [0, 2].map((axis) => {
    const raw = Array.from(times, (_, i) => values[i * 3 + axis] as number);
    const smooth = raw.map((_, i) => {
      let sum = 0;
      let near = 0;
      for (let j = 0; j < raw.length; j++) {
        if (Math.abs((times[j] as number) - (times[i] as number)) > sway) continue;
        sum += raw[j] as number;
        near++;
      }
      return sum / near;
    });
    return smooth.map((s) => s - (smooth[0] as number));
  });
  /** How far it has gone by `t` seconds in. */
  const at = (axis: 0 | 1, t: number): number => {
    let i = 0;
    while (i < times.length - 1 && (times[i + 1] as number) <= t) i++;
    const next = Math.min(i + 1, times.length - 1);
    const span = (times[next] as number) - (times[i] as number);
    const k = span > 0 ? (t - (times[i] as number)) / span : 0;
    return (gone[axis]?.[i] as number) * (1 - k) + (gone[axis]?.[next] as number) * k;
  };
  const tops = new Set(topOf(clip).map((name) => `${name}.position`));
  for (const track of clip.tracks) {
    if (track !== hips && !tops.has(track.name)) continue;
    // (One that stays where it is through the clip is moved at every key of the hips'.)
    if (track.times.length === 1) {
      const [x, y, z] = track.values as unknown as [number, number, number];
      track.times = Float32Array.from(times);
      track.values = Float32Array.from(Array.from(times).flatMap(() => [x, y, z]));
    }
    track.times.forEach((t, i) => {
      track.values[i * 3] = (track.values[i * 3] as number) - at(0, t);
      track.values[i * 3 + 2] = (track.values[i * 3 + 2] as number) - at(1, t);
    });
  }
  return clip;
}
