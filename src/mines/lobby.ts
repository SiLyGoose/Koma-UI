import { points, remember, remembered } from '../shared/util';
import { renderPanel, setBalance } from './panel';
import type { Lobby, StartRefusal } from './protocol';
import { render } from './render';
import { state } from './state';
import { ui } from './ui';

/** The bet and mines picked last, kept in the browser so a reload (or a code change in dev) doesn't lose them. */
const BET_KEY = 'mines.bet';
const MINES_KEY = 'mines.count';

/** The bot's lobby: the limits on a bet and the mines, their balance, and what they bet last. */
export function showLobby(next: Lobby): void {
  const first = state.lobby === null;
  state.lobby = next;
  setBalance(next.balance);
  ui.betRange.textContent = `(${points(next.minBet)} to ${points(next.maxBet)})`;
  ui.bet.min = String(next.minBet);
  ui.bet.max = String(next.maxBet);
  // The bet and mines typed last on this page (kept through reloads), else the last round's.
  const keptBet = Number(remembered(BET_KEY));
  const keptMines = Number(remembered(MINES_KEY));
  if (first || !ui.bet.value) ui.bet.value = String(Math.max(next.minBet, Math.min(keptBet || next.lastBet || next.minBet, next.maxBet)));
  if (first) {
    ui.mines.textContent = '';
    for (let m = next.minMines; m <= next.maxMines; m++) ui.mines.append(new Option(String(m), String(m)));
    const mines = keptMines >= next.minMines && keptMines <= next.maxMines ? keptMines : (next.lastMines ?? 3);
    ui.mines.value = String(mines);
  }
  render();
}

/** Why the bot wouldn't start a round, in words. */
export function refusalText(r: StartRefusal): string {
  switch (r.reason) {
    case 'too_small':
      return `The smallest bet is ${points(r.limit)}.`;
    case 'too_big':
      return `The biggest bet is ${points(r.limit)}.`;
    case 'too_poor':
      return `You only have ${points(r.balance)}.`;
    case 'busy':
      return 'You already have a round going. Finish it first (in Discord or another tab).';
  }
}

/** The bet and mines inputs, and the ½, 2× and Max chips beside the bet. */
export function wireLobby(): void {
  ui.mines.addEventListener('change', () => {
    remember(MINES_KEY, ui.mines.value);
    render();
  });
  ui.bet.addEventListener('input', () => {
    remember(BET_KEY, ui.bet.value);
    renderPanel();
  });

  for (const chip of document.querySelectorAll<HTMLButtonElement>('[data-bet]')) {
    chip.addEventListener('click', () => {
      const { lobby } = state;
      if (!lobby) return;
      const now = Math.floor(Number(ui.bet.value)) || lobby.minBet;
      const most = Math.min(lobby.maxBet, Math.max(lobby.minBet, lobby.balance));
      const next = chip.dataset.bet === 'half' ? Math.floor(now / 2) : chip.dataset.bet === 'double' ? now * 2 : most;
      ui.bet.value = String(Math.max(lobby.minBet, Math.min(next, lobby.maxBet)));
      remember(BET_KEY, ui.bet.value);
      renderPanel();
    });
  }
}
