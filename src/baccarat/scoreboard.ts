import { beadPlate, bigRoadColumns, DERIVED, derivedRoad, nextColors, parseHand, place, ROWS, tally, type Hand, type RoadColor } from './roads';

/*
 * Baccarat's scoreboard, under the felt: the table's last hands drawn as a casino's roads, laid out
 * the way a casino's screen has them (baccarat.css): the bead plate down the left, and on the right
 * the big road, the big eye boy under it, then the small road and the cockroach pig side by side.
 * Under that, a count of how the hands went and what each derived road would get if Banker or Player
 * won next. roads.ts works out where everything goes; this draws it, as SVG.
 *
 * Every road has 6 rows, and its cells are square: a cell is its box's height over 6 (the CSS sizes
 * the boxes), and a road fills its box's width, scrolling sideways once it has more columns than fit.
 */

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const ui = {
  roads: {
    bead: $('road-bead'),
    big: $('road-big'),
    bigEye: $('road-bigEye'),
    small: $('road-small'),
    cockroach: $('road-cockroach'),
  },
  tally: $('tally'),
  ask: { B: $('ask-banker'), P: $('ask-player') },
};

const SVG = 'http://www.w3.org/2000/svg';
/** A road's cell size, in px, before its box has been laid out. */
const FALLBACK_CELL = 16;
const WIN_COLOR: Record<'P' | 'B' | 'T', string> = { P: 'var(--player)', B: 'var(--banker)', T: 'var(--tie)' };
const ROAD_COLOR: Record<RoadColor, string> = { red: 'var(--banker)', blue: 'var(--player)' };

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value));
  return el;
}

/**
 * An empty road for `box`: ROWS rows of square cells as tall as the box, filling its width, or wider
 * when the road's `columns` need more room. Returns it, and its cell size.
 */
function grid(box: HTMLElement, columns: number): { svg: SVGSVGElement; cell: number } {
  const cell = box.clientHeight > 0 ? box.clientHeight / ROWS : FALLBACK_CELL;
  const width = Math.max(columns * cell, box.clientWidth);
  const height = ROWS * cell;
  const svg = svgEl('svg', { width, height, viewBox: `0 0 ${width} ${height}`, class: 'bc-road-grid' });
  for (let x = 0; x <= width; x += cell) svg.append(svgEl('line', { x1: x, y1: 0, x2: x, y2: height, class: 'bc-grid-line' }));
  for (let y = 0; y <= ROWS; y++) svg.append(svgEl('line', { x1: 0, y1: y * cell, x2: width, y2: y * cell, class: 'bc-grid-line' }));
  return { svg, cell };
}

/** The small dots a pair gets: Banker's red at the top left, Player's blue at the bottom right. */
function pairDots(svg: SVGSVGElement, cx: number, cy: number, r: number, hand: { bankerPair: boolean; playerPair: boolean }): void {
  const dot = r * 0.32;
  if (hand.bankerPair) svg.append(svgEl('circle', { cx: cx - r * 0.72, cy: cy - r * 0.72, r: dot, fill: WIN_COLOR.B, class: 'bc-pair' }));
  if (hand.playerPair) svg.append(svgEl('circle', { cx: cx + r * 0.72, cy: cy + r * 0.72, r: dot, fill: WIN_COLOR.P, class: 'bc-pair' }));
}

/** Puts `svg` in `box`, scrolled to its newest (right) end. */
function mount(box: HTMLElement, svg: SVGSVGElement): void {
  box.replaceChildren(svg);
  box.scrollLeft = box.scrollWidth;
}

function drawBead(hands: readonly Hand[], pop: boolean): void {
  const beads = beadPlate(hands);
  const { svg, cell } = grid(ui.roads.bead, (beads.at(-1)?.x ?? -1) + 1);
  beads.forEach((bead, i) => {
    const cx = (bead.x + 0.5) * cell;
    const cy = (bead.y + 0.5) * cell;
    const r = cell * 0.42;
    svg.append(svgEl('circle', { cx, cy, r, fill: WIN_COLOR[bead.win], class: pop && i === beads.length - 1 ? 'bc-bead bc-newest' : 'bc-bead' }));
    const label = svgEl('text', { x: cx, y: cy, class: 'bc-bead-text', 'font-size': cell * 0.46 });
    label.textContent = bead.win;
    svg.append(label);
    pairDots(svg, cx, cy, r, bead);
  });
  mount(ui.roads.bead, svg);
}

