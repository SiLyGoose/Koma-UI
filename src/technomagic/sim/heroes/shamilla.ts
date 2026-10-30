import { put, stacked } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { fine, pct, skillArt, type Buff } from '../shown';
import type { Foe } from '../types';
import { APOLIOX, APOLIOX_UP, atTier } from '../unique';
import { bookDmg, bookHeal, CLASS_STATS, dmg, healed, type HeroDef, type Passive, played, playedHeal } from './kit';

/*
 * Shamilla's skills, as King's Raid's playtest has them (stats/shamilla.md: how hard each hits and shields at its level 90,
 * and every number here, are its; its words are live King's Raid's last, as krinfo has them: its legacy, the same kit). She
 * is an archer, the Vessel of Curses, whose blows are magical, and a debuffer: her curses are on the enemies she strikes.
 * - Curse of Petrification: a blow on 2 enemies and the curse on each for 3 seconds: its attacks slower, the more as the
 *   curse goes on (up to 600% more); as it ends, it is petrified (a stun: a boss's CC gauge takes it).
 * - Curse of Time: what helps the enemy dispelled, a blow, and the curse on it for 10 seconds: its skills' cooldowns longer
 *   at once, and longer again every 3 seconds (Fight.delay: a boss's skills, a minion's).
 * - Curse of Pain: a blow that knocks the enemy back, and the curse on it for 8 seconds: a blow of continuous DMG every
 *   0.4 seconds.
 * Her passive, The Vessel of Curses: as each battle begins, and whenever she brings an enemy down, [The Vessel of Curses]
 * for 10 seconds: a shield on her (its books' half again), CC ACC higher and immune to CC; her next skill takes it, and
 * strikes 4 enemies (its shield gone with it).
 * Her unique weapon (../unique.ts) is worked here too: every so often [The Vessel of Curses], and her ATK higher for a while.
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/shamilla.ts).
 *
 * Her own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Her unique
 * weapon is live King's Raid's too: the playtest's is a skill of its own (Curse of Apoliox), a rework. Curse of
 * Petrification's Dark takes mana the boss hasn't: it does nothing here. Curse of Time's Dark has her go for the boss
 * (the enemy with the highest ATK), when it is on the field. The Vessel of Curses's Dark's dispelling does nothing here
 * (nothing takes what helps a hero off it), but its shield is twice as much. Liberation of Curses's M.Dodge lowered does
 * nothing on an enemy that never dodges (Galgoria), nor The Jar of Curses's irremovable (nothing dispels the boss).
 * Curse of Petrification's M.Dodge lowered is Liberation of Curses's alone (the playtest's skill has it besides).
 */
/** Curse of Petrification: its targets, its blow; the curse for how long, its ATK Spd less (points), more each so often (a share, up to so many times); its petrification. */
const PETRIFY = { targets: 2, blow: played('archer', 3358, 113_521), lasts: 3, slow: 200, every: 0.2, more: 0.5, most: 12, stone: 3 };
/** Curse of Time: its blow; the curse for how long; the cooldowns longer at once, and each so often. */
const TIME = { blow: played('archer', 2663, 90_132), lasts: 10, first: 1.5, later: 1, every: 3 };
/** Curse of Pain: its blow, how long it knocks the enemy back; the curse for how long, its blow every so often. */
const PAIN = { blow: played('archer', 7422, 276_617), back: 1, lasts: 8, every: 0.4, tick: played('archer', 700) };
/** The Vessel of Curses: its shield (its books': the fight's), for how long; its CC ACC (points); how many enemies the skill it is taken by strikes. */
const VESSEL = { shield: playedHeal('archer', 4000, 136_693), lasts: 10, accuracy: 400, targets: 4 };
/**
 * Her own perks' numbers: Curse of Pain's Light's more M.DMG taken, for how long; the Vessel's Light's DMG taken without it,
 * its Dark's shield; Transcend 5's Dark's petrification and Curse of Time longer, Curse of Pain's continuous DMG higher.
 */
const PERKS = { takes: 1.25, takesLasts: 10, taken: 0.7, shield: 2, stone: 2, time: 3, pain: 0.5 };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Curse of Petrification's targets more and
 * the enemy's M.Dodge less (points), for how long; Curse of Time's cooldowns more and the enemy's M.DEF less, for how long;
 * Curse of Pain's DMG; the Vessel's share off her cooldowns, and her DEF more, for how long.
 */
