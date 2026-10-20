import type { BossDef } from '../boss';
import { DRAGON_TIME, dragonStages, restFor, FIRST, OPEN, dragonWaves, normalDragon } from '../dragon/common';
import { MOVES, PLANS } from '../dragon/moves';
import { zyrrkinothPart } from './skills';

/**
 * Zyrrkinoth, the ancient green venomous dragon, of Grimvine (the Dragon Raid's Poison Dragon). As in King's Raid, it has
 * very high Crit Resistance and DMG Reduction, but takes more damage each time it takes Crit DMG; nothing changes its ATK
 * Spd; and its poison, stacked high enough, petrifies. Its blows are physical. What its skills do is ./skills.ts; its body
 * is the page's (../../../bosses/dragon/).
 */
const hard: BossDef = {
  id: 'zyrrkinoth',
  name: 'Zyrrkinoth',
  stats: { hp: FIRST.hp, deals: 'physical', physical: FIRST.def, magical: FIRST.def, ...OPEN, tough: { physical: 900, magical: 900 } },
  stages: dragonStages(),
  // (Its bite its plain attack, every 2.3 seconds as the playtest's.)
  basic: ['bite'],
  rest: restFor(2.3),
  time: DRAGON_TIME,
  waves: dragonWaves('zyrrkinoth'),
  attacks: [
    { name: 'bite', label: 'Bite' },
    { name: 'claw', label: 'Claw' },
    { name: 'sweep', label: 'Tail Sweep' },
    { name: 'smashes', label: 'Tail Lash' },
    { name: 'breath', label: 'Venomous Breath' },
  ],
  plans: { bite: PLANS.bite!, claw: PLANS.claw!, sweep: PLANS.sweep!, smashes: PLANS.smashes!, breath: PLANS.breath! },
  moves: MOVES,
  join: zyrrkinothPart,
};

/** It, its Hard mode, with its Normal mode (../dragon/common.ts normalDragon): flying off at half of its health (the playtest's OnHpRatio 500). */
export const ZYRRKINOTH: BossDef = { ...hard, normal: normalDragon(hard, 0.5, zyrrkinothPart) };
