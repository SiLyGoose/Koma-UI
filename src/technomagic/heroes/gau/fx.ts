import { Vector3 } from 'three';
import type { FxScene, HeroFx } from '../../fight/fx';

/* What is drawn for Gau's attack and skills (what they do is ../../sim/heroes/gau.ts): steel, and a beast's fury. */

const FURY = 0xff9a4a;
const ICE = 0xbfe8ff;

const from = new Vector3();

/** His attack: his axe down on the boss. */
const chop = ({ effects, bossHit }: FxScene): void => {
  effects.play('slash', bossHit, 1.4, 1.2);
  effects.play('impact', bossHit, 0, 0.8);
};

export const GAU_FX: HeroFx = {
  lands: {
    chop,
    attack: chop,
    // Smash: brought down hard (the ground shaken), then swung through the boss.
    smash({ effects, magic, bossHit, bossFeet }, _who, part) {
      if (part === 0) {
        effects.play('strike', bossHit, 0, 1.3);
        effects.play('quake', bossFeet);
        magic.ring(bossFeet, FURY, 10, 0.5);
        return;
      }
      effects.play('blast', bossHit, -0.4, 1.2);
    },
    // Battle Roar: his roar's wave (each ally's lift is drawn by the cue).
    warcry({ magic, place }, who) {
      magic.ring(place(who, from), FURY, 14, 0.7);
    },
    // Vortex: each blow of the whirl; the last freezes the boss.
    vortex({ effects, magic, bossHit, bossFeet }, _who, part) {
      effects.play('slash', bossHit, part * 1.1, 1.1);
      if (part === 5) {
        effects.play('explosion', bossHit, 0, 0.9);
        magic.field(bossFeet, ICE, 2.2, 1);
      }
    },
  },
  cues: {
    warcry({ effects, place }, _who, targets) {
      for (const one of targets) effects.play('haste', place(one, from).setY(from.y + 1));
    },
  },
};
