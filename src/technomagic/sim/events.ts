import type { HeroMove } from './heroes/moves';
import type { NumberKind } from './shown';

/*
 * What goes in and out of the sim (./fight.ts). In: what the player does (Input), each kept with the step
 * it was done before (Logged), so the bot can play the fight over the same way (./bot.ts). Out: what
 * happened, for the page to draw (SimEvent). Heroes are named by their index among the fighters.
 */

export type Input =
  /** A hero's skill is pressed: it waits its turn (and, short of mana, the mana), one at a time; pressed again meanwhile, not after all. */
  | { kind: 'skill'; fighter: number; skill: number }
  /** A hero's Auto is turned on or off; every hero's (on for all, unless all have it on already). */
  | { kind: 'auto'; fighter: number }
  | { kind: 'all-auto' }
  /** The player leaves the raid: lost. */
  | { kind: 'leave' }
  /** Only when trying things out: a hero onto the field or off it, the boss set to an attack, Boss auto on or off, Deathless on or off, the raid's stage. */
  | { kind: 'toggle'; fighter: number }
  | { kind: 'boss'; attack: string }
  | { kind: 'boss-auto' }
  | { kind: 'deathless' }
  | { kind: 'stage'; stage: number };

/** An input, with the step it was done before (the sim's `tick` then). */
export type Logged = Input & { tick: number };

export type Result = 'won' | 'lost';

export type SimEvent =
  /** A hero runs in onto the field; one leaves it. */
  /** (`run`: the raid's run up to the boss, the fight moving it along: so many seconds until it is where it stands, of ./rules.ts MARCH.) */
  | { kind: 'enter'; who: number; run?: number }
  | { kind: 'leave'; who: number }
  /** A hero down is up again (a skill revived it). */
  | { kind: 'revive'; who: number }
  /** A hero begins a move: its attack, or (`skill`) one of its skills. */
  | { kind: 'start'; who: number; move: HeroMove; skill: boolean }
  /** What a hero was doing is cut short: it reels. */
  | { kind: 'stagger'; who: number }
  /** A part of a hero's move lands (`part` counts them from 0; an attack's fifth is its hardest). */
  | { kind: 'land'; who: number; move: HeroMove; part: number }
  /** A blow of the boss's (or, `by`, another enemy's) reaches a hero: blocked, or it flinches. */
  | { kind: 'hurt'; who: number; blocked: boolean; by?: number }
  /** A number to come off a hero or an enemy (`on` 'boss': the boss, or the enemy `foe`; `mend`: the boss's own healing, shown higher up). */
  | { kind: 'number'; on: number | 'boss'; foe?: number; amount: number; type: NumberKind; mend?: boolean }
  /** Something a hero (`who`), or the boss (null), does that is drawn its own way, on `targets`. */
  | { kind: 'cue'; who: number | null; name: string; targets: number[] }
  /** The boss begins an attack; is hit; is stunned (knocked `down`); slowed. */
  | { kind: 'boss-use'; attack: string }
  | { kind: 'boss-hit'; foe?: number }
  | { kind: 'boss-daze'; seconds: number; down: boolean }
  | { kind: 'boss-slow'; rate: number; seconds: number }
  /**
   * A raid of more than one wave: the heroes move on to the next (`wave` of `of`), and what is on it comes onto the field
   * (an enemy, `foe` by its index, of its kind, where it stands); the boss flies off the field, and comes back.
   */
  | { kind: 'wave'; wave: number; of: number }
  | { kind: 'foe-enter'; foe: number; minion: string; x: number; z: number }
  | { kind: 'boss-leave' }
  | { kind: 'boss-return' }
  /** An enemy not the boss begins a move (its plain attack, or its skill); is stunned; is beaten. */
  | { kind: 'foe-use'; foe: number; move: 'attack' | 'skill' }
  | { kind: 'foe-daze'; foe: number; seconds: number }
  | { kind: 'foe-down'; foe: number }
  /** The fight is over. */
  | { kind: 'end'; result: Result };
