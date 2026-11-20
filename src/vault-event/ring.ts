/*
 * The players as faces (both vault events): each one's profile picture in a seat, round the middle of the stage (Hot
 * Potato: `circle`, the potato in the middle) or in a row over the grid (Laser Grid: `row`). A seat is kept from one
 * state to the next (only what it says changes), so something can fly from one to another (`fly`: the potato passed).
 * A seat can be pressed while the page lets it (`pickable`: Hot Potato's holder passing to someone).
 *
 * The lists under the stage still say all of it in words, for screen readers; the seats are pictures with a label.
 */

export interface Seat {
  id: string;
  name: string;
  avatar: string;
  /** The page's own player (or, watching, theirs). */
  you: boolean;
  /** Still in, holding the potato, or out. */
  state: 'in' | 'holder' | 'out';
  /** A word under the face for a moment (a duck's time, why they were caught), good or bad news. */
  mark?: { text: string; kind: 'good' | 'bad' } | undefined;
  /** Whether it can be pressed now. */
  pickable: boolean;
}

export interface Ring {
  render(seats: readonly Seat[]): void;
  /** Flies `art` from one seat (null: the middle) to another, over `ms`. */
  fly(from: string | null, to: string | null, art: string, ms?: number): void;
  /** Shakes a seat (a blast, a catch). */
  jolt(id: string): void;
  /** Which way a seat is from the middle (`circle`), in degrees clockwise from pointing right; null for none there. */
  angleTo(id: string): number | null;
}

/** The widest the ellipse gets, for its height: on a wide screen the ring fills the stage, but the faces keep round. */
const WIDEST = 1.9;

/**
 * Where a seat goes round an ellipse in a `width` by `height` box: the first at the top, then clockwise. Percent of the
 * box. It's 40% of the box's height up and down, and 44% of its width across, but never more than WIDEST times as
 * wide as it is tall.
 */
function around(i: number, n: number, width: number, height: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, n);
  const across = width > 0 ? Math.min(44, (40 * height * WIDEST) / width) : 44;
  return { x: 50 + across * Math.cos(angle), y: 50 + 40 * Math.sin(angle) };
}

/** A face's size for `n` players: smaller as more sit down, so they all fit. */
const sizeFor = (n: number): number => (n <= 6 ? 58 : n <= 10 ? 50 : n <= 16 ? 42 : n <= 24 ? 36 : 30);

/**
 * The ring in `box`. `onPick`: a pickable seat was pressed. `onResize`: the box changed size (the page did, or what's
 * round the ring), and the seats have been put round it again.
 */
