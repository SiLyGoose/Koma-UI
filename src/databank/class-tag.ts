import { el } from '../shared/items';

/*
 * A class item's tag: the raid class its effects only work for (the bot's DatabankItem.class). On a card
 * it is the class's badge in the corner (public/gear/classes/<id>.png); in the details, the badge and
 * "<Class> item" on a plaque.
 */

function badge(id: string): HTMLImageElement {
  const img = el('img');
  img.src = `/gear/classes/${id}.png`;
  img.alt = '';
  img.draggable = false;
  return img;
}

/** The badge in a card's corner. */
export function classBadge(id: string, name: string): HTMLElement {
  const tag = el('span', 'db-class-badge');
  tag.title = `${name} class item`;
  tag.append(badge(id));
  return tag;
}

/** The tag under an item's name in the details. */
export function classTag(id: string, name: string): HTMLElement {
  const tag = el('span', 'db-class-tag');
  tag.title = `Its effects only work for a raider of the ${name} class`;
  tag.append(badge(id), `${name} item`);
  return tag;
}
