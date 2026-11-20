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
}

/** Where a seat goes round an ellipse: the first at the top, then clockwise. Percent of the box. */
function around(i: number, n: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, n);
  return { x: 50 + 44 * Math.cos(angle), y: 50 + 40 * Math.sin(angle) };
}

/** A face's size for `n` players: smaller as more sit down, so they all fit. */
const sizeFor = (n: number): number => (n <= 6 ? 58 : n <= 10 ? 50 : n <= 16 ? 42 : n <= 24 ? 36 : 30);

export function ring(box: HTMLElement, layout: 'circle' | 'row', onPick?: (id: string) => void): Ring {
  box.classList.add('ve-ring', `ve-ring-${layout}`);
  const seats = new Map<string, { root: HTMLButtonElement; img: HTMLImageElement; label: HTMLElement; mark: HTMLElement }>();
  const reduced = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    }
    box.style.setProperty('--seat', `${sizeFor(list.length)}px`);
    list.forEach((s, i) => {
      seatOf(s.id);
      const seat = seats.get(s.id)!;
      if (layout === 'circle') {
        const { x, y } = around(i, list.length);
        seat.root.style.setProperty('--x', `${x}%`);
        seat.root.style.setProperty('--y', `${y}%`);
      }
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

  return { render, fly, jolt };
}
