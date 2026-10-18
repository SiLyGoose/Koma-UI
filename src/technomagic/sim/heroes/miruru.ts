import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA } from '../rules';
import { fromTreasure, treasure, treasureTier } from '../treasures';
import { pct, skillArt, type Buff } from '../shown';
import { atTier, LEVIATHAN } from '../unique';
import { attackStarts, bookDmg, CLASS_STATS, dmg, type HeroDef, type Passive, played } from './kit';

/*
 * Miruru's skills, as King's Raid's playtest has them (stats/miruru.md: how hard each hits at its level 90, and every number
 * here, are its; its words are its own, in English). She is a mechanic, the Cursed Pirate Empress.
 * - Baaaam!: a great blow that knocks the boss back (and counts as her attack: Boooooom! fires with it).
 * - Roll Over: three blows, each knocking the boss down a moment and leaving it taking more physical damage (up to 3 times).
 * - Miruru Pirates!: five blows, each slowing the boss's attacks for a while, and each a blow more on a Non-Hero enemy.
 * Her passive, Boooooom!: each part of her attack (and Baaaam!) fires a shell more, which raises her ATK a little for a
 * while (up to 100 times).
 * Her unique weapon (../unique.ts) is worked here too: now and then a shell of Boooooom! deals a blow more and leaves the
 * boss taking more physical damage for a while.
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/miruru.ts).
 *
 * Her own perks (../perks.ts) are King's Raid's. Baaaam!'s Light (one enemy) always holds.
 */
/** Baaaam!: its blow, and how long it knocks the boss back. */
const BAAM = { blow: played('mechanic', 3000, 178_118), back: 1 };
/** Roll Over: each of its three blows, how long each knocks the boss down, and the more physical damage each leaves (up to `most`, for `lasts` seconds). */
const ROLL = { blow: played('mechanic', 2000, 89_055), down: 1, takes: 0.08, most: 3, lasts: 7 };
/** Miruru Pirates!: each of its five blows, its blow more on a Non-Hero enemy, and the boss's attack speed less (points), for how long. */
const PIRATES = { blow: played('mechanic', 1220, 54_293), boss: played('mechanic', 1482, 66_092), slow: 120, lasts: 8 };
/** Boooooom!: its shell, and the ATK each gives (a share, up to `most`, for `lasts` seconds). */
const BOOM = { blow: played('mechanic', 561, 25_101), atk: 0.005, most: 100, lasts: 10 };
/** Her own perks' numbers: Baaaam!'s Dark's ATK, for how long; Roll Over's Dark's share off its cooldown for each blow; Miruru Pirates!'s Light's DMG, and its Dark's (and Boooooom!'s) less DMG for twice the blows, and the Dark's slowing; Boooooom!'s Light's stun chance; Transcend 5's Dark's stacks, and [Rampage]'s attack speed and ATK, for how long. */
const PERKS = { atk: 0.5, atkLasts: 4, sooner: 0.08, pirates: 1.2, halved: 0.7, slow: 400, slowLasts: 10, stun: { chance: 0.15, lasts: 1 }, dark: { needs: 50, speed: 480, atk: 0.25, lasts: 10 } };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Baaaam!'s lower P.Crit Resistance on the
 * boss; Roll Over's more DMG for each use (up to 10) and mana on a critical blow; Miruru Pirates!'s more DMG and shorter
 * cooldown; Boooooom!'s more DMG and attack speed as it fires.
 */
const UT = {
  coin: { critTaken: [240, 290, 350, 420, 500], lasts: 10 },
  sextant: { dmg: [0.048, 0.058, 0.07, 0.084, 0.1], most: 10, mana: 120 },
  cannonball: { dmg: 0.5, cooldown: [0.14, 0.17, 0.21, 0.25, 0.3] },
  keg: { dmg: 0.5, speed: [240, 290, 350, 420, 500], lasts: 3 },
};

const art = skillArt('miruru');

