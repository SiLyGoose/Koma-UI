import { armoryFilter, type ItemType, type StarChoice } from '../shared/items';
import { BOSSES } from '../technomagic/sim/bosses';
import type { BossDef } from '../technomagic/sim/bosses/boss';
import { byName, heroFilter, heroShown, NO_HERO_FILTER, type Filtered, type HeroChoice } from '../shared/ui/hero-filter/hero-filter';
import { HEROES } from '../technomagic/sim/heroes';
import type { HeroDef } from '../technomagic/sim/heroes/kit';
import type { Databank, DatabankBoss, DatabankItem, Owned, RaidClass, RaidWeekView } from './types';

/** Narrow screens show the item picked in a sheet over the list, only once one is picked. */
export const narrow = window.matchMedia('(max-width: 899px)');

/**
 * What the page shows: the way in (what there is to look up), the items' way in (hero items or player items: `itemKinds`),
 * one of those lists (`items`), the enemies (the Weekly Bosses, the TechnoMagic Raid's bosses and the Dragon Raid's dragons:
 * `bosses`), the raid classes, or the TechnoMagic Raid's heroes. Each has its path (./page.ts).
 */
export type View = 'hub' | 'itemKinds' | 'items' | 'bosses' | 'classes' | 'heroes';

/** Which items a list shows: a hero's gear (the unique weapons and treasures), or the members' own. */
export type ItemKind = 'hero' | 'player';

export type DatabankUi = ReturnType<typeof findUi>;

function findUi(root: HTMLElement) {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector(`#${id}`) as T;
  return {
    status: $('status'),
    /** Across the top: the server picker, the page's name board (on the way in), and the X out of a section. */
    bar: $('db-bar'),
    title: $('db-title'),
    close: $<HTMLAnchorElement>('db-close'),
    hub: $('db-hub'),
    nodes: $('db-nodes'),
    databank: $('databank'),
    detail: $('detail'),
    detailBody: $('detail-body'),
    detailOwned: $('detail-owned'),
    search: $<HTMLInputElement>('search'),
    server: $<HTMLSelectElement>('server'),
    list: $('db-list'),
    count: $('db-count'),
    /** The Filter: the type, the stars, the class, and Owned only (when logged in). */
    filter: armoryFilter($('filter')),
    bosses: $('db-bosses'),
    bossList: $('boss-list'),
    bossCount: $('boss-count'),
    bossInfo: $('boss-info'),
    bossBody: $('boss-body'),
    classes: $('db-classes'),
    classList: $('class-list'),
    classCount: $('class-count'),
    classInfo: $('class-info'),
    classBody: $('class-body'),
    heroes: $('db-heroes'),
    /** The heroes' Filter: the class, the position and the kind of damage (every hero, owned or not: no Show owned). */
    heroFilter: heroFilter($('hero-filter')),
    heroList: $('hero-list'),
    heroCount: $('hero-count'),
    heroInfo: $('hero-info'),
    heroBody: $('hero-body'),
  };
}

/** Everything the mounted databank knows: its elements, the items and bosses, what they own, and what's picked. */
export interface DatabankContext {
  ui: DatabankUi;
  view: View;
  databank: Databank | null;
  /** By item id; null when not logged in (nothing to mark). */
  owned: Map<string, Owned> | null;
  slotFilter: ItemType | 'all';
  starFilter: StarChoice;
  /** Only one raid class's own items (its id), or every item. */
  classFilter: string | 'all';
  onlyOwned: boolean;
  query: string;
  /** The item shown in the panel. On narrow screens it's only open once one is picked. */
  picked: string | null;
  sheetOpen: boolean;
  /** The level the panel shows (1 to maxLevel). */
  level: number;
  /** Which items the list shows (view `items`). */
  itemKind: ItemKind;
  /** The enemy shown (a Weekly Boss's id, or a raid boss's: raidBossById), the difficulty level a Weekly Boss's numbers are for, and the stage a raid boss's are (a dragon's, in its mode: Normal or Hard). */
  boss: string | null;
  bossLevel: number;
  bossStage: number;
  bossMode: 'normal' | 'hard';
  /** The raid class shown. */
  cls: string | null;
  /** The hero shown. */
  hero: string | null;
  /** What the heroes' Filter picks (Show owned always null: the databank has every hero). */
  heroChoice: HeroChoice;
  /** How the raid stands in the server picked: null when not logged in (or the bot doesn't say). */
  week: RaidWeekView | null;
}

