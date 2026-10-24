import { el } from './items';

/*
 * King's Raid's Rune Fragments: what disassembling a rune gives, and what Mysterious Runes are crafted from (the bot's
 * protocol/runes.ts). Its picture is King's Raid's (public/kr/items/RUNE_FRAGMENT.webp, cut from its item atlas).
 */

/** So many Rune Fragments, in a few words: "1 Rune Fragment", "150 Rune Fragments". */
export const fragmentCount = (count: number): string => `${count.toLocaleString('en-US')} Rune Fragment${count === 1 ? '' : 's'}`;

/** The Rune Fragment's picture as an <img> (`className` its class), named for the reader, to stand beside a number. */
export function fragmentIcon(className = 'frag-icon'): HTMLImageElement {
  const img = el('img', className);
  img.src = '/kr/items/RUNE_FRAGMENT.webp';
  img.alt = 'Rune Fragments';
  img.title = 'Rune Fragments';
  img.draggable = false;
  return img;
}
