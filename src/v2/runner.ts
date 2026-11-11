import { NODES, lengthOf, pointAlong, route, type Point } from './places';

/*
 * The runner: the member's little miner on the town map, and where it is. A walk is kept as what it is (the way, when it
 * started, how fast), and where the runner is comes from the clock each frame, so a tab left and come back to finds it
 * where it should be, not where it was.
 */

/** How fast it runs, in map pixels a second (King's Raid's town: ScaleData.PlayerMoveSpeed). */
const SPEED = 750;

/** The runner's picture (its feet at the bottom middle): a little miner with a lamp on its helmet and a red scarf. */
const FIGURE = `<svg class="v2-runner-art" viewBox="-40 -120 80 124" width="80" height="124" aria-hidden="true">
  <ellipse class="v2-runner-shadow" cx="0" cy="0" rx="26" ry="7" fill="#000" opacity=".28"/>
  <g class="v2-runner-body">
    <g class="v2-leg v2-leg-back"><rect x="-4" y="-38" width="11" height="30" rx="5" fill="#3b3f52"/><rect x="-6" y="-12" width="16" height="10" rx="4" fill="#5a3d22"/></g>
    <g class="v2-arm v2-arm-back"><rect x="-3" y="-72" width="10" height="28" rx="5" fill="#2f6b8f"/></g>
    <path d="M-17 -40 L-14 -76 Q0 -84 14 -76 L17 -40 Z" fill="#3c7fb0"/>
    <rect x="-17" y="-46" width="34" height="7" rx="3" fill="#5a3d22"/>
    <rect x="-4" y="-46" width="8" height="7" fill="#d8bf7a"/>
    <path d="M-15 -78 Q0 -70 15 -78 L13 -70 Q0 -64 -13 -70 Z" fill="#b94a4c"/>
    <path d="M10 -74 L22 -60 L16 -58 L8 -70 Z" fill="#b94a4c" class="v2-scarf"/>
    <circle cx="0" cy="-92" r="17" fill="#f2c9a0"/>
    <circle cx="6" cy="-92" r="2.6" fill="#2a2320"/>
    <path d="M2 -84 Q7 -82 10 -85" stroke="#9a5a40" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="11" cy="-87" r="3.5" fill="#f0a08a" opacity=".6"/>
    <path d="M-19 -96 Q-18 -116 0 -116 Q18 -116 19 -96 Z" fill="#e3b23c"/>
    <rect x="-21" y="-98" width="42" height="6" rx="3" fill="#c9952a"/>
    <circle cx="12" cy="-106" r="6" fill="#fff4c2" stroke="#8a6a20" stroke-width="2"/>
    <g class="v2-leg v2-leg-front"><rect x="-7" y="-38" width="11" height="30" rx="5" fill="#464b62"/><rect x="-9" y="-12" width="16" height="10" rx="4" fill="#6b4828"/></g>
    <g class="v2-arm v2-arm-front"><rect x="-6" y="-72" width="10" height="28" rx="5" fill="#3c7fb0"/><circle cx="-1" cy="-44" r="5" fill="#f2c9a0"/></g>
  </g>
</svg>`;

export interface Runner {
  element: HTMLElement;
  /** Where it is now, from the clock. */
  at(now: number): Point;
  /** Whether it's still on its way. */
  running(now: number): boolean;
  /** Sets off for node `to` along the roads (from where it is now, even mid-walk); `arrived` once it's there. */
  walkTo(to: string, now: number, arrived: () => void): void;
  /** Puts it at node `node`, standing. */
  place(node: string): void;
  /** Draws it where it is at `now`. */
  draw(now: number): void;
}

export function makeRunner(start: string): Runner {
  const element = document.createElement('div');
  element.className = 'v2-runner';
  element.innerHTML = FIGURE;

  let way: Point[] = [NODES[start] as Point];
  /** The way's nodes (null for the first point, when it set off from between two). */
  let nodes: (string | null)[] = [start];
  let length = 0;
  let since = 0;
  let facing = 1;
  let done: (() => void) | null = null;

  const along = (now: number): number => Math.min(length, ((now - since) / 1000) * SPEED);
  const running = (now: number): boolean => along(now) < length;

  function at(now: number): Point {
    return pointAlong(way, along(now)).at;
  }

  /** Which of the way's nodes it's on or just past at `now`, and how far along the way that node is. */
  function lastNode(now: number): { index: number; at: number } {
    const gone = along(now);
    let sum = 0;
    let index = 0;
    for (let i = 1; i < way.length; i++) {
      const next = sum + Math.hypot((way[i] as Point).x - (way[i - 1] as Point).x, (way[i] as Point).y - (way[i - 1] as Point).y);
      if (next > gone) break;
      sum = next;
      index = i;
    }
    return { index, at: sum };
  }

  function walkTo(to: string, now: number, arrived: () => void): void {
    const here = at(now);
    const last = lastNode(now);
    const from = nodes[last.index];
    const ahead = nodes[last.index + 1];
    let points: Point[];
    let names: (string | null)[];
    if (!running(now) && from) {
      // Standing at a node: the roads from it.
      const roads = route(from, to);
      names = roads;
      points = roads.map((name) => NODES[name] as Point);
    } else {
      // Between two nodes: on to whichever end makes the way shorter, from where it is.
      const options = [from, ahead].filter((name): name is string => typeof name === 'string').map((name) => {
        const rest = route(name, to);
        const pts = [here, ...rest.map((n) => NODES[n] as Point)];
        return { names: [null, ...rest], points: pts, length: lengthOf(pts) };
      });
      options.sort((a, b) => a.length - b.length);
      const best = options[0];
      if (!best) return;
      names = best.names;
      points = best.points;
    }
    way = points;
    nodes = names;
    length = lengthOf(way);
    since = now;
    done = arrived;
    if (length === 0) {
      done = null;
      arrived();
    }
  }

  function place(node: string): void {
    way = [NODES[node] as Point];
    nodes = [node];
    length = 0;
    since = 0;
    done = null;
  }

  let shownX = NaN;
  let shownY = NaN;
  let shownFacing = 0;
  let shownRunning: boolean | null = null;
  function draw(now: number): void {
    const { at: p, dx } = pointAlong(way, along(now));
    const moving = running(now);
    if (moving && Math.abs(dx) > 1) facing = dx < 0 ? -1 : 1;
    // Only what changed is written (a frame's writes are what the browser has to redo).
    if (p.x !== shownX || p.y !== shownY) {
      element.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      element.style.zIndex = String(Math.round(p.y));
      shownX = p.x;
      shownY = p.y;
    }
    if (facing !== shownFacing) {
      element.classList.toggle('left', facing < 0);
      shownFacing = facing;
    }
    if (moving !== shownRunning) {
      element.classList.toggle('running', moving);
      shownRunning = moving;
    }
    if (!moving && done) {
      const then = done;
      done = null;
      then();
    }
  }

  return { element, at, running, walkTo, place, draw };
}
