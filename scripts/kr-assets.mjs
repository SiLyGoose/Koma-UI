/*
 * Copies the models the TechnoMagic Raid page shows (src/technomagic/assets/ names them) into
 * public/kr/, which is committed and deployed with the site. Each goes
 * where its owner's files are kept (src/technomagic/assets/paths.ts): heroes/<hero>/…, bosses/<boss>/…,
 * effects/….
 *
 *   node scripts/kr-assets.mjs
 *
 * Each model is a folder holding its .fbx and textures; they are looked for in the folders below, or
 * in the ones KR_SOURCES names (separated by ;). The files of a model rigged outside the game's files
 * are looked for in the folders KR_RIGGED names (but an animation of the game's own, a cutscene's: a model,
 * looked for as the others are).
 */
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
// Node reads the TypeScript as it is (its types are only left out).
import { BOSS_ASSETS, EFFECTS, HERO_ASSETS, animationsIn, effectFolder, modelFolder, portraitFile, skillFile } from '../src/technomagic/assets/index.ts';

const downloads = join(homedir(), 'Downloads');
const sources = (
  process.env.KR_SOURCES?.split(';') ?? [
    join(downloads, 'Heroes-001/Creature Hero'),
    join(downloads, 'Characters Other/Creature Boss and Other'),
    join(downloads, 'Characters Other/Creature Monster'),
    join(downloads, 'Maps, Items, Other/Other'),
  ]
).filter(Boolean);
const made = (process.env.KR_RIGGED?.split(';') ?? [join(downloads, 'Kirze-Mixamo'), downloads]).filter(Boolean);
const out = resolve(import.meta.dirname, '../public/kr');

let missing = 0;

/** Copies a model's folder (found by its name in the sources) to where it is kept, under public/kr/. */
function copyModel(name, to) {
  const from = sources.map((source) => join(source, name)).find((path) => existsSync(path));
  if (!from) {
    console.error(`not found: ${name}`);
    missing++;
    return;
  }
  cpSync(from, join(out, to), { recursive: true });
  console.log(`copied ${to}`);
}

/**
 * Copies the files of a model rigged outside the game's files (one for each animation) from where they were made
 * (a rig borrowed whole is copied with the hero whose it is).
 */
function copyRigged(rigged, hero) {
  if (rigged.of !== undefined && rigged.of !== hero.folder) return;
  const to = modelFolder(hero, rigged.folder);
  mkdirSync(join(out, to), { recursive: true });
  // (A rig read only for its skills' animations has no idle or run. An animation of the game's own is a model of its own: copied as one.)
  const ours = Object.values(rigged.skills ?? {}).filter((skill) => skill.folder !== undefined);
  for (const { folder } of ours) copyModel(folder, modelFolder(hero, folder));
  const files = animationsIn(rigged).filter((file) => !ours.some((skill) => skill.file === file));
  for (const file of files) {
    const from = made.map((place) => join(place, file)).find((path) => existsSync(path));
    if (!from) {
      console.error(`not found: ${file}`);
      missing++;
      continue;
    }
    cpSync(from, join(out, to, file));
    console.log(`copied ${to}/${file}`);
  }
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
    if (model.kind === 'rigged') copyRigged(model, hero);
    else {
      for (const part of [...model.parts, model.left, model.right, model.floating?.model, model.repaint?.to].filter(Boolean)) copyModel(part, modelFolder(hero, part));
      // What moves it, when that is a rig read for its animations alone.
      if (typeof model.movedBy === 'object') copyRigged(model.movedBy, hero);
    }
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
