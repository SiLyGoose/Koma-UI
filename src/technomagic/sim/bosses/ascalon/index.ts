import { NONE } from '../../combat/damage';
import type { BossDef, BossScale } from '../boss';
import { PARTY } from '../playtest';
import { ATTACKS, KR_ATK, MOVES, PLANS } from './attacks';
import { ascalonPart } from './skills';
import { wavesAt } from './waves';

/*
 * His stages, King's Raid's own numbers (as Galgoria's and Siegfried's are): its Ascalon raid's 9 (chapter 10's dungeons 1201
 * to 1209), as the game builds them (KR-extracted/scripts/boss-stats.mjs). His health (HP) with PARTY heroes; alone (KR_PARTY
 * heroes), as much less as there are fewer heroes. His P.ATK (./attacks.ts), DEF and level.
 */
const HP = [3_455_209_406, 4_644_791_781, 5_244_824_384, 5_762_570_085, 8_848_734_214, 10_671_309_000, 13_440_829_500, 21_659_771_459, 34_357_054_768];
const DEF = [189_400, 207_600, 212_550, 206_125, 238_600, 242_073, 319_495, 444_975, 634_800];
const LEVEL = [88, 90, 95, 100, 108, 110, 116, 125, 134];
const KR_PARTY = 7;
const scales = (times: number): BossScale[] =>
  HP.map((hp, i) => ({
    hp: (hp / (HP[0] as number)) * times,
    deals: (KR_ATK[i] as number) / (KR_ATK[0] as number),
    defense: (DEF[i] as number) / (DEF[0] as number),
    level: LEVEL[i] as number,
  }));

/**
 * Ascalon, the Sentry of the Sanctuary: the high-ranking Angel Lua set on Serineu, watching over the sanctuary Siegfried
 * entered (King's Raid's CBT2 playtest's Raid.Tech.Ascalon, creature 35920). His blows are physical. Before him, four waves of
 * his Synthetic Demon Beasts (./waves.ts), his Eye of Ascalon on the heroes all the while; he comes in for the fifth. Each wave
 * has the raid's whole time of its own (King's Raid's BattleDefine Ascalon, 210 seconds, counted from each wave's start). What
 * his skills do is ./skills.ts. No CC holds him (his IgnoreCc). His blows see past 500 points of a hero's defense (his
 * PiercePower); now and then one is a crit (crit resist tells): a first guess, as Galgoria's. He has no block, no dodge, and no
 * weakness (his star grade's lookup 424 has no DefensePower).
 */
export const ASCALON: BossDef = {
  id: 'ascalon',
  name: 'Ascalon',
  stats: {
    hp: HP[0] as number,
    deals: 'physical',
    physical: DEF[0] as number,
    magical: DEF[0] as number,
    block: NONE,
    dodge: NONE,
    crit: 100,
    resist: 0,
    pen: 500,
    acc: 0,
  },
  stages: { room: scales(1), solo: scales(KR_PARTY / PARTY) },
  // (His attack his plain one, one after another as the playtest's: its 5.8 seconds all his moves.)
  basic: ['attack'],
  rest: 0,
  attacks: ATTACKS,
  plans: PLANS,
  moves: MOVES,
  waves: { at: wavesAt, leaves: 0, lands: { share: 0, knock: 0 }, before: true, perWave: true },
  join: ascalonPart,
};
