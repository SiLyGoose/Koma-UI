import './backdrop.css';

/*
 * The site's backdrop: an astrologer's star chart in gold on the night behind every page (put in once
 * by ../site/main.ts, so it stays as the pages change under it). An astrolabe
 * ring spelling KOMAVERSE round the main centre, great arcs sweeping in from off the edge, lines crossing the
 * page, chains of dots, three notes of the name, and moons in their phases travelling
 * slowly along the arcs. Laid out on a 1600×900 board scaled to cover the window
 * (cropped at the sides on a narrow screen, so what matters sits near the middle); the moons and the
 * stars fall differently every time the page is shown.
 */

const NS = 'http://www.w3.org/2000/svg';
const W = 1600;
const H = 900;

/** A circle on the board: rings and arcs are drawn round these, moons travel along them. */
interface Orbit {
  cx: number;
  cy: number;
  r: number;
}

const rand = (min: number, max: number): number => min + Math.random() * (max - min);
const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)] as T;

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  parent?.append(node);
  return node;
}

/** The point at `deg` degrees round `o` (0 is to the right, going clockwise). */
function at(o: Orbit, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [o.cx + o.r * Math.cos(a), o.cy + o.r * Math.sin(a)];
}

/** Whether a point is on the board (with some room past the edges). */
const onBoard = ([x, y]: [number, number], pad = 0): boolean => x > -pad && x < W + pad && y > -pad && y < H + pad;

/** What the chart's notes say. */
const NAME = 'KOMAVERSE';

/** The name in letters `size` tall, its top left at x, y: a note on the chart, with a rule under it. */
function note(parent: Element, x: number, y: number, size: number): void {
  const w = NAME.length * size * 1.1;
  // Stretched to its width by its spacing, so the rule under it fits it whatever the font.
  const text = el('text', { x, y: y + size, 'font-size': size.toFixed(1), textLength: w.toFixed(1), lengthAdjust: 'spacing', class: 'backdrop-text' }, parent);
  text.textContent = NAME;
  el('line', { x1: x, y1: y + size + 6, x2: x + w * rand(0.25, 0.45), y2: y + size + 6 }, parent);
}

/** A moon's lit part, radius `r` round x, y: `phase` from 0 (new) through 0.5 (half) to 1 (full). */
function moonLight(x: number, y: number, r: number, phase: number): string {
  if (phase >= 1) return `M${x},${y - r}A${r},${r} 0 1 1 ${x},${y + r}A${r},${r} 0 1 1 ${x},${y - r}Z`;
  // The lit edge is half the rim; the line between light and dark an ellipse, bowing in or out.
  const rx = Math.abs(1 - 2 * phase) * r;
  const sweep = phase > 0.5 ? 1 : 0;
  return `M${x},${y - r}A${r},${r} 0 0 1 ${x},${y + r}A${rx.toFixed(2)},${r} 0 0 ${sweep} ${x},${y - r}Z`;
}

