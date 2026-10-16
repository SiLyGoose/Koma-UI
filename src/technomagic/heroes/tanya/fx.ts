import { Vector3 } from 'three';
import type { FxScene, HeroFx } from '../../fight/fx';

/* What is drawn for Tanya's attack and skills (what they do is ../../sim/heroes/tanya.ts): the Laughing Mask's red, and shadow. */

const RED = 0xe0303a;
const SHADOW = 0x6a5a8a;

const from = new Vector3();

/** Her attack: a cut of a katar. */
const katar = ({ effects, bossHit }: FxScene, _who: number, part: number): void => {
  effects.play('slash', bossHit, part % 2 ? -0.7 : 0.7, 0.9);
  effects.play('impact', bossHit, 0, 0.5);
};

export const TANYA_FX: HeroFx = {
  lands: {
    katar,
    attack: katar,
    // Target Sighted: a stab down into the boss from behind.
    sighted({ effects, magic, bossHit, bossFeet }) {
      effects.play('pierce', bossHit, 0, 1.2);
      magic.ring(bossFeet, RED, 8, 0.4);
    },
    // Blade Tornado: a whirl of cuts.
    tornado({ effects, bossHit }, _who, part) {
      effects.play('slash', bossHit, part * 1.3, 1.2);
    },
    // Whisper of Death: a cut each time; the last driven home.
    whisper({ effects, magic, bossHit, bossFeet }, _who, part) {
      if (part < 6) {
        effects.play('slash', bossHit, part * 0.9 - 2, 0.9);
        return;
      }
      effects.play('blast', bossHit, 0, 1.4);
      magic.ring(bossFeet, RED, 12, 0.6);
    },
  },
  cues: {
    // Into Stealth: a puff of shadow about her.
    stealth({ magic, place }, who) {
      magic.ring(place(who, from), SHADOW, 4, 0.5);
    },
  },
};
