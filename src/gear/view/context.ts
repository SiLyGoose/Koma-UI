import type { GearCopy, GearView } from '../../shared/items/gear';
import type { Slot } from '../../shared/items/items';
import type { StarChoice } from '../../shared/items/star-filter';
import type { GearHost, Member } from './types';

/** The view's elements, found once in its root. */
export interface GearUi {
  status: HTMLElement;
  gear: HTMLElement;
  heroName: HTMLElement;
  sprite: HTMLImageElement;
  server: HTMLSelectElement;
  totals: HTMLElement;
  armoryTitle: HTMLElement;
  search: HTMLInputElement;
  stars: HTMLElement;
  grid: HTMLElement;
  detail: HTMLElement;
  loadoutButton: HTMLButtonElement;
  loadoutMenu: HTMLElement;
  unequipAll: HTMLButtonElement;
  sell: HTMLButtonElement;
  sellCancel: HTMLButtonElement;
  sellConfirm: HTMLDialogElement;
  armory: HTMLElement;
  stats: HTMLElement;
  statsTitle: HTMLElement;
  statsList: HTMLElement;
  roster: HTMLElement;
  rosterList: HTMLElement;
  views: HTMLButtonElement[];
  slots: HTMLButtonElement[];
  tabs: HTMLButtonElement[];
}

/** Everything one mounted gear view knows: its host, its elements, and what it's showing. */
export interface GearContext {
  host: GearHost;
  party: NonNullable<GearHost['party']> | null;
  ui: GearUi;
  gear: GearView | null;
  filter: Slot | 'all';
  /** The star tier the armory shows (its star chips: ../../shared/items/star-filter.ts). */
  stars: StarChoice;
  /** What the armory's search asks for (trimmed and lowercased): every word in a card's name or description (../../shared/items/search.ts). */
  query: string;
  /** What the panel beside the character shows. */
  view: 'common' | 'gear';
  /** The copy shown over the character, if any. */
  picked: string | null;
  /** An equip, unequip or loadout switch on its way: the page waits for it before taking another. */
  busy: boolean;
  /** Everyone in the roster (empty until it's loaded, or with a bot from before it). */
  members: Member[];
  /** Whose gear is shown: someone else's (to look at only), or null for their own. With a party, always someone (to look at only, them too). */
  viewing: Member | null;
  /** Counts gear loads, so only the latest one asked for is drawn. */
  loads: number;
  /** Picking copies to sell: the ones picked (null when not selling). The cards then toggle, rather than show what they do. */
  selling: Set<string> | null;
  /** How many cards across the armory is (3 to 5, by the screen: ../../shared/items/items.css), so its blanks fill out the last row. */
  gridColumns: number;
}

export function createContext(root: HTMLElement, host: GearHost): GearContext {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector(`#${id}`) as T;
  const party = host.party ?? null;
  const members = party?.members ?? [];
  return {
    host,
    party,
    ui: {
      status: $('status'),
      gear: $('gear'),
      heroName: $('hero-name'),
      sprite: $<HTMLImageElement>('stage-sprite'),
      server: $<HTMLSelectElement>('server'),
      totals: $('totals'),
      armoryTitle: $('armory-title'),
      search: $<HTMLInputElement>('armory-search'),
      stars: $('armory-stars'),
      grid: $('armory-grid'),
      detail: $('detail'),
      loadoutButton: $<HTMLButtonElement>('loadout-button'),
      loadoutMenu: $('loadout-menu'),
      unequipAll: $<HTMLButtonElement>('unequip-all'),
      sell: $<HTMLButtonElement>('sell'),
      sellCancel: $<HTMLButtonElement>('sell-cancel'),
      sellConfirm: $<HTMLDialogElement>('sell-confirm'),
      armory: $('armory'),
      stats: $('stats'),
      statsTitle: $('stats-title'),
      statsList: $('stats-list'),
      roster: $('roster'),
      rosterList: $('roster-list'),
      views: [...root.querySelectorAll<HTMLButtonElement>('[data-view]')],
      slots: [...root.querySelectorAll<HTMLButtonElement>('.slot')],
      tabs: [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')],
    },
    gear: null,
    filter: 'all',
    stars: 'all',
    query: '',
    view: 'gear',
    picked: null,
    busy: false,
    members,
    viewing: party ? (members.find((m) => m.userId === party.first) ?? members[0] ?? null) : null,
    loads: 0,
    selling: null,
    gridColumns: 0,
  };
}

/** Whether the gear shown is theirs to change: their own, or (in a party they may change it in) the one marked `you`. */
export const mine = (ctx: GearContext): boolean => ctx.viewing === null || (ctx.party?.edit === true && ctx.viewing.you);

/** Their own gear, in the raid's party: what they wear can change, nothing else (selling, upgrading and locking stay on the gear page). */
export const wearOnly = (ctx: GearContext): boolean => ctx.party !== null && mine(ctx);

export const copyById = (ctx: GearContext, id: string | null): GearCopy | undefined => (id ? ctx.gear?.copies.find((c) => c.id === id) : undefined);

export const isWorn = (ctx: GearContext, copy: GearCopy): boolean => ctx.gear?.equipped[copy.slot] === copy.id;

export function status(ctx: GearContext, text: string | null, bad = false): void {
  ctx.ui.status.hidden = text === null;
  ctx.ui.status.textContent = text ?? '';
  ctx.ui.status.classList.toggle('bad', bad);
}
