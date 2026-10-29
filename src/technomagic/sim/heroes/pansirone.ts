import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { num, pct, skillArt, type Buff } from '../shown';
import type { Foe } from '../types';
import { atTier, TERSIA, TERSIA_UP } from '../unique';
import { type Ability, bookDmg, CLASS_STATS, dmg, type HeroDef, type Passive, played } from './kit';

/*
 * Pansirone's skills, as King's Raid's playtest has them (stats/pansirone.md: how hard each hits at its level 90, and every
 * number here, are its; its words are its own). She is a mechanic, the Psychotic Flame.
 * - A Present For You!: a blow that sets the boss in [Eternal Blaze] (it burns every second for a while, and is healed
 *   less); for a while after, Now D.I.E! in its place: seven blows, each harder on an enemy in [Eternal Blaze], and each a
 *   blow more on a Non-Hero enemy.
 * - The Thrill! How Exciting!!: thirteen blows; her ATK and penetration higher for a while.
 * - Don't You Dare Run!: ten blows, each harder than the last on the same enemy.
 * Her passive, Cruel Delight: her ATK (its books' half again) and DMG to Non-Hero enemies higher; each of her blows on an
 * enemy in [Eternal Blaze] sets it burning again from its start.
 * Her unique weapon (../unique.ts) is worked here too: each of her blows on an enemy in [Eternal Blaze] raises her ATK,
 * DEF and the blaze's damage (up to 20 times).
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/pansirone.ts).
 *
 * Her own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Cruel
 * Delight's Light (the blaze irremovable) does nothing here: nothing removes it. Don't You Dare Run!'s Dark has its blows
 * on 3 enemies: here, with one, on the boss. Her blaze burns the enemy it was set on while that is the one in question.
 */
const BLAZE = 'Eternal Blaze';
/** A Present For You!: its blow; [Eternal Blaze]'s blow every second (its books' half again), how long, and the boss's healing less; how long Now D.I.E! is hers after. */
const PRESENT = { blow: played('mechanic', 2174, 77_682), burn: played('mechanic', 435, 37_551), books: 1.5, lasts: 10, heals: 0.75, after: 10 };
/** Now D.I.E!: each of its seven blows, its blow more on a Non-Hero enemy, and both's more on an enemy in [Eternal Blaze] (a share). */
const DIE = { blow: played('mechanic', 1000, 42_920), boss: played('mechanic', 2400, 103_008), blazing: 0.92 };
/** The Thrill! How Exciting!!: each of its thirteen blows; her ATK more (flat) and penetration, for how long. */
const THRILL = { blow: played('mechanic', 486, 19_523), atk: 57_942, pen: 500, lasts: 15 };
/** Don't You Dare Run!: each of its ten blows, and how much harder each is than the last on the same enemy (a share). */
const DARE = { blow: played('mechanic', 1386, 54_076), more: 0.3 };
/** Cruel Delight: her ATK more (flat, its books' half again), and more to Non-Hero enemies. */
const DELIGHT = { atk: 25_752, books: 1.5, boss: 0.3 };
/** Her own perks' numbers: Present's Light's more physical damage taken; Thrill's Dark's least HP, for how long; Dare's Light's stun; Delight's Dark's mana; Transcend 5's Dark's ATK every so often, for how long, at most, and for how long into the fight. */
const PERKS = { takes: 1.25, lasts: 10, floor: 0.1, floorLasts: 5, stun: 2, mana: 70, dark: { atk: 0.05, every: 10, lasts: 15, most: 20, until: 200 } };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): A Present For You!'s lower cost and Now
 * D.I.E!'s more DMG; The Thrill!'s immunity to CC (seconds); Don't You Dare Run!'s more DMG and crit DMG for each blow (up
 * to 20); Cruel Delight's more crit DMG and seconds off every cooldown.
 */
