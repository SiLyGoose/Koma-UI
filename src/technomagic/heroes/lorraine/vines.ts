import { Quaternion, Vector3, type Bone, type Group, type Object3D } from 'three';
import { LORRAINE_ASSETS } from '../../assets';
import type { Props } from '../../fx/props';

/*
 * Lorraine's plants (../../assets/heroes/lorraine.ts), the pitcher-plant monsters': a plant's body, and its two long
 * arms, each a vine. Its bones aren't one under another (each hangs from its root): a vine is posed by putting each of
 * its bones where its share of the vine is on its curl, and turning it along it.
 *
 * - Tangled Vine's vines (the stem's): its body sunk out of sight under the floor and its two arms coming up out of the
 *   ground round the boss and curling in over it, held there (swaying a little) while it is shackled, and drawn back down.
 * - Thornbush Forest's fly-traps: one arm alone (the one with the trap at its tip), shooting up out of the ground beside the
 *   boss, its jaws open, and lunging down into it, snapping them shut; and back down.
 * - Wrath of the Forest's flowers: whole plants bursting up out of the ground round the boss, their vines lying out about
 *   them, swaying while the forest is up, and sinking back down.
 * - Her attack's thorns: a cluster of three, flying from her staff into the boss.
 */

/** How many times as big as the file's the vines are; how far out from the boss's middle they come up; how many come up round it (two to each). */
const VINE = { size: 2.4, out: 2.3, count: 3 };
/**
 * How a vine curls: straight up out of the ground at first, bending in over the boss all along it and the more toward its
 * tip (radians turned, all told; how much of that is even along it), twisted a little round as it goes; and how much it
 * sways while it holds (a share of its curl, and how fast).
 */
const CURL = { turned: 2.4, even: 0.6, twist: 0.5, sway: 0.12, pace: 2.4 };
/** How long they take to come up, and to go back down. */
const GROW = { up: 0.45, down: 0.5 };
/**
 * A fly-trap: how big, and how far out from the boss's middle it comes up; how much of its curl it has reared back
 * (coming up) and lunging (its trap down on the boss); how wide its jaws open (radians, each); how long it takes to come
 * up, to lunge, holds its bite, and goes back down.
 */
const TRAP = { size: 2.6, out: 3.4, reared: 0.25, lunged: 1.25, jaws: 0.55, up: 0.1, lunge: 0.12, bite: 0.25, down: 0.4 };
/**
 * Wrath's flowers: how many, how big, how far out from the boss's middle; how deep under the floor they start; how
 * long they take to burst up, stay up, and sink; how far past the floor they come up before settling; how much they sway.
 */
const FLOWER = { count: 4, size: 1.7, out: 2.9, deep: 2.4, up: 0.3, lasts: 1.4, down: 0.45, past: 0.15, sway: 0.1 };
/** Her attack's thorns: how big, and how long they take to fly. */
const THORN = { size: 4, flies: 0.16 };
/** The steps a vine's curl is followed in, along it. */
const STEP = 0.05;

/** One vine: its bones from its root out, and how far along it each is (on the field). */
interface Arm {
  bones: Bone[];
  along: number[];
  /** The way it runs out from its root as the file has it, and each bone's turn then (both on the field). */
  runs: Vector3;
  rest: Quaternion[];
  /** Where round the boss it comes up (radians), and its own share of the sway. */
  round: number;
  phase: number;
}

/** A plant on the field: its model, its bones by name, the bone they all hang from, and its two arms (`round` radians round the boss, the other opposite). */
interface Plant {
  model: Group;
  bones: Map<string, Bone>;
  root: Object3D;
  arms: { L: Arm; R: Arm };
  /** A turn on the field, as its root has it (undone). */
  inverse: Quaternion;
}

const ARMS = { L: ['Bone_Arm_L01', 'Bone_Arm_L02', 'Bone_Arm_L03', 'Bone_Arm_L04'], R: ['Bone_Arm_R01', 'Bone_Arm_R02', 'Bone_Arm_R03', 'Bone_Arm_R04', 'Bone_Hand_R01', 'Bone_Hand_R02'] };

const point = new Vector3();
const ahead = new Vector3();
const inward = new Vector3();
const side = new Vector3();
const UP = new Vector3(0, 1, 0);
const swing = new Quaternion();
const turned = new Quaternion();
const jaw = new Quaternion();

