import { share } from '../combat/damage';
import { piercing, put, type Status } from '../combat/status';
import { said, t5Light } from '../perks';
import { BLOW, MAX_MANA } from '../rules';
import { num, pct, skillArt, type Buff } from '../shown';
import { atTier, GALICTA, GALICTA_UP } from '../unique';
import { CLASS_STATS, type HeroDef, type Passive } from './kit';

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
 * His own perks (../perks.ts) are King's Raid's. Transcend 5's Dark stacks once a battle: there is one here, so it is
 * once. Determined Strike's Light (more with one enemy) always holds: there is only the boss.
 */
const REND = { blow: BLOW * 1.2 };
/** Determined Strike: its blow, the blow more against a boss, and how long it stuns. */
const DETERMINED = { blow: 2400, boss: 1600, stun: 2 };
/** Indomitable Will: its blow, and the state's attack speed (points) and how much shorter it is held down, for `lasts` seconds. */
const WILL = { blow: 1500, lasts: 10, speed: 500, held: 0.5 };
/** Perish.: its blows (as many as its move has, but the last), the last's, and how long that knocks the boss down. */
const PERISH = { blow: 1000, last: 2500, down: 3 };
/** Power of Galicta: his crit chance more (points), the penetration past which his blows go through all of the boss's defense, his attack's blow more and how long its curse lasts. */
const GALICTA_POWER = { crit: 200, whole: 1000, blow: 1200, lasts: 6 };
/** His own perks' numbers: Determined Strike's Light and Dark, Indomitable Will's Light, Perish.'s Light, Power of Galicta's Light and Dark, and Transcend 5's Dark. */
const PERKS = { alone: 2, stun: 1, critDamage: 0.5, mana: 100, exposed: 0.5, boss: 1000, dark: { dmg: 1.12, taken: 0.95 } };

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
  words: `Rebel Klaus is not affected by Block stats, but his Crit Chance increases by ${GALICTA_POWER.crit}, and when his DEF Penetration reaches ${num(GALICTA_POWER.whole)} or above, all of his attacks ignore the target's DEF. Additionally, his normal attack deal additional P.DMG to all enemies and inflict [Curse of Galicta] upon them for ${GALICTA_POWER.lasts} sec. If the target is already inflicted with [Curse of Galicta], the target won't take additional DMG.`,
};
/** [Indomitable Will] on him; Galicta's DMG stacks on him. */
const WILLED: Buff = { name: 'Indomitable Will', about: `ATK Spd +${WILL.speed}, and held down ${pct(WILL.held)} as long.`, icon: '🔥', art: art(1) };
const GALICTA_STACKS: Buff = { name: 'Adversary of the Goddess, Galicta', about: 'DMG higher for each.', icon: '⚔️', art: { uw: 'rebel-klaus' } };
/** What his attack leaves on the boss. */
const CURSE = 'Curse of Galicta';

export const REBEL_KLAUS: HeroDef = {
  id: 'rebel-klaus',
  name: 'Rebel Klaus',
  class: 'warrior',
  skins: ['Rebel Klaus'],
  // A warrior (his blows physical): as his class stands.
  stats: { ...CLASS_STATS.warrior, deals: 'physical' },
  abilities: [
    {
      name: 'Determined Strike',
      about: `A blow that stuns the boss for ${DETERMINED.stun} seconds, and a blow more against a boss.`,
      words: `Deals P.DMG to frontal enemies within range and inflicts Stun for ${DETERMINED.stun} sec. If the target is a boss, deals additional P.DMG.`,
      icon: '⚔️',
      art: art(0),
      move: 'determined',
      cooldown: 7,
      cost: 3,
    },
    {
      name: 'Indomitable Will',
      about: `A blow, and [Indomitable Will] for ${WILL.lasts} seconds: ATK Spd +${WILL.speed}, and what knocks him down holds him ${pct(WILL.held)} as long.`,
      words: `Deals P.DMG to nearby enemies, entering into the irremoveable state [Indomitable Will] for ${WILL.lasts} sec. While in [Indomitable Will] state, ATK Spd is increased by ${WILL.speed} and the duration of CC inflicted upon self is reduced by ${pct(1 - WILL.held)}.`,
      icon: '🔥',
      art: art(1),
      move: 'indomitable',
      cooldown: 18,
      cost: 2,
    },
    {
      name: 'Perish.',
      about: `Blows on the boss one after another, and a last that knocks it down for ${PERISH.down} seconds.`,
      words: `Attacks a random enemy 6 times, dealing P.DMG each hit. Afterward, delivers an additional attack that deals P.DMG to nearby enemies and knocks them down for ${PERISH.down} sec.`,
      icon: '💀',
      art: art(2),
      move: 'perish',
      cooldown: 20,
      cost: 4,
    },
  ],
  passive: POWER_OF_GALICTA,
  attack: 'rend',
  perks: {
    's1-light': said({ skill: { index: 0, dmg: PERKS.alone } }, ({ skill }) => `Increases DMG by ${pct(skill.dmg - 1)} when there is one enemy.`),
    's1-dark': { words: `Increases the duration of Stun by ${PERKS.stun} sec.` },
    's2-light': { words: `Increases Crit DMG by ${pct(PERKS.critDamage)} while in [Indomitable Will] state.` },
    's2-dark': { words: 'Upon using the skill, dispels all negative effects from self.' },
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
      willed = WILL.lasts;
      put(self.statuses, { name: WILLED.name, left: WILL.lasts, ...(self.perks.has('s2-light') && { critDamage: PERKS.critDamage }), shown: WILLED });
    };
    /** His attack: a blow; unless the boss bears the curse, a blow more and the curse on it (its Light: its P.DEF lower meanwhile). Its Dark: a blow more against a Non-Hero. */
    const rend = (): void => {
      strike(REND.blow);
      if (!fight.foe.statuses.some((status) => status.name === CURSE)) {
        strike(GALICTA_POWER.blow, false);
        put(fight.foe.statuses, { name: CURSE, left: GALICTA_POWER.lasts, ...(self.perks.has('s4-light') && { defends: { physical: 1 - PERKS.exposed } }), shown: 'curse' });
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
          strike(DETERMINED.boss, false);
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
        // A blow of the barrage (its Light: mana each); the last knocks the boss down.
        perish(part) {
          const last = part === (self.motion.moves.perish.parts[0]?.lands.length ?? 1) - 1;
          strike(last ? PERISH.last : PERISH.blow);
          if (last) fight.stun(PERISH.down, { down: true, by: self });
          else if (self.perks.has('s3-light')) self.mana = Math.min(MAX_MANA, self.mana + PERKS.mana);
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
