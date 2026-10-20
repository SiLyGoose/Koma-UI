// The items' pictures blurred, for a card to show while its picture loads (src/shared/items/blur.ts): every King's Raid
// icon (public/kr/items/) and every item's own picture (public/gear/items/), each shrunk to CELL pixels a side, together in
// one sheet (public/built/blur/items-<hash>.webp: a new name when it changes, as it is kept an hour), with its index
// (public/built/blur/index.json, put in the pages by vite.config.ts): the sheet, how many across and down, each picture's
// address in order, and King's Raid's hero gear's icons by item id (from src/technomagic/sim/gear/kr-data.ts: the gear
// page's copies don't say them). ./pictures.mjs makes it with the rest; made before and nothing changed since, kept.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BLUR_DIR, BLUR_INDEX } from './built.mjs';

/** Each picture's size in the sheet (px a side), and how many go across it. */
const CELL = 8;
const ACROSS = 32;

/** The pictures, by their addresses on the site, with their files. */
function sources(pub) {
  const found = [];
  const add = (dir, test) => {
    if (!existsSync(join(pub, dir))) return;
    for (const name of readdirSync(join(pub, dir)).sort()) if (test.test(name)) found.push({ address: `/${dir}/${name}`, file: join(pub, dir, name) });
  };
  add('kr/items', /\.webp$/i);
  for (const folder of ['weapons', 'armor', 'treasures']) add(`gear/items/${folder}`, /\.png$/i);
  return found;
}

/** King's Raid's pieces' and artifacts' icons by item id, as kr-data.ts lists them (its runes left out). */
function krIcons(data) {
  const text = readFileSync(data, 'utf8');
  const icons = {};
  for (const list of ['KR_PIECES', 'KR_ARTIFACTS']) {
    const from = text.indexOf(`export const ${list}`);
    if (from < 0) continue;
    const body = text.slice(from, text.indexOf('\n];', from));
    for (const [, id, icon] of body.matchAll(/^\s*\{"id":"([^"]+)".*"icon":"([^"]+)"\}/gm)) icons[id] = icon;
  }
  return icons;
}

/** Makes the sheet and its index (unless they're there and up to date). Returns the files made (under public/), for ./pictures.mjs to keep. */
export async function makeBlur(sharp, pub, root) {
  const pictures = sources(pub);
  const data = join(root, 'src/technomagic/sim/gear/kr-data.ts');
  const indexFile = join(pub, BLUR_INDEX);
  const newest = Math.max(...pictures.map(({ file }) => statSync(file).mtimeMs), existsSync(data) ? statSync(data).mtimeMs : 0);
  if (existsSync(indexFile) && statSync(indexFile).mtimeMs >= newest) {
    const before = JSON.parse(readFileSync(indexFile, 'utf8'));
    const sheet = join(pub, before.sheet.slice(1));
    if (existsSync(sheet) && JSON.stringify(before.pictures) === JSON.stringify(pictures.map(({ address }) => address))) return { files: [indexFile, sheet], made: false };
  }
  const down = Math.ceil(pictures.length / ACROSS);
  const cells = await Promise.all(
    pictures.map(async ({ file }, i) => ({
      input: await sharp(file).resize(CELL, CELL, { fit: 'cover' }).removeAlpha().png().toBuffer(),
      left: (i % ACROSS) * CELL,
      top: Math.floor(i / ACROSS) * CELL,
    })),
  );
  const sheet = await sharp({ create: { width: ACROSS * CELL, height: down * CELL, channels: 3, background: '#141318' } })
    .composite(cells)
    .webp({ quality: 70 })
    .toBuffer();
  const name = `${BLUR_DIR}/items-${createHash('sha1').update(sheet).digest('hex').slice(0, 10)}.webp`;
  mkdirSync(join(pub, BLUR_DIR), { recursive: true });
  writeFileSync(join(pub, name), sheet);
  const index = { sheet: `/${name}`, across: ACROSS, down, pictures: pictures.map(({ address }) => address), kr: existsSync(data) ? krIcons(data) : {} };
  writeFileSync(indexFile, JSON.stringify(index));
  return { files: [indexFile, join(pub, name)], made: true };
}
