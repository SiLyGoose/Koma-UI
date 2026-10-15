import { KIRZE_RUN, type HeroAssets, type PartsModel, type RiggedModel, type SkinAssets } from '../assets';
import type { HeroDef } from '../sim/heroes/kit';
import { motionOf } from '../sim/motion';
import { heroLike, riggedHero, runFrom } from './body/animated';
import type { Hero, Stood } from './body/hero';
import { posedHero } from './body/posed';
import { loadRigged, type Rigged } from './body/rigged';
import { sheathing } from './body/sheath';
import { standHero } from './body/stand';
import { lookOf } from './looks';
import type { HeroMove } from './moves';

/*
 * Reads the heroes' skins and stands each up, ready for a fight (how each looks: ./looks.ts): one that comes with its
 * animations is moved by them, as the fight times them (../sim/motion.ts); one of the game's own files is moved by the animations its skin names (another skin's,
 * or a rig read only for them), or with none by the poses written in code. One with no run among them runs in
 * in Kirze's (KIRZE_RUN), but for one that glides in seated. One whose sword is kept in the sheath in its other hand
 * draws it only for its moves (./body/sheath.ts). A skin that isn't on this computer is left out, and
 * so is whatever would have moved another (with Kirze's run not on it, they run as the poses written in code have them).
 * Read for heroes wielding their unique weapons, each skin that looks otherwise with it is read as it does (the
 * weapon's models in place of its own: HeroAssets.unique), and only those.
 */

/** A skin on the field: whose it is, its body, and whether it is wielding its hero's unique weapon. */
export interface Entrant {
  def: HeroDef;
  skin: SkinAssets;
  hero: Hero;
  unique: boolean;
}

/** A skin of the game's own files as it looks with its hero's unique weapon (null: no otherwise). */
function wielding(owner: HeroAssets, model: PartsModel): PartsModel | null {
  const { unique } = owner;
  if (!unique) return null;
  const swap = <T extends string | undefined>(name: T): T => (name === undefined ? name : ((unique[name] ?? name) as T));
  const made: PartsModel = {
    ...model,
    parts: model.parts.map(swap),
    left: swap(model.left),
    right: swap(model.right),
    ...(model.floating && { floating: { ...model.floating, model: swap(model.floating.model) } }),
  };
  const changed = made.parts.some((part, i) => part !== model.parts[i]) || made.left !== model.left || made.right !== model.right || made.floating?.model !== model.floating?.model;
  return changed ? made : null;
}

/** What was read of a skin: its model stood up (the game's own files) or it with its animations, and the rig read to move it. */
interface Read {
  skin: SkinAssets;
  stood: Stood | null;
  rigged: Rigged | null;
  rig: Rigged | null;
}

/** Null (and a word in the console) when what was being read isn't there. */
const quietly = <T>(reading: Promise<T>): Promise<T | null> =>
  reading.catch((error: unknown) => {
    console.warn(error);
    return null;
  });

/** A skin read (`model`: the skin's own, or as it looks with its unique weapon). */
async function read(def: HeroDef, skin: SkinAssets, model = skin.model): Promise<Read> {
  const { assets } = lookOf(def.id);
  const animated = (name: string, model: RiggedModel): Promise<Rigged | null> => quietly(loadRigged(name, assets, model, def.timing));
  if (model.kind === 'rigged') return { skin, stood: null, rigged: await animated(skin.name, model), rig: null };
  const [stood, rig] = await Promise.all([quietly(standHero(assets, model)), typeof model.movedBy === 'object' ? animated(`${skin.name}'s rig`, model.movedBy) : null]);
  return { skin, stood, rigged: null, rig };
}

/**
 * The skins of `def` to read: each as it is, or (`unique`) each that looks otherwise with its unique weapon, as it does then,
 * and what moves it (another skin, by its name) with it.
 */
function toRead(def: HeroDef, unique: boolean): Promise<Read>[] {
  const { assets } = lookOf(def.id);
  const { skins } = assets;
  if (!unique) return skins.map((skin) => read(def, skin));
  const wielded = skins.flatMap((skin) => {
    const model = skin.model.kind === 'parts' ? wielding(assets, skin.model) : null;
    return model ? [{ skin, model }] : [];
  });
  const movers = new Set(wielded.map(({ model }) => model.movedBy).filter((name) => typeof name === 'string'));
  return [...wielded.map(({ skin, model }) => read(def, skin, model)), ...skins.filter((skin) => movers.has(skin.name)).map((skin) => read(def, skin))];
}

/** Kirze's run, read once (for every hero with none of its own, however many times heroes are read). */
let kirzeRun: Promise<Rigged | null> | null = null;

/**
 * Every skin of `defs` that could be read, in the order of the heroes and of each one's skins; or (`unique`) every one
 * that looks otherwise with its hero's unique weapon, as it does then (none, for a hero whose weapon changes none).
 */
export async function loadHeroes(defs: readonly HeroDef[], { unique = false } = {}): Promise<Entrant[]> {
  kirzeRun ??= quietly(loadRigged("Kirze's run", { folder: KIRZE_RUN.of }, KIRZE_RUN));
  const [all, borrowedRun] = await Promise.all([Promise.all(defs.map((def) => Promise.all(toRead(def, unique)))), kirzeRun]);
  const entrants: Entrant[] = [];
  defs.forEach((def, i) => {
    const skins = all[i] as Read[];
    const look = lookOf(def.id);
    const heroes = new Map<SkinAssets, Hero>();
    // (How long each move lasts, as the fight has it: the sword stays drawn that long.)
    const { moves } = motionOf(def);
    const lasts = (move: HeroMove): number => moves[move].parts.reduce((sum, part) => sum + part.until, 0) / moves[move].speed;
    // The game's own files first: what moves one is made over for it from a skin still standing as it was bound.
    for (const { skin, stood, rig } of skins) {
      if (!stood || skin.model.kind !== 'parts') continue;
      const { movedBy } = skin.model;
      const like = typeof movedBy === 'string' ? (skins.find((other) => other.skin.name === movedBy)?.rigged ?? null) : rig;
      // (Made over from Kirze's before it is moved at all.)
      const run = !look.seated && !like?.animations.run && borrowedRun ? runFrom(stood, borrowedRun) : undefined;
      const posing = { seated: look.seated, bends: look.bends, varied: look.varies, ...(run && { run }) };
      const hero = like ? heroLike(stood, like, look.stands, posing) : posedHero(stood, look.stands, {}, posing);
      heroes.set(skin, stood.sheath ? sheathing(hero, stood, stood.sheath, lasts) : hero);
    }
    // (With its unique weapon, a skin that comes with its animations is read only to move another: not one of these.)
    if (!unique) for (const { skin, rigged } of skins) if (rigged) heroes.set(skin, riggedHero(rigged));
    for (const { skin } of skins) {
      const hero = heroes.get(skin);
      if (hero) entrants.push({ def, skin, hero, unique });
    }
  });
  if (entrants.length === 0 && !unique) throw new Error('None of the heroes could be read');
  return entrants;
}
