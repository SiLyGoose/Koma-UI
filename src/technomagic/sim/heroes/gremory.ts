import { share } from '../combat/damage';
import { put, type Status } from '../combat/status';
import { BLOW, MAX_MANA } from '../rules';
import { skillArt, type Buff, type Tone } from '../shown';
import { t5Light } from '../perks';
import { atTier, PIGRITIA } from '../unique';
import { CLASS_STATS, type Ability, type HeroDef, type Passive } from './kit';

/*
 * Gremory's skills, as the game has them (what each costs, how long its marks last and how many stack are the
 * game's; how hard each hits is not said there). None of them has a cooldown: each is sealed once used, and
 * once all three are, each of their slots turns into a fourth, Eh, whatever. I'm gonna sleep.:
 * - Pochi, bite them!: five bites on the boss, each harder for her Mana Charge (and harder again on a boss),
 *   each leaving it hitting less hard (Pochi's Mark, up to five times over).
 * - Puchi, knock them away!: a blow from behind that stuns the boss. (Its mark, Puchi's Mark, lowers a target's
 *   M.Block: left out, as no boss here blocks.)
 * - Pippi, wrap them!: ten blows, each leaving the boss taking more magical damage (Pippi's Mark, up to ten
 *   times over); a blow on it with all ten deals more, through its defense.
 * - Eh, whatever. I'm gonna sleep.: she sleeps a while, taking less and not to be knocked down; her skills are
 *   unsealed, and she gains a Mana Charge (five at most), each making her ATK and all she deals higher.
 *   (In the game it also clears what holds her: here she can't use it while anything does.)
 * Her unique weapon (../unique.ts) is worked here too: it quickens her, and her sleep heals her and
 * fills her mana, and makes her Mana Charge give her more ATK.
 * What is drawn for each is ../../heroes/gremory/fx.ts; what her body does for each, and for her attack, ../../heroes/gremory/moves.ts.
 *
 * Her own perks (../perks.ts) are King's Raid's. Puchi's two do nothing here: its mark's M.Block (left out, as above),
 * and knocking the boss away (it can't be: it is stunned, as ever). Her sleep's Light makes its less taken a fifth more.
 */
const NUDGE = { blow: BLOW * 1.3 };
const POCHI = { bite: 1800, boss: 1200, more: 0.15, bossMore: 0.3, weaker: 0.06, most: 5, lasts: 15 };
const PUCHI = { blow: 7000, stun: 5 };
const PIPPI = { blow: 1500, through: 1000, pierce: 500, takes: 0.05, most: 10, lasts: 12 };
const SLEEP = { taken: 0.6 };
const CHARGE = { most: 5, atk: 0.1, dmg: 0.02 };
/** Her own perks' numbers: Pochi's Mark's less M.DEF for each, and her sleep's more less taken. */
const PERKS = { softer: 0.06, sleepier: 1.2 };

/** Eh, whatever. I'm gonna sleep.: how long she lies asleep (her move written in code has her wake as it ends). */
export const ASLEEP = 3;

const art = skillArt('gremory');

/** What all three of her slots turn into once her skills are sealed (its picture is the game's for it, where a passive's would be). */
const SLEEP_SKILL: Ability = { name: 'Eh, whatever. I’m gonna sleep.', about: 'She sleeps for 3 seconds, taking 40% less and not to be knocked down; then her skills are unsealed, and she gains a [Mana Charge] (5 at most): +10% ATK and +2% to all she deals for each.', icon: '💤', art: art(3), move: 'sleep', cooldown: 0, cost: 0 };

const LAZY: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Eh, whatever. I’m gonna sleep.',
    about:
      'Each of her skills is sealed once used; once all three are, each turns into this. She sleeps a while (taking 40% less and not to be knocked down), then wakes with her skills unsealed and a [Mana Charge].',
    icon: '💤',
    art: art(3),
  },
};
/** Asleep: shown on her card, with how long it has left. */
const SLEEPING: Buff = { name: 'Asleep', about: 'Takes 40% less from the boss, and can’t be knocked down.', icon: '💤', art: art(3) };
/** Her Mana Charge: shown on her card, with how many she has. */
const CHARGED: Buff = { name: 'Mana Charge', about: 'Each: +10% ATK and +2% to all she deals; [Pochi, bite them!] hits harder for each.', icon: '🔋' };
/** What her skills leave on the boss. */
const POCHI_MARK = 'Pochi’s Mark';
const PIPPI_MARK = 'Pippi’s Mark';

/** One more of a mark on the boss (up to `most`), begun again: how many it now has. */
function mark(on: Status<Tone>[], name: string, most: number, lasts: number, made: (count: number) => Partial<Status<Tone>>): number {
  const count = Math.min(most, (on.find((status) => status.name === name)?.count ?? 0) + 1);
  put(on, { name, left: lasts, count, shown: 'curse', ...made(count) });
  return count;
}

