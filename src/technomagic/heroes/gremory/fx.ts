import { Vector3 } from 'three';
import type { HeroFx } from '../../fight/fx';

/*
 * What is drawn for Gremory's attack and skills (what they do is ./index.ts). Her servants are King's Raid's own (their
 * effects, their bodies in them: her assets' krFx), at the boss's front on the floor, as their blows land (her moves are
 * written in code, timed as the game's are not: the game's have them come later than these land). Her sleep's is the
 * game's too, kept on her while she sleeps (her assets' wards).
 */

/** Her colour: the violet of the gateway her servants come through. */
const VIOLET = 0x8a4dff;
/** The game's effects of her servants. */
const POCHI = 'Skill.Hero.Gremory.Summon.Pochi';
const PUCHI = 'Skill.Hero.Gremory.Summon.Poochi';
const PIPPI = 'Skill.Hero.Gremory.Summon.Pippy';
/** Pochi's bites (the sim's: ../../sim/heroes/moves.ts), and how long it may bite at most (seconds: it goes as the last lands). */
const BITES = 5;
const BITING = 4;
/** Pippi's wraps (the sim's), and how long it may circle at most (seconds: it goes as the last lands). */
const WRAPS = 10;
const SWARMING = 4;

const at = new Vector3();
/** Each Gremory's Pochi biting now (by the hero): what stops it. */
const biting = new Map<number, () => void>();
/** Each Gremory's Pippi circling now (by the hero): what stops it. */
const swarming = new Map<number, () => void>();

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
    // Pippi and its swarm circle the boss, till its last wrap; then they go.
    pippi({ kr, bossHit }, who, part) {
      if (part === 0) {
        swarming.get(who)?.();
        swarming.set(who, kr(`${PIPPI}.Loop`, { at: front(bossHit), lasts: SWARMING }));
      }
      if (part < WRAPS - 1) return;
      swarming.get(who)?.();
      swarming.delete(who);
      kr(`${PIPPI}.End`, { at: front(bossHit) });
    },
  },
};
