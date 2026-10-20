import type { BossDef } from '../boss';
import { DRAGON_TIME, dragonStages, restFor, FIRST, OPEN, dragonWaves, normalDragon } from '../dragon/common';
import { MOVES, PLANS } from '../dragon/moves';
import { scalaxiaPart } from './skills';

/**
 * Scalaxia, the ancient blue dragon of ice, of Turandana (the Dragon Raid's Frost Dragon). As in King's Raid, its blows
 * leave Frost, ten of which freeze a hero, and it flies up to freeze them all. Its blows are magical. It stands M.DMG as
 * the playtest has it: it blocks it whenever it can (1000 M.Block, 750 on the game's curve), a blocked blow cut the more
 * for its 1000 M.Block power (368 more on its curve), 200 M.Tough, and 60% less M.DMG taken (./skills.ts). What its skills do
 * is ./skills.ts; its body is the page's (../../../bosses/dragon/), with the ice pillars its storm calls up.
 */
const hard: BossDef = {
  id: 'scalaxia',
  name: 'Scalaxia',
  stats: { hp: FIRST.hp, deals: 'magical', physical: FIRST.def, magical: FIRST.high, ...OPEN, block: { physical: 0, magical: 1000 }, blockDef: { physical: 0, magical: 1 }, tough: { physical: 0, magical: 200 } },
  stages: dragonStages(),
  // (Its bite its plain attack, every 2.3 seconds as the playtest's.)
  basic: ['bite'],
  rest: restFor(2.3),
  time: DRAGON_TIME,
  waves: dragonWaves('scalaxia'),
  attacks: [
    { name: 'bite', label: 'Bite' },
    { name: 'claw', label: 'Claw' },
    { name: 'sweep', label: 'Tail Sweep' },
    { name: 'smashes', label: 'Tail Smash' },
    { name: 'breath', label: 'Frost Breath' },
    { name: 'storm', label: 'Glacial Storm' },
  ],
  plans: { bite: PLANS.bite!, claw: PLANS.claw!, sweep: PLANS.sweep!, smashes: PLANS.smashes!, breath: PLANS.breath!, storm: PLANS.storm! },
  moves: MOVES,
  join: scalaxiaPart,
};

/** It, its Hard mode, with its Normal mode (../dragon/common.ts normalDragon): flying off at 60% of its health (the playtest's OnHpRatio 600). */
export const SCALAXIA: BossDef = { ...hard, normal: normalDragon(hard, 0.6, scalaxiaPart) };
