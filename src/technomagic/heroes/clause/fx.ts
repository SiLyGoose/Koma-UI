import { Vector3 } from 'three';
import type { HeroFx } from '../../fight/fx';

/* What is drawn for Clause's attack and skills (what they do is ./index.ts). */

const at = new Vector3();

export const CLAUSE_FX: HeroFx = {
  lands: {
    // A cut across the boss one way, then the other.
    swing({ effects, bossHit }, _who, part) {
      effects.play('slash', bossHit, part % 2 ? -0.5 : 0.5);
      effects.play('impact', bossHit, 0, 0.7);
    },
    // Down out of the air on the boss: the ground breaks up, and rings.
    slam({ effects, magic, bossHit, bossFeet }) {
      effects.play('impact', bossHit, 0, 1.4);
      effects.play('quake', bossFeet);
      magic.ring(bossFeet, 0xffe9a8, 13, 0.5);
    },
    bash({ effects, bossHit }) {
      effects.play('impact', bossHit, 0, 1.1);
    },
    // The shield raised: a ring out from him.
    guard({ magic, place }, who) {
      magic.ring(place(who, at), 0xffe9a8, 16, 0.6);
    },
  },
  cues: {
    // Blocked: his blow back.
    vow({ effects, bossHit }) {
      effects.play('impact', bossHit, 0, 0.7);
    },
  },
  // Guardian Shield: his shield, glowing, held up before each hero while it lasts.
  wards: { 'Guardian Shield': 'guardian' },
};
