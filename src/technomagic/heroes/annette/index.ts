import { ANNETTE_ASSETS, skillPicture } from '../../assets';
import { away, put, type Status } from '../../combat/status';
import type { Buff } from '../../hud/buff';
import { BLOW, MAX_MANA } from '../../sim/rules';
import type { Fighter } from '../../sim/types';
import { atTier, RASCAL, RASCAL_UP } from '../../sim/unique';
import { CLASS_STATS, type HeroDef, type Passive } from '../kit';
import { STAND } from './moves';

/*
 * Annette's skills, as the game has them (what each costs, how long before it can be used again, how long what
 * it does lasts, and the shares are the game's; how hard each hits and how much it heals are not said there).
 * Rascal, her golem, does the work: each skill used while she is Overcharged does more.
 * - Blasting Ray: a ray into the boss, leaving it hitting less hard and taking more magical damage for a while;
 *   Overcharged, a second ray, and the boss hits softer and takes more again.
 * - Emergency Treatment: clears what the boss has left on every ally (not what holds one down, or shuts one
 *   away) and heals them over a while, and they stand being knocked down better meanwhile; Overcharged, they
 *   are also more likely to land a critical blow, deal more, and can't be knocked down at all.
 * - Process of Elimination: a ball of energy that bursts on the boss; Overcharged, it bursts harder, stuns the
 *   boss and leaves it taking more magical damage.
 * Her passive, Charge: she gains a Charge every half second, and ten for each crystal of mana she spends; at a
 * hundred she is Overcharged for a while (her ATK higher, and each of her attacks takes a share off her skills'
 * cooldowns), and gains no Charge meanwhile.
 * Her unique weapon (../../sim/unique.ts) is worked here too: every so often a Charge (even while Overcharged)
 * and a little mana, and while she is Overcharged every ally deals more and takes less.
 * What is drawn for each is ./fx.ts; what her body does for each, and for her attack, ./moves.ts.
 */
const ZAP = { blow: BLOW * 1.4 };
const RAY = { blow: 4000, extra: 3000, weaker: 0.15, takes: 0.25, lasts: 10 };
// (Its 250 CC Resistance and 250 Crit Chance, as the game has them: points.)
const TREATMENT = { heal: 40_000, lasts: 10, resist: 250, crit: 0.25, dmg: 0.1 };
const ELIMINATION = { blow: 7000, over: 10000, takes: 0.25, lasts: 10, stun: 5 };
const CHARGE = { every: 0.5, perCrystal: 10, full: 100, lasts: 15, atk: 0.3, cooldown: 0.1 };

const art = (index: number): string => skillPicture(ANNETTE_ASSETS, index);

const CHARGING: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Charge',
    about: 'Passive. A Charge every half second, and 10 for each crystal of mana she spends; at 100 she is Overcharged for 15 seconds (ATK higher, and each attack takes 10% off her skills’ cooldowns).',
    icon: '⚡',
    image: art(3),
  },
};
/** Her Charge: shown beside her passive, with how many she has. */
const CHARGED: Buff = { name: 'Charge', about: 'At 100 she is Overcharged.', icon: '⚡' };
/** Overcharged: shown on her card, with how long it has left. */
const OVERCHARGED: Buff = { name: 'Overcharge', about: '30% higher ATK; each attack takes 10% off her skills’ cooldowns; her skills do more.', icon: '🔋', image: art(3) };
/** What Emergency Treatment gives each ally: shown on its card, with how long it has left. */
const TREATED: Buff = { name: 'Emergency Treatment', about: 'Healed over time, and knocked down for less long.', icon: '🩹', image: art(1) };
const TREATED_OVER: Buff = { name: 'Emergency Treatment', about: 'Healed over time; more likely to land a critical blow, deals 10% more, and can’t be knocked down.', icon: '🩹', image: art(1) };
/** What Blasting Ray and Process of Elimination leave on the boss. */
const RAYED = 'Blasting Ray';
const ELIMINATED = 'Process of Elimination';

