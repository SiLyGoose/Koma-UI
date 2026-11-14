import { lowMemory } from '../technomagic/engine/memory';
import { TOWN_LABELS } from './kr-town';
import { makeRunner } from './runner';
import { addTownFx } from './town-fx';
import type { Walker } from './walker';
import { NODES, PLACES, START, WORLD, type Place, type Point } from './places';

/*
 * The town map filling the screen: King's Raid's Orvelia (the playtest's WorldMap.Town2 picture, ./kr-town.ts), each
 * place's disc at its building's door (the game's node buttons) and its name on the game's scroll banner where the game
 * hangs it, and the runner (./runner.ts). The view follows the runner; a drag looks around (it follows again once the
 * runner sets off). Picking a place (its building, banner or disc) sends the runner there along the game's roads, and
 * once it's at the door, `arrive` opens it. Drawn only while it shows (pause/resume).
 *
 * It zooms as King's Raid's town does (WorldMapMode.ZoomWorldMap): the view's height in the map is KR_HEIGHT (its UI's
 * 1080, more on a screen narrower than 16:9) times the zoom, from ZOOM_IN (half: twice as close) out to the whole map
 * filling the screen one way, and the zoom is remembered. A pinch zooms on a touch screen; the mouse wheel, or Ctrl with
 * + or - (Ctrl+0: back as it started), on a computer.
 */

/** About how much of the map's height shows (in its pixels) before any zooming: less on a wide screen, as the map's width has to fill it. */
const VIEW_HEIGHT = 1500;
/** King's Raid's UI, its 1920 by 1080: the view's height at zoom 1 is its height on the screen (WorldMapMode's activeHeight). */
const KR_WIDTH = 1920;
const KR_HEIGHT = 1080;
/** The closest the zoom goes (WorldMapMode: Mathf.Max(0.5f, …)): half the height, everything twice as big. */
const ZOOM_IN = 0.5;
/** A wheel's notch (100 pixels' worth) or Ctrl with + or -: the view this many times smaller or bigger. */
const ZOOM_STEP = 2 ** 0.25;
/** Where the zoom is remembered (King's Raid keeps it per account: WorldMapMode._orthoSize). */
const ZOOM_KEY = 'koma.v2.zoom';
/** How far a press has to move to be a drag rather than a tap (screen pixels). */
const DRAG_PX = 8;
/** How quickly the view catches up with the runner (higher: sooner). */
const FOLLOW = 5;
/** The banners' smallest size on the screen, as a share of their size in the map (a phone's view is the map much shrunk). */
const BANNER_MIN = 0.5;

const TOWN = `${import.meta.env.BASE_URL}kr/town/`;

/**
 * The town picture in MAP_GRID pieces (columns, rows: public/kr/town/map/<col>-<row>.webp, written by kr-town.py), each
 * MAP_OVER of its own pixels into its right and bottom neighbours so no seam shows once scaled. Not one 4096x3084
 * picture: decoded, that's 48 MB in one piece, more than a phone's browser keeps once another page (the heroes' roster)
 * has been open over the town, so every strip of the map it drew as the map was dragged waited on the whole picture
 * decoded again, and showed the town's green behind it in bars meanwhile. Pieces are decoded on their own, only those in view.
 */
const MAP_GRID = [4, 3] as const;
const MAP_OVER = 2;

function mapPieces(): HTMLElement {
  const map = document.createElement('div');
  map.className = 'v2-map';
  // A device short of memory: the half-size pieces (a quarter of the memory), stretched to the map's size.
  const half = lowMemory();
  const over = MAP_OVER * (half ? 2 : 1);
  const [columns, rows] = MAP_GRID;
  for (let column = 0; column < columns; column++)
    for (let row = 0; row < rows; row++) {
      // (As kr-town.py cuts them: from its share of the picture's pixels, OVER more past its right and bottom but at the edge.)
      const cut = (size: number, i: number, n: number): number => Math.floor(((half ? size / 2 : size) * i) / n) * (half ? 2 : 1);
      const left = cut(WORLD.width, column, columns);
      const top = cut(WORLD.height, row, rows);
      const right = column === columns - 1 ? WORLD.width : cut(WORLD.width, column + 1, columns) + over;
      const bottom = row === rows - 1 ? WORLD.height : cut(WORLD.height, row + 1, rows) + over;
      const piece = document.createElement('img');
      piece.alt = '';
      piece.draggable = false;
      piece.decoding = 'async';
      piece.style.cssText = `left:${left}px;top:${top}px;width:${right - left}px;height:${bottom - top}px`;
      piece.src = `${TOWN}${half ? 'map-half' : 'map'}/${column}-${row}.webp`;
      map.append(piece);
    }
  return map;
}

