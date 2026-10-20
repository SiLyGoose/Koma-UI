import { ATK, NONE, POINTS, type HeroStats, type PerKind } from '../combat/damage';
import { KR_HEROES } from './kr';
import type { OwnTiming } from '../motion';
import type { OwnPerkId, PerkDef } from '../perks';
import type { TreasureDef } from '../treasures';
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
   * What Auto makes of it (none: picked whenever its cooldown is over): `keeps` (it puts up a status of this name on the
   * heroes: not picked till that runs out).
   */
  auto?: { keeps?: string };
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
  /** Auto: whether this skill's moment is now (true: Auto picks it, if it can be used, before any other). */
  now?(index: number): boolean;
  /** Auto: whether this skill waits for now (true: Auto doesn't pick it, and lets it go if it had). */
  waits?(index: number): boolean;
  /** What its skills have given it for now: squares on its card. */
  buffs?(): Buff[];
  /** What its skills have left on the boss that only it keeps count of: marks under the boss's health. */
  marks?(): Mark[];
}

/** A hero's class, as the game has it. */
export type HeroClass = 'knight' | 'warrior' | 'assassin' | 'archer' | 'mechanic' | 'wizard' | 'priest';

/** Where each class usually stands (for a hero King's Raid's playtest hasn't): knights and warriors in the frontline, priests and wizards in the backline, the rest between. */
const CLASS_LINES: Record<HeroClass, Line> = { knight: 'front', warrior: 'front', assassin: 'middle', archer: 'middle', mechanic: 'middle', wizard: 'back', priest: 'back' };

/** Where a hero stands: its own line, if it has one; or King's Raid's (its position: ./kr.ts); or its class's. */
export const lineOf = (def: HeroDef): Line => def.line ?? KR_HEROES[def.id]?.stand.line ?? CLASS_LINES[def.class];

const LINE_RANK: Record<Line, number> = { front: 0, middle: 1, back: 2 };
const CLASS_RANK: Record<HeroClass, number> = { knight: 0, warrior: 1, assassin: 2, mechanic: 3, wizard: 4, archer: 5, priest: 6 };
/**
 * Which of two heroes is shown nearer the boss (on the right), as the lineup and the cards along the bottom
 * show them: by line, the front first; in the same line, by class, the tank first. (Sorted by it, heroes
 * level on both keep their order.)
 */
export const nearer = (a: HeroDef, b: HeroDef): number => LINE_RANK[lineOf(a)] - LINE_RANK[lineOf(b)] || CLASS_RANK[a.class] - CLASS_RANK[b.class];

