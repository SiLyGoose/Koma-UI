import { points } from '../shared/util';
import { watching } from '../shared/game';
import { maxPayoutText, multiplierFor, times, TILES } from './multiplier';
import { playing, state } from './state';
import { ui } from './ui';

export function setBalance(balance: number | null | undefined): void {
  if (balance === null || balance === undefined) return;
  ui.balance.textContent = points(balance);
}

export function showError(text: string | null): void {
  ui.error.hidden = text === null;
  ui.error.textContent = text ?? '';
}

/** The panel: the bet and mines between rounds, the multipliers and Cash out during one. */
export function renderPanel(): void {
  const { lobby, run } = state;
  const live = playing();
  const busy = state.pending !== null || watching;
  const inputs = [ui.bet, ui.mines, ...document.querySelectorAll<HTMLButtonElement>('[data-bet]')];
  for (const el of inputs) el.disabled = live || busy || !lobby;
  ui.random.hidden = !live || watching;
  ui.random.disabled = busy;
  if (live && run) {
    ui.action.textContent = run.gems === 0 ? 'Cash out' : `Cash out ${points(run.cashOut)}`;
    ui.action.disabled = busy || run.gems === 0;
    ui.mult.textContent = times(run.multiplier);
    ui.nextLabel.textContent = 'Next gem';
    ui.next.textContent = run.next === null ? '–' : times(run.next);
    ui.gems.textContent = `${run.gems} / ${TILES - run.mines}`;
    ui.maxPayout.textContent = maxPayoutText(lobby, run.bet, run.mines);
  } else {
    ui.action.textContent = 'Bet';
    ui.action.disabled = busy || !lobby;
    ui.mult.textContent = times(1);
    ui.nextLabel.textContent = 'First gem';
    ui.next.textContent = lobby ? times(multiplierFor(lobby, Number(ui.mines.value), 1)) : '–';
    ui.gems.textContent = lobby ? `0 / ${TILES - Number(ui.mines.value)}` : '–';
    ui.maxPayout.textContent = maxPayoutText(lobby, Math.floor(Number(ui.bet.value)), Number(ui.mines.value));
    ui.idle.hidden = true;
  }
  if (watching) ui.action.textContent = state.watched ? `Watching ${state.watched}` : 'Watching';
}
