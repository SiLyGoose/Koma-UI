import { Vector3 } from 'three';
import type { FxScene, HeroFx } from '../../fight/fx';

/* What is drawn for Loman's attack and skills (what they do is ../../sim/heroes/loman.ts): Orvelia's blue, and steel. */

const BLUE = 0x6f8cff;
const STEEL = 0xdfe8f0;

const from = new Vector3();

/** His attack: his halberd thrust into the boss. */
const thrust = ({ effects, bossHit }: FxScene): void => {
  effects.play('pierce', bossHit, 0, 0.9);
  effects.play('impact', bossHit, 0, 0.7);
};

export const LOMAN_FX: HeroFx = {
  lands: {
    thrust,
    // Cut Ground: his halberd down on the ground before the boss, the earth split.
    ground({ effects, magic, bossHit, bossFeet }) {
      effects.play('blast', bossHit, 1.4, 1.1);
      effects.play('quake', bossFeet);
      magic.ring(bossFeet, STEEL, 12, 0.5);
    },
    // Shrouding Creed: light spread over his allies (each's shield is drawn by the cue).
    shroud({ effects, magic, place }, who) {
      magic.ring(place(who, from), BLUE, 14, 0.7);
      effects.play('holy', from);
    },
    // Knight's Creed: two thrusts, then the wide last swing and the Mark of Creed.
    creed({ effects, magic, bossHit, bossFeet }, _who, part) {
      if (part < 2) {
        effects.play('pierce', bossHit, 0, 1);
        return;
      }
      effects.play('blast', bossHit, part === 2 ? 0.8 : -0.8, 1.3);
      if (part === 3) magic.ring(bossFeet, BLUE, 12, 0.8);
    },
  },
  cues: {
    // (Shrouding Creed's shield on each ally: the bubble, kept on while the shield is, ../../fx/wards.ts.)
    // The Last Gatekeeper striking.
    gatekeeper({ effects, magic, bossHit, bossFeet }) {
      effects.play('strike', bossHit, 0, 1.2);
      magic.beam(bossFeet, BLUE, 0.5, 0.8);
    },
  },
};
