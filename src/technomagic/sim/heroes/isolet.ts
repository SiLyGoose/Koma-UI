import { away, put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { fine, pct, skillArt, type Buff } from '../shown';
import { atTier, TERRAVION, TERRAVION_UP } from '../unique';
import { bookDmg, CLASS_STATS, dmg, type HeroDef, type Passive, played } from './kit';

/*
 * Isolet's skills, as King's Raid's playtest has them (stats/isolet.md: how hard each hits at its level 90, and every number
 * here, are its; its words are its own). She is a wizard whose blows are physical, the Hope of Gray.
 * - Devouring Flame – Caienne: a blow that leaves the boss in [Ignite] for a while (healed less).
 * - Frost of Absolute Zero – Devion: five blows, each freezing the boss; on one in [Ignite], each an [Explosive Reaction]
 *   more, through all its DEF.
 * - Raging Storm – Icarus: a storm for a while, a blow every half second, each leaving the boss hitting less hard; on one in
 *   [Ignite], the [Blazing Storm]: harder blows, each leaving the boss healed less for long (stacked up).
 * Her passive, Quintessence of Technomagic: her attack speed fixed, crit DMG far higher (its books' more), and each skill she
 * uses gains her mana; each [Explosive Reaction] raises her ATK (up to 15 times), each [Blazing Storm] has every ally take
 * less magic damage (up to 3 times).
 * Her unique weapon (../unique.ts) is worked here too: every 10 seconds the boss takes more physical damage for a while, and
 * her DMG is higher (up to 6 times).
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/isolet.ts).
 *
 * Her own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Devion's Light
 * (the boss's mana) does nothing here, nor Card of Peace's [Explosive Reaction] past blocks (nothing here blocks a physical
 * blow). Transcend 5's Dark's one enemy holds while the boss stands alone.
 */
const IGNITE = 'Ignite';
/** Devouring Flame: its blow; [Ignite]'s healing less, for how long. */
const CAIENNE = { blow: played('wizard', 2550, 87_552), heals: 0.75, lasts: 7 };
/** Devion: each of its five blows and how long each freezes; the [Explosive Reaction] on one in [Ignite], through all its DEF. */
const DEVION = { blow: played('wizard', 1020, 34_545), freeze: 3, reaction: played('wizard', 857, 29_184) };
/** Icarus: how long its storm lasts, a blow every so often, and the boss's ATK less for how long; the [Blazing Storm]'s blow, its healing less (a share each, up to `most`, for `healLasts`), and how long it is one. */
const ICARUS = { lasts: 10, every: 0.5, blow: played('wizard', 585, 21_026), weaker: 0.85, weakLasts: 10, blazing: played('wizard', 1170, 42_060), heals: 0.015, most: 30, healLasts: 60, blazes: 9 };
/** Quintessence: her crit DMG (its books' more), mana for each skill, each [Explosive Reaction]'s ATK (up to so many), and each [Blazing Storm]'s less magic damage for every ally (up to so many, no more often than so often). */
const ESSENCE = { critDamage: 1.5, mana: 1500, atk: 0.04, reactions: 15, taken: 0.07, storms: 3, every: 15 };
/** Her own perks' numbers: Caienne's Light's more physical damage taken, and Dark's longer [Ignite]; Devion's Dark's more reaction; Icarus's Light, Dark's heal less; Quintessence's Light's more to Non-Hero enemies and Dark's healing; Transcend 5's Dark's more to bosses (and for every other ally with 6 or more). */
const PERKS = { takes: 1.25, longer: 5, reaction: 1.6, heals: 0.025, boss: 0.01, healing: 0.1, dark: { own: 0.5, allies: 0.05, many: 6 } };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Caienne's healing less more; Devion's more
 * DMG; Icarus's slowing, and the boss's more physical damage taken for each [Blazing Storm] blow; Quintessence's more
 * stacks and crit DMG.
 */
const UT = {
  certificate: { heals: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25] },
  card: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
  bracelet: { slow: 300, takes: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 5 },
  compass: { reactions: 5, storms: 1, critDamage: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
};

const art = skillArt('isolet');

const ESSENCE_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  steady: true,
  shown: { name: 'Quintessence of Technomagic', about: `Passive. Her attack speed fixed; +${pct(ESSENCE.critDamage)} crit DMG; ${ESSENCE.mana} mana for each skill. Each [Explosive Reaction] +${pct(ESSENCE.atk)} ATK (up to ${ESSENCE.reactions}); each [Blazing Storm], every ally takes ${pct(ESSENCE.taken)} less magic damage (up to ${ESSENCE.storms}).`, icon: '⚙️', art: art(3) },
  words: `Isolet's ATK Spd is fixed to 1000 and she is not affected by Skill Cooldown Reduction effects, but she recovers ${ESSENCE.mana} Mana every time she uses a Skill, and increases her Crit DMG by ${pct(ESSENCE.critDamage)}.\nWhen she creates [Explosive Reaction], her ATK increases by ${pct(ESSENCE.atk)}. This effect can be stacked up to max ${ESSENCE.reactions} times and is irremovable.\nWhen she creates [Blazing Storm], M.DMG all allies take is reduced by ${pct(ESSENCE.taken)}. This effect can be stacked up to max ${ESSENCE.storms} times and is irremovable.`,
};
const REACTED: Buff = { name: 'Explosive Reaction', about: 'ATK higher for each.', icon: '💥', art: art(1) };
const SHELTERED: Buff = { name: 'Blazing Storm', about: 'Takes less magic damage for each.', icon: '🌪️', art: art(2) };
const BOSSING: Buff = { name: 'Hope of Gray', about: 'Deals more to bosses.', icon: '⚙️', art: art(3) };

