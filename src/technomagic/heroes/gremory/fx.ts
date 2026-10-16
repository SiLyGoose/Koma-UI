import { Vector3 } from 'three';
import type { HeroFx } from '../../fight/fx';
import { SCALE } from '../body/hero';

/* What is drawn for Gremory's attack and skills (what they do is ./index.ts). */

/** Her colours: the pink of her servants, and the violet of the gateway they come through. */
const PINK = 0xff6fb5;
const VIOLET = 0x8a4dff;
/** How high her cube's middle is over where she is placed, as the field measures it (her servants come out of it): its height in her model (../../assets/heroes/gremory.ts) times how big she is drawn (SCALE). */
const CUBE = 0.52 * SCALE;

const at = new Vector3();
const from = new Vector3();

/** Where her cube is: under her. */
const cube = (place: (who: number, into: Vector3) => Vector3, who: number): Vector3 => {
  place(who, from).y += CUBE;
  return from;
};

export const GREMORY_FX: HeroFx = {
  lands: {
    // Her attack: her cube's uppercut (./moves.ts) lands on the boss.
    nudge({ effects, magic, bossHit, bossFeet }) {
      effects.play('impact', bossHit, 0, 0.8);
      magic.ring(bossFeet, VIOLET, 4, 0.3);
    },
    // Pochi bites: out of the cube and into the boss, one way then the other.
    pochi({ effects, magic, bossHit, bossFeet, place }, who, part) {
      magic.bolt(cube(place, who), bossHit, PINK, 0.15);
      effects.play('slash', bossHit, part % 2 ? -0.8 : 0.8, 0.9);
      effects.play('impact', bossHit, 0, 0.6);
      if (part === 4) magic.ring(bossFeet, PINK, 8, 0.4);
    },
    // Puchi comes down on the boss from behind.
    puchi({ effects, magic, bossHit, bossFeet }) {
      magic.beam(bossFeet, VIOLET, 0.5, 1.3);
      effects.play('blast', bossHit);
      effects.play('impact', bossHit, 0, 1.4);
      magic.ring(bossFeet, VIOLET, 12, 0.5);
    },
    // Pippi wraps the boss: a ring tightening round its feet, a little to one side or the other each time.
    pippi({ effects, magic, bossHit, bossFeet }, _who, part) {
      at.set(bossFeet.x + (part % 2 ? 0.4 : -0.4), 0, bossFeet.z + ((part % 3) - 1) * 0.4);
      magic.ring(at, part % 2 ? PINK : VIOLET, 6, 0.3);
      effects.play('impact', bossHit, 0, 0.5);
      if (part === 9) magic.cage((into) => into.copy(bossFeet), PINK, 0.8);
    },
    // Lying down to sleep: a soft pool under her.
    sleep({ magic, place }, who) {
      magic.pool(place(who, at), VIOLET, 2.5, 2.5);
    },
  },
};