function drawBig(hands: readonly Hand[]): void {
  const entries = place(bigRoadColumns(hands));
  const { svg, cell } = grid(ui.roads.big, Math.max(0, ...entries.map((e) => e.x + 1)));
  for (const entry of entries) {
    const cx = (entry.x + 0.5) * cell;
    const cy = (entry.y + 0.5) * cell;
    const r = cell * 0.36;
    svg.append(svgEl('circle', { cx, cy, r, fill: 'none', stroke: WIN_COLOR[entry.win], 'stroke-width': cell * 0.14 }));
    if (entry.ties > 0) {
      svg.append(svgEl('line', { x1: cx - r, y1: cy + r, x2: cx + r, y2: cy - r, stroke: WIN_COLOR.T, 'stroke-width': cell * 0.13, 'stroke-linecap': 'round' }));
      if (entry.ties > 1) {
        const count = svgEl('text', { x: cx, y: cy, class: 'bc-tie-count', 'font-size': cell * 0.52 });
        count.textContent = String(entry.ties);
        svg.append(count);
      }
    }
    pairDots(svg, cx, cy, r, entry);
  }
  mount(ui.roads.big, svg);
}

/** One derived road's mark: a ring (big eye boy), a dot (small road) or a slash (cockroach pig). `r` is its radius. */
function mark(skip: number, cx: number, cy: number, r: number, color: RoadColor): SVGElement {
  const stroke = ROAD_COLOR[color];
  if (skip === 1) return svgEl('circle', { cx, cy, r, fill: 'none', stroke, 'stroke-width': r * 0.45 });
  if (skip === 2) return svgEl('circle', { cx, cy, r, fill: stroke });
  return svgEl('line', { x1: cx - r, y1: cy + r, x2: cx + r, y2: cy - r, stroke, 'stroke-width': r * 0.55, 'stroke-linecap': 'round' });
}

function drawDerived(hands: readonly Hand[]): void {
  const columns = bigRoadColumns(hands);
  for (const { key, skip } of DERIVED) {
    const marks = derivedRoad(columns, skip);
    const { svg, cell } = grid(ui.roads[key], Math.max(0, ...marks.map((m) => m.x + 1)));
    for (const m of marks) svg.append(mark(skip, (m.x + 0.5) * cell, (m.y + 0.5) * cell, cell * 0.34, m.color));
    mount(ui.roads[key], svg);
  }
}

/** The Banker and Player "next" buttons: what each derived road would get if that side won the next hand. */
function drawAsk(hands: readonly Hand[]): void {
  for (const win of ['B', 'P'] as const) {
    const box = ui.ask[win];
    box.replaceChildren();
    nextColors(hands, win).forEach((color, i) => {
      const svg = svgEl('svg', { width: 14, height: 14, viewBox: '0 0 14 14', class: 'bc-ask-mark' });
      if (color) svg.append(mark(DERIVED[i]!.skip, 7, 7, 4.6, color));
      else svg.append(svgEl('circle', { cx: 7, cy: 7, r: 1.4, class: 'bc-ask-none' }));
      box.append(svg);
    });
  }
}

function drawTally(hands: readonly Hand[]): void {
  const t = tally(hands);
  const item = (label: string, value: number, kind: string, title: string): HTMLElement => {
    const el = document.createElement('span');
    el.className = `bc-tally-item ${kind}`;
    el.title = title;
    const name = document.createElement('span');
    name.textContent = label;
    const count = document.createElement('b');
    count.textContent = String(value);
    el.append(name, count);
    return el;
  };
  ui.tally.replaceChildren(
    item('B', t.banker, 'banker', 'Banker wins'),
    item('P', t.player, 'player', 'Player wins'),
    item('T', t.tie, 'tie', 'Ties'),
    item('BP', t.bankerPair, 'banker', 'Banker pairs'),
    item('PP', t.playerPair, 'player', 'Player pairs'),
    item('#', hands.length, '', 'Hands'),
  );
}

/** The hands drawn last, to draw the roads again at a new size. */
let shown: readonly Hand[] = [];

function drawGrids(hands: readonly Hand[], pop = false): void {
  drawBead(hands, pop);
  drawBig(hands);
  drawDerived(hands);
}

/**
 * Draws the whole scoreboard from the table's last hands (the bot's codes, oldest first). `pop`
 * when the last one was just dealt: its bead pops in.
 */
export function drawRoads(history: readonly string[] = [], pop = false): void {
  shown = history.map(parseHand).filter((hand): hand is Hand => hand !== null);
  drawGrids(shown, pop);
  drawAsk(shown);
  drawTally(shown);
}

// The grids fill their boxes, so they're drawn again when a box changes size (a resize, a phone
// turned). The boxes' sizes don't depend on what's in them (the CSS fixes their height, and
// contain: inline-size their width), so this can't loop.
const sizes = new WeakMap<Element, string>();
let redraw = 0;
const resized = new ResizeObserver((entries) => {
  let changed = false;
  for (const entry of entries) {
    const size = `${Math.round(entry.contentRect.width)}x${Math.round(entry.contentRect.height)}`;
    if (sizes.get(entry.target) !== size) {
      sizes.set(entry.target, size);
      changed = true;
    }
  }
  if (!changed) return;
  cancelAnimationFrame(redraw);
  redraw = requestAnimationFrame(() => drawGrids(shown));
});
for (const box of Object.values(ui.roads)) resized.observe(box);