const UT = {
  painting: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
  tank: { immune: [4, 4.8, 5.8, 7, 8.4, 10] },
  cottage: { dmg: 0.5, critDamage: [0.02, 0.024, 0.029, 0.035, 0.042, 0.05], most: 20, lasts: 10 },
  letter: { critDamage: 0.5, sooner: [3, 3.6, 4.3, 5.2, 6.2, 7.5] },
};

const art = skillArt('pansirone');

const DELIGHT_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Cruel Delight', about: `Passive. ATK +${num(Math.round(DELIGHT.atk * DELIGHT.books))} and ${pct(DELIGHT.boss)} more to Non-Hero enemies; each of her blows on an enemy in [Eternal Blaze] sets it burning again.`, icon: '🔥', art: art(3) },
  words: `Increases ATK by ${num(Math.round(DELIGHT.atk * DELIGHT.books))}, and DMG dealt to Non-Hero enemies by ${pct(DELIGHT.boss)}. Attacking enemies inflicted with 'Eternal Blaze' reignites 'Eternal Blaze.'`,
};
const THRILLED: Buff = { name: 'The Thrill! How Exciting!!', about: 'ATK and penetration higher.', icon: '🔥', art: art(1) };
const HOLDING: Buff = { name: 'Thrill of Survival', about: 'HP doesn’t fall below a share of it.', icon: '🔥', art: art(1) };
const DELIGHTED: Buff = { name: 'Cruel Delight', about: 'ATK higher, and more to Non-Hero enemies.', icon: '🔥', art: art(3) };
const COTTAGE: Buff = { name: 'Elemental’s Cottage', about: 'Crit DMG higher for each.', icon: '🏠', art: art(2) };
const HEATED: Buff = { name: 'Psychotic Flame', about: 'ATK higher for each.', icon: '🔥', art: art(3) };

/** Now D.I.E!: in A Present For You!'s place for a while after it. */
const NOW_DIE: Ability = {
  name: 'Now D.I.E!',
  about: `Seven blows, each ${pct(DIE.blazing)} harder on an enemy in [Eternal Blaze], and each a blow more on a Non-Hero enemy.`,
  words: `Attacks enemies in a wide frontal range 7 times, dealing ${dmg('mechanic', DIE.blow, bookDmg('pansirone', 0))} P.DMG each hit. If the target is not a Hero, deals ${dmg('mechanic', DIE.boss, bookDmg('pansirone', 0))} additional P.DMG. Enemies inflicted with 'Eternal Blaze' take ${pct(DIE.blazing)} additional P.DMG each hit.`,
  icon: '💀',
  art: art(0),
  move: 'die',
  cooldown: 0,
  cost: 2,
};

