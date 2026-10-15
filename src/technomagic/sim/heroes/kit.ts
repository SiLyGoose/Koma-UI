import { NONE, type HeroStats } from '../combat/damage';
import type { OwnTiming } from '../motion';
import type { OwnPerkId, PerkDef } from '../perks';
import type { Line } from '../rules';
import type { Art, Buff, Mark } from '../shown';
import type { Fight, Fighter } from '../types';
import type { HeroMove } from './moves';

/*
 * What a hero is in a fight, whatever skin it wears: its class (and so where it stands), how it stands
 * damage and the kind it deals, its skills and passive, how its moves are timed, and what comes of each of its
 * moves as it lands. Each hero is a file here (./kirze.ts, ./clause.ts); ./index.ts lists them. Nothing of it is
 * drawn: what the page draws for a hero is its folder under ../../heroes/ (its `fx.ts`, and what its body does
 * its `moves.ts`), and how it looks ../../heroes/looks.ts.
 */

/** An ability: what the hero does for it, how long before it can be used again (seconds), and the mana it takes. */
export interface Ability {
  name: string;
  /** What it does, for whoever holds it down on its card. */
  about?: string;
  /**
   * King's Raid's words for it, as kingsraid.shodyra.com has them, with the fight's numbers where it has them (the
   * heroes page shows them, from the bot); and what its tag there says besides its cost, where not its cooldown.
   */
  words?: string;
  tag?: string;
  /**
   * What Auto makes of it (none: a blow, used whenever it can be): `heals` (wanted once an ally is hurt or bears
   * something it can clear), `keeps` (it puts up a status of this name on the heroes: wanted once it runs out).
   */
  auto?: { heals?: true; keeps?: string };
  /** What stands for it where it has no picture (or the picture isn't on this computer). */
  icon: string;
  art?: Art;
  move: HeroMove;
  cooldown: number;
  cost: number;
}

/**
 * A hero's passive: what it always has. Its blows are `attack` times as hard and `crit` of them (0 to 1)
 * are critical, and what its skills stun the boss for lasts `control` times as long; what the boss's
 * blows take of it is `taken` times as much (1 when it doesn't say); `shown` is its square on its card.
 */
export interface Passive {
  attack: number;
  crit: number;
  control: number;
  taken?: number;
  shown: Buff;
  /** King's Raid's words for it, as an Ability's are; and what its tag says, where not "Passive". */
  words?: string;
  tag?: string;
}

/** A hero with no passive. */
export const NO_PASSIVE: Omit<Passive, 'shown'> = { attack: 1, crit: 0, control: 1 };

/** A hero's part in one fight: what comes of what it does, and what it keeps count of meanwhile. */
export interface HeroPart {
  /** What comes of each part of a move of its own as it lands (`part` counts them from 0). Its plain attack and cast are the fight's (unless it says otherwise here). */
  lands: Partial<Record<HeroMove, (part: number) => void>>;
  /**
   * What each of its skill slots (by index) holds for now, when that isn't always its own skill: its own, another
   * that its skills have turned into, or null (sealed: it can't be used). Missing: always its own.
   */
  slot?(index: number): Ability | null;
  /** It has used what is in one of its skill slots (as the move begins). */
  used?(index: number, ability: Ability): void;
  /** Every frame, on the field or off it. */
  tick?(dt: number): void;
  /** A hero's blow has landed on the boss (not one that comes of a status already on it). */
  struck?(): void;
  /** It has blocked a blow of the boss's. */
  blocked?(): void;
  /** A blow of the boss's has hurt a hero (it, or another). */
  hurt?(who: Fighter): void;
  /** How many times as much it takes from the boss, for now; and whether it can't be knocked down, for now. */
  takes?(): number;
  guards?(): boolean;
  /** How many times as fast everything it does is, for now; its attack speed's points more, for now; and how many times as hard its blows are, for now. */
  pace?(): number;
  speed?(): number;
  deals?(): number;
  /** A blow of its own has landed on the boss (counted: not one that comes of a status already on it): its attack's, or (`skill`) a skill's. */
  blow?(skill: boolean): void;
  /** Its card glows. */
  lit?(): boolean;
  /** Auto: whether this skill's moment has come (false: Auto saves its mana for it, but waits to use it). */
  ripe?(index: number): boolean;
  /** What its skills have given it for now: squares on its card. */
  buffs?(): Buff[];
  /** What its skills have left on the boss that only it keeps count of: marks under the boss's health. */
  marks?(): Mark[];
}

/** A hero's class, as the game has it. */
export type HeroClass = 'knight' | 'warrior' | 'assassin' | 'archer' | 'mechanic' | 'wizard' | 'priest';

/** Where each class usually stands: knights and warriors in the frontline, priests and wizards in the backline, the rest between. */
const CLASS_LINES: Record<HeroClass, Line> = { knight: 'front', warrior: 'front', assassin: 'middle', archer: 'middle', mechanic: 'middle', wizard: 'back', priest: 'back' };

