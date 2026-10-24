import { el } from './items';

/*
 * King's Raid's Technomagic Gear Upgrade Stones, one kind for each class: what awakens a TechnoMagic piece of that class (the
 * bot's constants/technomagic.ts TM_STONES), dropped by the TechnoMagic Raid from stage 7. And its Boss Crystals, one kind for
 * each TechnoMagic set, its boss's (TM_CRYSTALS): what crafts its pieces and rerolls their options. Their pictures are King's
 * Raid's (public/kr/items/TECHNOMAGIC_UPGRADE_<CLASS>.webp and TECHNOMAGIC_CRYSTAL_<BOSS>.webp, cut from its item atlas).
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

/** Each TechnoMagic set's boss: whose Boss Crystals craft it (King's Raid's names; its pictures' are the game's own spelling). */
const CRYSTAL_BOSS: Readonly<Record<string, { name: string; code: string }>> = {
  perseverance: { name: 'Galgoria', code: 'GARGORIA' },
  hope: { name: 'Siegfried', code: 'SIEGFRIED' },
  authority: { name: 'Ascalon', code: 'ASCALON' },
};

/** A set's crystals' name, King's Raid's: "Crystal of Galgoria". */
export const crystalName = (set: string): string => `Crystal of ${CRYSTAL_BOSS[set]?.name ?? set}`;

/** So many of a set's crystals: "300 Crystals of Galgoria" ("1 Crystal of Galgoria"). */
export const crystalCount = (set: string, count: number): string => `${count.toLocaleString('en-US')} Crystal${count === 1 ? '' : 's'} of ${CRYSTAL_BOSS[set]?.name ?? set}`;

/** A set's crystals' picture. */
export const crystalPicture = (set: string): string => `/kr/items/TECHNOMAGIC_CRYSTAL_${CRYSTAL_BOSS[set]?.code ?? set.toUpperCase()}.webp`;

/** A set's crystals' picture as an <img> (`className` its class), named for the reader. */
export function crystalIcon(set: string, className = 'crystal-icon'): HTMLImageElement {
  const img = el('img', className);
  img.src = crystalPicture(set);
  img.alt = crystalName(set);
  img.draggable = false;
  return img;
}
