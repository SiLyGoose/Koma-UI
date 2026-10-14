import { Box3, DoubleSide, Group, LoadingManager, MeshBasicMaterial, Vector3, type AnimationClip, type Texture } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { RiggedModel } from '../../assets';
import { fileUrl, isMesh } from '../../engine/models';
import { Rig, toBindPose } from '../../engine/rig';
import { hang, type Stood } from './hero';
import { MIXAMO } from './skeletons';

/*
 * A skin that comes with its animations (rigged and animated outside the game's files): each of its
 * files holds the whole model and one animation, its textures inside it and its weapon in its hand. The
 * first is the model on the field; the others are read for their animation alone. Read here; what
 * moves a hero by them is ./animated.ts.
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

/** An animation of a move: the moments (seconds into it) its blows land, and when to leave it. */
export interface Played {
  clip: AnimationClip;
  lands: readonly number[];
  until: number;
}

/** What moves a hero: its idle and its run (none, for a rig read only for its skills), its attack's animations one after another, and an animation for some of its skills (by their move's name). */
export interface Animations {
  idle?: AnimationClip;
  run?: AnimationClip;
  attack: readonly Played[];
  skills: Readonly<Record<string, Played>>;
}

/** A hero that comes with its animations, read: stood on the field, `space` the axes its poses are in, and its animations. */
export interface Rigged {
  stood: Stood;
  space: Group;
  animations: Animations;
}

/** Reads a skin's files: `name` is the skin's, `folder` where its files are (a path under public/kr/). */
export async function loadRigged(name: string, folder: string, files: RiggedModel): Promise<Rigged> {
  // Its textures are inside its files, and go on being read after a file is: `settled` is when every one has been (or has failed).
  const manager = new LoadingManager();
  const settled = new Promise<void>((done) => {
    manager.onLoad = done;
  });
  const loader = new FBXLoader(manager);
  const skills = Object.entries(files.skills ?? {});
  const attacks = files.attack ?? [];
  // Its idle and run, when it has them; the first file read is the model, whichever it is.
  const standing = files.idle && files.run ? [files.idle, files.run] : [];
  const read = await Promise.all([...standing, ...attacks.map((part) => part.file), ...skills.map(([, skill]) => skill.file)].map((file) => loader.loadAsync(fileUrl(folder, file))));
  const [model] = read;
  const [idling, running] = standing.length > 0 ? read : [];
  const rest = read.slice(standing.length);
  const attacking = rest.slice(0, attacks.length);
  const casting = rest.slice(attacks.length);
  if (!model) throw new Error(`${name} has no files`);
  const clips = { idle: idling?.animations[0], run: running?.animations[0] };
  if (standing.length > 0 && (!clips.idle || !clips.run)) throw new Error(`${name} has an animation missing`);

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
  // as the other hero's, standing as its skin was bound (not as its animation's first frame has it).
  const space = new Group();
  space.add(model);
  model.scale.multiplyScalar(TALL / new Box3().setFromObject(model).getSize(new Vector3()).y);
  toBindPose(model);
  const rig = new Rig([space]);
  const hips = rig.at(MIXAMO.hips);
  const feet = { L: rig.at(MIXAMO.legs.L[2]), R: rig.at(MIXAMO.legs.R[2]) };
  // The way its blade runs, in its right hand's own axes: along the weapon's x, as the weapon hangs on the hand.
  const weapon = model.getObjectByName('Weapon');
  const blade = new Vector3(1, 0, 0);
  if (weapon) blade.applyQuaternion(weapon.quaternion).normalize();

  const attack = attacks.flatMap((part, i) => {
    const clip = attacking[i]?.animations[0];
    return clip ? [{ clip: staying(clip), lands: part.lands, until: part.until }] : [];
  });
  const played = Object.fromEntries(
    skills.flatMap(([move, skill], i) => {
      const clip = casting[i]?.animations[0];
      return clip ? [[move, { clip: staying(clip), lands: skill.lands, until: skill.until }] as const] : [];
    }),
  );
  return { stood: { ...hang([space], hips.y), models: [space], rig, hips, feet, blade, materials }, space, animations: { idle: clips.idle, run: clips.run && inPlace(clips.run), attack, skills: played } };
}
