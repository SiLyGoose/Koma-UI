import { Vector3 } from 'three';
import type { HeroFx } from '../../fight/fx';

/* What is drawn for Naila's attack and skills (what they do is ../../sim/heroes/naila.ts): her wings' red and the wind's green. */

const FEATHER = 0xff6a3a;
const WIND = 0x9ff0b0;

const at = new Vector3();

export const NAILA_FX: HeroFx = {
  lands: {
    // Her attack: her claws raked across the boss.
    talon({ effects, bossHit }) {
      effects.play('slash', bossHit, 0.7, 1);
      effects.play('impact', bossHit, 0, 0.6);
    },
    // A blow of her fist fight (her animation for her attack): her claws into the boss, the last (the kick) the hardest.
    attack({ effects, magic, bossHit, bossFeet }, _who, part) {
      effects.play('slash', bossHit, part * 0.7, part === 4 ? 1.3 : 0.9);
      effects.play('impact', bossHit, 0, part === 4 ? 1.1 : 0.6);
      if (part === 4) magic.ring(bossFeet, FEATHER, 5, 0.3);
    },
    // Fierce Winds: a rake through the boss each dash, and a gust round it.
    winds({ effects, magic, bossHit, bossFeet }, _who, part) {
      effects.play('slash', bossHit, part ? -0.7 : 0.7, 1.4);
      magic.ring(bossFeet, WIND, 10, 0.4);
    },
    // Dive Bomb: down claws first on the boss.
    dive({ effects, magic, bossHit, bossFeet }) {
      effects.play('explosion', bossHit, 0, 1.1);
      effects.play('quake', bossFeet);
      magic.ring(bossFeet, FEATHER, 16, 0.6);
    },
  },
  cues: {
    // Wind Reading: the wind rising round every ally.
    reading({ effects, magic, place }, _who, targets) {
      for (const ally of targets) {
        place(ally, at);
        magic.ring(at, WIND, 4, 0.6);
        effects.play('haste', at);
      }
    },
    // Tornado Strike: a whirlwind on the boss.
    tornado({ effects, magic, bossHit, bossFeet }) {
      magic.ring(bossFeet, WIND, 12, 0.5);
      effects.play('blast', bossHit, 0, 1.1);
    },
  },
};
