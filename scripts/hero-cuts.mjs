// The heroes' faces and busts the site's pages show (src/shared/heroes.ts heroCut: the heroes page's roster, the shop's
// cards, the databank, a unique weapon's corner, the TechnoMagic Raid's prep), cut as the site is built (`yarn build`
// runs this): each hero in each of BUILT_CUTS's frames, a small picture of its own in public/hero-cuts/ (not kept in
// git), named by cutFile(). A page fetches that in place of the hero's whole picture, which it would otherwise fetch
// and cut itself (as it does in `yarn dev`, and for any cut that isn't there). So nothing here stops a build: what
// can't be cut is left for the pages to cut.
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pub = resolve(root, 'public');
const out = resolve(pub, 'hero-cuts');

try {
  const made = await cutAll();
  console.log(`hero-cuts: ${made} cut into public/hero-cuts/`);
} catch (error) {
  console.warn(`hero-cuts: none cut (the pages will cut them): ${error instanceof Error ? error.message : error}`);
}

async function cutAll() {
  const { default: sharp } = await import('sharp');
  const { heroes, ids } = await readHeroes();
  mkdirSync(out, { recursive: true });
  const made = new Set();
  const cutting = [];
  for (const id of ids) {
    for (const [frame, width] of heroes.BUILT_CUTS) {
      const area = heroes.cutArea(id, frame, width);
      if (!area) continue;
      const file = heroes.cutFile(id, area);
      if (made.has(file)) continue;
      made.add(file);
      cutting.push(
        cut(sharp, join(pub, decodeURIComponent(area.src)), area, join(pub, file)).catch((error) => {
          made.delete(file);
          console.warn(`hero-cuts: ${id}'s ${file} not cut: ${error.message}`);
        }),
      );
    }
  }
  await Promise.all(cutting);
  // The ones from before (a picture's crop or a frame changed since): gone.
  for (const name of readdirSync(out)) if (!made.has(`/hero-cuts/${name}`)) rmSync(join(out, name));
  return made.size;
}

/**
 * src/shared/heroes.ts, and every hero's id (its folder's name). That file imports ../items for el() (which its
 * skill words use, and this doesn't), whose sounds need a window: here, an el() that is never called in its place.
 */
async function readHeroes() {
  const server = await createServer({
    configFile: false,
    root,
    logLevel: 'error',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true },
    plugins: [
      {
        name: 'no-window',
        enforce: 'pre',
        resolveId: (id, importer) => (id === './items' && importer?.replaceAll('\\', '/').endsWith('/src/shared/heroes.ts') ? '\0no-window-items' : null),
        load: (id) => (id === '\0no-window-items' ? 'export const el = () => { throw new Error("no document here"); };' : null),
      },
    ],
  });
  try {
    const heroes = await server.ssrLoadModule('/src/shared/heroes.ts');
    const { HERO_ASSETS } = await server.ssrLoadModule('/src/technomagic/assets/index.ts');
    return { heroes, ids: HERO_ASSETS.map((hero) => hero.folder.replace(/^heroes\//, '')) };
  } finally {
    await server.close();
  }
}

/** Cuts `area` out of the picture at `source`, as a page's canvas would (drawImage: what falls off the picture left clear), into `dest`. */
async function cut(sharp, source, { from, width, height }, dest) {
  const { width: w, height: h } = await sharp(source).metadata();
  // The whole picture at the cut's scale, edged with clear where the cut goes off it, then the cut taken out.
  const scale = { x: width / from.w, y: height / from.h };
  const size = { width: Math.max(1, Math.round(w * scale.x)), height: Math.max(1, Math.round(h * scale.y)) };
  const at = { left: Math.round(from.x * scale.x), top: Math.round(from.y * scale.y) };
  const edge = {
    left: Math.max(0, -at.left),
    top: Math.max(0, -at.top),
    right: Math.max(0, at.left + width - size.width),
    bottom: Math.max(0, at.top + height - size.height),
  };
  const scaled = await sharp(source).ensureAlpha().resize(size.width, size.height, { fit: 'fill' }).png().toBuffer();
  const edged = await sharp(scaled).extend({ ...edge, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp(edged)
    .extract({ left: at.left + edge.left, top: at.top + edge.top, width, height })
    .webp({ quality: 85, alphaQuality: 90 })
    .toFile(dest);
}