const UT = {
  liberation: { targets: 1, dodge: [120, 140, 170, 210, 250, 300], lasts: 10 },
  heart: { later: 0.7, defense: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 },
  jar: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
  primal: { cooldown: [0.12, 0.14, 0.17, 0.21, 0.25, 0.3], defense: 1.5, lasts: 5 },
};

const art = skillArt('shamilla');

const VESSEL_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'The Vessel of Curses',
    about: `Passive. As each battle begins, and whenever she brings an enemy down: [The Vessel of Curses] for ${VESSEL.lasts} seconds, a shield on her, +${VESSEL.accuracy} CC ACC and immune to CC. Her next skill takes it, and strikes ${VESSEL.targets} enemies.`,
    icon: '⚱️',
    art: art(3),
  },
  words: `At the beginning of each battle or whenever self kills an enemy, obtains 'The Vessel of Curses' and creates an irremovable Shield that absorbs ${healed('archer', VESSEL.shield, bookHeal('shamilla', 3))} DMG for ${VESSEL.lasts} sec upon self. For the duration of the Shield, increases CC ACC by ${VESSEL.accuracy}, gains immunity to CC, and upon using a Skill, consumes 'The Vessel of Curses' to change the number of targets to ${VESSEL.targets} enemies.`,
};
const VESSELED: Buff = { name: 'The Vessel of Curses', about: 'A shield, CC ACC higher and immune to CC; her next skill takes it, and strikes more enemies.', icon: '⚱️', art: art(3) };
const PRIMAL: Buff = { name: 'Primal Curse', about: 'All DEF higher.', icon: '⚱️', art: art(3) };
/** What her curses leave on an enemy: shown under its health. */
const CURSES = { petrify: 'Curse of Petrification', time: 'Curse of Time', pain: 'Curse of Pain', weak: 'Curse of Pain (Light)', liberation: 'Liberation of Curses', heart: 'Ancient Demon’s Heart' };

