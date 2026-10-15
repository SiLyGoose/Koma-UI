import { el } from './dom';

/*
 * Popups over the field, growing up from what they are about (scrolled within, once they would be too tall):
 * - an ability's, held down on: it stays until something outside it is pressed, and there is one at a time;
 * - a square's (../hud/buff.ts), pointed at with a mouse: while it is pointed at.
 */

/** How long an ability is held down for its popup (ms), and how far the press can wander meanwhile (px). */
const HOLD = 1000;
const SLOP = 10;
/** The room kept between a popup and what it is about, and the window's edges (px); and the most of the window's height it takes. */
const GAP = 8;
const EDGE = 8;
const TALLEST = 0.5;

interface Tip {
  root: HTMLElement;
  show(anchor: Element, content: readonly Node[]): void;
  hide(): void;
  readonly shown: boolean;
}

function makeTip(className: string): Tip {
  const root = el('div', `tm-tip ${className}`);
  root.setAttribute('role', 'tooltip');
  root.hidden = true;
  const body = el('div', 'tm-tip-body');
  const arrow = el('i', 'tm-tip-arrow');
  root.append(body, arrow);
  return {
    root,
    show(anchor, content) {
      if (!root.isConnected) document.body.append(root);
      body.replaceChildren(...content);
      root.hidden = false;
      body.scrollTop = 0;
      // Over the middle of what it is about, kept inside the window; as tall as there is room for over it, at most.
      const at = anchor.getBoundingClientRect();
      body.style.maxHeight = `${Math.max(64, Math.min(at.top - GAP - EDGE, innerHeight * TALLEST))}px`;
      const middle = at.left + at.width / 2;
      const left = Math.min(Math.max(EDGE, middle - root.offsetWidth / 2), innerWidth - EDGE - root.offsetWidth);
      root.style.left = `${left}px`;
      root.style.bottom = `${innerHeight - at.top + GAP}px`;
      arrow.style.left = `${middle - left}px`;
    },
    hide() {
      root.hidden = true;
    },
    get shown() {
      return !root.hidden;
    },
  };
}

/** The ability's popup (made once it is first wanted), and whether the click that ends a press is not to go through. */
let held: Tip | null = null;
let swallow = false;

function heldTip(): Tip {
  if (held) return held;
  const tip = makeTip('tm-tip-held');
  held = tip;
  // Anything pressed outside it puts it away (and is only that: the click doesn't go through).
  document.addEventListener(
    'pointerdown',
    (event) => {
      swallow = tip.shown && !tip.root.contains(event.target as Node);
      if (swallow) tip.hide();
    },
    true,
  );
  document.addEventListener(
    'click',
    (event) => {
      if (!swallow) return;
      swallow = false;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') tip.hide();
  });
  // What it is about has moved: put away.
  addEventListener('resize', () => tip.hide());
  document.addEventListener(
    'scroll',
    (event) => {
      if (!tip.root.contains(event.target as Node)) tip.hide();
    },
    { capture: true, passive: true },
  );
  return tip;
}

/** `target` held down on shows `content` (when it has any) over it, the ability's popup; the press it was is then not a click. */
export function holdTip(target: HTMLElement, content: () => readonly Node[] | null): void {
  let timer = 0;
  let x = 0;
  let y = 0;
  const cancel = (): void => {
    clearTimeout(timer);
    timer = 0;
  };
  target.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    cancel();
    x = event.clientX;
    y = event.clientY;
    timer = window.setTimeout(() => {
      timer = 0;
      const shown = content();
      if (!shown) return;
      heldTip().show(target, shown);
      swallow = true;
    }, HOLD);
  });
  target.addEventListener('pointermove', (event) => {
    if (timer && Math.hypot(event.clientX - x, event.clientY - y) > SLOP) cancel();
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) target.addEventListener(type, cancel);
  // Held on a phone: not its menu.
  target.addEventListener('contextmenu', (event) => event.preventDefault());
}

/** The pointed-at popups, one of each kind (made once it is first wanted). */
const pointed = new Map<string, Tip>();

/**
 * The squares in `within` (those `selector` finds) show what `content` says of each over it while a mouse points at
 * it. Drawn again (as squares are, when what they say changes), call what this gives back: the popup goes over the
 * square now under the mouse, or away.
 */
export function pointTips(within: HTMLElement, selector: string, content: (square: Element) => readonly Node[] | null, kind = 'tm-tip-pointed'): () => void {
  let on: Element | null = null;
  let x = 0;
  let y = 0;
  const point = (square: Element | null): void => {
    on = square;
    const shown = square && content(square);
    let tip = pointed.get(kind);
    if (!tip) pointed.set(kind, (tip = makeTip(kind)));
    if (shown) tip.show(square, shown);
    else {
      on = null;
      tip.hide();
    }
  };
  within.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    x = event.clientX;
    y = event.clientY;
    const square = (event.target as Element).closest(selector);
    if (square !== on) point(square && within.contains(square) ? square : null);
  });
  within.addEventListener('pointerleave', () => {
    if (on) point(null);
  });
  return () => {
    // Still there and shown: it stays.
    if (!on || (on.isConnected && on.getClientRects().length > 0)) return;
    const square = document.elementFromPoint(x, y)?.closest(selector) ?? null;
    point(square && within.contains(square) ? square : null);
  };
}

/** What a name's popup says: the name, as a square's popup heads itself. */
export function nameTip(name: string): Node[] {
  const head = el('div', 'tm-tip-head');
  head.append(el('strong', '', name));
  return [head];
}

/** The things in `within` that `selector` finds show their name (their `data-name`) over them while a mouse points at them; drawn again, call what this gives back. */
export function nameTips(within: HTMLElement, selector: string): () => void {
  return pointTips(within, selector, (made) => ((made as HTMLElement).dataset.name ? nameTip((made as HTMLElement).dataset.name as string) : null), 'tm-tip-pointed tm-tip-name');
}
