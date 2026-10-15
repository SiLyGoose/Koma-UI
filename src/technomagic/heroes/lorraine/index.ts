import { LORRAINE_ASSETS, skillPicture } from '../../assets';
import { put } from '../../combat/status';
import { BLOW } from '../../sim/rules';
import { atTier, ROBURU } from '../../sim/unique';
import { CLASS_STATS, type HeroDef, type Passive } from '../kit';
import { STAND } from './moves';

/*
 * Lorraine's skills, as the game has them (what each costs, how long before it can be used again, how long what it
 * does lasts, and the shares are the game's; how hard each hits and how hard her Poison burns are not said there,
 * nor how much less it leaves the boss healed). Her Poison is on the boss: up to 5 stacked, each eating at it every
 * second and leaving it healed less, all of it begun again with each more, and gone once no Lorraine is standing.
 * - Thornbush Forest: three blows, each leaving a Poison.
 * - Tangled Vine: a blow that leaves 2 Poison and shackles the boss (it can do nothing for a while); a little after,
 *   a blow the harder for each Poison on it.
 * - Wrath of the Forest: a blow that knocks the boss down, harder for each Poison on it.
 * Her passive, Blade Leaf: now and then her attack sends three leaves at the boss besides, each leaving a Poison.
 * Her unique weapon (../../sim/unique.ts) is worked here too: every 7 seconds, with the boss poisoned, a blow that
 * leaves it taking more magical damage for a while.
 * What is drawn for each is ./fx.ts; what her body does for each, and for her attack, ./moves.ts.
 */
const LASH = { blow: BLOW * 1.3 };
const THORNS = { blow: 1500 };
const VINE = { blow: 3000, poison: 2, shackle: 4, after: 2, each: 1500 };
const WRATH = { blow: 6000, down: 3, more: 0.2 };
const LEAF = { chance: 0.3, times: 3, blow: 600 };
/** The most Poison on the boss, how long it lasts once the last was left, how hard each eats at it every second, and what each takes off the boss's heals. */
const POISON = { most: 5, lasts: 20, each: 100, every: 1, heals: 0.1 };

const art = (index: number): string => skillPicture(LORRAINE_ASSETS, index);

const BLADE_LEAF: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Blade Leaf', about: 'Passive. Her attack has a 30% chance to send three leaves at the boss besides, each leaving a Poison on it (up to 5).', icon: '🍃', image: art(3) },
};
/** What her skills leave on the boss. */
const POISONED = 'Poison';

export const LORRAINE: HeroDef = {
  id: 'lorraine',
  name: 'Lorraine',
  class: 'wizard',
  assets: LORRAINE_ASSETS,
  // A wizard (her blows magical, as a wizard's are): as her class stands.
  stats: { ...CLASS_STATS.wizard, deals: 'magical' },
  abilities: [
    { name: 'Thornbush Forest', icon: '🌿', image: art(0), move: 'thornbush', cooldown: 7, cost: 2 },
    { name: 'Tangled Vine', icon: '🪢', image: art(1), move: 'vine', cooldown: 10, cost: 3 },
    { name: 'Wrath of the Forest', icon: '🌳', image: art(2), move: 'wrath', cooldown: 23, cost: 3 },
  ],
  passive: BLADE_LEAF,
  attack: 'lash',
  stands: STAND,
  varies: true,
  join(fight, self) {
    /** How long until Tangled Vine's blow after (0: none coming); toward her Poison's next bite; and toward her unique weapon's next blow. */
    let vine = 0;
    let bitten = 0;
    let roburu = 0;
    const tier = self.unique?.tier ?? null;

    /** How many Poison are on the boss. */
    const poisons = (): number => fight.foe.statuses.find((status) => status.name === POISONED)?.count ?? 0;
    /** So many more Poison on the boss (up to the most), all of it begun again: what heals it heals it less for each. */
    const poison = (count: number): void => {
      const stacks = Math.min(POISON.most, poisons() + count);
      put(fight.foe.statuses, { name: POISONED, left: POISON.lasts, count: stacks, heals: Math.max(0, 1 - POISON.heals * stacks), shown: 'venom' });
    };
    /** The Lorraines in the fight (there may be two: it is the same Poison), and whether any is standing. */
    const lorraines = () => fight.fighters.filter((one) => one.id === self.id);

    return {
      lands: {
        // Her attack: a thorn at the boss; now and then three leaves besides, each leaving a Poison.
        lash() {
          if (fight.roll() >= LEAF.chance) {
            fight.hit(self, LASH.blow);
            return;
          }
          fight.cue(self, 'leaf');
          fight.hit(self, LASH.blow + LEAF.blow * LEAF.times);
          poison(LEAF.times);
        },
        // Each of three blows leaves a Poison.
        thornbush() {
          fight.hit(self, THORNS.blow);
          poison(1);
        },
        // The vine: a blow, 2 Poison, and the boss shackled (as a stun: it can do nothing); its blow after comes in a moment.
        vine() {
          fight.hit(self, VINE.blow);
          poison(VINE.poison);
          fight.stun(VINE.shackle, { by: self });
          vine = VINE.after;
        },
        // The forest bursts up under the boss, harder for each Poison on it: it is knocked down.
        wrath() {
          fight.hit(self, WRATH.blow * (1 + WRATH.more * poisons()));
          fight.stun(WRATH.down, { down: true, by: self });
        },
      },
      tick(dt) {
        // Tangled Vine's blow after, the harder for each Poison on the boss.
        if (vine > 0) {
          vine -= dt;
          if (vine <= 0) {
            fight.cue(self, 'vine');
            fight.hit(self, VINE.each * poisons(), false);
          }
        }
        const count = poisons();
        // With no Lorraine standing, her Poison is gone.
        if (count > 0 && lorraines().every((one) => one.hp <= 0)) {
          fight.foe.statuses.splice(fight.foe.statuses.findIndex((status) => status.name === POISONED), 1);
          return;
        }
        // Her unique weapon: every 7 seconds, with the boss poisoned, a blow that leaves it taking more magical damage for a while.
        if (tier !== null && self.hp > 0) {
          roburu += dt;
          if (roburu >= ROBURU.every) {
            roburu -= ROBURU.every;
            if (count > 0) {
              fight.cue(self, 'roburu');
              fight.hit(self, atTier(ROBURU.blow, tier), false);
              put(fight.foe.statuses, { name: ROBURU.name, left: ROBURU.lasts, takes: { magical: 1 + atTier(ROBURU.takes, tier) }, shown: 'curse' });
            }
          }
        }
        // Her Poison eats at the boss every second (the first Lorraine's, where there are two), each stack of it a blow of its own (counted as one).
        if (count <= 0 || lorraines()[0] !== self) {
          bitten = 0;
          return;
        }
        bitten += dt;
        if (bitten >= POISON.every) {
          bitten -= POISON.every;
          fight.hit(self, POISON.each * count, false);
        }
      },
      lit: () => poisons() >= POISON.most,
    };
  },
};
