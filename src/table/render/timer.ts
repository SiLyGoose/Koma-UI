import type { TableContext } from '../context';

/** The countdown under the table: how long the betting has left, or that the round is being dealt. */
export function renderTimer<S extends string, R, X>(ctx: TableContext<S, R, X>): void {
  const { ui, state, game } = ctx;
  const { words } = game;
  if (!state) return;
  const left = Math.max(0, ctx.deadline - performance.now());
  const betting = state.phase === 'betting';
  const whole = betting ? ctx.bettingWhole : 1;
  ui.timer.classList.toggle('dealing', !betting);
  ui.timer.classList.toggle('soon', betting && left < 10_000);
  ui.timerBar.style.transform = `scaleX(${betting ? Math.min(1, left / whole) : 0})`;
  const seconds = Math.ceil(left / 1000);
  ui.timerText.textContent = betting
    ? seconds > 0
      ? `Place your bets · ${words.soon} ${seconds}s`
      : words.doing
    : ctx.dealingOut
      ? words.doing
      : `Next round in ${seconds}s`;
}
