import { away, filling, put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA, SECTION } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { num, pct, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { atTier, CIELAMAHA, CIELAMAHA_UP } from '../unique';
import { bookDmg, CLASS_STATS, dmg, type HeroDef, type Passive, played } from './kit';

/*
 * Lilia's skills, as King's Raid's playtest has them (stats/lilia.md: how hard each hits at its level 90, and every number
 * here, are its; its words are its own). She is a wizard whose blows are physical, the Daughter of Storm and Sea.
 * - Aqua Tempest: a tempest on the boss for a while, a blow every half second.
 * - Everlasting Oasis: for a while, her mana fills far faster, and her ATK and DEF are higher (its books' half again).
 * - Celestial Cataract: fifteen water drops and five great ones that stun the boss; each costs her mana (the more as it
 *   goes), and none comes once she has none.
 * Her passive, Aqua Purification: her ATK (its books' half again) and crit chance higher; and the faster her mana fills, the
 * higher her ATK.
 * Her unique weapon (../unique.ts) is worked here too: her mana fills by so much more every second, and each part of her
 * attack may deal a blow more.
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/lilia.ts).
 *
 * Her own perks (../perks.ts) are King's Raid's.
 */
/** Aqua Tempest: how long, a blow every so often. */
const TEMPEST = { lasts: 8, every: 0.5, blow: played('wizard', 283, 9_870) };
/** Everlasting Oasis: how long; her mana's more (a share), ATK and DEF more (flat, its books' half again). */
const OASIS = { lasts: 15, mana: 1.5, atk: 71_461, defense: 8_793, books: 1.5 };
/** Celestial Cataract: each drop and great drop, the great ones' stun; the mana each drop costs, and how much more each after. */
const CATARACT = { drop: played('wizard', 327, 12_016), great: played('wizard', 1659, 57_082), stun: 2, mana: 25, more: 13 };
/** Aqua Purification: her ATK more (flat, its books' half again) and crit chance; ATK a share for each so much mana a second. */
const PURIFICATION = { atk: 37_551, books: 1.5, crit: 300, per: 600 };
/** Her own perks' numbers: Tempest's Light's slowing and Dark's DMG for each use (up to so many); Oasis's Light's crit DMG for its ally and Dark's shorter, twice as strong; Cataract's Dark's chance of a drop more, at twice the mana; Purification's Light's mana and Dark's more to bosses; Transcend 5's Dark's ATK for each section of mana. */
const PERKS = { slow: 250, slowLasts: 10, tempest: 0.2, most: 15, critDamage: 0.2, shorter: 5, doubled: 2, extra: 0.5, mana: 1000, boss: 0.15, dark: 0.15 };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Tempest's shorter cooldown and the boss's
 * more physical damage taken; Oasis's crit DMG meanwhile; Cataract's chance of a great drop more and its crit DMG; and
 * Purification's crit DMG and more mana every so often, for a while.
 */
const UT = {
  whisper: { cooldown: 2.5, takes: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25] },
  heart: { critDamage: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
  kettle: { chance: 0.07, blow: 1000, critDamage: [0.02, 0.024, 0.029, 0.035, 0.042, 0.05], lasts: 7 },
  key: { every: 10, critDamage: 0.8, mana: [0.3, 0.36, 0.43, 0.52, 0.63, 0.75], lasts: 5 },
};

const art = skillArt('lilia');

const PURIFIED: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Aqua Purification', about: `Passive. ATK +${num(Math.round(PURIFICATION.atk * PURIFICATION.books))} and +${PURIFICATION.crit} crit; +1% ATK for each ${PURIFICATION.per / 100} mana she gains a second.`, icon: '💧', art: art(3) },
  words: `Mana Recovery/Attack is fixed, but increases own ATK by ${num(Math.round(PURIFICATION.atk * PURIFICATION.books))} and Crit Chance by ${PURIFICATION.crit}.\nPer ${PURIFICATION.per / 100} Mana Recovery/Sec, ATK is increased by 1%.`,
};
const FLOWING: Buff = { name: 'Aqua Purification', about: 'ATK higher, the faster her mana fills.', icon: '💧', art: art(3) };
const OASIS_UP: Buff = { name: 'Everlasting Oasis', about: 'Mana fills faster; ATK and DEF higher.', icon: '🏝️', art: art(1) };
const KETTLE: Buff = { name: 'Bottomless Kettle of Elementals', about: 'Crit DMG higher.', icon: '🫖', art: art(2) };
const KEY: Buff = { name: 'Key of Purity', about: 'Crit DMG higher, and mana fills faster.', icon: '🗝️', art: art(3) };
const TEMPESTS: Buff = { name: 'Aqua Tempest', about: 'Aqua Tempest deals more for each use.', icon: '🌊', art: art(0) };
const SURGING: Buff = { name: 'Daughter of Storm and Sea', about: 'ATK higher for each section of mana.', icon: '🌊', art: art(3) };

