import { share } from '../combat/damage';
import { away, put, type Status } from '../combat/status';
import { t5Light } from '../perks';
import { BLOW, MAX_MANA } from '../rules';
import { pct, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { atTier, RASCAL, RASCAL_UP } from '../unique';
import { CLASS_STATS, type HeroDef, type Passive } from './kit';

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
 * Her unique weapon (../unique.ts) is worked here too: every so often a Charge (even while Overcharged)
 * and a little mana, and while she is Overcharged every ally deals more and takes less.
 * What is drawn for each is ../../heroes/annette/fx.ts; what her body does for each, and for her attack, ../../heroes/annette/moves.ts.
 *
 * Her own perks (../perks.ts) are King's Raid's. Process of Elimination's Dark doesn't say for how long: as long as it
 * leaves the boss so Overcharged (10 seconds), Overcharged or not (and both, Overcharged). What Charge's Light adds, it
 * adds to Overcharge's ATK; Transcend 5's Dark's ATK for every ally (a share of hers) is so much more DMG, and its
 * attack speed a pace.
 */
const ZAP = { blow: BLOW * 1.4 };
const RAY = { blow: 4000, extra: 3000, weaker: 0.15, takes: 0.25, lasts: 10 };
// (Its 250 CC Resistance and 250 Crit Chance, as the game has them: points.)
const TREATMENT = { heal: 40_000, lasts: 10, resist: 250, crit: 250, dmg: 0.1 };
const ELIMINATION = { blow: 7000, over: 10000, takes: 0.25, lasts: 10, stun: 5 };
const CHARGE = { every: 0.5, perCrystal: 10, full: 100, lasts: 15, atk: 0.3, cooldown: 0.1 };
/** Her own perks' numbers: more Charge from a skill, Process of Elimination's mark, Overcharge's more ATK and longer, and Transcend 5's Dark's for every ally (attack speed in points, ATK a share of hers). */
const PERKS = { charge: 1.4, eliminated: 0.25, overAtk: 1.4, overLonger: 3, allies: { speed: 200, atk: 0.05 } };

const art = skillArt('annette');

const CHARGING: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Charge',
    about: `Passive. A [Charge] every ${CHARGE.every} seconds, and ${CHARGE.perCrystal} for each crystal of mana she spends; at ${CHARGE.full} she is [Overcharged] for ${CHARGE.lasts} seconds (ATK higher, and each attack takes ${pct(CHARGE.cooldown)} off her skills’ cooldowns).`,
    icon: '⚡',
    art: art(3),
  },
  words: `Gains 1 stack of Charge every ${CHARGE.every} sec, and gains ${CHARGE.perCrystal} stacks of Charge per every orb of mana used. Upon the ${CHARGE.full}th Charge stacked, enters Overcharge state. When in Overcharge, ATK is increased by ${pct(CHARGE.atk)} for ${CHARGE.lasts} sec, and each auto attack reduces skill cooldown by ${pct(CHARGE.cooldown)}. All effects cannot be dispelled, and Charge will not stack during Overcharge state.`,
};
/** Her Charge: shown beside her passive, with how many she has. */
const CHARGED: Buff = { name: 'Charge', about: `At ${CHARGE.full} she is [Overcharged].`, icon: '⚡' };
/** Overcharged: shown on her card, with how long it has left. */
const OVERCHARGED: Buff = { name: 'Overcharge', about: `${pct(CHARGE.atk)} higher ATK; each attack takes ${pct(CHARGE.cooldown)} off her skills’ cooldowns; her skills do more.`, icon: '🔋', art: art(3) };
/** What Transcend 5's Dark gives every ally while she is Overcharged. */
const ROUSED: Buff = { name: 'Overcharge (allies)', about: `Quicker, and its ATK higher by ${pct(PERKS.allies.atk)} of Annette’s.`, icon: '⚡', art: art(3) };
/** What Emergency Treatment gives each ally: shown on its card, with how long it has left. */
const TREATED: Buff = { name: 'Emergency Treatment', about: 'Healed over time, and knocked down for less long.', icon: '🩹', art: art(1) };
const TREATED_OVER: Buff = { name: 'Emergency Treatment', about: `Healed over time; more likely to land a critical blow, deals ${pct(TREATMENT.dmg)} more, and can’t be knocked down.`, icon: '🩹', art: art(1) };
/** What Blasting Ray and Process of Elimination leave on the boss. */
const RAYED = 'Blasting Ray';
const ELIMINATED = 'Process of Elimination';

