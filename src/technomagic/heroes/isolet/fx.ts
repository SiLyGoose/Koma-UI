import { Vector3 } from 'three';
import type { HeroFx } from '../../fight/fx';

/*
 * What is drawn for Isolet beyond her moves' own (her assets' vfx): her Raging Storm – Icarus, which King's Raid raises where
 * the enemy stands (her skill script puts it at its target's position; only its Casting is on her). While the storm rages
 * (the sim's storm: her `lit`), its tornado at the boss's front on the floor; once its blows turn to the [Blazing Storm] (the
 * boss's [Blazing Storm] put on again: more stacks, or its time back up), the fire tornado in its place; and as it ends, the
 * end of whichever it was. Drawn from where the fight is each frame, not timed: a page away, it comes back as the fight has it.
 */

const STORM = 'Skill.Hero.Isolet.Skill3';
/** The longest a storm's tornado may go on, should it never be told to stop (seconds: the sim's lasts 10). */
const LONGEST = 12;

/** A storm raging: what stops its tornado, whether it is the fire one, and the [Blazing Storm] on the enemies when last seen. */
interface Storm {
  stop: () => void;
  fire: boolean;
  left: number;
  count: number;
}

const at = new Vector3();
/** The floor in front of the boss, where a cut reaches it: where the storm stands. */
const front = (bossHit: Vector3): Vector3 => at.set(bossHit.x, 0, bossHit.z);

export const ISOLET_FX: HeroFx = {
  each({ kr, bossHit }, _who, { lit, foes }, kept) {
    const storm = kept.storm as Storm | undefined;
    // (The freshest [Blazing Storm] on an enemy: its time is put back up, or its stacks go up, with each blow that is one.)
    let left = 0;
    let count = 0;
    for (const status of foes) {
      if (status.name !== 'Blazing Storm') continue;
      left = Math.max(left, status.left);
      count = Math.max(count, status.count ?? 0);
    }
    if (!storm) {
      if (!lit) return;
      kr(`${STORM}.Tornado.Casting`, { at: front(bossHit) });
      kept.storm = { stop: kr(`${STORM}.Tornado.Loop`, { at: front(bossHit), lasts: LONGEST }), fire: false, left, count } satisfies Storm;
      return;
    }
    if (!lit) {
      storm.stop();
      kr(`${STORM}.${storm.fire ? 'FireTornado' : 'Tornado'}.End`, { at: front(bossHit) });
      delete kept.storm;
      return;
    }
    if (!storm.fire && (count > storm.count || left > storm.left + 0.01)) {
      storm.stop();
      kr(`${STORM}.FireTornado.Casting`, { at: front(bossHit) });
      storm.stop = kr(`${STORM}.FireTornado.Loop`, { at: front(bossHit), lasts: LONGEST });
      storm.fire = true;
    }
    storm.left = left;
    storm.count = count;
  },
};
