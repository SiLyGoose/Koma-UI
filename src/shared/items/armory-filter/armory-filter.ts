import './armory-filter.css';
import { el, type Slot, stars, tmTier, uwTier } from '../items';

/*
 * The armories' filter (the gear page's, the forge's, the databank's): a Filter button beside the search,
 * with how many filters are on, and its panel under it: the type (All, Weapons, Armor, Treasures), the
 * stars (Any, then 4 to 1) and, where the page offers them, the class (the databank's: a raid class's own items; the
 * heroes page's: what works on a class, picked for the hero shown),
 * Owned only (the databank's), Refineable (the forge's) and Hero gear (the gear page's: TechnoMagic gear and unique
 * weapons, which only heroes wear, hidden until it is on), with room for more (a sort) as they come. A choice applies at once and the panel stays open for the next; a click outside it, Escape or
 * tabbing away closes it. Its markup is a box in the page (`<div id="armory-filter" class="armory-filter">`),
 * which this fills.
 */

export type StarChoice = 1 | 2 | 3 | 4 | 'tm' | 'uw' | 'all';

/** Whether an item of a tier (../items.ts tierOf: its stars, or TechnoMagic gear's or a unique weapon's own) is shown under `choice`. */
export const matchesStars = (choice: StarChoice, tier: number | 'tm' | 'uw'): boolean => choice === 'all' || choice === tier;

/** What the filter picks. */
export interface ArmoryChoice {
  slot: Slot | 'all';
  stars: StarChoice;
  /** Only what they own; null where it isn't offered (the gear page and forge, or the databank logged out). */
  owned: boolean | null;
  /** Only what can be refined; null where it isn't offered (anywhere but the forge). */
  refineable: boolean | null;
  /** Only one raid class's items (its id), or 'all'; null where it isn't offered (anywhere but the databank and the heroes page). */
  cls: string | 'all' | null;
  /** Gear only heroes wear (TechnoMagic gear, unique weapons) shown too; null where it isn't offered (anywhere but the gear page, which shows it always). */
  heroGear: boolean | null;
}

/** A raid class the filter offers: its picture is public/gear/classes/<id>.png. */
export interface ClassChoice {
  id: string;
  name: string;
}

export interface ArmoryFilter {
  /** Shows the page's choice as it is now (the gear page picks a type itself, from a slot), without telling onChange. */
  show(choice: ArmoryChoice): void;
  /** Hears each choice made in the panel. */
  onChange(listener: (choice: ArmoryChoice) => void): void;
  /** The classes its Class group offers (a page that has them, once it knows them). */
  setClasses(classes: readonly ClassChoice[]): void;
  /** Stops listening to the page (a page going away). */
  destroy(): void;
}

const TYPES: readonly [Slot | 'all', string][] = [
  ['all', 'All'],
  ['weapon', 'Weapons'],
  ['armor', 'Armor'],
  ['treasure', 'Treasures'],
];
const TIERS: readonly StarChoice[] = ['all', 'tm', 'uw', 4, 3, 2, 1];

let count = 0;

