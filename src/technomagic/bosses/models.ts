import type { Scene } from 'three';
import type { BossFx } from '../fight/fx';
import type { Boss } from './boss';
import { GALGORIA_FX } from './galgoria/fx';
import { loadGalgoria } from './galgoria/model';

/** Each boss's body (read and stood up, what it throws drawn in `scene`) and what is drawn for its skills, by its id (./index.ts lists what they do). */
export const BOSS_VIEWS: Readonly<Record<string, { load(scene: Scene): Promise<Boss>; fx: BossFx }>> = {
  galgoria: { load: loadGalgoria, fx: GALGORIA_FX },
};
