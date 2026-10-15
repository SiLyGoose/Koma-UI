import type { RiggedModel, SkinAssets } from '../assets';
import { motionOf } from '../sim/motion';
import { heroLike, riggedHero } from './body/animated';
import type { Hero, Stood } from './body/hero';
import { posedHero } from './body/posed';
import { loadRigged, type Rigged } from './body/rigged';
import { sheathing } from './body/sheath';
import { standHero } from './body/stand';
import type { HeroDef } from './kit';
import type { HeroMove } from './moves';

/*
 * Reads the heroes' skins and stands each up, ready for a fight: one that comes with its animations is
 * moved by them; one of the game's own files is moved by the animations its skin names (another skin's,
 * or a rig read only for them), or with none by the poses written in code. One whose sword is kept in the sheath in
 * its other hand draws it only for its moves (./body/sheath.ts). A skin that isn't on this computer is left out, and
 * so is whatever would have moved another.
 */

/** A skin on the field: whose it is, its body, and the move it attacks with. */
export interface Entrant {
  def: HeroDef;
  skin: SkinAssets;
  hero: Hero;
  attack: HeroMove;
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

async function read(def: HeroDef, skin: SkinAssets): Promise<Read> {
  const animated = (name: string, model: RiggedModel): Promise<Rigged | null> => quietly(loadRigged(name, def.assets, model));
  const { model } = skin;
  if (model.kind === 'rigged') return { skin, stood: null, rigged: await animated(skin.name, model), rig: null };
  const [stood, rig] = await Promise.all([quietly(standHero(def.assets, model)), typeof model.movedBy === 'object' ? animated(`${skin.name}'s rig`, model.movedBy) : null]);
  return { skin, stood, rigged: null, rig };
}

/** Every skin of `defs` that could be read, in the order of the heroes and of each one's skins. */
export async function loadHeroes(defs: readonly HeroDef[]): Promise<Entrant[]> {
  const all = await Promise.all(defs.map((def) => Promise.all(def.assets.skins.map((skin) => read(def, skin)))));
  const entrants: Entrant[] = [];
  defs.forEach((def, i) => {
    const skins = all[i] as Read[];
    const heroes = new Map<SkinAssets, { hero: Hero; attack: HeroMove }>();
    // With an attack among the animations that move it, that is how it attacks: not as its hero has it written in code.
    const attack = (moves: Rigged | null): HeroMove => (moves && moves.animations.attack.length > 0 ? 'attack' : (def.attack ?? 'attack'));
    // The game's own files first: what moves one is made over for it from a skin still standing as it was bound.
    for (const { skin, stood, rig } of skins) {
      if (!stood || skin.model.kind !== 'parts') continue;
      const { movedBy } = skin.model;
      const like = typeof movedBy === 'string' ? (skins.find((other) => other.skin.name === movedBy)?.rigged ?? null) : rig;
      const posing = { seated: def.seated, bends: def.bends, varied: def.varies };
      const hero = like ? heroLike(stood, like, def.stands, posing) : posedHero(stood, def.stands, {}, posing);
      // (How long each move lasts, as the fight has it: the sword stays drawn that long.)
      const { moves } = motionOf(def, def.assets.skins.indexOf(skin));
      const lasts = (move: HeroMove): number => moves[move].parts.reduce((sum, part) => sum + part.until, 0) / moves[move].speed;
      heroes.set(skin, { hero: stood.sheath ? sheathing(hero, stood, stood.sheath, lasts) : hero, attack: attack(like) });
    }
    for (const { skin, rigged } of skins) if (rigged) heroes.set(skin, { hero: riggedHero(rigged), attack: attack(rigged) });
    for (const { skin } of skins) {
      const made = heroes.get(skin);
      if (made) entrants.push({ def, skin, ...made });
    }
  });
  if (entrants.length === 0) throw new Error('None of the heroes could be read');
  return entrants;
}
