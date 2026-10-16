import { Vector3 } from 'three';
import type { HeroFx } from '../../fight/fx';

/* What is drawn for Oddy's attack and skills (what they do is ../../sim/heroes/oddy.ts): her clock's gold, and time's teal. */

const GOLD = 0xffd27a;
const TIME = 0x6ff0e0;
/** How long Time Distortion's dial turns under her. */
const DIAL = 1.6;

const from = new Vector3();
const at = new Vector3();

export const ODDY_FX: HeroFx = {
  lands: {
    // Her attack: a chime of light from her clock into the boss.
    chime({ effects, magic, bossHit, muzzle }, who) {
      magic.bolt(muzzle(who, from), bossHit, GOLD, 0.2);
      effects.play('impact', bossHit, 0, 0.6);
    },
    // Time Fracture: a crack in time out along the ground to the boss, and it is turned to stone.
    fracture({ effects, magic, bossHit, bossFeet, place }, who) {
      magic.ray(place(who, from).setY(0.5), bossHit, TIME, 0.5, 1.2);
      magic.ring(bossFeet, TIME, 10, 0.5);
      effects.play('strike', bossHit, 0, 0.9);
    },
    // Time Fragments: a shard of her clock at the boss, each.
    fragments({ effects, magic, bossHit, muzzle }, who) {
      magic.bolt(muzzle(who, from), bossHit, GOLD, 0.18);
      effects.play('pierce', bossHit, 0, 0.5);
    },
    // Time Distortion: a blow on the boss.
    distortion({ effects, bossHit }) {
      effects.play('explosion', bossHit, 0, 0.9);
    },
  },
  cues: {
    // Time Distortion: a dial turning under her, and light on every ally it quickens.
    distortion({ effects, magic, place }, who, targets) {
      magic.field(place(who, from), TIME, 6, DIAL);
      for (const ally of targets) {
        place(ally, at);
        magic.beam(at, GOLD, 0.6, 0.6);
        effects.play('haste', at);
      }
    },
  },
};
