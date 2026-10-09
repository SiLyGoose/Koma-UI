import './armory-filter.css';
import { el, type Slot, stars } from '../items';

/*
 * The armories' filter (the gear page's, the forge's, the databank's): a Filter button beside the search,
 * with how many filters are on, and its panel under it: the type (All, Weapons, Armor, Treasures), the
 * stars (Any, then 4 to 1) and, where the page offers it, Owned only, with room for more (a sort) as they
 * come. A choice applies at once and the panel stays open for the next; a click outside it, Escape or
 * tabbing away closes it. Its markup is a box in the page (`<div id="armory-filter" class="armory-filter">`),
 * which this fills.
 */

export type StarChoice = 1 | 2 | 3 | 4 | 'all';

/** Whether an item of `n` stars is shown under `choice`. */
export const matchesStars = (choice: StarChoice, n: number): boolean => choice === 'all' || n === choice;

/** What the filter picks. */
export interface ArmoryChoice {
  slot: Slot | 'all';
  stars: StarChoice;
  /** Only what they own; null where it isn't offered (the gear page and forge, or the databank logged out). */
  owned: boolean | null;
}

export interface ArmoryFilter {
  /** Shows the page's choice as it is now (the gear page picks a type itself, from a slot), without telling onChange. */
  show(choice: ArmoryChoice): void;
  /** Hears each choice made in the panel. */
  onChange(listener: (choice: ArmoryChoice) => void): void;
  /** Stops listening to the page (a page going away). */
  destroy(): void;
}

const TYPES: readonly [Slot | 'all', string][] = [
  ['all', 'All'],
  ['weapon', 'Weapons'],
  ['armor', 'Armor'],
  ['treasure', 'Treasures'],
];
const TIERS: readonly StarChoice[] = ['all', 4, 3, 2, 1];

let count = 0;

export function armoryFilter(box: HTMLElement): ArmoryFilter {
  const id = `armory-filter-${++count}`;
  let current: ArmoryChoice = { slot: 'all', stars: 'all', owned: null };
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
  const tiers = group('Stars', ...TIERS.map((n) => (n === 'all' ? option('radio', 'stars', 'all', 'Any', true) : option('radio', 'stars', String(n), stars(n)))));
  const owned = group('Show', option('checkbox', 'owned', 'owned', 'Owned only', true));
  const clear = el('button', 'armory-filter-clear action secondary', 'Clear filters');
  clear.type = 'button';
  panel.append(types, tiers, owned, clear);
  box.append(button, panel);

  const input = (name: string, value: string): HTMLInputElement | null =>
    panel.querySelector<HTMLInputElement>(`input[name="${id}-${name}"][value="${value}"]`);

  /** Draws `current`: the choices checked, Owned only if offered, and how many are on. */
  function draw(): void {
    const slot = input('slot', current.slot);
    const tier = input('stars', String(current.stars));
    if (slot) slot.checked = true;
    if (tier) tier.checked = true;
    owned.hidden = current.owned === null;
    (input('owned', 'owned') as HTMLInputElement).checked = current.owned === true;
    const on = Number(current.slot !== 'all') + Number(current.stars !== 'all') + Number(current.owned === true);
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
      stars: tier === 'all' ? 'all' : (Number(tier) as StarChoice),
      owned: current.owned === null ? null : picked('owned') !== undefined,
    });
  });
  clear.addEventListener('click', () => {
    choose({ slot: 'all', stars: 'all', owned: current.owned === null ? null : false });
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
    destroy() {
      document.removeEventListener('pointerdown', outside);
    },
  };
}
