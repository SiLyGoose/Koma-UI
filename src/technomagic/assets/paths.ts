import type { EffectAssets, HeroAssets, Portrait, SkinAssets, SoundClip } from './types.ts';

/*
 * Where each file is kept. Under public/kr/ (the models, copied in by scripts/kr-assets.mjs), by whose it is:
 *
 *   heroes/<hero>/models/<model>/     a model's .fbx and its textures
 *   heroes/<hero>/skills/             the pictures on its skills
 *   heroes/<hero>/portraits/          its skins' pictures, the ones fetched
 *   bosses/<boss>/models/<model>/
 *   effects/<effect>/
 *   heroes/<hero>/sounds/, bosses/<boss>/sounds/   its own sounds (its voice)
 *   heroes/<hero>/animations/, bosses/<boss>/animations/   King's Raid's own animations for it
 *   effects/sounds/                  the sounds every hero and boss shares
 *
 * and under public/technomagic/, kept with the page: portraits/ (the skins' pictures that are committed), and music/.
 */

/** Where the two are served from. */
export const LOCAL = '/kr';
export const KEPT = '/technomagic';

/** A model's folder, under public/kr/: `owner` is the hero or boss whose it is. */
export const modelFolder = (owner: { folder: string }, model: string): string => `${owner.folder}/models/${model}`;

export const effectFolder = (effect: EffectAssets): string => `effects/${effect.folder}`;

/** The address of one of a hero's or a boss's sounds (`owner`'s): one every hero and boss shares, or its own. */
export const soundFile = (owner: { folder: string }, clip: SoundClip): string => `${LOCAL}/${clip.own ? `${owner.folder}/sounds` : 'effects/sounds'}/${clip.clip}.mp3`;

/** The address of one of a hero's or boss's King's Raid animations (KrAnimations: by the clip's name). */
export const animationFile = (owner: { folder: string }, clip: string): string => `${LOCAL}/${owner.folder}/animations/${clip}.json`;

/** The address of a raid's music. */
export const musicFile = (file: string): string => `${KEPT}/music/${file}`;

/** A skill's picture, under public/kr/. */
export const skillFile = (hero: HeroAssets, file: string): string => `${hero.folder}/skills/${file}`;

/** A fetched portrait, under public/kr/. */
export const portraitFile = (hero: HeroAssets, portrait: Portrait): string => `${hero.folder}/portraits/${portrait.file}`;

/** The address of the picture on a hero's skill: `index` counts its skills from 0, its passive last. */
export const skillPicture = (hero: HeroAssets, index: number): string => `${LOCAL}/${skillFile(hero, hero.skills.files[index] ?? '')}`;

/** The address of a skin's own icon (King's Raid's: its face, square), null for one with none. */
export const iconPicture = (hero: HeroAssets, skin: SkinAssets): string | null => (skin.icon ? `${LOCAL}/${hero.folder}/icons/${skin.icon}` : null);

/** The address of a skin's own card (King's Raid's: the tall picture of it), null for one with none. */
export const cardPicture = (hero: HeroAssets, skin: SkinAssets): string | null => (skin.card ? `${LOCAL}/${hero.folder}/cards/${skin.card}` : null);

/** The address of a skin's picture. */
export const portraitPicture = (hero: HeroAssets, portrait: Portrait): string => (portrait.from ? `${LOCAL}/${portraitFile(hero, portrait)}` : `${KEPT}/portraits/${portrait.file}`);
