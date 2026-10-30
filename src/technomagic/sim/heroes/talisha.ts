import { away, put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { num, pct, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { atTier, DIOGEMME, DIOGEMME_UP } from '../unique';
import { type Ability, bookDmg, bookHeal, CLASS_STATS, dmg, healed, type HeroDef, lineOf, type Passive, played, playedHeal } from './kit';

/*
 * Talisha's skills, as King's Raid's playtest has them (stats/talisha.md: how hard each hits and heals at its level 90, and
 * every number here, are its; its words are the live game's, krinfo's legacy). She is an archer whose blows are magical, the
 * Brilliant Gemologist, her crystal Diogemme in one of two lights:
 * - [Cimatis] (blue), as she begins: Radiance of Cimatis (a blow on the boss and those near it; again within 7 seconds, a
 *   blow more through its defense; its cooldown only every second use) and Splendor of Cimatis (a blow, and a field on the
 *   boss for a while: a blow on it and mana for the frontline every second).
 * - Crystal of Resonance turns her to [Luberry] (red; and back, used again): her attack six shots (the move redshot: King's
 *   Raid's own, Attack1_Red); Dance of Luberry (nine blows that stun the boss, and against a boss a last blow more through its
 *   defense) and Full Bloom of Luberry (every ally healed, and a field for a while: every ally healed every second, the boss
 *   hitting less hard) in place of the others. Each use heals her (going to [Luberry]) or gains her mana (going back), and
 *   raises her ATK and DEF (up to 10 times).
 * Her passive, Brilliant Gemologist: every second her ATK (its books' half again), attack speed and DMG to Non-Hero enemies
 * higher (up to 60 times).
 * Her unique weapon (../unique.ts) is worked here too: her ATK higher; each of her blows leaves its target hitting less hard
 * for a while, and a boss taking more.
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/talisha.ts).
 *
 * Her own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy); its numbers the
 * playtest's. Each light's skills have cooldowns of their own (King's Raid's are skills apart); Crystal of Resonance's two
 * uses share one (one slot), so Auto doesn't turn her straight back. Brilliant Gemologist's Dark (irremovable) does nothing
 * here: nothing takes what is on her off. Transcend 5's Dark counts the enemies standing (King's Raid's: 1 or fewer, 5 or
 * more). The fields' "allies within range": Splendor of Cimatis's on the boss reaches the frontline (who stand round it),
 * Magnifying Glass's round her the allies of her own line, and Full Bloom of Luberry (King's Raid's "all allies within range")
 * every ally; its ATK cut is on the boss.
 */
/** Radiance of Cimatis: its blow (on the boss and those near it), and its blow more through its defense on one it hit within so many seconds; its cooldown, and once every how many uses. */
const RADIANCE = { blow: played('archer', 4110, 133_478), more: played('archer', 3310, 133_478), within: 7, cooldown: 17, uses: 2 };
/** Splendor of Cimatis: its blow; its field for how long, a blow and mana every second; Magnifying Glass's field round her for how long. */
const SPLENDOR = { blow: played('archer', 2840, 103_008), lasts: 10, tick: played('archer', 480, 15_665), mana: 400, own: 5 };
/** Crystal of Resonance: its heal (going to [Luberry]), its mana (going back); ATK and DEF for each use, up to how many. */
const RESONANCE = { heal: playedHeal('archer', 1240, 60_088), mana: 500, atk: 0.05, defense: 0.05, most: 10 };
/** Dance of Luberry: each of its nine blows and how long each stuns the boss; its last blow more, against a boss, through its defense. */
const DANCE = { blow: played('archer', 525, 25_752), hits: 9, stun: 1, boss: played('archer', 2350, 96_570) };
/** Full Bloom of Luberry: its heal; its field for how long, its heal every second, and the boss's ATK less. */
const BLOOM = { heal: playedHeal('archer', 1711, 90_132), lasts: 10, tick: playedHeal('archer', 390, 13_519), weaker: 0.7 };
/** [Luberry]'s attack: each of its six shots (360% in all, as her own attack's one). */
const RED_SHOT = played('archer', 600);
/** Brilliant Gemologist: every how many seconds; each stack's ATK (flat, its books' more), ATK Spd (points) and DMG to Non-Hero enemies; up to how many. */
const GEM = { every: 1, atk: 5_578, speed: 5, boss: 0.01, most: 60 };
/**
 * Her own perks' numbers: Radiance's Light's cooldown more (25 sec) and uses; Dance's Dark's more DMG for each battle begun, up
 * to how many; Full Bloom's Dark's field, how long after each battle begins, for how long; Resonance's Light's less healing
 * (its heal power's share off) and Dark's DMG to bosses for each use, up to how many; Gemologist's Light's quicker interval.
 */
const PERKS = { radiance: { cooldown: 8, uses: 3 }, dance: { dmg: 0.2, most: 20 }, bloom: { after: 2, lasts: 3 }, less: 0.5, boss: { dmg: 0.02, most: 10 }, every: 0.5 };

/**
 * Her unique treasures' numbers (0★ to 5★: ../treasures.ts; King's Raid's own): Radiance's mana and Dance's shorter cooldown;
 * Full Bloom's healing more for its allies; Resonance's shorter cooldown; Gemologist's DEF for each stack and most stacks.
 */
const UT = {
  compass: { mana: 500, cooldown: [1, 1.2, 1.4, 1.7, 2.1, 2.5] },
  glass: { heals: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
  brooch: { cooldown: [2, 2.4, 2.9, 3.5, 4.2, 5] },
  lamp: { defense: 0.01, most: [72, 74, 77, 81, 85, 90] },
};

const art = skillArt('talisha');

const GEMOLOGIST: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Brilliant Gemologist',
    about: `Passive. Every second her ATK +${num(Math.round(GEM.atk * bookDmg('talisha', 3)))}, attack speed +${GEM.speed} and DMG to Non-Hero enemies +${pct(GEM.boss)} (up to ${GEM.most} times).`,
    icon: '💎',
    art: art(3),
  },
  words: `Talisha appraises a gem, increasing ATK by ${num(Math.round(GEM.atk * bookDmg('talisha', 3)))}, ATK Spd by ${GEM.speed}, and DMG dealt to Non-Hero enemies by ${pct(GEM.boss)} every sec. This effect can be stacked up to max ${GEM.most} times.`,
};
const APPRAISED: Buff = { name: 'Brilliant Gemologist', about: 'ATK, attack speed and DMG to Non-Hero enemies higher for each.', icon: '💎', art: art(3) };
const RESONANT: Buff = { name: 'Crystal of Resonance', about: 'ATK and DEF higher for each.', icon: '🔮', art: art(2) };
const BOSSED: Buff = { name: 'Crystal of Resonance (Bosses)', about: 'DMG to bosses higher for each.', icon: '🔮', art: art(2) };
const LUBERRY: Buff = { name: 'Luberry', about: 'Diogemme red: Dance and Full Bloom of Luberry hers, and her attack six shots.', icon: '🔴', art: art(2) };
const BLOOMED: Buff = { name: 'Full Bloom of Luberry', about: 'Healing reaches it more.', icon: '🌸', art: art(1) };

/** Her skills in [Luberry]: in Radiance's, Splendor's and Crystal of Resonance's places. */
const LUBERRY_SKILLS: readonly Ability[] = [
  {
    name: 'Dance of Luberry',
    about: `${DANCE.hits} blows, each stunning the boss for ${DANCE.stun} second; against a boss, the last a blow more through its defense.`,
    words: `Attacks the target and nearby enemies within a small range ${DANCE.hits} times, dealing a total of ${dmg('archer', DANCE.blow * DANCE.hits, bookDmg('talisha', 0))} M.DMG and inflicting Stun on the target for ${DANCE.stun} sec each hit. If the target is a boss, the last hit deals ${dmg('archer', DANCE.boss, bookDmg('talisha', 0))} additional M.DMG that ignores DEF.`,
    icon: '💃',
    art: art(0),
    move: 'dance',
    cooldown: 6,
    cost: 2,
  },
  {
    name: 'Full Bloom of Luberry',
    about: `Every ally healed, and a field for ${BLOOM.lasts} seconds: every ally healed every second, the boss's ATK ${pct(1 - BLOOM.weaker)} lower.`,
    words: `Explodes Luberry in front of self, healing HP of allies within range by ${healed('archer', BLOOM.heal, bookHeal('talisha', 1))} and creating [Full Bloom of Luberry] for ${BLOOM.lasts} sec. [Full Bloom of Luberry] heals HP of all allies within range by ${healed('archer', BLOOM.tick, bookHeal('talisha', 1))} every sec and reduces ATK of enemies within range by ${pct(1 - BLOOM.weaker)}.`,
    icon: '🌸',
    art: art(1),
    move: 'bloom',
    cooldown: 25,
    cost: 3,
  },
  {
    name: 'Crystal of Resonance',
    about: `Back to [Cimatis]: ${RESONANCE.mana} mana; her ATK and DEF ${pct(RESONANCE.atk)} higher (up to ${RESONANCE.most} times).`,
    words: `Talisha projects Light of Cimatis to the crystal, recovering own Mana by ${RESONANCE.mana} and changing [Dance of Luberry] and [Full Bloom of Luberry] back to [Radiance of Cimatis] and [Splendor of Cimatis]. Upon every use, increases own ATK by ${pct(RESONANCE.atk)} and All DEF by ${pct(RESONANCE.defense)}. These effects can be stacked up to max ${RESONANCE.most} times.`,
    icon: '🔮',
    art: art(2),
    move: 'luberry',
    cooldown: 9,
    cost: 1,
  },
];

export const TALISHA: HeroDef = {
  id: 'talisha',
  name: 'Talisha',
  class: 'archer',
  skins: ['Talisha', 'Talisha_Summer', 'Talisha_Advance', 'Talisha_Halloween', 'Talisha_Wedding', 'Talisha_Christmas'],
  // An archer whose blows are magical: as her class stands, otherwise.
  stats: { ...CLASS_STATS.archer, deals: 'magical' },
  abilities: [
    {
      name: 'Radiance of Cimatis',
      about: `A blow on the boss and those near it; again within ${RADIANCE.within} seconds, a blow more through its defense. Its cooldown only every ${RADIANCE.uses} uses.`,
      words: `Deals ${dmg('archer', RADIANCE.blow, bookDmg('talisha', 0))} M.DMG to the target and nearby enemies. Upon attacking the same target again with this Skill within ${RADIANCE.within} sec, deals ${dmg('archer', RADIANCE.more, bookDmg('talisha', 0))} additional M.DMG that ignores DEF. Cooldown will be applied every time this Skill is used ${RADIANCE.uses} times.`,
      icon: '💠',
      art: art(0),
      move: 'radiance',
      cooldown: RADIANCE.cooldown,
      cost: 2,
    },
    {
      name: 'Splendor of Cimatis',
      about: `A blow, and a field on the boss for ${SPLENDOR.lasts} seconds: a blow on it and ${SPLENDOR.mana} mana for the frontline every second.`,
      words: `Explodes Cimatis around the target, dealing ${dmg('archer', SPLENDOR.blow, bookDmg('talisha', 1))} M.DMG and creating [Splendor of Cimatis] for ${SPLENDOR.lasts} sec. [Splendor of Cimatis] recovers Mana of allies within range by ${SPLENDOR.mana} every sec and deals ${dmg('archer', SPLENDOR.tick, bookDmg('talisha', 1))} M.DMG to enemies within range every sec.`,
      icon: '✨',
      art: art(1),
      move: 'splendor',
      cooldown: 25,
      cost: 3,
    },
    {
      name: 'Crystal of Resonance',
      about: `Into [Luberry]: healed, her attack six shots, and Dance and Full Bloom of Luberry in place of her others; her ATK and DEF ${pct(RESONANCE.atk)} higher (up to ${RESONANCE.most} times). Used again, back.`,
      words: `Talisha projects Light of Luberry to the crystal she owns, healing own HP by ${healed('archer', RESONANCE.heal, bookHeal('talisha', 2))} and changes [Radiance of Cimatis] and [Splendor of Cimatis] to [Dance of Luberry] and [Full Bloom of Luberry] respectively. Upon using this Skill again, Talisha projects Light of Cimatis to the crystal, recovering own Mana by ${RESONANCE.mana}. Upon every use, increases own ATK by ${pct(RESONANCE.atk)} and All DEF by ${pct(RESONANCE.defense)}. These effects can be stacked up to max ${RESONANCE.most} times.`,
      icon: '🔮',
      art: art(2),
      move: 'resonance',
      cooldown: 9,
      cost: 1,
    },
  ],
  passive: GEMOLOGIST,
  treasures: [
    treasure('Compass of Ancient Power', (k) => ({
      words: `[Radiance of Cimatis] Recovers ${UT.compass.mana} Mana upon use.\n[Dance of Luberry] Reduces Cooldown by ${k(UT.compass.cooldown)} sec.`,
    })),
    treasure('Magnifying Glass with Ribbon', (k) => ({
      words: `[Splendor of Cimatis] Upon activation, creates [Splendor of Cimatis] around self for ${SPLENDOR.own} sec.\n[Full Bloom of Luberry] Increases Heal Rate of allies within range by ${pct(k(UT.glass.heals))}.`,
    })),
    treasure('Luminous Brooch', (k) => ({
      words: `[Crystal of Resonance] Reduces Cooldown by ${k(UT.brooch.cooldown)} sec, and the Skill dispels negative effects from self upon use.`,
      // (Both of its uses: the slot's.)
      skill: { index: 2, cooldown: -k(UT.brooch.cooldown), cleanse: 'self' },
    })),
    treasure('Lamp with Crude Handle', (k) => ({
      words: `[Brilliant Gemologist] Increases self's All DEF by ${pct(UT.lamp.defense)} per stack, and changes the max number of stacks to ${k(UT.lamp.most)}.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, cooldown: PERKS.radiance.cooldown } }, ({ skill }) => `[Radiance of Cimatis] Changes Cooldown to ${RADIANCE.cooldown + skill.cooldown} sec, and Cooldown will be applied every time this Skill is used ${PERKS.radiance.uses} times.`),
    's1-dark': { words: `[Dance of Luberry] At the beginning of each battle, increases DMG by ${pct(PERKS.dance.dmg)}. This effect can be stacked up to max ${PERKS.dance.most} times.` },
    's2-light': said({ skill: { index: 1, cost: -1 } }, ({ skill }) => `[Splendor of Cimatis] Reduces Mana Cost by ${-skill.cost}.`),
    's2-dark': { words: `[Full Bloom of Luberry] After ${PERKS.bloom.after} sec of the beginning of each battle, creates [Full Bloom of Luberry] that lasts for ${PERKS.bloom.lasts} sec in front of self.` },
    's3-light': { words: `The HP Recovery effect applies to all allies, but Heal Rate is reduced by ${pct(PERKS.less)}.` },
    's3-dark': { words: `Upon use, increases own DMG dealt to Bosses by ${pct(PERKS.boss.dmg)}. This effect can be stacked up to max ${PERKS.boss.most} times.` },
    's4-light': { words: `Changes the activation interval to ${PERKS.every} sec.` },
    's4-dark': { words: 'The effect becomes irremovable.' },
    't5-light': t5Light({ critDamage: 0.2 }, ({ critDamage }) => `Crit DMG +${pct(critDamage)}`),
    't5-dark': { words: 'When there is only 1 enemy or more than 5 enemies, reduces Mana Cost of all Skills by 1.' },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /**
     * In [Luberry]; the other light's cooldowns of her first two slots (wearing down meanwhile); Radiance's uses since its
     * cooldown last began; Resonance's stacks and its Dark's; Gemologist's stacks, and toward the next; the fields: how long
     * each lasts yet, toward its next second (Splendor's on the boss, Magnifying Glass's round her, Full Bloom's); the wave
     * last begun, and how long until Full Bloom's Dark's field; Dance's Dark's stacks.
     */
    let red = false;
    let other = [0, 0];
    let radiated = 0;
    let resonated = 0;
    let bossed = 0;
    let gems = 0;
    let gemNext = 0;
    let splendor = 0;
    let splendorTick = 0;
    let own = 0;
    let ownTick = 0;
    let bloom = 0;
    let bloomTick = 0;
    let wave = 0;
    let darkBloom = -1;
    let danced = 0;
    const gemMost = fromTreasure(self, 3, UT.lamp.most, GEM.most);
    const gemEvery = self.perks.has('s4-light') ? PERKS.every : GEM.every;
    // (Gemologist's ATK: a share of her own, its books' half again; Radiance's uses before its cooldown, its Light's more.)
    const gemAtk = (GEM.atk * bookDmg('talisha', 3)) / self.stats.atk;
    const uses = self.perks.has('s1-light') ? PERKS.radiance.uses : RADIANCE.uses;
    /** Her [Luberry] skills as her treasures change them (Compass: Dance sooner; Luminous Brooch: Resonance sooner). */
    const redSkills: Ability[] = LUBERRY_SKILLS.map((one, i) =>
      i === 0 ? { ...one, cooldown: one.cooldown - fromTreasure(self, 0, UT.compass.cooldown) } : i === 2 ? { ...one, cooldown: one.cooldown - fromTreasure(self, 2, UT.brooch.cooldown) } : one,
    );
    /** Transcend 5's Dark: each of her skills a section cheaper, while 1 enemy or fewer stands, or 5 or more. */
    const cheap = (one: Ability): Ability => ({ ...one, cost: Math.max(0, one.cost - 1) });
    const cheapBlue = self.abilities.map(cheap);
    const cheapRed = redSkills.map(cheap);
    const lone = (): boolean => {
      if (!self.perks.has('t5-dark')) return false;
      const standing = fight.foes.filter((foe) => foe.hp > 0 && !foe.away).length;
      return standing <= 1 || standing >= 5;
    };
    // Her unique weapon: her ATK higher, for good.
    if (tier !== null) put(self.statuses, { name: DIOGEMME_UP.name, left: Infinity, atk: atTier(DIOGEMME.atk, tier), shown: DIOGEMME_UP });

    /** Her allies on the field, standing and in the fight (her too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** Crystal of Resonance's ATK and DEF, a stack more (up to its most); its Dark's DMG to bosses, too. */
    const resonate = (): void => {
      resonated = Math.min(RESONANCE.most, resonated + 1);
      put(self.statuses, { name: RESONANT.name, left: Infinity, count: resonated, atk: RESONANCE.atk * resonated, defends: 1 + RESONANCE.defense * resonated, shown: RESONANT });
      if (self.perks.has('s3-dark')) bossed = Math.min(PERKS.boss.most, bossed + 1);
    };
    /** Her light turned: her first two slots' cooldowns the other light's (hers kept apart, wearing down). */
    const turn = (): void => {
      const mine = self.cooldowns.slice(0, 2);
      self.cooldowns[0] = other[0] ?? 0;
      self.cooldowns[1] = other[1] ?? 0;
      other = mine;
      red = !red;
      if (red) put(self.statuses, { name: LUBERRY.name, left: Infinity, shown: LUBERRY });
      else self.statuses = self.statuses.filter((status) => status.name !== LUBERRY.name);
    };
    /** Full Bloom's field for so many seconds (its Dark's, at the start of a battle, too). */
    const blooming = (seconds: number): void => {
      bloom = Math.max(bloom, seconds);
      bloomTick = 0;
    };

    return {
      lands: {
        attack() {
          fight.hit(self, fight.basic);
        },
        // [Luberry]'s attack: a shot of its six.
        redshot() {
          fight.hit(self, RED_SHOT);
        },
        // A blow; on one it hit within so many seconds, a blow more through its defense; then it is marked again.
        radiance() {
          const marked = fight.foe.statuses.some((status) => status.name === 'Radiance of Cimatis' && status.left > 0);
          fight.hit(self, RADIANCE.blow);
          if (marked) fight.hit(self, RADIANCE.more, true, 0, true);
          put(fight.foe.statuses, { name: 'Radiance of Cimatis', left: RADIANCE.within, shown: 'curse' });
        },
        // A blow, and the field on the boss (tick); Magnifying Glass: one round her, too.
        splendor() {
          fight.hit(self, SPLENDOR.blow);
          splendor = SPLENDOR.lasts;
          splendorTick = 0;
          if (wearsTreasure(self, 1)) {
            own = SPLENDOR.own;
            ownTick = 0;
          }
        },
        // Healed (its Light: every ally, the less), and into [Luberry].
        resonance() {
          const heal = self.perks.has('s3-light') ? (bookHeal('talisha', 2) - PERKS.less) / bookHeal('talisha', 2) : 1;
          for (const ally of self.perks.has('s3-light') ? allies() : [self]) fight.heal(ally, RESONANCE.heal * heal, self);
          resonate();
          if (!red) turn();
        },
        // Nine blows that stun the boss; against a boss, the last a blow more through its defense (its Dark: harder for each battle begun, added to its books as King's Raid adds them).
        dance(part) {
          const books = bookDmg('talisha', 0);
          const more = (books + PERKS.dance.dmg * danced) / books;
          fight.hit(self, DANCE.blow * more);
          fight.stun(DANCE.stun, { by: self });
          if (part === DANCE.hits - 1 && fight.foe === fight.boss) fight.hit(self, DANCE.boss * more, true, 0, true);
        },
        // Every ally healed, and the field (tick).
        bloom() {
          for (const ally of allies()) fight.heal(ally, BLOOM.heal, self);
          blooming(BLOOM.lasts);
        },
        // Mana, and back to [Cimatis].
        luberry() {
          self.mana = Math.min(MAX_MANA, self.mana + RESONANCE.mana);
          resonate();
          if (red) turn();
        },
      },
      // In [Luberry], her other skills in her skills' places (Transcend 5's Dark: cheaper, while it holds).
      slot: (index) => (lone() ? (red ? cheapRed : cheapBlue) : red ? redSkills : self.abilities)[index] ?? null,
      used(index, ability) {
        // Radiance: its cooldown only every so many uses (its Light: more); Compass of Ancient Power: mana.
        if (ability.move !== 'radiance') return;
        if (wearsTreasure(self, 0)) self.mana = Math.min(MAX_MANA, self.mana + UT.compass.mana);
        radiated++;
        if (radiated < uses) self.cooldowns[index] = 0;
        else radiated = 0;
      },
      // [Luberry]'s attack, its six shots.
      attack: () => (red ? 'redshot' : 'attack'),
      tick(dt) {
        // The other light's cooldowns wear down too.
        for (let i = 0; i < other.length; i++) other[i] = Math.max(0, (other[i] ?? 0) - dt);
        const on = fight.field.includes(self) && self.hp > 0;
        // As each battle begins: Dance's Dark a stack more, and Full Bloom's Dark's field a moment after.
        if (fight.wave !== wave && on) {
          wave = fight.wave;
          if (self.perks.has('s1-dark')) danced = Math.min(PERKS.dance.most, danced + 1);
          if (self.perks.has('s2-dark')) darkBloom = PERKS.bloom.after;
        }
        if (darkBloom >= 0) {
          darkBloom -= dt;
          if (darkBloom < 0) blooming(PERKS.bloom.lasts);
        }
        // Brilliant Gemologist: every second (its Light: every half) a stack more, up to its most (Lamp: more, and DEF for each).
        if (on && gems < gemMost) {
          gemNext += dt;
          if (gemNext >= gemEvery) {
            gemNext -= gemEvery;
            gems++;
            const lamp = wearsTreasure(self, 3) ? { defends: 1 + UT.lamp.defense * gems } : {};
            put(self.statuses, { name: APPRAISED.name, left: Infinity, count: gems, atk: gemAtk * gems, speed: GEM.speed * gems, deals: 1 + GEM.boss * gems, ...lamp, shown: APPRAISED });
          }
        }
        // Splendor of Cimatis on the boss: a blow on it and mana for the frontline every second.
        if (splendor > 0) {
          splendor -= dt;
          splendorTick += dt;
          if (splendorTick >= 1) {
            splendorTick -= 1;
            fight.hit(self, SPLENDOR.tick);
            for (const ally of allies()) if (lineOf(ally.def) === 'front') ally.mana = Math.min(MAX_MANA, ally.mana + SPLENDOR.mana);
          }
        }
        // Magnifying Glass's round her: mana for the allies of her line every second.
        if (own > 0) {
          own -= dt;
          ownTick += dt;
          if (ownTick >= 1) {
            ownTick -= 1;
            for (const ally of allies()) if (lineOf(ally.def) === lineOf(self.def)) ally.mana = Math.min(MAX_MANA, ally.mana + SPLENDOR.mana);
          }
        }
        // Full Bloom of Luberry: every ally healed every second (Magnifying Glass: healing reaching them more), the boss hitting less hard.
        if (bloom > 0) {
          bloom -= dt;
          bloomTick += dt;
          if (bloomTick >= 1) {
            bloomTick -= 1;
            const glass = fromTreasure(self, 1, UT.glass.heals);
            for (const ally of allies()) {
              if (glass > 0) put(ally.statuses, { name: BLOOMED.name, left: 1.2, heals: 1 + glass, shown: BLOOMED });
              fight.heal(ally, BLOOM.tick, self);
            }
            put(fight.foe.statuses, { name: 'Full Bloom of Luberry', left: 1.2, deals: BLOOM.weaker, shown: 'curse' });
          }
        }
      },
      // Her unique weapon: each blow of hers leaves its target hitting less hard for a while, and a boss taking more.
      blow() {
        if (tier === null) return;
        put(fight.foe.statuses, { name: DIOGEMME.name, left: DIOGEMME.lasts, deals: 1 - atTier(DIOGEMME.weaker, tier), shown: 'curse' });
        if (fight.foe === fight.boss) put(fight.foe.statuses, { name: `${DIOGEMME.name} (Boss)`, left: DIOGEMME.lasts, takes: 1 + atTier(DIOGEMME.takes, tier), shown: 'curse' });
      },
      // Crystal of Resonance's Dark: more to bosses.
      deals: () => (bossed > 0 && fight.foe === fight.boss ? 1 + PERKS.boss.dmg * bossed : 1),
      buffs: () => (bossed > 0 ? [{ ...BOSSED, count: bossed }] : []),
      lit: () => red,
    };
  },
};
