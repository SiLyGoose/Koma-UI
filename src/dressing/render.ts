import { characterOf } from '../shared/characters';
import { el } from '../shared/items';
import { working } from '../shared/ui';
import type { Outfit } from '../shared/outfits';
import { coin, points } from '../shared/util';
import type { DressingContext } from './context';

/** Whether an outfit is the one worn, one of theirs, or still to get from the shop. */
type OutfitState = 'worn' | 'owned' | 'locked';

function stateOf(ctx: DressingContext, outfit: Outfit): OutfitState {
  if (outfit.id === ctx.view?.worn) return 'worn';
  return outfit.owned ? 'owned' : 'locked';
}

/** What the state says: Equipped, Owned, or its price. */
function stateLine(box: HTMLElement, outfit: Outfit, state: OutfitState): void {
  box.dataset.state = state;
  if (state === 'worn') box.replaceChildren('Equipped');
  else if (state === 'owned') box.replaceChildren('Owned');
  else box.replaceChildren(coin('dressing-coin', 'zeiucoins'), el('span', '', points(outfit.price)));
}

/**
 * Its character's head and a little of its body (Character.portrait): the sprite, scaled so that square
 * fills the box, and moved so it's the part showing.
 */
function portrait(id: string): HTMLElement {
  const { sprite, width, portrait: crop } = characterOf(id);
  const box = el('span', 'dressing-portrait');
  box.style.setProperty('--w', String(width));
  box.style.setProperty('--x', String(crop.x));
  box.style.setProperty('--y', String(crop.y));
  box.style.setProperty('--size', String(crop.size));
  const img = el('img');
  img.src = sprite;
  img.alt = '';
  img.draggable = false;
  box.append(img);
  return box;
}

/** One row of the list: the portrait on the left, its name and state on the right. */
function row(ctx: DressingContext, outfit: Outfit): HTMLButtonElement {
  const state = stateOf(ctx, outfit);
  const button = el('button', 'dressing-row');
  button.type = 'button';
  button.setAttribute('role', 'option');
  button.setAttribute('aria-selected', String(outfit.id === ctx.picked));
  button.dataset.outfit = outfit.id;
  button.dataset.state = state;
  const text = el('span', 'dressing-row-text');
  const line = el('span', 'dressing-row-state');
  stateLine(line, outfit, state);
  text.append(el('span', 'dressing-row-name', outfit.name), line);
  button.append(portrait(outfit.id), text);
  return button;
}

/** Draws the room as `ctx.view` has it: the list, and the outfit picked standing on the right. */
export function render(ctx: DressingContext): void {
  const { ui, view } = ctx;
  ui.room.hidden = !view;
  if (!view) return;
  const picked = view.outfits.find((o) => o.id === ctx.picked) ?? view.outfits.find((o) => o.id === view.worn) ?? view.outfits[0];
  if (!picked) return;
  ctx.picked = picked.id;
  ui.list.replaceChildren(...view.outfits.map((outfit) => row(ctx, outfit)));

  const state = stateOf(ctx, picked);
  const character = characterOf(picked.id);
  if (ui.model.getAttribute('src') !== character.sprite) ui.model.src = character.sprite;
  ui.model.alt = picked.name;
  ui.name.textContent = picked.name;
  stateLine(ui.state, picked, state);
  // Theirs: Wear. Worn already: "✓ Equipped" in its place. Not theirs: to the shop.
  ui.wear.hidden = state !== 'owned';
  working(ui.wear, ctx.busy, `wear:${picked.id}`);
  ui.worn.hidden = state !== 'worn';
  ui.get.hidden = state !== 'locked';
}
