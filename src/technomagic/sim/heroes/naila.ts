import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { treasure, wearsTreasure } from '../treasures';
import { nth, num, pct, skillArt, type Buff } from '../shown';
import { atTier, BARORO, BARORO_UP } from '../unique';
import { bookDmg, CLASS_STATS, dmg, type HeroDef, indexed, type Passive } from './kit';
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
 * Her unique weapon (../unique.ts) is worked here too: a critical blow of hers leaves its target taking more physical
 * damage and with less CC resist for a while, and on the boss a stack on her, each her DMG higher.
 * What is drawn for each is ../../heroes/naila/fx.ts; what her body does for each, and for her attack, ../../heroes/naila/moves.ts.
 *
 * Her own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy), on her skills
 * as they are here (an older Naila's than krinfo's). Wind Reading's Dark does nothing here: it raises how many times the
 * Crit DMG an ally gains for a dodge under [Wind Reading] stacks, which her Wind Reading here doesn't give. Nor does what
 * makes an effect of hers irremovable (nothing here removes them), nor what she does in Guild War; Transcend 5's Dark's
 * P.Dodge only against a boss whose blows are physical (Galgoria's are magic).
 */
// (How hard each of her skills hits is the King's Raid Index's, at her class's ATK: ./kit.ts's indexed.)
const WINDS = { blow: indexed('warrior', 212_140) / CODED.winds.lands.length, boss: indexed('warrior', 158_995) / CODED.winds.lands.length, down: 3 };
const READING = { dodge: 250, atk: 37_514, lasts: 15 };
const DIVE = { blow: indexed('warrior', 296_346), boss: indexed('warrior', 444_527), downed: 1.5 };
/** Tornado Strike: every so many attacks, its chance, its blow, how much more physical damage the boss takes, and for how long, and how long it is knocked down. */
const TORNADO = { every: 5, chance: 0.4, blow: indexed('warrior', 183_165), takes: 1.3, lasts: 10, down: 3 };
/**
 * Her own perks' numbers: Fierce Winds' Dark (how much more physical damage the boss takes, and for how long), Dive Bomb's
 * Dark (its healing so many times as much, for how long), Tornado Strike's Light (her attack's DMG, and her skills'
 * cooldowns so many seconds shorter) and Dark (her DEF Penetration, for so long from the start), and Transcend 5's Dark
 * (for each critical blow, for so long, up to so many).
 */
const PERKS = {
  winds: { takes: 1.25, lasts: 10 },
  dive: { heals: 0.6, lasts: 10 },
  basic: 1.25,
  sooner: 2,
  opening: { pen: 400, lasts: 20 },
  gale: { atk: 0.03, dodge: 30, lasts: 10, most: 10 },
};

/**
 * Her unique treasures' numbers (0★ to 5★: ../treasures.ts): Fierce Winds' DMG and the mana a critical blow of it would
 * take (the boss has none); Wind Reading's heal; Dive Bomb's cheaper and DMG; Tornado Strike's more chance, and its blow
 * in Guild War (nothing here).
 */
const UT = {
  gust: { dmg: 0.5, mana: [200, 240, 290, 350, 420, 500] },
  scarf: { heal: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25] },
  pride: { cost: -1, dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
  ribbon: { chance: 0.1, guildWar: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25] },
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
  words: `Every ${nth(TORNADO.every)} normal attack has a ${pct(TORNADO.chance)} chance to deal additional ${dmg('warrior', TORNADO.blow, bookDmg('naila', 3))} P.DMG to the target. The target takes ${pct(TORNADO.takes - 1)} increased P.DMG for ${TORNADO.lasts} sec and is knocked down for ${TORNADO.down} sec.`,
};
/** What Wind Reading gives every ally. */
const READ: Buff = { name: 'Wind Reading', about: `+${READING.dodge} P.Dodge and +${num(READING.atk)} ATK.`, icon: '🍃', art: art(1) };
/** Tornado Strike's Dark, and Transcend 5's Dark's stacks. */
const OPENED: Buff = { name: 'Tornado Strike', about: `+${PERKS.opening.pen} DEF Penetration.`, icon: '🌪️', art: art(3) };
const GUSTS: Buff = { name: 'Gale', about: `+${pct(PERKS.gale.atk)} ATK and +${PERKS.gale.dodge} P.Dodge for each.`, icon: '🪶', art: art(3) };
/** What her blows leave on the boss. */
const TORN = 'Tornado Strike';

