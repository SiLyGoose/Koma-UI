import { Vector3 } from 'three';
import type { HeroFx } from '../../fight/fx';
import { bloom, shoot, snap, wind } from './vines';

/* What is drawn for Lorraine's attack and skills (what they do is ./index.ts). */

/** Her colours: the forest's green, the deep green of her thorns, and the violet of her Poison. */
const LEAF = 0x7be05a;
const THORN = 0x2f8f3a;
const POISON = 0xa45cff;
/** How long the vines hold the boss: as long as it is shackled (./index.ts). */
const SHACKLE = 4;

const from = new Vector3();
/** Where round the boss Thornbush Forest's fly-traps come up (radians, from the side toward the camera): one, then another, then another. */
const TRAPS = [-0.6, 0.9, 2.4];

export const LORRAINE_FX: HeroFx = {
  lands: {
    // Her attack: thorns shot from her staff at the boss.
    lash({ effects, props, bossHit, head }, who) {
      shoot(props, head(who, from), bossHit);
      effects.play('impact', bossHit, 0, 0.7);
    },
    // A fly-trap comes up out of the ground beside the boss and bites into it, each time.
    thornbush({ effects, magic, props, bossHit, bossFeet }, _who, part) {
      snap(props, bossFeet, TRAPS[part % TRAPS.length] as number);
      magic.ring(bossFeet, THORN, 6 + part * 2, 0.35);
      effects.play('impact', bossHit, 0, 0.8);
    },
    // The vine runs out along the ground, and vines come up out of it and wind round the boss while it is shackled.
    vine({ effects, magic, props, bossHit, bossFeet, place }, who) {
      magic.bolt(place(who, from), bossFeet, THORN, 0.3);
      magic.pool(bossFeet, POISON, 6, 1.5);
      wind(props, bossFeet, SHACKLE, Math.random() * Math.PI * 2);
      effects.play('impact', bossHit, 0, 1);
    },
    // The forest bursts up under the boss: its light, and flowers out of the ground all round it.
    wrath({ effects, magic, props, bossHit, bossFeet }) {
      effects.play('rising', bossFeet);
      bloom(props, bossFeet, Math.random() * Math.PI * 2);
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
    roburu({ effects, bossHit, bossFeet }) {
      effects.play('rising', bossFeet, 0, 0.7);
      effects.play('impact', bossHit, 0, 1);
    },
  },
};
