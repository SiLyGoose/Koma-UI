import type { BossDef } from '../boss';
import { DRAGON_TIME, dragonStages, FIRE_ATK, FIRST, OPEN } from '../dragon/common';
import { MOVES, PLANS } from '../dragon/moves';
import { temerairePart } from './skills';

/**
 * Temeraire, the ancient red dragon of fire, of Dragia (the Dragon Raid's Fire Dragon). As in King's Raid, all its
 * attacks deal massive M.DMG, it shrugs off most P.DMG (the playtest's 900 P.Tough, where the game's tip has it blocking it all), and its Blessing of the Flame is worn away by heroes that hit often.
 * What its skills do is ./skills.ts; its body is the page's (../../../bosses/dragon/).
 */
export const TEMERAIRE: BossDef = {
  id: 'temeraire',
  name: 'Temeraire',
  stats: { hp: FIRST.hp, deals: 'magical', physical: FIRST.high, magical: FIRST.def, ...OPEN, tough: { physical: 900, magical: 0 } },
  stages: dragonStages({ atk: FIRE_ATK }),
  time: DRAGON_TIME,
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
