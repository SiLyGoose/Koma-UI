import { townSvg } from './art';
import { makeRunner } from './runner';
import { NODES, PLACES, START, WORLD, type Place, type Point } from './places';

/*
 * The town map filling the screen: its picture (./art.ts), each place's sign over its building and its ring at the door,
 * and the runner (./runner.ts). The view follows the runner; a drag looks around (it follows again once the runner sets
 * off). Picking a place (its building, sign or ring) sends the runner there, and once it's at the door, `arrive` opens it.
 * Drawn only while it shows (pause/resume).
 */

/** About how much of the map's height shows (in its units): less on a wide screen, as the map's width has to fill it. */
const VIEW_HEIGHT = 1080;
/** How far a press has to move to be a drag rather than a tap (screen pixels). */
const DRAG_PX = 8;
/** How quickly the view catches up with the runner (higher: sooner). */
const FOLLOW = 5;

/** How tall each place's building is (map units over its door), for its sign to sit above it. */
const HEIGHTS: Readonly<Record<string, number>> = { forge: 360, casino: 360, databank: 385, shop: 320, heroes: 320, inventory: 310, player: 370 };

export interface Town {
  element: HTMLElement;
  /** Puts the runner at a place's door (or the square), standing, and the view on it. */
  standAt(place: Place | null): void;
  /** Sends the runner to `place` (as a tap on it does). */
  goTo(place: Place): void;
  /** Stops drawing (the town hidden under a page). */
  pause(): void;
  resume(): void;
}

