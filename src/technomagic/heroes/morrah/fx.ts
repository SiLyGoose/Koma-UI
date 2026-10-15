import { Vector3 } from 'three';
import type { HeroFx } from '../../fight/fx';

/* What is drawn for Morrah's attack and skills (what they do is ./index.ts). */

/** Her colours: the orange of her flame, the deep red of lava, and the gold at its heart. */
const FLAME = 0xff7a2a;
const LAVA = 0xd8261a;
const GOLD = 0xffc65a;

const at = new Vector3();

export const MORRAH_FX: HeroFx = {
  lands: {
    // A burning cut across the boss one way, then the other.
    cleave({ effects, bossHit }, _who, part) {
      effects.play('slash', bossHit, part % 2 ? -0.5 : 0.5);
      effects.play('impact', bossHit, 0, 0.7);
    },
    // Her sword down on the boss: fire bursts from it, and a ring of it over the ground.
    burning({ effects, magic, bossHit, bossFeet }) {
      effects.play('blast', bossHit);
      effects.play('impact', bossHit, 0, 1.2);
      magic.ring(bossFeet, FLAME, 10, 0.45);
      magic.pool(bossFeet, LAVA, 5, 0.8);
    },
    // The fire goes up round her.
    hellfire({ magic, place }, who) {
      magic.ring(place(who, at), FLAME, 18, 0.6);
      magic.pool(place(who, at), LAVA, 7, 1.2);
    },
    // The lava bursts up under the boss.
    eruption({ effects, magic, bossHit, bossFeet }) {
      magic.pool(bossFeet, LAVA, 12, 1.4);
      magic.beam(bossFeet, FLAME, 0.7, 2.2);
      magic.beam(bossFeet, GOLD, 0.5, 1.2, 0.05);
      effects.play('blast', bossHit);
      effects.play('impact', bossHit, 0, 1.6);
      magic.ring(bossFeet, FLAME, 16, 0.55);
    },
  },
  cues: {
    // Hellfire: a column of fire on each ally it reaches.
    hellfire({ magic, place }, _who, targets) {
      for (const ally of targets) magic.beam(place(ally, at), FLAME, 0.6, 0.8);
    },
    // Blocked: her blow back, fire bursting on the boss.
    smash({ effects, magic, bossHit, bossFeet }) {
      effects.play('impact', bossHit, 0, 0.9);
      magic.ring(bossFeet, FLAME, 7, 0.35);
    },
    // Her Flame burns on the boss.
    flame({ magic, bossFeet }) {
      magic.ring(bossFeet, FLAME, 4, 0.4);
    },
  },
};
