import { share } from '../combat/damage';
import { put, type Status } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure } from '../treasures';
import { BLOW, MAX_MANA } from '../rules';
import { num, pct, skillArt, type Buff } from '../shown';
import { SVELTA, SVELTA_UP } from '../unique';
import { CLASS_STATS, dmg, indexed, type HeroDef, type Passive } from './kit';

/*
 * Yanne's skills, as the game has them (what each costs, how long before it can be used again, what No Holding Back!
 * adds and how long, and her passive's ATK and max HP are the game's; how hard each hits is not said there):
 * - Focus Shot!: an arrow, after she has focused on it (as long as she can: its DMG doubled).
 * - Wipeout!: a great arrow at the boss.
 * - No Holding Back!: what the boss has left on her cleared, and for 30 seconds her ATK and penetration far higher;
 *   meanwhile each blow of her attack takes 3% of her mana (none the more for it here: there is only the boss in its line).
 * Her passive, Dragon Slayer: her ATK and max HP higher.
 * What the game has each do more to a Dragon is nothing here: Galgoria is a chimera.
 * Her unique weapon (../unique.ts) is worked here too: a critical blow of hers deals more and gains her mana.
 * What is drawn for each is ../../heroes/yanne/fx.ts; what her body does for each, and for her attack, ../../heroes/yanne/moves.ts.
 *
 * Her own perks (../perks.ts) are King's Raid's. Wipeout!'s Light always holds (there is only the boss). Dragon
 * Slayer's Light and Dark, and Transcend 5's Dark, do nothing here (no Dragon; the boss doesn't block).
 */
// (How hard each of her skills hits is the King's Raid Index's, at her class's ATK: ./kit.ts's indexed.)
const SHOT = { blow: BLOW * 1.3 };
/** Her arrow when she draws it as her attack's animation has it (quicker than as written in code): her attack about as hard over time. */
const DRAWN = { blow: BLOW * 1.06 };
/** Focus Shot!'s arrow, and how many times as hard it is focused (she always focuses as long as she can). */
const FOCUS = { blow: indexed('archer', 179_237), focused: 2 };
const WIPEOUT = { blow: indexed('archer', 279_459) };
/** No Holding Back!: her ATK and penetration (points) more, for `lasts` seconds; the share of her mana each blow of her attack takes meanwhile. */
const UNLEASHED = { atk: 32_032, pen: 500, lasts: 30, mana: 0.03 };
/** Dragon Slayer: her ATK more, and her max HP a share more. */
const SLAYER = { atk: 9477, hp: 0.3 };
/** Her own perks' numbers: Focus Shot!'s Dark, Wipeout!'s Dark, No Holding Back!'s Light and Dark. */
const PERKS = { marked: { takes: 1.25, lasts: 10 }, stun: 2, speed: 250, taken: 0.75 };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts): Focus Shot!'s more P.DMG taken; Wipeout!'s DMG and the
 * share off its cooldown on a critical blow; No Holding Back!'s cheaper and more DMG to the boss; and Dragon Slayer's
 * against Dragons (nothing here: Galgoria is a chimera).
 */
const UT = {
  talisman: { takes: [0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 },
  arrow: { dmg: [0.24, 0.29, 0.35, 0.42, 0.5], cooldown: 0.12 },
  steak: { cost: -1, dmg: [0.14, 0.17, 0.21, 0.25, 0.3] },
  heart: { taken: 0.1, dmg: [0.072, 0.086, 0.104, 0.126, 0.15] },
};

const art = skillArt('yanne');

const DRAGON_SLAYER: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Dragon Slayer',
    about: `Passive. +${num(SLAYER.atk)} ATK and +${pct(SLAYER.hp)} max HP. (More against a Dragon: Galgoria is none.)`,
    icon: '🐉',
    art: art(3),
  },
  words: `ATK is increased by ${num(SLAYER.atk)} , and Max HP is increased by ${pct(SLAYER.hp)}. Also, DMG dealt to Dragons is increased by 50%.`,
};
/** No Holding Back!: shown on her card while it lasts. */
const UNLEASH: Buff = { name: 'No Holding Back!', about: `+${num(UNLEASHED.atk)} ATK and +${UNLEASHED.pen} penetration; each blow of her attack takes ${pct(UNLEASHED.mana)} of her mana.`, icon: '🏹', art: art(2) };
/** What Focus Shot!'s Dark leaves on the boss. */
const MARKED = 'Focus Shot!';

