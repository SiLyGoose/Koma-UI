import { matchesSearch, matchesStars } from '../shared/items';
import type { DatabankContext } from './context';
import type { DatabankItem } from './types';

/** Whether `item` is shown: its slot and stars picked, owned (when only those are), and every word searched for in it (give or take a typo). */
export function matches(ctx: DatabankContext, item: DatabankItem): boolean {
  const { slotFilter, starFilter, onlyOwned, owned, query } = ctx;
  if (slotFilter !== 'all' && item.slot !== slotFilter) return false;
  if (!matchesStars(starFilter, item.stars)) return false;
  if (onlyOwned && !owned?.has(item.id)) return false;
  return matchesSearch(query, item);
}