/** A copy of one of her plants (by its name among her props) at `at` on the field, `size` times as big as its file's, turned `turn` radians; null when it isn't on this computer. */
function plantAt(props: Props, name: string, at: Vector3, size: number, round: number, turn = 0): Plant | null {
  const model = props.copy(LORRAINE_ASSETS, name);
  if (!model) return null;
  model.position.copy(at);
  model.rotation.y = turn;
  model.scale.setScalar(size);
  model.updateMatrixWorld(true);
  const bones = new Map<string, Bone>();
  model.traverse((o) => {
    if ((o as Bone).isBone) bones.set(o.name, o as Bone);
  });
  const root = bones.get('Bone_Arm_L01')?.parent as Object3D | undefined;
  if (!root) return null;
  const arm = (names: string[], at: number): Arm => {
    const found = names.map((one) => bones.get(one)).filter((bone) => bone !== undefined);
    const places = found.map((bone) => bone.getWorldPosition(new Vector3()));
    const first = places[0] as Vector3;
    return {
      bones: found,
      along: places.map((p) => p.distanceTo(first)),
      runs: (places.at(-1) as Vector3).clone().sub(first).normalize(),
      rest: found.map((bone) => bone.getWorldQuaternion(new Quaternion())),
      round: at,
      phase: Math.random() * Math.PI * 2,
    };
  };
  return { model, bones, root, arms: { L: arm(ARMS.L, round), R: arm(ARMS.R, round + Math.PI) }, inverse: root.getWorldQuaternion(new Quaternion()).invert() };
}

/** Sinks a plant's body out of sight under the floor, small (and its other arm, for one that comes up alone). */
function sink(plant: Plant, middle: Vector3, also: readonly Bone[] = []): void {
  const hidden = plant.root.worldToLocal(new Vector3(middle.x, -3, middle.z));
  for (const [name, bone] of plant.bones)
    if (/^Bone_(Body|Foot|Mouth)/.test(name) || also.includes(bone)) {
      bone.position.copy(hidden);
      bone.scale.setScalar(0.01);
    }
}

/**
 * Where a vine `length` long is `u` along it (on the field), coming up `out` from `middle`, curled `curl` times as much
 * as it is when still: below the floor (u < 0) it comes straight up out of it. And which way it runs there.
 */
function curled(arm: Arm, middle: Vector3, out: number, length: number, curl: number, u: number, into: Vector3, way: Vector3): void {
  into.set(middle.x + Math.cos(arm.round) * out, Math.min(0, u), middle.z + Math.sin(arm.round) * out);
  way.copy(UP);
  if (u <= 0) return;
  // In toward the boss, and across: it bends in that way, the more the further along (as a tendril curls), and leans across as it twists.
  inward.set(-Math.cos(arm.round), 0, -Math.sin(arm.round));
  side.crossVectors(UP, inward);
  for (let s = 0; s < u; s += STEP) {
    const step = Math.min(STEP, u - s);
    const k = s / length;
    const bent = CURL.turned * curl * (CURL.even * k + (1 - CURL.even) * k * k);
    const twist = (CURL.twist * s) / length;
    way.copy(UP).multiplyScalar(Math.cos(bent)).addScaledVector(inward, Math.sin(bent) * Math.cos(twist)).addScaledVector(side, Math.sin(bent) * Math.sin(twist)).normalize();
    into.addScaledVector(way, step);
  }
}

/**
 * Poses a vine come up `grown` of the way out of the ground (its tip first) `out` from `middle`, `longest` long, curled
 * `curl` times; its jaws (a fly-trap's: its last two bones) open `open` radians each.
 */
function poseArm(plant: Plant, arm: Arm, middle: Vector3, out: number, longest: number, grown: number, curl: number, open = 0): void {
  const jaws = open !== 0 ? arm.bones.length - 2 : arm.bones.length;
  arm.bones.forEach((bone, i) => {
    // The tip comes up first: how far along its curl each bone is, the rest still under the floor.
    const u = (arm.along[i] as number) - (1 - grown) * longest;
    curled(arm, middle, out, longest, curl, u, point, ahead);
    bone.position.copy(plant.root.worldToLocal(point));
    swing.setFromUnitVectors(arm.runs, ahead);
    turned.copy(swing);
    // A jaw opens about what was up, as the file has it (its two open apart, one each way).
    if (i >= jaws) turned.multiply(jaw.setFromAxisAngle(UP, i === jaws ? open : -open));
    turned.multiply(arm.rest[i] as Quaternion);
    bone.quaternion.copy(plant.inverse).multiply(turned);
  });
}

/** How long a vine is (its tip runs on a little past its last bone). */
const lengthOf = (arms: readonly Arm[], size: number): number => Math.max(...arms.map((one) => one.along.at(-1) ?? 0)) + 0.3 * size;

/** Eased: slow at the end. */
const easeOut = (k: number): number => 1 - (1 - Math.min(1, Math.max(0, k))) ** 2;