export const PANSIRONE: HeroDef = {
  id: 'pansirone',
  name: 'Pansirone',
  class: 'mechanic',
  skins: ['Pansirone', 'Pansirone_Christmas', 'Pansirone_Wedding', 'Pansirone_Summer', 'Pansirone_DailyLook', 'Pansirone_April', 'Pansirone_Enquete', 'Pansirone_Halloween'],
  stats: { ...CLASS_STATS.mechanic, deals: 'physical' },
  abilities: [
    {
      name: 'A Present For You!',
      about: `A blow that sets the boss in [Eternal Blaze] for ${PRESENT.lasts} seconds: it burns every second and is healed ${pct(1 - PRESENT.heals)} less. For ${PRESENT.after} seconds after, Now D.I.E! in its place.`,
      words: `Attacks the enemy and enemies nearby within a wide range, dealing ${dmg('mechanic', PRESENT.blow, bookDmg('pansirone', 0))} P.DMG and inflicting them with 'Eternal Blaze.' Enemies inflicted with 'Eternal Blaze' take a total of ${dmg('mechanic', PRESENT.burn * PRESENT.books * PRESENT.lasts)} P.DMG over ${PRESENT.lasts} sec and have their Heal Rate reduced by ${pct(1 - PRESENT.heals)}.\nAfter use of this Skill, [Now D.I.E!] can be used within ${PRESENT.after} sec.`,
      icon: '🎁',
      art: art(0),
      move: 'present',
      cooldown: 22,
      cost: 2,
    },
    {
      name: 'The Thrill! How Exciting!!',
      about: `Thirteen blows; ATK +${num(THRILL.atk)} and +${THRILL.pen} penetration for ${THRILL.lasts} seconds.`,
      words: `Hits enemies within range of self 13 times, dealing a total of ${dmg('mechanic', THRILL.blow * 13, bookDmg('pansirone', 1))} P.DMG, and increasing own ATK by ${num(THRILL.atk)} and DEF Penetration by ${THRILL.pen} for ${THRILL.lasts} sec.`,
      icon: '🔥',
      art: art(1),
      move: 'thrill',
      cooldown: 20,
      cost: 2,
    },
    {
      name: 'Don’t You Dare Run!',
      about: `Ten blows, each ${pct(DARE.more)} harder than the last on the same enemy.`,
      words: `Attacks a random enemy 10 times, dealing a total of ${dmg('mechanic', DARE.blow * 10, bookDmg('pansirone', 2))} P.DMG. Attacking the same target increases DMG by ${pct(DARE.more)} each hit.`,
      icon: '🔫',
      art: art(2),
      move: 'dare',
      cooldown: 21,
      cost: 3,
    },
  ],
  passive: DELIGHT_SHOWN,
  treasures: [
    treasure('Incomprehensible Framed Painting', (k) => ({
      words: `[A Present For You!] Reduces Mana Cost by 1.
[Now D.I.E!] Increases DMG by ${pct(k(UT.painting.dmg))}.`,
      skill: { index: 0, cost: -1 },
    })),
    treasure('Special Fuel Tank', (k) => ({
      words: `[The Thrill! How Exciting!!] Upon using the Skill, dispels negative effects from self and gains immunity to CC for ${k(UT.tank.immune)} sec upon activation.`,
      skill: { index: 1, cleanse: 'self' },
    })),
    treasure('Elemental’s Cottage', (k) => ({
      words: `[Don't You Dare Run!] Increases DMG by ${pct(UT.cottage.dmg)}, and each hit increases Crit DMG by ${pct(k(UT.cottage.critDamage))} for ${UT.cottage.lasts} sec. This effect can be stacked up to max ${UT.cottage.most} times.`,
      skill: { index: 2, dmg: 1 + UT.cottage.dmg },
    })),
    treasure('Letter of Appointment: Hound Unit Leader', (k) => ({
      words: `[Cruel Delight] Increases Crit DMG by ${pct(UT.letter.critDamage)}, and reduces self's Cooldown of all active Skills by ${k(UT.letter.sooner)} sec.`,
      bonus: { critDamage: UT.letter.critDamage },
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, mark: { name: 'A Present For You!', lasts: PERKS.lasts, takes: { physical: PERKS.takes } } } }, ({ skill }) => `[A Present For You!] Hit enemy takes ${pct(PERKS.takes - 1)} increased P.DMG for ${skill.mark.lasts} sec.`),
    's1-dark': { words: '[Now D.I.E!] Gains immunity to CC for the duration of Skill.' },
    's2-light': said({ skill: { index: 1, cost: -1 } }, ({ skill }) => `Reduces Mana Cost by ${-skill.cost}.`),
    's2-dark': { words: `Upon activation, HP does not fall below ${pct(PERKS.floor)} for ${PERKS.floorLasts} sec.` },
    's3-light': { words: `Inflicts Stun on the hit enemy for ${PERKS.stun} sec.` },
    's3-dark': said({ skill: { index: 2, cost: 2 } }, ({ skill }) => `Increases Mana Cost by ${skill.cost}, and changes the number of targets to 3.`),
    's4-light': { words: 'Eternal Blaze becomes irremovable.' },
    's4-dark': { words: `Attacking the enemy inflicted with Eternal Blaze recovers ${PERKS.mana} Mana each hit.` },
    't5-light': t5Light({ critDamage: 0.2 }, ({ critDamage }) => `Crit DMG +${pct(critDamage)}`),
    't5-dark': { words: `For ${PERKS.dark.until} sec after the beginning of the battle, ATK increases by ${pct(PERKS.dark.atk)} for ${PERKS.dark.lasts} sec every ${PERKS.dark.every} sec. This effect can be stacked up to max ${PERKS.dark.most} times.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /** [Eternal Blaze]: on whom, how long it has yet, and toward its next blow; how long Now D.I.E! is hers yet; Don't You Dare Run!'s blows on the same enemy; Elemental's Cottage's stacks; her unique weapon's stacks; Transcend 5's Dark's stacks, how long it has gone on, and toward the next; The Thrill!'s Dark's while; */
    let blazed: Foe | null = null;
    let blazeLeft = 0;
    let burning = 0;
    let dying = 0;
    let dared = 0;
    let cottage = 0;
    let tersia = 0;
    let heated = 0;
    let heating = 0;
    let heatNext = 0;
    let holding = 0;
    /** A Present For You!'s own cooldown, kept apart while Now D.I.E! is in its place (that slot free meanwhile); the skills just used, for Letter of Appointment (not Now D.I.E!: it has none, and its slot's is A Present For You!'s). */
    let presentLeft = 0;
    let lettered: number[] = [];
    /** Her abilities' ATK: Cruel Delight's and The Thrill!'s, shares of her own as the fight begins. */
    const delight = (DELIGHT.atk * DELIGHT.books) / self.stats.atk;
    const thrill = THRILL.atk / self.stats.atk;
    put(self.statuses, { name: DELIGHTED.name, left: Infinity, atk: delight, deals: 1 + DELIGHT.boss, shown: DELIGHTED });

    /** Whether the enemy in question is in [Eternal Blaze]. */
    const isBlazing = (): boolean => blazed === fight.foe && blazeLeft > 0;
    /** [Eternal Blaze] on the enemy in question, from its start. */
    const blaze = (): void => {
      blazed = fight.foe;
      blazeLeft = PRESENT.lasts;
      put(fight.foe.statuses, { name: BLAZE, left: PRESENT.lasts, heals: PRESENT.heals, shown: 'burn' });
    };
    /** A blow of hers: on an enemy in [Eternal Blaze], it burns again from its start (Cruel Delight's Dark: mana; her unique weapon: a stack). */
    const strike = (amount: number, counted = true): boolean => {
      const blazing = isBlazing();
      const critical = fight.hit(self, amount, counted);
      if (!blazing) return critical;
      blaze();
      if (self.perks.has('s4-dark')) self.mana = Math.min(MAX_MANA, self.mana + PERKS.mana);
      if (tier !== null && tersia < TERSIA.most) {
        tersia++;
        put(self.statuses, { name: TERSIA_UP.name, left: Infinity, count: tersia, atk: atTier(TERSIA.boost, tier) * tersia, defends: 1 + atTier(TERSIA.boost, tier) * tersia, shown: TERSIA_UP });
      }
      return critical;
    };

    return {
      lands: {
        attack() {
          strike(fight.basic);
        },
        // A blow, and [Eternal Blaze]; Now D.I.E! hers for a while after.
        present() {
          strike(PRESENT.blow);
          blaze();
          dying = PRESENT.after;
        },
        // Seven blows, harder on an enemy in [Eternal Blaze], each a blow more on a Non-Hero enemy (Framed Painting: harder).
        die() {
          const more = (isBlazing() ? 1 + DIE.blazing : 1) * (1 + fromTreasure(self, 0, UT.painting.dmg));
          strike(DIE.blow * more);
          strike(DIE.boss * more);
        },
        // Thirteen blows; the first, her ATK and penetration higher (its Dark: her HP held up a while; Special Fuel Tank: immune to CC a while).
        thrill(part) {
          strike(THRILL.blow);
          if (part !== 0) return;
          put(self.statuses, { name: THRILLED.name, left: THRILL.lasts, atk: thrill, pen: THRILL.pen, shown: THRILLED });
          if (self.perks.has('s2-dark')) {
            holding = PERKS.floorLasts;
            put(self.statuses, { name: HOLDING.name, left: PERKS.floorLasts, shown: HOLDING });
          }
          const immune = fromTreasure(self, 1, UT.tank.immune);
          if (immune > 0) put(self.statuses, { name: 'Special Fuel Tank', left: immune, guards: true, shown: THRILLED });
        },
        // Ten blows, each harder than the last (its Light: the first stuns; Elemental's Cottage: crit DMG for each, its stacks gone once it has run out).
        dare(part) {
          if (part === 0) dared = 0;
          strike(DARE.blow * (1 + DARE.more * dared));
          dared++;
          if (part === 0 && self.perks.has('s3-light')) fight.stun(PERKS.stun, { by: self });
          if (wearsTreasure(self, 2)) {
            if (!self.statuses.some((status) => status.name === COTTAGE.name)) cottage = 0;
            cottage = Math.min(UT.cottage.most, cottage + 1);
            put(self.statuses, { name: COTTAGE.name, left: UT.cottage.lasts, count: cottage, critDamage: fromTreasure(self, 2, UT.cottage.critDamage) * cottage, shown: COTTAGE });
          }
        },
      },
      // Now D.I.E! in A Present For You!'s place while it is hers (its Dark: steady while it goes).
      slot: (index) => (index === 0 && dying > 0 ? NOW_DIE : (self.abilities[index] ?? null)),
      used(index, ability) {
        if (ability.move !== 'die') lettered.push(index);
        if (ability.move === 'present') presentLeft = ability.cooldown;
        if (ability.move === 'die') {
          dying = 0;
          if (self.perks.has('s1-dark')) put(self.statuses, { name: 'Now D.I.E!', left: 5.2, guards: true, shown: DELIGHTED });
        }
      },
      // The Thrill!'s Dark: her HP held up at its share meanwhile.
      spared: () => holding > 0,
      tick(dt) {
        if (dying > 0) dying -= dt;
        if (holding > 0) {
          holding -= dt;
          if (self.hp > 0 && self.hp < self.stats.hp * PERKS.floor) self.hp = self.stats.hp * PERKS.floor;
        }
        // [Eternal Blaze]: a blow every second while it is on (her unique weapon: harder).
        if (blazeLeft > 0) {
          blazeLeft -= dt;
          burning += dt;
          if (burning >= 1) {
            burning -= 1;
            if (blazed === fight.foe && blazed.hp > 0) fight.hit(self, PRESENT.burn * PRESENT.books * (1 + (tier !== null ? atTier(TERSIA.boost, tier) * tersia : 0)), false);
          }
          if (blazeLeft <= 0) blazed = null;
        }
        // Letter of Appointment: a skill just used, its cooldown shorter.
        const letter = fromTreasure(self, 3, UT.letter.sooner);
        for (const i of lettered) {
          if (letter <= 0) break;
          self.cooldowns[i] = Math.max(0, (self.cooldowns[i] ?? 0) - letter);
          if (i === 0) presentLeft = Math.max(0, presentLeft - letter);
        }
        lettered = [];
        // A Present For You!'s cooldown: its slot free while Now D.I.E! is in it, then what is left of its own.
        presentLeft = Math.max(0, presentLeft - dt);
        if (dying > 0) self.cooldowns[0] = 0;
        else self.cooldowns[0] = Math.max(self.cooldowns[0] ?? 0, presentLeft);
        // Transcend 5's Dark: for so long into the fight, her ATK higher every so often (up to its most).
        if (self.perks.has('t5-dark') && heating < PERKS.dark.until) {
          heating += dt;
          heatNext += dt;
          if (heatNext >= PERKS.dark.every) {
            heatNext -= PERKS.dark.every;
            heated = Math.min(PERKS.dark.most, heated + 1);
            put(self.statuses, { name: HEATED.name, left: PERKS.dark.lasts, count: heated, atk: PERKS.dark.atk * heated, shown: HEATED });
          }
        }
      },
      lit: () => dying > 0,
    };
  },
};
