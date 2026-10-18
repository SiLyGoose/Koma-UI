/*
 * The fight's own numbers: what is the same whoever fights. (A fighter's health, the kind of damage it
 * deals and how it stands others' are its own: ./heroes/, ./bosses/. How damage is worked out is
 * ./combat/damage.ts.)
 *
 * The fight is worked out the same way wherever it runs (the page, and the bot running a room's fight: ./bot.ts),
 * so nothing here leans on what a computer may round its own way: no Math.pow, exp, sin or cos, only
 * + - * / and Math.sqrt, which every computer works out alike.
 */

/** The fight moves on in steps of this many seconds (thirty a second), whatever the page draws meanwhile. */
export const TICK = 1 / 30;

/** Where a hero stands along the field, and how far it is turned from side-on toward the camera. */
export const HERO_X = -0.5;
export const HERO_TURN = 1.15;

/** How many heroes can be on the field at once (a room's lineup: ../../protocol/technomagic.ts). */
export const MOST = 9;

/**
 * Where a hero stands by how it fights: in the frontline, nearest the boss; in the middle; or in the
 * backline, furthest from it. (Which a hero's is, by its class: ./heroes/kit.ts.)
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
 * The frontline stands round the boss: on an arc this far from where the boss stands (Galgoria's middle:
 * ../bosses/galgoria/model.ts), through where the frontline begins, each this far from the next (wide enough
 * that the arc's ends come round toward the boss as the camera sees it). Its first ring holds this many, a
 * second (behind it, in its gaps) the rest.
 */
const AROUND = 7.5;
const APART = 3 * ROOM;
const RING = 5;
/** The first ring's two ends (the furthest round, nearest the boss as the camera sees them) stand this much further back along the field. */
const ENDS_BACK = ROOM;

/**
 * The frontline's spots round the boss, in the order its heroes take them: the first straight in front of it,
 * then one either side in turn (behind first, then toward the camera), the last two drawn back (ENDS_BACK);
 * once the first ring is full, a second behind it in its gaps, two rooms from each of the first's either side of it.
 */
function aroundBoss(count: number): (readonly [number, number])[] {
  const middle = HERO_X + AROUND;
  // Half the angle between two neighbours on the first ring: its sine and cosine; and those of a whole step and two.
  const sin = APART / 2 / AROUND;
  const cos = Math.sqrt(1 - sin * sin);
  const cos2 = cos * cos - sin * sin;
  const sin2 = 2 * sin * cos;
  // The first ring's spots on the camera's side, out from straight in front of the boss.
  const ring = [
    [middle - AROUND, 0],
    [middle - AROUND * cos2, AROUND * sin2],
    [middle - AROUND * (cos2 * cos2 - sin2 * sin2) - ENDS_BACK, AROUND * 2 * sin2 * cos2],
  ] as const;
  // The second ring's, one in each gap between two of those: two rooms from both, on the side away from the boss.
  const gap = ([ax, ay]: readonly [number, number], [bx, by]: readonly [number, number]) => {
    const dx = bx - ax;
    const dy = by - ay;
    const apart = Math.sqrt(dx * dx + dy * dy);
    const out = Math.sqrt(4 * ROOM * ROOM - (apart * apart) / 4) / apart;
    return [(ax + bx) / 2 - dy * out, (ay + by) / 2 + dx * out] as const;
  };
  const gaps = [gap(ring[0], ring[1]), gap(ring[1], ring[2])] as const;
  const spots: (readonly [number, number])[] = [];
  for (let i = 0; i < count; i++) {
    const first = i < RING;
    const k = first ? i : i - RING;
    const [x, y] = first ? ring[(k + 1) >> 1] ?? ring[2] : gaps[k >> 1] ?? gaps[1];
    const side = k % 2 === (first ? 1 : 0) ? -1 : 1;
    spots.push([x, side * y]);
  }
  return spots;
}

/**
 * Where each hero on the field stands, [along the field, toward the camera], by its line (`lines`, one
 * for each hero, in its order). The frontline round the boss, side by side (aroundBoss). Then the middle,
 * then the backline, each where its line begins or behind the one before it, whichever is further back
 * (but never past the hindmost a full field reaches). Each of those is a room behind the last, in two rows,
 * the back row in the front row's gaps and as far back as keeps it two rooms from the front row too (each
 * three neighbours a triangle with sides of two rooms); one line is a room further again from the next.
 */
export function formation(lines: readonly Line[]): (readonly [number, number])[] {
  const spots: (readonly [number, number])[] = [];
  const front = aroundBoss(lines.filter((line) => line === 'front').length);
  let placed = 0;
  let last = 0;
  lines.forEach((own, i) => {
    if (own !== 'front') return;
    const spot = front[placed] as readonly [number, number];
    spots[i] = spot;
    last = placed === 0 ? spot[0] : Math.min(last, spot[0]);
    placed++;
  });
  for (const line of LINES.slice(1)) {
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

/**
 * A raid's start: the heroes run up to the boss together, two abreast, the frontline (its tanks first) leading, for this
 * many seconds; then each fans out to where it stands. Nothing else happens meanwhile (the raid's time stands still),
 * but skills can be reserved for when it is over. They set off this far behind where the frontline stands, each pair
 * this far behind the pair in front.
 */
export const MARCH = 2;
export const MARCH_FROM = 24;
export const MARCH_ROW = 3;
/** How far apart the two of a pair run. */
export const MARCH_ABREAST = 3;
/** The last of the run (of its time) in which they slow to a stop: before it, they run flat out. */
const BRAKE = 0.3;

/** A raid's run up to the boss, `k` of the way through it (0 to 1): how much of the way (MARCH_FROM) is still to go. */
export function marchLeft(k: number): number {
  const t = 1 - k;
  return t < BRAKE ? (t * t) / (BRAKE * (2 - BRAKE)) : (2 * t - BRAKE) / (2 - BRAKE);
}

/** With Boss auto on: the wait between the boss's attacks. The wait between a hero's attacks, where King's Raid's playtest doesn't say (./heroes/kr.ts). */
export const AUTO_WAIT = 1.1;
export const HERO_WAIT = 0.45;

/**
 * A hero's Auto (./fight.ts autoSkill): an ally below this share of its max HP is hurt (a heal is wanted); a status
 * with less than this many seconds left is as good as gone (a skill that puts it up again is wanted); and over how
 * many seconds the mana a hero gains is counted, to know how soon it will have a skill's.
 */
export const AUTO = { hurt: 0.7, spare: 1, income: 8 };

/**
 * A hero's mana, as King's Raid's playtest has it: the crystals of its mana bar and the mana in each (a skill costs whole
 * crystals), what it recovers a second and gains as each part of its attack lands (each hero's own: ./heroes/kr.ts; these
 * where the playtest doesn't say), and what it gains for its health lost to the boss (so much for the whole of its max
 * HP: a tenth of it lost, a tenth of this). It comes into a raid with none. Its gear can add to what it recovers a second
 * and gains for each part of its attack (a share more: GearBonus's manaRegen and manaAttack).
 */
export const SECTIONS = 6;
export const SECTION = 1000;
export const MAX_MANA = SECTIONS * SECTION;
export const MANA_RATE = 75;
export const MANA_PER_ATTACK = 300;
export const MANA_PER_HP_LOST = 2000;

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

/** What a blow of a hero's attack takes of the boss, before the boss's defense, where King's Raid's playtest doesn't say (./heroes/kr.ts); and how much harder a critical blow is (before its gear's crit damage). */
export const BLOW = 1100;
export const CRIT = 2;