export const NAILA: HeroDef = {
  id: 'naila',
  name: 'Naila',
  class: 'warrior',
  skins: ['Naila', 'Naila_School', 'Naila_Summer', 'Naila_Frozen', 'Naila_Wedding', 'Naila_Christmas', 'Naila_Halloween'],
  // A warrior (her blows physical): as her class stands.
  stats: { ...CLASS_STATS.warrior, deals: 'physical' },
  abilities: [
    {
      name: 'Fierce Winds',
      about: `Two dashes through the boss, each a blow that knocks it down for ${WINDS.down} seconds.`,
      words: `Dashes toward the enemy 2 times, dealing ${dmg('warrior', WINDS.blow * CODED.winds.lands.length, bookDmg('naila', 0))} P.DMG to enemies in range, knocking them down for ${WINDS.down} sec. If the target is not a Hero, deals additional ${dmg('warrior', WINDS.boss * CODED.winds.lands.length, bookDmg('naila', 0))} P.DMG.`,
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
      words: `Flies up and strikes ${dmg('warrior', DIVE.blow, bookDmg('naila', 2))} P.DMG to enemies in range. Knocked down enemies take ${pct(DIVE.downed - 1)} increased DMG. If the target is not a Hero, deals additional ${dmg('warrior', DIVE.boss, bookDmg('naila', 2))} P.DMG.`,
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
      words: `[Fierce Winds] Increases DMG by ${pct(UT.gust.dmg)} and upon a Critical Hit, reduces Mana by ${k(UT.gust.mana)}.`,
      skill: { index: 0, dmg: 1 + UT.gust.dmg },
    })),
    treasure('Himmullis’s Scarf', (k) => ({
      words: `[Wind Reading] All effects become irremovable and upon activation, heals own HP equal to ${pct(k(UT.scarf.heal))} of Max HP.`,
      skill: { index: 1, heal: k(UT.scarf.heal) },
    })),
    treasure('Tempest Pride', (k) => ({
      words: `[Dive Bomb] Reduces Mana Cost by ${-UT.pride.cost} and increases DMG by ${pct(k(UT.pride.dmg))}.`,
      skill: { index: 2, cost: UT.pride.cost, dmg: 1 + k(UT.pride.dmg) },
    })),
    treasure('Green Ribbon', (k) => ({
      words: `[Tornado Strike] Increases the chance of dealing additional DMG by ${pct(UT.ribbon.chance)} and upon activation during Guild War, deals additional P.DMG equal to ${pct(k(UT.ribbon.guildWar))} of target's Max HP.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, steady: true } }, () => 'Gains immunity to CC for the duration of Skill.'),
    's1-dark': said(
      { skill: { index: 0, mark: { name: 'Fierce Winds', lasts: PERKS.winds.lasts, takes: { physical: PERKS.winds.takes } } } },
      ({ skill }) => `Increases P.DMG the hit target takes by ${pct(PERKS.winds.takes - 1)} for ${skill.mark.lasts} sec.`,
    ),
    's2-light': said({ skill: { index: 1, cost: 1, dispel: true } }, ({ skill }) => `Increases Mana Cost by ${skill.cost} and dispels positive effects from all enemies upon activation.`),
    's2-dark': { words: 'Increases the max number of stacks for Crit DMG Boost effect to 20.' },
    's3-light': said({ skill: { index: 2, dmg: 1.4 } }, ({ skill }) => `Increases DMG by ${pct(skill.dmg - 1)}.`),
    's3-dark': said(
      { skill: { index: 2, mark: { name: 'Dive Bomb', lasts: PERKS.dive.lasts, heals: PERKS.dive.heals } } },
      ({ skill }) => `Reduces the Heal Rate of the hit target by ${pct(1 - skill.mark.heals)} for ${skill.mark.lasts} sec.`,
    ),
    's4-light': { words: `Increases DMG of normal attacks by ${pct(PERKS.basic - 1)}, and reduces Cooldown of all Skills by ${PERKS.sooner} sec.` },
    's4-dark': {
      words: `At the beginning of each battle, increases own DEF Penetration by ${PERKS.opening.pen} for ${PERKS.opening.lasts} sec. Upon activation during Guild War, gains immunity to CC for 10 sec. The DEF Penetration Boost effect is irremovable.`,
    },
    't5-light': t5Light({ crit: 100 }, ({ crit }) => `Crit Chance +${crit}`),
    't5-dark': {
      words: `Upon a Critical Hit, increases own ATK by ${pct(PERKS.gale.atk)} and P.Dodge by ${PERKS.gale.dodge} for ${PERKS.gale.lasts} sec. This effect can be stacked up to max ${PERKS.gale.most} times.`,
    },
  },
  attack: 'talon',
  // Her animations: four blows, fist and foot (Ezekiel's fist fight), each an attack of hers.
  timing: { attack: [{ lands: [0.92, 1.52, 2.78, 3.62], until: 4.3 }] },
  join(fight, self) {
    /** Her attacks toward Tornado Strike's next chance; how long she has the boss knocked down yet. */
    let attacks = 0;
    let downed = 0;
    const tier = self.unique?.tier ?? null;
    // Tornado Strike's Dark: from the start, her DEF Penetration higher for a while.
    if (self.perks.has('s4-dark')) put(self.statuses, { name: OPENED.name, left: PERKS.opening.lasts, pen: PERKS.opening.pen, shown: OPENED });

    /**
     * A blow of hers: a critical one, with her unique weapon, leaves its target taking more physical damage and with less CC
     * resist (begun again); on the boss, a stack more on her (up to so many, begun again), each her DMG higher. (Transcend
     * 5's Dark: a critical one, a stack more of her ATK and P.Dodge, begun again.)
     */
    const strike = (amount: number): boolean => {
      const critical = fight.hit(self, amount);
      if (critical && tier !== null) {
        put(fight.foe.statuses, { name: BARORO.name, left: BARORO.lasts, takes: { physical: 1 + atTier(BARORO.takes, tier) }, resist: -atTier(BARORO.resist, tier), shown: 'curse' });
        if (fight.foe === fight.boss) {
          const stacks = Math.min(BARORO.most, (self.statuses.find((status) => status.name === BARORO_UP.name)?.count ?? 0) + 1);
          put(self.statuses, { name: BARORO_UP.name, left: BARORO.lasts, count: stacks, deals: 1 + atTier(BARORO.boss, tier) * stacks, shown: BARORO_UP });
        }
      }
      if (critical && self.perks.has('t5-dark')) {
        const { atk, dodge, lasts, most } = PERKS.gale;
        const stacks = Math.min(most, (self.statuses.find((status) => status.name === GUSTS.name)?.count ?? 0) + 1);
        put(self.statuses, { name: GUSTS.name, left: lasts, count: stacks, atk: atk * stacks, dodges: { physical: dodge * stacks }, shown: GUSTS });
      }
      return critical;
    };
    /** She knocks the boss down. */
    const down = (seconds: number): void => {
      fight.stun(seconds, { down: true, by: self });
      downed = Math.max(downed, seconds);
    };

    /** A blow of her attack (Tornado Strike's Light: harder); every 5th, now and then, Tornado Strike. */
    const attack = (amount: number): void => {
      strike(amount * (self.perks.has('s4-light') ? PERKS.basic : 1));
      attacks++;
      if (attacks < TORNADO.every) return;
      attacks = 0;
      // (Green Ribbon: likelier.)
      if (fight.roll() >= TORNADO.chance + (wearsTreasure(self, 3) ? UT.ribbon.chance : 0)) return;
      fight.cue(self, 'tornado');
      strike(TORNADO.blow);
      put(fight.foe.statuses, { name: TORN, left: TORNADO.lasts, takes: { physical: TORNADO.takes }, shown: 'curse' });
      down(TORNADO.down);
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
        // Every ally's ATK higher for a while.
        reading() {
          const allies = fight.field.filter((ally) => ally.hp > 0);
          for (const ally of allies) put(ally.statuses, { name: READ.name, left: READING.lasts, deals: 1 + READING.atk / ally.stats.atk, shown: READ });
          fight.cue(self, 'reading', allies);
        },
        // A strike, more on a boss, and more again while she has it knocked down.
        dive() {
          strike((DIVE.blow + DIVE.boss) * (downed > 0 ? DIVE.downed : 1));
        },
      },
      // Tornado Strike's Light: each of her skills' cooldowns shorter, as it begins again.
      used(index) {
        if (self.perks.has('s4-light')) self.cooldowns[index] = Math.max(0, (self.cooldowns[index] ?? 0) - PERKS.sooner);
      },
      tick(dt) {
        downed = Math.max(0, downed - dt);
      },
      lit: () => attacks === TORNADO.every - 1,
    };
  },
};
