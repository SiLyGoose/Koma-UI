/*
 * The fight's own numbers: what is the same whoever fights. (A fighter's health, the kind of damage it
 * deals and how it stands others' are its own: ../heroes/, ../bosses/. How damage is worked out is
 * ../combat/damage.ts.)
 *
 * The fight is worked out the same way wherever it runs (the page, and the bot checking a win: ./verify.ts),
 * so nothing here leans on what a computer may round its own way: no Math.pow, exp, sin or cos, only
 * + - * / and Math.sqrt, which every computer works out alike.
 */

/** The fight moves on in steps of this many seconds (thirty a second), whatever the page draws meanwhile. */
export const TICK = 1 / 30;

/** Where a hero stands along the field, and how far it is turned from side-on toward the camera. */
export const HERO_X = -0.5;
export const HERO_TURN = 1.15;

/** How many heroes can be on the field at once (a room's lineup: ../../technomagic/protocol.ts). */
export const MOST = 9;

/**
 * Where a hero stands by how it fights: in the frontline, nearest the boss; in the middle; or in the
 * backline, furthest from it. (Which a hero's is, by its class: ../heroes/kit.ts.)
 */
export type Line = 'front' | 'middle' | 'back';
const LINES: readonly Line[] = ['front', 'middle', 'back'];

/** The room each hero keeps round it on the floor: no other hero stands within twice this of it. */
const ROOM = 1.5;
/** The more room between one line and the next. */
const GAP = ROOM;
/** Where each line begins along the field, with no one in front of it. */
const LINE_X: Record<Line, number> = { front: HERO_X, middle: HERO_X - 5 * ROOM, back: HERO_X - 10 * ROOM };
/** The furthest back a hero stands: as far as a full field of one line, or of all three, reaches. A line further back moves up rather than go past it. */
const HINDMOST = HERO_X - (MOST - 1) * ROOM - 2 * GAP;

/**
 * Where each hero on the field stands, [along the field, toward the camera], by its line (`lines`, one
 * for each hero, in its order): the frontline first, then the middle, then the backline, each where its
 * line begins or behind the one before it, whichever is further back (but never past the hindmost a full
 * field reaches). Each hero is a room behind the last, in two rows, the back row in the front row's gaps
 * and as far back as keeps it two rooms from the front row too (each three neighbours a triangle with
 * sides of two rooms); one line is a room further again from the next.
 */
export function formation(lines: readonly Line[]): (readonly [number, number])[] {
  const spots: (readonly [number, number])[] = [];
  let placed = 0;
  let last = 0;
  for (const line of LINES) {
    let first = true;
    lines.forEach((own, i) => {
      if (own !== line) return;
      // The first of a line: where its line begins, or behind the line before; but far enough up that those left to stand fit before the hindmost.
      const begins = placed === 0 ? LINE_X[line] : Math.min(last - ROOM - GAP, LINE_X[line]);
      const x = first ? Math.max(HINDMOST + (lines.length - placed - 1) * ROOM, begins) : last - ROOM;
      spots[i] = [x, placed % 2 ? -Math.sqrt(3) * ROOM : 0];
      first = false;
      last = x;
      placed++;
    });
  }
  return spots;
}

/** Moving to a new spot (others having come onto the field or left it): how much of the way a hero goes in a second. */
export const REFORM = 4;

/** Running in: how long it takes (a hero can do nothing meanwhile). */
export const ENTER = 1.1;

/** With Boss auto on: the wait between the boss's attacks. The wait between a hero's attacks. */
export const AUTO_WAIT = 1.1;
export const HERO_WAIT = 0.45;

/**
 * A hero's mana: the sections of its mana bar and the mana in each (a skill costs whole sections), what
 * it gains a second, and what it gains for every hit it lands or takes.
 */
export const SECTIONS = 6;
export const SECTION = 200;
export const MAX_MANA = SECTIONS * SECTION;
export const MANA_RATE = 50;
export const MANA_HIT = 25;

/** A raid fought alone: the boss has this share of its health. */
export const SOLO_BOSS_HP = 0.6;

/**
 * The raid's time (3:30), shown top right: once it is up the boss is enraged, its blows at once twice as
 * hard and growing hyperbolically, 2 ^ (3 * RAGE_WIPE / (RAGE_WIPE - seconds since) - 2): four times at
 * 5 seconds, sixteen at 10, a thousand at 15, and without end as RAGE_WIPE nears (never more than
 * MOST_RAGE times, for the numbers' sake). RAGE_WIPE after the time is up the heroes have lost.
 */
export const RAID_TIME = 210;
export const RAGE_WIPE = 20;
export const MOST_RAGE = 10_000;

/** ln 2, written out (so no computer works it out its own way). */
const LN2 = 0.6931471805599453;

/**
 * 2 to the power of `x`, worked out with + * and / alone: its whole part by doubling (or halving), the rest
 * by the series for e^(x ln 2), to as many terms as a number holds. Every computer gets the same answer.
 */
export function exp2(x: number): number {
  const whole = Math.floor(x);
  const y = (x - whole) * LN2;
  let term = 1;
  let sum = 1;
  for (let n = 1; n <= 18; n++) {
    term = (term * y) / n;
    sum += term;
  }
  let times = 1;
  for (let k = 0; k < Math.abs(whole); k++) times *= whole < 0 ? 0.5 : 2;
  return times * sum;
}

/** The power of two MOST_RAGE is (a little over 13): past it the boss is as enraged as it gets. */
const MOST_RAGE_POWER = 13.287712379549449;

/** How many times as hard the boss's blows are, `over` seconds after the raid's time is up (1 before it). */
export function rage(over: number): number {
  if (over < 0) return 1;
  if (over >= RAGE_WIPE) return MOST_RAGE;
  const power = (3 * RAGE_WIPE) / (RAGE_WIPE - over) - 2;
  return power >= MOST_RAGE_POWER ? MOST_RAGE : exp2(power);
}

/** What a blow of a hero's attack takes of the boss, before the boss's defence; and how much harder a critical blow is (before its gear's crit damage). */
export const BLOW = 1100;
export const CRIT = 2;

/** Stages of the raid there are: the higher, the harder the boss's skills are on the heroes (as the boss says). */
export const STAGES = 8;
