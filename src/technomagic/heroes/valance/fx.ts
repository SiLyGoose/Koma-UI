import { Vector3 } from 'three';
import type { HeroFx } from '../../fight/fx';

/* What is drawn for Valance's attack and skills (what they do is ./index.ts): technomagic violet, and the cyan of her lasers. */

const VIOLET = 0xa55cff;
const CYAN = 0x5fe3ff;
const PALE = 0xe2ccff;
/** How high over her and how far behind her the laser cannons are (her lasers come from there). */
const CANNON = { up: 2.6, back: 1.2, spread: 1.4 };

const at = new Vector3();
const from = new Vector3();

export const VALANCE_FX: HeroFx = {
  lands: {
    // Her attack: a bolt out of her crossbow into the boss.
    bolt({ effects, magic, bossHit, bossFeet, head }, who) {
      magic.bolt(head(who, from), bossHit, VIOLET, 0.16);
      effects.play('impact', bossHit, 0, 0.7);
      magic.ring(bossFeet, VIOLET, 3, 0.25);
    },
    // Ultimate Laser Cannon: a ray out of a cannon behind her into the boss (the first the widest).
    cannon({ effects, magic, bossHit, bossFeet, place }, who, part) {
      place(who, from);
      from.set(from.x - CANNON.back, from.y + CANNON.up + (part % 3) * 0.3, from.z + ((part % 3) - 1) * CANNON.spread);
      magic.ray(from, bossHit, CYAN, part === 0 ? 0.6 : 0.3, part === 0 ? 2.4 : 1.1);
      effects.play('impact', bossHit, 0, part === 0 ? 1.4 : 0.6);
      if (part === 0) magic.ring(bossFeet, CYAN, 10, 0.5);
    },
  },
  cues: {
    // Prototype – VA: a column of violet on its ally, and a ring.
    prototype({ magic, place }, _who, targets) {
      for (const ally of targets) {
        place(ally, at);
        magic.beam(at, VIOLET, 0.8, 0.9);
        magic.ring(at, PALE, 4, 0.5);
      }
    },
    // Absolute Protection Field – LA: a wide violet ring spreading from her, and a column on each ally in it.
    field({ magic, place }, who, targets) {
      magic.ring(place(who, at), VIOLET, 18, 0.7);
      for (const ally of targets) magic.beam(place(ally, at), PALE, 0.6, 0.6);
    },
  },
};
