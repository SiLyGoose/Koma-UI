import { NONE } from '../../combat/damage';
import type { BossDef, BossScale } from '../boss';
import { HEROES_DEAL, HEROES_HP, PARTY } from '../playtest';
import { ATTACKS, KR_ATK, MOVES, PLANS } from './attacks';
import { galgoriaPart } from './skills';

/*
 * Its stages, King's Raid's playtest's Galgoria raid's (chapter 10's first 8 of 9), as the game builds it (KR-extracted/scripts/
 * boss-stats.mjs): its health (KR_HP), DEF (KR_DEF, and its Persistent Life Force's 60,000 more: LIFE_DEF), M.ATK
 * (./attacks.ts) and level. Its health is the game's for its party of KR_PARTY, as much less as the heroes here deal
 * (../playtest.ts) and as much more as there are of them; how hard it hits, the game's, as much less as the heroes here have
 * less health. Alone (as many heroes as the game's party), its health is as much less again.
 */
const KR_HP = [14_184_543_765, 19_721_142_351, 26_463_862_400, 37_178_723_386, 49_825_627_800, 71_216_166_313, 86_139_389_687, 158_093_465_948];
const KR_DEF = [53_269, 57_090, 68_670, 82_450, 116_318, 124_308, 164_065, 261_750];
const LIFE_DEF = 60_000;
const LEVEL = [88, 90, 95, 100, 108, 110, 116, 125];
const KR_PARTY = 7;
const HP = KR_HP.map((hp) => (hp * HEROES_DEAL * PARTY) / KR_PARTY);
const DEF = KR_DEF.map((def) => def + LIFE_DEF);
const scales = (times: number): BossScale[] =>
  HP.map((hp, i) => ({
    hp: (hp / (HP[0] as number)) * times,
    deals: HEROES_HP * ((KR_ATK[i] as number) / (KR_ATK[0] as number)),
    defense: (DEF[i] as number) / (DEF[0] as number),
    level: LEVEL[i] as number,
  }));

/**
 * Galgoria: a chimera of three heads that spits venom. Its blows are magical. It neither blocks nor dodges, and takes
 * 20% more physical damage (./skills.ts). Its health and defenses are the playtest's (HP, DEF), so heroes wear it down
 * best with penetration, and with what cuts its healing (it gives itself back its health all the while: ./skills.ts).
 * How its attacks go is ./attacks.ts, and what its skills do ./skills.ts; what is drawn for them is
 * ../../../bosses/galgoria/fx.ts, and its body ../../../bosses/galgoria/model.ts.
 * No stun holds it: stuns wear its CC Gauge down instead (../gauge.ts), the shorter for its CC resist (accuracy tells),
 * and empty, it is Down a while. Its blows see past 500 points of a hero's defense (the playtest's PiercePower). Now and
 * then a blow of its is a crit (crit resist tells): a first guess, as its CC resist is.
 */
export const GALGORIA: BossDef = {
  id: 'galgoria',
  name: 'Galgoria',
  stats: { hp: HP[0] as number, deals: 'magical', physical: DEF[0] as number, magical: DEF[0] as number, block: NONE, dodge: NONE, crit: 100, resist: 150, pen: 500 },
  stages: { room: scales(1), solo: scales(KR_PARTY / PARTY) },
  attacks: ATTACKS,
  plans: PLANS,
  moves: MOVES,
  join: galgoriaPart,
};
