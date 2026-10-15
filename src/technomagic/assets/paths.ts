import type { EffectAssets, HeroAssets, Portrait, RiggedModel } from './types.ts';

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

/** A rig's folder, under public/kr/: `owner` is the hero it moves, whose models it is among (unless it is borrowed whole: RiggedModel.of). */
export const rigFolder = (owner: { folder: string }, rig: RiggedModel): string => modelFolder(rig.of === undefined ? owner : { folder: rig.of }, rig.folder);

/** A rig's animations, in the order they are read: its idle and run (those it has), its attack's, its skills'. */
export const animationsIn = (rig: RiggedModel): string[] =>
  [rig.idle, rig.run, ...(rig.attack ?? []).map((part) => part.file), ...Object.values(rig.skills ?? {}).map((skill) => skill.file)].filter((file) => file !== undefined);

export const effectFolder = (effect: EffectAssets): string => `effects/${effect.folder}`;

/** A skill's picture, under public/kr/. */
export const skillFile = (hero: HeroAssets, file: string): string => `${hero.folder}/skills/${file}`;

/** A fetched portrait, under public/kr/. */
export const portraitFile = (hero: HeroAssets, portrait: Portrait): string => `${hero.folder}/portraits/${portrait.file}`;

/** The address of the picture on a hero's skill: `index` counts its skills from 0, its passive last. */
export const skillPicture = (hero: HeroAssets, index: number): string => `${LOCAL}/${skillFile(hero, hero.skills.files[index] ?? '')}`;

/** The address of a skin's picture. */
export const portraitPicture = (hero: HeroAssets, portrait: Portrait): string => (portrait.from ? `${LOCAL}/${portraitFile(hero, portrait)}` : `${KEPT}/portraits/${portrait.file}`);
