import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA, SECTION } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { num, pct, skillArt, type Buff } from '../shown';
import { atTier, INNOCENTIA, INNOCENTIA_UP } from '../unique';
import { type Ability, attackStarts, bookDmg, CLASS_STATS, dmg, type HeroDef, type Passive, played } from './kit';

/*
 * Hilda's skills, as King's Raid's playtest has them (stats/hilda.md: how hard each hits at its level 90, and every number
 * here, are its; its words are the live game's, krinfo's legacy). She is a warrior whose blows are magical, the Spear of Dawn.
 * - Void Whirlwind: twelve blows on the enemies before her.
 * - Transcendent: a blow on every enemy, and she is [Transcendent] until her mana runs out (or she ends it: Deactivate
 *   Transcendent, in its place): her attack the enhanced chain (the move voidattack: King's Raid's Attack2-1 to 2-5, nine
 *   blows in four parts), each blow a stack of [Void] on its target (up to 20); immune to CC, the boss healed less, no skills
 *   but Deactivate; her mana drained every second, the more the longer it lasts. Ended, Transcendent waits 8 seconds again.
 * - Void Strike: a blow that knocks the boss down, and a blow more for each stack of [Void] on it, which it takes off.
 * Her passive, Void Frenzy: her ATK higher (its books' half again), and her penetration by her mana orbs; at full mana, [Void
 * Frenzy] for a while: her blows past the boss's blocks, her penetration at its most (no sooner than 15 seconds after the last).
 * Her unique weapon (../unique.ts) is worked here too: her ATK higher and healing reaching her more, twice as much while she is
 * [Transcendent].
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/hilda.ts).
 *
 * Her own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy); its numbers the
 * playtest's. Void Whirlwind's taking mana and Sweet Dreams's drawing the target in do nothing here (the boss has no mana, and
 * stands where it is). Void Frenzy's mana recovery 50% higher is in her mana per attack already (./kr.ts: the playtest's 466),
 * not added again. Transcendent's other slots are sealed meanwhile (King's Raid's all hold Deactivate there). Its mana drained
 * as she runs out: Deactivate comes of it at once, no move of its own. Transcend 5's Dark's irremovable [Void] does nothing here
 * (nothing takes it off but Void Strike).
 */
/** Void Whirlwind: each of its twelve blows. */
const WHIRLWIND = { blow: played('warrior', 362, 15_448), hits: 12, drain: 150 };
/**
 * Transcendent: its blow; [Void]'s most stacks; the boss's healing the less near her; the mana drained every second at first,
 * and the more each second after; how soon Deactivate may be used, and Transcendent's cooldown once it is over.
 */
const TRANSCEND = { blow: played('warrior', 1450, 54_719), most: 20, unhealed: 0.7, drain: 100, more: 50, back: 1, cooldown: 8 };
/** [Transcendent]'s attack (voidattack): each of its nine blows, and which of them begin a part of it. */
const VOID_ATTACK = { blows: [...Array.from({ length: 8 }, () => played('warrior', 1800)), played('warrior', 3000)], starts: new Set([0, 2, 4, 8]) };
/** Void Strike: its blow, and how long it knocks the boss down; its blow more for each stack of [Void]. */
const STRIKE = { blow: played('warrior', 5500, 188_848), down: 3, stack: played('warrior', 612) };
/** Void Frenzy: her ATK (flat, its books' half again), her penetration for each orb of mana; [Void Frenzy] for how long, no sooner than how long after the last, and its penetration. */
const FRENZY = { atk: 38_628, pen: 100, lasts: 30, every: 15, full: 1000 };
/** Her own perks' numbers: Whirlwind's Light's mana for each blow; Transcendent's Light's attack speed and Dark's less taken; Frenzy's Light's sooner and Dark's more to bosses; Transcend 5's Dark's chance. */
const PERKS = { mana: 100, speed: 500, taken: 0.8, every: 7, boss: 0.5, chance: 0.25 };

/**
 * Her unique treasures' numbers (0★ to 5★: ../treasures.ts; King's Raid's own): Whirlwind's chance of 2 [Void]; Transcendent's
 * drain the less, and her attack's more DMG meanwhile; Void Strike's more DMG and [Void]'s most; Frenzy's mana and ATK meanwhile.
 */
