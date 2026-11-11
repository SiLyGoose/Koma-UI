import type { DpFragment, ShardTier } from '../protocol/divine';
import type { DivinePaid, FightStart } from '../protocol/technomagic';
import type { ShownItem } from './result';
import { BLOOD, BLOOD_ABOUT, EMPTY_ABOUT, FRAGMENTS, FULL_ABOUT, itemIcon, LEGENDARY, shardIcon, TICKET } from './divine-items';
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


/** What a Divine Punishment win gave, a tile each, as the result shows it (none: nothing), named as ./divine-items.ts names them. */
export function divineItems(paid: DivinePaid | undefined): ShownItem[] {
  if (!paid) return [];
  const items: ShownItem[] = [];
  const blood = BLOOD[paid.group];
  if (paid.blood && blood) items.push({ name: blood.name, icon: itemIcon(blood.code), count: paid.blood, about: BLOOD_ABOUT });
  for (const [fragment, count] of Object.entries(paid.fragments ?? {}) as [DpFragment, number][]) {
    const one = FRAGMENTS[fragment];
    items.push({ name: one.name, icon: itemIcon(one.code), count, about: one.about });
  }
  for (const [tier, count] of Object.entries(paid.full ?? {}) as [ShardTier, number][]) items.push({ name: `Tier ${tier} Full Shard`, icon: shardIcon(paid.group, true, tier), count, about: FULL_ABOUT });
  for (const [tier, count] of Object.entries(paid.empty ?? {}) as [ShardTier, number][]) items.push({ name: `Tier ${tier} Empty Shard`, icon: shardIcon(paid.group, false, tier), count, about: EMPTY_ABOUT });
  if (paid.tickets) items.push({ ...TICKET, count: paid.tickets });
  if (paid.runes?.length) items.push({ ...LEGENDARY, count: paid.runes.length });
  return items;
}
