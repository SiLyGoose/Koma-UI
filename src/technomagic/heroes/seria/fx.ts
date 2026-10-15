import type { HeroFx } from '../../fight/fx';

/* What is drawn for Seria's skills (what they do is ./index.ts; her attack is most heroes'). */

/** Her colours: blood red, the pale pink of falling petals, and the red moon. */
const BLOOD = 0xc8102e;
const PETAL = 0xffb3c8;
const MOON = 0xff4a3a;

export const SERIA_FX: HeroFx = {
  lands: {
    // A cut across the boss, petals scattering.
    petals({ effects, magic, bossHit, bossFeet }) {
      effects.play('slash', bossHit, 0.5, 1.2);
      effects.play('impact', bossHit, 0, 0.9);
      magic.ring(bossFeet, PETAL, 7, 0.4);
    },
    // A cut straight down on the boss.
    blossom({ effects, magic, bossHit, bossFeet }) {
      effects.play('slash', bossHit, 1.57, 1.3);
      effects.play('impact', bossHit, 0, 1);
      magic.ring(bossFeet, PETAL, 9, 0.45);
    },
    // The rush in, and two cuts after: the blood scatters.
    scatter({ effects, magic, bossHit, bossFeet }, _who, part) {
      effects.play('slash', bossHit, part % 2 ? -0.6 : 0.6);
      effects.play('impact', bossHit, 0, part === 0 ? 1.1 : 0.8);
      magic.pool(bossFeet, BLOOD, part === 0 ? 5 : 3, 0.8);
    },
    // A great red cut, and the moon's light on the boss.
    moon({ effects, magic, bossHit, bossFeet }) {
      effects.play('blast', bossHit);
      effects.play('impact', bossHit, 0, 1.5);
      magic.ring(bossFeet, MOON, 16, 0.55);
      magic.beam(bossFeet, MOON, 0.6, 1.6);
    },
  },
};
