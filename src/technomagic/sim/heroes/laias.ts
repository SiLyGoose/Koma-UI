import { away, put } from '../combat/status';
import { BLOW, MAX_MANA, SECTION } from '../rules';
import { skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { atTier, ELTOIRRE, ELTOIRRE_UP } from '../unique';
import { CLASS_STATS, type HeroDef, type Passive } from './kit';

/*
 * Laias's skills, as the game has them (what each costs, how long before it can be used again, how long what it
 * does lasts, and the shares are the game's; how hard each hits, how much it heals and how strong her shield is
 * are not said there):
 * - Healing Droplets: heals every ally, and healing reaches them the more for a while; the more again for one at
 *   half its health or less.
 * - Bubble Shield: a shield on the ally with the lowest health. While it holds, that ally can't be knocked down,
 *   hits harder and is healed every second; and for the whole while it takes less from the boss and deals more to it.
 * - Festival of the Flow: knocks the boss down, heals every ally a share of their max HP and gives every other
 *   ally two crystals of mana; then for a while a whirlpool every few seconds, each striking the boss and knocking
 *   it down again.
 * Her passive, Blessing of the Water Dragon: she stands being knocked down far better; every ally has more M.DEF
 * and the boss's magic is less likely to land a critical blow on them; and each skill she uses has every ally take
 * less magical damage for a while.
 * Her unique weapon (../unique.ts) is worked here too: healing reaches every ally the more, and every so
 * often the ally with the lowest health is healed.
 * What is drawn for each is ../../heroes/laias/fx.ts; what her body does for each, and for her attack, ../../heroes/laias/moves.ts.
 */
const SPLASH = { blow: BLOW * 1.5 };
// (Its 25% Heal Rate, 1.5 times for an ally at half its health or less, as the game has it.)
const DROPLETS = { heal: 15_000, lasts: 10, heals: 0.25, low: 0.5, lowTimes: 1.5 };
const BUBBLE = { shield: 45_000, lasts: 15, taken: 0.7, dmg: 0.15, atk: 0.2, heal: 1_500 };
const FESTIVAL = { blow: 2500, down: 3, heal: 0.15, mana: 2 * SECTION, lasts: 12, every: 4, whirl: 1500, whirlDown: 2 };
// (Her 500 CC Resist and every ally's 250 M.Crit Resistance, as the game has them: points.)
const WATER_DRAGON = { resist: 500, defense: 1.1, critResist: 250, taken: 0.75, lasts: 5 };

const art = skillArt('laias');

const BLESSING: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Blessing of the Water Dragon',
    about: 'Passive. +500 CC Resist for her; every ally has 10% more M.DEF and 250 M.Crit Resistance, and each skill she uses has every ally take 25% less magical damage for 5 seconds.',
    icon: '🐉',
    art: art(3),
  },
};
/** What her passive gives every ally while she is on the field, and each skill she uses for a while. */
const BLESSED: Buff = { name: 'Blessing of the Water Dragon', about: 'More M.DEF, and the boss’s magic is less likely to land a critical blow.', icon: '🐉', art: art(3) };
const WARDED: Buff = { name: 'Water Dragon’s Ward', about: 'Takes 25% less magical damage.', icon: '💧', art: art(3) };
/** What Healing Droplets gives each ally, shown on its card with how long it has left. */
const DROPLETS_UP: Buff = { name: 'Healing Droplets', about: 'Healing reaches it the more.', icon: '💧', art: art(0) };
/** What Bubble Shield gives its ally: for its whole while, and more while the shield holds. */
const BUBBLED: Buff = { name: 'Bubble Shield', about: 'Takes 30% less from the boss and deals 15% more to it.', icon: '🫧', art: art(1) };
const BUBBLE_HOLDS: Buff = { name: 'Bubble', about: 'While the shield holds: can’t be knocked down, hits harder, and is healed every second.', icon: '🫧', art: art(1) };

