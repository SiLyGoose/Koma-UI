import type { EffectAssets, HeroAssets, Portrait } from './types.ts';

/*
 * Where each file is kept. Under public/kr/ (which git ignores and a build leaves out: the models stay
 * on this machine), by whose it is:
 *
 *   heroes/<hero>/models/<model>/     a model's .fbx and its textures (a rigged skin's: its animations)
 *   heroes/<hero>/skills/             the pictures on its skills
 *   heroes/<hero>/portraits/          its skins' pictures, the ones fetched
 *   bosses/<boss>/models/<model>/
 *   effects/<effect>/
 *
 * and under public/technomagic/, kept with the page: portraits/ (the skins' pictures that are committed).
 */

/** Where the two are served from. */
export const LOCAL = '/kr';
export const KEPT = '/technomagic';

/** A model's folder, under public/kr/: `owner` is the hero or boss whose it is. */
export const modelFolder = (owner: { folder: string }, model: string): string => `${owner.folder}/models/${model}`;

export const effectFolder = (effect: EffectAssets): string => `effects/${effect.folder}`;

/** A skill's picture, under public/kr/. */
export const skillFile = (hero: HeroAssets, file: string): string => `${hero.folder}/skills/${file}`;

/** A fetched portrait, under public/kr/. */
export const portraitFile = (hero: HeroAssets, portrait: Portrait): string => `${hero.folder}/portraits/${portrait.file}`;

/** The address of the picture on a hero's skill: `index` counts its skills from 0, its passive last. */
export const skillPicture = (hero: HeroAssets, index: number): string => `${LOCAL}/${skillFile(hero, hero.skills.files[index] ?? '')}`;

/** The address of a skin's picture. */
export const portraitPicture = (hero: HeroAssets, portrait: Portrait): string => (portrait.from ? `${LOCAL}/${portraitFile(hero, portrait)}` : `${KEPT}/portraits/${portrait.file}`);