export const ANNETTE: HeroDef = {
  id: 'annette',
  name: 'Annette',
  class: 'mechanic',
  skins: ['Annette', 'Annette_Halloween'],
  // A mechanic whose blows are magical (Rascal's): as her class stands, otherwise.
  stats: { ...CLASS_STATS.mechanic, deals: 'magical' },
  abilities: [
    {
      name: 'Blasting Ray',
      about: `Rascal fires a ray into the boss: for ${RAY.lasts} seconds it hits ${pct(RAY.weaker)} softer and takes ${pct(RAY.takes)} more magical damage. [Overcharged]: a second ray, and twice that.`,
      words: `Attacks enemies in a straight line, dealing M.DMG, reducing their ATK by ${pct(RAY.weaker)} and hit enemies take ${pct(RAY.takes)} increased M.DMG for ${RAY.lasts} sec. If the skill is used when in Overcharge state, deals extra M.DMG, additionally reduces their ATK by ${pct(RAY.weaker)}, and hit enemies take ${pct(RAY.takes)} increased M.DMG.`,
      icon: '🔆',
      art: art(0),
      move: 'ray',
      cooldown: 11,
      cost: 2,
    },
    {
      name: 'Emergency Treatment',
      about: `Clears what the boss has left on every ally (not what holds one down or shuts one away) and heals them over ${TREATMENT.lasts} seconds, and they stand being knocked down better meanwhile. [Overcharged]: they are also ${pct(share(TREATMENT.crit))} likelier to land a critical blow, deal ${pct(TREATMENT.dmg)} more, and can’t be knocked down.`,
      words: `Dispels negative effects of all allies and heals HP for ${TREATMENT.lasts} sec while increasing CC Resistance by ${TREATMENT.resist}. While Overcharged, all allies' Crit Chance is increased by ${TREATMENT.crit} and DMG dealt to Non-Hero enemies by ${pct(TREATMENT.dmg)} and gains immunity to CC.`,
      icon: '🩹',
      art: art(1),
      move: 'treatment',
      cooldown: 13,
      cost: 2,
    },
    {
      name: 'Process of Elimination',
      about: `A ball of energy that bursts on the boss. [Overcharged]: it bursts harder, stuns the boss for ${ELIMINATION.stun} seconds, and leaves it taking ${pct(ELIMINATION.takes)} more magical damage for ${ELIMINATION.lasts}.`,
      words: `Fires an exploding energy ball to a random target and nearby enemies in range, dealing M.DMG. When in Overcharge state, deals M.DMG, increases M.DMG enemies take by ${pct(ELIMINATION.takes)} for ${ELIMINATION.lasts} sec, and inflicts Stun for ${ELIMINATION.stun} sec upon explosion.`,
      icon: '💣',
      art: art(2),
      move: 'elimination',
      cooldown: 25,
      cost: 3,
    },
  ],
  passive: CHARGING,
  perks: {
    's1-light': { words: 'Target takes 25% increased M.DMG for 10 sec.', skill: { index: 0, mark: { name: 'Magic Weakness', takes: { magical: 1.25 }, lasts: 10 } } },
    's1-dark': { words: 'Charge amount is boosted by 40% upon use.' },
    's2-light': { words: 'Cooldown is reduced by 3 sec.', skill: { index: 1, cooldown: -3 } },
    's2-dark': { words: 'Charge amount is boosted by 40% upon use.' },
    's3-light': { words: 'DMG is increased by 40%.', skill: { index: 2, dmg: 1.4 } },
    's3-dark': { words: 'Target takes 25% increased M.DMG.' },
    's4-light': { words: 'ATK boost is increased by 40%.' },
    's4-dark': { words: 'Overcharge duration is increased by 3 sec.' },
    't5-light': t5Light('ATK, DEF, HP +15% / ATK Spd +100', { speed: 100 }),
    't5-dark': { words: "When Overcharge activates, increases all allies' ATK Spd by 200, and increases the ATK of all allies by 5% of Annette's ATK." },
  },
  attack: 'zap',
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
      over = CHARGE.lasts + (self.perks.has('s4-dark') ? PERKS.overLonger : 0);
      put(self.statuses, { name: OVERCHARGED.name, left: over, deals: 1 + CHARGE.atk * (self.perks.has('s4-light') ? PERKS.overAtk : 1), shown: OVERCHARGED });
      // Transcend 5's Dark: every ally quicker, and its ATK higher by a share of hers (so much more DMG), while it lasts.
      if (self.perks.has('t5-dark')) {
        for (const ally of allies()) put(ally.statuses, { name: ROUSED.name, left: over, pace: 1 + share(PERKS.allies.speed), deals: 1 + (PERKS.allies.atk * self.stats.atk) / ally.stats.atk, shown: ROUSED });
      }
    };

    return {
      lands: {
        // Her attack: Rascal fires at the boss. Overcharged, each takes a share off her skills' cooldowns.
        zap() {
          fight.hit(self, ZAP.blow);
          if (over <= 0) return;
          self.abilities.forEach((ability, i) => {
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
                ? { name: TREATED.name, left: TREATMENT.lasts, resist: TREATMENT.resist, crit: share(TREATMENT.crit), deals: 1 + TREATMENT.dmg, guards: true, shown: TREATED_OVER }
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
          // (Its Dark: the boss takes more magical damage, Overcharged or not.)
          const takes = (more ? ELIMINATION.takes : 0) + (self.perks.has('s3-dark') ? PERKS.eliminated : 0);
          if (takes > 0) put(fight.foe.statuses, { name: ELIMINATED, left: ELIMINATION.lasts, takes: { magical: 1 + takes }, shown: 'curse' });
          if (more) fight.stun(ELIMINATION.stun, { by: self });
        },
      },
      // Each skill as it is used: whether she is Overcharged, and ten Charge for each crystal of mana it took.
      used(index, ability) {
        if (ability.move === 'ray' || ability.move === 'treatment' || ability.move === 'elimination') overcharged[ability.move] = over > 0;
        // (Blasting Ray's and Emergency Treatment's Dark: more Charge for them.)
        const more = (index === 0 && self.perks.has('s1-dark')) || (index === 1 && self.perks.has('s2-dark')) ? PERKS.charge : 1;
        gain(ability.cost * CHARGE.perCrystal * more);
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
