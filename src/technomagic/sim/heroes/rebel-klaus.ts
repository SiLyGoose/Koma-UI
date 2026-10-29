import { CURVE, curved, share } from '../combat/damage';
import { piercing, put, type Status } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { MAX_MANA } from '../rules';
import { num, pct, skillArt, type Buff } from '../shown';
import { atTier, GALICTA, GALICTA_UP } from '../unique';
import { bookDmg, CLASS_STATS, dmg, type HeroDef, type Passive } from './kit';

/*
 * Rebel Klaus's skills, as the game has them (the game's Rebel Clause: what each costs, how long before it can be used
 * again, how long what it does lasts and Indomitable Will's numbers are the game's; how hard each hits is not said there).
 * He is a warrior, the Shieldless Knight, Galicta in his hands.
 * - Determined Strike: a blow that stuns the boss, and a blow more against a boss.
 * - Indomitable Will: a blow, and [Indomitable Will] on him for a while: his attack quicker, and what knocks him down
 *   holds him half as long.
 * - Perish.: blows on the boss one after another, and a last that knocks it down.
 * His passive, Power of Galicta: his crit chance higher; with 1000 penetration or more, all his blows go through the
 * boss's defense; and a blow of his attack deals a blow more and leaves [Curse of Galicta] on the boss for a while (not
 * the blow more while it is on). (The game's has him not affected by Block: Galgoria blocks nothing.)
 * His unique weapon (../unique.ts) is worked here too: his penetration higher, and each skill he uses costs him a share
 * of his HP but stacks his DMG higher for a while.
 * What is drawn for each is ../../heroes/rebel-klaus/fx.ts; what his body does for each, and for his attack, ../../heroes/rebel-klaus/moves.ts.
 *
 * His own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy; it calls him
 * Rebel Clause, his words here Rebel Klaus). Transcend 5's Dark stacks once a battle: there is one here, so it is once.
 * Determined Strike's Light (more with one enemy) always holds: there is only the boss.
 */
// (How hard each of his skills hits: the King's Raid Index hasn't him, so ×3.34 what it was, as the other warriors' went to theirs from it.)
/** Determined Strike: its blow, the blow more against a boss, and how long it stuns. */
const DETERMINED = { blow: 8020, boss: 5340, stun: 2 };
/** Indomitable Will: its blow, and the state's attack speed (points) and how much shorter it is held down, for `lasts` seconds. */
const WILL = { blow: 5010, lasts: 10, speed: 500, held: 0.5 };
/** Perish.: its blows (as many as its move has, but the last), the last's, and how long that knocks the boss down. */
const PERISH = { blow: 3340, last: 8350, down: 3 };
/** Power of Galicta: his crit chance more (points), the penetration past which his blows go through all of the boss's defense, his attack's blow more and how long its curse lasts. */
const GALICTA_POWER = { crit: 200, whole: 1000, blow: 4010, lasts: 6 };
/** His own perks' numbers: Determined Strike's Light and Dark, Indomitable Will's Light, Perish.'s Light, Power of Galicta's Light and Dark, and Transcend 5's Dark. */
const PERKS = { alone: 2, stun: 1, critDamage: 0.5, mana: 100, exposed: 0.5, boss: 1000, dark: { dmg: 1.12, taken: 0.95 } };

/**
 * His unique treasures' numbers (1★ to 5★: ../treasures.ts): Determined Strike's cheaper and more of its blow against a
 * boss; Indomitable Will's longer and his ATK meanwhile; Perish.'s shorter cooldown and its stun for each blow; and Power of
 * Galicta's CC resist (points), and the penetration it takes off the boss while [Curse of Galicta] is on it.
 */
const UT = {
  cloak: { cost: -1, boss: [0.4, 0.48, 0.58, 0.7, 0.84, 1] },
  hatred: { longer: 5, atk: [0.12, 0.14, 0.17, 0.21, 0.25, 0.3] },
  mittens: { cooldown: [2, 2.4, 2.9, 3.5, 4.2, 5], stun: 1 },
  protection: { resist: [300, 360, 430, 520, 630, 750], pen: 200 },
};

const art = skillArt('rebel-klaus');

