import type { DivineGroupId, DpFragment, ShardTier } from '../protocol/divine';

/*
 * What the Divine Punishment Raid gives, as King's Raid names it, by its item code (its picture: public/kr/items/<code>.webp, cut
 * from the game's icons: none yet for Solenis' own), and what each is for here. The raid page's result (./divine.ts divineItems)
 * and the Divine Punishment page's Reward List (../divine/) both name them from here, which brings nothing of the fight with it.
 */

/** An item as a tile shows it: its name, its picture (null: none cut) and what it is for. */
export interface DivineItemName {
  name: string;
  icon: string | null;
  about: string;
}

export const FRAGMENTS: Readonly<Record<DpFragment, { name: string; code: string | null; about: string }>> = {
  doomstone: { name: "Dragon's Doomstone Fragment", code: 'PUNISHMENT_RAID_FRAGMENT_1', about: "1,000 craft the Dragon's Doomstone artifact" },
  tear: { name: "Apocalypsion's Tear Fragment", code: 'PUNISHMENT_RAID_FRAGMENT_2', about: "1,000 craft the Apocalypsion's Tear artifact" },
  fuel: { name: "Golem's Fuel Fragment", code: null, about: "1,000 craft the Golem's Fuel artifact" },
  engraving: { name: "Solenis' Engraving Fragment", code: null, about: "1,000 craft the Solenis' Engraving artifact" },
};
export const BLOOD: Readonly<Record<DivineGroupId, { name: string; code: string | null }>> = {
  apocalypsion: { name: 'Blood of Apostle: Apocalypsion', code: 'BLOOD_OF_APOCALYPSION' },
  solenis: { name: 'Blood of Apostle: Solenis', code: null },
};
export const TICKET: DivineItemName = { name: 'Unique Gear Ticket', icon: '/kr/items/ALL_UNIQUE_SELECT_ITEM_STAR_0_0.webp', about: 'gives a 0★ unique weapon or treasure of your choice' };
export const LEGENDARY: DivineItemName = { name: 'Mysterious Rune: Legendary', icon: '/kr/items/PACKAGE_RUNE_5.webp', about: 'opened into a Legendary rune' };
export const BLOOD_ABOUT = 'crafts Runes of Blasphemy';
export const FULL_ABOUT = 'brought into a boss dungeon, it strengthens your heroes and weakens the final boss';
export const EMPTY_ABOUT = 'brought into the Karma dungeon, its gauge fills it';

/** A shard's picture, by its group, Empty or Full, and tier (King's Raid's SHARD_<FULL|EMPTY>_<GROUP>_<tier>: Solenis' not cut yet, Apocalypsion's in their place). */
export const shardIcon = (_group: DivineGroupId, full: boolean, tier: ShardTier | number): string => `/kr/items/SHARD_${full ? 'FULL' : 'EMPTY'}_APOCALYPSION_${tier}.webp`;
export const itemIcon = (code: string | null): string | null => (code ? `/kr/items/${code}.webp` : null);

/** A reward as the bot's Reward List names it (DivineRewardItem.key: 'blood.<group>', a fragment, 'legendary', 'ticket', 'empty.<tier>'), or null: one this page doesn't know. */
export function rewardItem(key: string): DivineItemName | null {
  const [head, tail] = key.split('.');
  if (head === 'blood' && (tail === 'apocalypsion' || tail === 'solenis')) return { name: BLOOD[tail].name, icon: itemIcon(BLOOD[tail].code), about: BLOOD_ABOUT };
  if (head && head in FRAGMENTS) {
    const one = FRAGMENTS[head as DpFragment];
    return { name: one.name, icon: itemIcon(one.code), about: one.about };
  }
  if (head === 'legendary') return LEGENDARY;
  if (head === 'ticket') return TICKET;
  if (head === 'empty' && tail) return { name: `Tier ${tail} Empty Shard`, icon: shardIcon('apocalypsion', false, tail as ShardTier), about: EMPTY_ABOUT };
  return null;
}
