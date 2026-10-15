import type { ShownStatSection } from './gear';
import { el } from './items';

/**
 * Stats, a heading over each group and a row for each (the gear page's Common tab, the heroes page's Stats tab and the
 * databank's Heroes). One that gear changes: on the heroes page (which says what's added) as King's Raid has it, its
 * total blue, then its base and what's added green, in brackets: "9.5% (0% + 9.5%)"; on the gear page, its base under it.
 */
export function statBlocks(sections: readonly ShownStatSection[]): HTMLElement[] {
  return sections.map((section) => {
    const block = el('section', 'stats-section');
    block.append(el('h3', '', section.title));
    const list = el('dl');
    for (const row of section.rows) {
      const line = el('div', `stats-row${row.added !== undefined ? ' split' : row.base !== null ? ' changed' : ''}`);
      const value = el('dd', '', row.icon || row.added !== undefined ? undefined : row.value);
      if (row.icon) {
        // Its picture before the words.
        const icon = el('img', 'stats-icon');
        icon.src = row.icon;
        icon.alt = '';
        const shown = el('span', '', row.value);
        shown.prepend(icon);
        value.append(shown);
      } else if (row.added !== undefined) {
        const split = el('span', 'stats-split', `(${row.base} `);
        split.append(el('span', 'stats-added', row.added), ')');
        value.append(el('span', 'stats-total', row.value), split);
      }
      if (row.base !== null && row.added === undefined) value.append(el('span', 'stats-base', `base ${row.base}`));
      line.append(el('dt', '', row.label), value);
      list.append(line);
    }
    block.append(list);
    return block;
  });
}
