import { el, type StatSection } from '../../shared/items';
import { classLabel, shownClass } from './classes';
import type { GearContext } from './context';

/**
 * The Common tab: the hero's stats, worked out by the bot (each one their gear changes, with what it is
 * without), the raid's for their class: picking another class brings the bot's numbers for that one. Its
 * first group is about the hero rather than their gear: their class (a question mark with none).
 */
export function renderStats(ctx: GearContext): void {
  const { ui, gear } = ctx;
  ui.statsList.textContent = '';
  const hero: StatSection = { title: 'Hero', rows: [{ label: 'Class', value: classLabel(shownClass(ctx)), base: null }] };
  for (const section of [hero, ...(gear?.stats ?? [])]) {
    const block = el('section', 'stats-section');
    block.append(el('h3', '', section.title));
    const list = el('dl');
    for (const row of section.rows) {
      const line = el('div', `stats-row${row.base === null ? '' : ' changed'}`);
      const value = el('dd', '', row.value);
      if (row.base !== null) value.append(el('span', 'stats-base', `base ${row.base}`));
      line.append(el('dt', '', row.label), value);
      list.append(line);
    }
    block.append(list);
    ui.statsList.append(block);
  }
  if (!gear?.stats?.length) ui.statsList.append(el('p', 'stats-empty', 'Stats are not available yet.'));
}
