import { NONE } from '../../combat/damage';
import type { BossDef, BossScale } from '../boss';
import { PARTY } from '../playtest';
import { ATTACKS, KR_ATK, MOVES, PLANS } from './attacks';
import { galgoriaPart } from './skills';

/*
 * Its stages, King's Raid's own numbers, not made easier for the heroes here (who have no soul weapons yet). Its health with
 * PARTY heroes: live King's Raid's Galgoria raid's at stages 1 to 5 (its table, from its players' guides on DC Inside's King's
 * Raid gallery: 20 to 87.6 billion), 6 to 8 going on from stage 5 as the playtest's do (PLAYTEST_HP); alone (KR_PARTY heroes),
 * as much less as there are fewer heroes. Its M.ATK (./attacks.ts: it hits with all of it), DEF (KR_DEF, and its Persistent
 * Life Force's 60,000 more: LIFE_DEF) and level, King's Raid's playtest's Galgoria raid's (chapter 10's first 8 of 9), as the
 * game builds them (KR-extracted/scripts/boss-stats.mjs).
 */
const LIVE_HP = [20e9, 26.9e9, 37.8e9, 50.7e9, 87.6e9];
const PLAYTEST_HP = [14_184_543_765, 19_721_142_351, 26_463_862_400, 37_178_723_386, 49_825_627_800, 71_216_166_313, 86_139_389_687, 158_093_465_948];
const LAST_LIVE = LIVE_HP.length - 1;
const HP = PLAYTEST_HP.map((hp, i) => LIVE_HP[i] ?? ((LIVE_HP[LAST_LIVE] as number) * hp) / (PLAYTEST_HP[LAST_LIVE] as number));
const KR_DEF = [53_269, 57_090, 68_670, 82_450, 116_318, 124_308, 164_065, 261_750];
const LIFE_DEF = 60_000;
const LEVEL = [88, 90, 95, 100, 108, 110, 116, 125];
const KR_PARTY = 7;
const DEF = KR_DEF.map((def) => def + LIFE_DEF);
const scales = (times: number): BossScale[] =>
  HP.map((hp, i) => ({
    hp: (hp / (HP[0] as number)) * times,
    deals: (KR_ATK[i] as number) / (KR_ATK[0] as number),
    defense: (DEF[i] as number) / (DEF[0] as number),
    level: LEVEL[i] as number,
  }));

/**
 * Galgoria: a chimera of three heads that spits venom. Its blows are magical. It neither blocks nor dodges, and takes
 * 20% more physical damage (./skills.ts). Its health and defenses are the playtest's (HP, DEF), so heroes wear it down
 * best with penetration, and with what cuts its healing (it gives itself back its health all the while: ./skills.ts).
 * How its attacks go is ./attacks.ts, and what its skills do ./skills.ts; what is drawn for them is
 * ../../../bosses/galgoria/fx.ts, and its body ../../../bosses/galgoria/model.ts.
 * No stun holds it: stuns wear its CC Gauge down instead (../gauge.ts), and empty, it is Down a while; it has no CC resist,
 * as the playtest's. Its blows see past 500 points of a hero's defense (the playtest's PiercePower) and 300 of its dodge
 * (its Persistent Life Force's hit chance). Now and then a blow of its is a crit (crit resist tells): a first guess.
 */
export const GALGORIA: BossDef = {
  id: 'galgoria',
  name: 'Galgoria',
  stats: { hp: HP[0] as number, deals: 'magical', physical: DEF[0] as number, magical: DEF[0] as number, block: NONE, dodge: NONE, crit: 100, resist: 0, pen: 500, acc: 300 },
  stages: { room: scales(1), solo: scales(KR_PARTY / PARTY) },
  // (A head's venom its plain attack, every 3.1 seconds as the playtest's.)
  basic: ['left', 'centre', 'right'],
  rest: 3.1 - MOVES.spit.length,
  attacks: ATTACKS,
  plans: PLANS,
  moves: MOVES,
  join: galgoriaPart,
};
