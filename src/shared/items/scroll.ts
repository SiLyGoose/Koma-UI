import { el } from './items';

/*
 * King's Raid's Transcendence Attribute Point (5 TP), its coin: crafted from any one boss's Boss Crystals (the inventory's
 * Craft tab), held in Others, and used on a hero in its Transcend tab, each giving it TP_SCROLL_POINTS more TP (the bot's
 * protocol/heroes.ts, where it is still a "scroll"). Its picture is KR's own (NguiAtlas_Icon_Item_Item3 TRANCEND_5POINT).
 */

export const SCROLL_NAME = 'Transcendence Attribute Point (5 TP)';

/** So many of them, in a few words: "1 Transcendence Attribute Point (5 TP)", "3 Transcendence Attribute Points (5 TP)". */
export const scrollCount = (count: number): string => `${count.toLocaleString('en-US')} ${scrollsName(count)}`;

/** Its name for `count` of them: "Transcendence Attribute Points (5 TP)" past one. */
export const scrollsName = (count: number): string => (count === 1 ? SCROLL_NAME : SCROLL_NAME.replace('Point', 'Points'));

const SRC = '/kr/items/TRANCEND_5POINT.webp';

/** Its picture as an <img> (`className` its class); `named`: named for the reader, to stand beside a number. */
export function scrollPicture(className = '', named = false): HTMLImageElement {
  const img = el('img', className);
  img.src = SRC;
  img.alt = named ? scrollsName(2) : '';
  if (named) img.title = scrollsName(2);
  img.draggable = false;
  return img;
}
