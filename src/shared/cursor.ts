import './cursor.css';

/*
 * The reticle in place of the mouse pointer (put in once by ../site/main.ts and by every game's frame,
 * ./frame.ts): a pixel pointing hand exactly where the mouse is, and a glowing dot with four corner
 * brackets turning slowly round it, trailing after the mouse. Over something that can be pressed, the brackets stop turning and spread out to box it in, arrows
 * either side pointing at it, while the hand (and after it the dot) carries on following the mouse inside.
 * In the games, the hand alone: nothing trailing it or boxing things in over the board.
 *
 * What can be pressed is what the page's styles already give a hand pointer (`cursor: pointer`): the
 * outermost element of it under the mouse is the one boxed. Only with a mouse: on a touch screen none of
 * this is put in.
 */

/** The brackets' box, not over anything: its side, and how far along each side its corners reach. */
const IDLE_SIZE = 24;
const IDLE_ARM = 7;
/** How far out from what's boxed the brackets sit, and the longest their corners reach there. */
const LOCK_PAD = 6;
const LOCK_ARM = 12;
/**
 * Parallax while boxed: the box leans after the mouse as it moves over what's boxed, by this share of how
 * far the mouse is from its middle, and never more than this many pixels. Only while the mouse moves: this
 * long (ms) after it stops, the box settles back square on it.
 */
const LEAN = 0.12;
const MAX_LEAN = 8;
const LEAN_HOLD = 120;
/** How quickly the dot and the brackets catch up with the mouse (higher is quicker), not over anything and boxing something. */
const FOLLOW = 10;
const FOLLOW_BOXED = 12;
/** Degrees a second the brackets turn, not over anything. */
const SPIN = 90;
/** Not boxed when it's most of the window (a game's whole board, say): the brackets stay turning over it. */
const MAX_W = 0.8;
const MAX_H = 0.6;

/** Fields typed in: they keep the browser's I-beam, and the reticle hides over them. */
/** What's pressable in its own right: the mouse over something in one of these boxes it, not a bigger thing it's in. */
const CONTROL = 'button, a[href], select, summary, label, input, [role="button"], [role="option"], [role="menuitem"], [role="tab"]';
/** Boxed things the hand stays over, in place of the dot, to see them by: the armory's and databank's items. */
const KEEP_HAND = '.item';
/** The hand (in public/), and where its fingertip is in it: that's where the mouse is. */
const HAND = `${import.meta.env.BASE_URL}shared/cursor.png`;
/** The hand pressing, while a mouse button is held: the same size, drawn at the same place. */
const HAND_PRESSED = `${import.meta.env.BASE_URL}shared/cursor-press.png`;
const HAND_TIP_X = 10;
const HAND_TIP_Y = 2;

const TEXT_FIELD =
  'textarea, [contenteditable]:not([contenteditable="false"]), input:is(:not([type]), [type="text"], [type="number"], [type="search"], [type="email"], [type="password"], [type="url"], [type="tel"])';

