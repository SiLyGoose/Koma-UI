import type { HeroFx } from '../fight/fx';
import { ANNETTE_FX } from './annette/fx';
import { CLAUSE_FX } from './clause/fx';
import { FALLEN_FREY_FX } from './fallen-frey/fx';
import { GREMORY_FX } from './gremory/fx';
import { KIRZE_FX } from './kirze/fx';

/** What is drawn for each hero's moves, by its id (./index.ts lists what they do). */
export const HERO_FX: Readonly<Record<string, HeroFx>> = { kirze: KIRZE_FX, clause: CLAUSE_FX, 'fallen-frey': FALLEN_FREY_FX, gremory: GREMORY_FX, annette: ANNETTE_FX };