export function createContext(root: HTMLElement): DatabankContext {
  return {
    ui: findUi(root),
    view: 'hub',
    databank: null,
    owned: null,
    slotFilter: 'all',
    starFilter: 'all',
    classFilter: 'all',
    onlyOwned: false,
    query: '',
    picked: null,
    sheetOpen: false,
    level: 5,
    itemKind: 'player',
    boss: null,
    bossLevel: 1,
    bossStage: 1,
    bossMode: 'hard',
    cls: null,
    hero: null,
    heroChoice: { ...NO_HERO_FILTER, owned: null },
    week: null,
  };
}

export function status(ctx: DatabankContext, text: string | null, bad = false): void {
  ctx.ui.status.hidden = text === null;
  ctx.ui.status.textContent = text ?? '';
  ctx.ui.status.classList.toggle('bad', bad);
}

export const itemById = (ctx: DatabankContext, id: string | null): DatabankItem | undefined => (id ? ctx.databank?.items.find((item) => item.id === id) : undefined);

/** Whether an item is a hero's gear (a unique weapon or treasure), not the members' own. */
export const heroItem = (item: DatabankItem): boolean => item.uniqueWeapon !== null || item.uniqueTreasure !== null;
/** The old TechnoMagic gear (from before King's Raid's): no raid drops it any more, so the databank leaves it out. */
const retired = (item: DatabankItem): boolean => item.source === 'technomagic';
/** An item's kind (its list). */
export const kindOf = (item: DatabankItem): ItemKind => (heroItem(item) ? 'hero' : 'player');
/** The items of a kind, in the databank's order. */
export const itemsOfKind = (ctx: DatabankContext, kind: ItemKind): DatabankItem[] => (ctx.databank?.items ?? []).filter((item) => !retired(item) && kindOf(item) === kind);

/** The TechnoMagic Raid's bosses and the Dragon Raid's dragons (the raid's own, not the bot's), by id. */
export const raidBossById = (id: string | null): BossDef | undefined => (id ? BOSSES.find((boss) => boss.id === id) : undefined);

/** A raid class's name (its id, from a bot that doesn't say). */
export const className = (ctx: DatabankContext, id: string): string => ctx.databank?.classes?.find((cls) => cls.id === id)?.name ?? id;

export const classById = (ctx: DatabankContext, id: string | null): RaidClass | undefined => (id ? ctx.databank?.classes?.find((cls) => cls.id === id) : undefined);

export const bossById = (ctx: DatabankContext, id: string | null): DatabankBoss | undefined => (id ? ctx.databank?.bosses?.find((boss) => boss.id === id) : undefined);

/** A TechnoMagic Raid hero (the raid's own, not the bot's). */
export const heroById = (id: string | null): HeroDef | undefined => (id ? HEROES.find((hero) => hero.id === id) : undefined);

/** A hero as the heroes' Filter goes by it: its id (for its line), its class, the kind of damage it deals, and whether they own it. */
export const filtered = (ctx: DatabankContext, hero: HeroDef): Filtered => ({ id: hero.id, name: hero.name, class: hero.class, deals: hero.stats.deals });

/** The heroes the Filter leaves, A to Z. */
export const heroesShown = (ctx: DatabankContext): HeroDef[] => HEROES.filter((hero) => heroShown(ctx.heroChoice, filtered(ctx, hero))).sort(byName);
