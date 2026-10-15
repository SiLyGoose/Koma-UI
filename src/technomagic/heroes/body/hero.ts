import { Group, Vector3, type MeshBasicMaterial, type Object3D } from 'three';
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

export interface Hero {
  root: Group;
  /** Runs in from off the field to where it stands. */
  enter(): void;
  /** Starts an attack or a skill (cutting short whatever it was doing: the sim says when). */
  start(move: HeroMove): void;
  /** Where its head is on the field, and where it stands (its feet, or under them when it is in the air): put in `into`. */
  head(into: Vector3): Vector3;
  place(into: Vector3): Vector3;
  /** Where its left hand is on the field (what it holds there: a staff, a shield): put in `into`. */
  leftHand(into: Vector3): Vector3;
  /** Hit: red for a moment. It goes on with what it was doing. */
  hit(): void;
  /** Staggered (stunned, thrown back): what it was doing is cut short. */
  stagger(): void;
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
  /** A shield on its left arm, when it has one: the mark it hangs on, and the way its face looks in that mark's own axes. */
  shield?: { mark: string; face: Vector3 };
  /** What it is drawn with: tinted when it is hit. */
  materials: MeshBasicMaterial[];
  /**
   * What floats under it, when it sits on something (its skin's `floating`): its pieces (the bones that move
   * each, and where each is at rest), the middle of its top layer (in the pieces' own axes: they spread apart from
   * there, so what is on it stays on it), and the back of its underside, where it tips about (in the body's own lengths).
   */
  floating?: { pieces: { bone: Object3D; rest: Vector3 }[]; top: Vector3; pivot: Vector3 };
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

/** Tints what a hero is drawn with by how lately it was hit: `red` is how much of RED it has left. */
export function redden(materials: readonly MeshBasicMaterial[], red: number): void {
  const k = red / RED;
  for (const material of materials) material.color.setRGB(1, 1 - k * 0.6, 1 - k * 0.6);
}
