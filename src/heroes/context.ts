import { armoryFilter, armoryGrid, type ArmoryFilter, type ArmoryGrid, type Slot, type StarChoice } from '../shared/items';
import { HERO_SLOT_KIND, HERO_SLOTS, type HeroView, type HeroCopy, type HeroSlot, type HeroesView } from '../shared/heroes';
import { SIDE_SLOTS } from '../protocol/heroes';
import type { Busy } from '../shared/ui';
import type { ApiResult } from '../site/session';

/**
 * Where the page asks the bot, and who is asking: the site's login (./page.ts), or a game's link (the TechnoMagic
 * Raid's Manage popup, ../technomagic/manage/), which answers for its own server only.
 */
export interface HeroesHost {
  /** Asks the bot (errors are { status, error }; status 0: no answer). */
  api<T>(path: string, init?: RequestInit): Promise<ApiResult<T>>;
  /** The bot's address is set (the site's is built with it). */
  ready: boolean;
  /** Their servers, for the server picker (null: no picker). */
  me(): { servers: { id: string; name: string }[] } | null;
  /** `fresh`: asked again, not the one already loaded (a sale changed their zeiucoins). */
  loadMe(fresh?: boolean): Promise<ApiResult<unknown>>;
  server(): string | null;
  setServer(id: string): void;
  /** The login (or link) has run out. */
  logOut(): void;
  /** The site's own login, not a game's link: selling and locking their gear are the site's only (as the gear page's). */
  site: boolean;
  /** Goes to another of the site's pages (the forge, from a copy's Upgrade). */
  go(href: string): void;
}

/** The page's elements, found once in its root. */
export interface HeroesUi {
  status: HTMLElement;
  page: HTMLElement;
  member: HTMLSelectElement;
  server: HTMLSelectElement;
  rosterList: HTMLElement;
  classIcon: HTMLElement;
  stars: HTMLElement;
  bust: HTMLImageElement;
  initial: HTMLElement;
  name: HTMLElement;
  buy: HTMLAnchorElement;
  slots: HTMLButtonElement[];
  totals: HTMLElement;
  perkEffects: HTMLElement;
  perkEffectsTitle: HTMLElement;
  views: HTMLButtonElement[];
  detail: HTMLElement;
  armory: HTMLElement;
  armoryTitle: HTMLElement;
  search: HTMLInputElement;
  filter: ArmoryFilter;
  /** The armory's cards (../shared/items/armory.ts). */
  grid: ArmoryGrid<HeroCopy>;
  unequipAll: HTMLButtonElement;
  sell: HTMLButtonElement;
  sellCancel: HTMLButtonElement;
  sellConfirm: HTMLDialogElement;
  stats: HTMLElement;
  statsTitle: HTMLElement;
  statsList: HTMLElement;
  ascend: HTMLElement;
  skills: HTMLElement;
  skillsTitle: HTMLElement;
  skillsList: HTMLElement;
  transcend: HTMLElement;
  transcendTitle: HTMLElement;
  tpLeft: HTMLElement;
  perkRows: HTMLElement;
  perkInfo: HTMLElement;
  resetPerks: HTMLButtonElement;
}

/** Everything the mounted page knows. */
export interface HeroesContext {
  host: HeroesHost;
  ui: HeroesUi;
  view: HeroesView | null;
  /** The hero shown (its id). */
  hero: string | null;
  /** The slot last pressed: equipping something of its kind puts it there. */
  target: HeroSlot | null;
  /**
   * What the armory shows: a kind of item (all of them), a star tier, what works on a class (its own items and those of
   * no class; picked for the hero shown as it is picked), and what the search asks for.
   */
  filter: Slot | 'all';
  stars: StarChoice;
  cls: string | 'all';
  query: string;
  /** What the panel beside the hero shows. */
  tab: 'stats' | 'gear' | 'skills' | 'transcend';
  /** The transcendence perk whose words show (its id), if any. */
  perk: string | null;
  /** The copy shown over the hero, if any. */
  picked: string | null;
  /** A change on its way, and its button: the page waits for it before taking another. */
  busy: Busy | null;
  /** Picking copies to sell: the ones picked (null when not selling). The cards then toggle, rather than show what they do. */
  selling: Set<string> | null;
  /** Who in the server has heroes to look at (them first), and whose are shown: null for their own. */
  members: HeroMember[];
  viewing: HeroMember | null;
  /** Counts the loads, so only the latest one is drawn (another member may be picked meanwhile). */
  loads: number;
}

/** Someone in the list of whose heroes to look at (the bot's GET /api/heroes/members). */
export interface HeroMember {
  userId: string;
  name: string;
  avatar: string;
  heroes: number;
  you: boolean;
}

