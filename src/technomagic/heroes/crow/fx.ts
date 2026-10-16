import { Vector3 } from 'three';
import type { HeroFx } from '../../fight/fx';

/* What is drawn for Crow's attack and skills (what they do is ../../sim/heroes/crow.ts): his bullets' gold, his Frost Bullet's ice, and his laser's red. */

const SHOT = 0xffb347;
const FROST = 0x9cf0ff;
const LASER = 0xff3b3b;
/** How long the freezing area lies under the boss (as long as it lasts: ../../sim/heroes/crow.ts). */
const AREA = 6;

const from = new Vector3();

/** A shot from the end of his gun into the boss (the flash's file points back, away from where it is shot). */
const shot: NonNullable<HeroFx['lands']>['snipe'] = ({ effects, magic, bossHit, muzzle }, who) => {
  muzzle(who, from);
  effects.play('shoot', from, Math.PI, 0.6);
  magic.bolt(from, bossHit, SHOT, 0.1);
  effects.play('impact', bossHit, 0, 0.5);
};

export const CROW_FX: HeroFx = {
  lands: {
    snipe: shot,
    eliminate: shot,
    // Struggle is Meaningless.: shots, then the Frost Bullet, and the freezing area under the boss.
    struggle(fx, who, part) {
      if (part < 10) {
        shot(fx, who, part);
        return;
      }
      const { effects, magic, bossHit, bossFeet, muzzle } = fx;
      magic.bolt(muzzle(who, from), bossHit, FROST, 0.2);
      effects.play('explosion', bossHit, 0, 0.8);
      magic.pool(bossFeet, FROST, 9, AREA);
      magic.ring(bossFeet, FROST, 12, 0.5);
    },
    // Even Gods shall Die.: the laser, from his gun through the boss.
    gods({ effects, magic, bossHit, bossFeet, muzzle }, who) {
      muzzle(who, from);
      effects.play('shoot', from, Math.PI, 2);
      magic.ray(from, bossHit, LASER, 0.9, 3);
      effects.play('explosion', bossHit, 0, 1.4);
      magic.ring(bossFeet, LASER, 16, 0.6);
    },
  },
};
