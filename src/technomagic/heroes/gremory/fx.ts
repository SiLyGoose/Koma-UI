import { Vector3 } from 'three';
import type { HeroFx } from '../../fight/fx';

/*
 * What is drawn for Gremory's attack and skills (what they do is ./index.ts). Pochi and Puchi are King's Raid's own (its
 * servants' effects, their bodies in them: her assets' krFx), at the boss's front on the floor, as their blows land (her
 * moves are written in code, timed as the game's are not: the game's have them come later than these land); Pippi and
 * her sleep are drawn here (the game's are drawn with trails, which its effects here go without).
 */

/** Her colours: the pink of her servants, and the violet of the gateway they come through. */
const PINK = 0xff6fb5;
const VIOLET = 0x8a4dff;
/** The game's effects of her servants. */
const POCHI = 'Skill.Hero.Gremory.Summon.Pochi';
const PUCHI = 'Skill.Hero.Gremory.Summon.Poochi';
/** Pochi's bites (the sim's: ../../sim/heroes/moves.ts), and how long it may bite at most (seconds: it goes as the last lands). */
const BITES = 5;
const BITING = 4;

const at = new Vector3();
/** Each Gremory's Pochi biting now (by the hero): what stops it. */
const biting = new Map<number, () => void>();

/** The floor in front of the boss, where a cut reaches it: where her servants stand. */
const front = (bossHit: Vector3): Vector3 => at.set(bossHit.x, 0, bossHit.z);

export const GREMORY_FX: HeroFx = {
  lands: {
    // Her attack: her cube's uppercut (./moves.ts) lands on the boss.
    nudge({ effects, magic, bossHit, bossFeet }) {
      effects.play('impact', bossHit, 0, 0.8);
      magic.ring(bossFeet, VIOLET, 4, 0.3);
    },
    // Pochi leaps on the boss and bites, till its last bite; then it goes.
    pochi({ kr, bossHit }, who, part) {
      if (part === 0) {
        biting.get(who)?.();
        kr(`${POCHI}.Jump`, { at: front(bossHit) });
        biting.set(who, kr(`${POCHI}.Loop`, { at: front(bossHit), lasts: BITING }));
      }
      if (part < BITES - 1) return;
      biting.get(who)?.();
      biting.delete(who);
      kr(`${POCHI}.End`, { at: front(bossHit) });
    },
    // Puchi comes down on the boss.
    puchi({ kr, bossHit }) {
      kr(`${PUCHI}.Hit`, { at: front(bossHit) });
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
