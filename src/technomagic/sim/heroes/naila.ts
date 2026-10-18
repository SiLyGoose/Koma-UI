import { share } from '../combat/damage';
import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { treasure, treasureTier } from '../treasures';
import { nth, num, pct, skillArt, type Buff } from '../shown';
import { atTier, BARORO } from '../unique';
import { CLASS_STATS, dmg, indexed, type HeroDef, type Passive } from './kit';
import { CODED } from './moves';

/*
 * Naila's skills, as the game has them (what each costs, how long before it can be used again, how long what it does
 * lasts, and the shares, chances and Wind Reading's ATK are the game's; how hard each hits is not said there):
 * - Fierce Winds: two dashes through the boss, each a blow that knocks it down, and more on a boss.
 * - Wind Reading: every ally's P.Dodge and ATK higher for 15 seconds. (The boss deals only magic here: the dodge
 *   does nothing.)
 * - Dive Bomb: she flies up and strikes, more on a boss, and more again while she has it knocked down.
 * Her passive, Tornado Strike: now and then her 5th attack deals more, leaves the boss taking more physical damage for
 * a while, and knocks it down.
 * Her unique weapon (../unique.ts) is worked here too: a critical blow of hers leaves the boss losing health for a
 * while, and taking more physical damage meanwhile.
 * What is drawn for each is ../../heroes/naila/fx.ts; what her body does for each, and for her attack, ../../heroes/naila/moves.ts.
 *
 * Her own perks (../perks.ts) are King's Raid's. Fierce Winds' Light always holds (there is only the boss), and its Dark
 * does nothing here (the boss is already the one with the highest ATK); Dive Bomb's Dark goes by whether its blow was
 * critical. Transcend 5's Light's P.Dodge does nothing here, nor what her Transcend 5's Dark comes of but for a
 * magical blow dodged.
 */
// (How hard each of her skills hits is the King's Raid Index's, at her class's ATK: ./kit.ts's indexed.)
const WINDS = { blow: indexed('warrior', 212_140) / CODED.winds.lands.length, boss: indexed('warrior', 158_995) / CODED.winds.lands.length, down: 3 };
const READING = { dodge: 250, atk: 37_514, lasts: 15 };
const DIVE = { blow: indexed('warrior', 296_346), boss: indexed('warrior', 444_527), downed: 1.5 };
/** Tornado Strike: every so many attacks, its chance, its blow, how much more physical damage the boss takes, and for how long, and how long it is knocked down. */
const TORNADO = { every: 5, chance: 0.4, blow: indexed('warrior', 183_165), takes: 1.3, lasts: 10, down: 3 };
/** Her own perks' numbers: Wind Reading's Dark, Dive Bomb's Dark's cooldown less, Tornado Strike's (its chance, and her ATK Spd after), and Transcend 5's Dark (for each dodge, up to so many). */
const PERKS = { reading: 1.3, dive: 0.1, chance: 0.6, speed: 300, dodge: { cooldowns: 0.02, atk: 0.03, speed: 30, most: 10 } };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts): Fierce Winds' DMG and the mana a critical blow of it would
 * take (the boss has none); Wind Reading's heal; Dive Bomb's cheaper and DMG; Tornado Strike's more chance, and its blow
 * in Guild War (nothing here).
 */
const UT = {
  gust: { dmg: 0.5, mana: [240, 290, 350, 420, 500] },
  scarf: { heal: [0.12, 0.14, 0.17, 0.21, 0.25] },
  pride: { cost: -1, dmg: [0.24, 0.29, 0.35, 0.42, 0.5] },
  ribbon: { chance: 0.1, guildWar: [0.12, 0.14, 0.17, 0.21, 0.25] },
};

const art = skillArt('naila');

const TORNADO_STRIKE: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Tornado Strike',
    about: `Passive. Her ${nth(TORNADO.every)} attack has a ${pct(TORNADO.chance)} chance to deal more, leave the boss taking ${pct(TORNADO.takes - 1)} more physical damage for ${TORNADO.lasts} seconds, and knock it down for ${TORNADO.down}.`,
    icon: '🌪️',
    art: art(3),
  },
  words: `Every ${nth(TORNADO.every)} normal attack has a ${pct(TORNADO.chance)} chance to deal additional ${dmg('warrior', TORNADO.blow)} P.DMG to the target. The target takes ${pct(TORNADO.takes - 1)} increased P.DMG for ${TORNADO.lasts} sec and is knocked down for ${TORNADO.down} sec.`,
};
/** What Wind Reading gives every ally, and its Dark gives her. */
const READ: Buff = { name: 'Wind Reading', about: `+${READING.dodge} P.Dodge and +${num(READING.atk)} ATK.`, icon: '🍃', art: art(1) };
const READ_DARK: Buff = { name: 'Wind Reading (Dark)', about: `Deals ${pct(PERKS.reading - 1)} more to the boss.`, icon: '🍃', art: art(1) };
/** Tornado Strike's Dark, and Transcend 5's Dark's stacks. */
const WHIRLED: Buff = { name: 'Tornado Strike', about: `+${PERKS.speed} attack speed.`, icon: '🌪️', art: art(3) };
const GUSTS: Buff = { name: 'Gale', about: `+${pct(PERKS.dodge.atk)} ATK and +${PERKS.dodge.speed} attack speed for each.`, icon: '🪶', art: art(3) };
/** What her blows leave on the boss. */
const TORN = 'Tornado Strike';

