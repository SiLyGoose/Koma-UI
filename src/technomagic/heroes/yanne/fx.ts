import { Vector3 } from 'three';
import type { FxScene, HeroFx } from '../../fight/fx';

/* What is drawn for Yanne's attack and skills (what they do is ../../sim/heroes/yanne.ts): a dragon-slayer's gold, and fire. */

const GOLD = 0xffd27a;
const FIRE = 0xff7a3a;

const from = new Vector3();

/** Her attack: an arrow from her bow into the boss. */
const shot = ({ effects, magic, bossHit, muzzle }: FxScene, who: number): void => {
  magic.bolt(muzzle(who, from), bossHit, GOLD, 0.18);
  effects.play('pierce', bossHit, 0, 0.6);
};

export const YANNE_FX: HeroFx = {
  lands: {
    // Her attack, as written in code or as her animation for it looses it.
    shot,
    attack: shot,
    // Focus Shot!: a shaft of gold straight through the boss.
    focus({ effects, magic, bossHit, muzzle }, who) {
      magic.ray(muzzle(who, from), bossHit, GOLD, 0.6, 1.6);
      effects.play('pierce', bossHit, 0, 1.2);
    },
    // Wipeout!: a great arrow that bursts on the boss.
    wipeout({ effects, magic, bossHit, bossFeet, muzzle }, who) {
      magic.bolt(muzzle(who, from), bossHit, FIRE, 0.25);
      effects.play('explosion', bossHit, 0, 1);
      magic.ring(bossFeet, FIRE, 10, 0.5);
    },
    // No Holding Back!: her power rising about her.
    unleash({ effects, magic, place }, who) {
      place(who, from);
      effects.play('flames', from);
      magic.beam(from, FIRE, 0.9, 0.9);
      effects.play('haste', from.setY(from.y + 1));
    },
  },
};