export function ring(box: HTMLElement, layout: 'circle' | 'row', onPick?: (id: string) => void, onResize?: () => void): Ring {
  box.classList.add('ve-ring', `ve-ring-${layout}`);
  const seats = new Map<string, { root: HTMLButtonElement; img: HTMLImageElement; label: HTMLElement; mark: HTMLElement }>();
  /** Where each seat sits round the ellipse (`circle`), in percent of the box: where it's going, not where it is mid-move. */
  const spots = new Map<string, { x: number; y: number }>();
  /** The seats in order, as last rendered (to put round the box again when it changes size). */
  let order: string[] = [];
  const reduced = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Puts every seat round the ellipse, for the box's size now. */
  function place(): void {
    if (layout !== 'circle') return;
    order.forEach((id, i) => {
      const { x, y } = around(i, order.length, box.clientWidth, box.clientHeight);
      spots.set(id, { x, y });
      const root = seats.get(id)?.root;
      root?.style.setProperty('--x', `${x}%`);
      root?.style.setProperty('--y', `${y}%`);
    });
  }

  let size = '';
  new ResizeObserver(() => {
    const now = `${box.clientWidth}x${box.clientHeight}`;
    if (now === size) return;
    size = now;
    place();
    onResize?.();
  }).observe(box);

  function seatOf(id: string): HTMLButtonElement {
    const known = seats.get(id);
    if (known) return known.root;
    const root = document.createElement('button');
    root.type = 'button';
    root.className = 've-seat';
    const img = document.createElement('img');
    img.className = 've-seat-face';
    img.alt = '';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.draggable = false;
    const label = document.createElement('span');
    label.className = 've-seat-name';
    const mark = document.createElement('span');
    mark.className = 've-seat-mark';
    root.append(img, label, mark);
    root.addEventListener('click', () => {
      if (root.classList.contains('pickable')) onPick?.(id);
    });
    box.append(root);
    seats.set(id, { root, img, label, mark });
    return root;
  }

  function render(list: readonly Seat[]): void {
    const wanted = new Set(list.map((s) => s.id));
    for (const [id, seat] of seats) {
      if (wanted.has(id)) continue;
      seat.root.remove();
      seats.delete(id);
      spots.delete(id);
    }
    box.style.setProperty('--seat', `${sizeFor(list.length)}px`);
    order = list.map((s) => s.id);
    for (const s of list) seatOf(s.id);
    place();
    list.forEach((s, i) => {
      const seat = seats.get(s.id)!;
      seat.root.style.order = String(i);
      if (seat.img.getAttribute('src') !== s.avatar) seat.img.src = s.avatar;
      seat.label.textContent = s.you ? 'You' : s.name;
      seat.mark.textContent = s.mark?.text ?? '';
      seat.mark.className = `ve-seat-mark${s.mark ? ` ${s.mark.kind}` : ''}`;
      seat.root.classList.toggle('you', s.you);
      seat.root.classList.toggle('holder', s.state === 'holder');
      seat.root.classList.toggle('out', s.state === 'out');
      seat.root.classList.toggle('pickable', s.pickable);
      seat.root.disabled = !s.pickable;
      const state = s.state === 'holder' ? ', holding the potato' : s.state === 'out' ? ', out' : '';
      seat.root.setAttribute('aria-label', `${s.you ? 'You' : s.name}${state}${s.mark ? `, ${s.mark.text}` : ''}${s.pickable ? ': pass it to them' : ''}`);
    });
  }

  /** The middle of a seat (null: of the box), in the box's own pixels. */
  function centre(id: string | null): { x: number; y: number } {
    const outer = box.getBoundingClientRect();
    const face = id ? seats.get(id)?.img : null;
    if (!face) return { x: outer.width / 2, y: outer.height / 2 };
    const r = face.getBoundingClientRect();
    return { x: r.left - outer.left + r.width / 2, y: r.top - outer.top + r.height / 2 };
  }

  function fly(from: string | null, to: string | null, art: string, ms = 380): void {
    if (reduced()) return;
    const a = centre(from);
    const b = centre(to);
    const thing = document.createElement('span');
    thing.className = 've-fly';
    thing.textContent = art;
    thing.setAttribute('aria-hidden', 'true');
    thing.style.transform = `translate(${a.x}px, ${a.y}px) translate(-50%, -50%)`;
    box.append(thing);
    const flight = thing.animate(
      [
        { transform: `translate(${a.x}px, ${a.y}px) translate(-50%, -50%) scale(1) rotate(0deg)` },
        { transform: `translate(${(a.x + b.x) / 2}px, ${Math.min(a.y, b.y) - 40}px) translate(-50%, -50%) scale(1.5) rotate(200deg)`, offset: 0.5 },
        { transform: `translate(${b.x}px, ${b.y}px) translate(-50%, -50%) scale(1) rotate(400deg)` },
      ],
      { duration: ms, easing: 'ease-in-out' },
    );
    flight.onfinish = () => thing.remove();
    window.setTimeout(() => thing.remove(), ms + 200);
  }

  function jolt(id: string): void {
    const seat = seats.get(id)?.root;
    if (!seat || reduced()) return;
    seat.classList.remove('jolt');
    void seat.offsetWidth;
    seat.classList.add('jolt');
  }

  function angleTo(id: string): number | null {
    const spot = spots.get(id);
    if (!spot) return null;
    // (The box isn't square, so the angle is worked out in its pixels, not its percents.)
    const dx = ((spot.x - 50) / 100) * box.clientWidth;
    const dy = ((spot.y - 50) / 100) * box.clientHeight;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  return { render, fly, jolt, angleTo };
}