/** The backdrop, to put first in the page: fixed behind everything, not to be clicked or read. */
export function backdrop(): HTMLElement {
  const host = document.createElement('div');
  host.className = 'backdrop';
  host.setAttribute('aria-hidden', 'true');

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid slice' });
  host.append(svg);

  const defs = el('defs', {}, svg);
  const glow = el('radialGradient', { id: 'backdrop-moon-glow' }, defs);
  el('stop', { offset: '0%', 'stop-color': 'var(--gold)', 'stop-opacity': 0.45 }, glow);
  el('stop', { offset: '100%', 'stop-color': 'var(--gold)', 'stop-opacity': 0 }, glow);

  const stars = el('g', { class: 'backdrop-stars' }, svg);
  const faint = el('g', { class: 'backdrop-faint' }, svg);
  const lines = el('g', { class: 'backdrop-lines' }, svg);
  const moons = el('g', { class: 'backdrop-moons' }, svg);

  // Stars: specks all over, a few of them twinkling.
  for (let i = 0; i < 110; i++) {
    const star = el('circle', { cx: rand(0, W), cy: rand(0, H), r: rand(0.4, 1.4).toFixed(2), opacity: rand(0.15, 0.7).toFixed(2) }, stars);
    if (Math.random() < 0.25) {
      star.classList.add('twinkle');
      star.style.animationDelay = `${rand(-12, 0).toFixed(2)}s`;
      star.style.animationDuration = `${rand(6, 14).toFixed(2)}s`;
    }
  }

  // The main system, a little right of the middle, and a smaller one to its left.
  const main: Orbit = { cx: rand(900, 960), cy: rand(300, 340), r: 0 };
  const side: Orbit = { cx: rand(360, 420), cy: rand(400, 450), r: 0 };

  // Lines across the page through the main system: level, upright, and a few slanting.
  el('line', { x1: 0, y1: main.cy, x2: W, y2: main.cy }, faint);
  el('line', { x1: main.cx, y1: 0, x2: main.cx, y2: H }, faint);
  for (const deg of [pick([28, 34, 40]), pick([-22, -30, -38]), pick([62, 70])]) {
    const a = (deg * Math.PI) / 180;
    const dx = Math.cos(a) * 2000;
    const dy = Math.sin(a) * 2000;
    el('line', { x1: main.cx - dx, y1: main.cy - dy, x2: main.cx + dx, y2: main.cy + dy }, faint);
  }

  // Rings round the main system: solid, a dotted one, and a wide faint one.
  el('circle', { cx: main.cx, cy: main.cy, r: 92 }, lines);
  el('circle', { cx: main.cx, cy: main.cy, r: 108 }, faint);
  el('circle', { cx: main.cx, cy: main.cy, r: 175, 'stroke-dasharray': '2 9' }, lines);
  el('circle', { cx: main.cx, cy: main.cy, r: 290 }, faint);

  // The astrolabe ring, turning slowly: nine houses, a letter of the name in each, and degrees marked inside.
  const band = el('g', { class: 'backdrop-turn' }, lines);
  band.style.transformOrigin = `${main.cx}px ${main.cy}px`;
  const inner = 196;
  const outer = 228;
  el('circle', { cx: main.cx, cy: main.cy, r: inner }, band);
  el('circle', { cx: main.cx, cy: main.cy, r: outer }, band);
  let ticks = '';
  for (let deg = 0; deg < 360; deg += 5) {
    const [x1, y1] = at({ ...main, r: inner }, deg);
    const [x2, y2] = at({ ...main, r: inner + (deg % 40 === 0 ? outer - inner : deg % 20 === 0 ? 8 : 4) }, deg);
    ticks += `M${x1.toFixed(1)},${y1.toFixed(1)}L${x2.toFixed(1)},${y2.toFixed(1)}`;
  }
  el('path', { d: ticks }, band);
  // The houses spell the name round the ring, clockwise.
  for (let house = 0; house < NAME.length; house++) {
    const deg = house * 40 + 20;
    const [x, y] = at({ ...main, r: (inner + outer) / 2 }, deg);
    // Upright to the ring, its foot towards the centre.
    const letter = el('text', { x: x.toFixed(1), y: y.toFixed(1), 'font-size': 14, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'backdrop-text' }, band);
    letter.textContent = NAME[house] as string;
    letter.setAttribute('transform', `rotate(${deg + 90} ${x.toFixed(1)} ${y.toFixed(1)})`);
  }

  // Rings round the side system, with a compass star in them.
  el('circle', { cx: side.cx, cy: side.cy, r: 70 }, lines);
  el('circle', { cx: side.cx, cy: side.cy, r: 120 }, faint);
  for (let i = 0; i < 8; i++) {
    const long = i % 2 === 0;
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const tip = long ? 62 : 34;
    const side1 = a + (long ? 0.12 : 0.2);
    const side2 = a - (long ? 0.12 : 0.2);
    const p = (ang: number, r: number): string => `${(side.cx + Math.cos(ang) * r).toFixed(1)},${(side.cy + Math.sin(ang) * r).toFixed(1)}`;
    el('path', { d: `M${p(a, tip)} L${p(side1, 12)} L${side.cx},${side.cy} L${p(side2, 12)} Z` }, faint);
  }

  // The great arcs: circles far bigger than the page, their centres off it, so only a sweep shows.
  const arcs: Orbit[] = [
    { cx: rand(620, 760), cy: rand(-420, -300), r: rand(1020, 1100) },
    { cx: rand(1850, 1950), cy: rand(1050, 1150), r: rand(640, 720) },
    { cx: rand(-240, -160), cy: rand(680, 760), r: rand(400, 450) },
    { cx: rand(1640, 1700), cy: rand(200, 260), r: rand(360, 400) },
    { cx: main.cx - rand(80, 140), cy: main.cy - rand(40, 80), r: rand(560, 620) },
  ];
  for (const o of arcs) el('circle', { cx: o.cx, cy: o.cy, r: o.r }, lines);

  // Chains of dots, out from the main system along one of its slanting lines, and along an arc.
  const chain = (from: [number, number], to: [number, number], n: number): void => {
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      el('circle', { cx: from[0] + (to[0] - from[0]) * t, cy: from[1] + (to[1] - from[1]) * t, r: i % 4 === 0 ? 3 : 1.6, class: 'backdrop-dot' }, lines);
    }
  };
  const chainDeg = rand(135, 160);
  chain([main.cx, main.cy], at({ ...main, r: 520 }, chainDeg), 18);
  chain(at({ ...main, r: 110 }, rand(10, 30)), at({ ...main, r: 420 }, rand(10, 30)), 9);

  // Little hollow rings where lines meet or rest on the rings.
  const nodes: [number, number][] = [
    at({ ...main, r: 175 }, 180),
    at({ ...main, r: 175 }, 0),
    at({ ...main, r: 290 }, rand(100, 130)),
    at({ ...main, r: 290 }, rand(200, 240)),
    at({ ...side, r: 120 }, rand(20, 60)),
    [main.cx, main.cy],
  ];
  for (const [x, y] of nodes) {
    el('circle', { cx: x, cy: y, r: 9 }, lines);
    el('circle', { cx: x, cy: y, r: 3, class: 'backdrop-dot' }, lines);
  }

  // Notes: three, by the rings (right of the astrolabe, under the compass, and below between them).
  note(lines, main.cx + 300, main.cy + rand(20, 60), 10);
  note(lines, side.cx - 60, side.cy + 140, 10);
  note(lines, main.cx - rand(300, 360), main.cy + rand(260, 300), 13);

  // The moons: on the arcs and rings, in their phases, each going round its circle at its own slow pace.
  const orbits: Orbit[] = [...arcs, { ...main, r: 290 }, { ...side, r: 120 }, { ...main, r: 175 }];
  // Where they start, kept apart so no two sit on top of each other.
  const spots: [number, number][] = [];
  for (let tries = 0; spots.length < 9 && tries < 400; tries++) {
    const o = orbits[spots.length % orbits.length] as Orbit;
    const [x, y] = at(o, rand(0, 360));
    if (!onBoard([x, y], -40) || spots.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < 140)) continue;
    spots.push([x, y]);
    const size = rand(6, 11);
    const orbit = el('g', { class: 'backdrop-orbit' }, moons);
    orbit.style.transformOrigin = `${o.cx}px ${o.cy}px`;
    // Big circles turn slower, so everything drifts at about the same speed; either way round.
    orbit.style.animationDuration = `${(o.r * rand(1.8, 3.2)).toFixed(0)}s`;
    orbit.style.animationDirection = Math.random() < 0.5 ? 'normal' : 'reverse';
    el('circle', { cx: x, cy: y, r: size * 3, fill: 'url(#backdrop-moon-glow)', class: 'backdrop-glow' }, orbit);
    el('circle', { cx: x, cy: y, r: size, class: 'backdrop-moon-rim' }, orbit);
    el('circle', { cx: x, cy: y, r: size * 0.7, class: 'backdrop-moon-dark' }, orbit);
    // Its lit part, from a thin crescent to full, facing a random way.
    const phase = pick([0.15, 0.3, 0.5, 0.5, 0.7, 0.85, 1]);
    const lit = el('path', { d: moonLight(x, y, size * 0.7, phase), class: 'backdrop-moon-lit' }, orbit);
    lit.setAttribute('transform', `rotate(${rand(0, 360).toFixed(0)} ${x} ${y})`);
  }

  return host;
}
