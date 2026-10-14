import { HERO_ASSETS, portraitPicture, type Crop } from '../technomagic/assets';
import type { Slot } from './items';

/*
 * The TechnoMagic Raid's heroes, as the bot's GET /api/heroes has them (its web/models/heroes.ts): the
 * shop's Heroes tab buys them (../hero-shop/), the heroes page gears them (../heroes/). The raid itself
 * (../technomagic/) knows each by the same id: its folder there, whose files give its picture here.
 */

/** Where a hero wears gear: two weapons, two armors and a treasure. */
export type HeroSlot = 'weapon1' | 'weapon2' | 'armor1' | 'armor2' | 'treasure';

export const HERO_SLOTS: readonly HeroSlot[] = ['weapon1', 'weapon2', 'armor1', 'armor2', 'treasure'];

/** Which kind of item goes in each. */
export const HERO_SLOT_KIND: Record<HeroSlot, Slot> = { weapon1: 'weapon', weapon2: 'weapon', armor1: 'armor', armor2: 'armor', treasure: 'treasure' };

/** What gear raises (the bot's lib/game/heroes.ts HeroStat). */
export type HeroStat = 'atk' | 'hp' | 'crit' | 'critDamage' | 'speed' | 'pen' | 'defense' | 'block' | 'dodge' | 'resist' | 'heal' | 'control' | 'manaAttack' | 'manaRegen';

/** One copy a hero can wear (the raid's gear, or the TechnoMagic Raid's). */
export interface HeroCopy {
  id: string;
  itemId: string;
  name: string;
  stars: 1 | 2 | 3 | 4;
  slot: Slot;
  description: string;
  level: number;
  maxLevel: number;
  masterwork: boolean;
  locked: boolean;
  /** What it does on a hero, a line for each stat it raises. */
  effects: string[];
  /** A class item: the one class of hero it works on (null: any). */
  class: string | null;
  /** TechnoMagic gear (which only heroes wear): drawn as the TechnoMagic Raid's (absent from a bot from before it said). */
  heroOnly?: boolean;
  /** The id of their hero wearing it, or null. */
  hero: string | null;
}

export interface Hero {
  id: string;
  name: string;
  /** Its class (a raid class's id: public/gear/classes/<id>.png). */
  class: string;
  price: number;
  owned: boolean;
  equipped: Record<HeroSlot, string | null>;
  /**
   * What its gear gives it in the raid: points for the chances and shares (crit, speed, pen, block, dodge,
   * resist), a share more of its own for the rest (atk, hp, critDamage, defense, heal, control).
   */
  bonus: Record<HeroStat, number>;
  /** The TechnoMagic set its weapons and armors are most of: which, how many pieces, and whether its effect is on (all four). Null with none (absent from a bot from before sets). */
  set?: { id: string; pieces: number; active: boolean } | null;
  /** The same as lines (its set's last). */
  totals: string[];
}

export interface HeroesView {
  /** In the shop's order. */
  heroes: Hero[];
  /** Every copy they own that a hero can wear, best first. */
  copies: HeroCopy[];
  balance: number;
}

const CLASS_NAME: Record<string, string> = { knight: 'Knight', warrior: 'Warrior', assassin: 'Assassin', archer: 'Archer', mechanic: 'Mechanic', wizard: 'Wizard', priest: 'Priest' };

/** A class's name ("Knight"), and its badge (public/gear/classes/, as the gear page's ribbon has it). */
export const className = (id: string): string => CLASS_NAME[id] ?? id;
export const classBadge = (id: string): string => `/gear/classes/${id}_default.png`;

/** A hero's picture (its default skin's): the whole picture, and the square of it that is its face. Null when the raid has none for it. */
export function heroPicture(id: string): { src: string; crop: Crop } | null {
  const assets = HERO_ASSETS.find((hero) => hero.folder === `heroes/${id}`);
  const portrait = assets?.skins[0]?.portrait;
  return assets && portrait ? { src: portraitPicture(assets, portrait), crop: portrait.crop } : null;
}

/**
 * A hero's face as a frame shows it, where its picture's face square doesn't fit it as snugly as the
 * others' (Kirze's takes in her ears): `zoom` times as big, its middle moved `x` and `y` face sizes (right and down).
 */
interface Fit {
  zoom: number;
  x: number;
  y: number;
}

/**
 * How much of a hero's picture to show round its face, in face sizes: `wide` across and `tall` down,
 * the face's top `above` down from the top, each hero as `fit` has it (by id). A face for a portrait
 * (the heroes page's roster: each face filling about as much of it as Fallen Frey's), a bust for the shop's cards.
 */
interface Frame {
  wide: number;
  tall: number;
  above: number;
  fit?: Readonly<Record<string, Fit>>;
}

export const FACE: Frame = { wide: 1.7, tall: 1.7, above: 0.35, fit: { kirze: { zoom: 1.55, x: 0.08, y: 0.2 }, clause: { zoom: 1.2, x: 0, y: 0.05 } } };
export const BUST: Frame = { wide: 3.4, tall: 4.6, above: 0.45 };

const cuts = new Map<string, Promise<string | null>>();

/** A hero's face or bust cut out of its picture (a data: address), `width` pixels across; null when it has none, or it can't be read. */
export function heroCut(id: string, frame: Frame, width = 256): Promise<string | null> {
  const fit = frame.fit?.[id];
  const key = `${id}:${frame.wide}:${frame.tall}:${frame.above}:${fit ? `${fit.zoom}:${fit.x}:${fit.y}` : ''}:${width}`;
  let cut = cuts.get(key);
  if (!cut) {
    cut = cutPicture(id, frame, width);
    cuts.set(key, cut);
  }
  return cut;
}

async function cutPicture(id: string, frame: Frame, width: number): Promise<string | null> {
  const picture = heroPicture(id);
  if (!picture) return null;
  const image = new Image();
  image.src = picture.src;
  try {
    await image.decode();
  } catch {
    return null;
  }
  const { x, y, size: square } = picture.crop;
  const fit = frame.fit?.[id] ?? { zoom: 1, x: 0, y: 0 };
  // The face's middle, and its size as the frame takes it.
  const middle = { x: x + square / 2 + fit.x * square, y: y + square / 2 + fit.y * square };
  const size = square / fit.zoom;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round((width * frame.tall) / frame.wide);
  const pen = canvas.getContext('2d');
  if (!pen) return null;
  // The face in the middle across, `above` of a face below the top; whatever falls off the picture is left clear.
  const from = { x: middle.x - (size * frame.wide) / 2, y: middle.y - size / 2 - size * frame.above, w: size * frame.wide, h: size * frame.tall };
  pen.drawImage(image, from.x, from.y, from.w, from.h, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL();
}