/**
 * King's Raid's own stats for each class. Every hero of a class has its class's (the King's Raid Index,
 * kingsraid.netlify.app, shows each hero its class's Basic Stats and Additional Options). Its Basic Stats: max HP,
 * ATK, P.DEF and M.DEF, at level 100, 5★, Transcend 5 (King's Raid's playtest's: its CreatureLevelStatTable2 and star
 * factors; the Index's are at level 80, 0.794 of these). Its Additional Options, in points as the game has them (1000: 100%), none where it has none:
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
  knight: { hp: 1_706_672, atk: 19_792, defense: { physical: 8792, magical: 6840 }, crit: 50, block: { physical: 100, magical: 100 }, tough: { physical: 250, magical: 250 }, speed: 1000 },
  warrior: { hp: 1_449_520, atk: 22_488, defense: { physical: 7328, magical: 8792 }, crit: 150, pen: 150, acc: 100, dodge: { physical: 100, magical: 100 }, resist: 150, speed: 1000 },
  assassin: { hp: 1_384_992, atk: 24_688, defense: { physical: 7816, magical: 6840 }, crit: 200, critDamage: 0.3, acc: 100, dodge: { physical: 200, magical: 200 }, speed: 1000 },
  archer: { hp: 1_066_728, atk: 27_864, defense: { physical: 5376, magical: 4392 }, crit: 150, pen: 250, acc: 100, speed: 1000 },
  mechanic: { hp: 1_157_176, atk: 25_416, defense: { physical: 5376, magical: 4392 }, crit: 150, critDamage: 0.5, pen: 100, acc: 200, speed: 1000 },
  wizard: { hp: 985_328, atk: 29_328, defense: { physical: 3904, magical: 5864 }, crit: 100, pen: 150, acc: 100, block: { physical: 0, magical: 250 }, dodge: { physical: 0, magical: 200 }, speed: 1000 },
  priest: { hp: 1_104_864, atk: 23_216, defense: { physical: 4888, magical: 6104 }, crit: 100, acc: 100, block: { physical: 0, magical: 500 }, tough: { physical: 0, magical: 150 }, blockDef: { physical: 0, magical: 0.23 }, speed: 1000 },
};
const CLASSES = Object.keys(KINGS_RAID) as HeroClass[];
/** Each class's ATK as the King's Raid Index has it (level 80): what its numbers for a skill's DMG and heals are at. */
const INDEX_ATK: Record<HeroClass, number> = { knight: 15_712, warrior: 17_848, assassin: 19_592, archer: 22_112, mechanic: 20_176, wizard: 23_280, priest: 18_424 };

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
 * thousandths of ATK (as a blow's numbers are), so that at its class's ATK as the Index has it (INDEX_ATK) it deals just that.
 */
export const indexed = (kind: HeroClass, dmg: number): number => (POINTS * dmg) / INDEX_ATK[kind];
/** A heal or a shield as the King's Raid Index has it: so that a hero of `kind`, at its class's ATK, gives just `amount` (a heal gives as much more as its healer's attack is over ATK). */
export const indexedHeal = (kind: HeroClass, amount: number): number => (amount * ATK) / INDEX_ATK[kind];
/**
 * A blow as King's Raid's playtest has it (its skill at level 90, 5★: stats/<hero>.md): `ratio` thousandths of ATK and
 * `flat` more, as thousandths of ATK, the flat part at its class's ATK (level 100: KINGS_RAID). The Index's numbers are the
 * same blows at the same level, so a hero from either deals alike (Tanya's Blade Tornado: 3 × (136.5% + 69,958) is its 247,062).
 */
export const played = (kind: HeroClass, ratio: number, flat = 0): number => ratio + (POINTS * flat) / KINGS_RAID[kind].atk;
/** A heal or a shield as the playtest has it: `ratio` thousandths of its healer's ATK and `flat` more, at its class's ATK (as indexedHeal). */
export const playedHeal = (kind: HeroClass, ratio: number, flat = 0): number => ATK * (ratio / POINTS + flat / KINGS_RAID[kind].atk);

/**
 * What a blow of `blow` deals from a hero of `kind` at its class's ATK, as its words say it (the Index's own number, where it
 * has one), `books` times as much (bookDmg: as it is with its skill's books).
 */
export const dmg = (kind: HeroClass, blow: number, books = 1): string => num(Math.round((blow * books * KINGS_RAID[kind].atk) / POINTS));
/** What a heal or a shield of `amount` gives from a hero of `kind` at its class's ATK, as its words say it, `books` times as much (bookHeal). */
export const healed = (kind: HeroClass, amount: number, books = 1): string => num(Math.round((amount * books * KINGS_RAID[kind].atk) / ATK));
/**
 * A hero's skills are as they are with all their books (King's Raid's playtest's: ./kr.ts), there being none to get here: how
 * many times as much the `index`th skill's damage is for them (3: its passive's), and its heals and shields.
 */
export const bookDmg = (id: string, index: number): number => 1 + (KR_HEROES[id]?.books.dmg[index] ?? 0);
/**
 * Which blows of a hero's attack (as its part counts them: the whole chain's, from 0) are the first of a part of it: King's
 * Raid's "on a normal attack" (OnBaseAttack) is once for each part, not each blow.
 */
export const attackStarts = (id: string): ReadonlySet<number> => {
  const starts = new Set<number>();
  let at = 0;
  for (const part of KR_HEROES[id]?.attack ?? []) {
    if (part.lands.length > 0) starts.add(Math.min(at, 4));
    at += part.lands.length;
  }
  return starts;
};
export const bookHeal = (id: string, index: number): number => 1 + (KR_HEROES[id]?.books.heal[index] ?? 0);

export interface HeroDef {
  /** What the bot and the site know it by: its file here (and its folder under ../../heroes/ and assets/heroes/). */
  id: string;
  name: string;
  class: HeroClass;
  /** Where it stands, when that isn't where King's Raid has it (./kr.ts stand), or the game hasn't it and its class doesn't usually stand there. */
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
  /** Its four unique treasures (UT1 to UT4: its skills' and its passive's, in order), each King's Raid's (../treasures.ts). */
  treasures?: readonly [TreasureDef, TreasureDef, TreasureDef, TreasureDef];
  /** How its own animations are timed (its skins' that have them are drawn to fit: ../motion.ts); none, its moves are all timed as written in code. */
  timing?: OwnTiming;
  /** Its part in a fight: made once, as the fight begins. */
  join(fight: Fight, self: Fighter): HeroPart;
}
