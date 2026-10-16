import { AnimationClip, Box3, DoubleSide, Group, LoadingManager, MeshBasicMaterial, Vector3, type Object3D, type Texture } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { animationFolders, animationsIn, type RiggedModel } from '../../assets';
import { fileUrl, isMesh } from '../../engine/models';
import { Rig, toBindPose } from '../../engine/rig';
import type { OwnTiming } from '../../sim/motion';
import { hang, type Stood } from './hero';
import { MIXAMO } from './skeletons';

/*
 * A skin that comes with its animations (rigged and animated outside the game's files): each of its
 * files holds the whole model and one animation, its textures inside it and its weapon in its hand. The
 * first is the model on the field; the others are read for their animation alone. Each of those is kept
 * with its own skeleton, to be made over from it: it may not be this one's (a copy of another hero's
 * animation, or a file of the motion alone). Read here; what moves a hero by them is ./animated.ts.
 */

/** How tall the model is, ears and all, in the lengths the poses are written in (the game's own models'). */
const TALL = 1.7;
/** What an animation walks is smoothed over this long (seconds) either side of each moment. */
const SWAY = 0.2;

/** A run that stays where it is: the hips' way along the floor taken out, so the field says how far it goes. */
function inPlace(clip: AnimationClip): AnimationClip {
  for (const track of clip.tracks) {
    if (!/Hips\.position$/.test(track.name)) continue;
    for (let i = 0; i < track.values.length; i += 3) {
      track.values[i] = track.values[0] as number;
      track.values[i + 2] = track.values[2] as number;
    }
  }
  return clip;
}

/**
 * An animation that stays where it stands: the way its hips go along the floor, smoothed, is taken out
 * of it, so its sway stays in it and only its going anywhere is gone.
 */
function staying(clip: AnimationClip): AnimationClip {
  for (const track of clip.tracks) {
    if (!/Hips\.position$/.test(track.name)) continue;
    const { times, values } = track;
    for (const axis of [0, 2]) {
      const raw = Array.from(times, (_, i) => values[i * 3 + axis] as number);
      const smooth = raw.map((_, i) => {
        let sum = 0;
        let near = 0;
        for (let j = 0; j < raw.length; j++) {
          if (Math.abs((times[j] as number) - (times[i] as number)) > SWAY) continue;
          sum += raw[j] as number;
          near++;
        }
        return sum / near;
      });
      raw.forEach((was, i) => {
        values[i * 3 + axis] = was - ((smooth[i] as number) - (smooth[0] as number));
      });
    }
  }
  return clip;
}

/** Only a span of an animation (seconds into it, from and to), drawn out (or hurried) to last `length`. */
function cut(clip: AnimationClip, [from, to]: readonly [number, number], length: number): AnimationClip {
  const times = length / (to - from);
  // (Its keys are many to a second: those in the span are enough.)
  const tracks = clip.tracks.map((track) => track.clone().trim(from, to).shift(-from).scale(times));
  return new AnimationClip(clip.name, length, tracks);
}

/** An animation of a move, when its blows land and when to leave it (as the fight times it), and how it is played otherwise (crouched, aimed up: SkillAnimation's). */
export interface Played {
  clip: AnimationClip;
  until: number;
  lands: readonly number[];
  crouch?: number;
  aimUp?: number;
}

/** What moves a hero: its idle and its run (none, or an idle alone, for a rig read only for some of what it does), its attack's animations one after another, and an animation for some of its skills (by their move's name). */
export interface Animations {
  idle?: AnimationClip;
  run?: AnimationClip;
  attack: readonly Played[];
  skills: Readonly<Record<string, Played>>;
  /** Running in its run with no idle: the way the blade in its right hand is held pointing (its rig's `bladeRunning`). */
  bladeRunning?: Vector3;
  /** Its attack goes straight on into the next (its rig's `chained`). */
  chained?: boolean;
  /** What is in its right hand is loosed as it shoots (its rig's `loosed`). */
  loosed?: { nock: number };
}

/**
 * A hero that comes with its animations, read: stood on the field, `space` the axes its poses are in, and its
 * animations; and the skeleton each of the others was made for (its own file's, as bound: it may not be this one).
 */
export interface Rigged {
  stood: Stood;
  space: Group;
  animations: Animations;
  others: ReadonlyMap<AnimationClip, Object3D>;
}

/**
 * Reads a skin's files: `name` is the skin's, `owner` the hero whose models its folder is among (unless it is borrowed
 * whole: RiggedModel.of), and `timing` how the fight times its hero's own animations (one it doesn't time is left out:
 * its move is drawn as the poses written in code have it).
 */