export const SHAMILLA: HeroDef = {
  id: 'shamilla',
  name: 'Shamilla',
  class: 'archer',
  skins: ['Shamilla', 'Shamilla_Summer', 'Shamilla_Halloween', 'Shamilla_Wedding', 'Shamilla_Casual', 'Shamilla_School', 'Shamilla_Glory', 'Shamilla_Glory2'],
  // An archer whose blows are magical (her curses'): as her class stands, otherwise.
  stats: { ...CLASS_STATS.archer, deals: 'magical' },
  abilities: [
    {
      name: 'Curse of Petrification',
      about: `A blow on ${PETRIFY.targets} enemies, and [Curse of Petrification] on each for ${PETRIFY.lasts} seconds: its attacks ${PETRIFY.slow} ATK Spd slower, the more as it goes on (up to ${pct(PETRIFY.more * PETRIFY.most)} more); as it ends, it is petrified for ${PETRIFY.stone} seconds.`,
      words: `Attacks ${PETRIFY.targets} enemies, dealing ${dmg('archer', PETRIFY.blow, bookDmg('shamilla', 0))} M.DMG and inflicting irremovable 'Curse of Petrification' for ${PETRIFY.lasts} sec. Enemies under the 'Curse of Petrification' have their ATK Spd reduced by ${PETRIFY.slow}, and this effect grows stronger up to max ${pct(PETRIFY.more * PETRIFY.most)} as time passes. When the duration of 'Curse of Petrification' expires, petrifies the target for ${PETRIFY.stone} sec.`,
      icon: '🗿',
      art: art(0),
      move: 'petrify',
      cooldown: 12,
      cost: 2,
    },
    {
      name: 'Curse of Time',
      about: `What helps the enemy dispelled, a blow, and [Curse of Time] on it for ${TIME.lasts} seconds: its skills' cooldowns ${TIME.first} seconds longer, and ${TIME.later} more every ${TIME.every} seconds.`,
      words: `Attacks an enemy, dispelling positive effects from the target, dealing ${dmg('archer', TIME.blow, bookDmg('shamilla', 1))} M.DMG, and inflicting 'Curse of Time' for ${TIME.lasts} sec which increases Cooldown of all Skills by ${TIME.first} sec. Every ${TIME.every} sec, an enemy under the 'Curse of Time' state has its Cooldown of all Skills increased by ${TIME.later} sec.`,
      icon: '⏳',
      art: art(1),
      move: 'timecurse',
      cooldown: 18,
      cost: 2,
    },
    {
      name: 'Curse of Pain',
      about: `A blow that knocks the enemy back, and [Curse of Pain] on it for ${PAIN.lasts} seconds: a blow of continuous DMG every ${PAIN.every} seconds.`,
      words: `Attacks an enemy to deal ${dmg('archer', PAIN.blow, bookDmg('shamilla', 2))} M.DMG and inflict Knockback. Additionally, inflicts Curse of Pain for ${PAIN.lasts} sec, dealing a total of ${dmg('archer', (PAIN.tick * PAIN.lasts) / PAIN.every, bookDmg('shamilla', 2))} M.DMG over time.`,
      icon: '🩸',
      art: art(2),
      move: 'pain',
      cooldown: 9,
      cost: 3,
    },
  ],
  passive: VESSEL_SHOWN,
  treasures: [
    treasure('Liberation of Curses', (k) => ({
      words: `[Curse of Petrification] Increases the number of targets by ${UT.liberation.targets}, and for ${UT.liberation.lasts} sec, reduces the target's M.Dodge by ${k(UT.liberation.dodge)}.`,
    })),
    treasure('Ancient Demon’s Heart', (k) => ({
      words: `[Curse of Time] Additionally increases Cooldown by ${UT.heart.later} sec and reduces M.DEF of the target by ${fine(k(UT.heart.defense))} for ${UT.heart.lasts} sec.`,
    })),
    treasure('The Jar of Curses', (k) => ({
      words: `[Curse of Pain] Increases DMG by ${fine(k(UT.jar.dmg))}, and continuous DMG becomes irremovable.`,
      skill: { index: 2, dmg: 1 + k(UT.jar.dmg) },
    })),
    treasure('Primal Curse', (k) => ({
      words: `[The Vessel of Curses] Upon gaining The Vessel of Curses, reduces self's Cooldown of all Skills by ${fine(k(UT.primal.cooldown))}, and increases All DEF by ${pct(UT.primal.defense - 1)} for ${UT.primal.lasts} sec. The DEF Boost effect is irremovable.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, cooldown: -3 } }, ({ skill }) => `Reduces Cooldown by ${-skill.cooldown} sec.`),
    's1-dark': { words: "Reduces hit enemy's Mana by 1000." },
    's2-light': said({ skill: { index: 1, cost: -1 } }, ({ skill }) => `Reduces Mana Cost by ${-skill.cost}.`),
    's2-dark': { words: 'Changes the target to the enemy with the highest ATK.' },
    's3-light': { words: `Increases M.DMG the target takes by ${pct(PERKS.takes - 1)} for ${PERKS.takesLasts} sec.` },
    's3-dark': said({ skill: { index: 2, dmg: 1.4 } }, ({ skill }) => `Increases DMG by ${pct(skill.dmg - 1)}.`),
    's4-light': { words: `Reduces DMG taken by ${pct(1 - PERKS.taken)} when not owning [The Vessel of Curses].` },
    's4-dark': { words: `[The Vessel of Curses] can now be dispelled, but the Shield increases by ${pct(PERKS.shield - 1)}.` },
    't5-light': t5Light({ speed: 100 }, ({ speed }) => `ATK Spd +${speed}`),
    't5-dark': {
      words: `All effects of curse are enhanced.\n[Curse of Petrification] Petrification duration is increased by ${PERKS.stone} sec.\n[Curse of Time] Curse of Time duration is increased by ${PERKS.time} sec.\n[Curse of Pain] Curse of Pain DOT is increased by ${pct(PERKS.pain)}.`,
    },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    const dark = self.perks.has('t5-dark');
    /**
     * Her curses on each enemy: Curse of Petrification's time left; Curse of Time's, and toward its next delay; Curse of
     * Pain's, and toward its next blow.
     */
    const petrified = new Map<Foe, number>();
    const timed = new Map<Foe, { left: number; every: number }>();
    const pained = new Map<Foe, { left: number; every: number }>();
    /**
     * [The Vessel of Curses]: how long yet, and what of her shield is its; whether the skill she is using took it (and so
     * strikes more enemies); one to come (an enemy brought down); the battle it was last given for; toward her unique
     * weapon's next.
     */
    let vessel = 0;
    let shielded = 0;
    let wide = false;
    let coming = false;
    let wave = 0;
    let apoliox = 0;

    /** The enemies standing, on the field. */
    const standing = (): Foe[] => fight.foes.filter((foe) => foe.hp > 0 && !foe.away);
    /** So many enemies a skill strikes: the one in question (`first`, when it says), and others standing at random; with the Vessel taken, its. */
    const struck = (count: number, first: Foe = fight.foe): Foe[] => {
      const others = standing().filter((foe) => foe !== first);
      const out = [first];
      for (let n = wide ? VESSEL.targets : count; out.length < n && others.length > 0; ) out.push(others.splice(Math.floor(fight.roll() * others.length), 1)[0] as Foe);
      return out;
    };
    /** A blow of hers on an enemy (`seeping`: her curse's continuous DMG): one it brings down, the Vessel again (as the next moment comes). */
    const strike = (foe: Foe, amount: number, seeping = false): void => {
      const was = foe.hp;
      fight.on(foe, () => (seeping ? fight.continuous(self, amount) : fight.hit(self, amount)));
      if (was > 0 && foe.hp <= 0) coming = true;
    };
    /**
     * [The Vessel of Curses]: a shield on her (its Dark: more), CC ACC higher and immune to CC (Primal Curse: her cooldowns
     * shorter, and her DEF higher a while).
     */
    const gain = (): void => {
      const before = self.shield;
      fight.shield(self, VESSEL.shield * (self.perks.has('s4-dark') ? PERKS.shield : 1), VESSEL.lasts, self);
      shielded = self.shield - before;
      vessel = VESSEL.lasts;
      put(self.statuses, { name: VESSELED.name, left: VESSEL.lasts, guards: true, accuracy: VESSEL.accuracy, shown: VESSELED });
      if (!wearsTreasure(self, 3)) return;
      const sooner = fromTreasure(self, 3, UT.primal.cooldown);
      self.abilities.forEach((ability, i) => {
        self.cooldowns[i] = Math.max(0, (self.cooldowns[i] as number) - ability.cooldown * sooner);
      });
      put(self.statuses, { name: PRIMAL.name, left: UT.primal.lasts, defends: UT.primal.defense, shown: PRIMAL });
    };
    /** The Vessel taken (by a skill): gone, and its shield with it (what is left of it: what of her shield is its, at most). */
    const take = (): void => {
      vessel = 0;
      self.shield = Math.max(0, self.shield - Math.min(self.shield, shielded));
      shielded = 0;
      self.statuses = self.statuses.filter((status) => status.name !== VESSELED.name);
    };
    /**
     * Curse of Petrification's ATK Spd less on an enemy, so far into it (its stacks of more, each so often). (King's Raid's
     * grows stronger every 0.2 seconds; here a step every 3 stacks, so that the page's hourglass doesn't play every moment.)
     */
    const slowing = (left: number): number => {
      const stacks = 3 * Math.floor(Math.min(PETRIFY.most, Math.floor((PETRIFY.lasts - left) / PETRIFY.every)) / 3);
      // (As King's Raid's attack speed: a share less, less than 50% less ever nearer all of it.)
      return 1000 * (1 - stacked([1 - (PETRIFY.slow / 1000) * (1 + PETRIFY.more * stacks)]));
    };
    /** Curse of Pain's continuous DMG, as hard as its skill's power has it (its books, its perks, Transcend 5's Dark: added up), the fight giving it its books' on the whole. */
    const painPower = (bookDmg('shamilla', 2) + (self.moveDmg.pain ?? 1) - 1 + (dark ? PERKS.pain : 0)) / bookDmg('shamilla', 2);
    /** Curse of Pain's Light: the enemy taking more M.DMG for a while. */
    const weaken = (foe: Foe): void => {
      if (self.perks.has('s3-light')) put(foe.statuses, { name: CURSES.weak, left: PERKS.takesLasts, takes: { magical: PERKS.takes }, shown: 'curse' });
    };

    return {
      lands: {
        // Her attack.
        attack() {
          fight.hit(self, fight.basic);
        },
        // A blow on 2 enemies (Liberation of Curses: 3, and their M.Dodge lower), each its attacks slower for a while; petrified as it ends (tick).
        petrify() {
          const dodge = fromTreasure(self, 0, UT.liberation.dodge);
          for (const foe of struck(PETRIFY.targets + (wearsTreasure(self, 0) ? UT.liberation.targets : 0))) {
            strike(foe, PETRIFY.blow);
            if (foe.hp <= 0) continue;
            petrified.set(foe, PETRIFY.lasts);
            put(foe.statuses, { name: CURSES.petrify, left: PETRIFY.lasts, shown: 'slow' });
            fight.on(foe, () => fight.slow(slowing(PETRIFY.lasts), PETRIFY.lasts));
            if (dodge > 0) put(foe.statuses, { name: CURSES.liberation, left: UT.liberation.lasts, dodges: { magical: -dodge }, shown: 'curse' });
          }
        },
        // What helps the enemy dispelled, a blow, and the curse: its cooldowns longer (Ancient Demon's Heart: the more, and its M.DEF lower).
        // (Its Dark: the boss, when it is on the field, the enemy with the highest ATK.)
        timecurse() {
          const first = self.perks.has('s2-dark') && fight.boss.hp > 0 && !fight.boss.away ? fight.boss : fight.foe;
          const lasts = TIME.lasts + (dark ? PERKS.time : 0);
          for (const foe of struck(1, first)) {
            for (let i = foe.statuses.length - 1; i >= 0; i--) if ((foe.statuses[i]?.deals ?? 1) > 1) foe.statuses.splice(i, 1);
            strike(foe, TIME.blow);
            if (foe.hp <= 0) continue;
            timed.set(foe, { left: lasts, every: 0 });
            put(foe.statuses, { name: CURSES.time, left: lasts, shown: 'curse' });
            fight.on(foe, () => fight.delay(TIME.first + (wearsTreasure(self, 1) ? UT.heart.later : 0)));
            if (wearsTreasure(self, 1)) put(foe.statuses, { name: CURSES.heart, left: UT.heart.lasts, defends: { magical: 1 - fromTreasure(self, 1, UT.heart.defense) }, shown: 'curse' });
          }
        },
        // A blow that knocks the enemy back, and the curse: continuous DMG a while (tick; its Light: the enemy taking more M.DMG).
        pain() {
          for (const foe of struck(1)) {
            strike(foe, PAIN.blow);
            if (foe.hp <= 0) continue;
            fight.on(foe, () => fight.stun(PAIN.back, { down: true, by: self }));
            pained.set(foe, { left: PAIN.lasts, every: 0 });
            put(foe.statuses, { name: CURSES.pain, left: PAIN.lasts, shown: 'venom' });
            weaken(foe);
          }
        },
      },
      // A skill used with the Vessel takes it: it strikes more enemies.
      used() {
        wide = vessel > 0;
        if (wide) take();
      },
      tick(dt) {
        const on = fight.field.includes(self) && self.hp > 0;
        // The Vessel: as each battle begins, and after she has brought an enemy down.
        if (on && fight.wave !== wave) {
          wave = fight.wave;
          coming = true;
        }
        if (on && coming) {
          coming = false;
          gain();
        }
        if (vessel > 0) {
          vessel -= dt;
          if (vessel <= 0) shielded = 0;
        }
        // Her unique weapon: every so often the Vessel, and her ATK higher a while.
        if (on && tier !== null) {
          apoliox += dt;
          if (apoliox >= atTier(APOLIOX.every, tier)) {
            apoliox -= atTier(APOLIOX.every, tier);
            gain();
            put(self.statuses, { name: APOLIOX_UP.name, left: APOLIOX.lasts, atk: atTier(APOLIOX.atk, tier), shown: APOLIOX_UP });
          }
        }
        // Curse of Petrification: the enemy slower as it goes on; as it ends, petrified (Transcend 5's Dark: longer).
        for (const [foe, left] of petrified) {
          if (foe.hp <= 0 || foe.away) {
            petrified.delete(foe);
            continue;
          }
          const now = left - dt;
          if (now > 0) {
            petrified.set(foe, now);
            if (slowing(now) !== slowing(left)) fight.on(foe, () => fight.slow(slowing(now), now));
            continue;
          }
          petrified.delete(foe);
          fight.on(foe, () => fight.stun(PETRIFY.stone + (dark ? PERKS.stone : 0), { by: self }));
        }
        // Curse of Time: the enemy's cooldowns longer every so often.
        for (const [foe, curse] of timed) {
          curse.left -= dt;
          curse.every += dt;
          if (curse.every >= TIME.every) {
            curse.every -= TIME.every;
            fight.on(foe, () => fight.delay(TIME.later));
          }
          if (curse.left <= 0 || foe.hp <= 0 || foe.away) timed.delete(foe);
        }
        // Curse of Pain: its continuous DMG every so often (each blow of it its Light's again).
        for (const [foe, curse] of pained) {
          curse.left -= dt;
          curse.every += dt;
          if (curse.every >= PAIN.every && foe.hp > 0 && !foe.away) {
            curse.every -= PAIN.every;
            strike(foe, PAIN.tick * painPower, true);
            weaken(foe);
          }
          if (curse.left <= 0 || foe.hp <= 0 || foe.away) pained.delete(foe);
        }
      },
      // The Vessel's Light: less taken without it.
      takes: () => (self.perks.has('s4-light') && vessel <= 0 ? PERKS.taken : 1),
      lit: () => vessel > 0,
    };
  },
};
