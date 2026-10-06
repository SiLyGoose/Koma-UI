import { watching } from '../shared/game';
import { replay } from '../shared/util';
import { send } from './connection';
import { showError } from './panel';
import type { RunEvent } from './protocol';
import { render } from './render';
import { play } from './sfx';
import { playing, state } from './state';
import { ui } from './ui';

/** Bets what's typed, on the mines picked. */
export function startRound(): void {
  if (watching || !state.lobby || playing() || state.pending) return;
  const bet = Math.floor(Number(ui.bet.value));
  if (!Number.isFinite(bet) || bet < 1) return showError('Type how much to bet.');
  state.seq += 1;
  if (!send({ t: 'start', bet, mines: Number(ui.mines.value), seq: state.seq })) return;
  state.pending = { seq: state.seq };
  showError(null);
  state.lastActivity = performance.now();
  render();
}

/** Turns over tile `index` (or one at random). */
export function pick(index: number | 'random'): void {
  if (watching || !playing() || state.pending) return;
  state.seq += 1;
  if (!send({ t: 'pick', index, seq: state.seq })) return;
  state.pending = { seq: state.seq, index };
  state.lastActivity = performance.now();
  render();
}

export function cashOut(): void {
  const { run } = state;
  if (watching || !playing() || state.pending || !run || run.gems === 0) return;
  state.seq += 1;
  if (!send({ t: 'cashout', seq: state.seq })) return;
  state.pending = { seq: state.seq };
  render();
}

/** What a pick turned over (`picked`: an answer to the page's own pick, not a reconnect). */
export function applyEvent(event: RunEvent | undefined, picked: boolean): void {
  if (picked && (event?.kind === 'gem' || event?.kind === 'boom')) play(event.kind);
  if (event?.kind !== 'boom') return;
  replay(ui.board.parentElement as HTMLElement, 'shake');
}
