import type { Object3D, Scene } from 'three';
import type { BossFx } from '../fight/fx';
import type { Boss, BossLook } from './boss';
import { APOCALYPSION_FIGHT_FX, APOCALYPSION_FIGHT_LOOK, loadApocalypsionFight } from './apocalypsion';
import { ARMARTA_FX, ARMARTA_LOOK, loadArmarta } from './armarta';
import { ASCALON_FX } from './ascalon/fx';
import { ASCALON_LOOK, loadAscalon } from './ascalon/model';
import { GALGORIA_FX } from './galgoria/fx';
import { GALGORIA_LOOK, loadGalgoria } from './galgoria/model';
import { loadScalaxia, SCALAXIA_FX, SCALAXIA_LOOK } from './scalaxia';
import { SIEGFRIED_FX } from './siegfried/fx';
import { loadSiegfried, SIEGFRIED_LOOK } from './siegfried/model';
import { loadTemeraire, TEMERAIRE_FX, TEMERAIRE_LOOK } from './temeraire';
import { loadZyrrkinoth, ZYRRKINOTH_FX, ZYRRKINOTH_LOOK } from './zyrrkinoth';

/**
 * Each boss as the page draws it, by its id (../sim/bosses/ lists what each does): how it looks and where it stands,
 * its body (read and stood up, what it throws drawn in `scene`), and what is drawn for its skills.
 */
export const BOSS_VIEWS: Readonly<Record<string, { look: BossLook; load(scene: Scene, bright: Object3D): Promise<Boss>; fx: BossFx }>> = {
  galgoria: { look: GALGORIA_LOOK, load: loadGalgoria, fx: GALGORIA_FX },
  siegfried: { look: SIEGFRIED_LOOK, load: loadSiegfried, fx: SIEGFRIED_FX },
  ascalon: { look: ASCALON_LOOK, load: loadAscalon, fx: ASCALON_FX },
  temeraire: { look: TEMERAIRE_LOOK, load: loadTemeraire, fx: TEMERAIRE_FX },
  scalaxia: { look: SCALAXIA_LOOK, load: loadScalaxia, fx: SCALAXIA_FX },
  zyrrkinoth: { look: ZYRRKINOTH_LOOK, load: loadZyrrkinoth, fx: ZYRRKINOTH_FX },
  armarta: { look: ARMARTA_LOOK, load: loadArmarta, fx: ARMARTA_FX },
  // Divine Punishment's: its four dragons drawn as the Dragon Raid's are (the same bodies, field and sounds), and Apocalypsion's
  // fight, Tersio and then her (./apocalypsion/).
  'dp-temeraire': { look: TEMERAIRE_LOOK, load: loadTemeraire, fx: TEMERAIRE_FX },
  'dp-scalaxia': { look: SCALAXIA_LOOK, load: loadScalaxia, fx: SCALAXIA_FX },
  'dp-zyrrkinoth': { look: ZYRRKINOTH_LOOK, load: loadZyrrkinoth, fx: ZYRRKINOTH_FX },
  'dp-armarta': { look: ARMARTA_LOOK, load: loadArmarta, fx: ARMARTA_FX },
  apocalypsion: { look: APOCALYPSION_FIGHT_LOOK, load: loadApocalypsionFight, fx: APOCALYPSION_FIGHT_FX },
};
