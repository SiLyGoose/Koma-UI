import { share } from '../combat/damage';
import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { BLOW } from '../rules';
import { fold, nth, pct, skillArt, times, type Buff } from '../shown';
import { atTier, BARBATOS } from '../unique';
import { bookDmg, CLASS_STATS, dmg, type HeroDef, indexed, type Passive } from './kit';

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
 * His unique weapon (../unique.ts) is worked here too: his Fury lasts longer, and while it does his critical
 * blows are harder and he stands being knocked down better.
 * What is drawn for each is ../../heroes/ezekiel/fx.ts; what his body does for each, and for his attack, ../../heroes/ezekiel/moves.ts.
 *
 * His own perks (../perks.ts) are King's Raid's. Strike of Doom's Light has him not to be knocked down while he
 * strikes (what the boss does to a hero to hold it). What gives him ATK gives him so much more DMG, as Fury does.
 */
// (How hard each of his skills hits is the King's Raid Index's, at his class's ATK: ./kit.ts's indexed.)
const CLAW = { blow: BLOW * 1.2, fury: 2 };
const INSTINCT = { swipe: indexed('assassin', 130_014), strike: indexed('assassin', 168_860), down: 3, fury: 1.5, cost: 0.15 };
// (Its 300 ATK Spd, the boss's lowered and his own raised in Fury, as the game has it: points.)
const DESPAIR = { blow: indexed('assassin', 270_214), speed: 300, slowed: 5, stun: 3, lasts: 10, cost: 0.1 };
const DOOM = { blow: indexed('assassin', 294_746), stun: 3, fury: 3, cost: 0.2 };
const CURSED = { most: 3, blow: indexed('assassin', 220_255), down: 3, lasts: 10, atk: 0.3 };
/** His own perks' numbers: Destructive Instinct's Dark's ATK after it (how long), Fury's more Heal Rate, and less taken for each stack of Cursed Blood. */
const PERKS = { atk: 1.4, atkFor: 5, heals: 1.5, taken: 0.12 };

/**
 * His unique treasures' numbers (1★ to 5★: ../treasures.ts): Destructive Instinct's heal and more M.DMG taken; Dawning
 * Despair's attack speed (points); Strike of Doom's DMG and its Cursed Blood more; the Cursed Blood he begins with, and his
 * more DMG to the boss in Fury.
 */
const UT = {
  belt: { heal: 0.15, takes: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 },
  choker: { speed: [100, 120, 140, 170, 210, 250], lasts: 10 },
  binds: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], stacks: 1 },
  sculpture: { stacks: 2, dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
};

const art = skillArt('ezekiel');

const CURSED_BLOOD: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Cursed Blood',
    about: `Passive. A stack of [Cursed Blood] for each skill he uses; at the ${nth(CURSED.most)}, his skills are ready again, a burst knocks the boss down, and he is in [Fury] for ${CURSED.lasts} seconds: ATK higher, his attack ${times(CLAW.fury)} as hard, every skill reinforced (each costs a share of his health), fighting by himself.`,
    icon: '🩸',
    art: art(3),
  },
  words: `Ezekiel gains 1 stack of 'Cursed Blood' at the end of skill. Upon the ${nth(CURSED.most)} stack, consumes Cursed Blood to reset all skill cooldown, dealing ${dmg('assassin', CURSED.blow, bookDmg('ezekiel', 3))} M.DMG to nearby enemies and knocking them down for ${CURSED.down} sec, while activating Fury for ${CURSED.lasts} sec, that cannot be dispelled. While in Fury state, goes into an auto-battle mode that cannot be controlled, and ATK is increased by ${pct(CURSED.atk)}, auto attack DMG is ${fold(CLAW.fury)}, and all Skill effect are reinforced. Cannot gain Cursed Blood during Fury state, except for when killing an enemy.`,
};
/** His stacks of Cursed Blood: shown beside his passive, with how many he has. */
const STACKED: Buff = { name: 'Cursed Blood', about: `At ${CURSED.most}, he is in [Fury].`, icon: '🩸', art: art(0) };
/** Fury: shown on his card, with how long it has left. */
const FURY: Buff = { name: 'Fury', about: `ATK ${pct(CURSED.atk)} higher, his attack ${times(CLAW.fury)} as hard, every skill reinforced (each costs a share of his health); he fights by himself.`, icon: '😈', art: art(3) };
/** What Dawning Despair in Fury gives him for a while. */
const QUICKENED: Buff = { name: 'Dawning Despair', about: 'His attacks quickened.', icon: '💨', art: art(1) };
/** What Destructive Instinct's Dark gives him after it. */
const INSTINCT_UP: Buff = { name: 'Destructive Instinct', about: `ATK ${pct(PERKS.atk - 1)} higher.`, icon: '🌀', art: art(0) };

