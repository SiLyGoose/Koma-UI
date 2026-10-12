import './cursor.css';
import { nativeHand } from './native';
import { buildParts } from './parts';
import { takePlace } from './place';
import { pressableFinder } from './pressable';
import { BOXED, FOLLOW, FOLLOW_BOXED, IDLE_ARM, IDLE_SIZE, LEAN, LEAN_HOLD, LOCK_ARM, LOCK_PAD, MAX_LEAN, SPIN, STICK, TEXT_FIELD } from './tuning';

/*
 * The reticle in place of the mouse pointer (put in once by ../../site/main.ts and by every game's frame,
 * ../ui/frame/frame.ts): a pixel pointing hand exactly where the mouse is, and a glowing dot with four corner
 * brackets turning slowly round it, trailing after the mouse. Over something that can be pressed, the brackets stop turning and spread out to box it in, arrows
 * either side pointing at it, and the hand goes, the dot following the mouse inside in its place.
 * The hand is the browser's own pointer with the hand's picture (native.ts), so it's never behind the mouse or
 * held up by the page; only the dot and brackets are drawn here. In the games, the hand alone: nothing
 * trailing it or boxing things in over the board.
 *
 * What can be pressed is what the page's styles already give a hand pointer (`cursor: pointer`): the
 * outermost element of it under the mouse is the one boxed. Only with a mouse: on a touch screen none of
 * this is put in.
 *
 * Its parts: tuning.ts (how it moves, and what it boxes), parts.ts (its elements), pressable.ts (what
 * can be pressed under the mouse), place.ts (the mouse's place carried over from the last page) and
 * native.ts (the hand).
 */

let installed = false;
/** Set once installed: fades the dot and brackets away, leaving the hand (see `handOnly`). */
let toHandOnly: (() => void) | null = null;

/**
 * Leaving for a game, which has the hand alone: the dot and brackets fade as the page wipes away,
 * so the game doesn't take them away all at once as it comes in.
 */
export function handOnly(): void {
  toHandOnly?.();
}

/**
 * Puts the hand in, once per document (a second call does nothing), with a mouse only, and the dot and
 * brackets trailing it unless `reticle` is false (the games).
 */
