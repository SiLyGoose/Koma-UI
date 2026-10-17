import type { BossDef } from '../boss';
import { dragonStages, FIRST, OPEN } from '../dragon/common';
import { MOVES, PLANS } from '../dragon/moves';
import { temerairePart } from './skills';

/**
 * Temeraire, the ancient red dragon of fire, of Dragia (the Dragon Raid's Fire Dragon). As in King's Raid, all its
 * attacks deal massive M.DMG, it blocks all P.DMG, and its Blessing of the Flame is worn away by heroes that hit often.
 * What its skills do is ./skills.ts; its body is the page's (../../../bosses/dragon/).
 */
export const TEMERAIRE: BossDef = {
  id: 'temeraire',
  name: 'Temeraire',
  stats: { hp: FIRST.hp, deals: 'magical', physical: FIRST.def, magical: FIRST.def, ...OPEN, block: { physical: 1000, magical: 0 }, crit: 100, resist: 150 },
  stages: dragonStages(),
  attacks: [
    { name: 'bite', label: 'Bite' },
    { name: 'claw', label: 'Claw' },
    { name: 'sweep', label: 'Tail Sweep' },
    { name: 'breath', label: 'Flame Breath' },
    { name: 'blessing', label: 'Blessing of the Flame' },
    { name: 'eruption', label: 'Eruption' },
  ],
  plans: { bite: PLANS.bite!, claw: PLANS.claw!, sweep: PLANS.sweep!, breath: PLANS.breath!, blessing: PLANS.roar!, eruption: PLANS.eclipse! },
  moves: MOVES,
  join: temerairePart,
};