/** One plant's two vines coming up round the boss, `middle` the floor under it, for `lasts` seconds (from when they are up), the first `round` radians round. */
function plant(props: Props, middle: Vector3, lasts: number, round: number): void {
  const one = plantAt(props, 'vine', new Vector3(middle.x, 0, middle.z), VINE.size, round);
  if (!one) return;
  sink(one, middle);
  const arms = [one.arms.L, one.arms.R];
  const longest = lengthOf(arms, VINE.size);
  const pose = (grown: number, t: number): void => {
    for (const arm of arms) poseArm(one, arm, middle, VINE.out, longest, grown, 1 + CURL.sway * Math.sin(t * CURL.pace + arm.phase));
  };
  pose(0, 0);
  props.play(one.model, (t) => {
    const grown = t < GROW.up ? t / GROW.up : t < GROW.up + lasts ? 1 : 1 - (t - GROW.up - lasts) / GROW.down;
    pose(easeOut(grown), t);
    return grown > 0;
  });
}

/** The vines coming up round the boss and curling in over it, `middle` the floor under it, for `lasts` seconds (from when they are up), the first `round` radians round. */
export function wind(props: Props, middle: Vector3, lasts: number, round: number): void {
  for (let i = 0; i < VINE.count; i++) plant(props, middle, lasts, round + (i * Math.PI) / VINE.count);
}

/** A fly-trap shooting up out of the ground `round` radians round the boss (`middle` the floor under it) and biting down into it. */
export function snap(props: Props, middle: Vector3, round: number): void {
  // (Its trap is on its right arm, which comes up opposite where its left would: turned round so that it is `round`.)
  const one = plantAt(props, 'trap', new Vector3(middle.x, 0, middle.z), TRAP.size, round + Math.PI);
  if (!one) return;
  const arm = one.arms.R;
  sink(one, middle, one.arms.L.bones);
  const longest = lengthOf([arm], TRAP.size);
  const { up, lunge, bite, down } = TRAP;
  const pose = (t: number): boolean => {
    // Up, reared back with its jaws open; down into the boss, snapping them shut; held; and back down under the floor.
    const grown = t < up ? t / up : t < up + lunge + bite ? 1 : 1 - (t - up - lunge - bite) / down;
    const lunging = easeOut((t - up) / lunge);
    const curl = TRAP.reared + (TRAP.lunged - TRAP.reared) * lunging;
    poseArm(one, arm, middle, TRAP.out, longest, easeOut(grown), curl, TRAP.jaws * (1 - lunging));
    return grown > 0;
  };
  pose(0);
  props.play(one.model, pose);
}

/** Wrath's flowers bursting up out of the ground round the boss (`middle` the floor under it), the first `round` radians round. */
export function bloom(props: Props, middle: Vector3, round: number): void {
  for (let i = 0; i < FLOWER.count; i++) {
    const at = round + (i * Math.PI * 2) / FLOWER.count;
    const where = new Vector3(middle.x + Math.cos(at) * FLOWER.out, -FLOWER.deep, middle.z + Math.sin(at) * FLOWER.out);
    // Each a flower of its own (the four kinds), facing out from the boss.
    const one = plantAt(props, `flower${(i % FLOWER.count) + 1}`, where, FLOWER.size, 0, Math.PI / 2 - at);
    if (!one) continue;
    const phase = Math.random() * Math.PI * 2;
    props.play(one.model, (t) => {
      const { up, lasts, down } = FLOWER;
      const k = t < up ? easeOut(t / up) : t < up + lasts ? 1 : 1 - (t - up - lasts) / down;
      // Up out of the ground, a little past, and settling.
      const past = t < up ? 0 : FLOWER.past * Math.sin(Math.min(1, (t - up) / 0.35) * Math.PI);
      one.model.position.y = -FLOWER.deep * (1 - Math.max(0, k)) + past;
      one.model.rotation.z = FLOWER.sway * Math.sin(t * 2.2 + phase) * Math.max(0, k);
      return k > 0;
    });
  }
}

/** Her attack's thorns, flying from `from` into `to`. */
export function shoot(props: Props, from: Vector3, to: Vector3): void {
  const thorns = props.copy(LORRAINE_ASSETS, 'thorn');
  if (!thorns) return;
  thorns.scale.setScalar(THORN.size);
  const start = from.clone();
  const end = to.clone();
  // (Its thorns point along the file's z: turned to where they go.)
  thorns.position.copy(start);
  thorns.lookAt(end);
  props.play(thorns, (t) => {
    thorns.position.lerpVectors(start, end, Math.min(1, t / THORN.flies));
    return t < THORN.flies;
  });
}
