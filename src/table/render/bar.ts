import { points } from '../../shared/format';
import { fits } from '../betting';
import { balance, busy, mySeat, onTable, type TableContext } from '../context';
import { sumBets } from '../format';

/** The panel's figures and buttons, and which chips in the rack can go down. */
export function renderBar<S extends string, R, X>(ctx: TableContext<S, R, X>): void {
  const { ui, game, state } = ctx;
  const { words } = game;
  const have = balance(ctx);
  ui.balance.textContent = have === null ? '–' : points(have);
  ui.bet.textContent = points(onTable(ctx));
  const idle = busy(ctx);
  const last = mySeat(ctx)?.lastBets ?? null;
  ui.undo.disabled = idle || ctx.history.length === 0;
  ui.clear.disabled = idle || onTable(ctx) === 0;
  ui.rebet.disabled = idle || !last || onTable(ctx) > 0 || !fits(ctx, sumBets(last));
  ui.double.disabled = idle || onTable(ctx) === 0 || !fits(ctx, onTable(ctx) * 2);
  // Deal now: alone it deals straight away; with others it's a vote, dealt once everyone has voted.
  const seats = state?.seats ?? [];
  const voted = mySeat(ctx)?.ready ?? false;
  ui.dealVote.disabled = idle;
  ui.dealVote.classList.toggle('voted', voted);
  ui.dealVote.setAttribute('aria-pressed', String(voted));
  ui.dealVote.textContent = seats.length <= 1 ? words.button : `${voted ? 'Voted' : words.button} · ${seats.filter((s) => s.ready).length}/${seats.length}`;
  ui.dealVote.title = seats.length <= 1 ? words.alone : voted ? `Take back your vote to ${words.verb} now` : `Vote to ${words.verb} now: ${words.together}`;
  for (const chip of ui.rack.querySelectorAll<HTMLElement>('.tb-chip')) {
    chip.classList.toggle('picked', Number(chip.dataset.value) === ctx.selected);
    chip.classList.toggle('off', idle || !fits(ctx, onTable(ctx) + Number(chip.dataset.value)));
  }
  for (const el of game.spots.values()) if (el instanceof HTMLButtonElement) el.disabled = ctx.watching;
}
