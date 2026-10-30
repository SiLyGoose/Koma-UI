import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { num, pct, skillArt, type Buff } from '../shown';
import type { Foe } from '../types';
import { atTier, DOMINICIA, DOMINICIA_UP } from '../unique';
import { bookDmg, CLASS_STATS, dmg, type HeroDef, type Passive, played } from './kit';

/*
 * Lewisia's skills, as King's Raid's playtest has them (stats/lewisia.md, where she is Lewsia: how hard each hits at its level
 * 90, and every number here, are its; its words are its own). She is a wizard whose blows are magical, the Royal Vermilion
 * Blood; each of her skills costs her a share of her current HP, and each hits the harder for every [Blood Curse] on its
 * enemy.
 * - Blood Orb: a blow, the boss taking more magic damage for a while.
 * - Blood Zone: a blow, and a zone round the boss for a while: a blow every half second, each leaving it taking more magic
 *   damage a moment.
 * - Blood Banquet: three blows that stun the boss.
 * Her passive, Blood Dominator: while her HP is half or more, her ATK and penetration higher; each of her blows a stack of
 * [Blood Curse] on its enemy (up to 60, for a while from the last): continuous DMG every second for each, a share of it
 * healing her.
 * Her unique weapon (../unique.ts) is worked here too: while her HP is over half, her ATK higher; under it, she takes less.
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/lewisia.ts).
 *
 * Her own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy: its [Blood Curse]
 * is the playtest's, up to 60, each 1% more). Where her live words and the playtest part, the playtest's are kept: Blood
 * Orb's 35% and its cost, and Blood Zone's more magic damage taken (live: its M.DEF 30% lower). Her blows land on the enemy
 * in question (the boss, or the minion she is fighting), whose [Blood Curse] she keeps count of.
 */
/** A blow of a skill of hers: its share of ATK (thousandths), that share more for each [Blood Curse] on its enemy, and its flat DMG (the playtest's). */
interface CursedBlow {
  ratio: number;
  per: number;
  flat: number;
}
/** Blood Orb: its blow; the boss's more magic damage taken, for how long; the share of her current HP it costs. */
const ORB = { blow: { ratio: 3715, per: 37, flat: 125_754 }, takes: 1.35, lasts: 10, cost: 0.15 };
/** Blood Zone: its blow; its zone for how long, a blow every so often, each leaving the boss taking more magic damage a moment; the share of her current HP it costs. */
const ZONE = { blow: { ratio: 2975, per: 30, flat: 100_862 }, lasts: 10, every: 0.5, tick: { ratio: 595, per: 6, flat: 20_166 }, takes: 1.25, marked: 1, cost: 0.2 };
/** Blood Banquet: each of its three blows, and how long they stun; the share of her current HP it costs. */
const BANQUET = { blow: { ratio: 3003, per: 30, flat: 101_714 }, stun: 3, cost: 0.1 };
/** Blood Dominator: at half her HP or more, her ATK (flat) and penetration more; [Blood Curse]'s continuous DMG every so often for each stack, for how long, up to how many, and the share of it healing her. */
const DOMINATOR = { above: 0.5, atk: 31_756, pen: 250, each: 22, every: 1, lasts: 20, most: 60, heals: 0.1 };
/** Her own perks' numbers: Orb's Light's harder, and Dark's more magic damage taken, for how long; Zone's Light's harder; Banquet's Light's share off every cooldown on an enemy with so many stacks; Dominator's Light's most and Dark's healing more and less; Transcend 5's Dark's shares of her current HP, and the seconds off each cooldown. */
const PERKS = { orb: 2, takes: 1.25, takesLasts: 10, zone: 1.4, stacks: 60, sooner: 0.05, most: 120, heals: 0.2, dark: { costs: [0.15, 0.3, 0.15], sooner: [1.6, 4, 2.4] } };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Orb's more DMG and the [Blood Curse] it leaves;
 * Zone's more DMG and longer; Banquet's more DMG and mana on a crit; [Blood Curse]'s more DMG, and her ATK more for a while on
 * an enemy with so many stacks (up to so many).
 */
