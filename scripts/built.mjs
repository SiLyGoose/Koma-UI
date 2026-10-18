// Which of the site's pictures `yarn build` also makes as WebP (./pictures.mjs makes them; vite.config.ts tells the pages
// which there are, src/shared/built.ts): every PNG in FOLDERS, under public/built/ at the same path, .webp in place of
// .png. A TechnoMagic model's texture comes as two PNGs, its colour and its (AS) picture (whose red is how solid each part
// is): its WebP is the two put together (src/technomagic/engine/models.ts does that in the page otherwise), and the (AS)
// one has none of its own.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** The folders (under public/) whose PNGs are made as WebP. */
export const FOLDERS = ['gear/items/', 'kr/heroes/', 'kr/bosses/', 'technomagic/portraits/', 'technomagic/transcend/'];

/** Where built pictures go, under public/ (and so where the pages find them). */
export const BUILT_DIR = 'built';

/** A texture's colour picture, by the name of either of its two (models.ts's colourOf: the two must say the same). */
export const colourOf = (file) => file.replace('(AS)', '(RGB)').replace(/_AS(\.\w+)$/, '_D$1');
/** A texture's (AS) picture, by its colour's name (the same name: it has none). models.ts's solidOf. */
export const solidOf = (file) => file.replace('(RGB)', '(AS)').replace(/_D(\.\w+)$/, '_AS$1');

/** Whether a picture (its path under public/) is a model's, whose WebP is its colour and (AS) put together. */
export const isTexture = (path) => /^kr\/[^/]+\/[^/]+\/models\//.test(path);
/** Whether a picture is a texture's (AS) half: no WebP of its own (its colour's has it). */
export const isSolid = (path) => isTexture(path) && colourOf(path) !== path;

/** The built picture's path (under public/) for a picture's. */
export const builtPath = (path) => `${BUILT_DIR}/${path.replace(/\.png$/i, '.webp')}`;

/**
 * A model texture this big or bigger (its longer side, in pixels) is also made at half its size each way, a quarter of
 * the memory, for a device short of it (src/technomagic/engine/memory.ts): in public/built/small/, at the same path.
 */
export const SMALL_FROM = 1024;
/** The half-size built picture's path (under public/) for a texture's. */
export const smallPath = (path) => `${BUILT_DIR}/small/${path.replace(/\.png$/i, '.webp')}`;

/** Every picture (its path under public/, with /) that is made as WebP. */
export function pictures(pub) {
  const found = [];
  const walk = (dir) => {
    if (!existsSync(join(pub, dir))) return;
    for (const entry of readdirSync(join(pub, dir), { withFileTypes: true })) {
      const path = `${dir}${entry.name}`;
      if (entry.isDirectory()) walk(`${path}/`);
      else if (/\.png$/i.test(entry.name) && !isSolid(path)) found.push(path);
    }
  };
  for (const folder of FOLDERS) walk(folder);
  return found;
}

/*
 * And King's Raid's animation clips (./clips.mjs makes them): every .json in an animations/ folder of a hero's, boss's
 * or minion's under public/kr/, as a .krc under public/built/ at the same path (src/technomagic/engine/kr-clip-file.js:
 * every number exactly, about half the bytes of the JSON gzipped).
 */

/** The folder (under public/) whose clips are made. */
export const CLIP_FOLDER = 'kr/';

/** Whether a file (its path under public/) is a clip: a .json in an animations/ folder. */
export const isClip = (path) => path.startsWith(CLIP_FOLDER) && /\/animations\/.+\.json$/.test(path);

/** The built clip's path (under public/) for a clip's. */
export const builtClipPath = (path) => `${BUILT_DIR}/${path.replace(/\.json$/, '.krc')}`;

/** Every clip (its path under public/, with /) that is made. */
export function clips(pub) {
  const found = [];
  const walk = (dir) => {
    if (!existsSync(join(pub, dir))) return;
    for (const entry of readdirSync(join(pub, dir), { withFileTypes: true })) {
      const path = `${dir}${entry.name}`;
      if (entry.isDirectory()) walk(`${path}/`);
      else if (isClip(path)) found.push(path);
    }
  };
  walk(CLIP_FOLDER);
  return found;
}
