import { Group, Vector3, type MeshBasicMaterial, type Object3D } from 'three';
import { isMesh } from '../../engine/models';
import type { Rig } from '../../engine/rig';
import { ENTER as RUNNING_IN } from '../../sim/rules';
import type { HeroMove } from '../moves';

/*
 * A hero on the field, whatever moves it: what the page asks of it (Hero: to do what the fight's sim says it
 * does, ../../sim/), and its model stood where it is drawn from (Stood), ready to be moved by poses written in
 * code (./posed.ts) or by animations (./animated.ts).
 */

/** A hero is drawn this many times its size: a quarter of the boss's height, as in the game. */
export const SCALE = 1.68;
/** Hit: red for this long. */
export const RED = 0.45;
/** Running in: how long it takes, and from how far back. */
export const ENTER = { time: RUNNING_IN, from: -7.5 };
/** Fallen: how long it takes to go over onto its back (and to get up again, revived), and how far its feet are lifted lying there (so its back is on the floor, not in it). */
export const FALL = { time: 0.55, lift: 0.22 };

export interface Hero {
  root: Group;
  /** Runs in from off the field to where it stands. */
  enter(): void;
  /**
   * Runs where it stands as the fight moves it along the field (a raid's run up to the boss, or on to its next wave),
   * `share` (0 to 1) of the way through the run, slowing as it brakes at the end; null: it isn't. Said every frame, as the
   * fight has it then (so a page drawn late, or back from being away, has it there at once).
   */
  stride?(share: number | null): void;
  /** Starts an attack or a skill (cutting short whatever it was doing: the sim says when). */
  start(move: HeroMove): void;
  /** Where its head is on the field, and where it stands (its feet, or under them when it is in the air): put in `into`. */
  head(into: Vector3): Vector3;
  place(into: Vector3): Vector3;
  /** How tall it is as it is now: from where it stands to the top of its model (its hair, its horns; not what it holds, nor what floats beside it). */
  height(): number;
  /** Where its left hand is on the field (what it holds there: a staff, a shield): put in `into`. */
  leftHand(into: Vector3): Vector3;
  /** Where its right hand is on the field (what it casts from, holding nothing there: Oddy's paw): put in `into`. */
  rightHand(into: Vector3): Vector3;
  /** Where what floats beside it is on the field (its skin's `floating`: Annette's Rascal), put in `into`; missing for one with none. */
  floater?(into: Vector3): Vector3;
  /** Where the far end of what is in its right hand is on the field (what it shoots comes from there), put in `into`; missing for one holding nothing there. */
  muzzle?(into: Vector3): Vector3;
  /** Hit: red for a moment. It goes on with what it was doing. */
  hit(): void;
  /** Staggered (stunned, thrown back): what it was doing is cut short. */
  stagger(): void;
  /** Fallen: what it was doing is cut short, and it stands at rest (the page lays it on the floor: ../../fight/view.ts), or (`falls`) it falls as its own animation has it. */
  fall(): void;
  /** Whether it falls by its own animation (King's Raid's Dead): the page leaves it as that has it. */
  readonly falls?: boolean;
  /** The fight over: it strikes its victory pose (and holds the one after it), or its loss's (for one with none, it stands). */
  pose?(end: 'victory' | 'lose'): void;
  update(now: number, dt: number): void;
}

/**
 * A hero's model stood where it is put on the field, ready to be moved, by poses written in code (./posed.ts)
 * or by animations (./animated.ts).
 */
