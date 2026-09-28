/*
 * The scoreboard ("roads") a baccarat table in a casino keeps, worked out from the table's last hands
 * (BaccaratRoundView.history, sent by the bot). Only the layout is here; main.ts draws it.
 *
 * - Bead plate: every hand in order, down 6 rows then on to the next column, ties included.
 * - Big road: a column per streak of Banker or Player wins; a tie is marked on the hand before it. A
 *   streak longer than the 6 rows turns right along the bottom (a "dragon tail").
 * - Big eye boy, small road, cockroach pig ("derived roads"): whether the big road is repeating
 *   itself. Each compares the big road with itself 1, 2 or 3 columns back: red when the pattern
 *   holds, blue when it breaks. They're laid out like the big road, a column per streak of a colour.
 */

export type Win = 'P' | 'B' | 'T';
export type RoadColor = 'red' | 'blue';

export interface Hand {
  win: Win;
  /** The winning total (a tie's total). */
  total: number;
  playerPair: boolean;
  bankerPair: boolean;
  natural: boolean;
}

/** Something placed on a road's grid: `x` the column, `y` the row (0 at the top). */
export type Placed<T> = T & { x: number; y: number };

/** A big road entry: a Banker or Player win, with the ties that came right after it. */
export interface BigEntry {
  win: 'P' | 'B';
  ties: number;
  playerPair: boolean;
  bankerPair: boolean;
}

export const ROWS = 6;

/** Reads the bot's code for a hand ("B7pn", see the bot's handCode). Null when it isn't one. */
export function parseHand(code: string): Hand | null {
  const m = /^([PBT])(\d)(p?)(b?)(n?)$/.exec(code);
  if (!m) return null;
  return { win: m[1] as Win, total: Number(m[2]), playerPair: m[3] === 'p', bankerPair: m[4] === 'b', natural: m[5] === 'n' };
}

/** The bead plate: every hand, down then across. */
export function beadPlate(hands: readonly Hand[]): Placed<Hand>[] {
  return hands.map((hand, i) => ({ ...hand, x: Math.floor(i / ROWS), y: i % ROWS }));
}

/** The big road's columns, before they're placed: one per streak. Ties before the first win go on the first win. */
export function bigRoadColumns(hands: readonly Hand[]): BigEntry[][] {
  const columns: BigEntry[][] = [];
  let leadingTies = 0;
  for (const hand of hands) {
    const last = columns.at(-1)?.at(-1);
    if (hand.win === 'T') {
      if (last) last.ties += 1;
      else leadingTies += 1;
      continue;
    }
    const entry: BigEntry = { win: hand.win, ties: leadingTies, playerPair: hand.playerPair, bankerPair: hand.bankerPair };
    leadingTies = 0;
    if (last && last.win === hand.win) columns.at(-1)!.push(entry);
    else columns.push([entry]);
  }
  return columns;
}

/**
 * Places columns on a grid of ROWS rows, like the big road: each column starts at the top of the next
 * free column, goes down, and turns right along the row it's on when it reaches the bottom or a cell
 * already taken (a dragon tail).
 */
export function place<T>(columns: readonly (readonly T[])[]): Placed<T>[] {
  const taken = new Set<string>();
  const placed: Placed<T>[] = [];
  let start = -1;
  for (const column of columns) {
    start += 1;
    while (taken.has(`${start},0`)) start += 1;
    let x = start;
    let y = 0;
    let turned = false;
    column.forEach((item, i) => {
      if (i > 0) {
        if (!turned && y + 1 < ROWS && !taken.has(`${x},${y + 1}`)) y += 1;
        else {
          turned = true;
          x += 1;
        }
      }
      taken.add(`${x},${y}`);
      placed.push({ ...item, x, y });
    });
  }
  return placed;
}

/**
 * A derived road's colours, in order: `skip` is 1 for the big eye boy, 2 for the small road, 3 for
 * the cockroach pig. It starts at the second hand of big road column `skip` (or, if that column has
 * only one, the first of the next). A hand starting a new column is red when the two columns before
 * it (`skip` apart) are as long as each other; any other hand is red when the column `skip` back
 * reaches its row, or falls at least two short of it, and blue when it stops just short.
 */
export function derivedColors(columns: readonly (readonly unknown[])[], skip: number): RoadColor[] {
  const lengths = columns.map((c) => c.length);
  const colors: RoadColor[] = [];
  lengths.forEach((length, c) => {
    for (let r = 0; r < length; r++) {
      if (c < skip || (c === skip && r === 0)) continue;
      if (r === 0) colors.push(lengths[c - 1] === lengths[c - 1 - skip] ? 'red' : 'blue');
      else {
        const back = lengths[c - skip] ?? 0;
        colors.push(back === r ? 'blue' : 'red');
      }
    }
  });
  return colors;
}

/** A derived road laid out: a column per run of the same colour. */
export function derivedRoad(columns: readonly (readonly unknown[])[], skip: number): Placed<{ color: RoadColor }>[] {
  const runs: { color: RoadColor }[][] = [];
  for (const color of derivedColors(columns, skip)) {
    const run = runs.at(-1);
    if (run && run[0]!.color === color) run.push({ color });
    else runs.push([{ color }]);
  }
  return place(runs);
}

export const DERIVED = [
  { key: 'bigEye', name: 'Big eye boy', skip: 1 },
  { key: 'small', name: 'Small road', skip: 2 },
  { key: 'cockroach', name: 'Cockroach pig', skip: 3 },
] as const;

/**
 * What each derived road would get next if Banker (or Player) won the next hand: its colour, or null
 * when that hand wouldn't add to it yet (the "ask Banker" / "ask Player" boxes on a casino's board).
 */
export function nextColors(hands: readonly Hand[], win: 'P' | 'B'): (RoadColor | null)[] {
  const before = bigRoadColumns(hands);
  const after = bigRoadColumns([...hands, { win, total: 0, playerPair: false, bankerPair: false, natural: false }]);
  return DERIVED.map(({ skip }) => {
    const was = derivedColors(before, skip);
    const now = derivedColors(after, skip);
    return now.length > was.length ? (now.at(-1) ?? null) : null;
  });
}

/** How often each thing happened in these hands. */
export function tally(hands: readonly Hand[]): { banker: number; player: number; tie: number; bankerPair: number; playerPair: number; natural: number } {
  const count = (test: (hand: Hand) => boolean): number => hands.filter(test).length;
  return {
    banker: count((h) => h.win === 'B'),
    player: count((h) => h.win === 'P'),
    tie: count((h) => h.win === 'T'),
    bankerPair: count((h) => h.bankerPair),
    playerPair: count((h) => h.playerPair),
    natural: count((h) => h.natural),
  };
}
