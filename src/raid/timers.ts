import { state } from './state';
import { ui } from './ui';

/** How long this turn is (the first time the page saw it open, and when it ends), for the timer bar. */
const turnStarts = new Map<number, number>();
function turnLength(endsAt: number): number {
  let started = turnStarts.get(endsAt);
  if (started === undefined) {
    started = Date.now();
    turnStarts.set(endsAt, started);
  }
  return Math.max(1000, endsAt - started);
}

/** The countdowns: the lobby closing, and the turn's time running out. */
export function tick(): void {
  const { view, lobbyTimer } = state;
  const now = Date.now();
  if (view?.phase === 'lobby' && view.lobby && lobbyTimer) {
    const s = Math.max(0, Math.ceil((view.lobby.closesAt - now) / 1000));
    lobbyTimer.textContent = s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
  }
  if (view?.phase === 'fight' && view.fight) {
    const f = view.fight;
    if (f.open) {
      const left = Math.max(0, f.endsAt - now);
      ui.turnText.textContent = `${Math.ceil(left / 1000)}s left`;
      ui.turnFill.style.width = `${Math.min(100, (left / turnLength(f.endsAt)) * 100)}%`;
    } else {
      ui.turnText.textContent = 'Resolving…';
      ui.turnFill.style.width = '0%';
    }
  }
}
