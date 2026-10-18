import { HERO_ASSETS, iconPicture, portraitPicture, type Crop } from '../technomagic/assets';
import { el } from './items';

/** The heroes as the bot says them (../protocol/heroes.ts). */
export { HERO_PART_NAME, HERO_SLOT_PART, HERO_SLOTS, type HeroCopy, type HeroesView, type HeroPart, type HeroSlot, type HeroStat, type HeroView } from '../protocol/heroes';
import { HERO_SLOT_PART as PART_OF, HERO_SLOTS as SLOTS, type HeroSlot as Slot_ } from '../protocol/heroes';
import type { Slot } from '../protocol/items';

/** The kind of item (the pages' filters') each of a hero's slots takes: a weapon, an armor (Armor and Secondary Armor), or the rest. */
export const HERO_SLOT_KIND: Readonly<Record<Slot_, Slot>> = Object.fromEntries(
  SLOTS.map((slot) => [slot, PART_OF[slot] === 'weapon' ? 'weapon' : PART_OF[slot] === 'armor' || PART_OF[slot] === 'secondary' ? 'armor' : 'treasure']),
) as Record<Slot_, Slot>;


/*
 * The TechnoMagic Raid's heroes, as the bot's GET /api/heroes has them (its web/models/heroes.ts): the
 * shop's Heroes tab buys them (../hero-shop/), the heroes page gears them (../heroes/). The raid itself
 * (../technomagic/) knows each by the same id: its folder there, whose files give its picture here.
 */

const CLASS_NAME: Record<string, string> = { knight: 'Knight', warrior: 'Warrior', assassin: 'Assassin', archer: 'Archer', mechanic: 'Mechanic', wizard: 'Wizard', priest: 'Priest' };

/** A class's name ("Knight"), and its badge (public/gear/classes/, as the gear page's ribbon has it). */
export const className = (id: string): string => CLASS_NAME[id] ?? id;
export const classBadge = (id: string): string => `/gear/classes/${id}_default.png`;
/** Every class, in the raid's order (what the heroes page's armory filter offers). */
export const HERO_CLASSES: readonly { id: string; name: string }[] = Object.entries(CLASS_NAME).map(([id, name]) => ({ id, name }));

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
    klaus: { zoom: 1.5, x: -0.105, y: 0.14 },
    annette: { zoom: 1.25, x: -0.023, y: 0.25 },
    morrah: { zoom: 1.35, x: -0.1, y: 0.19 },
    laias: { zoom: 1.4, x: 0, y: 0.33 },
    ezekiel: { zoom: 1.5, x: 0.04, y: 0.13 },
    lorraine: { zoom: 1.45, x: 0.02, y: 0.23 },
    valance: { zoom: 1.8, x: -0.215, y: 0.22 },
    seria: { zoom: 1.4, x: 0.04, y: 0.23 },
    lucikiel: { zoom: 1.9, x: 0.06, y: 0.06 },
    selene: { zoom: 2, x: 0.03, y: -0.02 },
    crow: { zoom: 1.9, x: -0.05, y: 0.02 },
    naila: { zoom: 2, x: -0.07, y: 0.06 },
    neraxis: { zoom: 2.3, x: 0.17, y: 0.13 },
    yanne: { zoom: 2.2, x: 0.11, y: 0.04 },
    erze: { zoom: 1.9, x: 0.2, y: -0.03 },
    loman: { zoom: 2.1, x: -0.135, y: 0.05 },
    gau: { zoom: 1.9, x: 0.05, y: -0.05 },
    tanya: { zoom: 1.7, x: 0.16, y: 0 },
    'rebel-klaus': { zoom: 1.8, x: 0.07, y: 0.1 },
    'dark-lord-kasel': { zoom: 1.5, x: -0.1, y: 0.38 },
  },
};
/** The heroes page's stage: a hero's whole picture this many times as tall as the stage, where its face is small in it (by id). */
export const STAGE_ZOOM: Readonly<Record<string, number>> = {
  'fallen-frey': 1.5,
  annette: 1.8,
  ezekiel: 1.45,
  gremory: 1.85,
  kirze: 1.75,
  klaus: 1.4,
  laias: 1.5,
  lorraine: 1.35,
  lucikiel: 1.4,
  morrah: 1.9,
  oddy: 1.1,
  seria: 1.3,
  valance: 1.45,
  naila: 1.7,
  crow: 1.6,
  selene: 1.6,
  neraxis: 1.95,
  yanne: 2,
  erze: 1.5,
  loman: 2.05,
  gau: 1.55,
  tanya: 1.5,
  'rebel-klaus': 2,
};
/** A face as small as a unique weapon's or treasure's corner tab shows it (about 30px across): FACE's, cut small (BUILT_CUTS). */
export const TAB_FACE: Frame = { ...FACE };
export const BUST: Frame = { wide: 3.4, tall: 4.6, above: 0.45 };
/**
 * The shop's cards: a bust, each hero's face framed as Gremory's and Fallen Frey's are (their own face squares, as
 * they are): its eye line a quarter of the card's width down, in the middle across, eye to chin about a tenth of its width.
 */
