import { armoryFilter, type Slot, type StarChoice } from '../shared/items';
import { HEROES } from '../technomagic/sim/heroes';
import type { HeroDef } from '../technomagic/sim/heroes/kit';
import type { Databank, DatabankBoss, DatabankItem, Owned, RaidClass, RaidWeekView } from './types';

/** Narrow screens show the item picked in a sheet over the list, only once one is picked. */
export const narrow = window.matchMedia('(max-width: 899px)');

/** What the page shows: the way in (what there is to look up), every item, the raid bosses, the raid classes, or the TechnoMagic Raid's heroes. Each has its path (./page.ts). */
export type View = 'hub' | 'items' | 'bosses' | 'classes' | 'heroes';

export type DatabankUi = ReturnType<typeof findUi>;

function findUi(root: HTMLElement) {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector(`#${id}`) as T;
  return {
    status: $('status'),
    /** Across the top: the server picker, the page's name board (on the way in), and the X out of a section. */
    bar: $('db-bar'),
    title: $('db-title'),
    close: $('db-close'),
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
  slotFilter: Slot | 'all';
  starFilter: StarChoice;
  /** Only one raid class's own items (its id), or every item. */
  classFilter: string | 'all';
  onlyOwned: boolean;
  query: string;
  /** The item shown in the panel. On narrow screens it's only open once one is picked. */
  picked: string | null;
  sheetOpen: boolean;
  /** The level the panel shows (1 to maxLevel), and whether the masterwork bonus is on (at the top level only). */
  level: number;
  masterwork: boolean;
  /** The boss shown, and the difficulty level its numbers are for. */
  boss: string | null;
  bossLevel: number;
  /** The raid class shown. */
  cls: string | null;
  /** The hero shown. */
  hero: string | null;
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
    masterwork: false,
    boss: null,
    bossLevel: 1,
    cls: null,
    hero: HEROES[0]?.id ?? null,
    week: null,
  };
}

export function status(ctx: DatabankContext, text: string | null, bad = false): void {
  ctx.ui.status.hidden = text === null;
  ctx.ui.status.textContent = text ?? '';
  ctx.ui.status.classList.toggle('bad', bad);
}

export const itemById = (ctx: DatabankContext, id: string | null): DatabankItem | undefined => (id ? ctx.databank?.items.find((item) => item.id === id) : undefined);

/** A raid class's name (its id, from a bot that doesn't say). */
export const className = (ctx: DatabankContext, id: string): string => ctx.databank?.classes?.find((cls) => cls.id === id)?.name ?? id;

export const classById = (ctx: DatabankContext, id: string | null): RaidClass | undefined => (id ? ctx.databank?.classes?.find((cls) => cls.id === id) : undefined);

export const bossById = (ctx: DatabankContext, id: string | null): DatabankBoss | undefined => (id ? ctx.databank?.bosses?.find((boss) => boss.id === id) : undefined);

/** A TechnoMagic Raid hero (the raid's own, not the bot's). */
export const heroById = (id: string | null): HeroDef | undefined => (id ? HEROES.find((hero) => hero.id === id) : undefined);
