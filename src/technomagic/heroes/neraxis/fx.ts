import { Vector3 } from 'three';
import type { FxScene, HeroFx } from '../../fight/fx';

/* What is drawn for Neraxis's attack and skills (what they do is ../../sim/heroes/neraxis.ts): the black dragon's violet, and lightning. */

const VIOLET = 0x9a6bff;
const LIGHTNING = 0xc9b8ff;

const from = new Vector3();
const above = new Vector3();

/** His attack: his claw raked across the boss. */
const maw = ({ effects, bossHit }: FxScene): void => {
  effects.play('slash', bossHit, 0.6, 1.1);
  effects.play('impact', bossHit, 0, 0.7);
};

export const NERAXIS_FX: HeroFx = {
  lands: {
    maw,
    attack: maw,
    // Black Lightning Claw: a rake, then lightning down on the boss.
    lightning({ effects, magic, bossHit, bossFeet }, _who, part) {
      if (part === 0) {
        effects.play('slash', bossHit, -0.6, 1.3);
        return;
      }
      above.copy(bossFeet).setY(bossFeet.y + 6);
      magic.bolt(above, bossHit, LIGHTNING, 0.3);
      effects.play('strike', bossHit, 0, 1.1);
      magic.ring(bossFeet, VIOLET, 10, 0.5);
    },
    // Obsidian Roar: a wave from him, and a blow on the boss.
    roar({ effects, magic, place, bossHit }, who) {
      magic.ring(place(who, from), VIOLET, 14, 0.7);
      effects.play('guard', from.setY(from.y + 1));
      effects.play('blast', bossHit, 0, 1);
    },
    // Breath of Destruction: dark fire poured over the boss.
    breath({ effects, magic, bossHit, bossFeet, head }, who, part) {
      magic.ray(head(who, from), bossHit, VIOLET, 0.2, 1.4);
      effects.play('explosion', bossHit, part * 0.7, 0.7);
      if (part === 0) magic.field(bossFeet, VIOLET, 2.5, 1.2);
    },
  },
  cues: {
    // His unique weapon's Storm: on every ally.
    storm({ effects, place }, _who, targets) {
      for (const one of targets) effects.play('ward', place(one, from).setY(from.y + 1));
    },
  },
};
