import type { HeroAssets, PartsModel, SkinAssets } from '../assets';
import type { HeroDef } from '../sim/heroes/kit';
import { motionOf } from '../sim/motion';
import type { Hero, Stood } from './body/hero';
import { krHero, loadKrClips, type KrClips } from './body/kr';
import { posedHero } from './body/posed';
import { sheathing } from './body/sheath';
import { standHero } from './body/stand';
import { lookOf } from './looks';
import type { HeroMove } from './moves';

/*
 * Reads the heroes' skins and stands each up, ready for a fight (how each looks: ./looks.ts): the game's own files, moved
 * by King's Raid's own animations for it (./body/kr.ts), as the fight times them (../sim/motion.ts). With those not on this
 * computer it is moved by the poses written in code (and one whose sword is kept in the sheath in its other hand draws
 * it only for its moves: ./body/sheath.ts). A skin that isn't on this computer is left out. Read for heroes wielding their
 * unique weapons, each skin that looks otherwise with it is read as it does (the weapon's models in place of its own:
 * HeroAssets.unique), and only those.
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

/** What was read of a skin: its model stood up, and King's Raid's own animations for it. */
interface Read {
  skin: SkinAssets;
  stood: Stood | null;
  kr: KrClips | null;
}

/** Null (and a word in the console) when what was being read isn't there. */
const quietly = <T>(reading: Promise<T>): Promise<T | null> =>
  reading.catch((error: unknown) => {
    console.warn(error);
    return null;
  });

/** A skin read (`model`: the skin's own, or as it looks with its unique weapon). */
async function read(def: HeroDef, skin: SkinAssets, model: PartsModel): Promise<Read> {
  const { assets } = lookOf(def.id);
  const [stood, kr] = await Promise.all([quietly(standHero(assets, model)), model.animations ? quietly(loadKrClips(assets, model.animations, motionOf(def))) : null]);
  return { skin, stood, kr };
}

/** The skins of `def` to read (`only`: just that one, by its index): each as it is, or (`unique`) each that looks otherwise with its unique weapon, as it does then. */
function toRead(def: HeroDef, unique: boolean, only?: number): Promise<Read>[] {
  const { assets } = lookOf(def.id);
  const asked = only === undefined ? assets.skins : assets.skins.filter((_, i) => i === only);
  return asked.flatMap((skin) => {
    const model = unique ? wielding(assets, skin.model) : skin.model;
    return model ? [read(def, skin, model)] : [];
  });
}

/**
 * Every skin of `defs` that could be read, in the order of the heroes and of each one's skins; or (`unique`) every one
 * that looks otherwise with its hero's unique weapon, as it does then (none, for a hero whose weapon changes none).
 * With `skin`, only that one of each's skins (by its index): a hero's skins are big, and a fight has only the one picked.
 */
export async function loadHeroes(defs: readonly HeroDef[], { unique = false, skin }: { unique?: boolean; skin?: number } = {}): Promise<Entrant[]> {
  const all = await Promise.all(defs.map((def) => Promise.all(toRead(def, unique, skin))));
  const entrants: Entrant[] = [];
  defs.forEach((def, i) => {
    const look = lookOf(def.id);
    const motion = motionOf(def);
    // (How long each move lasts, as the fight has it: the sword stays drawn that long.)
    const lasts = (move: HeroMove): number => motion.moves[move].parts.reduce((sum, part) => sum + part.until, 0) / motion.moves[move].speed;
    for (const { skin, stood, kr } of all[i] as Read[]) {
      if (!stood) continue;
      let hero: Hero;
      if (kr) hero = krHero(stood, kr, motion, (skin.model.heldStill ?? []).map((side) => `Point_Hand_${side}`));
      else {
        const posed = posedHero(stood, look.stands, {}, { seated: look.seated, hovers: look.hovers, bends: look.bends, varied: look.varies });
        hero = stood.sheath ? sheathing(posed, stood, stood.sheath, lasts) : posed;
      }
      entrants.push({ def, skin, hero, unique });
    }
  });
  if (entrants.length === 0 && !unique) throw new Error('None of the heroes could be read');
  return entrants;
}