export function createContext(root: HTMLElement, host: HeroesHost): HeroesContext {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector(`#${id}`) as T;
  return {
    host,
    ui: {
      status: $('status'),
      page: $('heroes'),
      member: $<HTMLSelectElement>('member'),
      server: $<HTMLSelectElement>('server'),
      rosterList: $('roster-list'),
      classIcon: $('class-icon'),
      stars: $('hero-stars'),
      bust: $<HTMLImageElement>('hero-bust'),
      initial: $('hero-initial'),
      name: $('hero-name'),
      buy: $<HTMLAnchorElement>('hero-buy'),
      slots: [...root.querySelectorAll<HTMLButtonElement>('.slot')],
      totals: $('totals'),
      perkEffects: $('perk-effects'),
      perkEffectsTitle: $('perk-effects-title'),
      views: [...root.querySelectorAll<HTMLButtonElement>('[data-view]')],
      detail: $('detail'),
      armory: $('armory'),
      armoryTitle: $('armory-title'),
      search: $<HTMLInputElement>('armory-search'),
      filter: armoryFilter($('armory-filter')),
      grid: armoryGrid<HeroCopy>($('armory-grid')),
      unequipAll: $<HTMLButtonElement>('unequip-all'),
      sell: $<HTMLButtonElement>('sell'),
      sellCancel: $<HTMLButtonElement>('sell-cancel'),
      sellConfirm: $<HTMLDialogElement>('sell-confirm'),
      stats: $('stats'),
      statsTitle: $('stats-title'),
      statsList: $('stats-list'),
      ascend: $('ascend'),
      skills: $('skills'),
      skillsTitle: $('skills-title'),
      skillsList: $('skills-list'),
      transcend: $('transcend'),
      transcendTitle: $('transcend-title'),
      tpLeft: $('tp-left'),
      perkRows: $('perk-rows'),
      perkInfo: $('perk-info'),
      resetPerks: $<HTMLButtonElement>('reset-perks'),
    },
    view: null,
    hero: null,
    target: null,
    filter: 'all',
    stars: 'all',
    cls: 'all',
    query: '',
    tab: 'gear',
    perk: null,
    picked: null,
    busy: null,
    selling: null,
    members: [],
    viewing: null,
    loads: 0,
  };
}

/** Whether the heroes shown are their own (theirs to change), not someone else's to look at. */
export const mine = (ctx: HeroesContext): boolean => ctx.viewing === null;

/** Whether their gear is theirs to sell and lock here: their own, on the site (not the raid's Manage popup). */
export const canTrade = (ctx: HeroesContext): boolean => mine(ctx) && ctx.host.site;

export const heroShown = (ctx: HeroesContext): HeroView | undefined => ctx.view?.heroes.find((hero) => hero.id === ctx.hero);

export const copyById = (ctx: HeroesContext, id: string | null): HeroCopy | undefined => (id ? ctx.view?.copies.find((copy) => copy.id === id) : undefined);

/** The slot of the hero shown that a copy is in, or null. */
export const slotOf = (hero: HeroView | undefined, copyId: string): HeroSlot | null => (hero ? (HERO_SLOTS.find((slot) => hero.equipped[slot] === copyId) ?? null) : null);

/** The one slot a unique weapon goes in: the first weapon slot (the bot refuses it in another). */
export const UNIQUE_SLOT: HeroSlot = 'weapon1';

/** The slots a copy goes in (as the bot's heroSlotsFor): a unique weapon UNIQUE_SLOT, a unique treasure the treasure slot and the sub treasure slots, any other those of its kind but the sub treasure slots. */
export const slotsFor = (copy: HeroCopy): HeroSlot[] =>
  copy.uniqueWeapon ? [UNIQUE_SLOT] : copy.uniqueTreasure ? ['treasure', ...SIDE_SLOTS] : HERO_SLOTS.filter((slot) => HERO_SLOT_KIND[slot] === copy.slot && !SIDE_SLOTS.includes(slot));

/**
 * Where equipping a copy puts it on the hero shown: the slot last pressed when it's one the copy goes in, else the
 * first empty one it goes in, else the first. A unique weapon, always UNIQUE_SLOT.
 */
export function slotFor(ctx: HeroesContext, copy: HeroCopy): HeroSlot {
  const hero = heroShown(ctx);
  if (copy.uniqueWeapon) return UNIQUE_SLOT;
  // (Sub treasures only under a main one that is a unique treasure: until then, a unique treasure is the main one.)
  const main = copyById(ctx, hero?.equipped.treasure ?? null);
  const kind = copy.uniqueTreasure && !main?.uniqueTreasure ? (['treasure'] as HeroSlot[]) : slotsFor(copy);
  if (ctx.target && kind.includes(ctx.target)) return ctx.target;
  return kind.find((slot) => !hero?.equipped[slot]) ?? (kind[0] as HeroSlot);
}

export function status(ctx: HeroesContext, text: string | null, bad = false): void {
  ctx.ui.status.hidden = text === null;
  ctx.ui.status.textContent = text ?? '';
  ctx.ui.status.classList.toggle('bad', bad);
}