const POWER_OF_GALICTA: Passive = {
  attack: 1,
  crit: share(GALICTA_POWER.crit),
  control: 1,
  shown: {
    name: 'Power of Galicta',
    about: `Passive. +${GALICTA_POWER.crit} crit chance; with ${num(GALICTA_POWER.whole)} penetration or more, his blows go through all of the boss’s defense. A blow of his attack deals a blow more and leaves [Curse of Galicta] on the boss for ${GALICTA_POWER.lasts} seconds (not the blow more while it is on).`,
    icon: '🗡️',
    art: art(3),
  },
  words: `Rebel Klaus is not affected by Block stats, but his Crit Chance increases by ${GALICTA_POWER.crit}, and when his DEF Penetration reaches ${num(GALICTA_POWER.whole)} or above, all of his attacks ignore the target's DEF. Additionally, his normal attack deal additional ${dmg('warrior', GALICTA_POWER.blow, bookDmg('rebel-klaus', 3))} P.DMG to all enemies and inflict [Curse of Galicta] upon them for ${GALICTA_POWER.lasts} sec. If the target is already inflicted with [Curse of Galicta], the target won't take additional DMG.`,
};
/** [Indomitable Will] on him; Galicta's DMG stacks on him. */
const WILLED: Buff = { name: 'Indomitable Will', about: `ATK Spd +${WILL.speed}, and held down ${pct(WILL.held)} as long.`, icon: '🔥', art: art(1) };
/** Everlasting Protection: while [Curse of Galicta] is on the boss, every ally's defense about as much more as the boss's penetration less makes it. */
const PROTECTED: Buff = { name: 'Everlasting Protection', about: `The boss’s DEF Penetration ${UT.protection.pen} lower: every ally’s DEF counts for more against it.`, icon: '🛡️', art: art(3) };
const GALICTA_STACKS: Buff = { name: 'Adversary of the Goddess, Galicta', about: 'DMG higher for each.', icon: '⚔️', art: { uw: 'rebel-klaus' } };
/** What his attack leaves on the boss. */
const CURSE = 'Curse of Galicta';

