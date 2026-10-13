import type { PlayerView } from './protocol';
import { send, state } from './state';
import { ui } from './ui';

/*
 * The other players' cursors over the board: the site's hand (public/shared/cursor.png, the one this
 * page's own mouse has) with a small box beside it saying whose it is, each player in their own
 * colour. Never this page's own: its mouse is already there.
 *
 * A cursor's place is in tiles from the board's top left, so it's over the same tile on every screen
 * whatever size the board is drawn there. This page says where its own is as it moves, at most every
 * SEND_MS, and that it has gone when the mouse leaves the board.
 */

/** The least time between two of this page's cursor messages. */
const SEND_MS = 50;
const HAND = `${import.meta.env.BASE_URL}shared/cursor.png`;

/** The players' colours, by the number the bot gives each (protocol.ts's `colour`). */
const COLOURS = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#da77f2', '#ff922b', '#3bc9db', '#f783ac'];
export const colourOf = (player: PlayerView): string => COLOURS[player.colour % COLOURS.length] as string;

interface Shown {
  el: HTMLElement;
  name: HTMLElement;
  at: [number, number] | null;
}

const shown = new Map<string, Shown>();

const others = (): PlayerView[] => state.room?.players.filter((p) => p.id !== state.room?.you) ?? [];

function place(cursor: Shown): void {
  const game = state.room?.game;
  cursor.el.hidden = !game || cursor.at === null;
  if (!game || cursor.at === null) return;
  const [x, y] = cursor.at;
  cursor.el.style.left = `${(x / game.cols) * 100}%`;
  cursor.el.style.top = `${(y / game.rows) * 100}%`;
  // Near the right edge the name goes to the hand's left, to stay on the board.
  cursor.el.classList.toggle('flip', x > game.cols * 0.75);
}

function label(cursor: Shown, player: PlayerView): void {
  cursor.name.textContent = player.name;
  cursor.el.style.setProperty('--who', colourOf(player));
}

/** Another player's mouse moved to `at` (null: off the board). */
export function moveCursor(id: string, at: [number, number] | null): void {
  const player = others().find((p) => p.id === id);
  if (!player) return;
  let cursor = shown.get(id);
  if (!cursor) {
    const el = document.createElement('div');
    el.className = 'ms-cursor';
    const hand = document.createElement('img');
    hand.src = HAND;
    hand.alt = '';
    const name = document.createElement('span');
    name.className = 'ms-cursor-name';
    el.append(hand, name);
    ui.cursors.append(el);
    cursor = { el, name, at: null };
    shown.set(id, cursor);
    label(cursor, player);
  }
  cursor.at = at;
  place(cursor);
}

/** The room changed: cursors of players who left go, and the rest keep up with their names, colours and the board's size. */
export function syncCursors(): void {
  const here = new Map(others().map((p) => [p.id, p]));
  for (const [id, cursor] of shown) {
    const player = here.get(id);
    if (!player) {
      cursor.el.remove();
      shown.delete(id);
      continue;
    }
    label(cursor, player);
    place(cursor);
  }
}

/** Disconnected: nobody's cursor is known any more. */
export function clearCursors(): void {
  for (const cursor of shown.values()) cursor.el.remove();
  shown.clear();
}

/** Says where this page's mouse is over the board as it moves, and when it leaves. */
export function wireCursor(): void {
  let sentAt = 0;
  let timer = 0;
  /** What to say next (undefined: nothing new), and what was said last. */
  let next: [number, number] | null | undefined;
  let last: [number, number] | null = null;

  const flush = (): void => {
    timer = 0;
    if (next === undefined) return;
    const at = next;
    next = undefined;
    if (!state.room?.game || (at === null && last === null)) return;
    if (send({ t: 'cursor', at })) {
      last = at;
      sentAt = performance.now();
    }
  };
  const say = (at: [number, number] | null): void => {
    next = at;
    const wait = SEND_MS - (performance.now() - sentAt);
    if (wait <= 0) flush();
    else if (!timer) timer = window.setTimeout(flush, wait);
  };

  const moved = (e: PointerEvent): void => {
    const game = state.room?.game;
    if (!game) return;
    const box = ui.board.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const x = Math.min(game.cols, Math.max(0, ((e.clientX - box.left) / box.width) * game.cols));
    const y = Math.min(game.rows, Math.max(0, ((e.clientY - box.top) / box.height) * game.rows));
    say([Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
  };
  ui.field.addEventListener('pointermove', moved);
  ui.field.addEventListener('pointerdown', moved);
  ui.field.addEventListener('pointerleave', () => say(null));
}
