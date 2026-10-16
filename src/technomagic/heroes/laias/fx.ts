import { Vector3 } from 'three';
import type { HeroFx } from '../../fight/fx';

/* What is drawn for Laias's attack and skills (what they do is ./index.ts): water, out of her staff. */

/** Her colours: deep water blue, the aqua of her heals, and the pale foam of what bursts. */
const BLUE = 0x2f8dff;
const AQUA = 0x6fe6ff;
const FOAM = 0xd8f6ff;

const at = new Vector3();
const from = new Vector3();

export const LAIAS_FX: HeroFx = {
  lands: {
    // Her attack: a bolt of water out of her into the boss.
    splash({ effects, magic, bossHit, bossFeet, head }, who) {
      magic.bolt(head(who, from), bossHit, AQUA, 0.18);
      effects.play('impact', bossHit, 0, 0.7);
      magic.ring(bossFeet, BLUE, 3, 0.3);
    },
  },
  cues: {
    // Healing Droplets: a column of aqua on each ally it heals.
    droplets({ magic, place }, _who, targets) {
      for (const ally of targets) magic.beam(place(ally, at), AQUA, 0.7, 0.8);
    },
    // Bubble Shield: a ring of foam spreading round its ally, and a column of water on it.
    bubble({ magic, place }, _who, targets) {
      for (const ally of targets) {
        place(ally, at);
        magic.ring(at, FOAM, 4, 0.5);
        magic.beam(at, BLUE, 0.6, 0.9);
      }
    },
    // Festival of the Flow: the water bursts up under the boss, a pool spreading round it; and a column of aqua on each ally it heals.
    festival({ effects, magic, place, bossHit, bossFeet }, _who, targets) {
      effects.play('blast', bossHit);
      magic.beam(bossFeet, BLUE, 0.6, 1.6);
      magic.pool(bossFeet, BLUE, 9, 1.2);
      magic.ring(bossFeet, FOAM, 12, 0.5);
      for (const ally of targets) magic.beam(place(ally, at), AQUA, 0.7, 0.7);
    },
    // A whirlpool under the boss.
    whirlpool({ effects, magic, bossHit, bossFeet }) {
      magic.pool(bossFeet, BLUE, 7, 0.9);
      magic.ring(bossFeet, AQUA, 8, 0.45);
      effects.play('impact', bossHit, 0, 1);
    },
    // Her unique weapon's heal: a small column of aqua on the ally it heals.
    eltoirre({ magic, place }, _who, targets) {
      for (const ally of targets) magic.beam(place(ally, at), AQUA, 0.5, 0.5);
    },
  },
};
