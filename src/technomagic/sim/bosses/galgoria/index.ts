import { NONE } from '../../combat/damage';
import type { BossDef, BossScale } from '../boss';
import { ATTACKS, MOVES, PLANS } from './attacks';
import { galgoriaPart } from './skills';

/**
 * So many times less health than the game's: a hero's ATK here is the game's (its unique weapon's and its potentials'), but
 * what more King's Raid's heroes deal to it (sets, more DMG to bosses, buffs) is not here. (Before HP, which it cuts.)
 */
const GEARED = 115;
/**
 * Its health at stage 1, before GEARED: more than the game's (20 billion), so that (with GEARED and DEALS) 8 heroes on Auto
 * at Transcend 5 (ATK Up, Monster Hunting, HP Up, two class perks, T5 Light) with R1 unique weapons and no other gear win
 * about 4 times in 5, in about 2½ minutes (tried over 60 fights, King's Raid's playtest's rules: no stun holds it). Its
 * stages 2 and 3 go up from it evenly (each so many times the last) to stage 4.
 */
const FIRST_HP = 38.4e9;
/**
 * Its health and defense (P.DEF and M.DEF alike) at each stage, as King's Raid's Galgoria raid has them at its stages 1
 * to 5 (its table, from its players' guides on DC Inside's King's Raid gallery: 20 to 87.6 billion HP, 117,000 to 222,300
 * DEF); 6 to 8 go on from there (a first guess: the game's stage 6 is said to be past 300,000 DEF). But for its health at
 * stages 1 to 3 (FIRST_HP). That health is the game's raid's, with more than one player, cut by GEARED; alone, it is
 * ROOM_HP times less again. And how hard its blows are, either way.
 */
const KR_HP = [20e9, 26.9e9, 37.8e9, 50.7e9, 87.6e9, 120e9, 165e9, 225e9];
const HP = KR_HP.map((hp, i) => (i < 3 ? FIRST_HP * ((KR_HP[3] as number) / FIRST_HP) ** (i / 3) : hp) / GEARED);
const DEF = [117_000, 128_300, 142_000, 175_300, 222_300, 300_000, 380_000, 470_000];
const ROOM_HP = 1.7;
const DEALS = [0.2, 0.225, 0.25, 0.275, 0.3, 0.325, 0.35, 0.375];
/** Its level at each stage, as King's Raid's playtest has its Galgoria raid (CampaignWaveTable, chapter 10). */
const LEVEL = [88, 90, 95, 100, 108, 110, 116, 125];
const scales = (times: number): BossScale[] =>
  HP.map((hp, i) => ({ hp: (hp / (HP[0] as number)) * times, deals: DEALS[i] as number, defense: (DEF[i] as number) / (DEF[0] as number), level: LEVEL[i] as number }));

/**
 * Galgoria: a chimera of three heads that spits venom. Its blows are magical. It neither blocks nor dodges, and takes
 * 20% more physical damage (./skills.ts). Its health and defenses are the game's (HP, DEF), and so huge: heroes
 * wear it down only with penetration, and with what cuts its healing (it gives itself back its health all the while:
 * ./skills.ts). How its attacks go is ./attacks.ts, and what its skills do ./skills.ts; what is drawn for them is
 * ../../../bosses/galgoria/fx.ts, and its body ../../../bosses/galgoria/model.ts.
 * No stun holds it: stuns wear its CC Gauge down instead (../gauge.ts), the shorter for its CC resist (accuracy tells),
 * and empty, it is Down a while. Its blows see past 500 points of a hero's defense (the playtest's PiercePower). Now and
 * then a blow of its is a crit (crit resist tells): a first guess, as its CC resist and how hard its blows are (DEALS, and
 * ./attacks.ts).
 */
export const GALGORIA: BossDef = {
  id: 'galgoria',
  name: 'Galgoria',
  stats: { hp: HP[0] as number, deals: 'magical', physical: DEF[0] as number, magical: DEF[0] as number, block: NONE, dodge: NONE, crit: 100, resist: 150, pen: 500 },
  stages: { room: scales(1), solo: scales(1 / ROOM_HP) },
  attacks: ATTACKS,
  plans: PLANS,
  moves: MOVES,
  join: galgoriaPart,
};