const UT = {
  cup: { dmg: 0.5, stacks: [5, 6, 7, 8, 9, 10] },
  mist: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], longer: 2 },
  blood: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], mana: 400 },
  ring: { dmg: 0.5, stacks: 60, atk: 0.01, lasts: 10, most: [10, 12, 14, 17, 20, 25] },
};

/** A skill's blow on an enemy with so many [Blood Curse]. */
const cursed = ({ ratio, per, flat }: CursedBlow, stacks: number): number => played('wizard', ratio + per * stacks, flat);

const art = skillArt('lewisia');

const DOMINATOR_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Blood Dominator',
    about: `Passive. While her HP is ${pct(DOMINATOR.above)} or more, ATK +${num(DOMINATOR.atk)} and +${DOMINATOR.pen} penetration. Each of her blows a [Blood Curse] on its enemy (up to ${DOMINATOR.most}, for ${DOMINATOR.lasts} seconds): continuous DMG every second, ${pct(DOMINATOR.heals)} of it healing her; each, her skills 1% harder on it.`,
    icon: '🩸',
    art: art(3),
  },
  words: `When HP is ${pct(DOMINATOR.above)} or above, increases ATK by ${num(DOMINATOR.atk)} and DEF Penetration by ${DOMINATOR.pen}. Upon attack, inflicts target with *Blood Curse*, dealing a total of ${dmg('wizard', DOMINATOR.each * (DOMINATOR.lasts / DOMINATOR.every), bookDmg('lewisia', 3))} continuous M.DMG over time for ${DOMINATOR.lasts} sec and recovering HP equal to ${pct(DOMINATOR.heals)} of DMG dealt by *Blood Curse*. *Blood Curse* can be stacked up to max ${DOMINATOR.most} times, and it is irremovable.`,
};
const DOMINATING: Buff = { name: 'Blood Dominator', about: 'ATK and penetration higher, while her HP is half or more.', icon: '🩸', art: art(3) };
const RINGED: Buff = { name: 'Red Ring', about: 'ATK higher for each.', icon: '💍', art: art(3) };
const HEALING: Buff = { name: 'Blood Dominator (healing)', about: 'Healing reaches it more.', icon: '🩸', art: art(3) };

