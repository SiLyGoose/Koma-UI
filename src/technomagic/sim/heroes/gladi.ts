import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { num, pct, skillArt, type Buff, type Mark } from '../shown';
import type { Foe } from '../types';
import { atTier, MASTRA, MASTRA_UP } from '../unique';
import { attackStarts, bookDmg, CLASS_STATS, dmg, type HeroDef, type Passive, played } from './kit';
import { CODED } from './moves';

/*
 * Gladi's skills, as King's Raid's playtest has them (stats/gladi.md: how hard each hits at its level 90, and every number
 * here, are its; its words are the game's, kingsraid.shodyra.com's). He is an assassin, the Beast of the Arena.
 * - Quick Strikes: seven blows; the last leaves the boss taking more physical damage for a while.
 * - Advent of the War God: what is on him dispelled, a blow; and he is the War God for a while: his ATK far higher (its
 *   books' half again), each part of his attack likely to spend a little mana on a blow more, and a magic blow that hurts him
 *   has him dodge every magic blow a moment (no more often than every 2 seconds).
 * - Ultimate Punch!: a great blow that stuns the boss, through all of a boss's defense.
 * His passive, This will hurt!: every 5th part of his attack on the same enemy, a blow more through all its defense.
 * His unique weapon (../unique.ts) is worked here too: each critical blow of his raises his crit DMG for a while (up to 7
 * times over).
 * What is drawn for each, and what his body does, are King's Raid's own (../../assets/heroes/gladi.ts).
 *
 * His own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy), the playtest's the
 * same. Quick Strikes' Light and This will hurt!'s Light (one enemy) always hold. This will hurt!'s Dark does nothing here
 * (only in the Arena), nor what Intolerable Feather does to the target's mana (the boss has none). (The playtest's Beast
 * Fist, Mastra is a soul weapon, a skill of its own: the unique weapon here is the live game's.)
 */
/** Quick Strikes: each of its seven blows; the boss's more physical damage taken after the last, for how long. */
const QUICK = { blow: played('assassin', 948, 46_352), takes: 1.25, lasts: 10 };
/**
 * Advent of the War God: its blow; the War God's seconds and ATK more (flat, its books' half again); the chance each part of
 * his attack has of a blow more, the share of his mana it spends, and the blow; how long a magic blow has him dodge every
 * other, no more often than how often.
 */
const WAR_GOD = { blow: played('assassin', 2990, 146_137), lasts: 10, atk: 32_833, books: 1.5, chance: 0.3, mana: 0.05, more: played('assassin', 1658, 80_471), dodge: 1, every: 2 };
/** Ultimate Punch!: its blow (through all of a boss's defense), and its stun. */
const PUNCH = { blow: played('assassin', 6906, 337_565), stun: 3 };
/** This will hurt!: every how many parts of his attack on the same enemy, and its blow (through all its defense). */
const HURT = { every: 5, blow: played('assassin', 837, 40_557) };
/** His own perks' numbers: Quick Strikes' Dark's more physical damage taken; Advent of the War God's Light's longer state and Dark's more chance; This will hurt!'s Light's more DMG; Transcend 5's Dark's DEF (a share of his ATK). */
const PERKS = { takes: 1.5, longer: 5, chance: 0.2, hurt: 2, defense: 0.08 };

/**
 * His unique treasures' numbers (0★ to 5★: ../treasures.ts; King's Raid's own): Quick Strikes' DMG and how long the target
 * can't gain mana (the boss has none); Advent of the War God's mana every second; Ultimate Punch!'s shorter cooldown and its
 * DMG more for each use (up to 10); This will hurt!'s DMG and the boss's more physical damage taken for each (up to 6).
 */
const UT = {
  feather: { dmg: 0.5, unmana: [2, 2.4, 2.9, 3.5, 4.2, 5] },
  silvervine: { mana: [100, 120, 140, 170, 210, 250] },
  wreath: { cooldown: 0.3, dmg: [0.04, 0.048, 0.058, 0.07, 0.084, 0.1], most: 10 },
  bandage: { dmg: 0.5, takes: [0.02, 0.024, 0.029, 0.035, 0.042, 0.05], lasts: 10, most: 6 },
};

const art = skillArt('gladi');