export const REBEL_KLAUS: HeroDef = {
  id: 'rebel-klaus',
  name: 'Rebel Klaus',
  class: 'warrior',
  skins: ['Rebel Klaus', 'Rebel_Klaus_Advance', 'Rebel_Klaus_Ash'],
  // A warrior (his blows physical): as his class stands.
  stats: { ...CLASS_STATS.warrior, deals: 'physical' },
  abilities: [
    {
      name: 'Determined Strike',
      about: `A blow that stuns the boss for ${DETERMINED.stun} seconds, and a blow more against a boss.`,
      words: `Deals ${dmg('warrior', DETERMINED.blow, bookDmg('rebel-klaus', 0))} P.DMG to frontal enemies within range and inflicts Stun for ${DETERMINED.stun} sec. If the target is a boss, deals additional ${dmg('warrior', DETERMINED.boss, bookDmg('rebel-klaus', 0))} P.DMG.`,
      icon: '⚔️',
      art: art(0),
      move: 'determined',
      cooldown: 7,
      cost: 3,
    },
    {
      name: 'Indomitable Will',
      about: `A blow, and [Indomitable Will] for ${WILL.lasts} seconds: ATK Spd +${WILL.speed}, and what knocks him down holds him ${pct(WILL.held)} as long.`,
      words: `Deals ${dmg('warrior', WILL.blow, bookDmg('rebel-klaus', 1))} P.DMG to nearby enemies, entering into the irremoveable state [Indomitable Will] for ${WILL.lasts} sec. While in [Indomitable Will] state, ATK Spd is increased by ${WILL.speed} and the duration of CC inflicted upon self is reduced by ${pct(1 - WILL.held)}.`,
      icon: '🔥',
      art: art(1),
      move: 'indomitable',
      cooldown: 18,
      cost: 2,
    },
    {
      name: 'Perish.',
      about: `Blows on the boss one after another, and a last that knocks it down for ${PERISH.down} seconds.`,
      words: `Attacks a random enemy 6 times, dealing ${dmg('warrior', PERISH.blow, bookDmg('rebel-klaus', 2))} P.DMG each hit. Afterward, delivers an additional attack that deals ${dmg('warrior', PERISH.last, bookDmg('rebel-klaus', 2))} P.DMG to nearby enemies and knocks them down for ${PERISH.down} sec.`,
      icon: '💀',
      art: art(2),
      move: 'perish',
      cooldown: 20,
      cost: 4,
    },
  ],
  passive: POWER_OF_GALICTA,
  treasures: [
    treasure('Cloak of Despair', (k) => ({
      words: `[Determined Strike] Reduces Mana Cost by ${-UT.cloak.cost} and increases additional P.DMG by ${pct(k(UT.cloak.boss))} if the target is a boss.`,
      skill: { index: 0, cost: UT.cloak.cost },
    })),
    treasure('Irreversible Hatred', (k) => ({
      words: `[Indomitable Will] Increases the duration of [Indomitable Will] by ${UT.hatred.longer} sec, and increases ATK by ${pct(k(UT.hatred.atk))} for the duration of Skill.`,
    })),
    treasure('Old Mittens', (k) => ({
      words: `[Perish.] Reduces Cooldown by ${k(UT.mittens.cooldown)} sec, and each hit inflicts Stun on the target for ${UT.mittens.stun} sec.`,
      skill: { index: 2, cooldown: -k(UT.mittens.cooldown) },
    })),
    treasure('Everlasting Protection', (k) => ({
      words: `[Power of Galicta] Increases CC Resist by ${k(UT.protection.resist)}, and reduces the target’s DEF Penetration by ${UT.protection.pen} for the duration of [Curse of Galicta].`,
      bonus: { resist: k(UT.protection.resist) },
    })),
  ],
  attack: 'rend',
  perks: {
    's1-light': said({ skill: { index: 0, dmg: PERKS.alone } }, ({ skill }) => `Increases DMG by ${pct(skill.dmg - 1)} when there is 1 enemy.`),
    's1-dark': { words: `Increases the duration of Stun by ${PERKS.stun} sec.` },
    's2-light': { words: `Increases Crit DMG by ${pct(PERKS.critDamage)} while in [Indomitable Will] state.` },
    's2-dark': { words: 'Upon using the Skill, dispels all negative effects from self.' },
    's3-light': { words: `Recovers own Mana by ${PERKS.mana} each hit.` },
    's3-dark': { words: 'Gains immunity to CC while in use.' },
    's4-light': { words: `Additionally reduces the target's P.DEF by ${pct(PERKS.exposed)} for the duration of [Curse of Galicta].` },
    's4-dark': { words: `Deals additional P.DMG equal to ${pct(PERKS.boss / 1000)} of ATK to Non-Hero enemies.` },
    't5-light': t5Light({ crit: 100 }, ({ crit }) => `Crit Chance +${crit}`),
    't5-dark': said(
      { dmg: PERKS.dark.dmg, taken: PERKS.dark.taken },
      ({ dmg, taken }) => `At the beginning of each battle, Rebel Klaus deals ${pct(dmg - 1)} increased DMG to Non-Hero enemies and takes ${pct(1 - taken)} reduced DMG. This effect can be stacked up to max 5 times and is irremovable.`,
    ),
  },
  join(fight, self) {
    /** How long [Indomitable Will] lasts yet; Galicta's DMG stacks, and how long they last yet. */
    let willed = 0;
    let stacks = 0;
    let stacksLeft = 0;
    const tier = self.unique?.tier ?? null;
    /** What his unique weapon adds to his penetration. */
    const uwPen = tier !== null ? atTier(GALICTA.pen, tier) : 0;

    /** A blow of his: through his unique weapon's penetration, and (with 1000 or more) through all of the boss's defense. */
    const strike = (amount: number, counted = true): boolean => {
      const whole = self.stats.pen + uwPen + piercing(self.statuses) >= GALICTA_POWER.whole;
      return fight.hit(self, amount, counted, uwPen, whole);
    };
    /** [Indomitable Will] on him (its Light: his crit damage higher meanwhile). */
    const will = (): void => {
      // (Irreversible Hatred: for longer, and his ATK higher meanwhile.)
      const hatred = wearsTreasure(self, 1);
      willed = WILL.lasts + (hatred ? UT.hatred.longer : 0);
      put(self.statuses, { name: WILLED.name, left: willed, ...(self.perks.has('s2-light') && { critDamage: PERKS.critDamage }), ...(hatred && { atk: fromTreasure(self, 1, UT.hatred.atk) }), shown: WILLED });
    };
    /**
     * Everlasting Protection: the boss's penetration lower while the curse is on it. (The fight reads a boss's penetration
     * as it stands, so here every ally's defense is as much more as that would make it count: for as long as the curse.
     * Only near it: the fight adds this share to the others that make a hero's defense more, not on top of them, so with
     * any other it is a little less than King's Raid's; and it is on every hero, so a minion's blows meanwhile count it too.
     * A minion cursed gives none, so the boss's blows never count a minion's curse.)
     */
    const protect = (): void => {
      if (fight.foe !== fight.boss) return;
      const pen = fight.boss.def.stats.pen ?? 0;
      const through = (points: number): number => 1 - share(curved(CURVE.pen, points));
      put(fight.party, { name: PROTECTED.name, left: GALICTA_POWER.lasts, defends: through(Math.max(0, pen - UT.protection.pen)) / through(pen), shown: PROTECTED });
    };
    /** His attack: a blow; unless the boss bears the curse, a blow more and the curse on it (its Light: its P.DEF lower meanwhile). Its Dark: a blow more against a Non-Hero. */
    const rend = (): void => {
      strike(fight.basic);
      if (!fight.foe.statuses.some((status) => status.name === CURSE)) {
        strike(GALICTA_POWER.blow, false);
        put(fight.foe.statuses, { name: CURSE, left: GALICTA_POWER.lasts, ...(self.perks.has('s4-light') && { defends: { physical: 1 - PERKS.exposed } }), shown: 'curse' });
        if (wearsTreasure(self, 3)) protect();
      }
      if (self.perks.has('s4-dark')) strike(PERKS.boss, false);
    };

    return {
      lands: {
        rend,
        attack: rend,
        // A blow that stuns the boss (its Dark: the longer), and a blow more against a boss.
        determined() {
          strike(DETERMINED.blow);
          // (Cloak of Despair: more of it.)
          strike(DETERMINED.boss * (1 + fromTreasure(self, 0, UT.cloak.boss)), false);
          fight.stun(DETERMINED.stun + (self.perks.has('s1-dark') ? PERKS.stun : 0), { by: self });
        },
        // A blow, and [Indomitable Will] on him (its Dark: what the boss has left on him cleared first).
        indomitable() {
          if (self.perks.has('s2-dark')) {
            const harmful = (status: Status<Buff>): boolean => status.shown.harmful === true && !status.binds && !status.away;
            self.statuses = self.statuses.filter((status) => !harmful(status));
          }
          strike(WILL.blow);
          will();
        },
        // A blow of the barrage (its Light: mana each, the last's too); the last knocks the boss down.
        perish(part) {
          const last = part === (self.motion.moves.perish.parts[0]?.lands.length ?? 1) - 1;
          strike(last ? PERISH.last : PERISH.blow);
          // (Old Mittens: each blow stuns the boss.)
          if (wearsTreasure(self, 2)) fight.stun(UT.mittens.stun, { by: self });
          if (last) fight.stun(PERISH.down, { down: true, by: self });
          if (self.perks.has('s3-light')) self.mana = Math.min(MAX_MANA, self.mana + PERKS.mana);
        },
      },
      // His unique weapon: each skill he uses costs him a share of his HP, and stacks his DMG higher for a while.
      used() {
        if (tier === null) return;
        self.hp -= self.hp * GALICTA.hp;
        stacks = Math.min(GALICTA.most, stacks + 1);
        stacksLeft = GALICTA.lasts;
        put(self.statuses, { name: GALICTA_STACKS.name, left: GALICTA.lasts, count: stacks, deals: 1 + atTier(GALICTA.dmg, tier) * stacks, shown: GALICTA_STACKS });
      },
      tick(dt) {
        if (willed > 0) willed -= dt;
        if (stacksLeft > 0) {
          stacksLeft -= dt;
          if (stacksLeft <= 0) stacks = 0;
        }
      },
      // [Indomitable Will]: his attack quicker, and held down the shorter.
      speed: () => (willed > 0 ? WILL.speed : 0),
      held: () => (willed > 0 ? WILL.held : 1),
      // Perish.'s Dark: not to be knocked down while he strikes.
      guards: () => self.perks.has('s3-dark') && self.doing?.move === 'perish',
      lit: () => willed > 0,
      buffs: () => (tier !== null ? [GALICTA_UP] : []),
    };
  },
};
