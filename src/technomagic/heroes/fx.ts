import type { HeroFx } from '../fight/fx';
import { ANNETTE_FX } from './annette/fx';
import { CLAUSE_FX } from './clause/fx';
import { EZEKIEL_FX } from './ezekiel/fx';
import { FALLEN_FREY_FX } from './fallen-frey/fx';
import { GREMORY_FX } from './gremory/fx';
import { KIRZE_FX } from './kirze/fx';
import { LAIAS_FX } from './laias/fx';
import { MORRAH_FX } from './morrah/fx';
import { SERIA_FX } from './seria/fx';

/** What is drawn for each hero's moves, by its id (./index.ts lists what they do). */
export const HERO_FX: Readonly<Record<string, HeroFx>> = { kirze: KIRZE_FX, clause: CLAUSE_FX, 'fallen-frey': FALLEN_FREY_FX, gremory: GREMORY_FX, annette: ANNETTE_FX, morrah: MORRAH_FX, laias: LAIAS_FX, seria: SERIA_FX, ezekiel: EZEKIEL_FX };
