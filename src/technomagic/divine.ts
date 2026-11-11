import type { DpFragment, ShardTier } from '../protocol/divine';
import type { DivinePaid, FightStart } from '../protocol/technomagic';
import type { ShownItem } from './result';
import type { BossDef } from './sim/bosses/boss';
import { DIVINE, DIVINE_SIDES, divineFight, type DivineDef } from './sim/bosses/divine';

/*
 * The Divine Punishment Raid on the raid page (games/divine/: the TechnoMagic Raid's page, entered from its map, ../divine/):
 * which boss of it a page is against, and its fight as the bot's run has it. The bot makes the fight with the sim's startRaid
 * (sim/bot.ts divineOf), which this page doesn't read (it brings the whole of the gear's data with it): the same few lines as
 * that, from the run the bot sent. They must stay as divineOf has them, or the page's fight parts from the bot's (it would say
 * so, and run it again from the bot's, never in step).
 */

/** A Divine Punishment boss by its id (none: not one). */
export const divineNamed = (id: string): DivineDef | undefined => DIVINE.find((one) => one.def.id === id);

/** The fight against `one` as the bot's run (`run`: FightStart.divine) has it: a final boss as the side bosses cleared leave it, with the Full Shards brought. */
export function divineBoss(one: DivineDef, run: FightStart['divine']): BossDef {
  const sides = DIVINE_SIDES[one.group];
  const cleared = one.kind === 'final' ? [...new Set((run?.cleared ?? []).filter((id) => sides.includes(id)))] : [];
  const shard = one.kind !== 'karma' && run?.shard ? { tier: run.shard.tier, count: run.shard.count } : null;
  return divineFight(one, cleared, shard);
}

/**
 * What a Divine Punishment win gives, as King's Raid names it, by its item code (its picture: public/kr/items/<code>.webp,
 * cut from the game's icons: none yet for Solenis' own), and what each is for here.
 */
const FRAGMENTS: Readonly<Record<DpFragment, { name: string; code: string | null; about: string }>> = {
  doomstone: { name: "Dragon's Doomstone Fragment", code: 'PUNISHMENT_RAID_FRAGMENT_1', about: "1,000 craft the Dragon's Doomstone artifact" },
  tear: { name: "Apocalypsion's Tear Fragment", code: 'PUNISHMENT_RAID_FRAGMENT_2', about: "1,000 craft the Apocalypsion's Tear artifact" },
  fuel: { name: "Golem's Fuel Fragment", code: null, about: "1,000 craft the Golem's Fuel artifact" },
  engraving: { name: "Solenis' Engraving Fragment", code: null, about: "1,000 craft the Solenis' Engraving artifact" },
};
const BLOOD: Readonly<Record<DivinePaid['group'], { name: string; code: string | null }>> = {
  apocalypsion: { name: 'Blood of Apostle: Apocalypsion', code: 'BLOOD_OF_APOCALYPSION' },
  solenis: { name: 'Blood of Apostle: Solenis', code: null },
};
/** A shard's picture, by its group, Empty or Full, and tier (King's Raid's SHARD_<FULL|EMPTY>_<GROUP>_<tier>: Solenis' not cut yet, Apocalypsion's in their place). */
export const shardIcon = (_group: DivinePaid['group'], full: boolean, tier: ShardTier | number): string => `/kr/items/SHARD_${full ? 'FULL' : 'EMPTY'}_APOCALYPSION_${tier}.webp`;
const icon = (code: string | null): string | null => (code ? `/kr/items/${code}.webp` : null);

/** What a Divine Punishment win gave, a tile each, as the result shows it (none: nothing). */
export function divineItems(paid: DivinePaid | undefined): ShownItem[] {
  if (!paid) return [];
  const items: ShownItem[] = [];
  const blood = BLOOD[paid.group];
  if (paid.blood && blood) items.push({ name: blood.name, icon: icon(blood.code), count: paid.blood, about: 'crafts Runes of Blasphemy' });
  for (const [fragment, count] of Object.entries(paid.fragments ?? {}) as [DpFragment, number][]) {
    const one = FRAGMENTS[fragment];
    items.push({ name: one.name, icon: icon(one.code), count, about: one.about });
  }
  for (const [tier, count] of Object.entries(paid.full ?? {}) as [ShardTier, number][]) items.push({ name: `Tier ${tier} Full Shard`, icon: shardIcon(paid.group, true, tier), count, about: 'brought into a boss dungeon, it strengthens your heroes and weakens the final boss' });
  for (const [tier, count] of Object.entries(paid.empty ?? {}) as [ShardTier, number][]) items.push({ name: `Tier ${tier} Empty Shard`, icon: shardIcon(paid.group, false, tier), count, about: 'brought into the Karma dungeon, its gauge fills it' });
  if (paid.tickets) items.push({ name: 'Unique Gear Ticket', icon: icon('ALL_UNIQUE_SELECT_ITEM_STAR_0_0'), count: paid.tickets, about: 'gives a 0★ unique weapon or treasure of your choice' });
  if (paid.runes?.length) items.push({ name: 'Mysterious Rune: Legendary', icon: icon('PACKAGE_RUNE_5'), count: paid.runes.length, about: 'opened into a Legendary rune' });
  return items;
}