const BOOM_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Boooooom!', about: `Passive. Each part of her attack (and Baaaam!) fires a shell more, each +${pct(BOOM.atk)} ATK for ${BOOM.lasts} seconds (up to ${BOOM.most} times).`, icon: '💥', art: art(3) },
  words: `Upon a normal attack, fires an extra shell, dealing ${dmg('mechanic', BOOM.blow, bookDmg('miruru', 3))} additional P.DMG to all enemies and increasing ATK by ${pct(BOOM.atk)} for ${BOOM.lasts} sec. The ATK boost stacks up to ${BOOM.most} times and is irremovable.`,
};
const BOOMED: Buff = { name: 'Boooooom!', about: 'ATK higher for each.', icon: '💥', art: art(3) };
const FIRED: Buff = { name: 'Baaaam!', about: 'ATK higher.', icon: '💥', art: art(0) };
const KEG: Buff = { name: 'Turtle Gunpowder Keg', about: 'Attack speed higher.', icon: '🛢️', art: art(3) };
const SEXTANT: Buff = { name: 'Pirate King’s Sextant', about: 'Roll Over deals more for each.', icon: '🧭', art: art(1) };
const RAMPAGE: Buff = { name: 'Rampage', about: 'Attack speed and ATK higher.', icon: '🏴‍☠️', art: art(3) };