export async function loadRigged(name: string, owner: { folder: string }, files: RiggedModel, timing: OwnTiming = {}): Promise<Rigged> {
  // Its textures are inside its files, and go on being read after a file is: `settled` is when every one has been (or has failed).
  const manager = new LoadingManager();
  const settled = new Promise<void>((done) => {
    manager.onLoad = done;
  });
  const loader = new FBXLoader(manager);
  const skills = Object.entries(files.skills ?? {});
  const attacks = files.attack ?? [];
  // Its idle and run, when it has them (or its idle alone); the first file read is the model, whichever it is.
  const standing = [files.idle, files.run].filter((file) => file !== undefined);
  const folders = animationFolders(owner, files);
  const read = await Promise.all(animationsIn(files).map((file, i) => loader.loadAsync(fileUrl(folders[i] as string, file))));
  const [model] = read;
  const idling = files.idle ? read[0] : undefined;
  const running = files.run ? read[standing.length - 1] : undefined;
  const rest = read.slice(standing.length);
  const attacking = rest.slice(0, attacks.length);
  const casting = rest.slice(attacks.length);
  if (!model) throw new Error(`${name} has no files`);
  // (An idle with no run, standing in for the poses written in code, stays where it stands, its sway kept.)
  const idleClip = idling?.animations[0];
  const clips = { idle: idleClip && !files.run ? staying(idleClip) : idleClip, run: running?.animations[0] };
  if ((files.idle && !clips.idle) || (files.run && !clips.run)) throw new Error(`${name} has an animation missing`);

  // Drawn as the other models are: its colours as they are painted, unlit.
  const materials: MeshBasicMaterial[] = [];
  model.traverse((o) => {
    if (!isMesh(o)) return;
    o.frustumCulled = false;
    const made = [o.material].flat().map((material) => {
      const plain = new MeshBasicMaterial({ name: material.name, map: (material as { map?: Texture | null }).map ?? null, side: DoubleSide });
      materials.push(plain);
      return plain;
    });
    o.material = Array.isArray(o.material) ? made : (made[0] as MeshBasicMaterial);
  });

  // Until its textures can be drawn (not for ever, should one never come).
  await Promise.race([settled, new Promise((done) => setTimeout(done, 8000))]);
  await Promise.all(materials.map((material) => (material.map?.image as HTMLImageElement | undefined)?.decode?.().catch(() => undefined)));

  // Its files are in their own units. `space` is where the poses are written: the model in it as tall
  // as the other hero's, standing as its skin was bound (not as its animation's first frame has it). (A
  // skeleton alone, with nothing to measure, is left as it comes: it is only made over for another.)
  const space = new Group();
  space.add(model);
  const tall = new Box3().setFromObject(model).getSize(new Vector3()).y;
  if (tall > 0) model.scale.multiplyScalar(TALL / tall);
  toBindPose(model);
  const rig = new Rig([space]);
  const hips = rig.at(MIXAMO.hips);
  const feet = { L: rig.at(MIXAMO.legs.L[2]), R: rig.at(MIXAMO.legs.R[2]) };
  // The way its blade runs, in its right hand's own axes: along the weapon's x, as the weapon hangs on the hand.
  const weapon = model.getObjectByName('Weapon');
  const blade = new Vector3(1, 0, 0);
  if (weapon) blade.applyQuaternion(weapon.quaternion).normalize();

  // Each file after the model's, on its own skeleton (the same as the model's, or not), stood as it was bound.
  const others = new Map<AnimationClip, Object3D>();
  read.forEach((other, i) => {
    const clip = other.animations[0];
    if (i === 0 || !clip) return;
    const own = new Group();
    own.add(other);
    toBindPose(other);
    others.set(clip, own);
  });

  const attack = attacks.flatMap((_, i) => {
    const clip = attacking[i]?.animations[0];
    const span = timing.attack?.[i];
    return clip && span ? [{ clip: staying(clip), until: span.until, lands: span.lands }] : [];
  });
  const played = Object.fromEntries(
    skills.flatMap(([move, skill], i) => {
      const clip = casting[i]?.animations[0];
      const span = timing.skills?.[move as keyof typeof timing.skills];
      if (!clip || !span) return [];
      // (A span of it: made over from the same skeleton.)
      const made = skill.span ? cut(clip, skill.span, span.until) : clip;
      const own = others.get(clip);
      if (own) others.set(made, own);
      return [[move, { clip: staying(made), until: span.until, lands: span.lands, ...(skill.crouch && { crouch: skill.crouch }), ...(skill.aimUp && { aimUp: skill.aimUp }) }] as const];
    }),
  );
  return { stood: { ...hang([space], hips.y), models: [space], rig, hips, feet, blade, materials }, space, animations: { idle: clips.idle, run: clips.run && inPlace(clips.run), attack, skills: played, ...(files.bladeRunning && { bladeRunning: new Vector3(...files.bladeRunning).normalize() }), ...(files.chained && { chained: true }), ...(files.loosed && { loosed: files.loosed }) }, others };
}
