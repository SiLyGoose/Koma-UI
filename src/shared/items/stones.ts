import { el } from './items';

/*
 * King's Raid's Technomagic Gear Upgrade Stones, one kind for each class: what awakens a TechnoMagic piece of that class (the
 * bot's constants/technomagic.ts TM_STONES), dropped by the TechnoMagic Raid from stage 7. Their pictures are King's Raid's
 * (public/kr/items/TECHNOMAGIC_UPGRADE_<CLASS>.webp, cut from its item atlas).
 */

/** A class's stones' name, King's Raid's: "Technomagic Gear Upgrade Stone (Warrior)"; `short`: "Upgrade Stones (Warrior)". */
export const stoneName = (cls: string, short = false): string => `${short ? 'Upgrade Stones' : 'Technomagic Gear Upgrade Stone'} (${cls.charAt(0).toUpperCase()}${cls.slice(1)})`;

/** So many of a class's stones, in a few words: "1 Upgrade Stone (Knight)", "3 Upgrade Stones (Knight)". */
export const stoneCount = (cls: string, count: number): string =>
  `${count.toLocaleString('en-US')} Upgrade Stone${count === 1 ? '' : 's'} (${cls.charAt(0).toUpperCase()}${cls.slice(1)})`;

/** A class's stones' picture. */
export const stonePicture = (cls: string): string => `/kr/items/TECHNOMAGIC_UPGRADE_${cls.toUpperCase()}.webp`;

/** A class's stones' picture as an <img> (`className` its class), named for the reader. */
export function stoneIcon(cls: string, className = 'stone-icon'): HTMLImageElement {
  const img = el('img', className);
  img.src = stonePicture(cls);
  img.alt = stoneName(cls);
  img.draggable = false;
  return img;
}
