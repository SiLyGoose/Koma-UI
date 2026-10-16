import { Vector3 } from 'three';
import type { FxScene, HeroFx } from '../../fight/fx';

/* What is drawn for Rebel Klaus's attack and skills (what they do is ../../sim/heroes/rebel-klaus.ts): Galicta's blue light. */

const GALICTA = 0x6fb8ff;

const from = new Vector3();

/** His attack: Galicta down on the boss. */
const rend = ({ effects, bossHit }: FxScene): void => {
  effects.play('slash', bossHit, 1.4, 1.2);
  effects.play('impact', bossHit, 0, 0.8);
};

export const REBEL_KLAUS_FX: HeroFx = {
  lands: {
    rend,
    attack: rend,
    // Determined Strike: a great cut across the boss (it is stunned).
    determined({ effects, bossHit }) {
      effects.play('blast', bossHit, -0.3, 1.3);
      effects.play('strike', bossHit, 0, 1.1);
    },
    // Indomitable Will: Galicta driven into the ground, its light rising round him.
    indomitable({ effects, magic, bossHit, place }, who) {
      effects.play('slash', bossHit, 0.4, 1.1);
      const feet = place(who, from);
      magic.ring(feet, GALICTA, 6, 0.6);
      magic.field(feet, GALICTA, 1.2, 0.8);
    },
    // Perish.: each cut of the barrage; the last brought down on the ground, the great blue sword over the boss.
    perish({ effects, magic, bossHit, bossFeet }, _who, part) {
      if (part < 6) {
        effects.play('slash', bossHit, part % 2 ? -0.7 : 0.7, 1.1);
        return;
      }
      effects.play('strike', bossHit, 0, 1.4);
      effects.play('quake', bossFeet);
      magic.beam(bossFeet, GALICTA, 0.9, 1.2);
      magic.ring(bossFeet, GALICTA, 10, 0.6);
    },
  },
};
