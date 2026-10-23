import { put, type Status } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { MAX_MANA } from '../rules';
import type { Foe } from '../types';
import { fine, num, pct, skillArt, type Buff } from '../shown';
import { isDragon } from '../bosses';
import { atTier, SVELTA, SVELTA_UP } from '../unique';
import { bookDmg, CLASS_STATS, dmg, type HeroDef, indexed, type Passive } from './kit';

/*
 * Yanne's skills, as the game has them (what each costs, how long before it can be used again, what No Holding Back!
 * adds and how long, and her passive's ATK and max HP are the game's; how hard each hits is not said there):
 * - Focus Shot!: an arrow, after she has focused on it (as long as she can: its DMG doubled).
 * - Wipeout!: a great arrow at the boss.
 * - No Holding Back!: what the boss has left on her cleared, and for 30 seconds her ATK and penetration far higher;
 *   meanwhile each blow of her attack takes 3% of her mana (none the more for it here: there is only the boss in its line).
 * Her passive, Dragon Slayer: her ATK and max HP higher.
 * What the game has her skills and her passive do more to a Dragon is nothing here, but for what her perks and unique
 * treasures add to it (Galgoria is a chimera; the Dragon Raid's dragons are Dragons).
 * Her unique weapon (../unique.ts) is worked here too: a critical blow of hers deals more and gains her mana (on a dragon, a
 * blow more again and a stun).
 * What is drawn for each is ../../heroes/yanne/fx.ts; what her body does for each, and for her attack, ../../heroes/yanne/moves.ts.
 *
 * Her own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Wipeout!'s Light
 * always holds (there is only the boss). No Holding Back!'s Light's more DEF-ignoring DMG to Dragons is more of what the
 * skill does to them, which isn't done here: only its mana is. Dragon Slayer's Light and Dark, and Blazing Heart of Giant,
 * change what the passive does against Dragons, which isn't done here either: so they do what they add to it (less taken
 * by everyone from a Dragon, more dealt to one by her), and Dragon Slayer's Dark has no less taken to take away.
 */
// (How hard each of her skills hits is the King's Raid Index's, at her class's ATK: ./kit.ts's indexed.)
/** Focus Shot!'s arrow, and how many times as hard it is focused (she always focuses as long as she can). */
// (Focused: the playtest's 25% more DMG, and its books' 12.6% more; the stun 25% longer.)
const FOCUS = { blow: indexed('archer', 179_237), focused: 1.376 };
const WIPEOUT = { blow: indexed('archer', 279_459) };
/** No Holding Back!: her ATK and penetration (points) more, for `lasts` seconds; the share of her mana each blow of her attack takes meanwhile. */
const UNLEASHED = { atk: 32_032, pen: 500, lasts: 30, mana: 0.03 };
/** Dragon Slayer: her ATK more, and her max HP a share more. */
const SLAYER = { atk: 9477, hp: 0.3 };
/** Dragon Slayer against Dragons, as King's Raid has it (not done here: what her perks and treasure change of it is): her DMG more, and what every ally takes from them less. */
const SLAYING = { dmg: 1, taken: 0.2 };
/**
 * Her own perks' numbers: Focus Shot!'s Dark (a blow more on a Dragon, in thousandths of her ATK, through its DEF);
 * Wipeout!'s Dark (the boss's P.Crit Resistance lower, points); No Holding Back!'s Light (her attack's mana, so many times
 * as much) and Dark (CC on her so much shorter); Dragon Slayer's Light (what every ally takes from a Dragon less) and Dark
 * (her DMG more to one); and Transcend 5's Dark (after so many blows of her attack, what helps the boss gone and a blow more).
 */
const PERKS = {
  dragonShot: 3000,
  critResist: { less: 500, lasts: 10 },
  mana: 2,
  held: 0.5,
  dragonTaken: 0.3,
  dragonDmg: 1.3,
  volley: { every: 10, blow: 5000 },
};

/**
 * Her unique treasures' numbers (0★ to 5★: ../treasures.ts): Focus Shot!'s more P.DMG taken; Wipeout!'s DMG and the
 * share off its cooldown on a critical blow; No Holding Back!'s cheaper and more DMG to the boss; and Dragon Slayer's
 * against Dragons (less taken by every ally, more dealt by her).
 */
