import { Vector3, type Object3D, type Quaternion } from 'three';
import type { HeroMove } from '../moves';
import type { Hero, Stood } from './hero';
import { BIPED } from './skeletons';

/*
 * A hero whose sword is kept in the sheath in its other hand (Seria): drawn for its attack and its skills, and back
 * in the sheath once they are done, or cut short. Drawn, the sword is in its hand and the sheath is empty; sheathed,
 * the sword in its hand is hidden and its hilt shows in the sheath (the sheath's own file has it, on the mark
 * Point_Weapon: ./stand.ts).
 *
 * To draw it, its sword hand reaches across to the hilt in the sheath as the move begins, over what the move has
 * it do; there it takes the sword, and its arm goes back to the move as the sword comes out. Put away, the same the
 * other way: its hand takes the sword back to the sheath, lets it go there and comes back. (Only how it is drawn and
 * put away: the move itself, and when its blows land, are as the fight has them.)
 */

/**
 * How long after a move is done it begins putting the sword away: at once, its hand taking it back to the sheath as
 * the move gives way to how it stands, so it is away before its next attack (the fight's HERO_WAIT after).
 */
const HOLD = 0;
/** Too small to be seen: the hilt in the sheath, while the sword is drawn. */
const GONE = 1e-4;
/** Drawing it or putting it away (in its own time): how long its hand takes to reach the hilt, and then to go back. */
const REACH = 0.14;
const PULL = 0.22;
/** Where its hand takes the hilt, in the sheath's own axes: around the grip, between the guard and the pommel. */
const GRIP = new Vector3(0, -0.3, 0);
/** The way its elbow bends as it reaches across: out to its right, down and back. */
const ELBOW = new Vector3(-0.6, -0.5, -0.6);

const ease = (k: number): number => k * k * (3 - 2 * k);

/** `hero` (stood as `stood`), its sword sheathed but while it does a move (each `lasts` so many seconds of its own time). */
export function sheathing(hero: Hero, { rig, models }: Stood, { sword, scabbard, hilt }: NonNullable<Stood['sheath']>, lasts: (move: HeroMove) => number): Hero {
  /** How long the sword stays drawn yet (0: it isn't drawn, or is being put away). */
  let drawn = 0;
  /** Its hand at the hilt: drawing the sword (`out`) or putting it away, and how long it has been at it (null: neither). */
  let hand: { out: boolean; t: number } | null = null;
  const show = (out: boolean): void => {
    sword.visible = out;
    hilt.scale.setScalar(out ? GONE : 1);
  };
  const sheathe = (): void => {
    drawn = 0;
    hand = null;
    show(false);
  };
  sheathe();
  const model = models[0] as Object3D;
  const target = new Vector3();
  const kept = new Map<Object3D, { position: Vector3; quaternion: Quaternion }>();

  /** Its hand over what the move has it do: `by` (0 to 1) of the way to the hilt. */
  function reach(by: number): void {
    if (by <= 0) return;
    model.updateWorldMatrix(true, true);
    scabbard.updateWorldMatrix(true, false);
    model.worldToLocal(scabbard.localToWorld(target.copy(GRIP)));
    rig.keep(kept);
    rig.reach(...BIPED.arms.R, target, ELBOW);
    rig.blend(kept, 1 - by);
  }

  return {
    ...hero,
    enter() {
      sheathe();
      hero.enter();
    },
    stride(share) {
      if (share !== null && (drawn > 0 || hand)) sheathe();
      hero.stride?.(share);
    },
    start(move) {
      // (Drawn already, from the move before: on with it. Being put away: drawn again, its hand going back to the hilt from where it is.)
      if (drawn <= 0) {
        const back = hand && !hand.out ? hand.t : 0;
        hand = { out: true, t: back < REACH ? back : Math.max(0, REACH - (back - REACH) * (REACH / PULL)) };
      }
      drawn = lasts(move) + HOLD;
      hero.start(move);
    },
    stagger() {
      sheathe();
      hero.stagger();
    },
    fall() {
      sheathe();
      hero.fall();
    },
    update(now, dt) {
      if (drawn > 0) {
        drawn -= dt;
        if (drawn <= 0) hand = { out: false, t: 0 };
      }
      hero.update(now, dt);
      if (!hand) return;
      hand.t += dt;
      // To the hilt; there it takes the sword (or lets it go); back to what it is doing.
      if (hand.t < REACH) reach(ease(hand.t / REACH));
      else {
        show(hand.out);
        reach(1 - ease(Math.min(1, (hand.t - REACH) / PULL)));
        if (hand.t >= REACH + PULL) hand = null;
      }
    },
  };
}
