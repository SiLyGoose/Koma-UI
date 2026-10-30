import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { pct, skillArt, type Buff } from '../shown';
import type { Foe } from '../types';
import { atTier, BELONA, BELONA_UP } from '../unique';
import { attackStarts, bookDmg, CLASS_STATS, dmg, type HeroDef, indexed, type Passive } from './kit';

/*
 * Scarlet's skills, as the King's Raid Index (kingsraid.netlify.app) has them: the live game's Scarlet before she was remastered
 * (how hard each hits, at her class's ATK, its perks and its unique weapon are the Index's; what each costs and how long before
 * it can be used again, the live game's, kingsraid.shodyra.com's). King's Raid's playtest has the remastered Scarlet ([Consecrated
 * Ground], [Spirit of Orvelia] and [Blessing of the Kings], two sword waves), which this isn't; her animations are the remaster's
 * (King's Raid's own: ../../assets/heroes/scarlet.ts). She is a warrior, the Faith of Silver.
 * - Halt!: a blow that knocks the boss down, and a blow more on a Non-Hero enemy; a share of what they deal heals her.
 * - Justice Served!: what the boss has left on every ally cleared, what helps the enemies taken off them, and a blow.
 * - Sword of Honor!!: three blows, and an energy blast (here in the remaster's two sword waves, half of it each).
 * Her passive, Goddess of War: more crit resist; now and then a part of her attack deals a blow more that stuns the boss a moment.
 * Her unique weapon (../unique.ts) is worked here too: her DMG higher for each of her skills on cooldown.
 * (This Is the True Might of Orvelia!!, the remaster's Justice Served! after her soul weapon, isn't here: this raid has no soul
 * weapons.)
 *
 * Her own perks (../perks.ts) are the Index's; her unique treasures the Index's, and where it has none (Halt!'s, Goddess of
 * War's) live King's Raid's, as krinfo has them (its legacy). Sword of Honor!!'s Blind does nothing to the boss (its blows
 * aren't aimed). Goddess of War's Dark (one enemy) holds while the boss stands alone. Transcend 5's Dark is for a critical
 * blow on her: the fight doesn't tell her part which blows are, so here it is any blow of the boss's that hurts her.
 */
/** Halt!: its blow, and how long it knocks the boss down; its blow more on a Non-Hero enemy; the share of what it deals that heals her. */
const HALT = { blow: indexed('warrior', 194_702), down: 3, boss: indexed('warrior', 194_702), drinks: 0.3 };
/** Justice Served!: its blow. */
const JUSTICE = { blow: indexed('warrior', 144_050) };
/** Sword of Honor!!: each of its three blows (the Index's total, a third each), and its energy blast (half on each of its two waves). */
const HONOR = { blow: indexed('warrior', 243_516 / 3), blast: indexed('warrior', 221_494), blind: 5 };
/** Goddess of War: her crit resist more (points); its chance on each part of her attack, its blow, and how long it stuns. */
const GODDESS = { critResist: 150, chance: 0.1, blow: indexed('warrior', 90_217), stun: 1 };
/**
 * Her own perks' numbers: Justice Served!'s Light's stun on a Non-Hero enemy, and Dark's P.Crit Resistance for every ally, for
 * how long; Sword of Honor!!'s Dark's heals on the boss, for how long; Goddess of War's Light's crit resist (to its 300), and
 * Dark's longer stun with one enemy; Transcend 5's Dark's chance, stun and wait.
 */
const PERKS = { stun: 4, critResist: 200, lasts: 10, heals: 0.6, healLasts: 10, resist: 150, alone: 2, dark: { chance: 0.05, stun: 1, every: 8 } };

/**
 * Her unique treasures' numbers (0★ to 5★: ../treasures.ts; King's Raid's own): Halt!'s more DMG, and the more physical damage
 * its target takes, for how long; Justice Served!'s more DMG, and the share off every ally's cooldowns; Sword of Honor!!'s more
 * DMG, and each blow's stun; Goddess of War's chance, and her attack speed when it comes, for how long.
 */
const UT = {
  gauntlet: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], takes: 1.25, lasts: 10 },
  wings: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], sooner: 0.1 },
  pride: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], stun: 3 },
  heart: { chance: 0.2, speed: [200, 240, 290, 350, 420, 500], lasts: 5 },
};

const art = skillArt('scarlet');

const GODDESS_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Goddess of War', about: `Passive. +${GODDESS.critResist} crit resist. Each part of her attack has a ${pct(GODDESS.chance)} chance to deal a blow more that stuns the boss for ${GODDESS.stun} second.`, icon: '⚔️', art: art(3) },
  words: `All Crit Resistance increases by ${GODDESS.critResist}. With ${pct(GODDESS.chance)} chance, deals additional ${dmg('warrior', GODDESS.blow, bookDmg('scarlet', 3))} P.DMG during auto attack and stuns target enemy for ${GODDESS.stun} sec.`,
};
const WAR: Buff = { name: 'Goddess of War', about: 'Crit resist higher.', icon: '⚔️', art: art(3) };
const HEART: Buff = { name: 'Heart of Silver', about: 'Attack speed higher.', icon: '🤍', art: art(3) };
const JUSTICE_UP: Buff = { name: 'Justice Served!', about: 'P.Crit Resistance higher.', icon: '⚖️', art: art(1) };

