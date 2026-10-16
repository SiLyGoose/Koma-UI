import type { HeroFx } from '../fight/fx';
import { ANNETTE_FX } from './annette/fx';
import { KLAUS_FX } from './klaus/fx';
import { EZEKIEL_FX } from './ezekiel/fx';
import { FALLEN_FREY_FX } from './fallen-frey/fx';
import { GREMORY_FX } from './gremory/fx';
import { KIRZE_FX } from './kirze/fx';
import { LAIAS_FX } from './laias/fx';
import { LORRAINE_FX } from './lorraine/fx';
import { MORRAH_FX } from './morrah/fx';
import { SERIA_FX } from './seria/fx';
import { VALANCE_FX } from './valance/fx';
import { LUCIKIEL_FX } from './lucikiel/fx';
import { SELENE_FX } from './selene/fx';
import { CROW_FX } from './crow/fx';
import { ODDY_FX } from './oddy/fx';
import { PHILLOP_FX } from './phillop/fx';
import { NAILA_FX } from './naila/fx';

/** What is drawn for each hero's moves, by its id (../sim/heroes/ lists what they do). */
export const HERO_FX: Readonly<Record<string, HeroFx>> = { kirze: KIRZE_FX, klaus: KLAUS_FX, 'fallen-frey': FALLEN_FREY_FX, gremory: GREMORY_FX, annette: ANNETTE_FX, morrah: MORRAH_FX, laias: LAIAS_FX, seria: SERIA_FX, ezekiel: EZEKIEL_FX, lorraine: LORRAINE_FX, valance: VALANCE_FX, lucikiel: LUCIKIEL_FX, selene: SELENE_FX, crow: CROW_FX, oddy: ODDY_FX, phillop: PHILLOP_FX, naila: NAILA_FX };
