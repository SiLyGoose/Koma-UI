// King's Raid's animation clips as a build sends them (`yarn build` runs this, after ./pictures.mjs): each clip ./built.mjs
// names, at the same path in public/built/ (not kept in git) as a gzipped .krc (src/technomagic/engine/kr-clip-file.js),
// read back and checked against its JSON before it is kept. The pages ask for these in place of the JSON once built
// (src/shared/built.ts), and for the JSON in `yarn dev` or wherever one couldn't be made. So nothing here stops a build. One
// made before, whose JSON hasn't changed since, is kept as it is.
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import { decodeClip, encodeClip } from '../src/technomagic/engine/kr-clip-file.js';
import { builtClipPath, clips } from './built.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pub = resolve(root, 'public');

/** Whether `made` (read back from its file) is `clip`, every number of it. */
function same(clip, made) {
  if (made.name !== clip.name || made.duration !== clip.duration || made.fps !== clip.fps) return false;
  if (JSON.stringify(made.top) !== JSON.stringify(clip.top ?? [])) return false;
  if (made.tracks.length !== clip.tracks.length) return false;
  return clip.tracks.every(([bone, kind, values, at], i) => {
    const [b, k, v, a] = made.tracks[i];
    return b === bone && k === kind && v.length === values.length && v.every((x, j) => Math.abs(x - values[j]) < 1e-9) && JSON.stringify(a ?? null) === JSON.stringify(at ?? null);
  });
}

let made = 0;
let kept = 0;
let failed = 0;
let from = 0;
let to = 0;
for (const path of clips(pub)) {
  const source = join(pub, path);
  const dest = join(pub, builtClipPath(path));
  if (existsSync(dest) && statSync(source).mtimeMs <= statSync(dest).mtimeMs) {
    kept++;
    continue;
  }
  try {
    const text = readFileSync(source);
    const clip = JSON.parse(text.toString('utf8'));
    const file = gzipSync(encodeClip(clip), { level: 9 });
    if (!same(clip, decodeClip(new Uint8Array(gunzipSync(file))))) throw new Error('read back, it is not the same clip');
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, file);
    from += gzipSync(text, { level: 9 }).length;
    to += file.length;
    made++;
  } catch (error) {
    failed++;
    rmSync(dest, { force: true });
    console.warn(`clips: ${path} not made: ${error instanceof Error ? error.message : error}`);
  }
}
const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
console.log(`clips: ${made} made${made ? ` (${mb(to)}, from ${mb(from)} as gzipped JSON)` : ''}, ${kept} kept as they were, into public/built/${failed ? ` (${failed} not made: the pages use their JSON)` : ''}`);
