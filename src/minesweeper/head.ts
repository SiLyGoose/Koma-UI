import { coin, points } from '../shared/util';
import type { GameView, MinesweeperLevel, MinesweeperRewards, PaidView } from './protocol';
import { clock, elapsed, LEVEL_NAMES, send, state } from './state';
import { ui } from './ui';

/** The face on the button that starts a new board: how this one is going. */
const FACES: Record<GameView['status'], string> = { ready: '🙂', playing: '🙂', won: '😎', lost: '😵' };

/** The time used, on its own: it's drawn again several times a second while the clock runs. */
export function renderTime(): void {
  ui.time.textContent = clock(elapsed());
}

/** A few names as one: "Mochi", "Mochi and Simon", "Mochi, Simon and Zeiu". */
const names = (all: string[]): string => (all.length < 2 ? all.join('') : `${all.slice(0, -1).join(', ')} and ${all.at(-1)}`);

/**
 * How a board that's over ended, in a line: cleared and in how long, or who hit a mine. A chord sent
 * into a mine by someone's wrong flag says whose it was, in one of two ways (the same one on every page).
 */
function ending(game: GameView): string {
  if (game.status === 'won') return `🎉 Board cleared in ${clock(game.elapsedMs)}`;
  const who = game.by ?? 'Someone';
  const others = game.blamed.filter((name) => name !== who);
  if (others.length === 0) return game.blamed.length > 0 ? `💥 ${who} hit a mine because of their own wrong flag!` : `💥 ${who} hit a mine!`;
  const liars = names(others);
  return game.no % 2 === 0 ? `💥 ${who} hit a mine because ${liars} flagged wrong!` : `💥 ${liars} lied about a mine so ${who} paid the price`;
}

/** Where a board cleared came among its level's fastest in the server, for under how it ended: nothing when it isn't one of them. */
const placed = (rank: number | null): string => (rank === null ? '' : rank === 1 ? ' · 🏆 Fastest in the server' : ` · 🏆 #${rank} fastest in the server`);

/** What clearing a board of `level` pays, for the level's tab: its pool, and what being quick makes of it. */
function pays(rewards: MinesweeperRewards, level: MinesweeperLevel): string {
  const pool = rewards.pool[level];
  if (pool === 0) return '';
  const most = Math.round(pool * rewards.speedBonus);
  return most > pool ? ` · pays ${points(pool)}, up to ${points(most)} cleared in ${clock((rewards.parSeconds[level] * 1000) / 2)}` : ` · pays ${points(pool)}`;
}

/** An amount of the bot's currency. */
function amount(n: number, className: string): HTMLElement {
  const el = document.createElement('span');
  el.className = className;
  el.append(points(n), coin('ms-coin', 'zeiucoins'));
  return el;
}

/** What a board cleared paid: all told (and what speed made of it), then each player's share, this page's own marked. */
function renderPaid(paid: PaidView, you: string): void {
  const total = document.createElement('span');
  total.className = 'ms-paid-total';
  total.append(amount(paid.total, 'ms-paid-amount'), paid.bonus > 1 ? ` paid out · ×${paid.bonus} for speed` : ' paid out');
  ui.endedPaid.replaceChildren(
    total,
    ...paid.shares.map((share) => {
      const row = document.createElement('span');
      row.className = 'ms-paid-share';
      row.classList.toggle('mine', share.id === you);
      const name = document.createElement('span');
      name.className = 'ms-paid-name';
      name.textContent = share.name;
      const tiles = document.createElement('span');
      tiles.className = 'ms-paid-tiles';
      tiles.textContent = `${share.tiles} ${share.tiles === 1 ? 'tile' : 'tiles'}`;
      row.append(name, tiles, amount(share.points, 'ms-paid-amount'));
      return row;
    }),
  );
}

/** The levels, the counters and the face above the board, and (in a popup over the board) how it ended. */
export function renderHead(): void {
  const { room } = state;
  const game = room?.game ?? null;

  for (const tab of ui.levels) {
    tab.classList.toggle('picked', tab.dataset.level === game?.level);
    tab.disabled = room === null;
    const size = room?.levels[tab.dataset.level as MinesweeperLevel];
    tab.title = size ? `${size.cols}×${size.rows}, ${size.mines} mines${pays(room.rewards, tab.dataset.level as MinesweeperLevel)}` : '';
  }
  ui.newGame.disabled = room === null;
  ui.newGame.textContent = FACES[game?.status ?? 'ready'];

  renderTime();
  ui.minesLeft.textContent = game ? String(game.mines - game.flags) : '–';

  const over = game !== null && (game.status === 'won' || game.status === 'lost');
  ui.ended.hidden = !over || state.closed === game.no;
  if (over) {
    ui.ended.classList.toggle('lost', game.status === 'lost');
    ui.endedTitle.textContent = ending(game);
    ui.endedText.textContent = `${LEVEL_NAMES[game.level]}${game.status === 'lost' ? ` · ${clock(game.elapsedMs)}` : placed(game.rank)} · Click to close`;
  }
  // What it paid (nothing, when its level's pool is set to 0).
  const paid = over && game.paid && game.paid.total > 0 ? game.paid : null;
  ui.endedPaid.hidden = paid === null;
  if (paid && room) renderPaid(paid, room.you);
}

/**
 * A new board at `level` for everyone, in place of the one there. One being played is everyone's:
 * the page asks before throwing it away.
 */
function newBoard(level: MinesweeperLevel): void {
  if (state.room?.game.status === 'playing' && !confirm('Start a new board? The one everyone is playing will be thrown away.')) return;
  send({ t: 'new', level });
}

/** The levels (each starts a board of its size) and the face (a new board of the size there). */
export function wireHead(): void {
  for (const tab of ui.levels) {
    tab.addEventListener('click', () => {
      const game = state.room?.game;
      const level = tab.dataset.level as MinesweeperLevel;
      // Already there, and untouched.
      if (!game || (game.level === level && game.status === 'ready')) return;
      newBoard(level);
    });
  }
  ui.newGame.addEventListener('click', () => {
    const game = state.room?.game;
    if (game) newBoard(game.level);
  });
  ui.ended.addEventListener('click', () => {
    state.closed = state.room?.game.no ?? 0;
    ui.ended.hidden = true;
  });
}