export const ISOLET: HeroDef = {
  id: 'isolet',
  name: 'Isolet',
  class: 'wizard',
  skins: ['Isolet', 'Isolet_Advance', 'Isolet_Christmas', 'Isolet_DailyLook', 'Isolet_Wedding', 'Isolet_Summer', 'Isolet_Halloween'],
  // A wizard whose blows are physical: her passive's crit DMG.
  stats: { ...CLASS_STATS.wizard, deals: 'physical', critDamage: CLASS_STATS.wizard.critDamage + ESSENCE.critDamage },
  abilities: [
    {
      name: 'Devouring Flame – Caienne',
      about: `A blow that leaves the boss in [Ignite] for ${CAIENNE.lasts} seconds: healed ${pct(1 - CAIENNE.heals)} less.`,
      words: `Deals ${dmg('wizard', CAIENNE.blow, bookDmg('isolet', 0))} P.DMG to frontal enemies and inflicts them with [Ignite]. Enemies inflicted with [Ignite] have their Heal Rate reduced by ${pct(1 - CAIENNE.heals)} for ${CAIENNE.lasts} sec.`,
      icon: '🔥',
      art: art(0),
      move: 'caienne',
      cooldown: 7,
      cost: 2,
    },
    {
      name: 'Frost of Absolute Zero – Devion',
      about: `Five blows, each freezing the boss for ${DEVION.freeze} seconds; on one in [Ignite], each an [Explosive Reaction] more, through all its DEF.`,
      words: `Deals a total of ${dmg('wizard', DEVION.blow * 5, bookDmg('isolet', 1))} P.DMG to frontal enemies over 5 times, freezing the targets for ${DEVION.freeze} sec each hit. Dealing DMG to an enemy inflicted by [Ignite] creates [Explosive Reaction] that deals ${dmg('wizard', DEVION.reaction, bookDmg('isolet', 1))} additional DMG that ignores DEF.`,
      icon: '❄️',
      art: art(1),
      move: 'devion',
      cooldown: 15,
      cost: 3,
    },
    {
      name: 'Raging Storm – Icarus',
      about: `A storm for ${ICARUS.lasts} seconds: a blow every ${ICARUS.every} seconds, each the boss hitting ${pct(1 - ICARUS.weaker)} less hard. On one in [Ignite], the [Blazing Storm]: harder, and each blow the boss healed ${pct(ICARUS.heals)} less for ${ICARUS.healLasts} seconds (up to ${ICARUS.most}).`,
      words: `Deals ${dmg('wizard', ICARUS.blow, bookDmg('isolet', 2))} P.DMG each hit over 20 times to frontal enemies for ${ICARUS.lasts} sec, reducing ATK of targets by ${pct(1 - ICARUS.weaker)} for ${ICARUS.weakLasts} sec. Upon dealing DMG to an enemy inflicted with [Ignite], the Skill changes to [Blazing Storm], dealing ${dmg('wizard', ICARUS.blazing, bookDmg('isolet', 2))} P.DMG and reducing enemy's Heal Rate by ${pct(ICARUS.heals)} for ${ICARUS.healLasts} sec each hit. This effect can be stacked up to max ${ICARUS.most} times.`,
      icon: '🌪️',
      art: art(2),
      move: 'icarus',
      cooldown: 20,
      cost: 4,
    },
  ],
  passive: ESSENCE_SHOWN,
  treasures: [
    treasure('Witch Association Certificate', (k) => ({
      words: `[Devouring Flame – Caienne] Dispels positive effects from enemies within range and additionally reduces their Heal Rate by ${pct(k(UT.certificate.heals))} upon inflicting [Ignite].`,
      skill: { index: 0, dispel: true },
    })),
    treasure('Card of Peace: Serenity', (k) => ({
      words: `[Frost of Absolute Zero – Devion] Increases DMG by ${pct(k(UT.card.dmg))} and the additional DMG from [Explosive Reaction] ignores the target's Block effects.`,
      skill: { index: 1, dmg: 1 + k(UT.card.dmg) },
    })),
    treasure('Bracelet of Wishes', (k) => ({
      words: `[Raging Storm – Icarus] Reduces ATK Spd of enemies within range by ${UT.bracelet.slow} for the duration and increases P.DMG the enemies hit with [Blazing Storm] take by ${pct(k(UT.bracelet.takes))} for ${UT.bracelet.lasts} sec.`,
    })),
    treasure('Celestial Compass', (k) => ({
      words: `[Quintessence of Technomagic] Increases the max number of stacks of [Explosive Reaction] by ${UT.compass.reactions} and the max number of stacks of [Blazing Storm] by ${UT.compass.storms}. Increases Crit DMG by ${pct(k(UT.compass.critDamage))}.`,
      bonus: { critDamage: k(UT.compass.critDamage) },
    })),
  ],
  perks: {
    's1-light': { words: `Enemies inflicted with [Ignite] additionally take ${pct(PERKS.takes - 1)} increased P.DMG.` },
    's1-dark': { words: `Increases the duration of [Ignite] by ${PERKS.longer} sec.` },
    's2-light': { words: 'Each hit reduces enemy’s Mana by 200.' },
    's2-dark': { words: `Increases DMG of [Explosive Reaction] by ${pct(PERKS.reaction - 1)} instead of freezing enemies.` },
    's3-light': said({ skill: { index: 2, cost: -1 } }, ({ skill }) => `Reduces Mana Cost by ${-skill.cost}.`),
    's3-dark': { words: `Changes the Heal Rate Reduction effect of [Blazing Storm] to ${fine(PERKS.heals)}.` },
    's4-light': { words: `Additionally increases DMG dealt to non-Hero enemies by ${pct(PERKS.boss)} upon creating [Explosive Reaction].` },
    's4-dark': { words: `Additionally increases Heal Rate by ${pct(PERKS.healing)} upon creating [Blazing Storm].` },
    't5-light': t5Light({ crit: 100 }, ({ crit }) => `Crit Chance +${crit}`),
    't5-dark': { words: `When there is 1 enemy, increases own DMG dealt to bosses by ${pct(PERKS.dark.own)}.\nWhen there are ${PERKS.dark.many} or more allies, increases all allies' DMG dealt to bosses excluding self by ${pct(PERKS.dark.allies)}.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /** [Explosive Reaction]'s stacks; [Blazing Storm]'s stacks (and its wait); the storm: how long yet, toward its next blow, and how long it is a [Blazing Storm] yet; the boss's [Blazing Storm] healing stacks; her unique weapon's stacks, and toward the next. */
    let reactions = 0;
    let storms = 0;
    let stormWait = 0;
    let storm = 0;
    let stormTick = 0;
    let blazing = 0;
    let unhealed = 0;
    let terravion = 0;
    let terraNext = 0;
    const compass = wearsTreasure(self, 3);
    const mostReactions = ESSENCE.reactions + (compass ? UT.compass.reactions : 0);
    const mostStorms = ESSENCE.storms + (compass ? UT.compass.storms : 0);

    /** Whether the enemy in question is in [Ignite]. */
    const ignited = (): boolean => fight.foe.statuses.some((status) => status.name === IGNITE);
    /** An [Explosive Reaction]: her ATK higher (Quintessence's Light: and to Non-Hero enemies). */
    const react = (): void => {
      reactions = Math.min(mostReactions, reactions + 1);
      put(self.statuses, { name: REACTED.name, left: Infinity, count: reactions, atk: ESSENCE.atk * reactions, ...(self.perks.has('s4-light') && { deals: 1 + PERKS.boss * reactions }), shown: REACTED });
    };
    /** A [Blazing Storm] made: every ally takes less magic damage (no more often than so often; Quintessence's Dark: their healing more). */
    const shelter = (): void => {
      if (stormWait > 0) return;
      stormWait = ESSENCE.every;
      storms = Math.min(mostStorms, storms + 1);
      for (const ally of fight.fighters) put(ally.statuses, { name: SHELTERED.name, left: Infinity, count: storms, takes: { magical: 1 - ESSENCE.taken * storms }, ...(self.perks.has('s4-dark') && { heals: 1 + PERKS.healing * storms }), shown: SHELTERED });
    };

    return {
      lands: {
        attack() {
          fight.hit(self, fight.basic);
        },
        // A blow, and [Ignite] (its Dark: longer; its Light: more physical damage taken meanwhile; Association Certificate: healed less again).
        caienne() {
          fight.hit(self, CAIENNE.blow);
          const lasts = CAIENNE.lasts + (self.perks.has('s1-dark') ? PERKS.longer : 0);
          put(fight.foe.statuses, { name: IGNITE, left: lasts, heals: CAIENNE.heals - fromTreasure(self, 0, UT.certificate.heals), ...(self.perks.has('s1-light') && { takes: { physical: PERKS.takes } }), shown: 'burn' });
        },
        // A blow that freezes the boss (its Dark: none, but a harder reaction); on one in [Ignite], an [Explosive Reaction], through all its DEF.
        devion() {
          fight.hit(self, DEVION.blow);
          if (!self.perks.has('s2-dark')) fight.stun(DEVION.freeze, { by: self });
          if (ignited()) {
            fight.hit(self, DEVION.reaction * (self.perks.has('s2-dark') ? PERKS.reaction : 1), true, 0, true);
            react();
          }
        },
        // The storm (tick; Bracelet of Wishes: the boss slowed meanwhile).
        icarus() {
          storm = ICARUS.lasts;
          stormTick = 0;
          blazing = 0;
          if (wearsTreasure(self, 2)) fight.slow(UT.bracelet.slow, ICARUS.lasts);
        },
      },
      // Each skill she uses gains her mana.
      used() {
        self.mana = Math.min(MAX_MANA, self.mana + ESSENCE.mana);
      },
      tick(dt) {
        if (stormWait > 0) stormWait -= dt;
        // The storm: a blow every so often; on one in [Ignite], the [Blazing Storm] for a while (harder, the boss healed less for each, its Dark: less again; Bracelet of Wishes: more physical damage taken).
        if (storm > 0) {
          storm -= dt;
          stormTick += dt;
          if (blazing > 0) blazing -= dt;
          if (stormTick >= ICARUS.every) {
            stormTick -= ICARUS.every;
            if (blazing <= 0 && ignited()) {
              blazing = ICARUS.blazes;
              shelter();
            }
            fight.hit(self, blazing > 0 ? ICARUS.blazing : ICARUS.blow);
            put(fight.foe.statuses, { name: 'Raging Storm', left: ICARUS.weakLasts, deals: ICARUS.weaker, shown: 'curse' });
            if (blazing > 0) {
              unhealed = Math.min(ICARUS.most, unhealed + 1);
              const each = self.perks.has('s3-dark') ? PERKS.heals : ICARUS.heals;
              put(fight.foe.statuses, { name: 'Blazing Storm', left: ICARUS.healLasts, count: unhealed, heals: 1 - each * unhealed, shown: 'burn' });
              if (wearsTreasure(self, 2)) put(fight.foe.statuses, { name: 'Bracelet of Wishes', left: UT.bracelet.lasts, takes: { physical: 1 + fromTreasure(self, 2, UT.bracelet.takes) }, shown: 'curse' });
            }
          }
        }
        // Transcend 5's Dark: the boss alone, more to it; with 6 allies or more, every other ally more to bosses.
        if (self.perks.has('t5-dark')) {
          const alone = fight.foes.filter((foe) => foe.hp > 0 && !foe.away).length <= 1;
          if (alone) put(self.statuses, { name: BOSSING.name, left: Infinity, deals: 1 + PERKS.dark.own, shown: BOSSING });
          else self.statuses = self.statuses.filter((status) => status.name !== BOSSING.name);
          const allies = fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
          for (const ally of fight.fighters) {
            if (ally === self) continue;
            if (allies.length >= PERKS.dark.many) put(ally.statuses, { name: 'Hope of Gray', left: Infinity, deals: 1 + PERKS.dark.allies, shown: BOSSING });
            else ally.statuses = ally.statuses.filter((status) => status.name !== 'Hope of Gray');
          }
        }
        // Her unique weapon: every 10 seconds, the boss takes more physical damage for a while, and her DMG higher (up to its most).
        if (tier !== null) {
          terraNext += dt;
          if (terraNext >= TERRAVION.every) {
            terraNext -= TERRAVION.every;
            put(fight.boss.statuses, { name: TERRAVION_UP.name, left: TERRAVION.lasts, takes: { physical: 1 + atTier(TERRAVION.takes, tier) }, shown: 'curse' });
            terravion = Math.min(TERRAVION.most, terravion + 1);
            put(self.statuses, { name: TERRAVION_UP.name, left: Infinity, count: terravion, deals: 1 + atTier(TERRAVION.dmg, tier) * terravion, shown: TERRAVION_UP });
          }
        }
      },
      lit: () => storm > 0,
    };
  },
};
