import type { Object3D, Scene } from 'three';
import { APOCALYPSION_ASSETS } from '../../assets';
import { SCALE } from '../../heroes/body/hero';
import { APOCALYPSION } from '../../sim/bosses/divine/apocalypsion';
import type { BossDef } from '../../sim/bosses/boss';
import type { Boss, BossLook } from '../boss';
import { loadKrBody } from '../kr-body';
import { APOCALYPSION_FIELD } from './scenery';

/*
 * Apocalypsion on the field: King's Raid's Boss.Apocalypsion (Divine Punishment's creature 60002), one body and a blade in
 * each hand (her WeaponList: Weapon_L on Point_Hand_L, Weapon_R on Point_Hand_R), moved by the game's own clips for her
 * stand-in kit's attacks (../../sim/bosses/divine/apocalypsion.ts), coming in as her wave begins (Skill5) and falling as she
 * is beaten (Dead). She comes in Tersio's place (../tersio/), in the arena below his bridge.
 */

/** How big she is: as much bigger than a hero as King's Raid has her (her creature's and wave's scale 1), with the heroes as big as they are here (SCALE). */
const SIZE = SCALE;

/** Her fight's def (the second of Apocalypsion's: Tersio's `next`), for how it times her attacks. */
const HER = (APOCALYPSION.next as { def: BossDef }).def;

/** Her files, and where she stands: where the bosses stand, side-on; a hero's cut reaches her chest. */
export const APOCALYPSION_LOOK: BossLook = {
  assets: APOCALYPSION_ASSETS,
  stands: { x: 7, turn: -1.1 },
  reach: { hit: [-0.5, 2, 0.2], feet: [-0.2, 0, 0.2] },
  skills: ['aura', 'earth', 'abyss'],
  scenery: APOCALYPSION_FIELD,
};

export const loadApocalypsion = (_scene: Scene, _bright: Object3D): Promise<Boss> =>
  loadKrBody(APOCALYPSION_ASSETS, HER, SIZE, { Boss_Apocalypsion_Weapon_L: 'Point_Hand_L', Boss_Apocalypsion_Weapon_R: 'Point_Hand_R' }, {
    // (Her body's file names its colour Body_D_EffectOn: kept as Body_D, beside its Body_AS, so the two are one picture.)
    pictures: { Boss_Apocalypsion_Body_EffectON: 'Boss_Apocalypsion_Body_D.png' },
  });