export function makeTown(into: HTMLElement, arrive: (place: Place) => void): Town {
  const element = document.createElement('div');
  element.className = 'v2-town';
  const world = document.createElement('div');
  world.className = 'v2-world';
  world.style.width = `${WORLD.width}px`;
  world.style.height = `${WORLD.height}px`;
  world.innerHTML = townSvg();

  const marks = new Map<string, HTMLElement>();
  for (const place of PLACES) {
    const ring = document.createElement('span');
    ring.className = 'v2-anchor';
    ring.dataset.place = place.id;
    ring.style.left = `${place.door.x}px`;
    ring.style.top = `${place.door.y}px`;
    const sign = document.createElement('button');
    sign.type = 'button';
    sign.className = 'v2-sign';
    sign.dataset.place = place.id;
    sign.style.left = `${place.door.x}px`;
    sign.style.top = `${place.door.y - (HEIGHTS[place.id] ?? 320)}px`;
    sign.innerHTML = `<span class="v2-sign-name"></span><span class="v2-sign-blurb"></span>`;
    (sign.querySelector('.v2-sign-name') as HTMLElement).textContent = place.name;
    (sign.querySelector('.v2-sign-blurb') as HTMLElement).textContent = place.blurb;
    world.append(ring, sign);
    marks.set(place.id, ring);
  }

  const runner = makeRunner(START);
  world.append(runner.element);
  element.append(world);
  into.append(element);

  // The view: the screen's size, the map's scale on it, and the map point at the middle of the screen.
  let width = 1;
  let height = 1;
  let scale = 1;
  const camera: Point = { x: (WORLD.width / 2), y: (WORLD.height / 2) };
  let follow = true;
  let shown = '';

  const clamp = (p: Point): Point => {
    const halfW = width / scale / 2;
    const halfH = height / scale / 2;
    return {
      x: Math.min(WORLD.width - halfW, Math.max(halfW, p.x)),
      y: Math.min(WORLD.height - halfH, Math.max(halfH, p.y)),
    };
  };

  function place(): void {
    const at = clamp(camera);
    camera.x = at.x;
    camera.y = at.y;
    const transform = `translate3d(${(width / 2 - camera.x * scale).toFixed(2)}px, ${(height / 2 - camera.y * scale).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
    if (transform !== shown) {
      world.style.transform = transform;
      shown = transform;
    }
  }

  // Measured here only (never while drawing a frame).
  const sized = new ResizeObserver(() => {
    width = Math.max(1, element.clientWidth);
    height = Math.max(1, element.clientHeight);
    scale = Math.max(height / VIEW_HEIGHT, width / WORLD.width, height / WORLD.height);
    // Signs keep their size on the screen whatever the map's scale.
    world.style.setProperty('--v2-inv', String(1 / scale));
    place();
  });
  sized.observe(element);

  // Drawing: the runner from the clock, the view easing after it.
  let frame = 0;
  let last = 0;
  function tick(now: number): void {
    frame = requestAnimationFrame(tick);
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    runner.draw(now);
    if (follow) {
      const target = clamp(runner.at(now));
      const k = 1 - Math.exp(-FOLLOW * dt);
      camera.x += (target.x - camera.x) * k;
      camera.y += (target.y - camera.y) * k;
    }
    place();
  }
  function resume(): void {
    if (frame) return;
    last = 0;
    element.classList.remove('paused');
    frame = requestAnimationFrame(tick);
  }
  function pause(): void {
    cancelAnimationFrame(frame);
    frame = 0;
    element.classList.add('paused');
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else if (!element.classList.contains('paused')) resume();
  });

  let target: Place | null = null;
  function goTo(to: Place): void {
    target = to;
    follow = true;
    for (const [id, ring] of marks) ring.classList.toggle('picked', id === to.id);
    runner.walkTo(to.id, performance.now(), () => {
      marks.get(to.id)?.classList.remove('picked');
      if (target === to) arrive(to);
    });
  }

  function standAt(at: Place | null): void {
    target = null;
    runner.place(at?.id ?? START);
    for (const ring of marks.values()) ring.classList.remove('picked');
    const p = at?.door ?? (NODES[START] as Point);
    camera.x = p.x;
    camera.y = p.y;
    follow = true;
    runner.draw(performance.now());
    place();
  }

  // A press: a drag looks around; a tap on a place goes there.
  let press: { id: number; x: number; y: number; cx: number; cy: number; dragging: boolean } | null = null;
  element.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || press) return;
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y, dragging: false };
  });
  element.addEventListener('pointermove', (e) => {
    if (!press || e.pointerId !== press.id) return;
    const dx = e.clientX - press.x;
    const dy = e.clientY - press.y;
    if (!press.dragging && Math.hypot(dx, dy) < DRAG_PX) return;
    if (!press.dragging) {
      press.dragging = true;
      element.setPointerCapture(e.pointerId);
      element.classList.add('dragging');
    }
    follow = false;
    // (Turned by hand, the page is a quarter turn round: the screen's moves are the page's turned back.)
    const turned = document.documentElement.classList.contains('ls-sideways') && matchMedia('(orientation: portrait)').matches;
    const [mx, my] = turned ? [dy, -dx] : [dx, dy];
    camera.x = press.cx - mx / scale;
    camera.y = press.cy - my / scale;
    place();
  });
  const release = (e: PointerEvent): void => {
    if (!press || e.pointerId !== press.id) return;
    const dragged = press.dragging;
    press = null;
    element.classList.remove('dragging');
    if (dragged) return;
    const id = (e.target as Element | null)?.closest?.('[data-place]')?.getAttribute('data-place');
    const to = PLACES.find((p) => p.id === id);
    if (to) goTo(to);
  };
  element.addEventListener('pointerup', release);
  element.addEventListener('pointercancel', (e) => {
    if (press && e.pointerId === press.id) press = null;
    element.classList.remove('dragging');
  });
  // The keyboard: a sign is a button.
  element.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const id = (e.target as Element | null)?.closest?.('[data-place]')?.getAttribute('data-place');
    const to = PLACES.find((p) => p.id === id);
    if (!to) return;
    e.preventDefault();
    goTo(to);
  });

  return { element, standAt, goTo, pause, resume };
}