const UT = {
  dreams: { chance: [0.4, 0.48, 0.58, 0.7, 0.84, 1], stacks: 2 },
  present: { drain: 0.4, dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
  longing: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], most: 40 },
  tagalong: { mana: 100, atk: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
};

const art = skillArt('hilda');

const VOID_FRENZY: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Void Frenzy',
    about: `Passive. ATK +${num(Math.round(FRENZY.atk * bookDmg('hilda', 3)))}, and +${FRENZY.pen} penetration for each orb of mana. At full mana, [Void Frenzy] for ${FRENZY.lasts} seconds: her blows past the boss's blocks, +${FRENZY.full} penetration.`,
    icon: '🌀',
    art: art(3),
  },
  words: `Increases ATK by ${num(Math.round(FRENZY.atk * bookDmg('hilda', 3)))}, applies all Mana recovery at 50% higher, and increases DEF Penetration by ${FRENZY.pen} per 1 orb of Mana Hilda has. At max Mana, Hilda enters [Void Frenzy] state for ${FRENZY.lasts} sec. For the duration, self's all attacks ignore Block effects of enemies and fixes the DEF Penetration Boost per Mana orb to ${FRENZY.full}. [Void Frenzy] state has a Cooldown of ${FRENZY.every} sec.`,
};
const FRENZIED: Buff = { name: 'Void Frenzy', about: 'ATK higher, and penetration by her mana orbs.', icon: '🌀', art: art(3) };
const RAGING: Buff = { name: '[Void Frenzy]', about: 'Her blows past the boss’s blocks; penetration at its most.', icon: '🌀', art: art(3) };
const TRANSCENDENT: Buff = { name: 'Transcendent', about: 'Her attack enhanced, each blow a stack of [Void]; immune to CC, no skills; mana drained every second.', icon: '🌌', art: art(1) };

/** Transcendent's slot while she is [Transcendent]. */
const DEACTIVATE: Ability = {
  name: 'Deactivate Transcendent',
  about: `Ends [Transcendent]; Transcendent waits ${TRANSCEND.cooldown} seconds again. It comes of itself as her mana runs out.`,
  words: `Deactivates [Transcendent] state and applies ${TRANSCEND.cooldown} sec Cooldown to the [Transcendent] Skill.\nThis Skill activates automatically upon consuming all Mana.`,
  icon: '🌌',
  art: art(1),
  move: 'untranscend',
  cooldown: 0,
  cost: 0,
};