export const GREMORY: HeroDef = {
  id: 'gremory',
  name: 'Gremory',
  class: 'assassin',
  skins: ['Gremory', 'Gremory_DailyLook'],
  // An assassin whose blows are magical: as her class stands, otherwise.
  stats: { ...CLASS_STATS.assassin, deals: 'magical' },
  abilities: [
    { name: 'Pochi, bite them!', about: 'Five bites, each harder for her [Mana Charge], each leaving [Pochi’s Mark]: the boss hits 6% softer for each, for 15 seconds (up to 5). Sealed once used.', icon: '🐶', art: art(0), move: 'pochi', cooldown: 0, cost: 3 },
    { name: 'Puchi, knock them away!', about: 'A blow from behind that stuns the boss for 5 seconds. Sealed once used.', icon: '💥', art: art(1), move: 'puchi', cooldown: 0, cost: 3 },
    { name: 'Pippi, wrap them!', about: 'Ten blows, each leaving [Pippi’s Mark]: the boss takes 5% more magical damage for each, for 12 seconds (up to 10). With all 10 on it, each blow deals more, through its defense. Sealed once used.', icon: '🎀', art: art(2), move: 'pippi', cooldown: 0, cost: 4 },
  ],
  passive: LAZY,
  perks: {
    's1-light': { words: 'When there is 1 enemy, additional M.DMG dealt to bosses ignores DEF.' },
    's1-dark': { words: "[Pochi's Mark] additionally reduces M.DEF by 6%." },
    's2-light': { words: "The M.Block Chance Reduction effect of [Puchi's Mark] will fix the M.Block Chance to 0 instead." },
    's2-dark': { words: 'Knocks the target away instead of inflicting Stun.' },
    's3-light': { words: 'Reduces Mana Cost by 1.', skill: { index: 2, cost: -1 } },
    's3-dark': { words: 'Increases Mana Cost by 1 and DMG by 100%.', skill: { index: 2, cost: 1, dmg: 2 } },
    's4-light': { words: 'Increases All DMG Reduction effect by 20% while in use.' },
    's4-dark': { words: "At the beginning of each battle, [Eh, whatever. I'm gonna sleep.] becomes activated." },
    't5-light': t5Light('ATK, DEF, HP +15% / Crit Chance +100', { crit: 100 }),
    't5-dark': { words: 'Increases DMG dealt to Non-Hero enemies by 50% when there is 1 enemy.', dmg: 1.5 },
  },
  attack: 'nudge',
  // On her cube.
  join(fight, self) {
    /** Which of her skills are sealed; her Mana Charge; and how long her unique weapon is filling her mana for yet. */
    // (Her sleep's Dark: it is ready as the fight begins.)
    const sealed = self.abilities.map(() => self.perks.has('s4-dark'));
    let charges = 0;
    let filling = 0;
    const tier = self.unique?.tier ?? null;

    return {
      lands: {
        // Her attack: something out of her cube goes for the boss.
        nudge() {
          fight.hit(self, NUDGE.blow);
        },
        // A bite, harder for her Mana Charge (and more again, as on any boss); the boss hits less hard for each (up to five).
        pochi() {
          const bite = POCHI.bite * (1 + POCHI.more * charges);
          const boss = POCHI.boss * (1 + POCHI.bossMore * charges);
          // (Its Light: what more it deals the boss goes through its defense, a blow of its own.)
          if (self.perks.has('s1-light')) {
            fight.hit(self, bite);
            fight.hit(self, boss, false, 0, true);
          } else fight.hit(self, bite + boss);
          // (Its Dark: the boss's M.DEF lower for each too.)
          const softer = self.perks.has('s1-dark');
          mark(fight.foe.statuses, POCHI_MARK, POCHI.most, POCHI.lasts, (count) => ({ deals: 1 - POCHI.weaker * count, ...(softer && { defends: { magical: 1 - PERKS.softer * count } }) }));
        },
        // From behind: a blow, and the boss stunned.
        puchi() {
          fight.hit(self, PUCHI.blow);
          fight.stun(PUCHI.stun, { by: self });
        },
        // A wrap: the boss takes more magical damage for each (up to ten); with all ten on it, the blow deals more, through its defense.
        pippi() {
          const count = mark(fight.foe.statuses, PIPPI_MARK, PIPPI.most, PIPPI.lasts, (stacks) => ({ takes: { magical: 1 + PIPPI.takes * stacks } }));
          fight.hit(self, PIPPI.blow);
          if (count >= PIPPI.most) fight.hit(self, PIPPI.through, false, PIPPI.pierce);
        },
        // Lying down (what comes of her sleep came as she began it: used()).
        sleep() {},
      },
      // Once all three are sealed, each slot is her sleep; until then a sealed one can't be used.
      slot(index) {
        if (sealed.every(Boolean)) return SLEEP_SKILL;
        return sealed[index] ? null : (self.abilities[index] ?? null);
      },
      used(index, ability) {
        if (ability !== SLEEP_SKILL) {
          sealed[index] = true;
          return;
        }
        // She sleeps: her skills unsealed, and one more Mana Charge (with her unique weapon, the more ATK for each; and she is healed, and her mana fills).
        sealed.fill(false);
        charges = Math.min(CHARGE.most, charges + 1);
        put(self.statuses, { name: SLEEPING.name, left: ASLEEP, takes: self.perks.has('s4-light') ? 1 - (1 - SLEEP.taken) * PERKS.sleepier : SLEEP.taken, guards: true, shown: SLEEPING });
        const atk = CHARGE.atk + (tier === null ? 0 : atTier(PIGRITIA.charge, tier));
        put(self.statuses, { name: CHARGED.name, left: Infinity, count: charges, deals: (1 + atk * charges) * (1 + CHARGE.dmg * charges), shown: CHARGED });
        if (tier !== null) {
          fight.heal(self, atTier(PIGRITIA.heal, tier) * self.stats.hp);
          filling = PIGRITIA.over;
        }
      },
      tick(dt) {
        if (filling <= 0 || tier === null) return;
        const now = Math.min(dt, filling);
        filling -= now;
        self.mana = Math.min(MAX_MANA, self.mana + (MAX_MANA * atTier(PIGRITIA.mana, tier) * now) / PIGRITIA.over);
      },
      // Her unique weapon quickens her.
      pace: () => (tier === null ? 1 : 1 + share(atTier(PIGRITIA.speed, tier))),
      // Her skills all sealed: her sleep is ready.
      lit: () => sealed.every(Boolean),
    };
  },
};
