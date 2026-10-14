import { Vector3 } from 'three';
import type { HeroFx } from '../../fight/fx';

/* What is drawn for Kirze's skills (what they do is ./index.ts). */

const at = new Vector3();

export const KIRZE_FX: HeroFx = {
  lands: {
    // Seven cuts as she spins, then the blow that knocks the boss down.
    judgment({ effects, magic, bossHit, bossFeet }, _who, part) {
      if (part < 7) {
        effects.play('slash', bossHit, part * 0.9, 0.9);
        effects.play('impact', bossHit, 0, 0.5);
        return;
      }
      effects.play('blast', bossHit);
      effects.play('impact', bossHit, 0, 1.3);
      magic.ring(bossFeet, 0xfff0c0, 9, 0.45);
    },
    // The burst: a ring out from her over the whole field.
    haze({ effects, magic, bossHit, place }, who) {
      place(who, at);
      magic.ring(at, 0x8fe8ff, 34, 0.7);
      magic.ring(at, 0xc59bff, 20, 0.5);
      effects.play('impact', bossHit, 0, 1.2);
    },
    // Crystals up in a line to the boss; then they burst.
    flower({ effects, magic, bossHit, bossFeet, place }, who, part) {
      if (part === 0) return magic.crystals(place(who, at), bossFeet);
      magic.shatter();
      effects.play('blast', bossHit);
      effects.play('impact', bossHit, 0, 1.3);
      magic.ring(bossFeet, 0xff4d7a, 12, 0.5);
    },
  },
  cues: {
    // A shockwave out from her, quickened.
    wave({ magic, place }, who) {
      magic.ring(place(who, at), 0x8fe8ff, 22, 0.55);
    },
    // Her curse bursts.
    curse({ effects, magic, bossHit, bossFeet }) {
      effects.play('blast', bossHit);
      effects.play('impact', bossHit, 0, 1.5);
      magic.ring(bossFeet, 0xff4d7a, 14, 0.6);
    },
  },
};
