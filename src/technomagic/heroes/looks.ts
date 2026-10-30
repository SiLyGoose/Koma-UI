import { ANNETTE_ASSETS, KLAUS_ASSETS, EZEKIEL_ASSETS, FALLEN_FREY_ASSETS, GREMORY_ASSETS, KIRZE_ASSETS, LAIAS_ASSETS, LORRAINE_ASSETS, MORRAH_ASSETS, SERIA_ASSETS, VALANCE_ASSETS, LUCIKIEL_ASSETS, SELENE_ASSETS, CROW_ASSETS, ODDY_ASSETS, PHILLOP_ASSETS, NAILA_ASSETS, YANNE_ASSETS, NERAXIS_ASSETS, ERZE_ASSETS, LOMAN_ASSETS, GAU_ASSETS, TANYA_ASSETS, REBEL_KLAUS_ASSETS, DARK_LORD_KASEL_ASSETS, THEO_ASSETS, PRISCILLA_ASSETS, GLENWYS_ASSETS, CHASE_ASSETS, ASELICA_ASSETS, LAKRAK_ASSETS, MIRURU_ASSETS, MIRIANNE_ASSETS, KARA_ASSETS, ZAFIR_ASSETS, PANSIRONE_ASSETS, ISOLET_ASSETS, LILIA_ASSETS, LUCIAS_ASSETS, REHARTNA_ASSETS, SHEA_ASSETS, LAVRIL_ASSETS, EVAN_ASSETS, ESTELLE_ASSETS, JANE_ASSETS, SHAKMEH_ASSETS, ISAIAH_ASSETS, GLADI_ASSETS, CECILIA_ASSETS, ROI_ASSETS, LEWISIA_ASSETS, RICARDO_ASSETS, SHAMILLA_ASSETS, SCARLET_ASSETS, TALISHA_ASSETS, HILDA_ASSETS, type HeroAssets } from '../assets';
import { STAND as ANNETTE } from './annette/moves';
import type { Bends, Pose } from './body/pose';
import { STAND as EZEKIEL } from './ezekiel/moves';
import { STAND as FALLEN_FREY } from './fallen-frey/moves';
import { STAND as GREMORY, BENDS as GREMORY_BENDS } from './gremory/moves';
import { STAND as LAIAS } from './laias/moves';
import { STAND as LORRAINE } from './lorraine/moves';
import { STAND as MORRAH } from './morrah/moves';
import { STAND as VALANCE } from './valance/moves';
import { STAND as LUCIKIEL } from './lucikiel/moves';
import { STAND as SELENE } from './selene/moves';
import { STAND as CROW } from './crow/moves';
import { STAND as ODDY } from './oddy/moves';
import { STAND as PHILLOP } from './phillop/moves';
import { STAND as NAILA } from './naila/moves';
import { STAND as YANNE } from './yanne/moves';
import { STAND as NERAXIS } from './neraxis/moves';
import { STAND as ERZE } from './erze/moves';
import { STAND as LOMAN } from './loman/moves';
import { STAND as GAU } from './gau/moves';
import { STAND as TANYA } from './tanya/moves';
import { STAND as REBEL_KLAUS } from './rebel-klaus/moves';
import { STAND as DARK_LORD_KASEL } from './dark-lord-kasel/moves';

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
  /** It floats over the floor rather than standing, what floats beside it on its back: it glides in, bobbing, rather than running. */
  hovers?: boolean;
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
  klaus: { assets: KLAUS_ASSETS },
  'fallen-frey': { assets: FALLEN_FREY_ASSETS, stands: FALLEN_FREY, varies: true },
  gremory: { assets: GREMORY_ASSETS, stands: GREMORY, bends: GREMORY_BENDS, seated: true },
  annette: { assets: ANNETTE_ASSETS, stands: ANNETTE },
  morrah: { assets: MORRAH_ASSETS, stands: MORRAH },
  laias: { assets: LAIAS_ASSETS, stands: LAIAS },
  seria: { assets: SERIA_ASSETS },
  ezekiel: { assets: EZEKIEL_ASSETS, stands: EZEKIEL, varies: true },
  lorraine: { assets: LORRAINE_ASSETS, stands: LORRAINE, varies: true },
  valance: { assets: VALANCE_ASSETS, stands: VALANCE },
  lucikiel: { assets: LUCIKIEL_ASSETS, stands: LUCIKIEL, varies: true },
  selene: { assets: SELENE_ASSETS, stands: SELENE, varies: true },
  crow: { assets: CROW_ASSETS, stands: CROW, varies: true },
  oddy: { assets: ODDY_ASSETS, stands: ODDY, hovers: true },
  phillop: { assets: PHILLOP_ASSETS, stands: PHILLOP },
  naila: { assets: NAILA_ASSETS, stands: NAILA, varies: true },
  yanne: { assets: YANNE_ASSETS, stands: YANNE, varies: true },
  neraxis: { assets: NERAXIS_ASSETS, stands: NERAXIS, varies: true },
  erze: { assets: ERZE_ASSETS, stands: ERZE, varies: true },
  loman: { assets: LOMAN_ASSETS, stands: LOMAN },
  gau: { assets: GAU_ASSETS, stands: GAU },
  tanya: { assets: TANYA_ASSETS, stands: TANYA, varies: true },
  'rebel-klaus': { assets: REBEL_KLAUS_ASSETS, stands: REBEL_KLAUS, varies: true },
  'dark-lord-kasel': { assets: DARK_LORD_KASEL_ASSETS, stands: DARK_LORD_KASEL, varies: true },
  // (Moved only by King's Raid's own animations: no poses of their own.)
  theo: { assets: THEO_ASSETS },
  priscilla: { assets: PRISCILLA_ASSETS },
  glenwys: { assets: GLENWYS_ASSETS },
  chase: { assets: CHASE_ASSETS },
  aselica: { assets: ASELICA_ASSETS },
  lakrak: { assets: LAKRAK_ASSETS },
  miruru: { assets: MIRURU_ASSETS },
  mirianne: { assets: MIRIANNE_ASSETS },
  kara: { assets: KARA_ASSETS },
  zafir: { assets: ZAFIR_ASSETS },
  pansirone: { assets: PANSIRONE_ASSETS },
  isolet: { assets: ISOLET_ASSETS },
  lilia: { assets: LILIA_ASSETS },
  lucias: { assets: LUCIAS_ASSETS },
  rehartna: { assets: REHARTNA_ASSETS },
  shea: { assets: SHEA_ASSETS },
  lavril: { assets: LAVRIL_ASSETS },
  evan: { assets: EVAN_ASSETS },
  estelle: { assets: ESTELLE_ASSETS },
  jane: { assets: JANE_ASSETS },
  shakmeh: { assets: SHAKMEH_ASSETS },
  isaiah: { assets: ISAIAH_ASSETS },
  gladi: { assets: GLADI_ASSETS },
  cecilia: { assets: CECILIA_ASSETS },
  roi: { assets: ROI_ASSETS },
  lewisia: { assets: LEWISIA_ASSETS },
  ricardo: { assets: RICARDO_ASSETS },
  shamilla: { assets: SHAMILLA_ASSETS },
  scarlet: { assets: SCARLET_ASSETS },
  talisha: { assets: TALISHA_ASSETS },
  hilda: { assets: HILDA_ASSETS },
};

/** How the hero `id` looks (every hero the sim has has a look). */
export function lookOf(id: string): HeroLook {
  const look = LOOKS[id];
  if (!look) throw new Error(`The hero ${id} has no look`);
  return look;
}
