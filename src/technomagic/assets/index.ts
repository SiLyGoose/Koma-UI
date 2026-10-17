import { ARMARTA_ASSETS } from './bosses/armarta.ts';
import { GALGORIA_ASSETS } from './bosses/galgoria.ts';
import { SCALAXIA_ASSETS } from './bosses/scalaxia.ts';
import { TEMERAIRE_ASSETS } from './bosses/temeraire.ts';
import { ZYRRKINOTH_ASSETS } from './bosses/zyrrkinoth.ts';
import { ANNETTE_ASSETS } from './heroes/annette.ts';
import { KLAUS_ASSETS } from './heroes/klaus.ts';
import { EZEKIEL_ASSETS } from './heroes/ezekiel.ts';
import { FALLEN_FREY_ASSETS } from './heroes/fallen-frey.ts';
import { GREMORY_ASSETS } from './heroes/gremory.ts';
import { KIRZE_ASSETS, KIRZE_RUN } from './heroes/kirze.ts';
import { LAIAS_ASSETS } from './heroes/laias.ts';
import { LORRAINE_ASSETS } from './heroes/lorraine.ts';
import { MORRAH_ASSETS } from './heroes/morrah.ts';
import { SERIA_ASSETS } from './heroes/seria.ts';
import { VALANCE_ASSETS } from './heroes/valance.ts';
import { LUCIKIEL_ASSETS } from './heroes/lucikiel.ts';
import { SELENE_ASSETS } from './heroes/selene.ts';
import { CROW_ASSETS } from './heroes/crow.ts';
import { ODDY_ASSETS } from './heroes/oddy.ts';
import { PHILLOP_ASSETS } from './heroes/phillop.ts';
import { NAILA_ASSETS } from './heroes/naila.ts';
import { YANNE_ASSETS } from './heroes/yanne.ts';
import { NERAXIS_ASSETS } from './heroes/neraxis.ts';
import { ERZE_ASSETS } from './heroes/erze.ts';
import { LOMAN_ASSETS } from './heroes/loman.ts';
import { GAU_ASSETS } from './heroes/gau.ts';
import { TANYA_ASSETS } from './heroes/tanya.ts';
import { REBEL_KLAUS_ASSETS } from './heroes/rebel-klaus.ts';
import { DARK_LORD_KASEL_ASSETS } from './heroes/dark-lord-kasel.ts';
import type { BossAssets, HeroAssets } from './types.ts';

/*
 * The files the page shows, by whose they are: ./heroes/ and ./bosses/ have a file for each, ./effects.ts
 * the effects they share, ./paths.ts where each is kept. The models are not in this repo:
 * scripts/kr-assets.mjs copies them into public/kr/, reading the names here.
 *
 * (This folder's files name each other with their .ts, and have nothing in them but names: Node reads
 * them as they are for that script.)
 */

export const HERO_ASSETS: readonly HeroAssets[] = [KIRZE_ASSETS, KLAUS_ASSETS, FALLEN_FREY_ASSETS, GREMORY_ASSETS, ANNETTE_ASSETS, MORRAH_ASSETS, LAIAS_ASSETS, SERIA_ASSETS, EZEKIEL_ASSETS, LORRAINE_ASSETS, VALANCE_ASSETS, LUCIKIEL_ASSETS, SELENE_ASSETS, CROW_ASSETS, ODDY_ASSETS, PHILLOP_ASSETS, NAILA_ASSETS, YANNE_ASSETS, NERAXIS_ASSETS, ERZE_ASSETS, LOMAN_ASSETS, GAU_ASSETS, TANYA_ASSETS, REBEL_KLAUS_ASSETS, DARK_LORD_KASEL_ASSETS];
export const BOSS_ASSETS: readonly BossAssets[] = [GALGORIA_ASSETS, TEMERAIRE_ASSETS, SCALAXIA_ASSETS, ZYRRKINOTH_ASSETS, ARMARTA_ASSETS];

export { GALGORIA_ASSETS, TEMERAIRE_ASSETS, SCALAXIA_ASSETS, ZYRRKINOTH_ASSETS, ARMARTA_ASSETS, ANNETTE_ASSETS, KLAUS_ASSETS, FALLEN_FREY_ASSETS, GREMORY_ASSETS, KIRZE_ASSETS, MORRAH_ASSETS, LAIAS_ASSETS, SERIA_ASSETS, EZEKIEL_ASSETS, LORRAINE_ASSETS, VALANCE_ASSETS, LUCIKIEL_ASSETS, SELENE_ASSETS, CROW_ASSETS, ODDY_ASSETS, PHILLOP_ASSETS, NAILA_ASSETS, YANNE_ASSETS, NERAXIS_ASSETS, ERZE_ASSETS, LOMAN_ASSETS, GAU_ASSETS, TANYA_ASSETS, REBEL_KLAUS_ASSETS, DARK_LORD_KASEL_ASSETS };
export { KIRZE_RUN };
export { EFFECTS, type EffectName } from './effects.ts';
export * from './paths.ts';
export type * from './types.ts';
