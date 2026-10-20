import '../../items/armory-filter/armory-filter.css';
import { HERO_CLASSES } from '../../heroes';
import { el } from '../../items';

/*
 * The heroes' filter (the databank's Heroes, the shop's Heroes tab): a Filter button, as the armories' is
 * (../../items/armory-filter/, whose look it has), with how many filters are on, and its panel under it: the class (Any,
 * then each with its badge), the kind of damage it deals (Any, Physical, Magical: offered once the page knows it) and,
 * logged in, Show owned (off: the heroes they own are left out). A choice applies at once and the panel stays open for the
 * next; a click outside it, Escape or tabbing away closes it. Its markup is a box in the page (`<div class="armory-filter">`),
 * which this fills. The heroes it leaves are listed by name (byName).
 */

export type DamageChoice = 'physical' | 'magical';

/** What the filter picks. */
export interface HeroChoice {
  cls: string | 'all';
  deals: DamageChoice | 'all';
  /** The heroes they own shown too; null where it isn't offered (logged out). */
  owned: boolean | null;
}

/** As the filter starts: every class, either kind of damage, and the heroes they own left out. */
export const NO_HERO_FILTER: HeroChoice = { cls: 'all', deals: 'all', owned: false };

/** What the filter goes by in a hero: its class, the kind of damage it deals (unknown: either), and whether it's theirs (unknown: not). */
export interface Filtered {
  name: string;
  class: string;
  deals?: DamageChoice | null;
  owned?: boolean;
}

/** Whether `hero` is shown under `choice`. */
export const heroShown = (choice: HeroChoice, hero: Filtered): boolean =>
  (choice.cls === 'all' || hero.class === choice.cls) && (choice.deals === 'all' || !hero.deals || hero.deals === choice.deals) && (choice.owned !== false || !hero.owned);

/** Heroes by name, A to Z. */
export const byName = (a: { name: string }, b: { name: string }): number => a.name.localeCompare(b.name);

export interface HeroFilter {
  /** Shows the page's choice (and whether its Damage group is offered: `deals`), without telling onChange. */
  show(choice: HeroChoice, deals: boolean): void;
  /** Hears each choice made in the panel. */
  onChange(listener: (choice: HeroChoice) => void): void;
  /** Stops listening to the page (a page going away). */
  destroy(): void;
}

const DAMAGE: readonly [DamageChoice | 'all', string][] = [
  ['all', 'Any'],
  ['physical', 'Physical'],
  ['magical', 'Magical'],
];

let count = 0;

export function heroFilter(box: HTMLElement): HeroFilter {
  const id = `hero-filter-${++count}`;
  let current: HeroChoice = NO_HERO_FILTER;
  let offersDeals = false;
  let listener: ((choice: HeroChoice) => void) | null = null;

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
  // Any across the top, then the classes in pairs, each with its badge.
  const classes = group(
    'Class',
    option('radio', 'class', 'all', 'Any', true),
    ...HERO_CLASSES.map(({ id: cls, name }) => {
      const label = el('span', 'armory-filter-class');
      const mark = el('img');
      mark.src = `/gear/classes/${cls}.png`;
      mark.alt = '';
      mark.draggable = false;
      label.append(mark, name);
      return option('radio', 'class', cls, label);
    }),
  );
  const damage = group('Damage', ...DAMAGE.map(([deals, name]) => option('radio', 'deals', deals, name, deals === 'all')));
  const owned = option('checkbox', 'owned', 'owned', 'Show owned', true);
  const show = group('Show', owned);
  const clear = el('button', 'armory-filter-clear action secondary', 'Clear filters');
  clear.type = 'button';
  panel.append(classes, damage, show, clear);
  box.append(button, panel);

  const input = (name: string, value: string): HTMLInputElement | null => panel.querySelector<HTMLInputElement>(`input[name="${id}-${name}"][value="${value}"]`);

  /** Draws `current`: the choices checked, the groups offered, and how many are on. */
  function draw(): void {
    const cls = input('class', current.cls);
    const deals = input('deals', current.deals);
    if (cls) cls.checked = true;
    if (deals) deals.checked = true;
    damage.hidden = !offersDeals;
    show.hidden = current.owned === null;
    (input('owned', 'owned') as HTMLInputElement).checked = current.owned === true;
    const on = Number(current.cls !== 'all') + Number(offersDeals && current.deals !== 'all') + Number(current.owned === true);
    badge.textContent = String(on);
    badge.hidden = on === 0;
    clear.hidden = on === 0;
    button.setAttribute('aria-label', on === 0 ? 'Filter' : `Filter, ${on} on`);
  }

  function choose(choice: HeroChoice): void {
    current = choice;
    draw();
    listener?.(current);
  }

  panel.addEventListener('change', () => {
    const picked = (name: string): string | undefined => panel.querySelector<HTMLInputElement>(`input[name="${id}-${name}"]:checked`)?.value;
    choose({
      cls: picked('class') ?? 'all',
      deals: (picked('deals') ?? 'all') as DamageChoice | 'all',
      owned: current.owned === null ? null : picked('owned') !== undefined,
    });
  });
  clear.addEventListener('click', () => {
    choose({ ...NO_HERO_FILTER, owned: current.owned === null ? null : false });
    // The button it was goes away with nothing left to clear: the focus goes to the first choice.
    panel.querySelector<HTMLInputElement>('input:checked')?.focus();
  });

  function open(showing: boolean, focusButton = false): void {
    if (panel.hidden !== showing) return;
    panel.hidden = !showing;
    button.setAttribute('aria-expanded', String(showing));
    if (showing) panel.querySelector<HTMLInputElement>('input:checked')?.focus();
    else if (focusButton) button.focus();
  }

  button.addEventListener('click', () => open(panel.hidden));
  // Escape, while it's open, closes the panel and nothing else (the page's own Escape doesn't hear it).
  box.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || panel.hidden) return;
    e.stopPropagation();
    open(false, true);
  });
  // Tabbing away closes it; a click outside it too.
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
    show(choice, deals) {
      current = choice;
      offersDeals = deals;
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
