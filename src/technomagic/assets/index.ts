import { GALGORIA_ASSETS } from './bosses/galgoria.ts';
import { ANNETTE_ASSETS } from './heroes/annette.ts';
import { CLAUSE_ASSETS } from './heroes/clause.ts';
import { EZEKIEL_ASSETS } from './heroes/ezekiel.ts';
import { FALLEN_FREY_ASSETS } from './heroes/fallen-frey.ts';
import { GREMORY_ASSETS } from './heroes/gremory.ts';
import { KIRZE_ASSETS } from './heroes/kirze.ts';
import { LAIAS_ASSETS } from './heroes/laias.ts';
import { MORRAH_ASSETS } from './heroes/morrah.ts';
import { SERIA_ASSETS } from './heroes/seria.ts';
import type { BossAssets, HeroAssets } from './types.ts';

/*
 * The files the page shows, by whose they are: ./heroes/ and ./bosses/ have a file for each, ./effects.ts
 * the effects they share, ./paths.ts where each is kept. The models are not in this repo:
 * scripts/kr-assets.mjs copies them into public/kr/, reading the names here.
 *
 * (This folder's files name each other with their .ts, and have nothing in them but names: Node reads
 * them as they are for that script.)
 */

export const HERO_ASSETS: readonly HeroAssets[] = [KIRZE_ASSETS, CLAUSE_ASSETS, FALLEN_FREY_ASSETS, GREMORY_ASSETS, ANNETTE_ASSETS, MORRAH_ASSETS, LAIAS_ASSETS, SERIA_ASSETS, EZEKIEL_ASSETS];
export const BOSS_ASSETS: readonly BossAssets[] = [GALGORIA_ASSETS];

export { GALGORIA_ASSETS, ANNETTE_ASSETS, CLAUSE_ASSETS, FALLEN_FREY_ASSETS, GREMORY_ASSETS, KIRZE_ASSETS, MORRAH_ASSETS, LAIAS_ASSETS, SERIA_ASSETS, EZEKIEL_ASSETS };
export { EFFECTS, type EffectName } from './effects.ts';
export * from './paths.ts';
export type * from './types.ts';
