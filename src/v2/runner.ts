import { NODES, lengthOf, pointAlong, route, type Point } from './places';

/*
 * The runner: where the member's hero is on the town map (./walker.ts draws it in this element). A walk is kept as what it is (the way, when it
 * started, how fast), and where the runner is comes from the clock each frame, so a tab left and come back to finds it
 * where it should be, not where it was.
 */

/** How fast it runs, in map pixels a second (King's Raid's town: ScaleData.PlayerMoveSpeed). */
const SPEED = 750;

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
  /** Which way it last headed on the map (a unit step), and whether it's on its way: as last drawn. */
  heading(): { dx: number; dy: number; moving: boolean };
}

export function makeRunner(start: string): Runner {
  const element = document.createElement('div');
  element.className = 'v2-runner';

  let way: Point[] = [NODES[start] as Point];
  /** The way's nodes (null for the first point, when it set off from between two). */
  let nodes: (string | null)[] = [start];
  let length = 0;
  let since = 0;
  /** Which way it heads (at first: towards the screen, as King's Raid's heroes face the camera). */
  const headed = { dx: 0, dy: 1, moving: false };
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
    headed.dx = 0;
    headed.dy = 1;
    way = [NODES[node] as Point];
    nodes = [node];
    length = 0;
    since = 0;
    done = null;
  }

  let shownX = NaN;
  let shownY = NaN;
  function draw(now: number): void {
    const { at: p, dx, dy } = pointAlong(way, along(now));
    const moving = running(now);
    const step = Math.hypot(dx, dy);
    if (moving && step > 1) {
      headed.dx = dx / step;
      headed.dy = dy / step;
    }
    headed.moving = moving;
    // Only what changed is written (a frame's writes are what the browser has to redo).
    if (p.x !== shownX || p.y !== shownY) {
      element.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      element.style.zIndex = String(Math.round(p.y));
      shownX = p.x;
      shownY = p.y;
    }
    if (!moving && done) {
      const then = done;
      done = null;
      then();
    }
  }

  return { element, at, running, walkTo, place, draw, heading: () => headed };
}
