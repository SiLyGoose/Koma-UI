import { away, put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { num, pct, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { atTier, BENEDICIA, BENEDICIA_UP } from '../unique';
import { attackStarts, bookDmg, bookHeal, CLASS_STATS, dmg, healed, type HeroDef, type Passive, played, playedHeal } from './kit';

/*
 * Lucias's skills, as King's Raid's playtest has them (stats/lucias.md: how hard each hits and heals at its level 90, and
 * every number here, are its; its words are its own). He is a priest whose blows are physical, the Saint of Blessings.
 * - Path of Blessings: heals the 4 allies with the lowest HP, and they take less physical damage for a while.
 * - Zone of Faith: a zone for a while: every ally's ATK higher and what the boss left on it cleared, every ally healed every
 *   second; the boss struck and stunned a moment every second.
 * - Stigmata: for a while every ally dodges physical blows more and its ATK is higher (its books' half again); and each part
 *   of his attack four blows more, each leaving the boss taking more physical damage for a while.
 * His passive, Holy Sacrifice: Path of Blessings and Zone of Faith cost him a share of his HP; each of their heals heals
 * more, and raises its ally's DEF for a while.
 * His unique weapon (../unique.ts) is worked here too: for the fight's first seconds, every ally takes less physical
 * damage, is quicker and deals more to Non-Hero enemies.
 * What is drawn for each, and what his body does, are King's Raid's own (../../assets/heroes/lucias.ts).
 *
 * His own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Stigmata's Light
 * leaves the boss's ACC lower, which its blows don't go by yet. Dice of Remembrance's mana off the boss, and Guidance of
 * Morning Star's Stigmata that can't be dispelled (nothing here dispels a hero's), do nothing here. Every ally is within
 * his zone, and the boss too: the field is small.
 */
/** Path of Blessings: how many allies, its heal, and the physical damage less they take, for how long. */
const PATH = { allies: 4, heal: playedHeal('priest', 5293, 205_365), taken: 0.8, lasts: 7 };
/** Zone of Faith: how long; every ally's ATK more (flat); its heal and its blow every second, and the blow's stun. */
const ZONE = { lasts: 6, atk: 58_585, heal: playedHeal('priest', 820, 38_194), blow: played('priest', 1500, 61_157), stun: 0.7 };
/** Stigmata: how long; every ally's P.Dodge (points) and ATK more (flat, its books' half again); each of the four blows more on each part of his attack, and the boss's more physical damage taken, for how long. */
const STIGMATA = { lasts: 15, dodge: 250, atk: 33_259, books: 1.5, blow: played('priest', 700, 32_399), blows: 4, takes: 1.25, marked: 5 };
/** Holy Sacrifice: the share of his current HP each of the two skills costs; each heal's heal more, and DEF it gives (flat), for how long. */
const SACRIFICE = { cost: 0.2, heal: playedHeal('priest', 656, 30_470), defense: 4_075, lasts: 10 };
/** His own perks' numbers: Path's Dark's mana; Zone's Light's mana every second; Stigmata's Light's ACC less on the boss, for how long; Holy Sacrifice's Light's more healing; Transcend 5's Dark's mana, for how long. */
const PERKS = { mana: 500, zoneMana: 200, acc: 150, accLasts: 5, heals: 1.4, regen: 4, regenLasts: 3 };

/**
 * His unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Path's shorter cooldown; Zone's mana off the
 * boss every second; Stigmata's shorter cooldown; Holy Sacrifice's more DEF and the ATK it gives its allies, for a while.
 */
const UT = {
  book: { cooldown: [0.12, 0.14, 0.17, 0.21, 0.25, 0.3] },
  dice: { mana: [200, 240, 290, 350, 420, 500] },
  star: { cooldown: [0.12, 0.14, 0.17, 0.21, 0.25, 0.3] },
  sword: { defense: 0.5, atk: [0.08, 0.1, 0.12, 0.14, 0.17, 0.2], lasts: 5 },
};

const art = skillArt('lucias');

const SACRIFICE_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Holy Sacrifice', about: `Passive. Path of Blessings and Zone of Faith cost him ${pct(SACRIFICE.cost)} of his current HP; each of their heals heals more, and gives its ally +${num(SACRIFICE.defense)} DEF for ${SACRIFICE.lasts} seconds.`, icon: '✝️', art: art(3) },
  words: `Casting Path of Blessings and Zone of Faith consumes ${pct(SACRIFICE.cost)} of self's current HP. Upon healing an ally with these spells, the amount of healing is increased by ${healed('priest', SACRIFICE.heal, bookHeal('lucias', 3))} and the target gains ${num(SACRIFICE.defense)} additional DEF for ${SACRIFICE.lasts} sec.`,
};
const BLESSED: Buff = { name: 'Path of Blessings', about: 'Takes less physical damage.', icon: '🙏', art: art(0) };
const FAITH: Buff = { name: 'Zone of Faith', about: 'ATK higher.', icon: '⛪', art: art(1) };
const STIGMA: Buff = { name: 'Stigmata', about: 'Dodges physical blows more, and ATK higher.', icon: '✨', art: art(2) };
const SACRIFICED: Buff = { name: 'Holy Sacrifice', about: 'DEF higher.', icon: '✝️', art: art(3) };
const SWORD: Buff = { name: 'Sword of Sacrifice', about: 'ATK higher.', icon: '🗡️', art: art(3) };
const FLOWING: Buff = { name: 'Saint of Blessings', about: 'Mana fills faster.', icon: '✝️', art: art(3) };

export const LUCIAS: HeroDef = {
  id: 'lucias',
  name: 'Lucias',
  class: 'priest',
  skins: ['Lucias', 'Lucias_Christmas', 'Lucias_Wedding', 'Lucias_Summer', 'Lucias_School', 'Lucias_Glory', 'Lucias_Glory2', 'Lucias_DailyLook'],
  stats: { ...CLASS_STATS.priest, deals: 'physical' },
  abilities: [
    {
      name: 'Path of Blessings',
      about: `Heals the ${PATH.allies} allies with the lowest HP; they take ${pct(1 - PATH.taken)} less physical damage for ${PATH.lasts} seconds.`,
      words: `Heals ${PATH.allies} allies with the lowest HP by ${healed('priest', PATH.heal, bookHeal('lucias', 0))} and targets take ${pct(1 - PATH.taken)} reduced P.DMG for ${PATH.lasts} sec.`,
      icon: '🙏',
      art: art(0),
      move: 'path',
      cooldown: 10,
      cost: 2,
    },
    {
      name: 'Zone of Faith',
      about: `A zone for ${ZONE.lasts} seconds: every ally's ATK +${num(ZONE.atk)} and what the boss left on it cleared, every ally healed every second; the boss struck and stunned for ${ZONE.stun} seconds every second.`,
      words: `Sets up the [Zone of Faith] at own location for ${ZONE.lasts}sec. Increases ATK of allies within [Zone of Faith] by ${num(ZONE.atk)} and continuously dispels negative effects. Additionally, heals allies within range by ${healed('priest', ZONE.heal, bookHeal('lucias', 1))} for 1 sec. Enemies within the zone take ${dmg('priest', ZONE.blow, bookDmg('lucias', 1))} P.DMG for 1 sec and are stunned for ${ZONE.stun}sec.`,
      icon: '⛪',
      art: art(1),
      move: 'zone',
      cooldown: 15,
      cost: 5,
    },
    {
      name: 'Stigmata',
      auto: { keeps: STIGMA.name },
      about: `For ${STIGMATA.lasts} seconds: every ally +${STIGMATA.dodge} P.Dodge and ATK +${num(Math.round(STIGMATA.atk * STIGMATA.books))}; each part of his attack ${STIGMATA.blows} blows more, the boss taking ${pct(STIGMATA.takes - 1)} more physical damage for ${STIGMATA.marked} seconds.`,
      words: `For ${STIGMATA.lasts}sec, increases all allies’ Physical Evasion by ${STIGMATA.dodge} and ATK by ${num(Math.round(STIGMATA.atk * STIGMATA.books))}. The effect ends upon death. Additionally, for ${STIGMATA.lasts}sec, Normal Attacks deal ${dmg('priest', STIGMATA.blow * STIGMATA.blows, bookDmg('lucias', 2))} additional P.DMG and increase the target’s P.DMG taken by ${pct(STIGMATA.takes - 1)} for ${STIGMATA.marked}sec.`,
      icon: '✨',
      art: art(2),
      move: 'stigmata',
      cooldown: 25,
      cost: 3,
    },
  ],
  passive: SACRIFICE_SHOWN,
  treasures: [
    treasure('Book of Blessings', (k) => ({
      words: `[Path of Blessings] Reduces Mana Cost by 1 and Cooldown by ${pct(k(UT.book.cooldown))}.`,
      skill: { index: 0, cost: -1, cooldownShare: 1 - k(UT.book.cooldown) },
    })),
    treasure('Dice of Remembrance', (k) => ({
      words: `[Zone of Faith] Reduces Mana Cost by 1, and reduces Mana of enemies within range by ${k(UT.dice.mana)} per sec.`,
      skill: { index: 1, cost: -1 },
    })),
    treasure('Guidance of Morning Star', (k) => ({
      words: `[Stigmata] The effect of Stigmata cannot be dispelled by skill removing the positive effects. Reduces Cooldown by ${pct(k(UT.star.cooldown))}.`,
      skill: { index: 2, cooldownShare: 1 - k(UT.star.cooldown) },
    })),
    treasure('Sword of Sacrifice', (k) => ({
      words: `[Holy Sacrifice] Increases DEF boost by ${pct(UT.sword.defense)}. Targets have their ATK increased by ${pct(k(UT.sword.atk))} for ${UT.sword.lasts} sec.`,
    })),
  ],
  perks: {
    's1-light': { words: 'Changes the targets to all allies.' },
    's1-dark': { words: `Recovers target's Mana by ${PERKS.mana}.` },
    's2-light': { words: `Recovers Mana for allies within range by ${PERKS.zoneMana} per sec.` },
    's2-dark': { words: 'Continuously dispels positive effects from enemies within range.' },
    's3-light': { words: `Additional P.DMG from [Stigmata] decreases the target's ACC by ${PERKS.acc} for ${PERKS.accLasts} sec.` },
    's3-dark': said({ skill: { index: 2, steady: true } }, () => 'Gains immunity to CC for the duration of skill.'),
    's4-light': { words: `Increases Heal Rate by ${pct(PERKS.heals - 1)}.` },
    's4-dark': { words: 'No longer consumes HP.' },
    't5-light': t5Light({ resist: 100 }, ({ resist }) => `CC Resist +${resist}`),
    't5-dark': { words: `Increases own Mana Recovery/Sec by ${pct(PERKS.regen - 1)} for ${PERKS.regenLasts} sec upon casting an active Skill.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    const starts = attackStarts('lucias');
    /** Zone of Faith: how long yet, toward its next second; Stigmata: how long yet; how long into the fight (his unique weapon). */
    let zone = 0;
    let zoneTick = 0;
    let stigmata = 0;
    let into = 0;
    /** His allies on the field, standing and in the fight (him too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    const sword = wearsTreasure(self, 3);
    /** A heal of Path's or Zone's: and Holy Sacrifice's (its Light: more, on Holy Sacrifice's own heal alone, as the game's perk raises only that one; Sword of Sacrifice: more DEF, and ATK a while). */
    const bless = (ally: Fighter, amount: number): void => {
      fight.heal(ally, amount, self);
      fight.heal(ally, SACRIFICE.heal * (self.perks.has('s4-light') ? PERKS.heals : 1), self);
      const defense = SACRIFICE.defense * (sword ? 1 + UT.sword.defense : 1);
      put(ally.statuses, { name: SACRIFICED.name, left: SACRIFICE.lasts, bolsters: { physical: defense, magical: defense }, shown: SACRIFICED });
      if (sword) put(ally.statuses, { name: SWORD.name, left: UT.sword.lasts, atk: fromTreasure(self, 3, UT.sword.atk), shown: SWORD });
    };
    /** Holy Sacrifice's cost (its Dark: none). */
    const sacrifice = (): void => {
      if (!self.perks.has('s4-dark')) self.hp = Math.max(1, self.hp * (1 - SACRIFICE.cost));
    };

    return {
      lands: {
        // His attack; under Stigmata, each part of it four blows more, the boss taking more physical damage (its Light: its ACC lower).
        attack(part) {
          fight.hit(self, fight.basic);
          if (stigmata <= 0 || !starts.has(part)) return;
          for (let i = 0; i < STIGMATA.blows; i++) fight.hit(self, STIGMATA.blow);
          put(fight.foe.statuses, { name: STIGMA.name, left: STIGMATA.marked, takes: { physical: STIGMATA.takes }, shown: 'curse' });
          if (self.perks.has('s3-light')) put(fight.foe.statuses, { name: 'Stigmata’s Blindness', left: PERKS.accLasts, acc: -PERKS.acc, shown: 'curse' });
        },
        // The allies with the lowest HP (its Light: all of them) healed, and taking less physical damage (its Dark: mana).
        path() {
          const all = allies();
          const on = self.perks.has('s1-light') ? all : all.sort((a, b) => a.hp / a.stats.hp - b.hp / b.stats.hp).slice(0, PATH.allies);
          fight.cue(self, 'path', on);
          for (const ally of on) {
            bless(ally, PATH.heal);
            put(ally.statuses, { name: BLESSED.name, left: PATH.lasts, takes: { physical: PATH.taken }, shown: BLESSED });
            if (self.perks.has('s1-dark')) ally.mana = Math.min(MAX_MANA, ally.mana + PERKS.mana);
          }
        },
        // The zone (tick).
        zone() {
          zone = ZONE.lasts;
          zoneTick = 1;
        },
        // Every ally dodges more and its ATK is higher; his attack the more (attack).
        stigmata() {
          stigmata = STIGMATA.lasts;
          for (const ally of allies()) put(ally.statuses, { name: STIGMA.name, left: STIGMATA.lasts, dodges: { physical: STIGMATA.dodge }, atk: (STIGMATA.atk * STIGMATA.books) / ally.stats.atk, shown: STIGMA });
        },
      },
      used(index) {
        if (index === 0 || index === 1) sacrifice();
        // Transcend 5's Dark: his mana faster a moment.
        if (self.perks.has('t5-dark')) put(self.statuses, { name: FLOWING.name, left: PERKS.regenLasts, mana: PERKS.regen, shown: FLOWING });
      },
      tick(dt) {
        if (stigmata > 0) stigmata -= dt;
        // Zone of Faith: every ally's ATK higher and cleared (its Dark: what helps the boss gone, as the fight's dispels have it); every second each healed (its Light: mana), and the boss struck and stunned.
        if (zone > 0) {
          zone -= dt;
          zoneTick += dt;
          const on = allies();
          for (const ally of on) {
            put(ally.statuses, { name: FAITH.name, left: Math.max(0.3, zone), atk: ZONE.atk / ally.stats.atk, shown: FAITH });
            ally.statuses = ally.statuses.filter((status) => status.shown.harmful !== true || status.binds === true);
          }
          if (self.perks.has('s2-dark')) {
            const helps = fight.foe.statuses;
            for (let i = helps.length - 1; i >= 0; i--) if ((helps[i]?.deals ?? 1) > 1) helps.splice(i, 1);
          }
          if (zoneTick >= 1) {
            zoneTick -= 1;
            fight.cue(self, 'zone', on);
            for (const ally of on) {
              bless(ally, ZONE.heal);
              if (self.perks.has('s2-light')) ally.mana = Math.min(MAX_MANA, ally.mana + PERKS.zoneMana);
            }
            fight.hit(self, ZONE.blow);
            fight.stun(ZONE.stun, { by: self });
          }
        }
        // His unique weapon: for the fight's first seconds, every ally takes less physical damage, is quicker and deals more to Non-Hero enemies.
        if (tier !== null && into < BENEDICIA.lasts && fight.field.includes(self)) {
          if (into === 0) put(fight.party, { name: BENEDICIA_UP.name, left: BENEDICIA.lasts, takes: { physical: 1 - atTier(BENEDICIA.taken, tier) }, speed: atTier(BENEDICIA.speed, tier), deals: 1 + atTier(BENEDICIA.boss, tier), shown: BENEDICIA_UP });
          into += dt;
        }
      },
      lit: () => zone > 0 || stigmata > 0,
    };
  },
};
