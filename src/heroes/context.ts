import { armoryFilter, type ArmoryFilter, type Slot, type StarChoice } from '../shared/items';
import { HERO_SLOT_KIND, HERO_SLOTS, type Hero, type HeroCopy, type HeroSlot, type HeroesView } from '../shared/heroes';
import type { Busy } from '../shared/ui';

/** The page's elements, found once in its root. */
export interface HeroesUi {
  status: HTMLElement;
  page: HTMLElement;
  member: HTMLSelectElement;
  server: HTMLSelectElement;
  rosterList: HTMLElement;
  classIcon: HTMLElement;
  bust: HTMLImageElement;
  initial: HTMLElement;
  name: HTMLElement;
  className: HTMLElement;
  buy: HTMLAnchorElement;
  slots: HTMLButtonElement[];
  totals: HTMLElement;
  views: HTMLButtonElement[];
  detail: HTMLElement;
  armory: HTMLElement;
  armoryTitle: HTMLElement;
  search: HTMLInputElement;
  filter: ArmoryFilter;
  grid: HTMLElement;
  unequipAll: HTMLButtonElement;
  stats: HTMLElement;
  statsTitle: HTMLElement;
  statsList: HTMLElement;
  skills: HTMLElement;
  skillsTitle: HTMLElement;
  skillsList: HTMLElement;
}

/** Everything the mounted page knows. */
export interface HeroesContext {
  ui: HeroesUi;
  view: HeroesView | null;
  /** The hero shown (its id). */
  hero: string | null;
  /** The slot last pressed: equipping something of its kind puts it there. */
  target: HeroSlot | null;
  /** What the armory shows: a kind of item (all of them), a star tier, and what the search asks for. */
  filter: Slot | 'all';
  stars: StarChoice;
  query: string;
  /** What the panel beside the hero shows. */
  tab: 'stats' | 'gear' | 'skills';
  /** The copy shown over the hero, if any. */
  picked: string | null;
  /** A change on its way, and its button: the page waits for it before taking another. */
  busy: Busy | null;
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

export function createContext(root: HTMLElement): HeroesContext {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector(`#${id}`) as T;
  return {
    ui: {
      status: $('status'),
      page: $('heroes'),
      member: $<HTMLSelectElement>('member'),
      server: $<HTMLSelectElement>('server'),
      rosterList: $('roster-list'),
      classIcon: $('class-icon'),
      bust: $<HTMLImageElement>('hero-bust'),
      initial: $('hero-initial'),
      name: $('hero-name'),
      className: $('hero-class'),
      buy: $<HTMLAnchorElement>('hero-buy'),
      slots: [...root.querySelectorAll<HTMLButtonElement>('.slot')],
      totals: $('totals'),
      views: [...root.querySelectorAll<HTMLButtonElement>('[data-view]')],
      detail: $('detail'),
      armory: $('armory'),
      armoryTitle: $('armory-title'),
      search: $<HTMLInputElement>('armory-search'),
      filter: armoryFilter($('armory-filter')),
      grid: $('armory-grid'),
      unequipAll: $<HTMLButtonElement>('unequip-all'),
      stats: $('stats'),
      statsTitle: $('stats-title'),
      statsList: $('stats-list'),
      skills: $('skills'),
      skillsTitle: $('skills-title'),
      skillsList: $('skills-list'),
    },
    view: null,
    hero: null,
    target: null,
    filter: 'all',
    stars: 'all',
    query: '',
    tab: 'gear',
    picked: null,
    busy: null,
    members: [],
    viewing: null,
    loads: 0,
  };
}

/** Whether the heroes shown are their own (theirs to change), not someone else's to look at. */
export const mine = (ctx: HeroesContext): boolean => ctx.viewing === null;

export const heroShown = (ctx: HeroesContext): Hero | undefined => ctx.view?.heroes.find((hero) => hero.id === ctx.hero);

export const copyById = (ctx: HeroesContext, id: string | null): HeroCopy | undefined => (id ? ctx.view?.copies.find((copy) => copy.id === id) : undefined);

/** The slot of the hero shown that a copy is in, or null. */
export const slotOf = (hero: Hero | undefined, copyId: string): HeroSlot | null => (hero ? (HERO_SLOTS.find((slot) => hero.equipped[slot] === copyId) ?? null) : null);

/**
 * Where equipping a copy puts it on the hero shown: the slot last pressed when it's one of the copy's
 * kind, else the first empty one of its kind, else the first of its kind. A unique weapon, while the hero
 * wields another, in that one's place (a hero wields one: the bot refuses a second).
 */
export function slotFor(ctx: HeroesContext, copy: HeroCopy): HeroSlot {
  const hero = heroShown(ctx);
  const kind = HERO_SLOTS.filter((slot) => HERO_SLOT_KIND[slot] === copy.slot);
  if (copy.uniqueWeapon) {
    const unique = kind.find((slot) => copyById(ctx, hero?.equipped[slot] ?? null)?.uniqueWeapon);
    if (unique) return unique;
  }
  if (ctx.target && kind.includes(ctx.target)) return ctx.target;
  return kind.find((slot) => !hero?.equipped[slot]) ?? (kind[0] as HeroSlot);
}

export function status(ctx: HeroesContext, text: string | null, bad = false): void {
  ctx.ui.status.hidden = text === null;
  ctx.ui.status.textContent = text ?? '';
  ctx.ui.status.classList.toggle('bad', bad);
}
