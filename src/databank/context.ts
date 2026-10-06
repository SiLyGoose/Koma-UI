import type { Slot } from '../shared/items/items';
import type { StarChoice } from '../shared/items/star-filter';
import type { Databank, DatabankItem, Owned } from './types';

/** Narrow screens show the item picked in a sheet over the list, only once one is picked. */
export const narrow = window.matchMedia('(max-width: 899px)');

export type DatabankUi = ReturnType<typeof findUi>;

function findUi(root: HTMLElement) {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector(`#${id}`) as T;
  return {
    status: $('status'),
    databank: $('databank'),
    detail: $('detail'),
    detailBody: $('detail-body'),
    detailOwned: $('detail-owned'),
    search: $<HTMLInputElement>('search'),
    server: $<HTMLSelectElement>('server'),
    list: $('db-list'),
    count: $('db-count'),
    ownedOnly: $<HTMLButtonElement>('owned-only'),
    stars: $('stars'),
    tabs: [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')],
  };
}

/** Everything the mounted databank knows: its elements, the items, what they own, and what's picked. */
export interface DatabankContext {
  ui: DatabankUi;
  databank: Databank | null;
  /** By item id; null when not logged in (nothing to mark). */
  owned: Map<string, Owned> | null;
  slotFilter: Slot | 'all';
  starFilter: StarChoice;
  onlyOwned: boolean;
  query: string;
  /** The item shown in the panel. On narrow screens it's only open once one is picked. */
  picked: string | null;
  sheetOpen: boolean;
  /** The level the panel shows (1 to maxLevel), and whether the masterwork bonus is on (at the top level only). */
  level: number;
  masterwork: boolean;
}

export function createContext(root: HTMLElement): DatabankContext {
  return {
    ui: findUi(root),
    databank: null,
    owned: null,
    slotFilter: 'all',
    starFilter: 'all',
    onlyOwned: false,
    query: '',
    picked: null,
    sheetOpen: false,
    level: 5,
    masterwork: false,
  };
}

export function status(ctx: DatabankContext, text: string | null, bad = false): void {
  ctx.ui.status.hidden = text === null;
  ctx.ui.status.textContent = text ?? '';
  ctx.ui.status.classList.toggle('bad', bad);
}

export const itemById = (ctx: DatabankContext, id: string | null): DatabankItem | undefined => (id ? ctx.databank?.items.find((item) => item.id === id) : undefined);
