import { colourOf } from './cursors';
import { send, state } from './state';
import { ui } from './ui';

/** How long a finger is held on a tile to flag it. */
const HOLD_MS = 400;
/** A finger that moved further than this was scrolling the board, not holding a tile. */
const HOLD_SLOP = 10;

/** What a tile shows, by its character in the bot's `tiles` (see protocol.ts). An open tile shows its number, or nothing for 0. */
const MARKS: Record<string, string> = { F: '🚩', '*': '💣', '!': '💥', X: '❌' };

let tiles: HTMLButtonElement[] = [];
/** The board the tiles were built for. */
let built = '';

/** The tiles, built again when the board's size changes. */
function build(cols: number, rows: number): void {
  const key = `${cols}x${rows}`;
  if (key === built) return;
  built = key;
  ui.board.style.setProperty('--cols', String(cols));
  ui.board.style.setProperty('--rows', String(rows));
  tiles = Array.from({ length: cols * rows }, (_, i) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'ms-tile';
    tile.dataset.i = String(i);
    tile.setAttribute('aria-label', `Row ${Math.floor(i / cols) + 1}, column ${(i % cols) + 1}`);
    return tile;
  });
  ui.board.replaceChildren(...tiles);
}

/** The board as the room has it. */
export function renderBoard(): void {
  const game = state.room?.game ?? null;
  ui.field.hidden = game === null;
  if (!game) return;
  build(game.cols, game.rows);
  ui.board.classList.toggle('over', game.status === 'won' || game.status === 'lost');
  const others = new Map(state.room?.players.filter((p) => p.id !== state.room?.you).map((p) => [p.id, colourOf(p)]));
  tiles.forEach((tile, i) => {
    const seen = game.tiles[i] ?? '#';
    // Another player's flag is outlined in their colour.
    const who = (seen === 'F' || seen === 'X' ? others.get(game.flaggers[i] ?? '') : undefined) ?? '';
    if (tile.dataset.who !== who) {
      tile.dataset.who = who;
      tile.classList.toggle('theirs', who !== '');
      tile.style.setProperty('--who', who || null);
    }
    if (tile.dataset.seen === seen) return;
    tile.dataset.seen = seen;
    const open = seen >= '0' && seen <= '8';
    tile.classList.toggle('open', open || seen === '*' || seen === '!');
    tile.textContent = open ? (seen === '0' ? '' : seen) : (MARKS[seen] ?? '');
  });
}

/** The tile under `target`, and what it shows. */
function tileAt(target: EventTarget | null): { index: number; seen: string } | null {
  const tile = target instanceof Element ? target.closest<HTMLElement>('.ms-tile') : null;
  if (!tile) return null;
  return { index: Number(tile.dataset.i), seen: tile.dataset.seen ?? '#' };
}

const over = (): boolean => {
  const status = state.room?.game?.status;
  return status === undefined || status === 'won' || status === 'lost';
};

function flag(target: EventTarget | null): void {
  const tile = tileAt(target);
  if (!tile || over() || (tile.seen !== '#' && tile.seen !== 'F')) return;
  send({ t: 'flag', index: tile.index });
}

/**
 * The board's clicks: a shut tile opens, a number with all its flags round it opens the rest (a
 * chord), and a right-click (or, on a touch screen, a finger held on it) flags.
 */
export function wireBoard(): void {
  /** Whether the last press was a finger's, and its hold: the flag it made takes the place of the click after it. */
  let touch = false;
  let hold = 0;
  let held = false;
  let from = { x: 0, y: 0 };
  const letGo = (): void => {
    clearTimeout(hold);
    hold = 0;
  };

  ui.board.addEventListener('click', (e) => {
    if (held) {
      held = false;
      return;
    }
    const tile = tileAt(e.target);
    if (!tile || over()) return;
    if (tile.seen === '#') send({ t: 'open', index: tile.index });
    else if (tile.seen >= '1' && tile.seen <= '8') send({ t: 'chord', index: tile.index });
  });

  ui.board.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    // A finger held down brings this up on some phones too: its flag is the hold's, below.
    if (!touch) flag(e.target);
  });

  ui.board.addEventListener('pointerdown', (e) => {
    touch = e.pointerType !== 'mouse';
    held = false;
    letGo();
    if (!touch) return;
    from = { x: e.clientX, y: e.clientY };
    const { target } = e;
    hold = window.setTimeout(() => {
      hold = 0;
      held = true;
      flag(target);
      navigator.vibrate?.(15);
    }, HOLD_MS);
  });
  ui.board.addEventListener('pointermove', (e) => {
    if (hold && Math.hypot(e.clientX - from.x, e.clientY - from.y) > HOLD_SLOP) letGo();
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) ui.board.addEventListener(type, letGo);
}
