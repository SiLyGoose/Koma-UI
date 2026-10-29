import { away, put } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { fine, num, pct, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { atTier, MAXITHEA, MAXITHEA_UP } from '../unique';
import { bookDmg, CLASS_STATS, dmg, type HeroDef, type Passive, played } from './kit';

/*
 * Glenwys's skills, as King's Raid's playtest has them (stats/glenwys.md: how hard each hits at its level 90, and every
 * number here, are its; its words are its own). She is a knight, the Shield of Empire.
 * - That Is It: seven blows, each leaving the boss taking more physical damage (up to 7 times), and each another blow
 *   against a Non-Hero enemy.
 * - I Will Not Stay My Hand: ten blows that stun the boss, and a last that stuns it longer.
 * - Time For Counterattack: what the boss has left on every ally cleared, their ATK and DEF higher for a while (its books'
 *   half again), and a great blow that knocks the boss down.
 * Her passive, Pride of Imperial Knights: every ally's ATK higher (its books' half again); and as the fight begins, every
 * ally deals more to Non-Hero enemies and takes less from them for a while.
 * Her unique weapon (../unique.ts) is worked here too: each skill she uses raises every ally's ATK and crit DMG (up to 4
 * times; twice that at 4), for the rest of the fight.
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/glenwys.ts).
 *
 * Her own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). That Is It's
 * Light has all its blows on a Non-Hero enemy (the boss, its minions) go through all its DEF. Alpha Leader Badge's share
 * off her cooldowns is off all of them, as each critical blow of That Is It lands.
 */
/** That Is It: each of its seven blows, the boss's physical damage taken more for each (up to `most`, for `lasts` seconds), and each one's blow more on a Non-Hero enemy. */
const THAT = { blow: played('knight', 255, 10_730), takes: 0.04, most: 7, lasts: 10, boss: played('knight', 530, 23_606) };
/** I Will Not Stay My Hand: each of its ten blows and its stun; its last blow and its stun. */
const HAND = { blow: played('knight', 450, 17_168), stun: 1, last: played('knight', 1480, 52_573), lastStun: 3 };
/** Time For Counterattack: every ally's DEF and ATK more (flat, its books' half again), for how long; its blow, and how long it knocks the boss down. */
const COUNTER = { defense: 9_227, atk: 20_383, books: 1.5, lasts: 20, blow: played('knight', 4440, 163_739), down: 3 };
/** Pride of Imperial Knights: every ally's ATK more (flat, its books' half again); as the fight begins, more to and less from Non-Hero enemies, for how long. */
const PRIDE = { atk: 7_507, books: 1.5, dealt: 0.1, taken: 0.1, lasts: 20 };
/** Her own perks' numbers: That Is It's Dark's slowing; I Will Not Stay My Hand's Light's more taken and Dark's longer stuns; Time For Counterattack's Light's P.Crit Resistance and Dark's ATK and DEF Boost more; Pride's Light's and Dark's 20%; Transcend 5's Dark's share of her DEF as every ally's ATK. */
const PERKS = { slow: 250, lasts: 10, takes: 1.25, stun: 0.5, critTaken: 250, counter: 1, pride: 0.2, dark: 0.08 };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): That Is It's more DMG and the share off her
 * cooldowns for each critical blow; I Will Not Stay My Hand's shorter cooldown and the boss healed less; Time For
 * Counterattack's more ATK and DEF and the boss's more physical damage taken; Pride's more ATK, and the crit DMG and more
 * to Non-Hero enemies it gives her and the ally with the highest ATK as the fight begins.
 */
const UT = {
  badge: { dmg: 0.5, sooner: [0.01, 0.012, 0.014, 0.017, 0.02, 0.025] },
  dandelion: { cooldown: 4.5, heals: [0.2, 0.24, 0.28, 0.34, 0.42, 0.5], lasts: 10 },
  ruby: { more: 0.5, takes: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 },
  glory: { atk: 0.5, critDamage: [0.3, 0.36, 0.42, 0.5, 0.63, 0.75], dmg: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 20 },
};

const art = skillArt('glenwys');