export const HILDA: HeroDef = {
  id: 'hilda',
  name: 'Hilda',
  class: 'warrior',
  skins: ['Hilda', 'Hilda_Advance', 'Hilda_Summer', 'Hilda_Halloween', 'Hilda_Wedding', 'Hilda_Glory', 'Hilda_Glory2', 'Hilda_Christmas'],
  // A warrior whose blows are magical: as her class stands, otherwise.
  stats: { ...CLASS_STATS.warrior, deals: 'magical' },
  abilities: [
    {
      name: 'Void Whirlwind',
      about: `${WHIRLWIND.hits} blows on the enemies before her.`,
      words: `Deals a total of ${dmg('warrior', WHIRLWIND.blow * WHIRLWIND.hits, bookDmg('hilda', 0))} M.DMG over ${WHIRLWIND.hits} hits to frontal enemies. Each hit reduces the target's Mana by ${WHIRLWIND.drain}.`,
      icon: '🌪️',
      art: art(0),
      move: 'whirlwind',
      cooldown: 18,
      cost: 3,
    },
    {
      name: 'Transcendent',
      about: `A blow on every enemy; [Transcendent] until her mana runs out: her attack enhanced, each blow a stack of [Void] (up to ${TRANSCEND.most}); immune to CC, the boss healed ${pct(1 - TRANSCEND.unhealed)} less, no skills; ${TRANSCEND.drain} mana drained every second, ${TRANSCEND.more} more each second.`,
      words: `Dispels negative effects from self and deals ${dmg('warrior', TRANSCEND.blow, bookDmg('hilda', 1))} M.DMG to all enemies, entering [Transcendent] state and enhancing normal attacks. During [Transcendent] state, Hilda cannot use Skills, gains immunity to CC, and her normal attacks inflict [Void] stacks that can be stacked up to max ${TRANSCEND.most} times on the target. Hilda also reduces Heal Rate of nearby enemies within a circular range of self by ${pct(1 - TRANSCEND.unhealed)}, and consumes own Mana by ${TRANSCEND.drain} every sec. The Mana consumption gradually increases over time, and [Transcendent] state deactivates upon consuming all Mana or using a Skill.`,
      icon: '🌌',
      art: art(1),
      move: 'transcend',
      cooldown: TRANSCEND.cooldown,
      cost: 3,
    },
    {
      name: 'Void Strike',
      about: `A blow that knocks the boss down for ${STRIKE.down} seconds, and a blow more for each stack of [Void] on it, which it takes off.`,
      words: `Deals ${dmg('warrior', STRIKE.blow, bookDmg('hilda', 2))} M.DMG to frontal enemies within a circular range of self and knocks them down for ${STRIKE.down} sec. Upon hitting an enemy inflicted with [Void], consumes all Void stacks from the target and deals ${dmg('warrior', STRIKE.stack, bookDmg('hilda', 2))} additional M.DMG per stack.`,
      icon: '💥',
      art: art(2),
      move: 'voidstrike',
      cooldown: 20,
      cost: 4,
    },
  ],
  passive: VOID_FRENZY,
  treasures: [
    treasure('Sweet Dreams', (k) => ({
      words: `[Void Whirlwind] Each hit draws the target to the front of self, and inflicts ${UT.dreams.stacks} [Void] stacks with a ${pct(k(UT.dreams.chance))} chance.`,
    })),
    treasure('Present of an Intruder', (k) => ({
      words: `[Transcendent] Reduces Mana Cost that increases over time by ${pct(UT.present.drain)}, and increases DMG of normal attacks by ${pct(k(UT.present.dmg))} for the duration.`,
    })),
    treasure('Everlasting Longing', (k) => ({
      words: `[Void Strike] Increases DMG by ${pct(k(UT.longing.dmg))} and changes the max number of [Void] stacks to ${UT.longing.most}.`,
      skill: { index: 2, dmg: 1 + k(UT.longing.dmg) },
    })),
    treasure('Tagalong No. XII', (k) => ({
      words: `[Void Frenzy] Recovers ${UT.tagalong.mana} Mana every sec, and increases ATK by ${pct(k(UT.tagalong.atk))} for the duration of [Void Frenzy].`,
    })),
  ],
  perks: {
    's1-light': { words: `Each hit recovers ${PERKS.mana} Mana.` },
    's1-dark': { words: 'Gains immunity to CC while in use.' },
    's2-light': { words: `Increases ATK Spd by ${PERKS.speed} during [Transcendent] state.` },
    's2-dark': { words: `Takes ${pct(1 - PERKS.taken)} reduced DMG during [Transcendent] state.` },
    's3-light': { words: 'Dispels positive effects from enemies within range.' },
    's3-dark': said({ skill: { index: 2, dmg: 1.4 } }, ({ skill }) => `Increases DMG by ${pct(skill.dmg - 1)}.`),
    's4-light': { words: `Changes the Cooldown of [Void Frenzy] to ${PERKS.every} sec.` },
    's4-dark': { words: `Increases DMG dealt to bosses by ${pct(PERKS.boss)} during [Void Frenzy] state.` },
    't5-light': t5Light({ speed: 100 }, ({ speed }) => `ATK Spd +${speed}`),
    't5-dark': { words: `[Void] stacks become irremoveable and normal attacks have a ${pct(PERKS.chance)} chance to inflict 1 [Void] stack.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /**
     * [Transcendent]; the mana it drains now each second, and toward the next; [Void Frenzy]'s seconds left, and until it may
     * come again; toward Tagalong's next mana.
     */
    let transcendent = false;
    let drain = 0;
    let drainNext = 0;
    let frenzy = 0;
    let frenzyWait = 0;
    let tagalongNext = 0;
    const starts = attackStarts('hilda');
    const most = wearsTreasure(self, 2) ? UT.longing.most : TRANSCEND.most;
    // (Void Frenzy's ATK: a share of her own, its books' half again.)
    const frenzyAtk = (FRENZY.atk * bookDmg('hilda', 3)) / self.stats.atk;
    // (Present of an Intruder: the drain growing the less, and her attack harder meanwhile.)
    const more = TRANSCEND.more * (wearsTreasure(self, 1) ? 1 - UT.present.drain : 1);
    const present = 1 + fromTreasure(self, 1, UT.present.dmg);

    /** Her unique weapon: her ATK higher and healing reaching her more (twice as much while [Transcendent]). */
    const innocentia = (): void => {
      if (tier === null) return;
      const atk = atTier(transcendent ? INNOCENTIA.transcendent : INNOCENTIA.atk, tier);
      const heals = atTier(transcendent ? INNOCENTIA.transcendent : INNOCENTIA.heals, tier);
      put(self.statuses, { name: INNOCENTIA_UP.name, left: Infinity, atk, heals: 1 + heals, shown: INNOCENTIA_UP });
    };
    innocentia();
    /** [Void]'s stacks on the enemy in question; and so many more (up to its most). */
    const voids = (): number => fight.foe.statuses.find((status) => status.name === 'Void')?.count ?? 0;
    const voided = (count: number): void => put(fight.foe.statuses, { name: 'Void', left: Infinity, count: Math.min(most, voids() + count), shown: 'curse' });
    /** A blow of hers: in [Void Frenzy], past the boss's blocks (for that blow). */
    const strike = (amount: number, counted = true): boolean => {
      if (frenzy <= 0) return fight.hit(self, amount, counted);
      put(fight.foe.statuses, { name: RAGING.name, left: 0.01, blocks: { physical: -Infinity, magical: -Infinity }, shown: 'curse' });
      const critical = fight.hit(self, amount, counted);
      fight.foe.statuses = fight.foe.statuses.filter((status) => status.name !== RAGING.name);
      return critical;
    };
    /** Into [Transcendent]: its own on her (its Light: quicker; its Dark: less taken), Deactivate in a moment, the drain from now. */
    const transcend = (): void => {
      transcendent = true;
      drain = TRANSCEND.drain;
      drainNext = 1;
      self.cooldowns[1] = TRANSCEND.back;
      put(self.statuses, { name: TRANSCENDENT.name, left: Infinity, guards: true, ...(self.perks.has('s2-light') && { speed: PERKS.speed }), ...(self.perks.has('s2-dark') && { takes: PERKS.taken }), shown: TRANSCENDENT });
      innocentia();
    };
    /** Out of it: Transcendent waits its cooldown again. */
    const untranscend = (): void => {
      transcendent = false;
      self.cooldowns[1] = TRANSCEND.cooldown;
      self.statuses = self.statuses.filter((status) => status.name !== TRANSCENDENT.name);
      innocentia();
    };

    return {
      lands: {
        // Her attack (Transcend 5's Dark: each part of it may leave a stack of [Void]).
        attack(part) {
          strike(fight.basic);
          if (starts.has(part) && self.perks.has('t5-dark') && fight.roll() < PERKS.chance) voided(1);
        },
        // [Transcendent]'s attack: each blow a stack of [Void] (Present of an Intruder: harder). Each part of it gains her mana
        // as its first blow lands (the fight gives the first part's), and Transcend 5's Dark may leave a stack more.
        voidattack(part) {
          strike((VOID_ATTACK.blows[part] ?? 0) * present);
          voided(1);
          if (!VOID_ATTACK.starts.has(part)) return;
          if (part > 0) self.mana = Math.min(MAX_MANA, self.mana + self.manaPerAttack);
          if (self.perks.has('t5-dark') && fight.roll() < PERKS.chance) voided(1);
        },
        // Each of its blows (its Light: mana; Sweet Dreams: may leave 2 stacks of [Void]).
        whirlwind() {
          strike(WHIRLWIND.blow);
          if (self.perks.has('s1-light')) self.mana = Math.min(MAX_MANA, self.mana + PERKS.mana);
          if (wearsTreasure(self, 0) && fight.roll() < fromTreasure(self, 0, UT.dreams.chance)) voided(UT.dreams.stacks);
        },
        // A blow on every enemy, and she is [Transcendent].
        transcend() {
          strike(TRANSCEND.blow);
          transcend();
        },
        // A blow that knocks the boss down, a blow more for each stack of [Void] on it (taken off); its Light: what helps the boss taken off it (what has it deal more).
        voidstrike() {
          strike(STRIKE.blow);
          fight.stun(STRIKE.down, { down: true, by: self });
          const stacks = voids();
          if (stacks > 0) {
            strike(STRIKE.stack * stacks, false);
            fight.foe.statuses = fight.foe.statuses.filter((status) => status.name !== 'Void');
          }
          if (self.perks.has('s3-light')) {
            const { statuses } = fight.foe;
            for (let i = statuses.length - 1; i >= 0; i--) if ((statuses[i]?.deals ?? 1) > 1) statuses.splice(i, 1);
          }
        },
      },
      // While [Transcendent]: Deactivate in Transcendent's place, the others sealed.
      slot: (index) => (transcendent ? (index === 1 ? DEACTIVATE : null) : (self.abilities[index] ?? null)),
      used(_index, ability) {
        // Transcendent: what the boss left on her cleared. Deactivate: out of it.
        if (ability.move === 'transcend') self.statuses = self.statuses.filter((status) => status.shown.harmful !== true || status.binds === true);
        if (ability.move === 'untranscend' && transcendent) untranscend();
      },
      // (Auto uses none of her skills while she is [Transcendent], as King's Raid's: its DisableSkillUse.)
      autoOff: () => transcendent,
      // [Transcendent]'s attack, the enhanced chain.
      attack: () => (transcendent ? 'voidattack' : 'attack'),
      // Void Whirlwind's Dark: nothing knocks her down while she uses it.
      guards: () => self.perks.has('s1-dark') && self.doing?.move === 'whirlwind',
      tick(dt) {
        // [Transcendent]: her mana drained every second, the more each second (Present of an Intruder: the less); run out, it is over. The boss healed less meanwhile.
        if (transcendent) {
          drainNext -= dt;
          if (drainNext <= 0) {
            drainNext += 1;
            self.mana = Math.max(0, self.mana - drain);
            drain += more;
            put(fight.foe.statuses, { name: TRANSCENDENT.name, left: 1.2, heals: TRANSCEND.unhealed, shown: 'curse' });
            if (self.mana <= 0) untranscend();
          }
        }
        // [Void Frenzy]: at full mana, for a while, no sooner than so long after the last (its Light: sooner); Tagalong No. XII: mana every second, and ATK.
        if (frenzyWait > 0) frenzyWait -= dt;
        if (frenzy > 0) frenzy -= dt;
        if (frenzyWait <= 0 && self.mana >= MAX_MANA && fight.field.includes(self) && self.hp > 0) {
          frenzy = FRENZY.lasts;
          frenzyWait = self.perks.has('s4-light') ? PERKS.every : FRENZY.every;
        }
        if (frenzy > 0 && wearsTreasure(self, 3)) {
          tagalongNext += dt;
          if (tagalongNext >= 1) {
            tagalongNext -= 1;
            self.mana = Math.min(MAX_MANA, self.mana + UT.tagalong.mana);
          }
        }
        // Void Frenzy: her ATK, and her penetration by her mana orbs (in [Void Frenzy], at its most).
        const pen = frenzy > 0 ? FRENZY.full : FRENZY.pen * Math.floor(self.mana / SECTION);
        const tagalong = frenzy > 0 ? fromTreasure(self, 3, UT.tagalong.atk) : 0;
        put(self.statuses, { name: FRENZIED.name, left: Infinity, atk: frenzyAtk + tagalong, pen, shown: frenzy > 0 ? RAGING : FRENZIED });
      },
      // Void Frenzy's Dark: more to bosses in [Void Frenzy].
      deals: () => (frenzy > 0 && self.perks.has('s4-dark') && fight.foe === fight.boss ? 1 + PERKS.boss : 1),
      lit: () => transcendent || frenzy > 0,
    };
  },
};
