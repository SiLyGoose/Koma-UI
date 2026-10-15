import type { Databank } from '../protocol/databank';

/** The databank as the bot says it (../protocol/databank.ts). */
export type { Databank, DatabankBoss, DatabankItem, DatabankRaid, DatabankRewards, ItemSource, RaidWeekView } from '../protocol/databank';
export type { Stars } from '../protocol/items';
export type { RaidLevel } from '../protocol/raid';

/** A raid class: what a class item's tag says, what the filter offers, and what the Classes show. Its picture is public/gear/classes/<id>.png. */
export type RaidClass = Databank['classes'][number];


/** What the member owns of one item: how many copies, and the best one's level. */
export interface Owned {
  count: number;
  best: number;
}
