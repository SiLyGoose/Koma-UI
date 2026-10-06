import { points } from '../shared/util';
import { avatarImg } from '../table/avatar';
import { chipEl, stackChips } from '../table/chips';
import { chipLabel } from '../table/format';
import type { Pile } from '../table/table';

/**
 * The chips on a spot: one chip (this page's, with how much) and the pictures of whoever else has
 * chips there. The spots are small, so everyone's chips are one marker, like at a real table.
 */
export function renderSpot(el: HTMLElement, piles: Pile[], chips: readonly number[]): void {
  const marker = el.querySelector('.rl-marker') as HTMLElement;
  marker.textContent = '';
  marker.className = 'rl-marker';
  if (piles.length === 0) return;
  const mine = piles.find((p) => p.mine);
  const others = piles.filter((p) => !p.mine);
  const total = piles.reduce((sum, p) => sum + p.amount, 0);
  const amount = mine?.amount ?? total;
  const chip = chipEl(stackChips(amount, chips).at(-1) ?? chips[0] ?? 1);
  chip.textContent = chipLabel(amount);
  chip.classList.toggle('theirs', !mine);
  marker.append(chip);
  for (const pile of others.slice(0, 3)) marker.append(avatarImg(pile.seat, 'rl-marker-avatar'));
  if (others.length > 3) {
    const more = document.createElement('span');
    more.className = 'rl-marker-more';
    more.textContent = `+${others.length - 3}`;
    marker.append(more);
  }
  const outcome = mine?.outcome ?? others.find((p) => p.outcome === 'win')?.outcome ?? others[0]?.outcome;
  if (outcome) marker.classList.add(outcome);
  if (mine?.refused) marker.classList.add('refused');
  marker.title = piles.map((p) => `${p.mine ? 'You' : p.seat.name}: ${points(p.amount)}`).join('\n');
}
