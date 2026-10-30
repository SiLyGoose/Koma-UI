import { NONE } from '../../combat/damage';
import type { BossDef, BossScale } from '../boss';
import { PARTY } from '../playtest';
import { ATTACKS, KR_ATK, MOVES, PLANS } from './attacks';
import { BLOCK, siegfriedPart } from './skills';

/*
 * His stages, King's Raid's own numbers (as Galgoria's are): its Siegfried raid's 9 (chapter 10's dungeons 1101 to 1109), as
 * the game builds them (KR-extracted/scripts/boss-stats.mjs). His health (HP) with PARTY heroes, in each of his three lives (his
 * second and third with more: ./skills.ts); alone (KR_PARTY heroes), as much less as there are fewer heroes. His P.ATK
 * (./attacks.ts), DEF and level.
 */
const HP = [3_373_161_894, 4_439_718_518, 5_407_239_249, 6_897_858_420, 10_616_618_247, 15_370_197_869, 21_071_258_811, 40_977_826_560, 71_573_773_248];
const DEF = [60_371, 64_875, 78_480, 90_695, 119_300, 117_765, 129_525, 143_963, 198_375];
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
 * Siegfried, the King of Dawn, corrupted (King's Raid's Distorted Dawn). His blows are physical. He blocks every kind of
 * blow (his Divine Rampage: BLOCK), takes 30% more magic damage (the playtest's MagicalDefensePower -300), and rises again
 * twice as he would be beaten, whole and stronger each time. What his skills do is ./skills.ts; his body is the page's
 * (../../../bosses/siegfried/). No stun holds him (his raid's CC gauge is 999,999: none to break). His blows see past 500
 * points of a hero's defense (the playtest's PiercePower) and 450 of its dodge (his Divine Rampage's hit chance). Now and
 * then a blow of his is a crit (crit resist tells): a first guess, as Galgoria's.
 */
export const SIEGFRIED: BossDef = {
  id: 'siegfried',
  name: 'Siegfried',
  stats: {
    hp: HP[0] as number,
    deals: 'physical',
    physical: DEF[0] as number,
    magical: DEF[0] as number,
    block: { physical: BLOCK.base, magical: BLOCK.base },
    dodge: NONE,
    crit: 100,
    resist: 0,
    pen: 500,
    acc: 450,
  },
  stages: { room: scales(1), solo: scales(KR_PARTY / PARTY) },
  // (His sword his plain attack, one after another as the playtest's: its 2.8 seconds all his moves.)
  basic: ['slash', 'slash2', 'slash3'],
  rest: 0,
  attacks: ATTACKS,
  plans: PLANS,
  moves: MOVES,
  join: siegfriedPart,
};