export const MIRURU: HeroDef = {
  id: 'miruru',
  name: 'Miruru',
  class: 'mechanic',
  skins: ['Miruru'],
  stats: { ...CLASS_STATS.mechanic, deals: 'physical' },
  abilities: [
    {
      name: 'Baaaam!',
      about: `A great blow that knocks the boss back; it counts as her attack (Boooooom! fires with it).`,
      words: `Deals ${dmg('mechanic', BAAM.blow, bookDmg('miruru', 0))} P.DMG to all enemies and pushes them back. This skill counts as a normal attack.`,
      icon: '💥',
      art: art(0),
      move: 'baam',
      cooldown: 8,
      cost: 2,
    },
    {
      name: 'Roll Over',
      about: `Three blows, each knocking the boss down for ${ROLL.down} second and leaving it taking ${pct(ROLL.takes)} more physical damage for ${ROLL.lasts} seconds (up to ${ROLL.most} times).`,
      words: `Deals ${dmg('mechanic', ROLL.blow, bookDmg('miruru', 1))} P.DMG 3 times to enemies in front. Each hit knocks them down for ${ROLL.down} sec and increases P.DMG taken by ${pct(ROLL.takes)} for ${ROLL.lasts} sec. This effect stacks up to ${ROLL.most} times.`,
      icon: '🛞',
      art: art(1),
      move: 'roll',
      cooldown: 14,
      cost: 2,
    },
    {
      name: 'Miruru Pirates!',
      about: `Five blows, each slowing the boss's attacks for ${PIRATES.lasts} seconds, and a blow more on a Non-Hero enemy.`,
      words: `Deals ${dmg('mechanic', PIRATES.blow, bookDmg('miruru', 2))} P.DMG 5 times to a random enemy and nearby enemies, reducing their ATK Spd by ${pct(PIRATES.slow / 1000)} for ${PIRATES.lasts} sec. Non-Hero enemies take an additional ${dmg('mechanic', PIRATES.boss, bookDmg('miruru', 2))} P.DMG.`,
      icon: '🏴‍☠️',
      art: art(2),
      move: 'pirates',
      cooldown: 20,
      cost: 3,
    },
  ],
  passive: BOOM_SHOWN,
  treasures: [
    treasure('Coin of the Deep', (k) => ({
      words: `[Baaaam!] Gains Immunity to CC for the skill's duration, and reduces the target's P.Crit Resistance by ${k(UT.coin.critTaken)} for ${UT.coin.lasts} sec.`,
      skill: { index: 0, steady: true, mark: { name: 'Coin of the Deep', lasts: UT.coin.lasts, critTaken: { physical: k(UT.coin.critTaken) } } },
    })),
    treasure('Pirate King’s Sextant', (k) => ({
      words: `[Roll Over] increases DMG by ${pct(k(UT.sextant.dmg))} on every use and recovers ${UT.sextant.mana} MP upon a Crit Hit. This effect stacks up to max ${UT.sextant.most} times.`,
    })),
    treasure('Miruru Cannonball', (k) => ({
      words: `[Miruru Pirates!] DMG is increased by ${pct(UT.cannonball.dmg)}, and skill cooldown is reduced by ${pct(k(UT.cannonball.cooldown))}.`,
      skill: { index: 2, dmg: 1 + UT.cannonball.dmg, cooldownShare: 1 - k(UT.cannonball.cooldown) },
    })),
    treasure('Turtle Gunpowder Keg', (k) => ({
      words: `[Boooooom!] Increases DMG by ${pct(UT.keg.dmg)}. Upon activation, increases ATK Spd by ${k(UT.keg.speed)} for ${UT.keg.lasts} sec.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, dmg: 2 } }, ({ skill }) => `If there is only 1 enemy, damage dealt is increased by ${pct(skill.dmg - 1)}.`),
    's1-dark': { words: `Attack increases by ${pct(PERKS.atk)} for ${PERKS.atkLasts} sec.` },
    's2-light': said({ skill: { index: 1, dmg: 1.5 } }, ({ skill }) => `Damage increases by ${pct(skill.dmg - 1)}.`),
    's2-dark': { words: `For each enemy hit, cooldown is reduced by ${pct(PERKS.sooner)}.` },
    's3-light': said({ skill: { index: 2, dmg: PERKS.pirates } }, ({ skill }) => `Damage dealt is increased by ${pct(skill.dmg - 1)}, and skill range is increased.`),
    's3-dark': { words: `Damage dealt is reduced by ${pct(1 - PERKS.halved)}, but the number of hits is doubled.` },
    's4-light': { words: `Has a ${pct(PERKS.stun.chance)} chance to stun the target for ${PERKS.stun.lasts} sec.` },
    's4-dark': { words: `Damage dealt is reduced by ${pct(1 - PERKS.halved)}, but the number of hits is doubled.` },
    't5-light': t5Light({ crit: 100 }, ({ crit }) => `Crit Chance +${crit}`),
    't5-dark': { words: `On hit, gains [Darkness] stacks equal to the number of enemies struck. When [Darkness] reaches ${PERKS.dark.needs} stacks, all [Darkness] is removed and you enter [Rampage] for ${PERKS.dark.lasts} sec, increasing Attack Speed by ${pct(PERKS.dark.speed / 1000)} and Attack by ${pct(PERKS.dark.atk)}.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    const starts = attackStarts('miruru');
    /** Boooooom!'s stacks, and how long they last yet; Roll Over's stacks on the boss, and how long they last yet; Pirate King's Sextant's uses; Transcend 5's Dark's [Darkness]. */
    let boomed = 0;
    let boomLeft = 0;
    let rolled = 0;
    let rollLeft = 0;
    let uses = 0;
    let darkness = 0;
    const keg = treasureTier(self, 3) > 0;

    /** A blow of hers (Transcend 5's Dark: a stack of [Darkness]; at 50, [Rampage]). */
    const strike = (amount: number, counted = true): boolean => {
      const critical = fight.hit(self, amount, counted);
      if (self.perks.has('t5-dark')) {
        darkness++;
        if (darkness >= PERKS.dark.needs) {
          darkness = 0;
          put(self.statuses, { name: RAMPAGE.name, left: PERKS.dark.lasts, speed: PERKS.dark.speed, atk: PERKS.dark.atk, shown: RAMPAGE });
        }
      }
      return critical;
    };
    /** Boooooom!: a shell (its Dark: two, each less; its Light: now and then a stun; Turtle Gunpowder Keg: harder, and quicker; her unique weapon: now and then a blow more, and the boss taking more physical damage), and her ATK a little higher. */
    const boom = (): void => {
      const shells = self.perks.has('s4-dark') ? 2 : 1;
      for (let i = 0; i < shells; i++) {
        strike(BOOM.blow * (self.perks.has('s4-dark') ? PERKS.halved : 1) * (keg ? 1 + UT.keg.dmg : 1), false);
        if (self.perks.has('s4-light') && fight.roll() < PERKS.stun.chance) fight.stun(PERKS.stun.lasts, { by: self });
        if (tier !== null && fight.roll() < LEVIATHAN.chance) {
          strike(atTier(LEVIATHAN.blow, tier) * 1000, false);
          put(fight.foe.statuses, { name: 'Ultimate Weapon, Leviathan', left: LEVIATHAN.lasts, takes: { physical: 1 + atTier(LEVIATHAN.takes, tier) }, shown: 'curse' });
        }
      }
      boomed = Math.min(BOOM.most, boomed + 1);
      boomLeft = BOOM.lasts;
      put(self.statuses, { name: BOOMED.name, left: BOOM.lasts, count: boomed, atk: BOOM.atk * boomed, shown: BOOMED });
      if (keg) put(self.statuses, { name: KEG.name, left: UT.keg.lasts, speed: fromTreasure(self, 3, UT.keg.speed), shown: KEG });
    };

    return {
      lands: {
        // Her attack: and Boooooom! on each part of it.
        attack(part) {
          strike(fight.basic);
          if (starts.has(part)) boom();
        },
        // A great blow that knocks the boss back (its Dark: her ATK higher a moment); and Boooooom!.
        baam() {
          strike(BAAM.blow);
          fight.stun(BAAM.back, { down: true, by: self });
          if (self.perks.has('s1-dark')) put(self.statuses, { name: FIRED.name, left: PERKS.atkLasts, atk: PERKS.atk, shown: FIRED });
          boom();
        },
        // Three blows, each knocking the boss down and leaving it taking more physical damage (its Dark: each off its cooldown;
        // Pirate King's Sextant: harder for each use, and mana on a critical one).
        roll() {
          const sextant = 1 + fromTreasure(self, 1, UT.sextant.dmg) * uses;
          const critical = strike(ROLL.blow * sextant);
          fight.stun(ROLL.down, { down: true, by: self });
          rolled = Math.min(ROLL.most, rolled + 1);
          rollLeft = ROLL.lasts;
          put(fight.foe.statuses, { name: 'Roll Over', left: ROLL.lasts, count: rolled, takes: { physical: 1 + ROLL.takes * rolled }, shown: 'curse' });
          if (self.perks.has('s2-dark')) self.cooldowns[1] = (self.cooldowns[1] ?? 0) * (1 - PERKS.sooner);
          if (critical && treasureTier(self, 1) > 0) self.mana = Math.min(MAX_MANA, self.mana + UT.sextant.mana);
        },
        // Five blows (its Dark: ten, each less, and the boss slowed more), each slowing the boss's attacks, and a blow more on a Non-Hero enemy.
        pirates() {
          const dark = self.perks.has('s3-dark');
          for (let i = 0; i < (dark ? 2 : 1); i++) {
            strike(PIRATES.blow * (dark ? PERKS.halved : 1));
            strike(PIRATES.boss * (dark ? PERKS.halved : 1));
          }
          if (dark) fight.slow(PERKS.slow, PERKS.slowLasts);
          else fight.slow(PIRATES.slow, PIRATES.lasts);
        },
      },
      used(index) {
        if (index !== 1 || treasureTier(self, 1) === 0) return;
        uses = Math.min(UT.sextant.most, uses + 1);
        put(self.statuses, { name: SEXTANT.name, left: Infinity, count: uses, shown: SEXTANT });
      },
      tick(dt) {
        if (boomLeft > 0) {
          boomLeft -= dt;
          if (boomLeft <= 0) boomed = 0;
        }
        if (rollLeft > 0) {
          rollLeft -= dt;
          if (rollLeft <= 0) rolled = 0;
        }
      },
      buffs: () => (self.perks.has('t5-dark') ? [{ name: 'Darkness', about: `At ${PERKS.dark.needs}: [Rampage].`, icon: '🌑', art: art(3), count: darkness }] : []),
    };
  },
};
