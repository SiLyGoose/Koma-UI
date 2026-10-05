import { art, el, SLOT_NAME, stars, type Slot } from '../../shared/items/items';
import { copyById, type GearContext } from './context';

/** The three slots round the character: what's in each (or that it's empty). */
export function renderSlots(ctx: GearContext): void {
  for (const button of ctx.ui.slots) {
    const slot = button.dataset.slot as Slot;
    const copy = copyById(ctx, ctx.gear?.equipped[slot] ?? null);
    button.textContent = '';
    button.dataset.stars = copy ? String(copy.stars) : '';
    button.classList.toggle('empty', !copy);
    // A filled slot is an item: its click has the item's sound (an empty one, the plain click).
    if (copy) button.dataset.sfx = 'own';
    else delete button.dataset.sfx;
    button.classList.toggle('masterwork', copy?.masterwork === true);
    button.classList.toggle('filtered', ctx.filter === slot);
    button.setAttribute('aria-label', copy ? `${SLOT_NAME[slot]}: ${copy.name}` : `${SLOT_NAME[slot]}: empty`);
    const frame = el('span', 'slot-frame');
    frame.append(art(copy?.itemId ?? null, slot));
    if (copy) {
      frame.append(el('span', 'slot-level', `R${copy.level}`), stars(copy.stars));
    }
    button.append(frame, el('span', 'slot-name', SLOT_NAME[slot]));
  }
}
