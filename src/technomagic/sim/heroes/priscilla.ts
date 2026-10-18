import { away, put } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, treasureTier } from '../treasures';
import { num, pct, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { atTier, EXCILIUS, EXCILIUS_UP } from '../unique';
import { attackStarts, bookDmg, CLASS_STATS, dmg, type HeroDef, type Passive, played } from './kit';

/*
 * Priscilla's skills, as King's Raid's playtest has them (stats/priscilla.md: how hard each hits at its level 90, and every
 * number here, are its; its words are its own, kingsraid.shodyra.com's where it has none). She is a warrior, the Maid of Steel.
 * - Vital Strike: a blow that is always critical, and stuns the boss a moment.
 * - Coordination: what the boss has left on her and the 3 allies with the highest ATK cleared, and [Assault] on them all
 *   for a while: ATK higher by a share of hers and more (its books' half again).
 * - Turbulent Dance: a great blow; under [Assault], the boss takes more physical damage for a while.
 * Her passive, Weapon Mastery: her ATK and penetration higher (its books': ATK more, and crit DMG).
 * Her unique weapon (../unique.ts) is worked here too: each of Vital Strike's and Turbulent Dance's blows takes time off
 * that skill's cooldown and quickens her for a while (up to 10 times).
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/priscilla.ts).
 *
 * Her own perks (../perks.ts) are King's Raid's. Turbulent Dance's Dark (one enemy) always holds. Coordination's Dark has
 * each part of her attack under [Assault] leave the boss taking more for a moment.
 */
/** Vital Strike: its blow (always critical), and how long it stuns the boss. */
const VITAL = { blow: played('warrior', 3065, 134_121), stun: 0.6 };
/** Coordination: how many allies (her besides), how long [Assault] lasts, and the ATK it gives: a share of hers and flat, its books' half again. */
const COORDINATION = { allies: 3, lasts: 10, share: 0.1, flat: 11_799, books: 1.5 };
/** Turbulent Dance: its blow; under [Assault], the boss's more physical damage taken, and for how long. */
const DANCE = { blow: played('warrior', 4998, 169_317), takes: 1.4, lasts: 10 };
/** Weapon Mastery: her ATK more (flat, its books' a quarter again), her penetration, and its last book's crit DMG. */
const MASTERY = { atk: 41_200, books: 1.25, pen: 160, critDamage: 0.16 };
/** Her own perks' numbers: Vital Strike's Light's stun and Dark's crit DMG; Coordination's Light's longer [Assault] and Dark's more taken for a moment; Turbulent Dance's Light's share off its cooldown; Weapon Mastery's Light's more ATK; Transcend 5's Dark's share of her ATK and P.DEF for every ally. */
const PERKS = { stun: 1.8, critDamage: 1.5, lasts: 15, takes: 1.25, sooner: 0.1, atk: 1.4, dark: 0.03 };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Vital Strike's more DMG and the boss's
 * lower P.Block; Coordination's more ATK and the share off the highest ATK ally's cooldowns; Turbulent Dance's more DMG
 * and its stun; Weapon Mastery's more ATK and her DEF more.
 */
const UT = {
  weight: { dmg: 0.5, block: [240, 290, 350, 420, 500], lasts: 10 },
  tea: { atk: [0.24, 0.29, 0.35, 0.42, 0.5], cooldown: 0.3 },
  stone: { dmg: [0.24, 0.29, 0.35, 0.42, 0.5], stun: 3 },
  turbulence: { atk: 0.5, defense: [0.12, 0.14, 0.17, 0.21, 0.25] },
};

const art = skillArt('priscilla');

const MASTERED: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Weapon Mastery', about: `Passive. ATK +${num(Math.round(MASTERY.atk * MASTERY.books))} and penetration +${MASTERY.pen}; crit DMG +${pct(MASTERY.critDamage)}.`, icon: '🗡️', art: art(3) },
  words: `Increases ATK by ${num(Math.round(MASTERY.atk * MASTERY.books))} and DEF Penetration by ${MASTERY.pen}. Crit DMG is increased by ${pct(MASTERY.critDamage)}.`,
};
const ASSAULT: Buff = { name: 'Assault', about: 'ATK higher by a share of Priscilla’s and more.', icon: '🤝', art: art(1) };
const DANCED: Buff = { name: 'Turbulent Dance', about: 'Takes more physical damage.', icon: '🌪️', art: art(2) };
const STEADY: Buff = { name: 'Beginning of Turbulence', about: 'DEF higher.', icon: '🛡️', art: art(3) };
const SHARED: Buff = { name: 'Maid of Steel', about: 'ATK and P.DEF higher by a share of Priscilla’s.', icon: '🗡️', art: art(3) };
const EXPOSED: Buff = { name: 'Coordinated Strike', about: 'Takes more.', icon: '🤝', art: art(1) };

