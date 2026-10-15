import { EZEKIEL_ASSETS, skillPicture } from '../../assets';
import { share } from '../../combat/damage';
import { put } from '../../combat/status';
import type { Buff } from '../../hud/buff';
import { BLOW } from '../../sim/rules';
import { atTier, BARBATOS } from '../../sim/unique';
import { CLASS_STATS, type HeroDef, type Passive } from '../kit';
import { STAND } from './moves';

/*
 * Ezekiel's skills, as the game has them (what each costs, how long before it can be used again, how long what
 * it does lasts, and the shares of his health his Fury spends are the game's; how hard each hits is not said there).
 * Each is reinforced while he is in Fury, and costs him a share of the health he has then:
 * - Destructive Instinct: a swipe of his demon arm at the boss, then a blow to the ground that knocks it down.
 *   In Fury, both hit harder (the game's draws its targets in and reaches further: there is only the boss).
 * - Dawning Despair: he dashes at the boss and strikes it, its attacks slowed for a while. In Fury, it is also
 *   stunned, and his own attacks are quickened for a while.
 * - Strike of Doom: a charged blow that stuns the boss; in Fury, three times as hard. (The game's also goes through
 *   what lessens the damage its target takes: left out.)
 * His passive, Cursed Blood: each skill he uses gains him a stack of it (none while he is in Fury); at the third,
 * they are spent: his skills are ready again at once, a burst knocks the boss down, and he is in Fury for a while.
 * In Fury his ATK is higher, his attack twice as hard, and he fights by himself (on Auto, whatever his player says).
 * His unique weapon (../../sim/unique.ts) is worked here too: his Fury lasts longer, and while it does his critical
 * blows are harder and he stands being knocked down better.
 * What is drawn for each is ./fx.ts; what his body does for each, and for his attack, ./moves.ts.
 */
const CLAW = { blow: BLOW * 1.2, fury: 2 };
const INSTINCT = { swipe: 2000, strike: 2500, down: 3, fury: 1.5, cost: 0.15 };
// (Its 300 ATK Spd, the boss's lowered and his own raised in Fury, as the game has it: points.)
const DESPAIR = { blow: 3500, speed: 300, slowed: 5, stun: 3, lasts: 10, cost: 0.1 };
const DOOM = { blow: 4500, stun: 3, fury: 3, cost: 0.2 };
const CURSED = { most: 3, blow: 5000, down: 3, lasts: 10, atk: 0.3 };

const art = (index: number): string => skillPicture(EZEKIEL_ASSETS, index);

const CURSED_BLOOD: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Cursed Blood',
    about:
      'Passive. A stack of Cursed Blood for each skill he uses; at the 3rd, his skills are ready again, a burst knocks the boss down, and he is in Fury for 10 seconds: ATK higher, his attack twice as hard, every skill reinforced (each costs a share of his health), fighting by himself.',
    icon: '🩸',
    image: art(3),
  },
};
/** His stacks of Cursed Blood: shown beside his passive, with how many he has. */
const STACKED: Buff = { name: 'Cursed Blood', about: 'At 3, he is in Fury.', icon: '🩸' };
/** Fury: shown on his card, with how long it has left. */
const FURY: Buff = { name: 'Fury', about: 'ATK 30% higher, his attack twice as hard, every skill reinforced (each costs a share of his health); he fights by himself.', icon: '😈', image: art(3) };
/** What Dawning Despair in Fury gives him for a while. */
const QUICKENED: Buff = { name: 'Dawning Despair', about: 'His attacks quickened.', icon: '💨', image: art(1) };

