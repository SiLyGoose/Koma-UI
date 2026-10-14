import type { RiggedModel, SkinAssets } from '../assets';
import { lengthOf } from '../engine/track';
import type { HeroDef } from '../heroes/kit';
import { MOVES, type HeroMove } from '../heroes/moves';
import { ENTER } from './rules';

/*
 * How long each of a hero's moves takes and when its blows land, by its skin: the fight goes by these, and
 * the page's bodies are drawn to match. A skin moved by animations (its own, or another skin's: ../assets/)
 * attacks with its attack's animations, and uses a skill with the animation it has for it, played the
 * faster (OWN_SPEED, SKILL_SPEED); everything else is the moves written in code (../heroes/moves/). Taken
 * from the skins' data, never from the files read, so it is the same wherever the fight runs (the page
 * draws the moves written in code instead, on a computer without a skin's animations).
 */

/** Its own attack, and a skill of its own: how many times as fast their animations are played. */
export const OWN_SPEED = 1.4;
export const SKILL_SPEED = 1.2;

/** A move: the parts it is played in, one after another (the moments in each its blows land, and when it goes on to the next), and how fast. */
export interface Timeline {
  speed: number;
  parts: readonly { lands: readonly number[]; until: number }[];
  /** Its attack's own animations: the last blow is the hardest (the fight knows it as the fifth). */
  fifth: boolean;
}

/** How each move goes for a hero in a skin, and the move it attacks with. */
export interface Motion {
  attack: HeroMove;
  moves: Record<HeroMove | 'hit' | 'enter', Timeline>;
}

const coded = (move: HeroMove | 'hit'): Timeline => ({ speed: 1, parts: [{ lands: MOVES[move].lands, until: lengthOf(MOVES[move].keys) }], fifth: false });

/** The animations that move a skin: its own, another skin's it names, or a rig read for them alone (null: none, so the moves written in code). */
export function animationsOf(skins: readonly SkinAssets[], skin: SkinAssets): RiggedModel | null {
  const { model } = skin;
  if (model.kind === 'rigged') return model;
  if (typeof model.movedBy === 'string') {
    const other = skins.find((one) => one.name === model.movedBy)?.model;
    return other?.kind === 'rigged' ? other : null;
  }
  return model.movedBy ?? null;
}

/** How `def` moves in its skin `skin` (its index among its skins; the first, for one it hasn't). */
export function motionOf(def: HeroDef, skin: number): Motion {
  const { skins } = def.assets;
  const rigged = animationsOf(skins, skins[skin] ?? (skins[0] as SkinAssets));
  const own = rigged?.attack ?? [];
  const attack: HeroMove = own.length > 0 ? 'attack' : (def.attack ?? 'attack');
  const moves = Object.fromEntries(Object.keys(MOVES).map((move) => [move, coded(move as HeroMove | 'hit')])) as Motion['moves'];
  moves.enter = { speed: 1, parts: [{ lands: [], until: ENTER }], fifth: false };
  if (own.length > 0) moves.attack = { speed: OWN_SPEED, parts: own.map(({ lands, until }) => ({ lands, until })), fifth: true };
  for (const [move, { lands, until }] of Object.entries(rigged?.skills ?? {})) {
    if (move in MOVES) moves[move as HeroMove] = { speed: SKILL_SPEED, parts: [{ lands, until }], fifth: false };
  }
  return { attack, moves };
}
