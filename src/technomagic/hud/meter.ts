import { el } from './dom';

/*
 * The top left of the field: Auto, which uses every hero's skills for it, and under it the meter: each
 * hero in the fight so far, its damage a second and the damage it has dealt this fight (DPS), or its
 * healing (HPS: heals and shields given), the most first, its bar against the most of any.
 */

type Tab = 'dps' | 'hps';

/** How one hero stands on the meter: on the field (and fallen there), and its totals this fight. */
export interface MeterRow {
  on: boolean;
  down: boolean;
  dealt: number;
  healed: number;
}

export interface Meter {
  /** Whether every hero's Auto is on; each hero's totals (in the order they were given), and how long the fight has gone on. */
  draw(auto: boolean, rows: readonly MeterRow[], elapsed: number): void;
}

/** How often the meter is drawn again: numbers that change every frame can't be read. */
const EVERY = 0.25;

const said = (n: number): string => Math.round(n).toLocaleString('en-US');

/** The meter in `root`, a row for each hero (its name and its picture). `auto` is told when Auto is pressed. */
export function makeMeter(root: HTMLElement, heroes: readonly { name: string; face: string }[], auto: () => void): Meter {
  const button = el('button', 'tm-meter-auto', 'Auto');
  button.type = 'button';
  button.title = 'Auto for every hero: their skills are used for them';
  button.addEventListener('click', auto);

  let tab: Tab = 'dps';
  /** Until it is drawn again, and when it last was. */
  let wait = 0;
  let last = 0;
  const tabs = el('div', 'tm-meter-tabs');
  tabs.setAttribute('role', 'tablist');
  const buttons = (['dps', 'hps'] as const).map((which) => {
    const pick = el('button', `tm-meter-tab ${which}`, which.toUpperCase());
    pick.type = 'button';
    pick.setAttribute('role', 'tab');
    pick.title = which === 'dps' ? 'Damage a second, and dealt this fight' : 'Healing a second (heals and shields), and given this fight';
    pick.addEventListener('click', () => {
      tab = which;
      wait = 0;
    });
    tabs.append(pick);
    return { which, pick };
  });

  const list = el('ol', 'tm-meter-rows');
  const rows = heroes.map(({ name, face }) => {
    const row = el('li', 'tm-meter-row');
    const picture = el('img', '');
    picture.src = face;
    picture.alt = name;
    picture.title = name;
    picture.draggable = false;
    const rate = el('span', 'tm-meter-rate');
    const label = el('em', '');
    const value = el('b', '');
    rate.append(label, value);
    const bar = el('span', 'tm-meter-bar');
    const fill = el('i', '');
    const total = el('b', '');
    bar.append(fill, total);
    const words = el('span', 'tm-meter-words');
    words.append(rate, bar);
    row.append(picture, words);
    list.append(row);
    return { row, label, value, fill, total };
  });

  root.append(button, tabs, list);

  return {
    draw(on, given, elapsed) {
      button.setAttribute('aria-pressed', String(on));
      // (Drawn now and then, and at once when its tab is changed.)
      wait -= elapsed - last;
      last = elapsed;
      if (wait > 0) return;
      wait = EVERY;
      for (const { which, pick } of buttons) pick.setAttribute('aria-selected', String(which === tab));

      const of = (row: MeterRow): number => (tab === 'dps' ? row.dealt : row.healed);
      const most = Math.max(1, ...given.map(of));
      // The most first: each row's place in the list, by how much it has (one off the field with nothing isn't shown).
      const order = given.map((row, i) => i).sort((a, b) => of(given[b] as MeterRow) - of(given[a] as MeterRow));
      order.forEach((i, place) => {
        const row = given[i] as MeterRow;
        const shown = rows[i] as (typeof rows)[number];
        shown.row.hidden = !row.on && of(row) <= 0;
        shown.row.style.order = String(place);
        // Fallen: its picture and its bar go grey.
        shown.row.classList.toggle('down', row.down);
        shown.label.textContent = tab === 'dps' ? 'Dps' : 'Hps';
        shown.value.textContent = said(of(row) / Math.max(1, elapsed));
        shown.total.textContent = said(of(row));
        shown.fill.style.width = `${(of(row) / most) * 100}%`;
        shown.fill.className = tab;
      });
    },
  };
}
