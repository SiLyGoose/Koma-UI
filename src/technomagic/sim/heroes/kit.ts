import { ATK, NONE, POINTS, type HeroStats, type PerKind } from '../combat/damage';
import type { OwnTiming } from '../motion';
import type { OwnPerkId, PerkDef } from '../perks';
import type { Line } from '../rules';
import { num, type Art, type Buff, type Mark } from '../shown';
import type { Fight, Fighter } from '../types';
import type { HeroMove } from './moves';

/*
 * What a hero is in a fight, whatever skin it wears: its class (and so where it stands), how it stands
 * damage and the kind it deals, its skills and passive, how its moves are timed, and what comes of each of its
 * moves as it lands. Each hero is a file here (./kirze.ts, ./klaus.ts); ./index.ts lists them. Nothing of it is
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
  /** What knocks it down holds it this many times as long (1 when it doesn't say); and (`steady`) nothing changes how fast it moves: neither its attack speed nor what is on it. */
  held?: number;
  steady?: boolean;
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
  /** A hero's blow has landed on the boss (not one that comes of a status already on it): `by` is the hero whose it is. */
  struck?(by: Fighter): void;
  /** It has blocked a blow of the boss's; it has dodged one. */
  blocked?(): void;
  dodged?(): void;
  /** A blow of the boss's has hurt a hero (it, or another). */
  hurt?(who: Fighter): void;
  /** How many times as much it takes from the boss, for now; and whether it can't be knocked down, for now. */
  takes?(): number;
  /** It takes nothing at all from the boss's blows, for now; and its dodge's points more, for now. */
  untouched?(): boolean;
  dodge?(): number;
  /** A blow of the boss's would bring it down: whether it is left on 1 HP instead (what else comes of that is its own). */
  spared?(): boolean;
  guards?(): boolean;
  /** How many times as long what knocks it down holds it, for now (on top of its passive's `held`). */
  held?(): number;
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
 * King's Raid's own stats for each class at level 80. Every hero of a class has its class's (the King's Raid Index,
 * kingsraid.netlify.app, shows each hero its class's Basic Stats and Additional Options). Its Basic Stats: max HP,
 * ATK, P.DEF and M.DEF. Its Additional Options, in points as the game has them (1000: 100%), none where it has none:
 * crit chance, Crit DMG (a share more), penetration, ACC, block and dodge against each kind, Tough against each kind
 * (a share of every blow taken off: ../combat/damage.ts), CC resist, M.Block DEF (the share more a block takes off: the game shows the priest's 250 points as
 * 23%), and ATK Spd (1000 for every class: its attack as quick as it comes).
 */
interface KingsRaidClass {
  hp: number;
  atk: number;
  defense: PerKind;
  crit: number;
  critDamage?: number;
  pen?: number;
  acc?: number;
  block?: PerKind;
  dodge?: PerKind;
  tough?: PerKind;
  resist?: number;
  blockDef?: PerKind;
  speed: number;
}
const KINGS_RAID: Record<HeroClass, KingsRaidClass> = {
  knight: { hp: 1_354_584, atk: 15_712, defense: { physical: 6984, magical: 5432 }, crit: 50, block: { physical: 100, magical: 100 }, tough: { physical: 250, magical: 250 }, speed: 1000 },
  warrior: { hp: 1_150_488, atk: 17_848, defense: { physical: 5816, magical: 6984 }, crit: 150, pen: 150, acc: 100, dodge: { physical: 100, magical: 100 }, resist: 150, speed: 1000 },
  assassin: { hp: 1_099_264, atk: 19_592, defense: { physical: 6208, magical: 5432 }, crit: 200, critDamage: 0.3, acc: 100, dodge: { physical: 200, magical: 200 }, speed: 1000 },
  archer: { hp: 846_664, atk: 22_112, defense: { physical: 4264, magical: 3488 }, crit: 150, pen: 250, acc: 100, speed: 1000 },
  mechanic: { hp: 918_448, atk: 20_176, defense: { physical: 4264, magical: 3488 }, crit: 150, critDamage: 0.5, pen: 100, acc: 200, speed: 1000 },
  wizard: { hp: 782_056, atk: 23_280, defense: { physical: 3104, magical: 4656 }, crit: 100, pen: 150, acc: 100, block: { physical: 0, magical: 250 }, dodge: { physical: 0, magical: 200 }, speed: 1000 },
  priest: { hp: 876_928, atk: 18_424, defense: { physical: 3880, magical: 4848 }, crit: 100, acc: 100, block: { physical: 0, magical: 500 }, tough: { physical: 0, magical: 150 }, blockDef: { physical: 0, magical: 0.23 }, speed: 1000 },
};
const CLASSES = Object.keys(KINGS_RAID) as HeroClass[];

/**
 * How each class stands, before what is a hero's own (the kind of damage it deals, and anything else it has
 * otherwise): a hero's stats are its class's (King's Raid's own: KINGS_RAID), with its own over them.
 */
export const CLASS_STATS = Object.fromEntries(
  CLASSES.map((one) => {
    const { hp, atk, defense, crit, critDamage, pen, acc, block, dodge, tough, resist, blockDef, speed } = KINGS_RAID[one];
    const stats: Omit<HeroStats, 'deals'> = {
      hp,
      atk,
      physical: defense.physical,
      magical: defense.magical,
      crit,
      critDamage: critDamage ?? 0,
      speed,
      pen: pen ?? 0,
      acc: acc ?? 0,
      block: block ?? NONE,
      dodge: dodge ?? NONE,
      resist: resist ?? 0,
      tough: tough ?? NONE,
      ...(blockDef && { blockDef }),
    };
    return [one, stats];
  }),
) as Record<HeroClass, Omit<HeroStats, 'deals'>>;

/**
 * A blow as the King's Raid Index (kingsraid.netlify.app) has it: the DMG its words say a hero of `kind` deals, as
 * thousandths of ATK (as a blow's numbers are), so that at its class's ATK it deals just that.
 */
export const indexed = (kind: HeroClass, dmg: number): number => (POINTS * dmg) / KINGS_RAID[kind].atk;
/** A heal or a shield as the King's Raid Index has it: so that a hero of `kind`, at its class's ATK, gives just `amount` (a heal gives as much more as its healer's attack is over ATK). */
export const indexedHeal = (kind: HeroClass, amount: number): number => (amount * ATK) / KINGS_RAID[kind].atk;
/** What a blow of `blow` deals from a hero of `kind` at its class's ATK, as its words say it (the Index's own number, where it has one). */
export const dmg = (kind: HeroClass, blow: number): string => num(Math.round((blow * KINGS_RAID[kind].atk) / POINTS));
/** What a heal or a shield of `amount` gives from a hero of `kind` at its class's ATK, as its words say it. */
export const healed = (kind: HeroClass, amount: number): string => num(Math.round((amount * KINGS_RAID[kind].atk) / ATK));

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
