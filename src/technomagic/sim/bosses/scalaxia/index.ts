import type { BossDef } from '../boss';
import { dragonStages, FIRST, OPEN } from '../dragon/common';
import { MOVES, PLANS } from '../dragon/moves';
import { scalaxiaPart } from './skills';

/**
 * Scalaxia, the ancient blue dragon of ice, of Turandana (the Dragon Raid's Frost Dragon). As in King's Raid, its blows
 * leave Frost, ten of which freeze a hero, and it flies up to freeze them all. Its blows are magical. It stands M.DMG as
 * the playtest has it: it blocks it whenever it can (1000 M.Block), a blocked blow cut the most a block cuts (its 1000
 * M.Block power, as the game's curve has it: 368 more), 200 M.Tough, and 60% less M.DMG taken (./skills.ts). What its skills do
 * is ./skills.ts; its body is the page's (../../../bosses/dragon/), with the ice pillars its storm calls up.
 */
export const SCALAXIA: BossDef = {
  id: 'scalaxia',
  name: 'Scalaxia',
  stats: { hp: FIRST.hp, deals: 'magical', physical: FIRST.def, magical: FIRST.high, ...OPEN, block: { physical: 0, magical: 1000 }, blockDef: { physical: 0, magical: 0.368 }, tough: { physical: 0, magical: 200 }, crit: 100, resist: 150 },
  stages: dragonStages(),
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