export const YANNE: HeroDef = {
  id: 'yanne',
  name: 'Yanne',
  class: 'archer',
  skins: ['Yanne'],
  // An archer (her blows physical), with Dragon Slayer's ATK and max HP.
  stats: { ...CLASS_STATS.archer, atk: CLASS_STATS.archer.atk + SLAYER.atk, hp: Math.round(CLASS_STATS.archer.hp * (1 + SLAYER.hp)), deals: 'physical' },
  abilities: [
    {
      name: 'Focus Shot!',
      about: `An arrow, focused on as long as she can (its DMG doubled).`,
      words: `Taking up a stance, focuses for a while and deals ${dmg('archer', FOCUS.blow)} P.DMG to enemies in a straight line. If the target is a dragon, inflicts Stun for 3 sec. The longer she focuses, DMG and Stun duration are increased by 100%.`,
      icon: '🎯',
      art: art(0),
      move: 'focus',
      cooldown: 9,
      cost: 2,
    },
    {
      name: 'Wipeout!',
      about: 'A great arrow at the boss.',
      words: `Deals ${dmg('archer', WIPEOUT.blow)} P.DMG to target enemy and other enemies in range. If the target is a Dragon, deals extra DMG that ignores DEF.`,
      icon: '💥',
      art: art(1),
      move: 'wipeout',
      cooldown: 10,
      cost: 3,
    },
    {
      name: 'No Holding Back!',
      about: `What the boss has left on her is cleared; for ${UNLEASHED.lasts} seconds +${num(UNLEASHED.atk)} ATK and +${UNLEASHED.pen} penetration, and each blow of her attack takes ${pct(UNLEASHED.mana)} of her mana.`,
      words: `Removes all negative effects on self. For ${UNLEASHED.lasts} sec, ATK is increased by ${num(UNLEASHED.atk)} and Penetration is increased by ${UNLEASHED.pen}. For the duration of skill, auto attacks are changed to consuming ${pct(UNLEASHED.mana)} mana to deal DMG to all enemies in a straight line and deals extra P.DMG to Dragons ignoring DEF.`,
      icon: '🔥',
      art: art(2),
      move: 'unleash',
      cooldown: 25,
      cost: 4,
      auto: { keeps: UNLEASH.name },
    },
  ],
  passive: DRAGON_SLAYER,
  treasures: [
    treasure('Talisman of Concentration', (k) => ({
      words: `[Focus Shot!] Gains immunity to CC while in use and increases P.DMG target receives by ${pct(k(UT.talisman.takes))} for ${UT.talisman.lasts} sec.`,
      skill: { index: 0, steady: true, mark: { name: 'Talisman of Concentration', takes: { physical: 1 + k(UT.talisman.takes) }, lasts: UT.talisman.lasts } },
    })),
    treasure('Giant Arrow of Sudden Death', (k) => ({
      words: `[Wipeout!] Increases DMG by ${pct(k(UT.arrow.dmg))} and reduces Cooldown by ${pct(UT.arrow.cooldown)} upon a Crit Hit`,
      skill: { index: 1, dmg: 1 + k(UT.arrow.dmg), critCooldown: UT.arrow.cooldown },
    })),
    treasure('Dragon Steak', (k) => ({
      words: `[No Holding Back!] Reduces Mana Cost by ${-UT.steak.cost} and increases DMG to Non-Hero Enemies by ${pct(k(UT.steak.dmg))} for the skill's duration.`,
      skill: { index: 2, cost: UT.steak.cost },
    })),
    treasure('Blazing Heart of Giant', (k) => ({
      words: `[Dragon Slayer] Reduces DMG that allies take from Dragons by an additional ${pct(UT.heart.taken)} and increase DMG dealt to dragons by ${Math.round(k(UT.heart.dmg) * 1000) / 10}%`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, dmg: 1.4 } }, ({ skill }) => `DMG is increased by ${pct(skill.dmg - 1)}.`),
    's1-dark': said({ skill: { index: 0, mark: { name: MARKED, takes: { physical: PERKS.marked.takes }, lasts: PERKS.marked.lasts } } }, ({ skill }) => `Target takes ${pct(PERKS.marked.takes - 1)} additional P.DMG for ${skill.mark.lasts} sec.`),
    's2-light': said({ skill: { index: 1, dmg: 2 } }, ({ skill }) => `When there is 1 enemy, DMG is boosted by ${pct(skill.dmg - 1)}.`),
    's2-dark': { words: `Enemies hit are stunned for ${PERKS.stun} sec.` },
    's3-light': { words: `ATK Spd is boosted by ${PERKS.speed} for the duration.` },
    's3-dark': { words: `For the duration, all DMG taken is reduced by ${pct(1 - PERKS.taken)}.` },
    's4-light': { words: 'Reduces DMG that all allies take from Dragons by 20%.' },
    's4-dark': { words: 'Changes own DMG Boost against Dragons to 80%.' },
    't5-light': t5Light({ critDamage: 0.2 }, ({ critDamage }) => `Crit DMG +${pct(critDamage)}`),
    't5-dark': { words: 'Auto-attacks ignore enemy Block effects.' },
  },
  attack: 'shot',
  // Her animations: an arrow drawn and aimed, loosed as it ends; and for her skills her bow overdrawn, loosed as it lands.
  timing: {
    attack: [{ lands: [0.98], until: 1.03 }],
    skills: { focus: { lands: [1.45], until: 1.6 }, wipeout: { lands: [1.2], until: 1.6 }, unleash: { lands: [1], until: 1.6 } },
  },
  join(fight, self) {
    /** How long No Holding Back! lasts yet; until her unique weapon's next. */
    let unleashed = 0;
    let svelta = 0;
    const tier = self.unique?.tier ?? null;

    /** A blow of hers: a critical one, with her unique weapon (no sooner than a moment after the last), a blow more and mana. */
    const shoot = (amount: number): boolean => {
      const critical = fight.hit(self, amount);
      if (critical && tier !== null && svelta <= 0) {
        svelta = SVELTA.every;
        fight.hit(self, SVELTA.blow, false);
        self.mana = Math.min(MAX_MANA, self.mana + SVELTA.mana);
      }
      return critical;
    };
    /** Her attack: an arrow (with No Holding Back! on her, taking a share of her mana as it goes). */
    const loose = (amount: number): void => {
      if (unleashed > 0) self.mana = Math.max(0, self.mana - UNLEASHED.mana * MAX_MANA);
      shoot(amount);
    };

    return {
      lands: {
        // Her attack: an arrow, as written in code; or as her animation for it has it.
        shot: () => loose(SHOT.blow),
        attack: () => loose(DRAWN.blow),
        // Focused as long as she can: doubled.
        focus: () => shoot(FOCUS.blow * FOCUS.focused),
        // A great arrow (its Dark: the boss stunned).
        wipeout() {
          shoot(WIPEOUT.blow);
          if (self.perks.has('s2-dark')) fight.stun(PERKS.stun, { by: self });
        },
        // What the boss has left on her cleared; her ATK and penetration far higher for a while (its Light: quicker; its Dark: taking less).
        unleash() {
          const harmful = (status: Status<Buff>): boolean => status.shown.harmful === true && !status.binds && !status.away;
          self.statuses = self.statuses.filter((status) => !harmful(status));
          unleashed = UNLEASHED.lasts;
          put(self.statuses, {
            name: UNLEASH.name,
            left: UNLEASHED.lasts,
            // (Dragon Steak: more to the boss meanwhile.)
            deals: (1 + UNLEASHED.atk / self.stats.atk) * (1 + fromTreasure(self, 2, UT.steak.dmg)),
            pen: UNLEASHED.pen,
            ...(self.perks.has('s3-light') && { pace: 1 + share(PERKS.speed) }),
            ...(self.perks.has('s3-dark') && { takes: PERKS.taken }),
            shown: UNLEASH,
          });
        },
      },
      tick(dt) {
        unleashed = Math.max(0, unleashed - dt);
        svelta = Math.max(0, svelta - dt);
      },
      lit: () => unleashed > 0,
      buffs: () => (tier !== null && svelta > 0 ? [{ ...SVELTA_UP, left: svelta }] : []),
    };
  },
};

