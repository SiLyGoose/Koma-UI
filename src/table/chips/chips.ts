import { chipLabel } from '../format';

/** A chip, as the rack and the stacks draw it: its colour by its value. */
export function chipEl(value: number): HTMLElement {
  const el = document.createElement('span');
  el.className = `tb-chip tb-chip-${value}`;
  el.dataset.value = String(value);
  el.textContent = chipLabel(value);
  return el;
}

/** `amount` as a stack of `chips`: as few as make it up (the biggest first), at most 6 drawn. */
export function stackChips(amount: number, chips: readonly number[]): number[] {
  const sorted = [...(chips.length ? chips : [1])].sort((a, b) => b - a);
  const out: number[] = [];
  let left = amount;
  for (const chip of sorted) {
    while (left >= chip && out.length < 40) {
      out.push(chip);
      left -= chip;
    }
  }
  return out.reverse().slice(-6);
}