const PRIDE_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Pride of Imperial Knights', about: `Passive. Every ally's ATK +${num(Math.round(PRIDE.atk * PRIDE.books))}; as the fight begins, every ally deals ${pct(PRIDE.dealt)} more to Non-Hero enemies and takes ${pct(PRIDE.taken)} less from them for ${PRIDE.lasts} seconds.`, icon: '🛡️', art: art(3) },
  words: `Increases ATK of all allies by ${num(Math.round(PRIDE.atk * PRIDE.books))}. At the beginning of each battle, increases DMG to Non-Hero enemies by ${pct(PRIDE.dealt)} for ${PRIDE.lasts} sec, reducing DMG received by ${pct(PRIDE.taken)}.`,
};
const PROUD: Buff = { name: 'Pride of Imperial Knights', about: 'ATK higher.', icon: '🛡️', art: art(3) };
const RALLY: Buff = { name: 'Imperial Rally', about: 'Deals more to Non-Hero enemies, and takes less from them.', icon: '🛡️', art: art(3) };
const COUNTERED: Buff = { name: 'Time For Counterattack', about: 'ATK and DEF higher.', icon: '🛡️', art: art(2) };
const GLORY: Buff = { name: 'Golden Glory', about: 'Crit DMG higher, and deals more to Non-Hero enemies.', icon: '🏅', art: art(3) };
const STALWART: Buff = { name: 'Shield of Empire', about: 'ATK higher by a share of Glenwys’s DEF.', icon: '🛡️', art: art(3) };

export const GLENWYS: HeroDef = {
  id: 'glenwys',
  name: 'Glenwys',
  class: 'knight',
  skins: ['Glenwys', 'Glenwys_Summer', 'Glenwys_Halloween', 'Glenwys_Glory', 'Glenwys_Dessert', 'Glenwys_Christmas', 'Glenwys_Fallen', 'Glenwys_Glory2'],
  stats: { ...CLASS_STATS.knight, deals: 'physical' },
  abilities: [
    {
      name: 'That Is It',
      about: `Seven blows, each leaving the boss taking ${pct(THAT.takes)} more physical damage for ${THAT.lasts} seconds (up to ${THAT.most} times); each a blow more against a Non-Hero enemy.`,
      words: `Deals a total of ${dmg('knight', THAT.blow * 7, bookDmg('glenwys', 0))} P.DMG over 7 attacks to frontal enemies. Each attack increases P.DMG the enemies take by ${pct(THAT.takes)} for ${THAT.lasts} sec. This effect stacks up to max ${THAT.most} times.\nDeals additional ${dmg('knight', THAT.boss, bookDmg('glenwys', 0))} P.DMG to Non-Hero target.`,
      icon: '⚔️',
      art: art(0),
      move: 'finisher',
      cooldown: 9,
      cost: 2,
    },
    {
      name: 'I Will Not Stay My Hand',
      about: `Ten blows that stun the boss for ${HAND.stun} second, and a last that stuns it for ${HAND.lastStun}.`,
      words: `Deals ${dmg('knight', HAND.blow * 10, bookDmg('glenwys', 1))} P.DMG over 10 attacks to nearby enemies in a circular range of self and stuns them for ${HAND.stun} sec.\nThe final attack deals ${dmg('knight', HAND.last, bookDmg('glenwys', 1))} P.DMG to frontal enemies and stuns them for ${HAND.lastStun} sec.`,
      icon: '🗡️',
      art: art(1),
      move: 'unstayed',
      cooldown: 15,
      cost: 3,
    },
    {
      name: 'Time For Counterattack',
      about: `What the boss has left on every ally cleared, and their ATK +${num(Math.round(COUNTER.atk * COUNTER.books))} and DEF +${num(Math.round(COUNTER.defense * COUNTER.books))} for ${COUNTER.lasts} seconds; a great blow that knocks the boss down for ${COUNTER.down}.`,
      words: `Calling upon the strength of the Imperial Shield, deals ${dmg('knight', COUNTER.blow, bookDmg('glenwys', 2))} P.DMG to nearby enemies in a large circular range of self and knocks them down for ${COUNTER.down} sec. Dispels negative effects from all allies, increases ATK by ${num(Math.round(COUNTER.atk * COUNTER.books))} for ${COUNTER.lasts} sec, and increases DEF by ${num(Math.round(COUNTER.defense * COUNTER.books))}.`,
      icon: '🛡️',
      art: art(2),
      move: 'counter',
      cooldown: 17,
      cost: 4,
    },
  ],
  passive: PRIDE_SHOWN,
  treasures: [
    treasure('Alpha Leader Badge', (k) => ({
      words: `[That Is it] Increases DMG by ${pct(UT.badge.dmg)} and reduces Cooldown by ${fine(k(UT.badge.sooner))} upon a Critical Hit.`,
      skill: { index: 0, dmg: 1 + UT.badge.dmg },
    })),
    treasure('Praise of Dandelion', (k) => ({
      words: `[I Will Not Stay My Hand] Reduces Cooldown by ${UT.dandelion.cooldown} sec and enemy Heal Rate by ${pct(k(UT.dandelion.heals))}.`,
      skill: { index: 1, cooldown: -UT.dandelion.cooldown, mark: { name: 'Praise of Dandelion', lasts: UT.dandelion.lasts, heals: 1 - k(UT.dandelion.heals) } },
    })),
    treasure('Ballas Ruby', (k) => ({
      words: `[Time for Counterattack] Increases the amount of ATK and DEF Boost by ${pct(UT.ruby.more)} and causes the hit target to take ${pct(k(UT.ruby.takes))} increased P.DMG for ${UT.ruby.lasts} sec.`,
      skill: { index: 2, mark: { name: 'Ballas Ruby', lasts: UT.ruby.lasts, takes: { physical: 1 + k(UT.ruby.takes) } } },
    })),
    treasure('Golden Glory', (k) => ({
      words: `[Pride of Imperial Knights] Increases ATK Boost by ${pct(UT.glory.atk)}. At the beginning of each battle, increases Crit DMG of self and an ally with the highest ATK besides self by ${pct(k(UT.glory.critDamage))} for ${UT.glory.lasts} sec, and increases DMG to Non-Hero enemies by ${pct(k(UT.glory.dmg))}.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, cost: 1, whole: true } }, ({ skill }) => `Mana Cost increases by ${skill.cost}. DMG dealt to Non-Hero enemies now ignores DEF.`),
    's1-dark': said({ skill: { index: 0, slow: { points: PERKS.slow, lasts: PERKS.lasts } } }, ({ skill }) => `Reduces target's ATK Spd by ${skill.slow.points} for ${skill.slow.lasts} sec.`),
    's2-light': said({ skill: { index: 1, mark: { name: 'I Will Not Stay My Hand', lasts: PERKS.lasts, takes: { physical: PERKS.takes } } } }, ({ skill }) => `Increases the amount of P.DMG that a target takes by ${pct(PERKS.takes - 1)} for ${skill.mark.lasts} sec.`),
    's2-dark': { words: `The duration of Stun increases by ${PERKS.stun} sec.` },
    's3-light': said({ skill: { index: 2, mark: { name: 'Time For Counterattack', lasts: PERKS.lasts, critTaken: { physical: PERKS.critTaken } } } }, ({ skill }) => `Reduces target's P.Crit Resistance by ${PERKS.critTaken} for ${skill.mark.lasts} sec.`),
    's3-dark': said({ skill: { index: 2, cost: 1 } }, ({ skill }) => `Mana Cost is increases by ${skill.cost} and the amount of ATK and DEF boost increases by ${pct(PERKS.counter)}.`),
    's4-light': { words: `DMG effect dealt to Non-Hero enemies is now ${pct(PERKS.pride)}.` },
    's4-dark': { words: `DMG effect received from Non-Hero enemies is now ${pct(PERKS.pride)}.` },
    't5-light': t5Light({ defense: 0.1 }, ({ defense }) => `All DEF + ${pct(defense)}`),
    't5-dark': { words: `Increases ATK of all allies by ${pct(PERKS.dark)} of self's All DEF.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /** Her unique weapon's stacks; That Is It's stacks on the boss, and how long they last yet. */
    let maxithea = 0;
    let marked = 0;
    let markLeft = 0;
    let begun = false;
    /** Her allies on the field, standing and in the fight (her too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** Pride's ATK for every ally (Golden Glory: more); Time For Counterattack's (its Dark, Ballas Ruby: more). Each Boost is added to its books', as King's Raid adds them up, not multiplied in. */
    const pride = PRIDE.atk * (PRIDE.books + (wearsTreasure(self, 3) ? UT.glory.atk : 0));
    const counterMore = COUNTER.books + (self.perks.has('s3-dark') ? PERKS.counter : 0) + (wearsTreasure(self, 2) ? UT.ruby.more : 0);

    return {
      lands: {
        // Seven blows, each leaving the boss taking more physical damage, and each another against a Non-Hero enemy (its
        // Light: all of them through all its DEF, `whole`). Alpha Leader Badge: a critical one takes time off her cooldowns.
        finisher() {
          const critical = fight.hit(self, THAT.blow);
          fight.hit(self, THAT.boss);
          marked = Math.min(THAT.most, marked + 1);
          markLeft = THAT.lasts;
          put(fight.foe.statuses, { name: 'That Is It', left: THAT.lasts, count: marked, takes: { physical: 1 + THAT.takes * marked }, shown: 'curse' });
          const sooner = fromTreasure(self, 0, UT.badge.sooner);
          if (critical && sooner > 0) self.cooldowns = self.cooldowns.map((left, i) => Math.max(0, left - (self.abilities[i]?.cooldown ?? 0) * sooner));
        },
        // Ten blows that stun the boss, and a last that stuns it longer (its Dark: each longer).
        unstayed(part) {
          const longer = self.perks.has('s2-dark') ? PERKS.stun : 0;
          if (part < 10) {
            fight.hit(self, HAND.blow);
            fight.stun(HAND.stun + longer, { by: self });
          } else {
            fight.hit(self, HAND.last);
            fight.stun(HAND.lastStun + longer, { by: self });
          }
        },
        // Every ally cleared of what the boss left on it, its ATK and DEF higher; and the boss struck and knocked down.
        counter() {
          const on = allies();
          fight.cue(self, 'counter', on);
          for (const ally of on) {
            ally.statuses = ally.statuses.filter((status) => status.shown.harmful !== true || status.binds === true);
            put(ally.statuses, { name: COUNTERED.name, left: COUNTER.lasts, atk: (COUNTER.atk * counterMore) / ally.stats.atk, bolsters: { physical: COUNTER.defense * counterMore, magical: COUNTER.defense * counterMore }, shown: COUNTERED });
          }
          fight.hit(self, COUNTER.blow);
          fight.stun(COUNTER.down, { down: true, by: self });
        },
      },
      // Her unique weapon: each skill she uses, every ally's ATK and crit DMG higher (twice at its most), for good.
      used() {
        if (tier === null) return;
        maxithea = Math.min(MAXITHEA.most, maxithea + 1);
        const times = maxithea * (maxithea === MAXITHEA.most ? 2 : 1);
        for (const ally of fight.fighters) put(ally.statuses, { name: MAXITHEA_UP.name, left: Infinity, count: maxithea, atk: atTier(MAXITHEA.atk, tier) * times, critDamage: atTier(MAXITHEA.critDamage, tier) * times, shown: MAXITHEA_UP });
      },
      tick(dt) {
        if (markLeft > 0) {
          markLeft -= dt;
          if (markLeft <= 0) marked = 0;
        }
        const there = fight.field.includes(self) && self.hp > 0 && !away(self.statuses);
        // As the fight begins: every ally deals more to Non-Hero enemies and takes less from them (its Light, its Dark: more);
        // Golden Glory: her and the ally with the highest ATK, crit DMG higher and more to Non-Hero enemies.
        if (!begun && there) {
          begun = true;
          const dealt = self.perks.has('s4-light') ? PERKS.pride : PRIDE.dealt;
          const taken = self.perks.has('s4-dark') ? PERKS.pride : PRIDE.taken;
          put(fight.party, { name: RALLY.name, left: PRIDE.lasts, deals: 1 + dealt, takes: 1 - taken, shown: RALLY });
          if (wearsTreasure(self, 3)) {
            const top = allies().filter((ally) => ally !== self).sort((a, b) => b.stats.atk - a.stats.atk)[0];
            for (const one of top ? [self, top] : [self]) put(one.statuses, { name: GLORY.name, left: UT.glory.lasts, critDamage: fromTreasure(self, 3, UT.glory.critDamage), deals: 1 + fromTreasure(self, 3, UT.glory.dmg), shown: GLORY });
          }
        }
        // Pride, and Transcend 5's Dark: every ally's ATK higher while she is there.
        const dark = self.perks.has('t5-dark') ? PERKS.dark * (self.stats.physical + self.stats.magical) : 0;
        for (const ally of fight.fighters) {
          if (!there) {
            ally.statuses = ally.statuses.filter((status) => status.name !== PROUD.name && status.name !== STALWART.name);
            continue;
          }
          put(ally.statuses, { name: PROUD.name, left: Infinity, atk: pride / ally.stats.atk, shown: PROUD });
          if (dark > 0) put(ally.statuses, { name: STALWART.name, left: Infinity, atk: dark / ally.stats.atk, shown: STALWART });
        }
      },
    };
  },
};
