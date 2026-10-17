import type { BossDef } from '../boss';
import { dragonStages, firstOf, OPEN } from '../dragon/common';
import { MOVES, PLANS } from '../dragon/moves';
import { armartaPart } from './skills';

const FIRST = firstOf(1.2, 1.25);

/**
 * Armarta, the ancient black dragon of stone, of Ashen Nox, the Black Sun (the Dragon Raid's Black Dragon, its strongest).
 * As in King's Raid, its Black Flame Breath leaves the Dark Flames, which eat at whoever it lands on; its gaze turns a hero
 * to stone; and it is harder to wear down than the others (more health and defense). Its blows are magical. What its
 * skills do is ./skills.ts; its body is the page's (../../../bosses/dragon/).
 */
export const ARMARTA: BossDef = {
  id: 'armarta',
  name: 'Armarta',
  stats: { hp: FIRST.hp, deals: 'magical', physical: FIRST.def, magical: FIRST.def, ...OPEN, crit: 150, resist: 200 },
  stages: dragonStages(),
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