export interface Stood {
  /** Where it stands on the field: put this in the scene. */
  root: Group;
  /** Moved along the field, lifted and spun round; and, inside it, what turns head over heels about its hips. */
  body: Group;
  middle: Group;
  /** The models its bones are in (a hero's parts, each with the skeleton over again): a pose is in their axes. */
  models: readonly Object3D[];
  rig: Rig;
  /** Where its hips and its feet are as it stands. */
  hips: Vector3;
  feet: { L: Vector3; R: Vector3 };
  /** The way the blade in its right hand runs, in that hand's own axes. */
  blade: Vector3;
  /** A mark at the far end of what is in its right hand, along its blade (its tip, or its muzzle), when it holds something there. */
  muzzle?: Object3D;
  /** What is in its right hand, when it holds something there. */
  inRight?: Object3D;
  /** A shield on its left arm, when it has one: the mark it hangs on, and the way its face looks in that mark's own axes. */
  shield?: { mark: string; face: Vector3 };
  /**
   * What is in its left hand being the sheath of the sword in its right (Seria's): the sword, the sheath, and the
   * sheath's mark the sword's hilt in it hangs on (shown while the sword is sheathed: ./sheath.ts).
   */
  sheath?: { sword: Object3D; scabbard: Object3D; hilt: Object3D };
  /** What it is drawn with: tinted when it is hit. */
  materials: MeshBasicMaterial[];
  /**
   * What floats under it or beside it (its skin's `floating`): the model itself, and where it is at rest (it hovers
   * up and down about there, when its hero doesn't sit on it); its pieces (the bones that move each, and where
   * each is at rest), the middle of its top layer (in the pieces' own axes: they spread apart from there, so what
   * is on it stays on it), and the back of its underside, where it tips about (in the body's own lengths).
   */
  floating?: { model: Object3D; at: Vector3; pieces: { bone: Object3D; rest: Vector3 }[]; top: Vector3; pivot: Vector3 };
}

/** Where a shield's face is kept turned, in its hero's own axes: ahead, a little out to its left and up. */
const SHIELD_FACES = new Vector3(0.3, 0.12, 1).normalize();

/**
 * Keeps a hero's shield facing what is in front of it, however its arm is held: the files hang it for
 * the game's own animations, and any other leaves it facing the floor. (After the hero has been posed.)
 */
export function holdShield(rig: Rig, shield: Stood['shield']): void {
  if (!shield) return;
  rig.settle(shield.mark);
  rig.point(shield.mark, shield.face, SHIELD_FACES);
}

/** Hangs models whose hips are `high` up where a hero is drawn from: it turns head over heels about its middle, not its feet, so they hang in a group at its hips. */
export function hang(models: readonly Object3D[], high: number): Pick<Stood, 'root' | 'body' | 'middle'> {
  const middle = new Group();
  middle.position.y = high;
  for (const model of models) {
    model.position.y = -high;
    middle.add(model);
  }
  const body = new Group();
  body.add(middle);
  body.scale.setScalar(SCALE);
  const root = new Group();
  root.add(body);
  return { root, body, middle };
}

/**
 * How high the top of `models` (what of them is shown, each skinned one as its bones have it now) is over where `root`
 * stands. What hangs on the game's marks (Point_…: ./stand.ts) is left out: what it holds (Yanne's bow, upright), what is pinned to its head.
 */
export function heightOf(root: Object3D, models: readonly Object3D[]): number {
  root.updateMatrixWorld(true);
  const point = new Vector3();
  let top = -Infinity;
  const reach = (o: Object3D): void => {
    if (!o.visible || o.name.startsWith('Point_')) return;
    if (isMesh(o)) {
      const { count } = o.geometry.getAttribute('position');
      for (let i = 0; i < count; i++) top = Math.max(top, o.getVertexPosition(i, point).applyMatrix4(o.matrixWorld).y);
    }
    for (const child of o.children) reach(child);
  };
  for (const model of models) reach(model);
  return top - root.getWorldPosition(point).y;
}

/** Tints what a hero is drawn with by how lately it was hit: `red` is how much of RED it has left. */
export function redden(materials: readonly MeshBasicMaterial[], red: number): void {
  const k = red / RED;
  for (const material of materials) material.color.setRGB(1, 1 - k * 0.6, 1 - k * 0.6);
}
