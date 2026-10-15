import { el, statBlocks, type StatSection } from '../../shared/items';
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
  ui.statsList.append(...statBlocks([hero, ...(gear?.stats ?? [])]));
  if (!gear?.stats?.length) ui.statsList.append(el('p', 'stats-empty', 'Stats are not available yet.'));
}
