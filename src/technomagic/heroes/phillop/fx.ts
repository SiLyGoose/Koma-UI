import { Vector3 } from 'three';
import type { FxScene, HeroFx } from '../../fight/fx';

/* What is drawn for Phillop's attack and skills (what they do is ../../sim/heroes/phillop.ts): steel, and the earth's brown. */

const EARTH = 0xc89a5a;
const STEEL = 0xdfe8f0;

const from = new Vector3();

/** His attack: his axe down on the boss. */
const axe = ({ effects, bossHit }: FxScene): void => {
  effects.play('slash', bossHit, 1.4, 1.1);
  effects.play('impact', bossHit, 0, 0.8);
};

export const PHILLOP_FX: HeroFx = {
  lands: {
    // His attack: his axe down on the boss (as written in code, or as his animation for it has it).
    hew: axe,
    attack: axe,
    // Collision: his shield slammed into the boss, and the ground shaken.
    collision({ effects, magic, bossHit, bossFeet }) {
      effects.play('strike', bossHit, 0, 1.2);
      effects.play('quake', bossFeet);
      magic.ring(bossFeet, STEEL, 12, 0.5);
    },
    // Headbutt: his helmeted head into the boss.
    headbutt({ effects, bossHit }) {
      effects.play('impact', bossHit, 0, 1.3);
      effects.play('strike', bossHit, 0, 0.8);
    },
    // Earth Incarnate: the earth rising into him.
    incarnate({ effects, magic, place }, who) {
      place(who, from);
      effects.play('quake', from);
      effects.play('guard', from.setY(from.y + 1));
      magic.ring(place(who, from), EARTH, 8, 0.6);
      magic.beam(from, EARTH, 0.8, 1.1);
    },
  },
};
