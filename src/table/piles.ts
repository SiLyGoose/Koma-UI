import { points } from '../shared/format';
import { avatarImg } from './avatar';
import { chipEl, stackChips } from './chips';
import { chipLabel } from './format';
import type { Pile } from './types';

function amountText(amount: number): HTMLElement {
  const b = document.createElement('b');
  b.textContent = amount >= 10_000 ? chipLabel(amount) : points(amount);
  return b;
}

/**
 * Draws the chips on a big spot: this page's as a stack (with the amount beside it) and everyone
 * else's as their picture and how much (on a phone), or everyone's as stacks side by side in seat
 * order, each with its owner's picture and amount under it (on a computer). The spot has an empty
 * `.tb-stack`, `.tb-others` and `.tb-piles` for them.
 */
export function renderPiles(el: HTMLElement, piles: Pile[], chips: readonly number[]): void {
  const stack = el.querySelector('.tb-stack') as HTMLElement;
  stack.textContent = '';
  const mine = piles.find((p) => p.mine);
  if (mine) {
    stackChips(mine.amount, chips).forEach((value, i) => {
      const chip = chipEl(value);
      chip.style.setProperty('--i', String(i));
      stack.append(chip);
    });
    const label = document.createElement('span');
    label.className = 'tb-stack-amount';
    label.textContent = points(mine.amount);
    stack.append(label);
  }
  const row = el.querySelector('.tb-others') as HTMLElement;
  row.textContent = '';
  for (const pile of piles) {
    if (pile.mine) continue;
    const pill = document.createElement('span');
    pill.className = 'tb-other';
    if (pile.outcome) pill.classList.add(pile.outcome);
    if (pile.refused) pill.classList.add('refused');
    pill.append(avatarImg(pile.seat, 'tb-other-avatar'), amountText(pile.amount));
    pill.title = `${pile.seat.name}: ${points(pile.amount)}`;
    row.append(pill);
  }
  const heaps = el.querySelector('.tb-piles') as HTMLElement;
  heaps.textContent = '';
  for (const pile of piles) {
    const heap = document.createElement('span');
    heap.className = 'tb-pile';
    if (pile.mine) heap.classList.add('mine');
    if (pile.outcome) heap.classList.add(pile.outcome);
    if (pile.refused) heap.classList.add('refused');
    heap.title = `${pile.mine ? 'You' : pile.seat.name}: ${points(pile.amount)}`;
    const stacked = document.createElement('span');
    stacked.className = 'tb-pile-chips';
    const values = stackChips(pile.amount, chips);
    values.forEach((value, i) => {
      const chip = chipEl(value);
      chip.style.setProperty('--i', String(i));
      stacked.append(chip);
    });
    stacked.style.setProperty('--n', String(values.length));
    const tag = document.createElement('span');
    tag.className = 'tb-pile-tag';
    tag.append(avatarImg(pile.seat, 'tb-pile-avatar'), amountText(pile.amount));
    heap.append(stacked, tag);
    heaps.append(heap);
  }
  // A busy spot (up to 8 players at a table) gets smaller piles, so they still fit side by side.
  heaps.classList.toggle('crowded', heaps.childElementCount > 4);
}