export const SHOP_BUST: Frame = { ...BUST, fit: {
    kirze: { zoom: 1.24, x: -0.11, y: 0.27 },
    klaus: { zoom: 1, x: -0.01, y: 0.13 },
    annette: { zoom: 1.15, x: 0.02, y: 0.23 },
    morrah: { zoom: 1.33, x: -0.09, y: 0.12 },
    laias: { zoom: 1.64, x: -0.04, y: 0.18 },
    seria: { zoom: 1.04, x: 0, y: 0.27 },
    ezekiel: { zoom: 1.6, x: 0.4, y: -0.25 },
    lorraine: { zoom: 1.03, x: 0.02, y: 0.09 },
    valance: { zoom: 1.45, x: -0.14, y: 0.21 },
    selene: { zoom: 1.5, x: 0.02, y: 0.22 },
    crow: { zoom: 1.45, x: -0.05, y: 0.25 },
    naila: { zoom: 1.5, x: -0.05, y: 0.18 },
    neraxis: { zoom: 1.3, x: 0, y: 0 },
    yanne: { zoom: 1.3, x: 0, y: 0 },
    tanya: { zoom: 1, x: -0.2, y: 0 },
    // Short ones (a red panda, a dwarf): set lower than the others, to fill the card down to their feet.
    oddy: { zoom: 1.15, x: 0, y: -0.9 },
    phillop: { zoom: 1.15, x: 0, y: -0.75 },
    'rebel-klaus': { zoom: 1.4, x: 0.07, y: 0.12 },
    'dark-lord-kasel': { zoom: 1.4, x: -0.1, y: 0.26 },
  },
};

/**
 * The frames the pages cut the heroes' pictures with, and how many pixels across each one's cuts are made as the site
 * is built (scripts/hero-cuts.mjs: the most any page asks of it). Each hero's is then a small picture of its own,
 * fetched in place of its whole picture (hundreds of KB, and cut in the page). A frame not here is cut in the page.
 */
export const BUILT_CUTS: ReadonlyMap<Frame, number> = new Map([
  [FACE, 256],
  [TAB_FACE, 96],
  [BUST, 200],
  [SHOP_BUST, 360],
]);

/** Where a cut comes from: its hero's picture, the part of it taken (in its pixels; it may go off the picture, where the cut is left clear), and the cut's size. */
export interface CutArea {
  src: string;
  from: { x: number; y: number; w: number; h: number };
  width: number;
  height: number;
}

/** Where a hero's cut in `frame`, `width` pixels across, comes from: the face in the middle across, `above` of a face below the top. Null when it has no picture. */
export function cutArea(id: string, frame: Frame, width: number): CutArea | null {
  const picture = heroPicture(id);
  if (!picture) return null;
  const { x, y, size: square } = picture.crop;
  const fit = frame.fit?.[id] ?? { zoom: 1, x: 0, y: 0 };
  // The face's middle, and its size as the frame takes it.
  const middle = { x: x + square / 2 + fit.x * square, y: y + square / 2 + fit.y * square };
  const size = square / fit.zoom;
  const from = { x: middle.x - (size * frame.wide) / 2, y: middle.y - size / 2 - size * frame.above, w: size * frame.wide, h: size * frame.tall };
  return { src: picture.src, from, width, height: Math.round((width * frame.tall) / frame.wide) };
}

/**
 * Where a built cut is (under public/hero-cuts/): named for its hero, and for what it's cut from and how, so a cut
 * made before its picture's crop or its frame changed is never taken for it.
 */
export function cutFile(id: string, area: CutArea): string {
  // FNV-1a.
  let hash = 0x811c9dc5;
  for (const char of JSON.stringify(area)) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
  return `/hero-cuts/${id}-${(hash >>> 0).toString(36)}.webp`;
}

const cuts = new Map<string, Promise<string | null>>();

/**
 * A hero's face or bust cut out of its picture, `width` pixels across (a page sizes it: a built cut is as big as
 * BUILT_CUTS has it, whatever is asked); null when it has none, or it can't be read.
 */