export const NAILA: HeroDef = {
  id: 'naila',
  name: 'Naila',
  class: 'warrior',
  skins: ['Naila'],
  // A warrior (her blows physical): as her class stands.
  stats: { ...CLASS_STATS.warrior, deals: 'physical' },
  abilities: [
    {
      name: 'Fierce Winds',
      about: `Two dashes through the boss, each a blow that knocks it down for ${WINDS.down} seconds.`,
      words: `Dashes toward the enemy 2 times, dealing ${dmg('warrior', WINDS.blow * CODED.winds.lands.length)} P.DMG to enemies in range, knocking them down for ${WINDS.down} sec. If the target is not a Hero, deals additional ${dmg('warrior', WINDS.boss * CODED.winds.lands.length)} P.DMG.`,
      icon: '💨',
      art: art(0),
      move: 'winds',
      cooldown: 8,
      cost: 3,
    },
    {
      name: 'Wind Reading',
      about: `Every ally +${READING.dodge} P.Dodge and +${num(READING.atk)} ATK for ${READING.lasts} seconds.`,
      words: `All allies' P.Dodge Chance is increased by ${READING.dodge} for ${READING.lasts} sec, and ATK is increased by ${num(READING.atk)}.`,
      icon: '🍃',
      art: art(1),
      move: 'reading',
      cooldown: 20,
      cost: 1,
      auto: { keeps: READ.name },
    },
    {
      name: 'Dive Bomb',
      about: `She flies up and strikes the boss, ${pct(DIVE.downed - 1)} harder while she has it knocked down.`,
      words: `Flies up and strikes ${dmg('warrior', DIVE.blow)} P.DMG to enemies in range. Knocked down enemies take ${pct(DIVE.downed - 1)} increased DMG. If the target is not a Hero, deals additional ${dmg('warrior', DIVE.boss)} P.DMG.`,
      icon: '🦅',
      art: art(2),
      move: 'dive',
      cooldown: 12,
      cost: 3,
    },
  ],
  passive: TORNADO_STRIKE,
  treasures: [
    treasure('Soul of Gust', (k) => ({
      words: `[Fierce Winds] Increases DMG by ${pct(UT.gust.dmg)} and upon a Critical Hit, reduces Mana by ${k(UT.gust.mana)}`,
      skill: { index: 0, dmg: 1 + UT.gust.dmg },
    })),
    treasure('Himmullis’s Scarf', (k) => ({
      words: `[Wind Reading] All effects become irremovable and upon activation, heals own HP equals ${pct(k(UT.scarf.heal))} of Max HP.`,
      skill: { index: 1, heal: k(UT.scarf.heal) },
    })),
    treasure('Tempest Pride', (k) => ({
      words: `[Dive Bomb] Reduces Mana Cost by ${-UT.pride.cost} and increases DMG by ${pct(k(UT.pride.dmg))}`,
      skill: { index: 2, cost: UT.pride.cost, dmg: 1 + k(UT.pride.dmg) },
    })),
    treasure('Green Ribbon', (k) => ({
      words: `[Tornado Strike] Increases the chance of dealing additional DMG by ${pct(UT.ribbon.chance)} and upon activation during Guild War, deals additional P.DMG equal to ${pct(k(UT.ribbon.guildWar))} of target's Max HP.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, dmg: 2 } }, ({ skill }) => `If there is 1 enemy, DMG is increased by ${pct(skill.dmg - 1)}.`),
    's1-dark': { words: 'Target changes to the enemy with the highest ATK.' },
    's2-light': said({ skill: { index: 1, cost: -1 } }, ({ skill }) => `Mana cost is reduced by ${-skill.cost}.`),
    's2-dark': { words: `Increases Naila's DMG dealt on non-Hero enemies by ${pct(PERKS.reading - 1)} for the duration of skill.` },
    's3-light': said({ skill: { index: 2, dmg: 1.4 } }, ({ skill }) => `DMG is increased by ${pct(skill.dmg - 1)}.`),
    's3-dark': { words: `Reduces cooldown by ${pct(PERKS.dive)} per each enemy that takes Critical DMG.` },
    's4-light': { words: `Activation chance changes to ${pct(PERKS.chance)}.` },
    's4-dark': { words: `Atk Spd is boosted by ${PERKS.speed} when effect takes place.` },
    't5-light': t5Light({}, () => 'P.Dodge +100'),
    't5-dark': {
      words: `Upon dodging, all skill cooldowns are reduced by ${pct(PERKS.dodge.cooldowns)}. Also, ATK is boosted by ${pct(PERKS.dodge.atk)}, and Atk Spd is boosted by ${PERKS.dodge.speed}. The ATK and Atk Spd Boosts can stack up to ${PERKS.dodge.most} times.`,
    },
  },
  attack: 'talon',
  // Her animations: four blows, fist and foot (Ezekiel's fist fight), each an attack of hers.
  timing: { attack: [{ lands: [0.92, 1.52, 2.78, 3.62], until: 4.3 }] },
  join(fight, self) {
    /** Her attacks toward Tornado Strike's next chance; how long she has the boss knocked down yet; Transcend 5's Dark's stacks; her unique weapon's blow on the boss, how long it lasts yet, and toward its next bite. */
    let attacks = 0;
    let downed = 0;
    let gusts = 0;
    let baroro = 0;
    let bitten = 0;
    const tier = self.unique?.tier ?? null;

    /** A blow of hers: a critical one, with her unique weapon, leaves the boss losing health and taking more physical damage (begun again). */
    const strike = (amount: number): boolean => {
      const critical = fight.hit(self, amount);
      if (critical && tier !== null) {
        baroro = BARORO.lasts;
        put(fight.foe.statuses, { name: BARORO.name, left: BARORO.lasts, takes: { physical: 1 + atTier(BARORO.takes, tier) }, shown: 'curse' });
      }
      return critical;
    };
    /** She knocks the boss down. */
    const down = (seconds: number): void => {
      fight.stun(seconds, { down: true, by: self });
      downed = Math.max(downed, seconds);
    };

    /** A blow of her attack; every 5th, now and then, Tornado Strike. */
    const attack = (amount: number): void => {
      strike(amount);
      attacks++;
      if (attacks < TORNADO.every) return;
      attacks = 0;
      // (Green Ribbon: likelier.)
      if (fight.roll() >= (self.perks.has('s4-light') ? PERKS.chance : TORNADO.chance) + (treasureTier(self, 3) > 0 ? UT.ribbon.chance : 0)) return;
      fight.cue(self, 'tornado');
      strike(TORNADO.blow);
      put(fight.foe.statuses, { name: TORN, left: TORNADO.lasts, takes: { physical: TORNADO.takes }, shown: 'curse' });
      down(TORNADO.down);
      if (self.perks.has('s4-dark')) put(self.statuses, { name: WHIRLED.name, left: TORNADO.lasts, pace: 1 + share(PERKS.speed), shown: WHIRLED });
    };

    return {
      lands: {
        // Her attack: a rake of her talons, as written in code; or each blow of her fist fight, as her animation for it has it.
        talon: () => attack(fight.basic),
        attack: () => attack(fight.basic),
        // Each dash a blow, more on a boss, that knocks it down.
        winds() {
          strike(WINDS.blow + WINDS.boss);
          down(WINDS.down);
        },
        // Every ally's ATK higher for a while (its Dark: her DMG more).
        reading() {
          const allies = fight.field.filter((ally) => ally.hp > 0);
          for (const ally of allies) put(ally.statuses, { name: READ.name, left: READING.lasts, deals: 1 + READING.atk / ally.stats.atk, shown: READ });
          if (self.perks.has('s2-dark')) put(self.statuses, { name: READ_DARK.name, left: READING.lasts, deals: PERKS.reading, shown: READ_DARK });
          fight.cue(self, 'reading', allies);
        },
        // A strike, more on a boss, and more again while she has it knocked down (its Dark: a critical one, her cooldown less).
        dive() {
          const critical = strike((DIVE.blow + DIVE.boss) * (downed > 0 ? DIVE.downed : 1));
          if (critical && self.perks.has('s3-dark')) self.cooldowns[2] = Math.max(0, (self.cooldowns[2] as number) - (self.abilities[2]?.cooldown ?? 0) * PERKS.dive);
        },
      },
      // Transcend 5's Dark: each dodge, her cooldowns less, and a stack more.
      dodged() {
        if (!self.perks.has('t5-dark')) return;
        self.cooldowns = self.cooldowns.map((left, i) => Math.max(0, left - (self.abilities[i]?.cooldown ?? 0) * PERKS.dodge.cooldowns));
        gusts = Math.min(PERKS.dodge.most, gusts + 1);
      },
      tick(dt) {
        downed = Math.max(0, downed - dt);
        // Her unique weapon's blow eats at the boss every second while it lasts.
        if (baroro <= 0 || tier === null) {
          bitten = 0;
          return;
        }
        baroro -= dt;
        bitten += dt;
        if (bitten >= 1) {
          bitten -= 1;
          fight.hit(self, atTier(BARORO.blow, tier) / BARORO.lasts, false);
        }
      },
      deals: () => 1 + PERKS.dodge.atk * gusts,
      speed: () => PERKS.dodge.speed * gusts,
      lit: () => attacks === TORNADO.every - 1,
      buffs: () => (gusts > 0 ? [{ ...GUSTS, count: gusts }] : []),
    };
  },
};