const UT = {
  talisman: { takes: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 },
  arrow: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], cooldown: 0.12 },
  steak: { cost: -1, dmg: [0.12, 0.14, 0.17, 0.21, 0.25, 0.3] },
  heart: { taken: 0.1, dmg: [0.06, 0.072, 0.086, 0.104, 0.126, 0.15] },
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
/** What Wipeout!'s Dark leaves on the boss; and what she leaves on a Dragon, every ally taking less from it (Dragon Slayer's Light, Blazing Heart of Giant). */
const MARKED = 'Wipeout!';
const SLAIN = 'Dragon Slayer';

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
      about: `An arrow, focused on as long as she can (its DMG ${pct(FOCUS.focused - 1)} more).`,
      words: `Taking up a stance, focuses for a while and deals ${dmg('archer', FOCUS.blow, bookDmg('yanne', 0))} P.DMG to enemies in a straight line. If the target is a dragon, inflicts Stun for 3 sec. The longer she focuses, DMG is increased by ${pct(FOCUS.focused - 1)} and Stun duration by 25%.`,
      icon: '🎯',
      art: art(0),
      move: 'focus',
      cooldown: 9,
      cost: 2,
    },
    {
      name: 'Wipeout!',
      about: 'A great arrow at the boss.',
      words: `Deals ${dmg('archer', WIPEOUT.blow, bookDmg('yanne', 1))} P.DMG to target enemy and other enemies in range. If the target is a Dragon, deals extra DMG that ignores DEF.`,
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
      words: `[Focus Shot!] Gains immunity to CC while in use and increases P.DMG the target takes by ${pct(k(UT.talisman.takes))} for ${UT.talisman.lasts} sec.`,
      skill: { index: 0, steady: true, mark: { name: 'Talisman of Concentration', takes: { physical: 1 + k(UT.talisman.takes) }, lasts: UT.talisman.lasts } },
    })),
    treasure('Giant Arrow of Sudden Death', (k) => ({
      words: `[Wipeout!] Increases DMG by ${pct(k(UT.arrow.dmg))} and reduces Cooldown by ${pct(UT.arrow.cooldown)} upon a Crit Hit.`,
      skill: { index: 1, dmg: 1 + k(UT.arrow.dmg), critCooldown: UT.arrow.cooldown },
    })),
    treasure('Dragon Steak', (k) => ({
      words: `[No Holding Back!] Reduces Mana Cost by ${-UT.steak.cost}, and increases DMG dealt to Non-Hero enemies by ${pct(k(UT.steak.dmg))} for the duration of Skill.`,
      skill: { index: 2, cost: UT.steak.cost },
    })),
    // (Her part does it: what every ally takes from a Dragon, and what she deals one.)
    treasure('Blazing Heart of Giant', (k) => ({
      words: `[Dragon Slayer] Reduces DMG that allies take from Dragons by an additional ${pct(UT.heart.taken)} and increases DMG dealt to Dragons by ${fine(k(UT.heart.dmg))}.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, dmg: 1.4 } }, ({ skill }) => `DMG is increased by ${pct(skill.dmg - 1)}.`),
    's1-dark': { words: `If the target is a Dragon, deals additional P.DMG equal to ${pct(PERKS.dragonShot / 1000)} of ATK that ignores DEF.` },
    's2-light': said({ skill: { index: 1, dmg: 2 } }, ({ skill }) => `When there is 1 enemy, DMG is boosted by ${pct(skill.dmg - 1)}.`),
    's2-dark': said(
      { skill: { index: 1, mark: { name: MARKED, critTaken: { physical: PERKS.critResist.less }, lasts: PERKS.critResist.lasts } } },
      ({ skill }) => `Reduces the hit target's P.Crit Resistance by ${skill.mark.critTaken.physical} for ${skill.mark.lasts} sec.`,
    ),
    's3-light': { words: `Increases Mana consumed by normal attacks by ${pct(PERKS.mana - 1)} and additional P.DMG that ignores DEF dealt to Dragons by 50%.` },
    's3-dark': { words: `Reduces the duration of CC effects inflicted upon self by ${pct(1 - PERKS.held)} for the duration of Skill.` },
    's4-light': { words: `Changes the DMG Reduction effect from Dragons of all allies to ${pct(PERKS.dragonTaken)}.` },
    's4-dark': { words: `The DMG Reduction effect from Dragons is not applied to allies, but self’s DMG Boost effect against Dragons is applied as ${pct(PERKS.dragonDmg)}.` },
    't5-light': t5Light({ critDamage: 0.2 }, ({ critDamage }) => `Crit DMG +${pct(critDamage)}`),
    't5-dark': { words: `Upon landing ${PERKS.volley.every} normal attacks, dispels all positive effects from the target and deals additional P.DMG equal to ${pct(PERKS.volley.blow / 1000)} of ATK.` },
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
    /** Blows of her attack landed, toward Transcend 5's Dark's; and the enemy its blow is due on (dealt as the fight next steps). */
    let volley = 0;
    let volleyOn: Foe | null = null;
    /**
     * Against a Dragon, what her perks and Blazing Heart of Giant add to Dragon Slayer's (King's Raid's, not done here):
     * her DMG more (its Dark's over the passive's; the treasure's besides), and what every ally takes from it less (its
     * Light's over the passive's, and the treasure's; none at all with its Dark, which takes the passive's away).
     */
    const darker = self.perks.has('s4-dark');
    const toDragon = 1 + (darker ? PERKS.dragonDmg - SLAYING.dmg : 0) + fromTreasure(self, 3, UT.heart.dmg);
    const fromDragon = darker ? 0 : (self.perks.has('s4-light') ? PERKS.dragonTaken - SLAYING.taken : 0) + (wearsTreasure(self, 3) ? UT.heart.taken : 0);

    /** A blow of hers: a critical one, with her unique weapon (no sooner than a moment after the last), a blow more and mana; on a dragon, a blow more again and a stun. */
    const shoot = (amount: number): boolean => {
      const critical = fight.hit(self, amount);
      if (critical && tier !== null && svelta <= 0) {
        svelta = SVELTA.every;
        fight.hit(self, atTier(SVELTA.blow, tier), false);
        self.mana = Math.min(MAX_MANA, self.mana + SVELTA.mana);
        if (isDragon(fight.foe.def.id)) {
          fight.hit(self, atTier(SVELTA.dragon, tier), false);
          fight.stun(SVELTA.stun, { by: self });
        }
      }
      return critical;
    };
    /** Her attack: an arrow (with No Holding Back! on her, taking a share of her mana as it goes: its Light, twice that). */
    const loose = (amount: number): void => {
      if (unleashed > 0) self.mana = Math.max(0, self.mana - UNLEASHED.mana * (self.perks.has('s3-light') ? PERKS.mana : 1) * MAX_MANA);
      shoot(amount);
    };

    return {
      lands: {
        // Her attack: an arrow, as written in code; or as her animation for it has it.
        shot: () => loose(fight.basic),
        attack: () => loose(fight.basic),
        // Focused as long as she can: doubled (its Dark: on a Dragon, a blow more, through its DEF).
        focus() {
          shoot(FOCUS.blow * FOCUS.focused);
          if (self.perks.has('s1-dark') && isDragon(fight.foe.def.id)) fight.hit(self, PERKS.dragonShot, false, 0, true);
        },
        // A great arrow (its Dark's lower P.Crit Resistance is its perk's mark).
        wipeout: () => shoot(WIPEOUT.blow),
        // What the boss has left on her cleared; her ATK and penetration far higher for a while (its Dark: CC on her shorter meanwhile).
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
            shown: UNLEASH,
          });
        },
      },
      tick(dt) {
        unleashed = Math.max(0, unleashed - dt);
        svelta = Math.max(0, svelta - dt);
        // Transcend 5's Dark, due: what helps the enemy gone and a blow more (if it still stands).
        const on = volleyOn;
        volleyOn = null;
        if (on && on.hp > 0 && !on.away)
          fight.on(on, () => {
            for (let i = on.statuses.length - 1; i >= 0; i--) if ((on.statuses[i]?.deals ?? 1) > 1) on.statuses.splice(i, 1);
            fight.hit(self, PERKS.volley.blow, false);
          });
        // On a Dragon while she stands on the field: every ally taking less from it.
        if (fromDragon <= 0 || !isDragon(fight.boss.def.id)) return;
        const at = fight.boss.statuses.findIndex((status) => status.name === SLAIN);
        if (self.hp > 0 && fight.field.includes(self)) {
          if (at < 0) put(fight.boss.statuses, { name: SLAIN, left: Infinity, deals: 1 - fromDragon, shown: 'curse' });
        } else if (at >= 0) fight.boss.statuses.splice(at, 1);
      },
      // More to a Dragon (Dragon Slayer's Dark, Blazing Heart of Giant).
      deals: () => (isDragon(fight.foe.def.id) ? toDragon : 1),
      // CC on her shorter while No Holding Back! lasts (its Dark).
      held: () => (unleashed > 0 && self.perks.has('s3-dark') ? PERKS.held : 1),
      // Transcend 5's Dark: every so many blows of her attack, what helps the enemy hit gone and a blow more (as the fight next
      // steps, not inside this blow: a blow that beats it there would have it beaten twice).
      blow(skill) {
        if (skill || !self.perks.has('t5-dark') || ++volley < PERKS.volley.every) return;
        volley = 0;
        volleyOn = fight.foe;
      },
      lit: () => unleashed > 0,
      buffs: () => (tier !== null && svelta > 0 ? [{ ...SVELTA_UP, left: svelta }] : []),
    };
  },
};

