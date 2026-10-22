import { matchesSearch, matchesStars, typeOf } from '../shared/items';
import { artifact, heroById, tmGear, type DatabankContext } from './context';
import type { DatabankItem } from './types';

/**
 * Whether `item` is shown: its type, stars and class picked, owned (when only those are), and every word searched for in it
 * (give or take a typo). A unique weapon or treasure is searched by its hero's name too, as if it were in its own.
 */
export function matches(ctx: DatabankContext, item: DatabankItem): boolean {
  const { slotFilter, starFilter, classFilter, onlyOwned, owned, query } = ctx;
  if (slotFilter !== 'all' && typeOf(item) !== slotFilter) return false;
  // (An artifact has no stars' tier of its own: shown with all of them.)
  if (artifact(item) ? starFilter !== 'all' : !matchesStars(starFilter, tmGear(item) ? 'tm' : item.uniqueTreasure ? 'ut' : item.source === 'heroBanner' ? 'uw' : item.stars)) return false;
  if (classFilter !== 'all' && item.class !== classFilter) return false;
  if (onlyOwned && !owned?.has(item.id)) return false;
  const owner = heroById(item.uniqueWeapon ?? item.uniqueTreasure?.hero ?? null);
  return matchesSearch(query, owner ? { ...item, name: `${item.name} ${owner.name}` } : item);
}