export const EZEKIEL: HeroDef = {
  id: 'ezekiel',
  name: 'Ezekiel',
  class: 'assassin',
  assets: EZEKIEL_ASSETS,
  // An assassin whose blows are magical (his demon arm's): as his class stands, otherwise.
  stats: { ...CLASS_STATS.assassin, deals: 'magical' },
  abilities: [
    { name: 'Destructive Instinct', icon: '🌀', image: art(0), move: 'instinct', cooldown: 8, cost: 2 },
    { name: 'Dawning Despair', icon: '💨', image: art(1), move: 'despair', cooldown: 10, cost: 2 },
    { name: 'Strike of Doom', icon: '💥', image: art(2), move: 'doom', cooldown: 7, cost: 2 },
  ],
  passive: CURSED_BLOOD,
  attack: 'claw',
  stands: STAND,
  join(fight, self) {
    /** His Cursed Blood; how long his Fury lasts yet; and whether he was on Auto before it (he is put back so after). */
    let stacks = 0;
    let fury = 0;
    let wasAuto = false;
    /** Each skill was used in Fury (as it began: it lands reinforced). */
    const furious = { instinct: false, despair: false, doom: false };
    const tier = self.unique?.tier ?? null;

    /** He spends a share of the health he has (never all of it). */
    const bleed = (cost: number): void => {
      self.hp -= self.hp * cost;
    };
    /** His Cursed Blood is spent: his skills ready again, a burst that knocks the boss down, and Fury. */
    const rage = (): void => {
      stacks = 0;
      self.cooldowns = self.cooldowns.map(() => 0);
      fight.cue(self, 'fury');
      fight.hit(self, CURSED.blow);
      fight.stun(CURSED.down, { down: true, by: self });
      fury = CURSED.lasts + (tier === null ? 0 : atTier(BARBATOS.longer, tier));
      wasAuto = self.auto;
      put(self.statuses, {
        name: FURY.name,
        left: fury,
        deals: 1 + CURSED.atk,
        ...(tier === null ? {} : { critDamage: atTier(BARBATOS.critDamage, tier), resist: atTier(BARBATOS.resist, tier) }),
        shown: FURY,
      });
    };

    return {
      lands: {
        // His attack: a swipe of his demon arm (twice as hard in Fury).
        claw() {
          fight.hit(self, CLAW.blow * (fury > 0 ? CLAW.fury : 1));
        },
        // A swipe at the boss, then a blow to the ground that knocks it down (both harder in Fury).
        instinct(part) {
          const times = furious.instinct ? INSTINCT.fury : 1;
          if (part === 0) {
            fight.hit(self, INSTINCT.swipe * times);
            return;
          }
          fight.hit(self, INSTINCT.strike * times);
          fight.stun(INSTINCT.down, { down: true, by: self });
        },
        // A dash and a blow: the boss's attacks slowed (in Fury, it is also stunned, and his own attacks quickened).
        despair() {
          fight.hit(self, DESPAIR.blow);
          fight.slow(1 - share(DESPAIR.speed), DESPAIR.slowed);
          if (!furious.despair) return;
          fight.stun(DESPAIR.stun, { by: self });
          put(self.statuses, { name: QUICKENED.name, left: DESPAIR.lasts, pace: 1 + share(DESPAIR.speed), shown: QUICKENED });
        },
        // A charged blow that stuns the boss (three times as hard in Fury).
        doom() {
          fight.hit(self, DOOM.blow * (furious.doom ? DOOM.fury : 1));
          fight.stun(DOOM.stun, { by: self });
        },
      },
      // Each skill as it is used: in Fury, reinforced, for a share of his health; out of it, a stack of Cursed Blood (at the third, Fury).
      used(_index, ability) {
        const move = ability.move;
        if (move !== 'instinct' && move !== 'despair' && move !== 'doom') return;
        furious[move] = fury > 0;
        if (fury > 0) {
          bleed(move === 'instinct' ? INSTINCT.cost : move === 'despair' ? DESPAIR.cost : DOOM.cost);
          return;
        }
        stacks++;
        if (stacks >= CURSED.most) rage();
      },
      tick(dt) {
        if (fury <= 0) return;
        fury = Math.max(0, fury - dt);
        // In Fury he fights by himself (shut away a while, it goes on); once it is over, or he is down or off the field, he is put back as his player had him.
        const there = fight.field.includes(self) && self.hp > 0;
        if (fury > 0 && there) self.auto = true;
        else {
          fury = 0;
          self.auto = wasAuto;
          self.statuses = self.statuses.filter((status) => status.name !== FURY.name);
        }
      },
      lit: () => fury > 0,
      buffs: () => (fury > 0 || stacks === 0 ? [] : [{ ...STACKED, count: stacks }]),
    };
  },
};
