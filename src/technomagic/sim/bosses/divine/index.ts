import type { BossDef } from '../boss';
import { APOCALYPSION, APOCALYPSION_SIDES, apocalypsionFight } from './apocalypsion';
import { DP_ARMARTA, DP_SCALAXIA, DP_TEMERAIRE, DP_ZYRRKINOTH } from './dragons';
import { KARMA_APOCALYPSION, KARMA_SOLENIS } from './karma';
import { ALTIGMA, LUCITERON, SOLENIS, SOLENIS_SIDES, solenisFight } from './solenis';
import { withShards, type ShardGroup, type ShardUse } from './shards';

/*
 * King's Raid's Divine Punishment Raid (KR-extracted/briefs/divine-punishment.md), as the TechnoMagic Raid has it: fought
 * alone (its boss dungeons King's Raid's 4 Main and 4 Sub heroes, its karma dungeons 3), in two groups, each with its side
 * bosses, its final boss and its karma dungeon (its story dungeons are not here). Every boss with King's Raid's own numbers,
 * unscaled (as Galgoria's and Siegfried's are), at its Infinite level (./levels.ts); their kits stand-ins for now (./kit.ts).
 * - Apocalypsion's: the four dragons (./dragons.ts), then Tersio and Apocalypsion in one fight (./apocalypsion.ts), the dragons
 *   left alive giving both their passives; its karma dungeon, Inpele's (./karma.ts).
 * - Solenis': Luciteron and Altigma, then Solenis, each mid-boss cleared operating on her (./solenis.ts); its karma dungeon,
 *   Vhegort's.
 * A boss dungeon may be brought Full Shards of its group's (./shards.ts), which the karma dungeons' gauge fills.
 */

export type DivineGroup = ShardGroup;
export type DivineKind = 'side' | 'final' | 'karma';

/** A Divine Punishment boss: its group and kind, and its fight as it is with nothing cleared. */
export interface DivineDef {
  def: BossDef;
  group: DivineGroup;
  kind: DivineKind;
}

export const DIVINE: readonly DivineDef[] = [
  { def: DP_TEMERAIRE, group: 'apocalypsion', kind: 'side' },
  { def: DP_SCALAXIA, group: 'apocalypsion', kind: 'side' },
  { def: DP_ZYRRKINOTH, group: 'apocalypsion', kind: 'side' },
  { def: DP_ARMARTA, group: 'apocalypsion', kind: 'side' },
  { def: APOCALYPSION, group: 'apocalypsion', kind: 'final' },
  { def: LUCITERON, group: 'solenis', kind: 'side' },
  { def: ALTIGMA, group: 'solenis', kind: 'side' },
  { def: SOLENIS, group: 'solenis', kind: 'final' },
  { def: KARMA_APOCALYPSION, group: 'apocalypsion', kind: 'karma' },
  { def: KARMA_SOLENIS, group: 'solenis', kind: 'karma' },
];

/** The Divine Punishment bosses' fights, in that order. */
export const DIVINE_BOSSES: readonly BossDef[] = DIVINE.map((one) => one.def);

/** A group's side bosses, by id (the dragons; the mid-bosses). */
export const DIVINE_SIDES: Readonly<Record<DivineGroup, readonly string[]>> = { apocalypsion: APOCALYPSION_SIDES, solenis: SOLENIS_SIDES };

/**
 * A Divine Punishment boss's fight as a run has it: a final boss as the side bosses `cleared` this opening leave it (Apocalypsion's
 * dragons alive giving their passives; Solenis' mid-bosses cleared operating), and a boss dungeon with the Full Shards brought
 * (`shard`: of its group's). A karma dungeon as it is.
 */
export function divineFight(one: DivineDef, cleared: readonly string[], shard: Omit<ShardUse, 'group'> | null): BossDef {
  if (one.kind === 'karma') return one.def;
  const sides = DIVINE_SIDES[one.group];
  const known = cleared.filter((id) => sides.includes(id));
  const def = one.kind === 'final' ? (one.group === 'apocalypsion' ? apocalypsionFight(known) : solenisFight(known)) : one.def;
  return withShards(def, shard ? { ...shard, group: one.group } : null, one.kind === 'final');
}
