import { ANNETTE_ASSETS, CLAUSE_ASSETS, EZEKIEL_ASSETS, FALLEN_FREY_ASSETS, GREMORY_ASSETS, KIRZE_ASSETS, LAIAS_ASSETS, LORRAINE_ASSETS, MORRAH_ASSETS, SERIA_ASSETS, VALANCE_ASSETS, type HeroAssets } from '../assets';
import { STAND as ANNETTE } from './annette/moves';
import type { Bends, Pose } from './body/pose';
import { STAND as EZEKIEL } from './ezekiel/moves';
import { STAND as FALLEN_FREY } from './fallen-frey/moves';
import { STAND as GREMORY, BENDS as GREMORY_BENDS } from './gremory/moves';
import { STAND as LAIAS } from './laias/moves';
import { STAND as LORRAINE } from './lorraine/moves';
import { STAND as MORRAH } from './morrah/moves';
import { STAND as VALANCE } from './valance/moves';

/*
 * How each hero looks on the field, by its id: what it is in a fight is the sim's (../sim/heroes/), and its folder
 * here has what is drawn for it (its fx.ts) and what its body does (its moves.ts).
 */

export interface HeroLook {
  /** Its files: its skins (each with a card of its own, named as the sim names them), its skills' pictures. */
  assets: HeroAssets;
  /** How it stands at rest when it is moved by the poses written in code (a swordsman's, REST, when it doesn't say): its own moves are written from it. */
  stands?: Pose;
  /** It sits on what floats under it (its skins' `floating`) rather than standing: it glides in on it, bobbing, rather than running. */
  seated?: boolean;
  /** Which ways its knees and elbows bend as it is posed, where they aren't the usual ways (a body that lies rather than stands). */
  bends?: Bends;
  /**
   * How it stands wanders, when it is moved by the poses written in code (in its idle, or at rest): its chest and head
   * turned and its weight shifted a little, now one way and now another, and its idle played a little slower or faster
   * (from a moment of its own), so that it never stands quite the same way twice, nor as another in the same idle does.
   */
  varies?: boolean;
}

const LOOKS: Readonly<Record<string, HeroLook>> = {
  kirze: { assets: KIRZE_ASSETS },
  clause: { assets: CLAUSE_ASSETS },
  'fallen-frey': { assets: FALLEN_FREY_ASSETS, stands: FALLEN_FREY, varies: true },
  gremory: { assets: GREMORY_ASSETS, stands: GREMORY, bends: GREMORY_BENDS, seated: true },
  annette: { assets: ANNETTE_ASSETS, stands: ANNETTE },
  morrah: { assets: MORRAH_ASSETS, stands: MORRAH },
  laias: { assets: LAIAS_ASSETS, stands: LAIAS },
  seria: { assets: SERIA_ASSETS },
  ezekiel: { assets: EZEKIEL_ASSETS, stands: EZEKIEL, varies: true },
  lorraine: { assets: LORRAINE_ASSETS, stands: LORRAINE, varies: true },
  valance: { assets: VALANCE_ASSETS, stands: VALANCE },
};

/** How the hero `id` looks (every hero the sim has has a look). */
export function lookOf(id: string): HeroLook {
  const look = LOOKS[id];
  if (!look) throw new Error(`The hero ${id} has no look`);
  return look;
}
