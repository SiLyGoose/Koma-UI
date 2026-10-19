import { type ArmoryCopy, el, itemFace, lockBadge } from '../../shared/items';

/** A copy's card on the anvil (as in the armory, but not a button): their gear's, or a hero's gear's. */
export function card(copy: ArmoryCopy): HTMLElement {
  const box = el('span', 'item');
  box.dataset.stars = String(copy.stars);
  box.append(...itemFace(copy));
  if (copy.locked) box.append(lockBadge());
  return box;
}