export function heroCut(id: string, frame: Frame, width = 256): Promise<string | null> {
  // A face by itself (a square frame): King's Raid's own icon of it, where it has one.
  if (frame.wide === frame.tall) {
    const assets = HERO_ASSETS.find((hero) => hero.folder === `heroes/${id}`);
    const icon = assets?.skins[0] && iconPicture(assets, assets.skins[0]);
    if (icon) return Promise.resolve(icon);
  }
  const fit = frame.fit?.[id];
  const key = `${id}:${frame.wide}:${frame.tall}:${frame.above}:${fit ? `${fit.zoom}:${fit.x}:${fit.y}` : ''}:${width}`;
  let cut = cuts.get(key);
  if (!cut) {
    cut = builtCut(id, frame).then((built) => built ?? cutPicture(id, frame, width));
    cuts.set(key, cut);
  }
  return cut;
}

/** Its cut as the site was built (its address), null when there is none: in `yarn dev` (a picture may have changed since: it's cut in the page), or where the build couldn't cut it. */
async function builtCut(id: string, frame: Frame): Promise<string | null> {
  const width = BUILT_CUTS.get(frame);
  if (import.meta.env.DEV || width === undefined) return null;
  const area = cutArea(id, frame, width);
  if (!area) return null;
  const file = cutFile(id, area);
  const image = new Image();
  image.src = file;
  try {
    await image.decode();
    return file;
  } catch {
    return null;
  }
}

/** Its cut, made here from its whole picture (a data: address). */
async function cutPicture(id: string, frame: Frame, width: number): Promise<string | null> {
  const area = cutArea(id, frame, width);
  if (!area) return null;
  const image = new Image();
  image.src = area.src;
  try {
    await image.decode();
  } catch {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = area.width;
  canvas.height = area.height;
  const pen = canvas.getContext('2d');
  if (!pen) return null;
  // Whatever falls off the picture is left clear.
  const { from } = area;
  pen.drawImage(image, from.x, from.y, from.w, from.h, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL();
}

/**
 * The stats King's Raid counts in points, 1,000 to 100% (the raid's POINTS): its chances and rates, which the Stats tab shows
 * as percentages. Not Crit DMG, Block DEF, ATK or mana, which aren't.
 */
const CHANCE_STAT =
  "(?:(?:P\\.|M\\.)?Crit(?:ical)? (?:Chance|Rate|Resist(?:ance)?)|(?:DEF )?Penetration|(?:CC |Debuff )?ACC|Accuracy|Dodge(?: Rate| Chance)?|(?:All |P\\.|M\\.)?Block(?: Rate| Chance)?(?! DEF)|CC Resist(?:ance)?|Lifesteal|ATK Spd(?: reduction)?|ATK Speed|Attack Speed|Tough(?:ness)?)";
/** A chance stat, then (in the same clause) "by" and its points: "ATK Spd of all allies by 300". */
const STAT_BY = new RegExp(`\\b(${CHANCE_STAT})([^.,;%\\d]*?\\bby )(\\d+(?:\\.\\d+)?)(?![\\d.,]*\\s*(?:%|sec))\\b`, 'gi');
/** Points just before a chance stat: "only 50 Penetration and 25 ACC". */
const POINTS_STAT = new RegExp(`\\b(\\d+(?:\\.\\d+)?) (${CHANCE_STAT})\\b`, 'gi');
/** What a perk "only gains" when it's had twice, after a chance stat: "When overlapped with the same perk, only gains 50." */
const ONLY_GAINS = /\b(only gains|gains only) (\d+(?:\.\d+)?)(?=\.)/gi;

/** Points as a percentage: 250 is "25%". */
const asPercent = (points: string): string => `${Math.round(Number(points) * 10) / 100}%`;

/** King's Raid's words with its chance stats' points as the percentages they are: "Increases Crit Chance by 250" says "by 25%". */
export function chancesAsPercent(text: string): string {
  let changed = false;
  const out = text
    .replace(STAT_BY, (_, stat: string, between: string, points: string) => ((changed = true), `${stat}${between}${asPercent(points)}`))
    .replace(POINTS_STAT, (_, points: string, stat: string) => ((changed = true), `${asPercent(points)} ${stat}`));
  return changed ? out.replace(ONLY_GAINS, (_, gains: string, points: string) => `${gains} ${asPercent(points)}`) : out;
}

/** A skill's words, as King's Raid marks them: its numbers (20%, 12,000, 0.5) and what's in brackets ([Darkened Power]) each in a colour of their own (the heroes page's Skills tab, the raid's popups), its chance stats' points as percentages. */
export function skillText(text: string): (string | HTMLElement)[] {
  return chancesAsPercent(text)
    .split(/(\[[^\]]+\]|\d+(?:,\d{3})*(?:\.\d+)?%?)/)
    .filter(Boolean)
    .map((part) => (part.startsWith('[') ? el('b', 'skill-effect', part) : /^\d/.test(part) ? el('b', 'skill-number', part) : part));
}
