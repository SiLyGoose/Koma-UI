import { Vector3 } from 'three';
import type { HeroFx } from '../../fight/fx';
import { HERO_TURN } from '../../sim';
import { rise } from './apparition';

/* What is drawn for Fallen Frey's attack and skills (what they do is ./index.ts). */

/** Her colours: dark violet light, and paler for what heals. */
const DARK = 0x9b4dff;
const PALE = 0xc9a2ff;
/** How far round the ally with the lowest health her Light of Doom reaches (as ./index.ts has it), for its ring. */
const NEAR = 3.6;
/** How far above her hand her weapon's head is (her bolts go up from it). */
const STAFF = 0.6;
/** Heaven's Vengeance: how high in the sky its bolts go, and how long one takes up and one down (seconds). */
const VENGEANCE = { high: 14, up: 0.22, down: 0.14 };

const at = new Vector3();
const from = new Vector3();
const sky = new Vector3();

export const FALLEN_FREY_FX: HeroFx = {
  lands: {
    // Her attack: a bolt of dark light into the boss.
    smite({ effects, magic, bossHit, bossFeet }) {
      effects.play('impact', bossHit, 0, 0.8);
      magic.ring(bossFeet, DARK, 4, 0.3);
    },
    // The light bursts on the boss (its heal is cued).
    light({ effects, magic, bossHit, bossFeet }, _who, part) {
      if (part === 0) return;
      effects.play('blast', bossHit);
      magic.ring(bossFeet, DARK, 12, 0.5);
    },
    // A bolt shot up out of her weapon into the sky; and one straight down out of it onto the boss, somewhere about its feet, as a column of light.
    vengeance({ effects, magic, bossHit, bossFeet, leftHand }, who, part) {
      leftHand(who, from).y += STAFF;
      sky.set(from.x + (Math.random() * 2 - 1) * 1.5, from.y + VENGEANCE.high, from.z + (Math.random() * 2 - 1) * 1.5);
      magic.bolt(from, sky, DARK, VENGEANCE.up);
      at.set(bossFeet.x + (Math.random() * 2 - 1) * 0.9, 0, bossFeet.z + (Math.random() * 2 - 1) * 0.9);
      sky.set(at.x, VENGEANCE.high, at.z);
      magic.bolt(sky, at, PALE, VENGEANCE.down, VENGEANCE.up * 0.8);
      magic.beam(at, DARK, 0.35, 0.7, VENGEANCE.up * 0.8 + VENGEANCE.down);
      // Every other one a shaft of light falling out of the sky with it.
      if (part % 2 === 0) effects.play('falling', at, 0, 0.8 + Math.random() * 0.4);
      effects.play('impact', bossHit, 0, 0.6);
      if (part % 5 === 4) magic.ring(bossFeet, DARK, 7, 0.35);
    },
  },
  cues: {
    // The light comes down round the first (the ally with the lowest health), on each it heals.
    light({ magic, place }, _who, targets) {
      const [lowest] = targets;
      if (lowest === undefined) return;
      magic.ring(place(lowest, at), PALE, NEAR * 2, 0.5);
      for (const ally of targets) magic.beam(place(ally, at), PALE, 0.7, 1.2);
    },
    // Blessing of Doom: her dark self rising behind her, and the shields on each ally.
    blessing({ magic, props, place }, who, targets) {
      rise(props, place(who, at), HERO_TURN);
      for (const ally of targets) {
        place(ally, at);
        magic.beam(at, DARK, 0.6, 0.8);
        magic.ring(at, PALE, 4, 0.5);
      }
    },
  },
};
