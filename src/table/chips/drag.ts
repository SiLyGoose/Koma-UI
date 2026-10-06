import { place, takeBack } from './betting';
import { chipEl, stackChips } from './chips';
import { busy, type TableContext } from '../context';
import { chipLabel } from '../format';
import { pick } from './rack';

export type DragFrom<S extends string> = { from: 'rack'; value: number } | { from: 'spot'; spot: S };

const spotOf = <S extends string>(el: Element | null): S | undefined => el?.closest<HTMLElement>('[data-spot]')?.dataset.spot as S | undefined;

/**
 * A chip picked up: a copy follows the pointer, and where it's let go decides what happens. From the
 * rack: onto a spot puts it there. From a spot (this page's whole stack): onto another spot moves it,
 * off the table takes it back. A press that hardly moves is a tap: it picks the chip (or bets the picked one).
 */
export function startDrag<S extends string, R, X>(ctx: TableContext<S, R, X>, e: PointerEvent, from: DragFrom<S>): void {
  const { game } = ctx;
  if (ctx.watching || e.button !== 0) return;
  const startX = e.clientX;
  const startY = e.clientY;
  let ghost: HTMLElement | null = null;
  let over: HTMLElement | null = null;
  const target = e.currentTarget as HTMLElement;
  target.setPointerCapture(e.pointerId);

  const spotAt = (x: number, y: number): HTMLElement | null => {
    const spot = spotOf<S>(document.elementFromPoint(x, y));
    return spot ? (game.spots.get(spot) ?? null) : null;
  };

  const move = (ev: PointerEvent): void => {
    if (busy(ctx)) return;
    if (!ghost && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 6) return;
    if (!ghost) {
      const value = from.from === 'rack' ? from.value : (ctx.bets[from.spot] ?? 0);
      ghost = from.from === 'rack' ? chipEl(value) : chipEl(stackChips(value, ctx.state?.chips ?? []).at(-1) ?? value);
      if (from.from === 'spot') ghost.textContent = chipLabel(value);
      ghost.classList.add('tb-ghost');
      document.body.append(ghost);
      if (from.from === 'spot') game.spots.get(from.spot)?.classList.add('lifting');
    }
    ghost.style.left = `${ev.clientX}px`;
    ghost.style.top = `${ev.clientY}px`;
    const spot = spotAt(ev.clientX, ev.clientY);
    if (spot !== over) {
      over?.classList.remove('over');
      over = spot;
      over?.classList.add('over');
    }
  };

  const up = (ev: PointerEvent): void => {
    target.removeEventListener('pointermove', move);
    target.removeEventListener('pointerup', up);
    target.removeEventListener('pointercancel', up);
    over?.classList.remove('over');
    if (from.from === 'spot') game.spots.get(from.spot)?.classList.remove('lifting');
    const dropped = ghost ? spotAt(ev.clientX, ev.clientY) : null;
    ghost?.remove();
    const to = spotOf<S>(dropped);
    if (!ghost) {
      // A tap.
      if (from.from === 'rack') pick(ctx, from.value);
      else place(ctx, from.spot, ctx.selected);
      return;
    }
    if (ev.type === 'pointercancel') return;
    if (from.from === 'rack') {
      if (to) place(ctx, to, from.value);
      return;
    }
    const amount = ctx.bets[from.spot] ?? 0;
    if (to === from.spot) return;
    // Moved to another spot: just the place sound, not a take-back and a place.
    takeBack(ctx, from.spot, !to);
    if (to) place(ctx, to, amount);
  };

  target.addEventListener('pointermove', move);
  target.addEventListener('pointerup', up);
  target.addEventListener('pointercancel', up);
}