/** Where a hero stands: its own line, if it has one, or its class's. */
export const lineOf = (def: HeroDef): Line => def.line ?? CLASS_LINES[def.class];

const LINE_RANK: Record<Line, number> = { front: 0, middle: 1, back: 2 };
const CLASS_RANK: Record<HeroClass, number> = { knight: 0, warrior: 1, assassin: 2, mechanic: 3, wizard: 4, archer: 5, priest: 6 };
/**
 * Which of two heroes is shown nearer the boss (on the right), as the lineup and the cards along the bottom
 * show them: by line, the front first; in the same line, by class, the tank first. (Sorted by it, heroes
 * level on both keep their order.)
 */
export const nearer = (a: HeroDef, b: HeroDef): number => LINE_RANK[lineOf(a)] - LINE_RANK[lineOf(b)] || CLASS_RANK[a.class] - CLASS_RANK[b.class];

/**
 * How each class stands, before what is a hero's own (the kind of damage it deals, and anything else it
 * has otherwise): a hero's stats are its class's, with its own over them. Health and attack are as the
 * fight measures them (both the size of King's Raid's: a skill's numbers are written for an ATK of 100,000, ../combat/damage.ts,
 * and what the boss's blows take and the heals and shields that are no share of health are sized to health this big); crit,
 * attack speed, penetration, CC resist, block and dodge are points (1000: 100%). A first guess at each,
 * by what the game says a class is for:
 * - knight: the most health and defense, and blocks the most;
 * - warrior: as much of everything, standing and hitting, some block and some CC resist;
 * - assassin: bursts of damage, the most crits and the quickest, dodging what it can;
 * - archer: the hardest hitting, and the most penetration;
 * - mechanic: hits again and again from off, a little of everything;
 * - wizard: magic, hitting hard and seeing past defense, and standing magic better than blows;
 * - priest: heals and shields (by its attack), standing magic well, quick at what it does.
 */
export const CLASS_STATS: Record<HeroClass, Omit<HeroStats, 'deals'>> = {
  knight: { hp: 140_000, atk: 75_000, physical: 1000, magical: 700, block: { physical: 350, magical: 250 }, dodge: NONE, crit: 50, speed: 0, pen: 0, resist: 250 },
  warrior: { hp: 115_000, atk: 100_000, physical: 600, magical: 450, block: { physical: 100, magical: 50 }, dodge: { physical: 50, magical: 50 }, crit: 100, speed: 100, pen: 100, resist: 150 },
  assassin: { hp: 90_000, atk: 115_000, physical: 300, magical: 250, block: NONE, dodge: { physical: 200, magical: 150 }, crit: 350, speed: 250, pen: 150, resist: 50 },
  archer: { hp: 85_000, atk: 125_000, physical: 250, magical: 250, block: NONE, dodge: { physical: 100, magical: 50 }, crit: 200, speed: 150, pen: 300, resist: 0 },
  mechanic: { hp: 90_000, atk: 105_000, physical: 300, magical: 350, block: NONE, dodge: { physical: 50, magical: 50 }, crit: 150, speed: 150, pen: 150, resist: 50 },
  wizard: { hp: 80_000, atk: 125_000, physical: 200, magical: 450, block: { physical: 0, magical: 50 }, dodge: { physical: 0, magical: 50 }, crit: 150, speed: 50, pen: 200, resist: 0 },
  priest: { hp: 90_000, atk: 90_000, physical: 300, magical: 500, block: { physical: 0, magical: 100 }, dodge: { physical: 0, magical: 50 }, crit: 50, speed: 100, pen: 0, resist: 100 },
};

export interface HeroDef {
  /** What the bot and the site know it by: its file here (and its folder under ../../heroes/ and assets/heroes/). */
  id: string;
  name: string;
  class: HeroClass;
  /** Where it stands, when that isn't where its class usually does. */
  line?: Line;
  /** Its skins' names, its own first: each looks otherwise (../../assets/), and fights the same. */
  skins: readonly string[];
  /** Its health and attack, the kind of damage its blows deal, how it stands the boss's, and the rest: its class's (CLASS_STATS), with its own over them. */
  stats: HeroStats;
  abilities: readonly Ability[];
  passive?: Passive;
  /** The move it attacks with, when it has no animation for its attack and isn't to attack as most do. */
  attack?: HeroMove;
  /** Its own transcendence perks (Transcend 3's and 5's): King's Raid's words for each, and what each does (./../perks.ts; what more, its part does). */
  perks?: Partial<Record<OwnPerkId, PerkDef>>;
  /** How its own animations are timed (its skins' that have them are drawn to fit: ../motion.ts); none, its moves are all timed as written in code. */
  timing?: OwnTiming;
  /** Its part in a fight: made once, as the fight begins. */
  join(fight: Fight, self: Fighter): HeroPart;
}
