import { armoryFilter, armoryGrid, type ArmoryFilter, type ArmoryGrid, type GearCopy, type GearView, type ItemType, type StarChoice, TM_UNSORTED, type TmSort } from '../../shared/items';
import type { Busy } from '../../shared/ui';
import type { GearHost, Member } from './types';

/** The view's elements, found once in its root. */
export interface GearUi {
  status: HTMLElement;
  gear: HTMLElement;
  heroName: HTMLElement;
  /** The class ribbon, its badge, and the picker it opens (./classes.ts): the shade, the box, and the box's buttons. */
  classButton: HTMLButtonElement;
  classIcon: HTMLElement;
  classShade: HTMLElement;
  classPick: HTMLElement;
  classOptions: HTMLElement;
  sprite: HTMLImageElement;
  server: HTMLSelectElement;
  totals: HTMLElement;
  armoryTitle: HTMLElement;
  search: HTMLInputElement;
  /** The armory's Filter: its type and stars. */
  filter: ArmoryFilter;
  /** The armory's cards (../../shared/items/armory.ts). */
  grid: ArmoryGrid<GearCopy>;
  detail: HTMLElement;
  loadoutButton: HTMLButtonElement;
  loadoutMenu: HTMLElement;
  unequipAll: HTMLButtonElement;
  sell: HTMLButtonElement;
  salvage: HTMLButtonElement;
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
}

/** Everything one mounted gear view knows: its host, its elements, and what it's showing. */
export interface GearContext {
  host: GearHost;
  party: NonNullable<GearHost['party']> | null;
  ui: GearUi;
  gear: GearView | null;
  filter: ItemType | 'all';
  /** The star tier the armory shows (its Filter: ../../shared/items/armory-filter/). */
  stars: StarChoice;
  /** The armory shows gear only heroes wear (TechnoMagic gear, unique weapons) too: off until its Filter turns it on (or picks their tier). */
  heroGear: boolean;
  /** How the armory sorts TechnoMagic gear (its Filter's Sort): by a main stat and by potentials, or in its own order. */
  sort: TmSort;
  /** What the armory's search asks for (trimmed and lowercased): every word in a card's name or description (../../shared/items/search.ts). */
  query: string;
  /** What the panel beside the character shows. */
  view: 'common' | 'gear';
  /** The copy shown over the character, if any. */
  picked: string | null;
  /** A change on its way (an equip, unequip, lock, loadout switch, a loadout's new name or sale) and its button: the page waits for it before taking another. */
  busy: Busy | null;
  /** Everyone in the roster (empty until it's loaded, or with a bot from before it). */
  members: Member[];
  /** Whose gear is shown: someone else's (to look at only), or null for their own. With a party, always someone (to look at only, them too). */
  viewing: Member | null;
  /** Counts gear loads, so only the latest one asked for is drawn. */
  loads: number;
  /** Picking copies to sell: the ones picked (null when not selling). The cards then toggle, rather than show what they do. */
  selling: Set<string> | null;
  /** The loadout being named in the menu (null when none is): its number, what's typed so far, and why the bot wouldn't have it. */
  renaming: { number: number; value: string; error: string | null } | null;
  /** The locked loadout whose unlock is being confirmed in the menu (its price asked about), or null. */
  unlocking: number | null;
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
      classButton: $<HTMLButtonElement>('class-button'),
      classIcon: $('class-icon'),
      classShade: $('class-shade'),
      classPick: $('class-pick'),
      classOptions: $('class-options'),
      sprite: $<HTMLImageElement>('stage-sprite'),
      server: $<HTMLSelectElement>('server'),
      totals: $('totals'),
      armoryTitle: $('armory-title'),
      search: $<HTMLInputElement>('armory-search'),
      filter: armoryFilter($('armory-filter')),
      grid: armoryGrid<GearCopy>($('armory-grid')),
      detail: $('detail'),
      loadoutButton: $<HTMLButtonElement>('loadout-button'),
      loadoutMenu: $('loadout-menu'),
      unequipAll: $<HTMLButtonElement>('unequip-all'),
      sell: $<HTMLButtonElement>('sell'),
      salvage: $<HTMLButtonElement>('salvage'),
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
    },
    gear: null,
    filter: 'all',
    stars: 'all',
    heroGear: false,
    sort: TM_UNSORTED,
    query: '',
    view: 'common',
    picked: null,
    busy: null,
    members,
    viewing: party ? (members.find((m) => m.userId === party.first) ?? members[0] ?? null) : null,
    loads: 0,
    selling: null,
    renaming: null,
    unlocking: null,
  };
}

/** Whether the gear shown is theirs to change: their own, or (in a party they may change it in) the one marked `you`. */
export const mine = (ctx: GearContext): boolean => ctx.viewing === null || (ctx.party?.edit === true && ctx.viewing.you);

/** Their own gear, in the raid's party: what they wear can change, nothing else (selling, upgrading and locking stay on the gear page). */
export const wearOnly = (ctx: GearContext): boolean => ctx.party !== null && mine(ctx);

/** Whether their loadouts are theirs to name: on the gear page, their own. */
export const canRename = (ctx: GearContext): boolean => mine(ctx) && !wearOnly(ctx);

export const copyById = (ctx: GearContext, id: string | null): GearCopy | undefined => (id ? ctx.gear?.copies.find((c) => c.id === id) : undefined);

export const isWorn = (ctx: GearContext, copy: GearCopy): boolean => ctx.gear?.equipped[copy.slot] === copy.id;

export function status(ctx: GearContext, text: string | null, bad = false): void {
  ctx.ui.status.hidden = text === null;
  ctx.ui.status.textContent = text ?? '';
  ctx.ui.status.classList.toggle('bad', bad);
}
