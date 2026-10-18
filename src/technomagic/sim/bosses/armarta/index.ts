import type { BossDef } from '../boss';
import { dragonStages, FIRST, OPEN } from '../dragon/common';
import { MOVES, PLANS } from '../dragon/moves';
import { armartaPart } from './skills';

/**
 * Armarta, the ancient black dragon of stone, of Ashen Nox, the Black Sun (the Dragon Raid's Black Dragon). As in King's
 * Raid, its Black Flame Breath leaves the Dark Flames, which eat at whoever it lands on; and its gaze turns a hero to
 * stone. Its blows are magical. What its skills do is ./skills.ts; its body is the page's (../../../bosses/dragon/).
 */
export const ARMARTA: BossDef = {
  id: 'armarta',
  name: 'Armarta',
  stats: { hp: FIRST.hp, deals: 'magical', physical: FIRST.def, magical: FIRST.def, ...OPEN, crit: 150, resist: 200 },
  // (How hard its blows are, and its health, beside the other dragons': what keeps it as hard as it was, with King's Raid's playtest's rules, in test fights.)
  stages: dragonStages({ deals: 0.9 }),
  attacks: [
    { name: 'bite', label: 'Bite' },
    { name: 'claw', label: 'Claw' },
    { name: 'sweep', label: 'Tail Sweep' },
    { name: 'breath', label: 'Black Flame Breath' },
    { name: 'gaze', label: 'Stone Gaze' },
    { name: 'eclipse', label: 'Ashen Eclipse' },
  ],
  plans: { bite: PLANS.bite!, claw: PLANS.claw!, sweep: PLANS.sweep!, breath: PLANS.breath!, gaze: PLANS.gaze!, eclipse: PLANS.eclipse! },
  moves: MOVES,
  join: armartaPart,
};
