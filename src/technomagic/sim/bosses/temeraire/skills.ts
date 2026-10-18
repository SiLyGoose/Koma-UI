import { put } from '../../combat/status';
import type { Buff, Mark } from '../../shown';
import type { Fight, Fighter } from '../../types';
import type { BossPart } from '../boss';
import { all, cooldowns, dot, fraction, lift, opened, single, withDragonGauge } from '../dragon/common';
import { INHALE } from '../dragon/moves';

/*
 * What Temeraire's skills do, as King's Raid's Fire Dragon has them (the game's tips: "As all of Temeraire's attacks deal
 * massive M.DMG, you should try using Heroes that have M.DEF-related spells. To remove [Blessing of the Flame] from
 * Temeraire, Heroes that have high hit counts are recommended. Also, since Temeraire blocks all P.DMG, you should form a
 * party with Heroes that mainly deal M.DMG."; how hard each hits and for how long are first guesses):
 * - Blessing of the Flame: it calls up its flame. While it burns on it, its blows are 50% harder and it takes 60% less
 *   P.DMG; every blow the heroes land puts out some of it (BLESSING.charges in all). It begins the fight with it, and
 *   calls it up again once it is out and its cooldown is over.
 * - Flame Breath: four blows of fire over the whole field, each leaving Burn: a share of the blow again, every second for
 *   6 seconds.
 * - Eruption: up on its wings and down on the field with all its weight: a blow on every hero, and the playtest's Rage of
 *   Dragon's share of what health each has left (its 33%, five of 12.5% and 20%: 73% in all). Open once it is down to
 *   ULTIMATE of its health.
 * Its claws and bite are on whoever it is going for, its tail across the field, and its Tail Strike takes 2/3 of the health
 * left of the one it goes for. Each skill's cooldown, and first wait, is the playtest's (its Bombing Flame is not here). And
 * its CC Gauge (../dragon/common.ts).
 */
export const BLESSING = { charges: 150, deals: 1.5, physical: 0.4, cooldown: 30 };
const BREATH = { burn: 0.12, lasts: 6 };
const TAIL = 2 / 3;
const RAGE = 0.73;

const FLAME = 'Blessing of the Flame';
const BURN: Buff = { name: 'Burn', about: `Fire eats at it every second: ${Math.round(BREATH.burn * 100)}% of the breath's blow.`, icon: '🔥', harmful: true };

export function temerairePart(fight: Fight): BossPart {
  const { foe } = fight;
  const waits = cooldowns({ claw: [5, 3], sweep: [13, 8], breath: [25, 15], blessing: BLESSING.cooldown, eruption: [45, 30] });
  /** What of its flame is left (0: none on it), and how hard each hero's burn is. */
  let flame = 0;
  const burns = new Map<Fighter, number>();
  const burning = dot(fight, BURN.name, (fighter) => burns.get(fighter) ?? 0);

  /** Its flame, on it as a status: so much harder, and P.DMG softer on it, with what is left of it. */
  function kindle(left: number): void {
    flame = left;
    if (flame <= 0) {
      const at = foe.statuses.findIndex((status) => status.name === FLAME);
      if (at >= 0) foe.statuses.splice(at, 1);
      return;
    }
    put(foe.statuses, { name: FLAME, left: Infinity, deals: BLESSING.deals, takes: { physical: BLESSING.physical }, count: flame, shown: 'burn' });
  }

  return withDragonGauge(fight, {
    lands: {
      // Its flame called up: on it until the heroes' blows put it out.
      blessing(_part, amount) {
        all(fight, amount, undefined, 'blessing');
        kindle(BLESSING.charges);
      },
      // Fire over the field: each blow leaves the heroes burning.
      breath(part, amount) {
        if (part < INHALE) return;
        all(
          fight,
          amount,
          (fighter) => {
            burns.set(fighter, Math.max(fighter.statuses.some((status) => status.name === BURN.name) ? (burns.get(fighter) ?? 0) : 0, amount * BREATH.burn));
            put(fighter.statuses, { name: BURN.name, left: BREATH.lasts, shown: BURN });
          },
          'flame',
        );
      },
      // Down on the field from the air.
      eruption(part, amount) {
        if (part === 1) fraction(fight, all(fight, amount, undefined, 'eruption'), RAGE);
      },
      bite: (_part, amount) => single(fight, amount),
      claw: (_part, amount) => single(fight, amount),
      sweep(_part, amount) {
        all(fight, amount, undefined, 'sweep');
        fraction(fight, [fight.target()], TAIL);
      },
    },
    struck() {
      if (flame > 0) kindle(flame - 1);
    },
    used: waits.used,
    // Its flame first, whenever it is out and may be called up again.
    next: () => (flame <= 0 && waits.ready('blessing') ? 'blessing' : null),
    ready: (attack) => attack !== 'blessing' && waits.ready(attack) && (attack !== 'eruption' || opened(fight)),
    tick(dt) {
      waits.tick(dt);
      burning(dt);
    },
    beaten() {
      kindle(0);
      for (const fighter of fight.fighters) lift(fighter, BURN.name);
    },
    marks: (): Mark[] => [],
  });
}