export function installCursor({ reticle = true }: { reticle?: boolean } = {}): void {
  if (installed) return;
  installed = true;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)');

  // The hand: the browser's own pointer, on the site as in the games.
  nativeHand();
  if (!reticle) return;

  const html = document.documentElement;
  const { host, frame, turn, dot } = buildParts();
  document.body.append(host);
  /**
   * Under the loading screen (arrived under it, ../transition/head.js, or a page swapped under it, or the quick
   * cover): the hand alone, nothing drawn here. A page building and drawing itself keeps the browser too busy
   * to move the dot and brackets smoothly over the loading screen, so they go as it covers the page (`cover`)
   * and only come back once it's off again (`uncover`).
   */
  let waiting = html.hasAttribute('data-tx');
  /** Whether the mouse's place is known (it has moved here, or the last page left it): only looked at while waiting. */
  let placed = false;

  /** Where the mouse is, whether it's in the window, and whether a button is held. */
  let mx = -100;
  let my = -100;
  let inside = false;
  let pressed = false;
  /** When the mouse last moved (performance.now()). */
  let movedAt = 0;
  /** The element under the mouse last looked at, and what's boxed (if anything). */
  let under: Element | null = null;
  let boxed: Element | null = null;
  /** What the hand is gone over (see `handOff`), and whether the dot and brackets are fading away for a game (`handOnly`). */
  let handless: Element | null = null;
  let leaving = false;
  /** What's under the mouse, still to be looked at for what to box: done once a frame, however many elements it crossed. */
  let pending: Element | null | undefined;
  /** What can be pressed under the mouse. */
  const { pressable } = pressableFinder();

  /** The brackets' box as drawn: its centre, size, turn and corners, eased towards where it's going. */
  let cx = mx;
  /** The dot as drawn, eased after the mouse at the brackets' pace. */
  let dx = mx;
  let dy = my;
  /** How far the dot is from trailing the mouse (0) to right on it (1), as it is over what's boxed, in the hand's place. */
  let stuck = 0;
  let cy = my;
  let w = IDLE_SIZE;
  let h = IDLE_SIZE;
  let angle = 0;
  let arm = IDLE_ARM;
  let squeeze = 0;
  /** How much the box leans after the mouse: 1 while it moves, easing to 0 once it's still. */
  let leaning = 0;

  /** One turn of the spin, in ms. */
  const TURN_MS = 360_000 / SPIN;
  /**
   * The brackets' spin, not over anything: an animation the graphics card runs by itself, rather than a
   * turn written here every frame (which had the browser working out the page's layers again every
   * frame, all the while the mouse was in the window). Paused while something's boxed, or with motion
   * turned down, for the brackets to be turned from here (`angle`, written into it only as it changes).
   */
  const spin = turn.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: TURN_MS, iterations: Infinity });
  spin.pause();
  let turned = angle;
  /** Stops the spin where it's got to (if it's going), for the brackets to be turned from there. */
  const stopSpin = (): void => {
    if (spin.playState !== 'running') return;
    angle = ((Number(spin.currentTime ?? 0) % TURN_MS) / TURN_MS) * 360;
    turned = angle;
    spin.pause();
  };
  /**
   * A length, in whole hundredths of a pixel: once the reticle has settled, what's written is the same
   * every frame, so nothing changes for the browser to draw again.
   */
  const px = (n: number): string => `${Math.round(n * 100) / 100}px`;

  /**
   * The reticle's state, as data- attributes rather than classes: the holo foil (../items/items.ts)
   * lines its animations up again on every class change on the page, and the reticle's change often.
   */
  const set = (name: string, on: boolean): void => {
    host.toggleAttribute(`data-${name}`, on);
  };

  /** Looks again at what's under the mouse: whether it's a field now, and what to box at the next frame. */
  function look(target: Element | null): void {
    under = target;
    set('over-text', !!target?.closest(TEXT_FIELD));
    pending = target;
  }

  /**
   * The hand goes over `el` (nothing: it's back everywhere), the dot there in its place. Marked on what's
   * boxed itself (cursor.css), not on the page: only its own styles are worked out again, not the whole
   * page's on every button the mouse crosses, and the hand is back the moment the mouse is off it.
   */
  function handOff(el: Element | null): void {
    if (el === handless) return;
    handless?.removeAttribute(BOXED);
    el?.setAttribute(BOXED, '');
    handless = el;
  }

  /** Works out what to box from what's under the mouse. */
  function box(target: Element | null): void {
    boxed = pressable(target);
    set('locked', boxed !== null);
    // Only while the dot is there to take the hand's place.
    handOff(inside && !leaving ? boxed : null);
  }

  // The mouse only: a pen or a finger leaves the page as it is.
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX;
      my = e.clientY;
      movedAt = performance.now();
      placed = true;
      // Under the loading screen: nothing drawn here yet.
      if (waiting) return;
      if (!inside) arrive();
    },
    { capture: true, passive: true },
  );

  /** The mouse coming into the window at mx, my: the dot and brackets start there, not flying in from where it left. */
  function arrive(): void {
    inside = true;
    cx = dx = mx;
    cy = dy = my;
    set('shown', true);
    look(document.elementFromPoint(mx, my));
    run();
  }

  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'mouse' && e.target instanceof Element) look(e.target);
  });
  // Pressing and letting go caught on the way down, before anything on the page can stop them.
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      pressed = true;
    },
    { capture: true },
  );
  window.addEventListener(
    'pointerup',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      pressed = false;
      // A press often changes what's there (a button turned off, a menu opened): look again once it has.
      setTimeout(() => look(document.elementFromPoint(mx, my)), 120);
    },
    { capture: true },
  );
  // Out of the window, or into a frame (which has its own: this page hears nothing of the mouse there): the reticle goes.
  document.addEventListener('pointerout', (e) => {
    if (e.pointerType === 'mouse' && (!e.relatedTarget || e.relatedTarget instanceof HTMLIFrameElement)) {
      inside = false;
      placed = false;
      set('shown', false);
      handOff(null);
    }
  });
  // What's under a mouse held still can change (a page swapped in, a chip dragged over a spot): a look now and then.
  setInterval(() => {
    if (!inside) return;
    const target = document.elementFromPoint(mx, my);
    if (target !== under || (boxed && !boxed.isConnected)) look(target);
  }, 200);

  /** Whether the frames are running: only while the mouse is in the window, and a moment after (to fade). */
  let running = false;
  let leftAt = 0;
  const run = (): void => {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(step);
  };

  let last = performance.now();
  const step = (now: number): void => {
    if (inside) leftAt = now;
    else if (now - leftAt > 600) {
      running = false;
      // Gone: the spin too, going on from there when the mouse comes back.
      stopSpin();
      return;
    }
    if (pending !== undefined) {
      box(pending);
      pending = undefined;
    }
    // Where what's boxed is, read before anything is written this frame, so the browser needn't work styles out again for it.
    const rect = boxed?.isConnected ? boxed.getBoundingClientRect() : null;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    /** How far along to where it's going to move this frame, at `rate`: the same feel at any frame rate. */
    const ease = (rate: number): number => 1 - Math.exp(-rate * dt);

    const follow = ease(FOLLOW);
    dx += (mx - dx) * follow;
    dy += (my - dy) * follow;
    // Over what's boxed the dot is the pointer: on the mouse itself, not trailing it.
    stuck += ((rect ? 1 : 0) - stuck) * ease(STICK);
    if (Math.abs((rect ? 1 : 0) - stuck) < 0.001) stuck = rect ? 1 : 0;
    dot.style.transform = `translate(${px(dx + (mx - dx) * stuck)}, ${px(dy + (my - dy) * stuck)})`;
    squeeze += ((pressed ? 1 : 0) - squeeze) * ease(25);
    leaning += ((now - movedAt < LEAN_HOLD ? 1 : 0) - leaning) * ease(8);

    let tx: number;
    let ty: number;
    let tw: number;
    let th: number;
    let tarm: number;
    if (rect) {
      // Boxing it in.
      const pad = LOCK_PAD - squeeze * 3;
      const mid = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const lean = (d: number): number => Math.max(-MAX_LEAN, Math.min(MAX_LEAN, d * LEAN)) * leaning;
      tx = mid.x + lean(mx - mid.x);
      ty = mid.y + lean(my - mid.y);
      tw = rect.width + pad * 2;
      th = rect.height + pad * 2;
      tarm = Math.min(LOCK_ARM, tw / 3, th / 3);
    } else {
      const size = IDLE_SIZE * (1 - squeeze * 0.2);
      tx = mx;
      ty = my;
      tw = size;
      th = size;
      tarm = IDLE_ARM;
    }
    const k = ease(rect ? FOLLOW_BOXED : FOLLOW);
    cx += (tx - cx) * k;
    cy += (ty - cy) * k;
    w += (tw - w) * k;
    h += (th - h) * k;
    arm += (tarm - arm) * k;

    if (!rect && !still.matches) {
      // Not over anything: the spin turns them, going on from wherever they were.
      if (spin.playState !== 'running') {
        spin.currentTime = (angle / 360) * TURN_MS;
        spin.play();
      }
    } else {
      // Boxing something, square to it from wherever the spin left them: the nearest half turn, not quarter
      // (a quarter turn would stand the box on its side, a wide button getting a tall box). With motion
      // turned down, they stay as they are.
      stopSpin();
      const tangle = rect ? Math.round(angle / 180) * 180 : angle;
      angle += (tangle - angle) * ease(14);
      if (Math.abs(tangle - angle) < 0.01) angle = tangle % 360;
      if (angle !== turned) {
        spin.currentTime = (angle / 360) * TURN_MS;
        turned = angle;
      }
    }

    frame.style.width = px(w);
    frame.style.height = px(h);
    frame.style.setProperty('--arm', px(arm));
    frame.style.transform = `translate(${px(cx - w / 2)}, ${px(cy - h / 2)})`;
    requestAnimationFrame(step);
  };

  // Last, once everything it starts is set up: the dot and brackets where the mouse was as the last page went.
  const place = takePlace();
  if (place) {
    mx = place.x;
    my = place.y;
    placed = true;
    if (!waiting) arrive();
  }
  /** The loading screen is over the page: the dot and brackets go. */
  const cover = (): void => {
    if (waiting) return;
    waiting = true;
    inside = false;
    set('shown', false);
    handOff(null);
  };
  /** The loading screen is off: the dot and brackets again, where the mouse is (if that's known). */
  const uncover = (): void => {
    if (!waiting) return;
    waiting = false;
    if (placed) arrive();
  };
  // The loading screen covering the page (data-tx="cover") and gone again (no data-tx), whatever it's up for.
  new MutationObserver(() => {
    const tx = html.getAttribute('data-tx');
    if (tx === 'cover') cover();
    else if (tx === null) uncover();
  }).observe(html, { attributes: true, attributeFilter: ['data-tx'] });
  toHandOnly = () => {
    leaving = true;
    set('leaving', true);
    handOff(null);
  };
  // Come back to (the browser kept this page as it was): the dot and brackets again.
  addEventListener('pageshow', () => {
    leaving = false;
    set('leaving', false);
    if (inside) look(document.elementFromPoint(mx, my));
  });
}
