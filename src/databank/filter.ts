import { matchesSearch } from '../shared/items/items';
import type { DatabankContext } from './context';
import type { DatabankItem } from './types';

/** Whether `item` is shown: its slot and stars picked, owned (when only those are), and every word searched for in it. */
export function matches(ctx: DatabankContext, item: DatabankItem): boolean {
  const { slotFilter, starFilter, onlyOwned, owned, query } = ctx;
  if (slotFilter !== 'all' && item.slot !== slotFilter) return false;
  if (starFilter !== 'all' && item.stars !== starFilter) return false;
  if (onlyOwned && !owned?.has(item.id)) return false;
  return matchesSearch(query, item.name, item.id, item.description);
}
