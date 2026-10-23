import { away, put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { num, pct, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { atTier, IGNISIUS } from '../unique';
import { bookDmg, bookHeal, CLASS_STATS, dmg, healed, type HeroDef, type Passive, played, playedHeal } from './kit';

/*
 * Aselica's skills, as King's Raid's playtest has them (stats/aselica.md: how hard each hits and heals at its level 90, and
 * every number here, are its; its words are its own). She is a knight whose blows are magical, the Guardian of the Sun.
 * - Sword of the Sun: a blow that stuns the boss; then she is quicker for a while.
 * - Blessing of the Sun: the ally with the highest ATK's cooldowns shorter, and for a while its ATK higher (by a share of
 *   her P.DEF besides: its books' half again) and its DMG to Non-Hero enemies.
 * - Judgment of the Sun: eight blows, each lowering the boss's M.DEF for a while, and eight heals for the allies about her
 *   (their P.DEF higher); then a blow that knocks the boss down, and a great heal.
 * Her passive, Curse of the Sun: each of her blows a stack of the curse on the boss; at 10, a blow that leaves it hitting
 * less hard. And each skill she uses gives every other ally the Blessing of the Angel: less physical damage taken, and a
 * share of her max HP healed every second.
 * Her unique weapon (../unique.ts) is worked here too: every 5 blows of her attack, the boss takes more magic damage for
 * a while and is stunned a moment.
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/aselica.ts).
 *
 * Her own perks (../perks.ts) are King's Raid's. Curse of the Sun's Light (the Blessing irremovable) does nothing here:
 * nothing removes it. Blind on the boss does nothing (its blows aren't aimed). The boss's M.DEF lowered by so much is
 * that share of its own.
 */
/** Sword of the Sun: its blow, how long it stuns the boss; then her attack speed, for how long. */
const SWORD = { blow: played('knight', 2410, 81_757), stun: 5, speed: 350, lasts: 5 };
/** Blessing of the Sun: the share off its ally's cooldowns, for how long; its ATK (flat, and a share of her P.DEF: its books' half again) and more to Non-Hero enemies. */
const BLESSING = { sooner: 0.2, lasts: 15, atk: 35_188, defense: 0.08, books: 1.5, boss: 0.2 };
/** Judgment of the Sun: each of its eight blows and the boss's M.DEF less (flat), for how long; each heal (and a share of her P.DEF) and the P.DEF it gives (flat), for how long; its last blow, its knock down and its heal (and a share of her max HP); its books' half again on the shares and the P.DEF (on its heals of her ATK, the fight's: ../fight.ts). */
const JUDGMENT = {
  blow: played('knight', 448, 16_517),
  defense: 26_178,
  lasts: 10,
  heal: playedHeal('knight', 403, 14_805),
  healDefense: 0.015,
  guard: 47_421,
  last: played('knight', 1961, 72_964),
  down: 3,
  lastHeal: playedHeal('knight', 2521, 93_773),
  lastHp: 0.02,
  books: 1.5,
};
/** Curse of the Sun: how long each stack lasts, how many it takes, its blow, and the boss's ATK less, for how long; the Blessing of the Angel's less physical damage taken and heal every second (a share of her max HP), for how long. */
const CURSE = { lasts: 10, needs: 10, blow: played('knight', 1828, 67_812), weaker: 0.3, weakLasts: 10, taken: 0.15, heal: 0.01, blessed: 5 };
/** Her own perks' numbers: Sword of the Sun's Light's more magic damage taken; Blessing's Light's allies; Curse's Dark's stacks; Transcend 5's Dark's share of her P.DEF. */
const PERKS = { takes: 1.25, lasts: 10, allies: 2, needs: 7, dark: 0.2 };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Sword of the Sun's mana for each blow;
 * Blessing's less physical damage taken for its ally; Judgment's more P.DEF and M.DEF less; Curse's longer Blind and the
 * boss's more magic damage taken.
 */
const UT = {
  dawn: { mana: [200, 240, 290, 350, 420, 500] },
  bracelet: { taken: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 },
  trumpet: { more: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
  will: { takes: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 },
};

const art = skillArt('aselica');

const CURSE_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Curse of the Sun', about: `Passive. Each of her blows a stack of the curse on the boss; at ${CURSE.needs}, a blow that leaves it hitting ${pct(CURSE.weaker)} less hard for ${CURSE.weakLasts} seconds. Each skill she uses gives every other ally the Blessing of the Angel.`, icon: '☀️', art: art(3) },
  words: `Upon attacking, inflicts [Curse of the Sun] on the target for ${CURSE.lasts}sec. Enemies with ${CURSE.needs} stacks consume the stacks to take ${dmg('knight', CURSE.blow, bookDmg('aselica', 3))} M.DMG, become Blinded for 2sec, and have their ATK reduced by ${pct(CURSE.weaker)} for ${CURSE.weakLasts}sec.\nUpon using a Skill, grants Blessing of the Angel to all allies except self for ${CURSE.blessed}sec. Blessing of the Angel reduces P.DMG taken by ${pct(CURSE.taken)} and recovers HP equal to ${pct(CURSE.heal)} of Aselica’s Max HP for 1 sec.`,
};
const QUICK: Buff = { name: 'Sword of the Sun', about: 'Attack speed higher.', icon: '☀️', art: art(0) };
const BLESSED: Buff = { name: 'Blessing of the Sun', about: 'ATK higher, and deals more to Non-Hero enemies.', icon: '🌞', art: art(1) };
const GUARDED: Buff = { name: 'Judgment of the Sun', about: 'P.DEF higher.', icon: '⚖️', art: art(2) };
const ANGEL: Buff = { name: 'Blessing of the Angel', about: 'Takes less physical damage, and is healed every second.', icon: '😇', art: art(3) };
const WARDED: Buff = { name: 'Bracelet of the Sun', about: 'Takes less physical damage.', icon: '🌞', art: art(1) };
const SHELTER: Buff = { name: 'Guardian of the Sun', about: 'P.DEF higher by a share of Aselica’s.', icon: '🛡️', art: art(3) };

export const ASELICA: HeroDef = {
  id: 'aselica',
  name: 'Aselica',
  class: 'knight',
  skins: ['Aselica'],
  // A knight whose blows are magical: as her class stands, otherwise.
  stats: { ...CLASS_STATS.knight, deals: 'magical' },
  abilities: [
    {
      name: 'Sword of the Sun',
      about: `A blow that stuns the boss for ${SWORD.stun} seconds; then +${SWORD.speed} attack speed for ${SWORD.lasts}.`,
      words: `Deals ${dmg('knight', SWORD.blow, bookDmg('aselica', 0))} M.DMG to an enemy and nearby enemies within range, inflicting Stun for ${SWORD.stun} sec. After use, increases own ATK Spd by ${SWORD.speed} for ${SWORD.lasts} sec.`,
      icon: '☀️',
      art: art(0),
      move: 'sunsword',
      cooldown: 9,
      cost: 2,
    },
    {
      name: 'Blessing of the Sun',
      about: `The ally with the highest ATK: its cooldowns ${pct(BLESSING.sooner)} shorter, and for ${BLESSING.lasts} seconds its ATK higher and ${pct(BLESSING.boss)} more to Non-Hero enemies.`,
      words: `Imbues Blessing of the Sun on the ally with the highest ATK, reducing Cooldown of all active Skills by ${pct(BLESSING.sooner)}, and increasing ATK by ${num(Math.round(BLESSING.atk * BLESSING.books))} + ${pct(BLESSING.defense * BLESSING.books)} of Aselica's P.DEF and DMG dealt to Non-Hero enemies by ${pct(BLESSING.boss)} for ${BLESSING.lasts} sec.`,
      icon: '🌞',
      art: art(1),
      move: 'sunbless',
      cooldown: 20,
      cost: 2,
    },
    {
      name: 'Judgment of the Sun',
      about: `Eight blows, each lowering the boss's M.DEF for ${JUDGMENT.lasts} seconds, and eight heals for her allies, their P.DEF higher; then a blow that knocks the boss down for ${JUDGMENT.down} seconds, and a great heal.`,
      words: `Takes position and focuses to heal HP of nearby allies 8 times for a total of ${healed('knight', JUDGMENT.heal * 8, bookHeal('aselica', 2))} + ${pct(JUDGMENT.healDefense * 8 * JUDGMENT.books)} of Aselica's P.DEF and increase their P.DEF by ${num(Math.round(JUDGMENT.guard * JUDGMENT.books))} for ${JUDGMENT.lasts} sec. Enemies within range take a total of ${dmg('knight', JUDGMENT.blow * 8, bookDmg('aselica', 2))} M.DMG over 8 times and have their M.DEF reduced by ${num(JUDGMENT.defense)} for ${JUDGMENT.lasts} sec. At the end of casting, heals HP of allies within range by ${healed('knight', JUDGMENT.lastHeal, bookHeal('aselica', 2))} + ${pct(JUDGMENT.lastHp * JUDGMENT.books)} of Aselica's Max HP, deals ${dmg('knight', JUDGMENT.last, bookDmg('aselica', 2))} M.DMG to enemies, and knocks them down for ${JUDGMENT.down} sec.`,
      icon: '⚖️',
      art: art(2),
      move: 'sunjudge',
      cooldown: 20,
      cost: 4,
    },
  ],
  passive: CURSE_SHOWN,
  treasures: [
    treasure('Light of the Dawn', (k) => ({
      words: `[Sword of the Sun] Dispels all positive effects from enemies within range, and recovers own Mana by ${k(UT.dawn.mana)} upon hit.`,
      skill: { index: 0, dispel: true },
    })),
    treasure('Bracelet of the Sun', (k) => ({
      words: `[Blessing of the Sun] Reduces Mana Cost by 1 and target takes ${pct(k(UT.bracelet.taken))} decreased P.DMG for ${UT.bracelet.lasts} sec.`,
      skill: { index: 1, cost: -1 },
    })),
    treasure('Guardian’s Trumpet', (k) => ({
      words: `[Judgment of the Sun] While in use, gains immunity to CC. Additionally, increases P.DEF Boost and M.DEF Reduction by ${pct(k(UT.trumpet.more))}.`,
      skill: { index: 2, steady: true },
    })),
    treasure('Will of Light', (k) => ({
      words: `[Curse of the Sun] Increases the duration of Blind by 1 sec. Upon activation, targets take ${pct(k(UT.will.takes))} increased M.DMG for ${UT.will.lasts} sec.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, mark: { name: 'Sword of the Sun', lasts: PERKS.lasts, takes: { magical: PERKS.takes } } } }, ({ skill }) => `Increases M.DMG the target takes by ${pct(PERKS.takes - 1)} for ${skill.mark.lasts} sec.`),
    's1-dark': said({ skill: { index: 0, cooldown: -2 } }, ({ skill }) => `Reduces cooldown by ${-skill.cooldown} sec.`),
    's2-light': said({ skill: { index: 1, cost: 1 } }, ({ skill }) => `Increases Mana Cost by ${skill.cost} and grants the effect to ${PERKS.allies} allies with the highest ATK.`),
    's2-dark': said({ skill: { index: 1, cleanse: 'self' } }, () => 'Dispels negative effects from self upon use, and dispels negative effects from the target.'),
    's3-light': said({ skill: { index: 2, cost: -1 } }, ({ skill }) => `Reduces Mana Cost by ${-skill.cost}.`),
    's3-dark': said({ skill: { index: 2, cleanse: 'self' } }, () => 'Upon use, dispels negative effects from self.'),
    's4-light': { words: '[Blessing of the Angel] becomes irremovable.' },
    's4-dark': { words: `The effect activates at ${PERKS.needs} stacks of Curse of the Sun.` },
    't5-light': t5Light({ blockPhysical: 200 }, ({ blockPhysical }) => `P. Block +${blockPhysical}`),
    't5-dark': { words: `At the beginning of the first battle, increases P.DEF of the ally with the highest ATK by ${pct(PERKS.dark)} of self's P.DEF. This effect is irremovable.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /** Curse of the Sun's stacks on the boss, and how long they last yet; her unique weapon's count of her attack's blows; whether Transcend 5's Dark has given. */
    let cursed = 0;
    let curseLeft = 0;
    let blows = 0;
    let sheltered = false;
    /** Toward the Blessing of the Angel's next heal. */
    let mending = 0;
    const needs = self.perks.has('s4-dark') ? PERKS.needs : CURSE.needs;
    /** Her allies on the field, standing and in the fight (her too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** Judgment of the Sun's more (Guardian's Trumpet). */
    const trumpet = 1 + fromTreasure(self, 2, UT.trumpet.more);
    /** Curse of the Sun: a stack on the boss; at its most, a blow, and the boss hitting less hard (Will of Light: and taking more magic damage). */
    const curse = (): void => {
      cursed++;
      curseLeft = CURSE.lasts;
      if (cursed < needs) {
        put(fight.foe.statuses, { name: CURSE_SHOWN.shown.name, left: CURSE.lasts, count: cursed, shown: 'curse' });
        return;
      }
      cursed = 0;
      fight.foe.statuses = fight.foe.statuses.filter((status) => status.name !== CURSE_SHOWN.shown.name);
      fight.hit(self, CURSE.blow, false);
      put(fight.foe.statuses, { name: 'Sun’s Weakness', left: CURSE.weakLasts, deals: 1 - CURSE.weaker, shown: 'curse' });
      if (wearsTreasure(self, 3)) put(fight.foe.statuses, { name: 'Will of Light', left: UT.will.lasts, takes: { magical: 1 + fromTreasure(self, 3, UT.will.takes) }, shown: 'curse' });
    };
    /** A blow of hers: and the curse. */
    const strike = (amount: number): boolean => {
      const critical = fight.hit(self, amount);
      curse();
      return critical;
    };

    return {
      lands: {
        // Her attack; with her unique weapon, every 5th blow the boss taking more magic damage, and stunned a moment.
        attack() {
          strike(fight.basic);
          if (tier === null) return;
          blows++;
          if (blows < IGNISIUS.every) return;
          blows = 0;
          put(fight.foe.statuses, { name: 'Solar Halo, Ignisius', left: IGNISIUS.lasts, takes: { magical: 1 + atTier(IGNISIUS.takes, tier) }, shown: 'curse' });
          fight.stun(IGNISIUS.stun, { by: self });
        },
        // A blow that stuns the boss (Light of the Dawn: mana); then quicker.
        sunsword() {
          strike(SWORD.blow);
          fight.stun(SWORD.stun, { by: self });
          const mana = fromTreasure(self, 0, UT.dawn.mana);
          if (mana > 0) self.mana = Math.min(MAX_MANA, self.mana + mana);
          put(self.statuses, { name: QUICK.name, left: SWORD.lasts, speed: SWORD.speed, shown: QUICK });
        },
        // The ally (its Light: 2) with the highest ATK: cooldowns shorter, ATK and more to Non-Hero enemies (its Dark: what the boss left on it cleared; Bracelet of the Sun: less physical damage taken).
        sunbless(part) {
          if (part > 0) return;
          const others = allies().filter((ally) => ally !== self);
          const on = (others.length > 0 ? others : [self]).sort((a, b) => b.stats.atk - a.stats.atk).slice(0, self.perks.has('s2-light') ? PERKS.allies : 1);
          fight.cue(self, 'sunbless', on);
          for (const ally of on) {
            ally.cooldowns = ally.cooldowns.map((left) => left * (1 - BLESSING.sooner));
            if (self.perks.has('s2-dark')) ally.statuses = ally.statuses.filter((status) => status.shown.harmful !== true || status.binds === true);
            const atk = ((BLESSING.atk + BLESSING.defense * self.stats.physical) * BLESSING.books) / ally.stats.atk;
            put(ally.statuses, { name: BLESSED.name, left: BLESSING.lasts, atk, deals: 1 + BLESSING.boss, shown: BLESSED });
            if (wearsTreasure(self, 1)) put(ally.statuses, { name: WARDED.name, left: UT.bracelet.lasts, takes: { physical: 1 - fromTreasure(self, 1, UT.bracelet.taken) }, shown: WARDED });
          }
        },
        // Eight blows (the boss's M.DEF lower) and heals (her allies' P.DEF higher); then a last blow that knocks the boss down, and a great heal.
        sunjudge(part) {
          const on = allies();
          if (part < 8) {
            strike(JUDGMENT.blow);
            const own = fight.foe.def.stats.magical;
            put(fight.foe.statuses, { name: 'Judgment of the Sun', left: JUDGMENT.lasts, defends: { magical: Math.max(0, 1 - (JUDGMENT.defense * trumpet) / Math.max(1, own)) }, shown: 'curse' });
            for (const ally of on.filter((one) => one !== self)) {
              // (Its share of her P.DEF is HP as it is: not by her attack.)
              fight.heal(ally, JUDGMENT.heal, self);
              fight.heal(ally, JUDGMENT.healDefense * self.stats.physical * JUDGMENT.books, undefined, self);
              put(ally.statuses, { name: GUARDED.name, left: JUDGMENT.lasts, bolsters: { physical: JUDGMENT.guard * JUDGMENT.books * trumpet }, shown: GUARDED });
            }
            return;
          }
          fight.cue(self, 'sunjudge', on);
          strike(JUDGMENT.last);
          fight.stun(JUDGMENT.down, { down: true, by: self });
          for (const ally of on) {
            fight.heal(ally, JUDGMENT.lastHeal, self);
            fight.heal(ally, JUDGMENT.lastHp * self.stats.hp * JUDGMENT.books, undefined, self);
          }
        },
      },
      // Each skill she uses: the Blessing of the Angel on every other ally.
      used() {
        for (const ally of allies()) if (ally !== self) put(ally.statuses, { name: ANGEL.name, left: CURSE.blessed, takes: { physical: 1 - CURSE.taken }, shown: ANGEL });
      },
      tick(dt) {
        if (curseLeft > 0) {
          curseLeft -= dt;
          if (curseLeft <= 0) cursed = 0;
        }
        // The Blessing of the Angel: a share of her max HP every second, for its whole while.
        mending += dt;
        if (mending >= 1) {
          mending -= 1;
          for (const ally of fight.fighters) if (ally.statuses.some((status) => status.name === ANGEL.name)) fight.heal(ally, self.stats.hp * CURSE.heal, undefined, self);
        }
        // Transcend 5's Dark: as the fight begins, the ally with the highest ATK's P.DEF higher by a share of hers, for good.
        if (!sheltered && self.perks.has('t5-dark') && fight.field.includes(self)) {
          sheltered = true;
          const top = allies().sort((a, b) => b.stats.atk - a.stats.atk)[0];
          if (top) put(top.statuses, { name: SHELTER.name, left: Infinity, bolsters: { physical: PERKS.dark * self.stats.physical }, shown: SHELTER });
        }
      },
    };
  },
};
