import { armoryFilter, type ArmoryFilter, equippedIds, forgePlan, type GearCopy, type GearView, type Slot, type StarChoice } from '../shared/items';
import type { Busy } from '../shared/ui';
import { currentMe, currentServer } from '../site/session';

/** The forge's elements, found once in its root. */
export interface ForgeUi {
  status: HTMLElement;
  forge: HTMLElement;
  anvil: HTMLElement;
  server: HTMLSelectElement;
  hint: HTMLElement;
  target: HTMLElement;
  material: HTMLElement;
  rate: HTMLElement;
  bonus: HTMLElement;
  effects: HTMLElement;
  cost: HTMLElement;
  go: HTMLButtonElement;
  armoryTitle: HTMLElement;
  grid: HTMLElement;
  search: HTMLInputElement;
  /** The armory's Filter: its type, its stars, and Refineable. */
  filter: ArmoryFilter;
  result: HTMLElement;
}

/** Everything the mounted forge knows: its elements, and what's on the anvil. */
export interface ForgeContext {
  ui: ForgeUi;
  gear: GearView | null;
  filter: Slot | 'all';
  /** The star tier the armory shows (its Filter: ../shared/items/armory-filter/). */
  stars: StarChoice;
  /** Whether the armory shows only what can be refined (its Filter's Refineable). */
  refineable: boolean;
  /** What the armory's search asks for (trimmed and lowercased): every word in a card's name or description (../shared/items/search.ts). */
  query: string;
  /** The copy on the anvil, if any. */
  picked: string | null;
  /** The spare picked to be used up by a refine of the copy on the anvil. */
  material: string | null;
  /** What the last refine or forge did, shown in the hint until the next pick. */
  done: string | null;
  /** Whether the last refine or forge took (its line in the hint is green) or not. */
  doneWell: boolean;
  /** A refine or forge on its way (its button: 'strike'): the page waits for it before taking another. */
  busy: Busy | null;
  /** How many cards across the armory is (3 to 5, by the screen: ../shared/items/items.css), so its blanks fill out the last row. */
  gridColumns: number;
}

export function createContext(root: HTMLElement): ForgeContext {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector(`#${id}`) as T;
  return {
    ui: {
      status: $('status'),
      forge: $('forge'),
      anvil: root.querySelector('.anvil') as HTMLElement,
      server: $<HTMLSelectElement>('server'),
      hint: $('hint'),
      target: $('target'),
      material: $('material'),
      rate: $('rate'),
      bonus: $('bonus'),
      effects: $('effects'),
      cost: $('cost'),
      go: $<HTMLButtonElement>('go'),
      armoryTitle: $('armory-title'),
      grid: $('armory-grid'),
      search: $<HTMLInputElement>('armory-search'),
      filter: armoryFilter($('armory-filter')),
      result: $('result'),
    },
    gear: null,
    filter: 'all',
    stars: 'all',
    refineable: false,
    query: '',
    picked: null,
    material: null,
    done: null,
    doneWell: true,
    busy: null,
    gridColumns: 0,
  };
}

export function status(ctx: ForgeContext, text: string | null, bad = false): void {
  ctx.ui.status.hidden = text === null;
  ctx.ui.status.textContent = text ?? '';
  ctx.ui.status.classList.toggle('bad', bad);
}

export const copyById = (ctx: ForgeContext, id: string | null): GearCopy | undefined => (id ? ctx.gear?.copies.find((c) => c.id === id) : undefined);

/** Their zeiucoins in the server picked. */
export const balance = (ctx: ForgeContext): number | null => ctx.gear?.balance ?? currentMe()?.servers.find((s) => s.id === currentServer())?.balance ?? null;

/**
 * The spares a refine of `copy` can use up: their other copies of the item that aren't worn, saved in
 * a loadout or locked (as the bot's refinePlan allows).
 */
function materialsFor(ctx: ForgeContext, copy: GearCopy): GearCopy[] {
  const { gear } = ctx;
  if (!gear) return [];
  const kept = equippedIds(gear);
  return gear.copies.filter((c) => c.itemId === copy.itemId && c.id !== copy.id && !kept.has(c.id) && !c.locked);
}

/**
 * The copies that can be refined: below their top level, with a spare to use up (as materialsFor counts
 * them). Whether they can pay for it isn't counted: that goes by their zeiucoins, not by the copy.
 */
export function refineableIds(ctx: ForgeContext): Set<string> {
  const { gear } = ctx;
  if (!gear) return new Set();
  const kept = equippedIds(gear);
  const spare = (c: GearCopy): boolean => !kept.has(c.id) && !c.locked;
  // How many spares there are of each item.
  const spares = new Map<string, number>();
  for (const c of gear.copies) if (spare(c)) spares.set(c.itemId, (spares.get(c.itemId) ?? 0) + 1);
  const ids = new Set<string>();
  for (const c of gear.copies) {
    const plan = forgePlan(c);
    // A spare other than itself.
    if (plan.kind === 'refine' && plan.refine.blocked !== 'no_duplicate' && (spares.get(c.itemId) ?? 0) > Number(spare(c))) ids.add(c.id);
  }
  return ids;
}

/**
 * With a copy on the anvil, the ids that can be its material (empty when none can: no spare to use
 * up, or it's forged rather than refined); null with the anvil empty. Everything else is greyed out.
 */
export function choosing(ctx: ForgeContext): Set<string> | null {
  const target = copyById(ctx, ctx.picked);
  if (!target) return null;
  if (forgePlan(target).kind !== 'refine') return new Set();
  return new Set(materialsFor(ctx, target).map((c) => c.id));
}