export const PRISCILLA: HeroDef = {
  id: 'priscilla',
  name: 'Priscilla',
  class: 'warrior',
  skins: ['Priscilla'],
  // A warrior; her passive's penetration and crit DMG (its ATK is her part's: a share of her own as the fight begins).
  stats: { ...CLASS_STATS.warrior, deals: 'physical', pen: CLASS_STATS.warrior.pen + MASTERY.pen, critDamage: CLASS_STATS.warrior.critDamage + MASTERY.critDamage },
  abilities: [
    {
      name: 'Vital Strike',
      about: `A blow that is always critical, and stuns the boss for ${VITAL.stun} seconds.`,
      words: `Deals ${dmg('warrior', VITAL.blow, bookDmg('priscilla', 0))} P.DMG to enemies in a frontal area and stuns them for ${VITAL.stun} sec. This attack is guaranteed to Crit.`,
      icon: '🗡️',
      art: art(0),
      move: 'vital',
      cooldown: 8,
      cost: 2,
    },
    {
      name: 'Coordination',
      auto: { keeps: ASSAULT.name },
      about: `What the boss has left on her and the ${COORDINATION.allies} allies with the highest ATK cleared, and [Assault] on them all for ${COORDINATION.lasts} seconds: ATK higher by ${pct(COORDINATION.share * COORDINATION.books)} of hers and ${num(Math.round(COORDINATION.flat * COORDINATION.books))}.`,
      words: `Removes negative effects from self and ${COORDINATION.allies} allies with the highest ATK, and grants [Assault] for ${COORDINATION.lasts} sec.\n[Assault]: Increases ATK by ${pct(COORDINATION.share * COORDINATION.books)} of Priscilla’s ATK + ${num(Math.round(COORDINATION.flat * COORDINATION.books))}.`,
      icon: '🤝',
      art: art(1),
      move: 'coordination',
      cooldown: 15,
      cost: 3,
    },
    {
      name: 'Turbulent Dance',
      about: `A great blow. Under [Assault], the boss takes ${pct(DANCE.takes - 1)} more physical damage for ${DANCE.lasts} seconds.`,
      words: `Deals ${dmg('warrior', DANCE.blow, bookDmg('priscilla', 2))} P.DMG to enemies in a circular area and pulls them toward self. If under [Assault], increases P.DMG taken by ${pct(DANCE.takes - 1)} for ${DANCE.lasts} sec.`,
      icon: '🌪️',
      art: art(2),
      move: 'turbulent',
      cooldown: 20,
      cost: 4,
    },
  ],
  passive: MASTERED,
  treasures: [
    treasure('Weight of Fierce Attack', (k) => ({
      words: `[Vital Strike] Increases DMG by ${pct(UT.weight.dmg)}, and for ${UT.weight.lasts} sec, reduces the target's P.Block chance by ${k(UT.weight.block)}.`,
      skill: { index: 0, dmg: 1 + UT.weight.dmg, mark: { name: 'Weight of Fierce Attack', lasts: UT.weight.lasts, blocks: { physical: -k(UT.weight.block) } } },
    })),
    treasure('Fancy Tea Set', (k) => ({
      words: `[Coordination] Increases ATK Boost by ${pct(k(UT.tea.atk))} and reduces Cooldown of the Hero with the highest ATK by ${pct(UT.tea.cooldown)}.`,
    })),
    treasure('Magical Stone of Gravity', (k) => ({
      words: `[Turbulent Dance] DMG is increased by ${pct(k(UT.stone.dmg))} and target is inflicted by Stun for ${UT.stone.stun} sec.`,
      skill: { index: 2, dmg: 1 + k(UT.stone.dmg) },
    })),
    treasure('Beginning of Turbulence', (k) => ({
      words: `[Weapon Mastery] Increases ATK boost by ${pct(UT.turbulence.atk)} and All DEF for self by ${pct(k(UT.turbulence.defense))}.`,
    })),
  ],
  perks: {
    's1-light': { words: `Changes Stun duration to ${PERKS.stun} sec.` },
    's1-dark': { words: `The guaranteed Critical Hit effect is removed, but Critical DMG is increased by ${pct(PERKS.critDamage)}.` },
    's2-light': said({ skill: { index: 1, cost: 1 } }, ({ skill }) => `Increases Mana Cost by ${skill.cost}, but increases duration by ${PERKS.lasts - COORDINATION.lasts} sec.`),
    's2-dark': { words: `While in [Assault], on Normal Attack, increases the target’s DMG taken by ${pct(PERKS.takes - 1)} for 1 sec.` },
    's3-light': { words: `On a Critical Hit, cooldown is reduced by ${pct(PERKS.sooner)}.` },
    's3-dark': said({ skill: { index: 2, dmg: 2 } }, ({ skill }) => `When there is only 1 enemy, damage increases by ${pct(skill.dmg - 1)}.`),
    's4-light': { words: `Attack increase amount is increased by ${pct(PERKS.atk - 1)}.` },
    's4-dark': said({ bonus: { crit: 250 } }, ({ bonus }) => `Crit Chance is increased by ${bonus.crit}.`),
    't5-light': t5Light({ resist: 100 }, ({ resist }) => `CC Resist +${resist}`),
    't5-dark': { words: `Increases all allies’ Attack by ${pct(PERKS.dark)} of your Attack, and increases all allies’ Physical Defense by ${pct(PERKS.dark)} of your Physical Defense.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    const starts = attackStarts('priscilla');
    /** Her unique weapon's attack speed stacks, and how long they last yet. */
    let quick = 0;
    let quickLeft = 0;
    /** Her allies on the field, standing and in the fight (her too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** Her Weapon Mastery's ATK: a share of her own, as the fight begins (its Light, and Beginning of Turbulence: more). */
    const mastery = (MASTERY.atk * MASTERY.books * (self.perks.has('s4-light') ? PERKS.atk : 1) * (treasureTier(self, 3) > 0 ? 1 + UT.turbulence.atk : 1)) / self.stats.atk;
    put(self.statuses, { name: MASTERED.shown.name, left: Infinity, atk: mastery, ...(treasureTier(self, 3) > 0 && { defends: 1 + fromTreasure(self, 3, UT.turbulence.defense) }), shown: treasureTier(self, 3) > 0 ? STEADY : MASTERED.shown });
    const assaulted = (): boolean => self.statuses.some((status) => status.name === ASSAULT.name);
    /** Her unique weapon: a skill's blow off its cooldown, and a stack of attack speed. */
    const excilius = (index: number): void => {
      if (tier === null) return;
      self.cooldowns[index] = Math.max(0, (self.cooldowns[index] ?? 0) - atTier(EXCILIUS.sooner, tier));
      quick = Math.min(EXCILIUS.most, quick + 1);
      quickLeft = EXCILIUS.lasts;
      put(self.statuses, { name: EXCILIUS_UP.name, left: EXCILIUS.lasts, count: quick, speed: EXCILIUS.speed * quick, shown: EXCILIUS_UP });
    };

    return {
      lands: {
        // Her attack (Coordination's Dark: under [Assault], each part of it leaving the boss taking more for a moment).
        attack(part) {
          fight.hit(self, fight.basic);
          if (starts.has(part) && self.perks.has('s2-dark') && assaulted()) put(fight.foe.statuses, { name: EXPOSED.name, left: 1, takes: PERKS.takes, shown: 'curse' });
        },
        // Always critical (its Dark: not always, but harder), and the boss stunned (its Light: longer).
        vital() {
          const sure = !self.perks.has('s1-dark');
          put(self.statuses, { name: 'Vital Strike', left: 0.01, ...(sure ? { crit: 1 } : { critDamage: PERKS.critDamage }), shown: MASTERED.shown });
          fight.hit(self, VITAL.blow);
          self.statuses = self.statuses.filter((status) => status.name !== 'Vital Strike');
          fight.stun(self.perks.has('s1-light') ? PERKS.stun : VITAL.stun, { by: self });
          excilius(0);
        },
        // [Assault] on her and the allies with the highest ATK, what the boss left on them cleared.
        coordination() {
          const on = [self, ...allies().filter((ally) => ally !== self).sort((a, b) => b.stats.atk - a.stats.atk).slice(0, COORDINATION.allies)];
          fight.cue(self, 'coordination', on);
          const lasts = self.perks.has('s2-light') ? PERKS.lasts : COORDINATION.lasts;
          const more = 1 + fromTreasure(self, 1, UT.tea.atk);
          for (const ally of on) {
            ally.statuses = ally.statuses.filter((status) => status.shown.harmful !== true || status.binds === true);
            const atk = ((COORDINATION.share * self.stats.atk + COORDINATION.flat) * COORDINATION.books * more) / ally.stats.atk;
            put(ally.statuses, { name: ASSAULT.name, left: lasts, atk, shown: ASSAULT });
          }
          // (Fancy Tea Set: the ally with the highest ATK's cooldowns shorter.)
          const top = on.filter((ally) => ally !== self)[0];
          if (top && treasureTier(self, 1) > 0) top.cooldowns = top.cooldowns.map((left) => left * (1 - UT.tea.cooldown));
        },
        // A great blow; under [Assault], the boss takes more physical damage. Its Light: a critical one, its cooldown shorter.
        turbulent() {
          const critical = fight.hit(self, DANCE.blow);
          if (assaulted()) put(fight.foe.statuses, { name: DANCED.name, left: DANCE.lasts, takes: { physical: DANCE.takes }, shown: 'curse' });
          if (treasureTier(self, 2) > 0) fight.stun(UT.stone.stun, { by: self });
          excilius(2);
          if (critical && self.perks.has('s3-light')) self.cooldowns[2] = (self.cooldowns[2] ?? 0) * (1 - PERKS.sooner);
        },
      },
      tick(dt) {
        if (quickLeft > 0) {
          quickLeft -= dt;
          if (quickLeft <= 0) quick = 0;
        }
        // Transcend 5's Dark: every ally's ATK and P.DEF higher by a share of hers, while she is there.
        if (!self.perks.has('t5-dark')) return;
        const there = fight.field.includes(self) && self.hp > 0 && !away(self.statuses);
        for (const ally of fight.fighters) {
          if (!there || ally === self) ally.statuses = ally.statuses.filter((status) => status.name !== SHARED.name);
          else put(ally.statuses, { name: SHARED.name, left: Infinity, atk: (PERKS.dark * self.stats.atk) / ally.stats.atk, bolsters: { physical: PERKS.dark * self.stats.physical }, shown: SHARED });
        }
      },
      lit: () => assaulted(),
    };
  },
};
