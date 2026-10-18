import { away, put } from '../combat/status';
import { t5Light } from '../perks';
import { MAX_MANA } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { num, pct, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { atTier, SCHWANHEITE, SCHWANHEITE_UP } from '../unique';
import { bookDmg, bookHeal, CLASS_STATS, dmg, healed, type HeroDef, type Passive, played, playedHeal } from './kit';

/*
 * Shea's skills, as King's Raid's playtest has them (stats/shea.md: how hard each hits and heals at its level 90, and every
 * number here, are its; its words are its own). She is a priest whose blows are magical, the Aria of Fantasy: each of her
 * songs goes on for 8 seconds as she sings it, eight times.
 * - Green Nature's Melody: every ally healed each time, and taking less for the song's while.
 * - Blue Wind's Song: every ally's mana each time (its books' half again), the ally with full mana healed; CC on them
 *   shorter meanwhile.
 * - Dance of Red Passion: a blow on the boss each time, and every ally's ATK higher meanwhile (its books' half again).
 * Her passive, Trance: each skill she uses a stack of [Blissful Performance]; the next skill she uses at 3 spends them: every
 * ally healed, and [Trance] for a while: her songs the stronger.
 * Her unique weapon (../unique.ts) is worked here too: her CC resist higher, and each stack of [Blissful Performance] takes
 * a share off her cooldowns and gains her mana.
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/shea.ts).
 *
 * Her own perks (../perks.ts) are King's Raid's. Fairy's Crown's Silence does nothing to the boss.
 */
/** Green Nature's Melody: each of its eight heals; every ally's DMG taken less meanwhile (in [Trance], more); how long. */
const MELODY = { heal: playedHeal('priest', 800, 32_616), taken: 0.35, tranced: 0.7, lasts: 8 };
/** Blue Wind's Song: every ally's mana each time (its books' more; in [Trance], more again), and the full ally's heal; CC shorter meanwhile (a share). */
const SONG = { mana: 120, trance: 40, heal: playedHeal('priest', 1000, 40_774), shorter: 0.5, lasts: 8 };
/** Dance of Red Passion: each of its eight blows; every ally's ATK more (flat, its books' half again; in [Trance], twice); how long. */
const PASSION = { blow: played('priest', 546, 22_103), atk: 64_380, books: 1.5, lasts: 8 };
/** Trance: how many stacks it takes, its heal, and how long it lasts. */
const TRANCE = { needs: 3, heal: playedHeal('priest', 2640, 107_509), blow: played('priest', 2640, 107_509), lasts: 12 };
/** Her own perks' numbers: Melody's Light's heal (a share of max HP) and Dark's more to Non-Hero enemies; Song's Light's mana and Dark's attack speed; Passion's Light's more ATK and Dark's more taken; Trance's Light's twice the heal, and Dark's DEF less on the boss, for how long; Transcend 5's Dark's mana. */
const PERKS = { heal: 0.15, boss: 0.2, mana: 500, speed: 250, atk: 1.4, takes: 1.15, defense: 0.8, defenseLasts: 10, dark: 500 };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Melody's more healing and CC resist;
 * Song's ACC and mana for each ally's skill; Passion's crit DMG for every ally; Trance's ATK and attack speed meanwhile.
 */
const UT = {
  flower: { heals: 0.5, resist: [100, 120, 140, 170, 210, 250] },
  windy: { acc: 250, mana: [160, 190, 230, 270, 330, 400] },
  crown: { critDamage: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
  mira: { atk: 0.2, speed: [100, 120, 140, 170, 210, 250] },
};

const art = skillArt('shea');

const TRANCE_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Trance', about: `Passive. Each skill a stack of [Blissful Performance]; the next skill at ${TRANCE.needs} spends them: every ally healed, and [Trance] for ${TRANCE.lasts} seconds (her songs stronger).`, icon: '🎶', art: art(3) },
  words: `After Skill is used, Shea gains 1 stack of [Blissful Performance]. If Shea uses her next Skill when she has ${TRANCE.needs} stacks of [Blissful Performance], Shea consumes [Blissful Performance] and heals HP of all allies by ${healed('priest', TRANCE.heal, bookHeal('shea', 3))} and enters [Trance] state for ${TRANCE.lasts} sec. [Blissful Performance] and [Trance] are irremovable.`,
};
const SHELTERED: Buff = { name: 'Green Nature’s Melody', about: 'Takes less.', icon: '🍃', art: art(0) };
const WINDY: Buff = { name: 'Blue Wind’s Song', about: 'CC on it shorter.', icon: '🌬️', art: art(1) };
const PASSIONATE: Buff = { name: 'Dance of Red Passion', about: 'ATK higher.', icon: '💃', art: art(2) };
const BLISS: Buff = { name: 'Blissful Performance', about: `At ${TRANCE.needs}, her next skill [Trance].`, icon: '🎶', art: art(3) };
const TRANCED: Buff = { name: 'Trance', about: 'Her songs stronger.', icon: '🎶', art: art(3) };

export const SHEA: HeroDef = {
  id: 'shea',
  name: 'Shea',
  class: 'priest',
  skins: ['Shea'],
  stats: { ...CLASS_STATS.priest, deals: 'magical' },
  abilities: [
    {
      name: 'Green Nature’s Melody',
      auto: { heals: true },
      about: `For ${MELODY.lasts} seconds: every ally healed eight times, and taking ${pct(MELODY.taken)} less (in [Trance]: healed twice as much, and ${pct(MELODY.tranced)} less).`,
      words: `Heals all allies' HP by a total of ${healed('priest', MELODY.heal * 8, bookHeal('shea', 0))} over 8 times, and reduces All DMG all allies take by ${pct(MELODY.taken)} for ${MELODY.lasts} sec. If used during [Trance] state, this Skill's Heal Rate increases by 100% and changes the DMG Reduction effect to ${pct(MELODY.tranced)}.`,
      icon: '🍃',
      art: art(0),
      move: 'melody',
      cooldown: 28,
      cost: 2,
    },
    {
      name: 'Blue Wind’s Song',
      about: `For ${SONG.lasts} seconds: every ally ${SONG.mana} mana eight times, the ally with full mana healed, and CC on them ${pct(SONG.shorter)} shorter (in [Trance]: more mana, healed more, and immune to CC).`,
      words: `Recovers all allies' Mana by a total of ${SONG.mana * 8} over 8 times, heals HP of a target with max Mana by ${healed('priest', SONG.heal, bookHeal('shea', 1))}, and reduces the duration of CC effects by ${pct(SONG.shorter)} for ${SONG.lasts} sec. If used during [Trance] state, this Skill's Mana Recovery and Heal Rate increase by 50%, and all allies gain immunity to CC for ${SONG.lasts} sec.`,
      icon: '🌬️',
      art: art(1),
      move: 'song',
      cooldown: 28,
      cost: 3,
    },
    {
      name: 'Dance of Red Passion',
      auto: { keeps: PASSIONATE.name },
      about: `For ${PASSION.lasts} seconds: eight blows on the boss, and every ally's ATK +${num(Math.round(PASSION.atk * PASSION.books))} (in [Trance]: twice both).`,
      words: `Deals a total of ${dmg('priest', PASSION.blow * 8, bookDmg('shea', 2))} M.DMG to all enemies over 8 times, and increases ATK of all allies by ${num(Math.round(PASSION.atk * PASSION.books))} for ${PASSION.lasts} sec. If used during [Trance] state, this Skill's DMG and ATK Boost increase by 100%, and continuously dispels all enemies' positive effects.`,
      icon: '💃',
      art: art(2),
      move: 'passion',
      cooldown: 28,
      cost: 3,
    },
  ],
  passive: TRANCE_SHOWN,
  treasures: [
    treasure('Flower of Life', (k) => ({
      words: `[Green Nature's Melody] Increases Heal Rate by ${pct(UT.flower.heals)}, and for 8 sec, increases the target's CC Resist by ${k(UT.flower.resist)}.`,
      skill: { index: 0, heals: 1 + UT.flower.heals },
    })),
    treasure('Windy Flower', (k) => ({
      words: `[Blue Wind's Song] Increases ACC by ${UT.windy.acc} for 8 sec and recovers ${k(UT.windy.mana)} MP every time an ally uses a skill.`,
    })),
    treasure('Fairy’s Crown', (k) => ({
      words: `[Dance of Red Passion] Upon activation, enemies are inflicted with Silence for 2 sec, and all allies' Crit DMG is increased by ${pct(k(UT.crown.critDamage))} for the duration of skill.`,
    })),
    treasure('Dream of Mira', (k) => ({
      words: `[Trance] Increases own ATK by ${pct(UT.mira.atk)} and ATK Spd by ${k(UT.mira.speed)} for the duration of [Trance].`,
    })),
  ],
  perks: {
    's1-light': { words: `Heals ${pct(PERKS.heal)} HP of all allies when used.` },
    's1-dark': { words: `Increases all allies' DMG dealt to Non-Hero enemies by ${pct(PERKS.boss)} for ${MELODY.lasts} sec.` },
    's2-light': { words: `Heals ${PERKS.mana} MP of all allies when used.` },
    's2-dark': { words: `Increases ATK Spd of all allies by ${PERKS.speed} for ${SONG.lasts} seconds.` },
    's3-light': { words: `ATK Boost is increased by ${pct(PERKS.atk - 1)}.` },
    's3-dark': { words: `All enemies take ${pct(PERKS.takes - 1)} more DMG for ${PASSION.lasts} seconds.` },
    's4-light': { words: 'Increases Heal rate of Trance by 100%.' },
    's4-dark': { words: `Instead of healing allies, Shea deals M.DMG equal to Heal Rate to all enemies and reduces their All DEF by ${pct(1 - PERKS.defense)} for ${PERKS.defenseLasts} sec when she enters [Trance] state.` },
    't5-light': t5Light({ resist: 100 }, ({ resist }) => `CC Resist +${resist}`),
    't5-dark': { words: `At the beginning of each battle, gains 1 stack of [Blissful Performance] and recovers own Mana by ${PERKS.dark}.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /** [Blissful Performance]'s stacks; how long [Trance] lasts yet; whether the song now going is in [Trance]; the wave last begun; Windy Flower's while, and the skills its allies have used. */
    let bliss = 0;
    let trance = 0;
    let tranced = false;
    let wave = 0;
    let windy = 0;
    const was = new Map<Fighter, number[]>();
    // Her unique weapon: her CC resist higher, for good.
    if (tier !== null) put(self.statuses, { name: SCHWANHEITE_UP.name, left: Infinity, resist: atTier(SCHWANHEITE.resist, tier), shown: SCHWANHEITE_UP });
    /** Her allies on the field, standing and in the fight (her too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** A stack of [Blissful Performance] (her unique weapon: her cooldowns shorter, and mana). */
    const blissful = (): void => {
      bliss = Math.min(TRANCE.needs, bliss + 1);
      put(self.statuses, { name: BLISS.name, left: Infinity, count: bliss, shown: BLISS });
      if (tier === null) return;
      self.cooldowns = self.cooldowns.map((left) => left * (1 - atTier(SCHWANHEITE.sooner, tier)));
      self.mana = Math.min(MAX_MANA, self.mana + atTier(SCHWANHEITE.mana, tier));
    };
    /** The pulses of a song: parts 1 to 8 of its move (its first and last are its beginning and end). */
    const pulse = (part: number): boolean => part >= 1 && part <= 8;

    return {
      lands: {
        attack() {
          fight.hit(self, fight.basic);
        },
        // Every ally healed (in [Trance], twice), taking less meanwhile (its Light: a share of max HP as it begins; its Dark: more to Non-Hero enemies; Flower of Life: CC resist).
        melody(part) {
          const on = allies();
          if (part === 0) {
            fight.cue(self, 'melody', on);
            for (const ally of on) {
              if (self.perks.has('s1-light')) fight.heal(ally, ally.stats.hp * PERKS.heal);
              put(ally.statuses, {
                name: SHELTERED.name,
                left: MELODY.lasts,
                takes: 1 - (tranced ? MELODY.tranced : MELODY.taken),
                ...(self.perks.has('s1-dark') && { deals: 1 + PERKS.boss }),
                ...(wearsTreasure(self, 0) && { resist: fromTreasure(self, 0, UT.flower.resist) }),
                shown: SHELTERED,
              });
            }
          }
          if (!pulse(part)) return;
          for (const ally of on) fight.heal(ally, MELODY.heal * (tranced ? 2 : 1), self);
        },
        // Every ally's mana (in [Trance], more), the ally with full mana healed; CC shorter (in [Trance], none: immune; its Light: mana as it begins; its Dark: quicker; Windy Flower: ACC, and mana for their skills).
        song(part) {
          const on = allies();
          if (part === 0) {
            fight.cue(self, 'song', on);
            if (wearsTreasure(self, 1)) windy = SONG.lasts;
            for (const ally of on) {
              if (self.perks.has('s2-light')) ally.mana = Math.min(MAX_MANA, ally.mana + PERKS.mana);
              put(ally.statuses, {
                name: WINDY.name,
                left: SONG.lasts,
                ...(tranced ? { guards: true } : { resist: SONG.shorter * 1000 }),
                ...(self.perks.has('s2-dark') && { speed: PERKS.speed }),
                ...(wearsTreasure(self, 1) && { acc: UT.windy.acc }),
                shown: WINDY,
              });
            }
          }
          if (!pulse(part)) return;
          for (const ally of on) ally.mana = Math.min(MAX_MANA, ally.mana + SONG.mana + (tranced ? SONG.trance : 0));
          const full = on.find((ally) => ally.mana >= MAX_MANA);
          if (full) fight.heal(full, SONG.heal * (tranced ? 1.5 : 1), self);
        },
        // A blow on the boss (in [Trance], twice as hard), every ally's ATK higher meanwhile (its Light: more; its Dark: the boss taking more; Fairy's Crown: crit DMG).
        passion(part) {
          if (part === 0) {
            const on = allies();
            fight.cue(self, 'passion', on);
            const atk = PASSION.atk * PASSION.books * (tranced ? 2 : 1) * (self.perks.has('s3-light') ? PERKS.atk : 1);
            for (const ally of on) put(ally.statuses, { name: PASSIONATE.name, left: PASSION.lasts, atk: atk / ally.stats.atk, ...(wearsTreasure(self, 2) && { critDamage: fromTreasure(self, 2, UT.crown.critDamage) }), shown: PASSIONATE });
            if (self.perks.has('s3-dark')) put(fight.foe.statuses, { name: 'Dance of Red Passion', left: PASSION.lasts, takes: PERKS.takes, shown: 'curse' });
          }
          if (pulse(part)) fight.hit(self, PASSION.blow * (tranced ? 2 : 1));
        },
      },
      used() {
        // At 3 stacks, [Trance]: every ally healed (its Light: twice; its Dark: a blow on the boss in its place, and its DEF lower), the stacks spent.
        if (bliss >= TRANCE.needs) {
          bliss = 0;
          trance = TRANCE.lasts;
          self.statuses = self.statuses.filter((status) => status.name !== BLISS.name);
          put(self.statuses, { name: TRANCED.name, left: TRANCE.lasts, ...(wearsTreasure(self, 3) && { atk: UT.mira.atk, speed: fromTreasure(self, 3, UT.mira.speed) }), shown: TRANCED });
          if (self.perks.has('s4-dark')) {
            fight.hit(self, TRANCE.blow);
            put(fight.foe.statuses, { name: 'Trance', left: PERKS.defenseLasts, defends: PERKS.defense, shown: 'curse' });
          } else for (const ally of allies()) fight.heal(ally, TRANCE.heal * (self.perks.has('s4-light') ? 2 : 1), self);
        } else blissful();
        // (Whether this song is sung in [Trance].)
        tranced = trance > 0;
      },
      tick(dt) {
        if (trance > 0) trance -= dt;
        // Transcend 5's Dark: as each battle begins, a stack and mana.
        if (fight.wave !== wave && fight.field.includes(self) && self.hp > 0) {
          wave = fight.wave;
          if (self.perks.has('t5-dark')) {
            blissful();
            self.mana = Math.min(MAX_MANA, self.mana + PERKS.dark);
          }
        }
        // Windy Flower: while her song goes, each ally that uses a skill (its cooldown begun again) gains mana.
        for (const ally of fight.fighters) {
          const before = was.get(ally) ?? [];
          if (windy > 0 && ally.cooldowns.some((left, i) => left > (before[i] ?? 0) + 0.5)) ally.mana = Math.min(MAX_MANA, ally.mana + fromTreasure(self, 1, UT.windy.mana));
          was.set(ally, ally.cooldowns.slice());
        }
        if (windy > 0) windy -= dt;
      },
      lit: () => trance > 0,
    };
  },
};