export function armoryFilter(box: HTMLElement): ArmoryFilter {
  const id = `armory-filter-${++count}`;
  let current: ArmoryChoice = { slot: 'all', stars: 'all', owned: null, refineable: null, cls: null, heroGear: null };
  let listener: ((choice: ArmoryChoice) => void) | null = null;

  // The button: a funnel, Filter, and how many are on.
  const button = el('button', 'armory-filter-button action secondary');
  button.type = 'button';
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', `${id}-panel`);
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18l-7 8.2V19l-4 2v-7.8Z" /></svg>';
  const badge = el('span', 'armory-filter-count');
  button.append(el('span', '', 'Filter'), badge);

  /** A choice in the panel: its (hidden) radio or checkbox, the mark drawn for it, and its words. Wide: a row of its own. */
  const option = (type: 'radio' | 'checkbox', name: string, value: string, label: string | HTMLElement, wide = false): HTMLLabelElement => {
    const row = el('label', wide ? 'armory-filter-option wide' : 'armory-filter-option');
    const input = el('input');
    input.type = type;
    input.name = `${id}-${name}`;
    input.value = value;
    row.append(input, el('span', 'armory-filter-mark'), label);
    return row;
  };
  const group = (title: string, ...options: HTMLElement[]): HTMLFieldSetElement => {
    const set = el('fieldset', 'armory-filter-group');
    const choices = el('div', 'armory-filter-options');
    choices.append(...options);
    set.append(el('legend', '', title), choices);
    return set;
  };

  const panel = el('div', 'armory-filter-panel');
  panel.id = `${id}-panel`;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Filter');
  // Focusable, so a click on its words (not themselves focusable) keeps the focus in it rather than dropping it.
  panel.tabIndex = -1;
  panel.hidden = true;
  const types = group('Type', ...TYPES.map(([slot, name]) => option('radio', 'slot', slot, name)));
  // Any across the top, then the tiers in pairs.
  const tiers = group('Stars', ...TIERS.map((n) => (n === 'all' ? option('radio', 'stars', 'all', 'Any', true) : option('radio', 'stars', String(n), n === 'tm' ? tmTier() : n === 'uw' ? uwTier() : stars(n)))));
  const owned = option('checkbox', 'owned', 'owned', 'Owned only', true);
  const refineable = option('checkbox', 'refineable', 'refineable', 'Refineable', true);
  const heroGear = option('checkbox', 'hero-gear', 'hero-gear', 'Hero gear', true);
  const only = group('Show', owned, refineable, heroGear);
  // The classes come from the page (setClasses): Any across the top, then each with its badge.
  const classes = group('Class');
  const classOptions = classes.querySelector('.armory-filter-options') as HTMLElement;
  let offered = 0;
  const clear = el('button', 'armory-filter-clear action secondary', 'Clear filters');
  clear.type = 'button';
  panel.append(types, tiers, classes, only, clear);
  box.append(button, panel);

  const input = (name: string, value: string): HTMLInputElement | null =>
    panel.querySelector<HTMLInputElement>(`input[name="${id}-${name}"][value="${value}"]`);

  /** Draws `current`: the choices checked, Owned only and Refineable if offered, and how many are on. */
  function draw(): void {
    const slot = input('slot', current.slot);
    const tier = input('stars', String(current.stars));
    if (slot) slot.checked = true;
    if (tier) tier.checked = true;
    classes.hidden = current.cls === null || offered === 0;
    const cls = current.cls === null ? null : input('class', current.cls);
    if (cls) cls.checked = true;
    owned.hidden = current.owned === null;
    refineable.hidden = current.refineable === null;
    heroGear.hidden = current.heroGear === null;
    only.hidden = owned.hidden && refineable.hidden && heroGear.hidden;
    (input('owned', 'owned') as HTMLInputElement).checked = current.owned === true;
    (input('refineable', 'refineable') as HTMLInputElement).checked = current.refineable === true;
    (input('hero-gear', 'hero-gear') as HTMLInputElement).checked = current.heroGear === true;
    const on =
      Number(current.slot !== 'all') +
      Number(current.stars !== 'all') +
      Number(current.owned === true) +
      Number(current.refineable === true) +
      Number(current.cls !== null && current.cls !== 'all') +
      Number(current.heroGear === true);
    badge.textContent = String(on);
    badge.hidden = on === 0;
    clear.hidden = on === 0;
    button.setAttribute('aria-label', on === 0 ? 'Filter' : `Filter, ${on} on`);
  }

  function choose(choice: ArmoryChoice): void {
    current = choice;
    draw();
    listener?.(current);
  }

  panel.addEventListener('change', () => {
    const picked = (name: string): string | undefined => panel.querySelector<HTMLInputElement>(`input[name="${id}-${name}"]:checked`)?.value;
    const tier = picked('stars') ?? 'all';
    choose({
      slot: (picked('slot') ?? 'all') as Slot | 'all',
      stars: tier === 'all' || tier === 'tm' || tier === 'uw' ? tier : (Number(tier) as StarChoice),
      owned: current.owned === null ? null : picked('owned') !== undefined,
      refineable: current.refineable === null ? null : picked('refineable') !== undefined,
      cls: current.cls === null ? null : (picked('class') ?? 'all'),
      heroGear: current.heroGear === null ? null : picked('hero-gear') !== undefined,
    });
  });
  clear.addEventListener('click', () => {
    choose({
      slot: 'all',
      stars: 'all',
      owned: current.owned === null ? null : false,
      refineable: current.refineable === null ? null : false,
      cls: current.cls === null ? null : 'all',
      heroGear: current.heroGear === null ? null : false,
    });
    // The button it was goes away with nothing left to clear: the focus goes to the first choice.
    panel.querySelector<HTMLInputElement>('input:checked')?.focus();
  });

  function open(show: boolean, focusButton = false): void {
    if (panel.hidden !== show) return;
    panel.hidden = !show;
    button.setAttribute('aria-expanded', String(show));
    if (show) panel.querySelector<HTMLInputElement>('input:checked')?.focus();
    else if (focusButton) button.focus();
  }

  button.addEventListener('click', () => open(panel.hidden));
  // Escape, while it's open, closes the panel and nothing else (the page's own Escape doesn't hear it).
  box.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || panel.hidden) return;
    e.stopPropagation();
    open(false, true);
  });
  // Tabbing away closes it. Focus going nowhere (a click on something that can't take it) is left to the click:
  // inside, it's choosing; outside, `outside` closes it.
  box.addEventListener('focusout', (e) => {
    const to = e.relatedTarget as Node | null;
    if (to && !box.contains(to)) open(false);
  });
  const outside = (e: PointerEvent): void => {
    if (!box.contains(e.target as Node)) open(false);
  };
  document.addEventListener('pointerdown', outside);

  draw();
  return {
    show(choice) {
      current = choice;
      draw();
    },
    onChange(next) {
      listener = next;
    },
    setClasses(list) {
      offered = list.length;
      classOptions.replaceChildren(
        option('radio', 'class', 'all', 'Any', true),
        ...list.map(({ id: cls, name }) => {
          const label = el('span', 'armory-filter-class');
          const badge = el('img');
          badge.src = `/gear/classes/${cls}.png`;
          badge.alt = '';
          badge.draggable = false;
          label.append(badge, name);
          return option('radio', 'class', cls, label);
        }),
      );
      draw();
    },
    destroy() {
      document.removeEventListener('pointerdown', outside);
    },
  };
}
