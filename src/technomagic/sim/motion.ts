import type { HeroDef } from './heroes/kit';
import { CODED, type HeroMove } from './heroes/moves';
import { ENTER } from './rules';

/*
 * How long each of a hero's moves takes and when its blows land: the fight goes by these, and the page draws each
 * move to fit them (whatever skin, and whether this computer has the skin's animations or draws the poses written in
 * code instead). A hero with animations of its own (HeroDef.timing) attacks with its attack's (played one after another,
 * OWN_SPEED as fast), and uses a skill it has one for with that (SKILL_SPEED as fast); everything else is timed as the
 * moves written in code are (./heroes/moves.ts).
 */

/** Its own attack, and a skill of its own: how many times as fast their animations are played. */
export const OWN_SPEED = 1.4;
export const SKILL_SPEED = 1.2;

/** A move, or a part of one: the moments (seconds into it) its blows land, and when it is over. */
export interface Span {
  lands: readonly number[];
  until: number;
}

/** A hero's own animations, as the fight times them: its attack's parts, and its skills' by the move each is. */
export interface OwnTiming {
  attack?: readonly Span[];
  skills?: Partial<Record<HeroMove, Span>>;
}

/** A move: the parts it is played in, one after another (the moments in each its blows land, and when it goes on to the next), and how fast. */
export interface Timeline {
  speed: number;
  parts: readonly Span[];
  /** Its attack's own animations: the last blow is the hardest (the fight knows it as the fifth). */
  fifth: boolean;
}

/** How each move goes for a hero, and the move it attacks with. */
export interface Motion {
  attack: HeroMove;
  moves: Record<HeroMove | 'hit' | 'enter', Timeline>;
}

const coded = (span: Span): Timeline => ({ speed: 1, parts: [span], fifth: false });

/** How `def` moves. */
export function motionOf(def: HeroDef): Motion {
  const own = def.timing?.attack ?? [];
  const attack: HeroMove = own.length > 0 ? 'attack' : (def.attack ?? 'attack');
  const moves = Object.fromEntries(Object.entries(CODED).map(([move, span]) => [move, coded(span)])) as Motion['moves'];
  moves.enter = { speed: 1, parts: [{ lands: [], until: ENTER }], fifth: false };
  if (own.length > 0) moves.attack = { speed: OWN_SPEED, parts: own, fifth: true };
  for (const [move, span] of Object.entries(def.timing?.skills ?? {})) moves[move as HeroMove] = { speed: SKILL_SPEED, parts: [span], fifth: false };
  return { attack, moves };
}