export const ANNETTE: HeroDef = {
  id: 'annette',
  name: 'Annette',
  class: 'mechanic',
  assets: ANNETTE_ASSETS,
  // A mechanic whose blows are magical (Rascal's): as her class stands, otherwise.
  stats: { ...CLASS_STATS.mechanic, deals: 'magical' },
  abilities: [
    { name: 'Blasting Ray', about: 'Rascal fires a ray into the boss: for 10 seconds it hits 15% softer and takes 25% more magical damage. Overcharged: a second ray, and twice that.', icon: '🔆', image: art(0), move: 'ray', cooldown: 11, cost: 2 },
    { name: 'Emergency Treatment', about: 'Clears what the boss has left on every ally (not what holds one down or shuts one away) and heals them over 10 seconds, and they stand being knocked down better meanwhile. Overcharged: they are also 25% likelier to land a critical blow, deal 10% more, and can’t be knocked down.', icon: '🩹', image: art(1), move: 'treatment', cooldown: 13, cost: 2 },
    { name: 'Process of Elimination', about: 'A ball of energy that bursts on the boss. Overcharged: it bursts harder, stuns the boss for 5 seconds, and leaves it taking 25% more magical damage for 10.', icon: '💣', image: art(2), move: 'elimination', cooldown: 25, cost: 3 },
  ],
  passive: CHARGING,
  attack: 'zap',
  stands: STAND,
  join(fight, self) {
    /** Her Charge; how long she is Overcharged for yet; and toward her next Charge, and her unique weapon's. */
    let charge = 0;
    let over = 0;
    let charging = 0;
    let rascal = 0;
    /** Each skill was used while she was Overcharged (as it began: it does more as it lands). */
    const overcharged = { ray: false, treatment: false, elimination: false };
    /** How long her Emergency Treatment heals for yet, and toward its next heal (once a second). */
    let treating = 0;
    let treated = 0;
    const tier = self.unique?.tier ?? null;

    /** She is on the field, standing and in the fight. */
    const there = (): boolean => fight.field.includes(self) && self.hp > 0 && !away(self.statuses);
    /** Her allies on the field, standing and in the fight (her too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** Charge gained: at a hundred, Overcharged (once she isn't already). */
    const gain = (count: number): void => {
      charge = Math.min(CHARGE.full, charge + count);
      if (charge < CHARGE.full || over > 0) return;
      charge = 0;
      over = CHARGE.lasts;
      put(self.statuses, { name: OVERCHARGED.name, left: over, deals: 1 + CHARGE.atk, shown: OVERCHARGED });
    };

    return {
      lands: {
        // Her attack: Rascal fires at the boss. Overcharged, each takes a share off her skills' cooldowns.
        zap() {
          fight.hit(self, ZAP.blow);
          if (over <= 0) return;
          self.def.abilities.forEach((ability, i) => {
            self.cooldowns[i] = Math.max(0, (self.cooldowns[i] as number) - ability.cooldown * CHARGE.cooldown);
          });
        },
        // A ray into the boss (two, Overcharged): it hits less hard and takes more magical damage for a while.
        ray() {
          const more = overcharged.ray;
          fight.hit(self, RAY.blow);
          if (more) fight.hit(self, RAY.extra);
          const times = more ? 2 : 1;
          put(fight.foe.statuses, { name: RAYED, left: RAY.lasts, deals: 1 - RAY.weaker * times, takes: { magical: 1 + RAY.takes * times }, shown: 'curse' });
        },
        // What the boss has left on every ally is cleared, and they are healed over a while and stand being knocked down better (Overcharged, more).
        treatment() {
          const more = overcharged.treatment;
          const on = allies();
          fight.cue(self, 'treatment', on);
          const harmful = (status: Status<Buff>): boolean => status.shown.harmful === true && !status.binds && !status.away;
          for (let i = fight.party.length - 1; i >= 0; i--) if (harmful(fight.party[i] as Status<Buff>)) fight.party.splice(i, 1);
          for (const ally of on) {
            ally.statuses = ally.statuses.filter((status) => !harmful(status));
            put(
              ally.statuses,
              more
                ? { name: TREATED.name, left: TREATMENT.lasts, resist: TREATMENT.resist, crit: TREATMENT.crit, deals: 1 + TREATMENT.dmg, guards: true, shown: TREATED_OVER }
                : { name: TREATED.name, left: TREATMENT.lasts, resist: TREATMENT.resist, shown: TREATED },
            );
          }
          treating = TREATMENT.lasts;
          treated = 0;
        },
        // The ball bursts on the boss (Overcharged: harder, and it is stunned and takes more magical damage for a while).
        elimination() {
          const more = overcharged.elimination;
          fight.hit(self, more ? ELIMINATION.over : ELIMINATION.blow);
          if (!more) return;
          put(fight.foe.statuses, { name: ELIMINATED, left: ELIMINATION.lasts, takes: { magical: 1 + ELIMINATION.takes }, shown: 'curse' });
          fight.stun(ELIMINATION.stun, { by: self });
        },
      },
      // Each skill as it is used: whether she is Overcharged, and ten Charge for each crystal of mana it took.
      used(_index, ability) {
        if (ability.move === 'ray' || ability.move === 'treatment' || ability.move === 'elimination') overcharged[ability.move] = over > 0;
        gain(ability.cost * CHARGE.perCrystal);
      },
      tick(dt) {
        // Emergency Treatment heals every ally a share of it each second.
        if (treating > 0) {
          treating -= dt;
          treated += dt;
          if (treated >= 1) {
            treated -= 1;
            for (const ally of allies()) fight.heal(ally, TREATMENT.heal / TREATMENT.lasts, self);
          }
        }
        if (over > 0) over = Math.max(0, over - dt);
        if (!there()) return;
        // A Charge every half second (not while Overcharged); and her unique weapon's, and its mana, even then.
        if (over <= 0) {
          charging += dt;
          if (charging >= CHARGE.every) {
            charging -= CHARGE.every;
            gain(1);
          }
        } else charging = 0;
        if (tier !== null) {
          rascal += dt;
          const every = atTier(RASCAL.every, tier);
          if (rascal >= every) {
            rascal -= every;
            self.mana = Math.min(MAX_MANA, self.mana + MAX_MANA * RASCAL.mana);
            gain(1);
          }
          // While she is Overcharged, every ally deals more and takes less (the ally with the highest ATK, twice as much).
          if (over > 0) {
            const on = allies();
            const top = on.reduce<Fighter | null>((best, ally) => (!best || ally.stats.atk > best.stats.atk ? ally : best), null);
            for (const ally of on) {
              const k = ally === top ? RASCAL.top : 1;
              put(ally.statuses, { name: RASCAL_UP.name, left: over, deals: 1 + RASCAL.dmg * k, takes: 1 - RASCAL.taken * k, shown: RASCAL_UP });
            }
          }
        }
      },
      lit: () => over > 0,
      buffs: () => (over > 0 ? [] : [{ ...CHARGED, count: Math.floor(charge) }]),
    };
  },
};
