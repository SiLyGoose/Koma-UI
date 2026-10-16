import { Vector3 } from 'three';
import type { FxScene, HeroFx } from '../../fight/fx';

/* What is drawn for Selene's attack and skills (what they do is ../../sim/heroes/selene.ts): the wind's cyan, and moonlight. */

const WIND = 0x8fe8ff;
const MOON = 0xfff4c0;

const from = new Vector3();
const at = new Vector3();

/** Her attack: an arrow from her bow into the boss. */
const arrow = ({ effects, magic, bossHit, muzzle }: FxScene, who: number): void => {
  magic.bolt(muzzle(who, from), bossHit, WIND, 0.18);
  effects.play('pierce', bossHit, 0, 0.6);
};

export const SELENE_FX: HeroFx = {
  lands: {
    // Her attack, as written in code or as her animation for it looses it.
    arrow,
    attack: arrow,
    // Arrow Rain: each arrow falling out of the sky on the boss, here and there round it.
    rain({ effects, magic, bossFeet }, _who, part) {
      const turn = part * 2.4;
      at.set(bossFeet.x + Math.cos(turn) * 0.8, bossFeet.y, bossFeet.z + Math.sin(turn) * 0.8);
      magic.beam(at, WIND, 0.3, 0.25);
      effects.play('pierce', at.setY(bossFeet.y + 1), 0, 0.4);
    },
    // Rush: an arrow at the boss, each.
    rush({ effects, magic, bossHit, muzzle }, who) {
      magic.bolt(muzzle(who, from), bossHit, WIND, 0.15);
      effects.play('impact', bossHit, 0, 0.5);
    },
    // Moonlight Flash: a shaft of moonlight from her bow through the boss.
    flash({ effects, magic, bossHit, bossFeet, muzzle }, who) {
      magic.ray(muzzle(who, from), bossHit, MOON, 0.7, 2.2);
      effects.play('explosion', bossHit, 0, 0.9);
      magic.ring(bossFeet, MOON, 14, 0.6);
    },
  },
};
