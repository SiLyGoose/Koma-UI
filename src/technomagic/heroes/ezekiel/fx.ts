import { Vector3 } from 'three';
import type { HeroFx } from '../../fight/fx';

/* What is drawn for Ezekiel's attack and skills (what they do is ./index.ts): his demon arm's blue fire, and the red of his cursed blood. */

const BLUE = 0x3f7dff;
const PALE = 0x9fd0ff;
const BLOOD = 0xd0203a;

const at = new Vector3();

export const EZEKIEL_FX: HeroFx = {
  lands: {
    // His attack: a slash of his claws across the boss.
    claw({ effects, magic, bossHit, bossFeet }) {
      effects.play('slash', bossHit, 0.6);
      effects.play('impact', bossHit, 0, 0.7);
      magic.ring(bossFeet, BLUE, 3, 0.25);
    },
    // A blow of his fist fight (his animation for his attack): it lands on the boss with his demon arm's blue fire, the last (the kick) the hardest.
    attack({ effects, magic, bossHit, bossFeet }, _who, part) {
      effects.play('strike', bossHit, part * 0.7, part === 4 ? 1.3 : 0.9);
      effects.play('impact', bossHit, 0, part === 4 ? 1.1 : 0.7);
      magic.ring(bossFeet, BLUE, part === 4 ? 5 : 3, 0.25);
    },
    // Destructive Instinct: the swipe round, then the blow to the ground.
    instinct({ effects, magic, bossHit, bossFeet }, _who, part) {
      if (part === 0) {
        effects.play('slash', bossHit, -0.6);
        magic.ring(bossFeet, PALE, 8, 0.35);
        return;
      }
      effects.play('blast', bossHit);
      effects.play('impact', bossHit, 0, 1.2);
      magic.ring(bossFeet, BLUE, 12, 0.5);
    },
    // Dawning Despair: the dash's slash.
    despair({ effects, magic, bossHit, bossFeet }) {
      effects.play('slash', bossHit, 0.6);
      effects.play('impact', bossHit, 0, 1);
      magic.ring(bossFeet, PALE, 6, 0.4);
    },
    // Strike of Doom: a column of blue fire down onto the boss as the blow lands.
    doom({ effects, magic, bossHit, bossFeet }) {
      effects.play('blast', bossHit);
      effects.play('impact', bossHit, 0, 1.5);
      magic.beam(bossFeet, BLUE, 0.6, 1.6);
      magic.ring(bossFeet, BLUE, 10, 0.5);
    },
  },
  cues: {
    // His Cursed Blood spent: red rings round him as his Fury begins, and a burst on the boss.
    fury({ effects, magic, place, bossHit, bossFeet }, who) {
      place(who, at);
      magic.ring(at, BLOOD, 6, 0.5);
      magic.beam(at, BLOOD, 0.8, 1.2);
      effects.play('blast', bossHit);
      magic.ring(bossFeet, BLOOD, 12, 0.6);
    },
  },
};
