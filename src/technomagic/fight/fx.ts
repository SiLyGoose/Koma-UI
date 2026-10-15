import type { Vector3 } from 'three';
import type { Effects } from '../fx/effects';
import type { Magic } from '../fx/magic';
import type { Props } from '../fx/props';
import type { HeroMove } from '../heroes/moves';

/*
 * What is drawn for what happens in the fight: each hero's (its `fx.ts`) and each boss's, by what the
 * sim says happened (../sim/events.ts): a move's blow landing, or something of its own it cues.
 */

/** Where things are on the field, and what draws there. Heroes are named by their index among the fighters. */
export interface FxScene {
  effects: Effects;
  magic: Magic;
  /** What a skill brings onto the field for a while (Lorraine's vines). */
  props: Props;
  /** Where a hero's cut reaches the boss, and the floor under the boss. */
  bossHit: Vector3;
  bossFeet: Vector3;
  /** Where a hero stands (its feet, or under them when it is in the air), and where its head is: put in `into`. */
  place(who: number, into: Vector3): Vector3;
  head(who: number, into: Vector3): Vector3;
  /** Where a hero's left hand is (what it holds there: a staff, a shield): put in `into`. */
  leftHand(who: number, into: Vector3): Vector3;
  /** Where what floats beside a hero is (Annette's Rascal; its head, for one with nothing floating): put in `into`. */
  floater(who: number, into: Vector3): Vector3;
}

/**
 * What is drawn for a hero's moves as each part lands (`who` is the hero), and for what it cues (`targets`: whom it is on).
 * And what of its skills guards a hero with a look of its own (../fx/wards.ts): by the status's name, the prop of its
 * hero's (../assets/) held up before each hero it is on, for as long as it is on.
 */
export interface HeroFx {
  lands?: Partial<Record<HeroMove, (fx: FxScene, who: number, part: number) => void>>;
  cues?: Readonly<Record<string, (fx: FxScene, who: number, targets: readonly number[]) => void>>;
  wards?: Readonly<Record<string, string>>;
}

/** What is drawn for what a boss cues (`targets`: whom it is on). */
export type BossFx = Readonly<Record<string, (fx: FxScene, targets: readonly number[]) => void>>;

/** What is drawn for the moves every hero has (unless its own fx say otherwise). */
export const COMMON_FX: HeroFx = {
  lands: {
    // A blow of its attack: a slash across the boss, one way then the other, the last the hardest.
    attack({ effects, bossHit }, _who, part) {
      effects.play('slash', bossHit, part % 2 ? -0.6 : 0.6);
      effects.play('impact', bossHit, 0, part === 4 ? 1.1 : 0.7);
    },
    cast({ effects, bossHit }) {
      effects.play('blast', bossHit);
    },
  },
};