export const LEWISIA: HeroDef = {
  id: 'lewisia',
  name: 'Lewisia',
  class: 'wizard',
  skins: ['Lewisia', 'Lewisia_Idol', 'Lewisia_Summer', 'Lewisia_Summer4', 'Lewisia_Summer5', 'Lewisia_Christmas', 'Lewisia_Frozen', 'Lewisia_Wedding', 'Lewisia_Halloween', 'Lewisia_Wedding20'],
  stats: { ...CLASS_STATS.wizard, deals: 'magical' },
  abilities: [
    {
      name: 'Blood Orb',
      about: `A blow; the boss takes ${pct(ORB.takes - 1)} more magic damage for ${ORB.lasts} seconds. Costs ${pct(ORB.cost)} of her current HP.`,
      words: `Deals ${dmg('wizard', cursed(ORB.blow, 0), bookDmg('lewisia', 0))} M.DMG to the target, increasing M.DMG the target takes by ${pct(ORB.takes - 1)} for ${ORB.lasts} sec. Each stack of *Blood Curse* inflicted upon target increases DMG dealt by 1%.\nUpon use, consumes ${pct(ORB.cost)} of current HP.`,
      icon: '🩸',
      art: art(0),
      move: 'orb',
      cooldown: 8,
      cost: 2,
    },
    {
      name: 'Blood Zone',
      about: `A blow, and a zone round the boss for ${ZONE.lasts} seconds: a blow every ${ZONE.every} seconds, it taking ${pct(ZONE.takes - 1)} more magic damage meanwhile. Costs ${pct(ZONE.cost)} of her current HP.`,
      words: `Deals ${dmg('wizard', cursed(ZONE.blow, 0), bookDmg('lewisia', 1))} M.DMG to the target and creates a Blood Zone that lasts for ${ZONE.lasts} sec around the target. Enemies within the Blood Zone take ${dmg('wizard', cursed(ZONE.tick, 0), bookDmg('lewisia', 1))} M.DMG every ${ZONE.every} sec, and take ${pct(ZONE.takes - 1)} increased M.DMG. Each stack of *Blood Curse* inflicted upon target increases DMG dealt by 1%.\nUpon use, consumes ${pct(ZONE.cost)} of current HP.`,
      icon: '🌹',
      art: art(1),
      move: 'bloodzone',
      cooldown: 20,
      cost: 3,
    },
    {
      name: 'Blood Banquet',
      about: `Three blows that stun the boss for ${BANQUET.stun} seconds. Costs ${pct(BANQUET.cost)} of her current HP.`,
      words: `Attacks frontal enemies in a straight line 3 times, dealing a total of ${dmg('wizard', cursed(BANQUET.blow, 0) * 3, bookDmg('lewisia', 2))} M.DMG and inflicting Stun for ${BANQUET.stun} sec. Each stack of *Blood Curse* inflicted upon target increases DMG dealt by 1%.\nUpon use, consumes ${pct(BANQUET.cost)} of current HP.`,
      icon: '🦇',
      art: art(2),
      move: 'banquet',
      cooldown: 12,
      cost: 2,
    },
  ],
  passive: DOMINATOR_SHOWN,
  treasures: [
    treasure('Old Silver Cup', (k) => ({
      words: `[Blood Orb] Increases DMG by ${pct(UT.cup.dmg)} and leaves ${k(UT.cup.stacks)} stacks of *Blood Curse* on the target.`,
      skill: { index: 0, dmg: 1 + UT.cup.dmg },
    })),
    treasure('Spell of Bloody Mist', (k) => ({
      words: `[Blood Zone] Increases DMG by ${pct(k(UT.mist.dmg))} and the effect duration by ${UT.mist.longer} sec.`,
      // (Its zone's blows, after the skill, are made harder by its part.)
      skill: { index: 1, dmg: 1 + k(UT.mist.dmg) },
    })),
    treasure('Blood of the Ancients', (k) => ({
      words: `[Blood Banquet] Increases DMG by ${pct(k(UT.blood.dmg))}, and recovers ${UT.blood.mana} Mana upon a Crit Hit.`,
      skill: { index: 2, dmg: 1 + k(UT.blood.dmg), critMana: UT.blood.mana },
    })),
    treasure('Red Ring', (k) => ({
      words: `[Blood Dominator] Increases DMG of *Blood Curse* by ${pct(UT.ring.dmg)}. Upon attacking enemies inflicted with ${UT.ring.stacks} or more stacks of *Blood Curse*, increases own ATK by ${pct(UT.ring.atk)} for ${UT.ring.lasts} sec. ATK boost can be stacked up to max ${k(UT.ring.most)} times.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, cost: 1, dmg: PERKS.orb } }, ({ skill }) => `Mana cost is increased by ${skill.cost} orb but DMG is boosted by ${pct(skill.dmg - 1)}.`),
    's1-dark': { words: `Target takes ${pct(PERKS.takes - 1)} increased M.DMG for ${PERKS.takesLasts} sec.` },
    // (Its zone's blows, after the skill, are made harder by her part.)
    's2-light': said({ skill: { index: 1, dmg: PERKS.zone } }, ({ skill }) => `DMG is increased by ${pct(skill.dmg - 1)}.`),
    's2-dark': said({ skill: { index: 1, cooldown: -3 } }, ({ skill }) => `Cooldown is reduced by ${-skill.cooldown} sec.`),
    's3-light': { words: `Upon attacking an enemy with over ${PERKS.stacks} stacks of *Blood Curse*, reduces Cooldown of all Skills by ${pct(PERKS.sooner)}.` },
    's3-dark': said({ skill: { index: 2, cost: -1 } }, ({ skill }) => `Mana cost is reduced by ${-skill.cost}.`),
    's4-light': { words: `Changes the max stack of *Blood Curse* to ${PERKS.most} stacks.` },
    's4-dark': { words: `All allies' heal rate is increased by ${pct(PERKS.heals)} and all enemies' heal rate is reduced by ${pct(PERKS.heals)}.` },
    't5-light': t5Light({ crit: 100 }, ({ crit }) => `Crit Chance +${crit}`),
    't5-dark': { words: 'All skill HP consumption is increased by 50% but cooldowns are reduced by 20%.' },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /** [Blood Curse] on each enemy: its stacks, how long they last yet, toward its next blow; Blood Zone's enemy, how long yet, toward its next blow; Red Ring's stacks, and how long they last yet; whether the fight's beginning has come. */
    const curses = new Map<Foe, { count: number; left: number; tick: number }>();
    let zoneOn: Foe | null = null;
    let zone = 0;
    let zoneTick = 0;
    let ringed = 0;
    let ringLeft = 0;
    let begun = false;
    const most = self.perks.has('s4-light') ? PERKS.most : DOMINATOR.most;
    const ringMost = fromTreasure(self, 3, UT.ring.most);
    /** How many [Blood Curse] are on an enemy. */
    const stacksOn = (foe: Foe): number => curses.get(foe)?.count ?? 0;
    /** [Blood Curse] stacks on an enemy (up to its most), all lasting again. */
    const curse = (foe: Foe, count: number): void => {
      const was = curses.get(foe);
      const now = Math.min(most, (was?.count ?? 0) + count);
      curses.set(foe, { count: now, left: DOMINATOR.lasts, tick: was?.tick ?? 0 });
      put(foe.statuses, { name: 'Blood Curse', left: DOMINATOR.lasts, count: now, shown: 'curse' });
    };
    /** A blow of hers on the enemy in question: a [Blood Curse] on it (Red Ring: on one with so many, her ATK higher a while). */
    const strike = (amount: number): boolean => {
      const foe = fight.foe;
      const critical = fight.hit(self, amount);
      if (ringMost > 0 && stacksOn(foe) >= UT.ring.stacks) {
        ringed = Math.min(ringMost, ringed + 1);
        ringLeft = UT.ring.lasts;
        put(self.statuses, { name: RINGED.name, left: UT.ring.lasts, count: ringed, atk: UT.ring.atk * ringed, shown: RINGED });
      }
      curse(foe, 1);
      return critical;
    };

    return {
      lands: {
        attack() {
          strike(fight.basic);
        },
        // A blow, the boss taking more magic damage (its Dark: more again; Old Silver Cup: [Blood Curse] on it).
        orb() {
          strike(cursed(ORB.blow, stacksOn(fight.foe)));
          put(fight.foe.statuses, { name: 'Blood Orb', left: ORB.lasts, takes: { magical: ORB.takes }, shown: 'curse' });
          if (self.perks.has('s1-dark')) put(fight.foe.statuses, { name: 'Blood Orb (Dark)', left: PERKS.takesLasts, takes: { magical: PERKS.takes }, shown: 'curse' });
          if (wearsTreasure(self, 0)) curse(fight.foe, fromTreasure(self, 0, UT.cup.stacks));
        },
        // A blow, and the zone round the boss (tick; Spell of Bloody Mist: longer).
        bloodzone() {
          strike(cursed(ZONE.blow, stacksOn(fight.foe)));
          zoneOn = fight.foe;
          zone = ZONE.lasts + (wearsTreasure(self, 1) ? UT.mist.longer : 0);
          zoneTick = 0;
        },
        // A blow that stuns the boss (its Light: on one with so many [Blood Curse], every cooldown shorter).
        banquet() {
          const foe = fight.foe;
          const many = stacksOn(foe) >= PERKS.stacks;
          strike(cursed(BANQUET.blow, stacksOn(foe)));
          fight.stun(BANQUET.stun, { by: self });
          if (many && self.perks.has('s3-light')) self.cooldowns = self.cooldowns.map((left, i) => Math.max(0, left - (self.abilities[i]?.cooldown ?? 0) * PERKS.sooner));
        },
      },
      used(index) {
        // Each costs her a share of her current HP (Transcend 5's Dark: more, but its cooldown shorter).
        const dark = self.perks.has('t5-dark');
        const cost = (dark ? PERKS.dark.costs : [ORB.cost, ZONE.cost, BANQUET.cost])[index] ?? 0;
        self.hp = Math.max(1, self.hp * (1 - cost));
        if (dark) self.cooldowns[index] = Math.max(0, (self.cooldowns[index] ?? 0) - (PERKS.dark.sooner[index] ?? 0));
      },
      tick(dt) {
        // As the fight begins: Blood Dominator's Dark, every ally healed more and every enemy less.
        if (!begun && fight.field.includes(self) && self.hp > 0) {
          begun = true;
          // (On each, as what the party bears doesn't reach healing.)
          if (self.perks.has('s4-dark')) for (const ally of fight.fighters) put(ally.statuses, { name: HEALING.name, left: Infinity, heals: 1 + PERKS.heals, shown: HEALING });
        }
        if (self.perks.has('s4-dark')) for (const foe of fight.foes) if (!foe.statuses.some((status) => status.name === 'Blood Dominator')) put(foe.statuses, { name: 'Blood Dominator', left: Infinity, heals: 1 - PERKS.heals, shown: 'curse' });
        // Blood Dominator: at half her HP or more, ATK and penetration higher. Her unique weapon: over half, ATK higher; under it, she takes less.
        const high = self.hp >= self.stats.hp * DOMINATOR.above;
        if (high) put(self.statuses, { name: DOMINATING.name, left: Infinity, atk: DOMINATOR.atk / self.stats.atk, pen: DOMINATOR.pen, shown: DOMINATING });
        else self.statuses = self.statuses.filter((status) => status.name !== DOMINATING.name);
        if (tier !== null) put(self.statuses, { name: DOMINICIA_UP.name, left: Infinity, ...(high ? { atk: atTier(DOMINICIA.atk, tier) } : { takes: 1 - atTier(DOMINICIA.taken, tier) }), shown: DOMINICIA_UP });
        if (ringLeft > 0) {
          ringLeft -= dt;
          if (ringLeft <= 0) ringed = 0;
        }
        // [Blood Curse]: every second its continuous DMG on each enemy for each stack (Red Ring: harder), a share of it healing her.
        for (const [foe, on] of curses) {
          on.left -= dt;
          if (on.left <= 0 || foe.hp <= 0) {
            curses.delete(foe);
            continue;
          }
          on.tick += dt;
          if (on.tick < DOMINATOR.every) continue;
          on.tick -= DOMINATOR.every;
          if (foe.away) continue;
          const before = self.dealt;
          fight.on(foe, () => fight.continuous(self, DOMINATOR.each * on.count * (wearsTreasure(self, 3) ? 1 + UT.ring.dmg : 1)));
          const dealt = self.dealt - before;
          if (dealt > 0) fight.heal(self, dealt * DOMINATOR.heals, undefined, self);
        }
        // Blood Zone: a blow every half second on its enemy, it taking more magic damage a moment (Zone's Light, Spell of Bloody Mist: harder).
        if (zone > 0 && zoneOn) {
          zone -= dt;
          zoneTick += dt;
          const foe = zoneOn;
          if (foe.hp <= 0 || foe.away) zone = 0;
          while (zone > 0 && zoneTick >= ZONE.every) {
            zoneTick -= ZONE.every;
            const harder = (self.perks.has('s2-light') ? PERKS.zone : 1) * (1 + fromTreasure(self, 1, UT.mist.dmg));
            fight.on(foe, () => strike(cursed(ZONE.tick, stacksOn(foe)) * harder));
            put(foe.statuses, { name: 'Blood Zone', left: ZONE.marked, takes: { magical: ZONE.takes }, shown: 'curse' });
          }
        }
      },
      lit: () => zone > 0,
    };
  },
};
