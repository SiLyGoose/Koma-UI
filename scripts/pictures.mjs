// The site's pictures as WebP, made as the site is built (`yarn build` runs this): each picture ./built.mjs names, at the
// same path in public/built/ (not kept in git), mostly a fifth of the size or less; a TechnoMagic model texture's colour
// and (AS) pictures put together into one. The pages ask for these in place of the originals once built
// (src/shared/built.ts), and for the originals in `yarn dev` or wherever one couldn't be made. So nothing here stops a
// build. One made before, whose pictures haven't changed since, is kept as it is.
import { cpus } from 'node:os';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILT_DIR, builtPath, isTexture, pictures, solidOf } from './built.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pub = resolve(root, 'public');
const out = resolve(pub, BUILT_DIR);

/** How a picture is made. A texture's colour a little better (it's seen close up, its colour sharp-edged), its alpha exact (cut out at half: alphaTest). */
const PICTURE = { quality: 82 };
const TEXTURE = { quality: 90, alphaQuality: 100, smartSubsample: true };

try {
  const { made, kept, failed } = await makeAll();
  console.log(`pictures: ${made} made, ${kept} kept as they were, into public/${BUILT_DIR}/${failed ? ` (${failed} not made: the pages use their PNGs)` : ''}`);
} catch (error) {
  console.warn(`pictures: none made (the pages use the PNGs): ${error instanceof Error ? error.message : error}`);
}

async function makeAll() {
  const { default: sharp } = await import('sharp');
  sharp.concurrency(1);
  const paths = pictures(pub);
  const wanted = new Set(paths.map((path) => join(pub, builtPath(path))));
  let made = 0;
  let kept = 0;
  let failed = 0;
  const jobs = paths.map((path) => async () => {
    const source = join(pub, path);
    const dest = join(pub, builtPath(path));
    const solid = isTexture(path) ? join(pub, solidOf(path)) : null;
    const halves = [source, ...(solid && solid !== source && existsSync(solid) ? [solid] : [])];
    if (existsSync(dest) && halves.every((half) => statSync(half).mtimeMs <= statSync(dest).mtimeMs)) return void kept++;
    try {
      mkdirSync(dirname(dest), { recursive: true });
      if (halves.length === 2) {
        // The colour, see-through where its (AS) picture's red says (that drawn at the colour's size, as models.ts draws it;
        // where the (AS) picture is itself clear, clear). Put together pixel by pixel: sharp's joinChannel after removeAlpha
        // loses the joined alpha.
        const colour = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        const { width, height } = colour.info;
        const solidRaw = await sharp(halves[1]).resize(width, height, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
        const rgba = Buffer.alloc(width * height * 4);
        for (let i = 0; i < width * height; i++) {
          rgba[i * 4] = colour.data[i * 3];
          rgba[i * 4 + 1] = colour.data[i * 3 + 1];
          rgba[i * 4 + 2] = colour.data[i * 3 + 2];
          rgba[i * 4 + 3] = solidRaw[i * 4 + 3] === 0 ? 0 : solidRaw[i * 4];
        }
        await sharp(rgba, { raw: { width, height, channels: 4 } }).webp(TEXTURE).toFile(dest);
      } else {
        await sharp(source).webp(isTexture(path) ? TEXTURE : PICTURE).toFile(dest);
      }
      made++;
    } catch (error) {
      failed++;
      rmSync(dest, { force: true });
      console.warn(`pictures: ${path} not made: ${error instanceof Error ? error.message : error}`);
    }
  });
  // A few at a time (sharp works on threads of its own: one each).
  const running = Array.from({ length: Math.max(1, cpus().length) }, async () => {
    for (let job = jobs.shift(); job; job = jobs.shift()) await job();
  });
  await Promise.all(running);
  // The ones from before (a picture since gone or renamed): gone.
  const tidy = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) tidy(file);
      else if (!wanted.has(file)) rmSync(file);
    }
  };
  if (existsSync(out)) tidy(out);
  return { made, kept, failed };
}
