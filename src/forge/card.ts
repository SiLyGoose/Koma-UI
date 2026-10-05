import type { GearCopy } from '../shared/items/gear';
import { el, itemFace, lockBadge } from '../shared/items/items';

/** A copy's card on the anvil (as in the armory, but not a button). */
export function card(copy: GearCopy): HTMLElement {
  const box = el('span', 'item');
  box.dataset.stars = String(copy.stars);
  box.classList.toggle('masterwork', copy.masterwork);
  box.append(...itemFace(copy));
  if (copy.locked) box.append(lockBadge());
  return box;
}
