import { Vector3 } from 'three';
import type { HeroFx } from '../../fight/fx';

/* What is drawn for Lorraine's attack and skills (what they do is ./index.ts). */

/** Her colours: the forest's green, the deep green of her thorns, and the violet of her Poison. */
const LEAF = 0x7be05a;
const THORN = 0x2f8f3a;
const POISON = 0xa45cff;

const from = new Vector3();

export const LORRAINE_FX: HeroFx = {
  lands: {
    // Her attack: a thorn shot from her staff at the boss.
    lash({ effects, magic, bossHit, head }, who) {
      magic.bolt(head(who, from), bossHit, LEAF, 0.25);
      effects.play('impact', bossHit, 0, 0.7);
    },
    // Thorns come up round the boss, each time.
    thornbush({ effects, magic, bossHit, bossFeet }, _who, part) {
      magic.ring(bossFeet, THORN, 6 + part * 2, 0.35);
      effects.play('slash', bossHit, part * 1.1, 0.9);
      effects.play('impact', bossHit, 0, 0.7);
    },
    // The vine runs out along the ground and wraps the boss.
    vine({ effects, magic, bossHit, bossFeet, place }, who) {
      magic.bolt(place(who, from), bossFeet, THORN, 0.3);
      magic.pool(bossFeet, POISON, 6, 1.5);
      effects.play('impact', bossHit, 0, 1);
    },
    // The forest bursts up under the boss.
    wrath({ effects, magic, bossHit, bossFeet }) {
      magic.beam(bossFeet, LEAF, 0.7, 2);
      magic.ring(bossFeet, THORN, 16, 0.55);
      magic.pool(bossFeet, POISON, 9, 1.2);
      effects.play('blast', bossHit);
      effects.play('impact', bossHit, 0, 1.6);
    },
  },
  cues: {
    // Blade Leaf: three leaves at the boss.
    leaf({ effects, magic, bossHit, head }, who) {
      head(who, from);
      for (let i = 0; i < 3; i++) magic.bolt(from, bossHit, LEAF, 0.3, i * 0.08);
      effects.play('slash', bossHit, 0.8, 0.8);
    },
    // Tangled Vine's blow after: the poison in the boss bursts.
    vine({ effects, magic, bossHit, bossFeet }) {
      magic.ring(bossFeet, POISON, 12, 0.5);
      effects.play('impact', bossHit, 0, 1.3);
    },
    // Her unique weapon: the world tree strikes the poisoned boss.
    roburu({ effects, magic, bossHit, bossFeet }) {
      magic.beam(bossFeet, LEAF, 0.5, 1.2);
      effects.play('impact', bossHit, 0, 1);
    },
  },
};
