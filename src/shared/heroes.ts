import { HERO_ASSETS, portraitPicture, type Crop } from '../technomagic/assets';
import type { GearStat } from '../technomagic/sim/types';
import { el, type Slot } from './items';
import type { EssenceId } from '../heroes/transcend';

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

/** What gear raises (the bot's lib/game/heroes.ts HeroStat: the raid's GearStat). */
export type HeroStat = GearStat;

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
  /** TechnoMagic gear (not a treasure): its set's effect for its class, once a hero wears `pieces` of it, and whether it is on (`active`: the hero wearing it has its set's effect); null
   * otherwise (absent from a bot from before it said it apart; `active`, from one before it said that). */
  setEffect?: { pieces: number; text: string; active?: boolean } | null;
  /** TechnoMagic gear: the additional skill this copy came with, like "Vigor: Increases DMG…"; null with none (absent from a bot from before it said it apart). */
  additional?: string | null;
  /** Whether its additional skill is on: a hero of its class wears it (absent from a bot from before it said). */
  additionalActive?: boolean;
  /** TechnoMagic gear: the additional skill this copy came with (the sim's id: ../technomagic/sim/skills.ts), or null (absent from a bot from before them). */
  skill?: string | null;
  /** A class item: the one class of hero it works on (null: any). */
  class: string | null;
  /** TechnoMagic gear or a unique weapon (which only heroes wear): drawn as the TechnoMagic Raid's (absent from a bot from before it said). */
  heroOnly?: boolean;
  /** A unique weapon: the id of the one hero that wields it, or null (absent from a bot from before them). */
  uniqueWeapon?: string | null;
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
  /** The TechnoMagic set its weapons and armors are most of: which, how many pieces, and whether its effect is on (three of them). Null with none (absent from a bot from before sets). */
  set?: { id: string; pieces: number; active: boolean } | null;
  /** The additional skills of the TechnoMagic gear it wears that work on it (the sim's ids, one for each piece; absent from a bot from before them). */
  skills?: string[];
  /** The same as lines (then its set's, and its additional skills', last). */
  totals: string[];
  /** The transcendence perks picked for it (the bot's data/transcend.ts ids: ../heroes/transcend.ts; absent from a bot from before them). */
  perks?: string[];
  /**
   * How far it is transcended (1 to 5), the TP it has, and what the next level costs: so many of each of its class's
   * hero essences, and komaGems (null at the last). Absent from a bot from before it.
   */
  transcend?: { level: number; points: number; next: { essences: Partial<Record<EssenceId, number>>; gems: number } | null };
}

export interface HeroesView {
  /** In the shop's order. */
  heroes: Hero[];
  /** Every copy they own that a hero can wear, best first. */
  copies: HeroCopy[];
  balance: number;
  /** Their komaGems and hero essences, what transcending pays with (0 for someone else's; absent from a bot from before them). */
  gems?: number;
  essences?: Partial<Record<EssenceId, number>>;
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
 * (the heroes page's roster: each face filling about as much of it as Fallen Frey's), a bust for the databank's hero and the shop's cards.
 */
interface Frame {
  wide: number;
  tall: number;
  above: number;
  fit?: Readonly<Record<string, Fit>>;
}

export const FACE: Frame = { wide: 1.7, tall: 1.7, above: 0.35, fit: {
    kirze: { zoom: 1.55, x: 0.08, y: 0.2 },
    clause: { zoom: 1.5, x: -0.105, y: 0.14 },
    annette: { zoom: 1.25, x: -0.023, y: 0.25 },
    morrah: { zoom: 1.35, x: -0.1, y: 0.19 },
    laias: { zoom: 1.4, x: 0, y: 0.33 },
    ezekiel: { zoom: 1.5, x: 0.04, y: 0.13 },
    lorraine: { zoom: 1.45, x: 0.02, y: 0.23 },
    valance: { zoom: 1.8, x: -0.215, y: 0.22 },
    seria: { zoom: 1.4, x: 0.04, y: 0.23 },
  },
};
export const BUST: Frame = { wide: 3.4, tall: 4.6, above: 0.45 };
/**
 * The shop's cards: a bust, each hero's face framed as Gremory's and Fallen Frey's are (their own face squares, as
 * they are): its eye line a quarter of the card's width down, in the middle across, eye to chin about a tenth of its width.
 */
export const SHOP_BUST: Frame = { ...BUST, fit: {
    kirze: { zoom: 1.24, x: -0.11, y: 0.27 },
    clause: { zoom: 1, x: -0.01, y: 0.13 },
    annette: { zoom: 1.15, x: 0.02, y: 0.23 },
    morrah: { zoom: 1.33, x: -0.09, y: 0.12 },
    laias: { zoom: 1.64, x: -0.04, y: 0.18 },
    seria: { zoom: 1.04, x: 0, y: 0.27 },
    ezekiel: { zoom: 1.6, x: 0.4, y: -0.25 },
    lorraine: { zoom: 1.03, x: 0.02, y: 0.09 },
    valance: { zoom: 1.45, x: -0.14, y: 0.21 },
  },
};

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

/** A skill's words, as King's Raid marks them: its numbers (20%, 12,000, 0.5) and what's in brackets ([Darkened Power]) each in a colour of their own (the heroes page's Skills tab, the raid's popups). */
export function skillText(text: string): (string | HTMLElement)[] {
  return text
    .split(/(\[[^\]]+\]|\d+(?:,\d{3})*(?:\.\d+)?%?)/)
    .filter(Boolean)
    .map((part) => (part.startsWith('[') ? el('b', 'skill-effect', part) : /^\d/.test(part) ? el('b', 'skill-number', part) : part));
}