export interface Town {
  element: HTMLElement;
  /** Puts the runner at a place's door (or the square), standing, and the view on it. */
  standAt(place: Place | null): void;
  /** Sends the runner to `place` (as a tap on it does). */
  goTo(place: Place): void;
  /** The hero walking the town (null: none; the one before let go of). */
  setWalker(walker: Walker | null): void;
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
  world.append(mapPieces());
  addTownFx(world);

  const marks = new Map<string, HTMLElement>();
  for (const place of PLACES) {
    // The painted building: tapping it goes there.
    const [left, top, right, bottom] = place.building;
    const area = document.createElement('span');
    area.className = 'v2-building';
    area.dataset.place = place.id;
    area.style.cssText = `left:${left}px;top:${top}px;width:${right - left}px;height:${bottom - top}px`;
    // Its disc at the door, where the runner stops.
    const disc = document.createElement('span');
    disc.className = 'v2-disc';
    disc.dataset.place = place.id;
    disc.style.left = `${place.door.x}px`;
    disc.style.top = `${place.door.y}px`;
    disc.style.backgroundImage = `url("${TOWN}discs/${place.disc}.webp")`;
    // Its name, on the game's banner where the game hangs it (or over the door).
    const label = TOWN_LABELS[place.node] ?? { x: place.door.x, y: place.door.y - 260, banner: 1 };
    const banner = document.createElement('button');
    banner.type = 'button';
    banner.className = `v2-banner v2-banner-${label.banner}`;
    banner.dataset.place = place.id;
    banner.title = place.blurb;
    banner.style.left = `${label.x}px`;
    banner.style.top = `${label.y}px`;
    banner.innerHTML = '<span class="v2-banner-name"></span>';
    (banner.querySelector('.v2-banner-name') as HTMLElement).textContent = place.name;
    banner.setAttribute('aria-label', `${place.name}: ${place.blurb}`);
    world.append(area, disc, banner);
    marks.set(place.id, disc);
  }

  const runner = makeRunner(START);
  world.append(runner.element);
  element.append(world);
  into.append(element);

  let walker: Walker | null = null;
  function setWalker(next: Walker | null): void {
    if (walker === next) return;
    walker?.destroy();
    walker = next;
    if (!walker) return;
    runner.element.append(walker.element);
    walker.scaled(scale);
    walker.draw(performance.now(), 0, runner.heading());
  }

  // The view: the screen's size, the map's scale on it, and the map point at the middle of the screen.
  let width = 1;
  let height = 1;
  let scale = 1;
  // The zoom (the view's height in the map, in King's Raid's UI heights), or null: as it starts, VIEW_HEIGHT.
  let zoom: number | null = null;
  try {
    const kept = Number(localStorage.getItem(ZOOM_KEY));
    if (kept > 0) zoom = kept;
  } catch {
    // No storage: as it starts.
  }
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

  /** The map's height at zoom 1 (King's Raid's UI's on this screen: taller on a screen narrower than 16:9), and the farthest out: the map filling the screen one way. */
  const unit = (): number => Math.max(KR_HEIGHT, (KR_WIDTH * height) / width);
  const zoomOut = (): number => Math.min(WORLD.height / unit(), (WORLD.width * height) / (unit() * width));
  const bounded = (z: number): number => Math.min(zoomOut(), Math.max(ZOOM_IN, z));
  const zoomNow = (): number => bounded(zoom ?? VIEW_HEIGHT / unit());

  /** The map's scale from the zoom (kept in its bounds), and what goes with it. */
  function rescale(): void {
    scale = height / (unit() * zoomNow());
    // Banners no smaller on the screen than BANNER_MIN of their size in the map, however far the map is shrunk.
    world.style.setProperty('--v2-banner', String(Math.max(1, BANNER_MIN / scale)));
    walker?.scaled(scale);
  }

  function keepZoom(): void {
    try {
      if (zoom === null) localStorage.removeItem(ZOOM_KEY);
      else localStorage.setItem(ZOOM_KEY, String(zoom));
    } catch {
      // Not remembered.
    }
  }

  /**
   * Zooms to `next` (in its bounds; null: as it started), the map point at `at` on the screen (from its top left) staying
   * there; while the view follows the runner, the middle of the screen (the view stays on the runner).
   */
  function zoomTo(next: number | null, at: Point = { x: width / 2, y: height / 2 }): void {
    const anchor = follow ? { x: width / 2, y: height / 2 } : at;
    const mapX = camera.x + (anchor.x - width / 2) / scale;
    const mapY = camera.y + (anchor.y - height / 2) / scale;
    zoom = next === null ? null : bounded(next);
    keepZoom();
    rescale();
    camera.x = mapX - (anchor.x - width / 2) / scale;
    camera.y = mapY - (anchor.y - height / 2) / scale;
    place();
  }

