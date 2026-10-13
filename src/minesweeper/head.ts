import type { GameView, MinesweeperLevel } from './protocol';
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

/** The levels, the counters and the face above the board, and (in a popup over the board) how it ended. */
export function renderHead(): void {
  const { room } = state;
  const game = room?.game ?? null;

  for (const tab of ui.levels) {
    tab.classList.toggle('picked', tab.dataset.level === game?.level);
    tab.disabled = room === null;
    const size = room?.levels[tab.dataset.level as MinesweeperLevel];
    tab.title = size ? `${size.cols}×${size.rows}, ${size.mines} mines` : '';
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
    ui.endedText.textContent = `${LEVEL_NAMES[game.level]}${game.status === 'lost' ? ` · ${clock(game.elapsedMs)}` : ''} · Click to close`;
  }
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