export const LILIA: HeroDef = {
  id: 'lilia',
  name: 'Lilia',
  class: 'wizard',
  skins: ['Lilia'],
  // A wizard whose blows are physical: her passive's crit chance.
  stats: { ...CLASS_STATS.wizard, deals: 'physical', crit: CLASS_STATS.wizard.crit + PURIFICATION.crit },
  abilities: [
    {
      name: 'Aqua Tempest',
      about: `A tempest on the boss for ${TEMPEST.lasts} seconds: a blow every ${TEMPEST.every} seconds.`,
      words: `For ${TEMPEST.lasts} sec, summons Aqua Tempest to a random target and enemies in target's range and deals ${dmg('wizard', TEMPEST.blow, bookDmg('lilia', 0))} P.DMG every ${TEMPEST.every} sec. If the target is killed, Aqua Tempest is summoned to attack another random target for the remaining time.`,
      icon: '🌊',
      art: art(0),
      move: 'tempest',
      cooldown: 8,
      cost: 3,
    },
    {
      name: 'Everlasting Oasis',
      auto: { keeps: OASIS_UP.name },
      about: `For ${OASIS.lasts} seconds: her mana fills ${pct(OASIS.mana)} faster, ATK +${num(Math.round(OASIS.atk * OASIS.books))} and DEF +${num(Math.round(OASIS.defense * OASIS.books))}.`,
      words: `When activated, turns into the Everlasting Oasis state for ${OASIS.lasts} sec.\nDuring the Everlasting Oasis state, mana recovery rate per sec is increased by ${pct(OASIS.mana)} and ATK is increased by ${num(Math.round(OASIS.atk * OASIS.books))}. Additionally, all DEF is increased by ${num(Math.round(OASIS.defense * OASIS.books))}.`,
      icon: '🏝️',
      art: art(1),
      move: 'oasis',
      cooldown: 20,
      cost: 3,
    },
    {
      name: 'Celestial Cataract',
      about: `Fifteen water drops and five great ones that stun the boss for ${CATARACT.stun} seconds; each costs her ${CATARACT.mana} mana (more as it goes), and none comes once she has none.`,
      words: `Throws water drops 15 times to random enemies, dealing a total of ${dmg('wizard', CATARACT.drop * 15, bookDmg('lilia', 2))} P.DMG. Additionally, throws big water drops 5 times to target and other enemies in target's range, dealing ${dmg('wizard', CATARACT.great, bookDmg('lilia', 2))} P.DMG.\nEnemies hit by the big water drop are inflicted by Stun for ${CATARACT.stun} sec. Per each water drop thrown, ${CATARACT.mana} mana is consumed, and mana consumption rate is increased by ${CATARACT.more}.\nStops use when mana becomes 0.`,
      icon: '💧',
      art: art(2),
      move: 'cataract',
      cooldown: 12,
      cost: 3,
    },
  ],
  passive: PURIFIED,
  treasures: [
    treasure('Whisper of Sea', (k) => ({
      words: `[Aqua Tempest] Reduces Cooldown by ${UT.whisper.cooldown} sec and enemies inflicted by Aqua Tempest take ${pct(k(UT.whisper.takes))} increased P.DMG.`,
      skill: { index: 0, cooldown: -UT.whisper.cooldown },
    })),
    treasure('Heart of Flow', (k) => ({
      words: `[Everlasting Oasis] The effect cannot be dispelled, and Crit DMG is increased by ${pct(k(UT.heart.critDamage))} during skill duration.`,
    })),
    treasure('Bottomless Kettle of Elementals', (k) => ({
      words: `[Celestial Cataract] Upon each ATK there is a ${pct(UT.kettle.chance)} chance of throwing a big water drop, dealing ${pct(UT.kettle.blow / 1000)} of ATK as P.DMG and increasing own Crit DMG by ${pct(k(UT.kettle.critDamage))} for ${UT.kettle.lasts} sec.`,
    })),
    treasure('Key of Purity', (k) => ({
      words: `[Aqua Purification] Every ${UT.key.every} sec, increases own Crit DMG by ${pct(UT.key.critDamage)} and Mana Recovery/Sec by ${pct(k(UT.key.mana))} for ${UT.key.lasts} sec.`,
    })),
  ],
  perks: {
    's1-light': { words: `Hit target's ATK Spd is decreased by ${PERKS.slow} for ${PERKS.slowLasts} sec.` },
    's1-dark': { words: `Each use increases DMG by ${pct(PERKS.tempest)}. Stacks ${PERKS.most} times max.` },
    's2-light': said({ skill: { index: 1, cost: 1 } }, ({ skill }) => `Mana cost is increased by ${skill.cost} and is additionally activated on the ally with the highest ATK excluding self.`),
    's2-dark': { words: `Skill duration is decreased by ${PERKS.shorter} sec and all effects are increased by ${pct(PERKS.doubled - 1)}.` },
    's3-light': said({ skill: { index: 2, steady: true } }, () => 'While in use, gain immunity to CC.'),
    's3-dark': { words: `Per each water drop thrown, mana cost and mana consumption rate are increased by 100%, and per each water drop thrown, there is a ${pct(PERKS.extra)} chance of throwing an extra water drop.` },
    's4-light': { words: `At the start of each battle, recovers ${PERKS.mana} mana.` },
    's4-dark': { words: `Deals ${pct(PERKS.boss)} increased DMG to Boss monsters.` },
    't5-light': t5Light({ critDamage: 0.2 }, ({ critDamage }) => `Crit DMG +${pct(critDamage)}`),
    't5-dark': { words: `ATK is increased by ${pct(PERKS.dark)} per 1 orb of mana.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /** Aqua Tempest: how long yet, toward its next blow, and its Dark's uses; Celestial Cataract's next drop's cost; Bottomless Kettle's toward its next; Key of Purity's toward its next; whether the fight has begun for her. */
    let tempest = 0;
    let tempestTick = 0;
    let tempests = 0;
    let cost = CATARACT.mana;
    let key = 0;
    let begun = false;
    /** Aqua Purification's ATK and DMG to bosses (its Dark), as the fight begins; Everlasting Oasis's (its Dark: twice). */
    const purification = (PURIFICATION.atk * PURIFICATION.books) / self.stats.atk;
    const doubled = self.perks.has('s2-dark') ? PERKS.doubled : 1;
    /** Her allies on the field, standing and in the fight (her too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));

    /** A blow of hers: Bottomless Kettle, now and then a great drop more, and crit DMG. */
    const strike = (amount: number): boolean => {
      const critical = fight.hit(self, amount);
      if (wearsTreasure(self, 2) && fight.roll() < UT.kettle.chance) {
        fight.hit(self, UT.kettle.blow, false);
        put(self.statuses, { name: KETTLE.name, left: UT.kettle.lasts, critDamage: fromTreasure(self, 2, UT.kettle.critDamage), shown: KETTLE });
      }
      return critical;
    };
    /** A water drop's mana: none, no drop (its Dark: twice the mana, and more each time). */
    const pay = (): boolean => {
      const each = cost * (self.perks.has('s3-dark') ? 2 : 1);
      if (self.mana < each) return false;
      self.mana -= each;
      cost += CATARACT.more * (self.perks.has('s3-dark') ? 2 : 1);
      return true;
    };

    return {
      lands: {
        // Her attack; with her unique weapon, now and then a blow more.
        attack() {
          strike(fight.basic);
          if (tier !== null && fight.roll() < CIELAMAHA.chance) fight.hit(self, atTier(CIELAMAHA.blow, tier) * 1000, false);
        },
        // The tempest (tick; its Dark: harder for each use).
        tempest() {
          tempest = TEMPEST.lasts;
          tempestTick = 0;
          if (self.perks.has('s1-dark')) {
            tempests = Math.min(PERKS.most, tempests + 1);
            put(self.statuses, { name: TEMPESTS.name, left: Infinity, count: tempests, shown: TEMPESTS });
          }
        },
        // Everlasting Oasis on her (its Light: and the ally with the highest ATK, its crit DMG higher; Heart of Flow: her crit DMG).
        oasis() {
          const lasts = OASIS.lasts - (self.perks.has('s2-dark') ? PERKS.shorter : 0);
          const top = self.perks.has('s2-light') ? allies().filter((ally) => ally !== self).sort((a, b) => b.stats.atk - a.stats.atk)[0] : undefined;
          for (const ally of top ? [self, top] : [self]) {
            const heart = ally === self ? fromTreasure(self, 1, UT.heart.critDamage) : PERKS.critDamage;
            put(ally.statuses, {
              name: OASIS_UP.name,
              left: lasts,
              mana: 1 + OASIS.mana * doubled,
              atk: (OASIS.atk * OASIS.books * doubled) / ally.stats.atk,
              bolsters: { physical: OASIS.defense * OASIS.books * doubled, magical: OASIS.defense * OASIS.books * doubled },
              ...(heart > 0 && { critDamage: heart }),
              shown: OASIS_UP,
            });
          }
        },
        // The drops: fifteen, then five great ones that stun the boss; each costs mana (its Dark: now and then a drop more).
        cataract(part) {
          if (part === 0) {
            cost = CATARACT.mana;
            return;
          }
          const great = part > 15;
          for (let i = 0; i < (self.perks.has('s3-dark') && fight.roll() < PERKS.extra ? 2 : 1); i++) {
            if (!pay()) return;
            strike(great ? CATARACT.great : CATARACT.drop);
            if (great) fight.stun(CATARACT.stun, { by: self });
          }
        },
      },
      tick(dt) {
        // Aqua Purification's Light: mana as the fight begins.
        if (!begun && fight.field.includes(self)) {
          begun = true;
          if (self.perks.has('s4-light')) self.mana = Math.min(MAX_MANA, self.mana + PERKS.mana);
        }
        // Her unique weapon: more mana every second.
        if (tier !== null) self.mana = Math.min(MAX_MANA, self.mana + atTier(CIELAMAHA.mana, tier) * dt);
        // Aqua Purification: her ATK higher, the faster her mana fills (its Dark: more to bosses; Transcend 5's Dark: higher for each section she has).
        const regen = self.manaRegen * filling([...self.statuses, ...fight.party]);
        const dark = self.perks.has('t5-dark') ? PERKS.dark * Math.floor(self.mana / SECTION) : 0;
        put(self.statuses, { name: FLOWING.name, left: Infinity, atk: purification + regen / PURIFICATION.per + dark, ...(self.perks.has('s4-dark') && { deals: 1 + PERKS.boss }), shown: FLOWING });
        if (self.perks.has('t5-dark')) put(self.statuses, { name: SURGING.name, left: Infinity, count: Math.floor(self.mana / SECTION), shown: SURGING });
        // Key of Purity: every so often, crit DMG and faster mana for a while.
        if (wearsTreasure(self, 3)) {
          key += dt;
          if (key >= UT.key.every) {
            key -= UT.key.every;
            put(self.statuses, { name: KEY.name, left: UT.key.lasts, critDamage: UT.key.critDamage, mana: 1 + fromTreasure(self, 3, UT.key.mana), shown: KEY });
          }
        }
        // Aqua Tempest: a blow every so often (its Light: the boss slowed; its Dark: harder; Whisper of Sea: the boss taking more physical damage meanwhile).
        if (tempest > 0) {
          tempest -= dt;
          tempestTick += dt;
          if (tempestTick >= TEMPEST.every) {
            tempestTick -= TEMPEST.every;
            strike(TEMPEST.blow * (1 + PERKS.tempest * tempests));
            if (self.perks.has('s1-light')) fight.slow(PERKS.slow, PERKS.slowLasts);
            if (wearsTreasure(self, 0)) put(fight.foe.statuses, { name: 'Whisper of Sea', left: TEMPEST.every * 2, takes: { physical: 1 + fromTreasure(self, 0, UT.whisper.takes) }, shown: 'curse' });
          }
        }
      },
      lit: () => tempest > 0 || self.statuses.some((status) => status.name === OASIS_UP.name),
      buffs: () => (tier !== null ? [CIELAMAHA_UP] : []),
    };
  },
};
