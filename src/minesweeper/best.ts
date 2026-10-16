import { closeMark } from '../shared/ui';
import type { MinesweeperClear, MinesweeperLevel } from '../protocol/minesweeper';
import { exactClock, state } from './state';
import { ui } from './ui';

/*
 * The server's fastest clears: the 🏆 beside the levels opens a popup of them, a level at a time (the
 * board's own to begin with), each with how long it took, everyone who opened a tile of it and the
 * day. The bot keeps them and says them (../protocol/minesweeper.ts's `best`), on joining and whenever a board cleared
 * makes its level's, so the popup is up to date while it's open.
 */

const MEDALS = ['🥇', '🥈', '🥉'];

/** The level whose clears the popup shows. */
let level: MinesweeperLevel = 'easy';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** The day a board was cleared, like "12 Oct 2026". */
const day = (at: number): string => new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** A clear, `rank`th of its level's: its place, who cleared it (this page's player marked) and when, and its time. */
function row(clear: MinesweeperClear, rank: number, you: string | null): HTMLLIElement {
  const li = el('li', `ms-best-row${rank <= 3 ? ` top${rank}` : ''}`);
  li.classList.toggle(
    'mine',
    clear.players.some((p) => p.id === you),
  );
  const who = el('span', 'ms-best-who');
  const names = el('span', 'ms-best-names');
  clear.players.forEach((p, i) => {
    if (i > 0) names.append(', ');
    const name = el('span', p.id === you ? 'ms-best-name you' : 'ms-best-name', p.name);
    name.title = `${p.tiles} ${p.tiles === 1 ? 'tile' : 'tiles'} opened`;
    names.append(name);
  });
  who.append(names, el('span', 'ms-best-day', day(clear.at)));
  li.append(el('span', 'ms-best-rank', MEDALS[rank - 1] ?? `#${rank}`), who, el('b', 'ms-best-time', exactClock(clear.ms)));
  return li;
}

/** The 🏆 (there once the bot has said the clears), and the popup's level and its clears. */
export function renderBest(): void {
  ui.bestOpen.disabled = state.best === null;
  if (ui.best.hidden) return;
  for (const tab of ui.bestTabs) {
    const on = tab.dataset.best === level;
    tab.classList.toggle('on', on);
    tab.setAttribute('aria-selected', String(on));
  }
  const clears = state.best?.[level] ?? [];
  const you = state.room?.you ?? null;
  if (clears.length === 0) ui.bestList.replaceChildren(el('li', 'ms-best-empty', 'Nobody has cleared one yet.'));
  else ui.bestList.replaceChildren(...clears.map((clear, i) => row(clear, i + 1, you)));
}

function shut(): void {
  ui.best.hidden = true;
  ui.bestOpen.focus();
}

/** The 🏆 opens the popup, on the level of the board there; its tabs change the level; the X, a click outside it or Escape closes it. */
export function wireBest(): void {
  closeMark(ui.bestClose);
  ui.bestOpen.addEventListener('click', () => {
    level = state.room?.game.level ?? level;
    ui.best.hidden = false;
    renderBest();
  });
  for (const tab of ui.bestTabs) {
    tab.addEventListener('click', () => {
      level = tab.dataset.best as MinesweeperLevel;
      renderBest();
    });
  }
  ui.bestClose.addEventListener('click', shut);
  ui.best.addEventListener('pointerdown', (e) => {
    if (e.target === ui.best) shut();
  });
  window.addEventListener('keydown', (e) => {
    if (!ui.best.hidden && e.key === 'Escape') shut();
  });
}