export const LAIAS: HeroDef = {
  id: 'laias',
  name: 'Laias',
  class: 'priest',
  skins: ['Laias'],
  // A priestess whose blows are magical, who stands being knocked down far better (her passive): as her class stands, otherwise.
  stats: { ...CLASS_STATS.priest, deals: 'magical', resist: CLASS_STATS.priest.resist + WATER_DRAGON.resist },
  abilities: [
    { name: 'Healing Droplets', about: 'Heals every ally, and for 10 seconds healing reaches them 25% more (half as much more again for one at half its health or less).', icon: '💧', art: art(0), move: 'droplets', cooldown: 8, cost: 2 },
    { name: 'Bubble Shield', about: 'A shield on the ally with the lowest health: for 15 seconds it takes 30% less from the boss and deals 15% more. While the shield holds it can’t be knocked down, hits 20% harder and is healed every second.', icon: '🫧', art: art(1), move: 'bubble', cooldown: 15, cost: 3 },
    { name: 'Festival of the Flow', about: 'Knocks the boss down for 3 seconds, heals every ally 15% of its max HP and gives every other ally 2 mana. Then for 12 seconds a whirlpool every 4 seconds strikes the boss and knocks it down for 2.', icon: '🌊', art: art(2), move: 'festival', cooldown: 20, cost: 4 },
  ],
  passive: BLESSING,
  attack: 'splash',
  join(fight, self) {
    /** Whom her Bubble Shield is on, and for how long yet; and toward its next heal (once a second). */
    let bubbled: Fighter | null = null;
    let bubbleLeft = 0;
    let bubbleHeal = 0;
    /** How long her Festival of the Flow's whirlpools go on for yet, and toward the next. */
    let flowing = 0;
    let whirl = 0;
    /** Toward her unique weapon's next heal. */
    let mending = 0;
    const tier = self.unique?.tier ?? null;

    /** She is on the field, standing and in the fight. */
    const there = (): boolean => fight.field.includes(self) && self.hp > 0 && !away(self.statuses);
    /** Her allies on the field, standing and in the fight (her too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** The ally with the lowest health, for what it is out of. */
    const weakest = (): Fighter | undefined => allies().sort((a, b) => a.hp / a.stats.hp - b.hp / b.stats.hp)[0];
    /** Takes a status of hers off every fighter (she has left the field, or what gave it is over). */
    const lift = (name: string, from: readonly Fighter[] = fight.fighters): void => {
      for (const one of from) one.statuses = one.statuses.filter((status) => status.name !== name);
    };

    return {
      lands: {
        // Her attack: a bolt of water into the boss.
        splash() {
          fight.hit(self, SPLASH.blow);
        },
        // Every ally is healed (the more at half its health or less), and healing reaches it the more for a while.
        droplets() {
          const on = allies();
          fight.cue(self, 'droplets', on);
          for (const ally of on) {
            const low = ally.hp <= ally.stats.hp * DROPLETS.low;
            fight.heal(ally, DROPLETS.heal * (low ? DROPLETS.lowTimes : 1), self);
            put(ally.statuses, { name: DROPLETS_UP.name, left: DROPLETS.lasts, heals: 1 + DROPLETS.heals * (low ? DROPLETS.lowTimes : 1), shown: DROPLETS_UP });
          }
        },
        // A shield on the ally with the lowest health; it takes less and deals more for the whole while (more again while the shield holds: tick).
        bubble() {
          const ally = weakest();
          if (!ally) return;
          fight.cue(self, 'bubble', [ally]);
          if (bubbled && bubbled !== ally) lift(BUBBLE_HOLDS.name, [bubbled]);
          fight.shield(ally, BUBBLE.shield, BUBBLE.lasts, self);
          put(ally.statuses, { name: BUBBLED.name, left: BUBBLE.lasts, takes: BUBBLE.taken, deals: 1 + BUBBLE.dmg, shown: BUBBLED });
          bubbled = ally;
          bubbleLeft = BUBBLE.lasts;
          bubbleHeal = 0;
        },
        // The boss is struck and knocked down; every ally is healed, and every other ally given mana; then the whirlpools begin (tick).
        festival() {
          const on = allies();
          fight.cue(self, 'festival', on);
          fight.hit(self, FESTIVAL.blow);
          fight.stun(FESTIVAL.down, { down: true, by: self });
          for (const ally of on) {
            fight.heal(ally, ally.stats.hp * FESTIVAL.heal);
            if (ally !== self) ally.mana = Math.min(MAX_MANA, ally.mana + FESTIVAL.mana);
          }
          flowing = FESTIVAL.lasts;
          whirl = 0;
        },
      },
      // Each skill she uses: every ally takes less magical damage for a while.
      used() {
        put(fight.party, { name: WARDED.name, left: WATER_DRAGON.lasts, takes: { magical: WATER_DRAGON.taken }, shown: WARDED });
      },
      tick(dt) {
        // Her Bubble Shield: while it holds, its ally can't be knocked down, hits harder and is healed every second.
        if (bubbled) {
          bubbleLeft -= dt;
          const holds = bubbleLeft > 0 && bubbled.hp > 0 && bubbled.shield > 0;
          if (holds) {
            put(bubbled.statuses, { name: BUBBLE_HOLDS.name, left: bubbleLeft, guards: true, deals: 1 + BUBBLE.atk, shown: BUBBLE_HOLDS });
            bubbleHeal += dt;
            if (bubbleHeal >= 1) {
              bubbleHeal -= 1;
              fight.heal(bubbled, BUBBLE.heal, self);
            }
          } else {
            lift(BUBBLE_HOLDS.name, [bubbled]);
            bubbled = null;
          }
        }
        if (!there()) {
          // Off the field, or down: what she gives every ally while she is there goes, and her whirlpools stop.
          lift(BLESSED.name);
          lift(ELTOIRRE_UP.name);
          flowing = 0;
          return;
        }
        // Her passive, and her unique weapon's heal rate, on every ally while she is there.
        const on = allies();
        for (const ally of on) {
          put(ally.statuses, { name: BLESSED.name, left: Infinity, defends: { magical: WATER_DRAGON.defense }, critResist: { magical: WATER_DRAGON.critResist }, shown: BLESSED });
          if (tier !== null) put(ally.statuses, { name: ELTOIRRE_UP.name, left: Infinity, heals: 1 + atTier(ELTOIRRE.heals, tier), shown: ELTOIRRE_UP });
        }
        // Festival of the Flow's whirlpools: each strikes the boss and knocks it down again.
        if (flowing > 0) {
          flowing -= dt;
          whirl += dt;
          if (whirl >= FESTIVAL.every) {
            whirl -= FESTIVAL.every;
            fight.cue(self, 'whirlpool');
            fight.hit(self, FESTIVAL.whirl);
            fight.stun(FESTIVAL.whirlDown, { down: true, by: self });
          }
        }
        // Her unique weapon: every so often the ally with the lowest health is healed.
        if (tier !== null) {
          mending += dt;
          if (mending >= ELTOIRRE.every) {
            mending -= ELTOIRRE.every;
            const ally = weakest();
            if (ally) {
              fight.cue(self, 'eltoirre', [ally]);
              fight.heal(ally, atTier(ELTOIRRE.mend, tier), self);
            }
          }
        }
      },
      lit: () => flowing > 0,
    };
  },
};
