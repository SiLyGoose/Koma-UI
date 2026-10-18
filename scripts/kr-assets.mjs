/*
 * Copies the models the TechnoMagic Raid page shows (src/technomagic/assets/ names them) into
 * public/kr/, which is committed and deployed with the site. Each goes
 * where its owner's files are kept (src/technomagic/assets/paths.ts): heroes/<hero>/…, bosses/<boss>/…,
 * effects/….
 *
 *   node scripts/kr-assets.mjs [--force]
 *
 * A model already there is kept as it is (its textures may have been put right since: KR-extracted/scripts/kr-tints.py),
 * unless --force, which copies every one again.
 *
 * Each model is a folder holding its .fbx and textures; they are looked for in the folders below, or
 * in the ones KR_SOURCES names (separated by ;). (Their animations, King's Raid's own, are made by
 * KR-extracted/scripts/tm-anims.mjs.)
 */
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
// Node reads the TypeScript as it is (its types are only left out).
import { BOSS_ASSETS, EFFECTS, HERO_ASSETS, effectFolder, modelFolder, portraitFile, skillFile } from '../src/technomagic/assets/index.ts';

const downloads = join(homedir(), 'Downloads');
const sources = (
  process.env.KR_SOURCES?.split(';') ?? [
    join(downloads, 'Heroes-001/Creature Hero'),
    join(downloads, 'Characters Other/Creature Boss and Other'),
    join(downloads, 'Characters Other/Creature Monster'),
    join(downloads, 'Maps, Items, Other/Other'),
  ]
).filter(Boolean);
const out = resolve(import.meta.dirname, '../public/kr');
const force = process.argv.includes('--force');

let missing = 0;

/** Copies a model's folder (found by its name in the sources) to where it is kept, under public/kr/ (unless it is there already). */
function copyModel(name, to) {
  if (!force && existsSync(join(out, to))) return;
  const from = sources.map((source) => join(source, name)).find((path) => existsSync(path));
  if (!from) {
    console.error(`not found: ${name}`);
    missing++;
    return;
  }
  cpSync(from, join(out, to), { recursive: true });
  console.log(`copied ${to}`);
}

/** Fetches a picture from where it is published to where it is kept, unless it is there already. */
async function fetchPicture(from, to) {
  if (existsSync(join(out, to))) return;
  try {
    const got = await fetch(from);
    if (!got.ok) throw new Error(String(got.status));
    mkdirSync(dirname(join(out, to)), { recursive: true });
    writeFileSync(join(out, to), Buffer.from(await got.arrayBuffer()));
    console.log(`fetched ${to}`);
  } catch (error) {
    console.error(`not fetched: ${from} (${error.message})`);
    missing++;
  }
}

mkdirSync(out, { recursive: true });

for (const boss of BOSS_ASSETS) for (const model of boss.models) copyModel(model, modelFolder(boss, model));

for (const effect of Object.values(EFFECTS)) copyModel(effect.folder, effectFolder(effect));

for (const hero of HERO_ASSETS) {
  for (const { model, portrait } of hero.skins) {
    for (const part of [...model.parts, model.left, model.right, model.floating?.model, model.repaint?.to].filter(Boolean)) copyModel(part, modelFolder(hero, part));
    // Its picture for its card, when it is one that is fetched (the others are kept with the page).
    if (portrait?.from) await fetchPicture(portrait.from, portraitFile(hero, portrait));
  }
  // What its skills bring onto the field, and its unique weapon's models.
  for (const prop of Object.values(hero.props ?? {})) copyModel(prop, modelFolder(hero, prop));
  for (const model of Object.values(hero.unique ?? {})) copyModel(model, modelFolder(hero, model));
  // The pictures on its skills.
  for (const file of hero.skills.files) await fetchPicture(hero.skills.from + file, skillFile(hero, file));
}

process.exit(missing ? 1 : 0);
