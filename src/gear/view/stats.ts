import { el, type StatSection } from '../../shared/items';
import type { GearContext } from './context';

/** The Common tab's first group, about the hero rather than their gear. No classes yet, so it's a question mark. */
const HERO_INFO: StatSection = { title: 'Hero', rows: [{ label: 'Class', value: '?', base: null }] };

/** The Common tab: the hero's stats, worked out by the bot (each one their gear changes, with what it is without). */
export function renderStats(ctx: GearContext): void {
  const { ui, gear } = ctx;
  ui.statsList.textContent = '';
  for (const section of [HERO_INFO, ...(gear?.stats ?? [])]) {
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
