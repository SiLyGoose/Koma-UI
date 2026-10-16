import { Vector3 } from 'three';
import type { HeroFx } from '../../fight/fx';

/* What is drawn for Lucikiel's attack and skills (what they do is ../../sim/heroes/lucikiel.ts): the demon god's violet darkness, and the blue of his hair's light. */

const DARK = 0x6a2bff;
const BLUE = 0x2fa8ff;
const PALE = 0xd9c8ff;

const from = new Vector3();

export const LUCIKIEL_FX: HeroFx = {
  lands: {
    // His attack: a bolt of darkness from his hand into the boss.
    havoc({ effects, magic, bossHit, head }, who) {
      magic.bolt(head(who, from), bossHit, DARK, 0.2);
      effects.play('impact', bossHit, 0, 0.8);
    },
    // A blow of his fist fight (his animation for his attack): his claws into the boss with the demon god's darkness, the last (the kick) the hardest.
    attack({ effects, magic, bossHit, bossFeet }, _who, part) {
      effects.play('strike', bossHit, part * 0.7, part === 4 ? 1.3 : 0.9);
      effects.play('impact', bossHit, 0, part === 4 ? 1.1 : 0.7);
      magic.ring(bossFeet, DARK, part === 4 ? 5 : 3, 0.25);
    },
    // Death Storm: the storm turning over the boss, a blow each time it comes round.
    storm({ effects, magic, bossHit, bossFeet }, _who, part) {
      magic.ring(bossFeet, DARK, 8 + part * 3, 0.4);
      effects.play('slash', bossHit, part % 2 ? -0.9 : 0.9, 1.1);
      if (part === 2) magic.pool(bossFeet, DARK, 7, 2);
    },
    // Annihilation Wave: a wave of darkness out from him along the ground into the boss.
    wave({ effects, magic, bossHit, place }, who, part) {
      magic.ray(place(who, from).setY(0.8), bossHit, part === 0 ? DARK : BLUE, 0.5, 1.4);
      effects.play('strike', bossHit, 0, part === 0 ? 1 : 0.8);
    },
    // Annihilation Surge: the wave wider, and the boss's feet torn.
    surge({ effects, magic, bossHit, bossFeet, place }, who, part) {
      magic.ray(place(who, from).setY(0.8), bossHit, part === 0 ? DARK : BLUE, 0.6, 2.4);
      magic.ring(bossFeet, DARK, 12, 0.5);
      effects.play('strike', bossHit, 0, 1.3);
    },
    // Doomsday: the darkness crashing down on the boss, nine times, the last the hardest.
    doomsday({ effects, magic, bossHit, bossFeet }, _who, part) {
      const last = part === 8;
      magic.beam(bossFeet, last ? BLUE : DARK, 0.5, last ? 2.2 : 1);
      effects.play('impact', bossHit, 0, last ? 1.6 : 0.8);
      if (last) {
        effects.play('explosion', bossHit);
        magic.ring(bossFeet, PALE, 18, 0.6);
        magic.pool(bossFeet, DARK, 10, 1.5);
      }
    },
  },
};