export const EZEKIEL: HeroDef = {
  id: 'ezekiel',
  name: 'Ezekiel',
  class: 'assassin',
  skins: ['Ezekiel'],
  // An assassin whose blows are magical (his demon arm's): as his class stands, otherwise.
  stats: { ...CLASS_STATS.assassin, deals: 'magical' },
  abilities: [
    {
      name: 'Destructive Instinct',
      about: `A swipe of his demon arm, then a blow to the ground that knocks the boss down for ${INSTINCT.down} seconds. In [Fury]: both ${pct(INSTINCT.fury - 1)} harder, for ${pct(INSTINCT.cost)} of the health he has.`,
      words: `Swipes nearby enemies in a circular range and deals ${dmg('assassin', INSTINCT.swipe, bookDmg('ezekiel', 0))} M.DMG. Then strikes the ground, dealing ${dmg('assassin', INSTINCT.strike, bookDmg('ezekiel', 0))} M.DMG and knocking down enemies for ${INSTINCT.down} sec. [Fury] - Consumes ${pct(INSTINCT.cost)} of current HP to activate. Effect range increases and swipe attack draws in enemies.`,
      icon: '🌀',
      art: art(0),
      move: 'instinct',
      cooldown: 8,
      cost: 2,
    },
    {
      name: 'Dawning Despair',
      about: `A dash and a blow: the boss’s attacks ${pct(share(DESPAIR.speed))} slower for ${DESPAIR.slowed} seconds. In [Fury]: it is also stunned for ${DESPAIR.stun} seconds, and his attacks are ${pct(share(DESPAIR.speed))} quicker for ${DESPAIR.lasts}, for ${pct(DESPAIR.cost)} of the health he has.`,
      words: `Dashes to an enemy with the highest ATK and deals ${dmg('assassin', DESPAIR.blow, bookDmg('ezekiel', 1))} M.DMG to enemies in range, reducing their ATK Spd by ${DESPAIR.speed}. [Fury] - Consumes ${pct(DESPAIR.cost)} of current HP to activate. Effect range increases, Stuns target for ${DESPAIR.stun} sec, and increases own ATK Spd by ${DESPAIR.speed} for ${DESPAIR.lasts} sec.`,
      icon: '💨',
      art: art(1),
      move: 'despair',
      cooldown: 10,
      cost: 2,
    },
    {
      name: 'Strike of Doom',
      about: `A charged blow that stuns the boss for ${DOOM.stun} seconds. In [Fury]: ${times(DOOM.fury)} as hard, for ${pct(DOOM.cost)} of the health he has.`,
      words: `Charges energy and attacks target enemy, dealing ${dmg('assassin', DOOM.blow, bookDmg('ezekiel', 2))} M.DMG and inflicting Stun for ${DOOM.stun} sec. Ignores target's DMG Reduction effects. [Fury] - Consumes ${pct(DOOM.cost)} of current HP to activate. Attacks enemies in range of target and DMG is ${fold(DOOM.fury)}.`,
      icon: '💥',
      art: art(2),
      move: 'doom',
      cooldown: 7,
      cost: 2,
    },
  ],
  passive: CURSED_BLOOD,
  treasures: [
    treasure('Wild Beast’s Leather Belt', (k) => ({
      words: `[Destructive Instinct] Upon use, heals own HP by ${pct(UT.belt.heal)}, and for ${UT.belt.lasts} sec, increases M.DMG target receives by ${pct(k(UT.belt.takes))}.`,
      skill: { index: 0, heal: UT.belt.heal, mark: { name: 'Wild Beast’s Leather Belt', takes: { magical: 1 + k(UT.belt.takes) }, lasts: UT.belt.lasts } },
    })),
    treasure('Wild Beast’s Choker', (k) => ({
      words: `[Dawning Despair] Gains Immunity to CC for the skill's duration and increases ATK Spd by ${k(UT.choker.speed)} for ${UT.choker.lasts} sec.`,
      skill: { index: 1, steady: true, self: { name: 'Wild Beast’s Choker', lasts: UT.choker.lasts, pace: 1 + share(k(UT.choker.speed)) } },
    })),
    treasure('Sealing Binds', (k) => ({
      words: `[Strike of Doom] DMG is increased by ${pct(k(UT.binds.dmg))} and gains ${UT.binds.stacks} additional stack of Cursed Blood after using the skill.`,
      skill: { index: 2, dmg: 1 + k(UT.binds.dmg) },
    })),
    treasure('Sculpture of Blood', (k) => ({
      words: `[Cursed Blood] At the beginning of first battle, Ezekiel gains ${UT.sculpture.stacks} stacks of Cursed Blood. While under Fury, DMG dealt to bosses increases by ${pct(k(UT.sculpture.dmg))}.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, dmg: 1.4 } }, ({ skill }) => `DMG is increased by ${pct(skill.dmg - 1)}.`),
    's1-dark': { words: `After activation, ATK is increased by ${pct(PERKS.atk - 1)} for ${PERKS.atkFor} sec.` },
    's2-light': said({ skill: { index: 1, cost: -1 } }, ({ skill }) => `Mana cost is reduced by ${-skill.cost}.`),
    's2-dark': { words: 'When activated during Fury state, ignores target DEF.' },
    's3-light': { words: 'Becomes immune to CC during activation.' },
    's3-dark': said({ skill: { index: 2, dmg: 2 } }, ({ skill }) => `If there is 1 enemy, DMG is increased by ${pct(skill.dmg - 1)}.`),
    's4-light': { words: `When in Fury state, heal rate is increased by ${pct(PERKS.heals - 1)}.` },
    's4-dark': { words: `Per every stacked 'Cursed Blood', takes ${pct(PERKS.taken)} reduced DMG.` },
    't5-light': t5Light({ speed: 100 }, ({ speed }) => `ATK Spd +${speed}`),
    't5-dark': { words: 'When in Fury state, auto attack deals DMG that ignores DEF.' },
  },
  attack: 'claw',
  // His animations: four blows, fist and foot.
  timing: { attack: [{ lands: [0.92, 1.52, 2.78, 3.62], until: 4.3 }] },
  join(fight, self) {
    /** His Cursed Blood; how long his Fury lasts yet; and whether he was on Auto before it (he is put back so after). */
    // (Sculpture of Blood: some to begin with.)
    let stacks = wearsTreasure(self, 3) ? UT.sculpture.stacks : 0;
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
        ...(self.perks.has('s4-light') && { heals: PERKS.heals }),
        ...(tier === null ? {} : { critDamage: atTier(BARBATOS.critDamage, tier), resist: atTier(BARBATOS.resist, tier) }),
        shown: FURY,
      });
    };

    /** A blow of his attack (twice as hard in Fury; and with Transcend 5's Dark, through the boss's defense). */
    const claw = (): void => {
      fight.hit(self, fight.basic * (fury > 0 ? CLAW.fury : 1), true, 0, fury > 0 && self.perks.has('t5-dark'));
    };

    return {
      lands: {
        // His attack: a swipe of his demon arm, as written in code; or each blow of his fist fight, as his animation for it has it.
        claw,
        attack: claw,
        // A swipe at the boss, then a blow to the ground that knocks it down (both harder in Fury).
        instinct(part) {
          const times = furious.instinct ? INSTINCT.fury : 1;
          if (part === 0) {
            fight.hit(self, INSTINCT.swipe * times);
            return;
          }
          fight.hit(self, INSTINCT.strike * times);
          fight.stun(INSTINCT.down, { down: true, by: self });
          if (self.perks.has('s1-dark')) put(self.statuses, { name: INSTINCT_UP.name, left: PERKS.atkFor, deals: PERKS.atk, shown: INSTINCT_UP });
        },
        // A dash and a blow: the boss's attacks slowed (in Fury, it is also stunned, and his own attacks quickened).
        despair() {
          fight.hit(self, DESPAIR.blow, true, 0, furious.despair && self.perks.has('s2-dark'));
          fight.slow(DESPAIR.speed, DESPAIR.slowed);
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
        // (Sealing Binds: one more for Strike of Doom.)
        stacks += 1 + (move === 'doom' && wearsTreasure(self, 2) ? UT.binds.stacks : 0);
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
      takes: () => (self.perks.has('s4-dark') ? 1 - PERKS.taken * stacks : 1),
      deals: () => (fury > 0 ? 1 + fromTreasure(self, 3, UT.sculpture.dmg) : 1),
      guards: () => self.doing?.move === 'doom' && self.perks.has('s3-light'),
      lit: () => fury > 0,
      buffs: () => (fury > 0 || stacks === 0 ? [] : [{ ...STACKED, count: stacks }]),
    };
  },
};
