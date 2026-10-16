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
