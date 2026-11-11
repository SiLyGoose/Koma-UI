import { ARMARTA } from '../armarta';
import type { BossDef, OwnMinion } from '../boss';
import { KR_ATK } from '../dragon/common';
import type { MinionKind } from '../dragon/minions';
import { WAVES } from '../dragon/waves';
import { SCALAXIA } from '../scalaxia';
import { TEMERAIRE } from '../temeraire';
import { ZYRRKINOTH } from '../zyrrkinoth';
import { infiniteAtk, infiniteHp, infiniteStages } from './levels';

/*
 * The Apocalypsion group's side bosses: the four dragons that guard her (King's Raid's creatures 60003 to 60006, Divine
 * Punishment's own, not the Dragon Raid's 4401 to 4414). The game builds each on its Hard Dragon Raid's model and most of its
 * kit, and so do these stand-ins: each is the Dragon Raid's Hard dragon (../temeraire/ and the rest: its attacks, its CC Gauge,
 * its flight at 70% of its health and its waves' minions), with Divine Punishment's numbers, King's Raid's own and unscaled
 * (KR-extracted/briefs/divine-punishment.md §3.1, §3.2, §2): its health, ATK and DEF at Infinite level 1 (and grown by its
 * level: ./levels.ts), its star-grade lookup's block, Tough and the like, its time, and its waves' minions' (60003 to 60005's
 * waves 2 and 3: the Hard Dragon Raid's own kinds, where they stand, but King's Raid's Divine Punishment HP, ATK and DEF). What
 * Divine Punishment adds to each (the passives it gives Apocalypsion while it lives: ./apocalypsion.ts) is not on it here; its
 * CC Gauge is the Hard Dragon Raid's (Divine Punishment's own CampaignTactic gauge not read yet); and Zyrrkinoth's Slimes are
 * still the Dragon Raid's (called up by its skill, scaled as those are).
 */

/** A minion of a Divine Punishment dragon's waves, at level 1: King's Raid's own HP, ATK and DEF (both kinds alike). */
const OWN: Readonly<Partial<Record<MinionKind, { hp: number; atk: number; def: number }>>> = {
  'hatchling-fire': { hp: 4_727_044_086, atk: 10_495_507, def: 157_511 },
  'hatchling-ice': { hp: 1_512_657_746, atk: 8_746_257, def: 75_000 },
  'ice-pillar': { hp: 5_042_188_155, atk: 8_746_257, def: 60_000 },
  wyrm: { hp: 6_302_735_194, atk: 8_746_257, def: 157_511 },
  wyrmling: { hp: 6_302_735_194, atk: 8_746_257, def: 157_511 },
  'hatchling-poison': { hp: 4_727_047_334, atk: 8_746_257, def: 157_511 },
};

/** A dragon's waves past its first at a level: the Hard Dragon Raid's stage 1 waves' minions (kinds, where they stand), with King's Raid's Divine Punishment numbers, grown by the level. */
function ownWaves(id: string): NonNullable<BossDef['waves']>['at'] {
  const first = WAVES[id]?.[0] ?? [];
  return (level) =>
    first.map((wave) =>
      wave.map((one): OwnMinion => {
        const own = OWN[one.kind] ?? { hp: one.hp, atk: one.atk, def: one.def[0] };
        return { ...one, own: true, hp: own.hp * (1 + infiniteHp(level) / 1000), atk: own.atk * (1 + infiniteAtk(level) / 1000), def: [own.def, own.def] };
      }),
    );
}

/**
 * A Divine Punishment dragon (`id`, King's Raid's name) from its Hard Dragon Raid one (`hard`): its health, ATK (its moves' blows
 * are shares of the Dragon Raid's KR_ATK at stage 1: so many times that), DEF (physical, magical), its star-grade lookup's
 * stats over the Hard one's, level, time, and waves (none: it has none).
 */
function dpDragon(hard: BossDef, own: { id: string; hp: number; atk: number; def: readonly [number, number]; stats?: Partial<BossDef['stats']>; level?: number; time: number; waves: boolean }): BossDef {
  const { normal: _normal, waves: _waves, ...rest } = hard;
  return {
    ...rest,
    id: own.id,
    stats: { ...hard.stats, hp: own.hp, physical: own.def[0], magical: own.def[1], ...own.stats },
    stages: infiniteStages({ deals: own.atk / (KR_ATK[0] as number), level: own.level ?? 100 }),
    time: own.time,
    ...(own.waves && hard.waves && { waves: { ...hard.waves, at: ownWaves(hard.id) } }),
  };
}

/** Temeraire, Guardian of Fire (60003): lookup 443, 1000 P.Block, 900 P.Tough, 250 crit and hit, 150 dodge. 180 seconds. */
export const DP_TEMERAIRE = dpDragon(TEMERAIRE, {
  id: 'dp-temeraire',
  hp: 590_884_096_452,
  atk: 137_753_538,
  def: [157_513, 110_259],
  stats: { block: { physical: 1000, magical: 0 }, tough: { physical: 900, magical: 0 } },
  time: 180,
  waves: true,
});

/** Scalaxia, Guardian of Ice (60004): lookup 275 (the Hard one's: 1000 M.Block and M.Block DEF, 200 M.Tough, its less M.DMG taken in its skills). 300 seconds. */
export const DP_SCALAXIA = dpDragon(SCALAXIA, { id: 'dp-scalaxia', hp: 590_884_096_452, atk: 98_395_391, def: [157_511, 225_016], time: 300, waves: true });

/** Zyrrkinoth, Guardian of Poison (60005): lookup 276, 900 P. and M.Tough (the Hard one's). 300 seconds. */
export const DP_ZYRRKINOTH = dpDragon(ZYRRKINOTH, { id: 'dp-zyrrkinoth', hp: 679_516_710_949, atk: 113_154_698, def: [181_137, 181_137], time: 300, waves: true });

/** Armarta, Guardian of Darkness (60006): level 120, lookup 277 (nothing more); one wave. 600 seconds. */
export const DP_ARMARTA = dpDragon(ARMARTA, { id: 'dp-armarta', hp: 590_884_096_092, atk: 137_753_534, def: [157_515, 157_515], level: 120, time: 600, waves: false });

/** The four, in King's Raid's order (Raid 1001 to 1004). */
export const DP_DRAGONS: readonly BossDef[] = [DP_TEMERAIRE, DP_SCALAXIA, DP_ZYRRKINOTH, DP_ARMARTA];