/** Where the mouse was as the last page went (sessionStorage), for the next to put the hand there straight away. */
const PLACE = 'koma.cursor';
/** How long after the last page went that's still taken as where the mouse is (ms). */
const PLACE_FOR = 10_000;

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

  const html = document.documentElement;
  const host = document.createElement('div');
  host.className = 'reticle';
  host.setAttribute('aria-hidden', 'true');
  const frame = document.createElement('div');
  frame.className = 'reticle-frame';
  for (const part of ['corner tl', 'corner tr', 'corner bl', 'corner br', 'arrow left', 'arrow right']) {
    const i = document.createElement('i');
    i.className = part.replace(/(\w+) (\w+)/, 'reticle-$1 $2');
    frame.append(i);
  }
  const dot = document.createElement('div');
  dot.className = 'reticle-dot';
  const hand = document.createElement('img');
  hand.className = 'reticle-hand';
  hand.src = HAND;
  // Loaded now, so the first press shows it straight away.
  new Image().src = HAND_PRESSED;
  hand.alt = '';
  hand.style.margin = `${-HAND_TIP_Y}px 0 0 ${-HAND_TIP_X}px`;
  if (reticle) host.append(frame, dot);
  host.append(hand);
  document.body.append(host);
  html.classList.add('reticle-on');

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
  /** What's under the mouse, still to be looked at for what to box: done once a frame, however many elements it crossed. */
  let pending: Element | null | undefined;
  /**
   * What's pressable at each element looked at: working it out makes the browser go over the whole
   * page's styles, so it's done once and kept, until something changes whether it would be (a class
   * or a button turned on or off, a press).
   */
  let known = new WeakMap<Element, Element | null>();
  new MutationObserver(() => {
    known = new WeakMap();
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'disabled'] });

  /** The brackets' box as drawn: its centre, size, turn and corners, eased towards where it's going. */
  let cx = mx;
  /** The dot as drawn, eased after the mouse at the brackets' pace. */
  let dx = mx;
  let dy = my;
  let cy = my;
  let w = IDLE_SIZE;
  let h = IDLE_SIZE;
  let angle = 0;
  let arm = IDLE_ARM;
  let squeeze = 0;
  /** How much the box leans after the mouse: 1 while it moves, easing to 0 once it's still. */
  let leaning = 0;
  /**
   * Whether the hand is hidden (boxing something that isn't an item), and how far the dot has gone over
   * to tracking the mouse in its place: 0 trailing it, 1 right on it.
   */
  let handless = false;
  let tracking = 0;

  /**
   * What's pressable at `target`: the outermost element up from it with a hand pointer, if any (the
   * pointer being inherited, what's in a button has one too), or the first control on the way up if
   * there's one, so a button in a clickable card boxes the button. The page's own pointers are read with the
   * reticle's hiding of them lifted for a moment.
   */
  function pressable(target: Element | null): Element | null {
    if (!target || !target.isConnected) return null;
    let el = known.get(target);
    if (el === undefined) {
      html.classList.remove('reticle-on');
      try {
        el = null;
        if (getComputedStyle(target).cursor === 'pointer') {
          el = target;
          while (!el.matches(CONTROL) && el.parentElement && getComputedStyle(el.parentElement).cursor === 'pointer') el = el.parentElement;
        }
      } finally {
        html.classList.add('reticle-on');
      }
      known.set(target, el);
    }
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    if (rect.width > innerWidth * MAX_W && rect.height > innerHeight * MAX_H) return null;
    return el;
  }

  /**
   * The reticle's state, as data- attributes rather than classes: the holo foil (./items/items.ts)
   * lines its animations up again on every class change on the page, and the reticle's change often.
   */
  const set = (name: string, on: boolean): void => {
    host.toggleAttribute(`data-${name}`, on);
  };

  /** Looks again at what's under the mouse: whether it's a field now, and what to box at the next frame. */
  function look(target: Element | null): void {
    under = target;
    set('over-text', !!target?.closest(TEXT_FIELD));
    if (reticle) pending = target;
  }

  /** Works out what to box from what's under the mouse. */
  function box(target: Element | null): void {
    boxed = pressable(target);
    set('locked', boxed !== null);
    const keepHand = !!boxed?.matches(KEEP_HAND);
    set('keep-hand', keepHand);
    handless = boxed !== null && !keepHand;
  }

  // The mouse only: a pen or a finger leaves the page as it is.
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX;
      my = e.clientY;
      movedAt = performance.now();
      // The hand straight away, not waiting for the next frame: it's the mouse.
      hand.style.transform = `translate(${mx}px, ${my}px)`;
      if (!inside) arrive();
    },
    { capture: true, passive: true },
  );

  /** The mouse coming into the window at mx, my: the dot and brackets start there, not flying in from where it left. */
  function arrive(): void {
    inside = true;
    hand.style.transform = `translate(${mx}px, ${my}px)`;
    cx = dx = mx;
    cy = dy = my;
    set('shown', true);
    look(document.elementFromPoint(mx, my));
    run();
  }

  // Where the mouse is as this page goes, for the next to put the hand there from the start (read back
  // at the end), not gone until the mouse moves.
  addEventListener('pagehide', () => {
    if (!inside) return;
    try {
      sessionStorage.setItem(PLACE, JSON.stringify({ x: mx, y: my, at: Date.now() }));
    } catch {
      // No storage: the next page shows the hand once the mouse moves.
    }
  });
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'mouse' && e.target instanceof Element) look(e.target);
  });
  // Pressing and letting go caught on the way down, before anything on the page can stop them.
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      pressed = true;
      hand.src = HAND_PRESSED;
    },
    { capture: true },
  );
  window.addEventListener(
    'pointerup',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      pressed = false;
      hand.src = HAND;
      // A press often changes what's there (a button turned off, a menu opened): look again once it has.
      setTimeout(() => {
        known = new WeakMap();
        look(document.elementFromPoint(mx, my));
      }, 120);
    },
    { capture: true },
  );
  // Out of the window: the reticle goes.
  document.addEventListener('pointerout', (e) => {
    if (e.pointerType === 'mouse' && !e.relatedTarget) {
      inside = false;
      set('shown', false);
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
    if (!reticle || running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(step);
  };

  let last = performance.now();
  const step = (now: number): void => {
    if (inside) leftAt = now;
    else if (now - leftAt > 600) {
      running = false;
      return;
    }
    if (pending !== undefined) {
      box(pending);
      pending = undefined;
    }
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    /** How far along to where it's going to move this frame, at `rate`: the same feel at any frame rate. */
    const ease = (rate: number): number => 1 - Math.exp(-rate * dt);

    // With the hand hidden, the dot is the mouse: it goes over to being right on it, not trailing, and back after.
    tracking += ((handless ? 1 : 0) - tracking) * ease(15);
    const follow = ease(FOLLOW);
    const pull = follow + (1 - follow) * tracking;
    dx += (mx - dx) * pull;
    dy += (my - dy) * pull;
    dot.style.transform = `translate(${dx}px, ${dy}px)`;
    squeeze += ((pressed ? 1 : 0) - squeeze) * ease(25);
    leaning += ((now - movedAt < LEAN_HOLD ? 1 : 0) - leaning) * ease(8);

    let tx: number;
    let ty: number;
    let tw: number;
    let th: number;
    let tarm: number;
    let tangle: number;
    const rect = boxed?.isConnected ? boxed.getBoundingClientRect() : null;
    if (rect) {
      // Boxing it in: square to it. The nearest half turn, not quarter: a quarter turn would stand the box on
      // its side, a wide button getting a tall box.
      const pad = LOCK_PAD - squeeze * 3;
      const mid = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const lean = (d: number): number => Math.max(-MAX_LEAN, Math.min(MAX_LEAN, d * LEAN)) * leaning;
      tx = mid.x + lean(mx - mid.x);
      ty = mid.y + lean(my - mid.y);
      tw = rect.width + pad * 2;
      th = rect.height + pad * 2;
      tarm = Math.min(LOCK_ARM, tw / 3, th / 3);
      tangle = Math.round(angle / 180) * 180;
    } else {
      const size = IDLE_SIZE * (1 - squeeze * 0.2);
      tx = mx;
      ty = my;
      tw = size;
      th = size;
      tarm = IDLE_ARM;
      if (!still.matches) angle += SPIN * dt;
      tangle = angle;
    }
    const k = ease(rect ? FOLLOW_BOXED : FOLLOW);
    cx += (tx - cx) * k;
    cy += (ty - cy) * k;
    w += (tw - w) * k;
    h += (th - h) * k;
    arm += (tarm - arm) * k;
    angle += (tangle - angle) * ease(14);
    angle %= 360;

    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;
    frame.style.setProperty('--arm', `${arm}px`);
    frame.style.transform = `translate(${cx - w / 2}px, ${cy - h / 2}px) rotate(${angle}deg)`;
    requestAnimationFrame(step);
  };

  // Last, once everything it starts is set up: the hand where the mouse was as the last page went.
  try {
    const place = JSON.parse(sessionStorage.getItem(PLACE) ?? 'null') as { x: number; y: number; at: number } | null;
    sessionStorage.removeItem(PLACE);
    if (place && Date.now() - place.at < PLACE_FOR) {
      mx = place.x;
      my = place.y;
      arrive();
    }
  } catch {
    // No storage, or nothing there.
  }
  toHandOnly = () => set('leaving', true);
  // Come back to (the browser kept this page as it was): the dot and brackets again.
  addEventListener('pageshow', () => set('leaving', false));
}
