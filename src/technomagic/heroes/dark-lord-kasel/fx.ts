import { Vector3 } from 'three';
import type { FxScene, HeroFx } from '../../fight/fx';

/* What is drawn for Dark Lord Kasel's attack and skills (what they do is ../../sim/heroes/dark-lord-kasel.ts): darkness, violet. */

const DARK = 0x9b5cff;

const from = new Vector3();

export const DARK_LORD_KASEL_FX: HeroFx = {
  lands: {
    // His attack: a cut one way, then the other.
    corrupt({ effects, bossHit }, _who, part) {
      effects.play('slash', bossHit, part % 2 ? -0.6 : 0.6);
      effects.play('impact', bossHit, 0, 0.7);
    },
    // Judgment Blade: two cuts; its [Dark Lord] blow more brought down on the ground.
    judge({ effects, magic, bossHit, bossFeet }, _who, part) {
      if (part < 2) {
        effects.play('blast', bossHit, part ? -0.5 : 0.5, 1.1);
        return;
      }
      effects.play('strike', bossHit, 0, 1.3);
      magic.ring(bossFeet, DARK, 10, 0.5);
    },
    // Doom: the darkness bursting on the boss three times; its [Dark Lord] blow more a great burst.
    ruin({ effects, magic, bossHit, bossFeet }, _who, part) {
      effects.play('pierce', bossHit, 0, part < 3 ? 0.9 : 1.3);
      if (part === 0) magic.pool(bossFeet, DARK, 2.2, 0.8);
      if (part === 3) effects.play('explosion', bossHit, 0, 1);
    },
    // Advent of the Dark Lord: the darkness rising round him.
    advent({ effects, magic, place }, who) {
      const feet = place(who, from);
      effects.play('quake', feet);
      magic.ring(feet, DARK, 8, 0.7);
      magic.field(feet, DARK, 1.6, 1);
    },
  },
};
