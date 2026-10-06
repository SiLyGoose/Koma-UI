import { points, remember, remembered } from '../../shared/util';
import { chipEl } from './chips';
import type { TableContext } from '../context';
import { startDrag } from './drag';
import { renderBar } from '../render';
import { play } from '../sfx';

const selectedKey = <S extends string, R, X>(ctx: TableContext<S, R, X>): string => `${ctx.game.key}.chip`;

/** The rack of chips (the table's chips, once the bot has said), the one picked last picked again. */
export function buildRack<S extends string, R, X>(ctx: TableContext<S, R, X>): void {
  const { ui, state } = ctx;
  ui.rack.textContent = '';
  for (const value of state?.chips ?? []) {
    const chip = chipEl(value);
    chip.tabIndex = 0;
    chip.setAttribute('role', 'button');
    chip.setAttribute('aria-label', `${points(value)} chip`);
    chip.addEventListener('pointerdown', (e) => startDrag(ctx, e, { from: 'rack', value }));
    chip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pick(ctx, value);
      }
    });
    ui.rack.append(chip);
  }
  const kept = Number(remembered(selectedKey(ctx)));
  pick(ctx, state?.chips.includes(kept) ? kept : (state?.chips[2] ?? state?.chips[0] ?? 0), false);
}

/** Picks the chip worth `value` in the rack (tapping a spot then puts one there). */
export function pick<S extends string, R, X>(ctx: TableContext<S, R, X>, value: number, withSound = true): void {
  ctx.selected = value;
  remember(selectedKey(ctx), String(value));
  if (withSound) play('move');
  renderBar(ctx);
}