const THIS_WILL_HURT: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'This will hurt!', about: `Passive. Every ${HURT.every}th part of his attack on the same enemy deals a blow more, through all its defense.`, icon: '👊', art: art(3) },
  words: `Upon hitting a single target with ${HURT.every} auto attacks, deals ${dmg('assassin', HURT.blow, bookDmg('gladi', 3))} extra DMG that ignores DEF.`,
};
/** The War God state; Ultimate Punch!'s Champion's Laurel Wreath stacks. */
const GOD: Buff = { name: 'War God', about: 'ATK far higher; his attack now and then a blow more; a magic blow has him dodge every other a moment.', icon: '🔥', art: art(1) };
const WREATH: Buff = { name: 'Champion’s Laurel Wreath', about: 'Ultimate Punch! deals more for each.', icon: '🏆', art: art(2) };
/** What his skills leave on the boss. */
const STRUCK = 'Quick Strikes';
const BANDAGED = 'Elastic Bandage of Fighting Spirit';

export const GLADI: HeroDef = {
  id: 'gladi',
  name: 'Gladi',
  class: 'assassin',
  skins: ['Gladi', 'Gladi_Frozen', 'Gladi_Summer', 'Gladi_Maid', 'Gladi_Dessert', 'Gladi_Glory', 'Gladi_Glory2', 'Gladi_Halloween', 'Gladi_Christmas'],
  // An assassin (his blows physical): as his class stands.
  stats: { ...CLASS_STATS.assassin, deals: 'physical' },
  abilities: [
    {
      name: 'Quick Strikes',
      about: `Seven blows; the last leaves the boss taking ${pct(QUICK.takes - 1)} more physical damage for ${QUICK.lasts} seconds.`,
      words: `Strikes the target 7 times, dealing a total of ${dmg('assassin', QUICK.blow * 7, bookDmg('gladi', 0))} P.DMG. The last hit increases the target's P.DMG taken by ${pct(QUICK.takes - 1)} for ${QUICK.lasts} sec.`,
      icon: '👊',
      art: art(0),
      move: 'quick',
      cooldown: 9,
      cost: 2,
    },
    {
      name: 'Advent of the War God',
      about: `What is on him dispelled, and a blow; he is the War God for ${WAR_GOD.lasts} seconds: his ATK far higher, each part of his attack a ${pct(WAR_GOD.chance)} chance to spend ${pct(WAR_GOD.mana)} of his mana on a blow more, and a magic blow has him dodge every magic blow for ${WAR_GOD.dodge} second.`,
      words: `Dispel all negative effects on self and deal ${dmg('assassin', WAR_GOD.blow, bookDmg('gladi', 1))} P.DMG to nearby enemies within a small radius, gaining the Status 'War God' for ${WAR_GOD.lasts} sec. While in War God mode, ATK is boosted by ${num(Math.round(WAR_GOD.atk * WAR_GOD.books))} and all auto attacks have a ${pct(WAR_GOD.chance)} chance to consume ${pct(WAR_GOD.mana)} mana to deal an extra attack of ${dmg('assassin', WAR_GOD.more, bookDmg('gladi', 1))} extra P.DMG. Upon taking M.DMG, dodge all M.DMG for ${WAR_GOD.dodge} sec. Dodge effect only activates 1 time in every ${WAR_GOD.every} sec.`,
      icon: '🔥',
      art: art(1),
      move: 'wargod',
      cooldown: 15,
      cost: 1,
    },
    {
      name: 'Ultimate Punch!',
      about: `A great blow that stuns the boss for ${PUNCH.stun} seconds, through all of a boss’s defense.`,
      words: `Charges energy and sprints toward frontal enemies, dealing ${dmg('assassin', PUNCH.blow, bookDmg('gladi', 2))} P.DMG to enemies in range and inflicting stun for ${PUNCH.stun} sec. If the target is a boss, attack ignores target DEF.`,
      icon: '💥',
      art: art(2),
      move: 'punch',
      cooldown: 20,
      cost: 4,
    },
  ],
  passive: THIS_WILL_HURT,
  treasures: [
    treasure('Intolerable Feather', (k) => ({
      words: `[Quick Strikes] Increases DMG by ${pct(UT.feather.dmg)}, and makes the target unable to recover Mana for ${k(UT.feather.unmana)} sec.`,
      skill: { index: 0, dmg: 1 + UT.feather.dmg },
    })),
    treasure('Silvervine Box', (k) => ({
      words: `[Advent of the War God] For the skill's duration, recovers ${k(UT.silvervine.mana)} MP every second and stacks 1 [This will hurt!] upon inflicting additional P.DMG.`,
    })),
    treasure('Champion’s Laurel Wreath', (k) => ({
      words: `[Ultimate Punch!] Skill cooldown is reduced by ${pct(UT.wreath.cooldown)} and per each activation DMG is increased by ${pct(k(UT.wreath.dmg))}. This effect can be stacked max ${UT.wreath.most} times.`,
      skill: { index: 2, cooldownShare: 1 - UT.wreath.cooldown },
    })),
    treasure('Elastic Bandage of Fighting Spirit', (k) => ({
      words: `[This will hurt!] Increases DMG by ${pct(UT.bandage.dmg)}. Upon activation, a target takes ${pct(k(UT.bandage.takes))} increased P.DMG for ${UT.bandage.lasts} sec. This effect can be stacked up to max ${UT.bandage.most} times.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, dmg: 2 } }, ({ skill }) => `When there is 1 enemy, DMG is boosted by ${pct(skill.dmg - 1)}.`),
    's1-dark': { words: `P.DMG taken increase effect amount is changed to ${pct(PERKS.takes - 1)}.` },
    's2-light': { words: `War God state lasts ${PERKS.longer} seconds longer.` },
    's2-dark': { words: `Additional DMG hit chance rises by ${pct(PERKS.chance)}.` },
    's3-light': said({ skill: { index: 2, dmg: 1.4 } }, ({ skill }) => `DMG is increased by ${pct(skill.dmg - 1)}.`),
    's3-dark': said({ skill: { index: 2, cost: -1 } }, ({ skill }) => `Mana cost is reduced by ${-skill.cost}.`),
    's4-light': { words: `When there is 1 enemy, DMG is boosted by ${pct(PERKS.hurt - 1)}.` },
    's4-dark': { words: "When activated in the Arena, deal 15% of the target's current HP as additional P.DMG that ignores DEF." },
    't5-light': t5Light({ speed: 100 }, ({ speed }) => `ATK.Spd +${speed}`),
    't5-dark': { words: `Increases all DEF by ${pct(PERKS.defense)} of ATK.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    const starts = attackStarts('gladi');
    /** How long the War God state lasts yet; how long his magic dodge lasts yet, and its wait; toward Silvervine Box's next mana; Champion's Laurel Wreath's stacks; This will hurt!'s count on each enemy. */
    let god = 0;
    let dodging = 0;
    let dodgeWait = 0;
    let silvervine = 0;
    let wreath = 0;
    const hurts = new Map<Foe, number>();
    // (Advent of the War God's ATK: a share of his own, as the fight begins.)
    const godAtk = (WAR_GOD.atk * WAR_GOD.books) / self.stats.atk;
    // Transcend 5's Dark: his DEF higher by a share of his ATK, for good.
    if (self.perks.has('t5-dark')) {
      const defense = PERKS.defense * self.stats.atk;
      put(self.statuses, { name: 'Gladi', left: Infinity, bolsters: { physical: defense, magical: defense }, shown: { name: 'Gladi', about: `DEF higher by ${pct(PERKS.defense)} of his ATK.`, icon: '🛡️', art: art(3) } });
    }

    /** A blow of his: a critical one, with his unique weapon, a stack more of his crit DMG (up to so many, begun again). */
    const strike = (amount: number, counted = true, whole = false): boolean => {
      const critical = fight.hit(self, amount, counted, 0, whole);
      if (critical && tier !== null) {
        const stacks = Math.min(MASTRA.most, (self.statuses.find((status) => status.name === MASTRA_UP.name)?.count ?? 0) + 1);
        put(self.statuses, { name: MASTRA_UP.name, left: MASTRA.lasts, count: stacks, critDamage: atTier(MASTRA.critDamage, tier) * stacks, shown: MASTRA_UP });
      }
      return critical;
    };
    /**
     * A stack of This will hurt! on the enemy in question; at so many, its blow through all its defense (its Light: harder;
     * Elastic Bandage of Fighting Spirit: harder, and a stack more of the target's physical damage taken).
     */
    const hurt = (): void => {
      const foe = fight.foe;
      const count = (hurts.get(foe) ?? 0) + 1;
      if (count < HURT.every) {
        hurts.set(foe, count);
        return;
      }
      hurts.set(foe, 0);
      const bandage = wearsTreasure(self, 3);
      strike(HURT.blow * (self.perks.has('s4-light') ? PERKS.hurt : 1) * (bandage ? 1 + UT.bandage.dmg : 1), false, true);
      if (!bandage) return;
      const stacks = Math.min(UT.bandage.most, (foe.statuses.find((status) => status.name === BANDAGED)?.count ?? 0) + 1);
      put(foe.statuses, { name: BANDAGED, left: UT.bandage.lasts, count: stacks, takes: { physical: 1 + fromTreasure(self, 3, UT.bandage.takes) * stacks }, shown: 'curse' });
    };

    return {
      lands: {
        // His attack: a blow; each part of it a stack of This will hurt!, and in the War God state, now and then a blow more for
        // a little of his mana (its Dark: likelier; Silvervine Box: a stack of This will hurt! more).
        attack(part) {
          strike(fight.basic);
          if (!starts.has(part)) return;
          hurt();
          if (god <= 0 || fight.roll() >= WAR_GOD.chance + (self.perks.has('s2-dark') ? PERKS.chance : 0)) return;
          self.mana = Math.max(0, self.mana - WAR_GOD.mana * MAX_MANA);
          strike(WAR_GOD.more, false);
          if (wearsTreasure(self, 1)) hurt();
        },
        // Seven blows; the last leaves the boss taking more physical damage (its Dark: more again).
        quick(part) {
          strike(QUICK.blow);
          if (part === CODED.quick.lands.length - 1) put(fight.foe.statuses, { name: STRUCK, left: QUICK.lasts, takes: { physical: self.perks.has('s1-dark') ? PERKS.takes : QUICK.takes }, shown: 'curse' });
        },
        wargod() {
          strike(WAR_GOD.blow);
        },
        // A great blow that stuns, through all of a boss's defense (Champion's Laurel Wreath: harder for each use before).
        punch() {
          strike(PUNCH.blow * (1 + fromTreasure(self, 2, UT.wreath.dmg) * wreath), true, fight.foe === fight.boss);
          fight.stun(PUNCH.stun, { by: self });
          if (wearsTreasure(self, 2)) wreath = Math.min(UT.wreath.most, wreath + 1);
        },
      },
      // Advent of the War God: what is on him dispelled, and the state (its Light: longer).
      used(index) {
        if (index !== 1) return;
        self.statuses = self.statuses.filter((status) => status.shown.harmful !== true || status.binds === true);
        god = WAR_GOD.lasts + (self.perks.has('s2-light') ? PERKS.longer : 0);
        put(self.statuses, { name: GOD.name, left: god, atk: godAtk, shown: GOD });
      },
      // In the War God state, a magic blow that hurts him: every magic blow dodged a moment, no more often than so often.
      hurt(who) {
        if (who !== self || god <= 0 || dodgeWait > 0 || fight.foe.def.stats.deals !== 'magical') return;
        dodging = WAR_GOD.dodge;
        dodgeWait = WAR_GOD.every;
      },
      untouched: () => dodging > 0 && fight.foe.def.stats.deals === 'magical',
      tick(dt) {
        dodging = Math.max(0, dodging - dt);
        dodgeWait = Math.max(0, dodgeWait - dt);
        if (god <= 0) return;
        god -= dt;
        // Silvervine Box: mana every second of the War God state.
        if (!wearsTreasure(self, 1)) return;
        silvervine += dt;
        if (silvervine < 1) return;
        silvervine -= 1;
        self.mana = Math.min(MAX_MANA, self.mana + fromTreasure(self, 1, UT.silvervine.mana));
      },
      lit: () => god > 0,
      buffs: () => (wreath > 0 ? [{ ...WREATH, count: wreath }] : []),
      marks: (): Mark[] => {
        const count = hurts.get(fight.boss) ?? 0;
        return count > 0 ? [{ text: `This will hurt! ×${count}`, tone: 'curse', art: art(3), count: String(count) }] : [];
      },
    };
  },
};
