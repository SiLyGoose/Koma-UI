import { Vector3 } from 'three';
import type { FxScene, HeroFx } from '../../fight/fx';

/* What is drawn for Erze's attack and skills (what they do is ../../sim/heroes/erze.ts): blood red. */

const BLOOD = 0xd0203a;
const DARK = 0x7a1030;

const from = new Vector3();
/** Blood Liberation's cuts so far: each at another angle. */
let cuts = 0;

/** Her attack: blood loosed from her orb at the boss. */
const drain = ({ effects, magic, bossHit, floater }: FxScene, who: number): void => {
  magic.bolt(floater(who, from), bossHit, BLOOD, 0.2);
  effects.play('impact', bossHit, 0, 0.7);
};

export const ERZE_FX: HeroFx = {
  lands: {
    drain,
    // Sweet Blood: her hand raked across the boss, its blood drawn back to her.
    sweet({ effects, magic, bossHit, place }, who) {
      effects.play('slash', bossHit, 0.6, 1.3);
      magic.bolt(bossHit, place(who, from).setY(from.y + 1), BLOOD, 0.3);
    },
    // Soaking Blood: blood closing round her (and the bubble on her while nothing touches her: `bubbles`).
    soak({ magic, place }, who) {
      magic.ring(place(who, from), BLOOD, 6, 0.6);
    },
    // Blood Liberation: begun, blood rising from the ground under the boss.
    liberation({ magic, bossFeet }) {
      magic.pool(bossFeet, DARK, 3, 10);
    },
  },
  cues: {
    // Soaking Blood's blow, its time come; Blood Liberation's every second; Life Drinker sparing her.
    soaked({ effects, magic, bossHit, bossFeet }) {
      effects.play('explosion', bossHit, 0, 1);
      magic.ring(bossFeet, BLOOD, 10, 0.5);
    },
    liberated({ effects, magic, bossHit, bossFeet }) {
      effects.play('slash', bossHit, (cuts++ % 5) * 0.5 - 1, 1);
      magic.beam(bossFeet, BLOOD, 0.3, 0.4);
    },
    drinker({ effects, place }, who) {
      effects.play('heal', place(who, from).setY(from.y + 1));
    },
  },
  bubbles: ['Soaking Blood'],
};