export const SCARLET: HeroDef = {
  id: 'scarlet',
  name: 'Scarlet',
  class: 'warrior',
  skins: ['Scarlet', 'Scarlet_Frozen', 'Scarlet_Summer', 'Scarlet_Wedding', 'Scarlet_Halloween', 'Scarlet_Glory', 'Scarlet_School', 'Scarlet_Christmas', 'Scarlet_Glory2', 'Scarlet_Glory3', 'Scarlet_Glory4'],
  stats: { ...CLASS_STATS.warrior, deals: 'physical' },
  abilities: [
    {
      name: 'Halt!',
      about: `A blow that knocks the boss down for ${HALT.down} seconds, and a blow more on a Non-Hero enemy; ${pct(HALT.drinks)} of what they deal heals her.`,
      words: `Attacks all frontal enemies, dealing ${dmg('warrior', HALT.blow, bookDmg('scarlet', 0))} P.DMG and knocking them down for ${HALT.down} sec. If the target is not a Hero, deals ${dmg('warrior', HALT.boss, bookDmg('scarlet', 0))} additional P.DMG. Heals HP equal to ${pct(HALT.drinks)} of DMG dealt.`,
      icon: '✋',
      art: art(0),
      move: 'halt',
      cooldown: 8,
      cost: 3,
    },
    {
      name: 'Justice Served!',
      about: 'What the boss has left on every ally cleared, what helps the enemies taken off them, and a blow.',
      words: `Dispels negative effects of all allies and dispels positive effects of all enemies, while dealing ${dmg('warrior', JUSTICE.blow, bookDmg('scarlet', 1))} P.DMG.`,
      icon: '⚖️',
      art: art(1),
      move: 'justice',
      cooldown: 15,
      cost: 2,
    },
    {
      name: 'Sword of Honor!!',
      about: 'Three blows, and an energy blast.',
      words: `Attacks an enemy 3 times, dealing a total of ${dmg('warrior', HONOR.blow * 3, bookDmg('scarlet', 2))} P.DMG. Fires an energy blast from the sword, dealing ${dmg('warrior', HONOR.blast, bookDmg('scarlet', 2))} P.DMG to enemies in a straight line, blinding them for ${HONOR.blind} sec.`,
      icon: '🗡️',
      art: art(2),
      move: 'honor',
      cooldown: 17,
      cost: 4,
    },
  ],
  passive: GODDESS_SHOWN,
  treasures: [
    treasure('Gauntlet of Wave', (k) => ({
      words: `[Halt!] Increases DMG by ${pct(k(UT.gauntlet.dmg))} and for ${UT.gauntlet.lasts} sec, target receives ${pct(UT.gauntlet.takes - 1)} increased P.DMG.`,
      skill: { index: 0, dmg: 1 + k(UT.gauntlet.dmg), mark: { name: 'Gauntlet of Wave', lasts: UT.gauntlet.lasts, takes: { physical: UT.gauntlet.takes } } },
    })),
    treasure('Wings of Justice', (k) => ({
      words: `[Justice Served!] Increases DMG by ${pct(k(UT.wings.dmg))} and reduces Cooldown of all allies by ${pct(UT.wings.sooner)}.`,
      skill: { index: 1, dmg: 1 + k(UT.wings.dmg) },
    })),
    treasure('Pride of Orvelia', (k) => ({
      words: `[Sword of Honor!!] DMG is increased by ${pct(k(UT.pride.dmg))} and each ATK inflicts Stun on enemy for ${UT.pride.stun} sec.`,
      skill: { index: 2, dmg: 1 + k(UT.pride.dmg) },
    })),
    treasure('Heart of Silver', (k) => ({
      words: `[Goddess of War] Activation chance changes to ${pct(UT.heart.chance)}. Upon activation, increases own ATK Spd by ${k(UT.heart.speed)} for ${UT.heart.lasts} sec.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, cost: -1 } }, ({ skill }) => `Mana cost is reduced by ${-skill.cost}.`),
    's1-dark': said({ skill: { index: 0, cleanse: 'self' } }, () => 'Dispels all harmful effects on oneself upon use.'),
    's2-light': { words: `If the target is not a Hero, stuns them for ${PERKS.stun} sec.` },
    's2-dark': { words: `All allies' P.Crit Resistance is increased by ${PERKS.critResist} for ${PERKS.lasts} sec.` },
    's3-light': said({ skill: { index: 2, cost: -1 } }, ({ skill }) => `Mana cost is reduced by ${-skill.cost}.`),
    's3-dark': said(
      { skill: { index: 2, mark: { name: 'Sword of Honor!!', lasts: PERKS.healLasts, heals: PERKS.heals } } },
      ({ skill }) => `Damaged enemies receive ${pct(1 - skill.mark.heals)} reduced heals for ${skill.mark.lasts} sec.`,
    ),
    's4-light': said({ bonus: { critResist: PERKS.resist } }, ({ bonus }) => `Crit Resistance increases to ${GODDESS.critResist + bonus.critResist}.`),
    's4-dark': { words: `Stun duration lasts for ${PERKS.alone} more sec when there is only one enemy.` },
    't5-light': t5Light({ resist: 100 }, ({ resist }) => `CC Resist +${resist}`),
    't5-dark': { words: `When receiving Critical DMG, there is a ${pct(PERKS.dark.chance)} chance the attacker is dispelled of all positive effects and is stunned for ${PERKS.dark.stun} sec. Skill cooldown is ${PERKS.dark.every} sec.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    const starts = attackStarts('scarlet');
    /** Transcend 5's Dark's wait. */
    let wait = 0;
    // (Goddess of War: her crit resist higher, for good; its Light's more is a perk's, as gear's.)
    put(self.statuses, { name: WAR.name, left: Infinity, critResist: GODDESS.critResist, shown: WAR });

    /** The enemies standing. */
    const standing = (): Foe[] => fight.foes.filter((foe) => foe.hp > 0 && !foe.away);
    /** What helps an enemy (has it deal more) taken off it. */
    const dispel = (foe: Foe): void => {
      for (let i = foe.statuses.length - 1; i >= 0; i--) if ((foe.statuses[i]?.deals ?? 1) > 1) foe.statuses.splice(i, 1);
    };
    /** A blow of hers, and a share of it (as her ATK has it) healing her. */
    const drink = (blow: number): void => {
      fight.hit(self, blow);
      fight.heal(self, (blow / 1000) * self.stats.atk * HALT.drinks, undefined, self);
    };

    return {
      lands: {
        // A blow of her attack; on each part of it, now and then Goddess of War's blow more, stunning the boss (its Dark, with one
        // enemy: longer; Heart of Silver: likelier, and quicker for a while when it comes).
        attack(part) {
          fight.hit(self, fight.basic);
          if (!starts.has(part) || fight.roll() >= (wearsTreasure(self, 3) ? UT.heart.chance : GODDESS.chance)) return;
          fight.hit(self, GODDESS.blow);
          fight.stun(GODDESS.stun + (self.perks.has('s4-dark') && standing().length <= 1 ? PERKS.alone : 0), { by: self });
          if (wearsTreasure(self, 3)) put(self.statuses, { name: HEART.name, left: UT.heart.lasts, speed: fromTreasure(self, 3, UT.heart.speed), shown: HEART });
        },
        // A blow that knocks the boss down, and a blow more on a Non-Hero enemy; each heals her by a share of it.
        halt() {
          drink(HALT.blow);
          fight.stun(HALT.down, { down: true, by: self });
          drink(HALT.boss);
        },
        // What the boss left on every ally cleared, what helps the enemies off them, and a blow (its Light: stunning a Non-Hero
        // enemy; its Dark: every ally's P.Crit Resistance higher for a while; Wings of Justice: every ally's cooldowns shorter).
        justice() {
          const allies = fight.field.filter((ally) => ally.hp > 0);
          for (const ally of allies) ally.statuses = ally.statuses.filter((status) => status.shown.harmful !== true || status.binds === true);
          for (const foe of standing()) dispel(foe);
          fight.hit(self, JUSTICE.blow);
          if (self.perks.has('s2-light')) fight.stun(PERKS.stun, { by: self });
          if (self.perks.has('s2-dark')) put(fight.party, { name: JUSTICE_UP.name, left: PERKS.lasts, critResist: { physical: PERKS.critResist }, shown: JUSTICE_UP });
          if (wearsTreasure(self, 1))
            for (const ally of allies) ally.cooldowns = ally.cooldowns.map((left, j) => Math.max(0, left - (ally.abilities[j]?.cooldown ?? 0) * UT.wings.sooner));
        },
        // Three blows (the second part two of them), each stunning the boss with Pride of Orvelia; then the energy blast, half on each wave.
        honor(part) {
          if (part >= 2) {
            fight.hit(self, HONOR.blast / 2);
            return;
          }
          for (let i = 0; i < part + 1; i++) fight.hit(self, HONOR.blow);
          if (wearsTreasure(self, 2)) fight.stun(UT.pride.stun, { by: self });
        },
      },
      // Her unique weapon: more DMG for each of her skills on cooldown.
      deals: () => (tier === null ? 1 : 1 + atTier(BELONA.dmg, tier) * self.cooldowns.filter((left) => left > 0).length),
      // Transcend 5's Dark: a blow of the boss's on her may take what helps it off it and stun it a moment, no more often than so many seconds.
      hurt(who) {
        if (who !== self || !self.perks.has('t5-dark') || wait > 0 || fight.roll() >= PERKS.dark.chance) return;
        wait = PERKS.dark.every;
        dispel(fight.foe);
        fight.stun(PERKS.dark.stun, { by: self });
      },
      tick(dt) {
        if (wait > 0) wait -= dt;
      },
      buffs: () => (tier !== null ? [{ ...BELONA_UP, count: self.cooldowns.filter((left) => left > 0).length }] : []),
    };
  },
};