  // Measured here only (never while drawing a frame).
  const sized = new ResizeObserver(() => {
    width = Math.max(1, element.clientWidth);
    height = Math.max(1, element.clientHeight);
    rescale();
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
    walker?.draw(now, dt, runner.heading());
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
    for (const [id, disc] of marks) disc.classList.toggle('picked', id === to.id);
    runner.walkTo(to.node, performance.now(), () => {
      marks.get(to.id)?.classList.remove('picked');
      if (target === to) arrive(to);
    });
  }

  function standAt(at: Place | null): void {
    target = null;
    runner.place(at?.node ?? START);
    for (const disc of marks.values()) disc.classList.remove('picked');
    const p = at?.door ?? (NODES[START] as Point);
    camera.x = p.x;
    camera.y = p.y;
    follow = true;
    runner.draw(performance.now());
    place();
  }

  /** Whether the page is turned by hand: a quarter turn round, the screen's moves the page's turned back. */
  const turned = (): boolean => document.documentElement.classList.contains('ls-sideways') && matchMedia('(orientation: portrait)').matches;
  /** A point on the screen, from the town's top left. */
  function local(e: { clientX: number; clientY: number }): Point {
    if (turned()) return { x: e.clientY, y: innerWidth - e.clientX };
    const box = element.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  }

  // Two fingers down: a pinch, zooming (the fingers apart, closer in) and moving the view with them, the map point that
  // was between them staying between them.
  const fingers = new Map<number, Point>();
  let pinch: { distance: number; zoom: number; mapX: number; mapY: number } | null = null;
  const twoFingers = (): [Point, Point] => [...fingers.values()].slice(0, 2) as [Point, Point];
  const midpoint = (): Point => {
    const [a, b] = twoFingers();
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  const spread = (): number => {
    const [a, b] = twoFingers();
    return Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
  };
  function startPinch(): void {
    press = null;
    element.classList.remove('dragging');
    follow = false;
    const mid = midpoint();
    pinch = { distance: spread(), zoom: zoomNow(), mapX: camera.x + (mid.x - width / 2) / scale, mapY: camera.y + (mid.y - height / 2) / scale };
  }
  function movePinch(): void {
    if (!pinch) return;
    zoom = bounded((pinch.zoom * pinch.distance) / spread());
    rescale();
    const mid = midpoint();
    camera.x = pinch.mapX - (mid.x - width / 2) / scale;
    camera.y = pinch.mapY - (mid.y - height / 2) / scale;
    place();
  }
  /** A finger lifted: true when it was in a pinch (now over, its zoom remembered), so not a tap. */
  function lift(e: PointerEvent): boolean {
    fingers.delete(e.pointerId);
    if (!pinch) return false;
    if (fingers.size < 2) {
      pinch = null;
      keepZoom();
    }
    return true;
  }

  // A press: a drag looks around; a tap on a place goes there.
  let press: { id: number; x: number; y: number; cx: number; cy: number; dragging: boolean } | null = null;
  element.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') {
      fingers.set(e.pointerId, local(e));
      if (fingers.size === 2) {
        element.setPointerCapture(e.pointerId);
        return startPinch();
      }
    }
    if (e.button !== 0 || press || pinch) return;
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y, dragging: false };
  });
  element.addEventListener('pointermove', (e) => {
    if (fingers.has(e.pointerId)) fingers.set(e.pointerId, local(e));
    if (pinch) return movePinch();
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
    const [mx, my] = turned() ? [dy, -dx] : [dx, dy];
    camera.x = press.cx - mx / scale;
    camera.y = press.cy - my / scale;
    place();
  });
  const release = (e: PointerEvent): void => {
    if (lift(e)) return;
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
    lift(e);
    if (press && e.pointerId === press.id) press = null;
    element.classList.remove('dragging');
  });

  // The mouse wheel (and a touchpad's pinch, which comes as the wheel with Ctrl): zooms the town at the pointer, never the page.
  element.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const pixels = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? height : 1);
      zoomTo(zoomNow() * ZOOM_STEP ** (pixels / 100), local(e));
    },
    { passive: false },
  );
  // Ctrl with + or - zooms the town rather than the page (Ctrl+0: as it started), while it shows.
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || element.classList.contains('paused')) return;
    if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') zoomTo(zoomNow() / ZOOM_STEP);
    else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') zoomTo(zoomNow() * ZOOM_STEP);
    else if (e.key === '0' || e.code === 'Numpad0') zoomTo(null);
    else return;
    e.preventDefault();
  });
  // The keyboard: a banner is a button.
  element.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const id = (e.target as Element | null)?.closest?.('[data-place]')?.getAttribute('data-place');
    const to = PLACES.find((p) => p.id === id);
    if (!to) return;
    e.preventDefault();
    goTo(to);
  });

  return { element, standAt, goTo, setWalker, pause, resume };
}
