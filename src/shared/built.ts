import { BUILT, ITEM_ART } from 'virtual:pictures';

/*
 * The site's pictures as the pages ask for them. A build makes a WebP of the pictures in some folders (a fifth of the
 * size or less: scripts/pictures.mjs, in public/built/ at the same path), a TechnoMagic model texture's two halves put
 * together into one; the pages ask for those once built, and for the PNGs in `yarn dev` or wherever one couldn't be
 * made. And which items have a picture at all (public/gear/items/), so none is asked for that isn't there.
 */

const missing = new Set(BUILT?.missing ?? []);

/** Where to get the picture at `src` (an address on this site, like /kr/heroes/kirze/portraits/Kirze.png): its WebP, once built. */
export function built(src: string): string {
  if (!BUILT || !/\.png$/i.test(src) || missing.has(src) || !BUILT.folders.some((folder) => src.startsWith(folder))) return src;
  return `${BUILT.dir}${src.replace(/\.png$/i, '.webp')}`;
}

/** Whether a TechnoMagic texture's colour and (AS) halves come as one picture (built), at built(its colour's address). */
export const texturesBuilt = (src: string): boolean => built(src) !== src;

const small = new Set(BUILT?.small ?? []);

/** Where to get a big TechnoMagic texture (by its colour's address) at half its size each way, built for a device short of memory; null if none was. */
export const builtSmall = (src: string): string | null => (BUILT && small.has(src) ? `${BUILT.dir}/small${src.replace(/\.png$/i, '.webp')}` : null);

const unclipped = new Set(BUILT?.clips.missing ?? []);

/** Where to get the King's Raid clip at `src` (its .json's address): its .krc once built (../technomagic/engine/kr-clip-file.js), else null (its JSON). */
export function builtClip(src: string): string | null {
  if (!BUILT || !/\/animations\/.+\.json$/.test(src) || !src.startsWith(BUILT.clips.folder) || unclipped.has(src)) return null;
  return `${BUILT.dir}${src.replace(/\.json$/, '.krc')}`;
}

const itemArt = { weapons: new Set(ITEM_ART.weapons), armor: new Set(ITEM_ART.armor), treasures: new Set(ITEM_ART.treasures) };

/** Whether item `id` has a picture in public/gear/items/<folder>/. */
export const hasItemArt = (folder: keyof typeof itemArt, id: string): boolean => itemArt[folder].has(id);
