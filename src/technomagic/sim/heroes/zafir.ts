import { away, put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { pct, skillArt, type Buff } from '../shown';
import type { Fighter, Foe } from '../types';
import { atTier, ZARIES, ZARIES_UP } from '../unique';
import { attackStarts, bookDmg, bookHeal, CLASS_STATS, dmg, healed, type HeroDef, type Passive, played, playedHeal } from './kit';

/*
 * Zafir's skills, as King's Raid's playtest has them (stats/zafir.md: how hard each hits and shields at its level 90, and
 * every number here, are its; its words are its own). He is an archer, the Prince of Sandstorms. [Mark of Desert] stacks
 * on the enemies he strikes (up to 10).
 * - Judgment of the Desert: a blow, harder on an enemy with [Mark of Desert] (taking a stack off); each enemy struck takes
 *   time off its cooldown.
 * - Blessing of the Sand Spirit: a great shield on the 2 allies with the lowest HP (its books' half again); one that holds
 *   to its end becomes a [Sandstorm]: a blow on the boss and two stacks of the mark.
 * - Doom of the Desert: a blow and a stack of the mark; then the [Sand Hell] for a while: a blow every half second, each
 *   lowering the boss's P.DEF, now and then a stack more.
 * His passive, Calling of the Guardian: now and then a part of his attack deals a blow more and a stack of the mark.
 * His unique weapon (../unique.ts) is worked here too: each skill he uses a stack of [Will of Desert] (up to 8), each his
 * ATK and crit DMG higher for a while.
 * What is drawn for each, and what his body does, are King's Raid's own (../../assets/heroes/zafir.ts).
 *
 * His own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Blessing of the
 * Sand Spirit's Light holds with 3 allies or fewer, Calling of the Guardian's Light with more than 5 enemies and Transcend
 * 5's Dark's more with 5 or more (a raid's waves can have them). Judgment of the Desert's Light is its crit DMG boost for
 * each use at 10% (live King's Raid's skill has it at 5%, up to 18 stacks; the playtest's, as here, none without it).
 */
const MARK = 'Mark of Desert';
/** Judgment of the Desert: its blow, and on an enemy with [Mark of Desert]; the time each enemy struck takes off its cooldown. */
const JUDGMENT = { blow: played('archer', 2262, 76_605), marked: played('archer', 3392, 114_807), sooner: 0.5 };
/** Blessing of the Sand Spirit: how many allies, its shield (its books': the fight's), for how long; the [Sandstorm]'s blow and stacks of the mark. */
const SPIRIT = { allies: 2, shield: playedHeal('archer', 10_035, 1_326_654), lasts: 4, storm: played('archer', 3090, 158_153), stacks: 2 };
/** Doom of the Desert: its blow; the [Sand Hell] for how long, a blow every so often, its chance of a stack, and the boss's P.DEF less, for how long. */
const DOOM = { blow: played('archer', 1462, 75_110), lasts: 5, every: 0.5, tick: played('archer', 487, 25_101), chance: 0.25, defense: 0.7, defenseLasts: 10 };
/** Calling of the Guardian: its chance on each part of his attack, its blow; the mark's most. */
const CALLING = { chance: 0.15, blow: played('archer', 587, 19_957), most: 10 };
/** His own perks' numbers: Judgment's Light's crit DMG for each use (up to so many stacks: live King's Raid's skill's) and Dark's stun; Blessing's Light's allies and Dark's own shield as the fight begins (for how long); Doom's Dark's longer [Sand Hell]; Calling's Dark's chance and Light's enemies (more than so many); Transcend 5's Dark's mana (and with so many enemies or more, its attack speed, for how long). */
const PERKS = { critDamage: 0.1, most: 18, stun: 1, allies: 3, start: { shield: playedHeal('archer', 8120, 278_329), lasts: 5 }, longer: 2, chance: 0.3, over: 5, many: 5, mana: 700, speed: 500, speedLasts: 5 };

/**
 * His unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Judgment's more DMG for each use (up to
 * 20) and its chance of a stack; Blessing's mana every second while its shield holds; Doom's shorter cooldown and its more
 * chance; Calling's stun and the boss's more physical damage taken on a critical one.
 */
const UT = {
  arrow: { dmg: [0.02, 0.024, 0.029, 0.035, 0.042, 0.05], most: 20, chance: 0.3 },
  mirage: { mana: [80, 100, 120, 140, 170, 200] },
  oasis: { cooldown: 0.3, chance: [0.08, 0.096, 0.115, 0.138, 0.165, 0.2] },
  cat: { stun: 2, takes: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 },
};

const art = skillArt('zafir');

const CALLING_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Calling of the Guardian', about: `Passive. Each part of his attack has a ${pct(CALLING.chance)} chance to deal a blow more and put a stack of [Mark of Desert] on the boss (up to ${CALLING.most}).`, icon: '🏜️', art: art(3) },
  words: `On Normal Attack, has a ${pct(CALLING.chance)} chance to deal ${dmg('archer', CALLING.blow, bookDmg('zafir', 3))} P.DMG to all enemies and apply 1 stack of [Mark of Desert]. [Mark of Desert] stacks up to ${CALLING.most} times.`,
};
const SANDY: Buff = { name: 'Blessing of the Sand Spirit', about: 'A shield; held to its end, a [Sandstorm].', icon: '🏜️', art: art(1) };
const JUDGED: Buff = { name: 'Judgment of the Desert', about: 'Crit DMG higher for each use.', icon: '🏜️', art: art(0) };
const ARROW: Buff = { name: 'Sandstorm Arrow', about: 'Judgment of the Desert deals more for each.', icon: '🏹', art: art(0) };
const SWIFT: Buff = { name: 'Prince of Sandstorms', about: 'Attack speed higher.', icon: '🏜️', art: art(3) };

export const ZAFIR: HeroDef = {
  id: 'zafir',
  name: 'Zafir',
  class: 'archer',
  skins: ['Zafir', 'Zafir_Summer', 'Zafir_Wedding', 'Zafir_Halloween', 'Zafir_Casual', 'Zafir_School'],
  stats: { ...CLASS_STATS.archer, deals: 'physical' },
  abilities: [
    {
      name: 'Judgment of the Desert',
      about: `A blow, ${pct(JUDGMENT.marked / JUDGMENT.blow - 1)} harder on an enemy with [Mark of Desert] (a stack taken off it); ${JUDGMENT.sooner} seconds off its cooldown for each enemy struck.`,
      words: `Deals ${dmg('archer', JUDGMENT.blow, bookDmg('zafir', 0))} P.DMG to enemies in a wide area, and reduces Cooldown by ${JUDGMENT.sooner} sec per enemy hit. Deals ${dmg('archer', JUDGMENT.marked, bookDmg('zafir', 0))} P.DMG to enemies with [Mark of Desert] instead, and removes 1 stack of [Mark of Desert] after dealing damage.`,
      icon: '🏹',
      art: art(0),
      move: 'desert',
      cooldown: 5,
      cost: 2,
    },
    {
      name: 'Blessing of the Sand Spirit',
      about: `A shield on the ${SPIRIT.allies} allies with the lowest HP for ${SPIRIT.lasts} seconds; one that holds to its end becomes a [Sandstorm]: a blow, and ${SPIRIT.stacks} stacks of [Mark of Desert].`,
      words: `Grants a Shield to ${SPIRIT.allies} allies with the lowest current HP that absorbs ${healed('archer', SPIRIT.shield, bookHeal('zafir', 1))} DMG for ${SPIRIT.lasts}sec. When the Shield expires, triggers [Sandstorm], dealing ${dmg('archer', SPIRIT.storm, bookDmg('zafir', 1))} P.DMG to enemies in a wide area and applying ${SPIRIT.stacks} stacks of [Mark of Desert]. If the Shield is removed or destroyed, [Sandstorm] does not activate.`,
      icon: '🛡️',
      art: art(1),
      move: 'spirit',
      cooldown: 16,
      cost: 3,
    },
    {
      name: 'Doom of the Desert',
      about: `A blow and a stack of [Mark of Desert]; then the [Sand Hell] for ${DOOM.lasts} seconds: a blow every ${DOOM.every} seconds, each the boss's P.DEF ${pct(1 - DOOM.defense)} lower, and a ${pct(DOOM.chance)} chance of a stack.`,
      words: `Deals ${dmg('archer', DOOM.blow, bookDmg('zafir', 2))} P.DMG to enemies in a wide frontal area, applies 1 stack of [Mark of Desert], and summons [Sand Hell] for ${DOOM.lasts}sec.\n[Sand Hell]: Deals ${dmg('archer', DOOM.tick, bookDmg('zafir', 2))} P.DMG every ${DOOM.every}sec, reduces P.DEF by ${pct(1 - DOOM.defense)} for ${DOOM.defenseLasts}sec, has a ${pct(DOOM.chance)} chance to apply 1 stack of [Mark of Desert], and pulls enemies to the center.`,
      icon: '🌪️',
      art: art(2),
      move: 'sandstorm',
      cooldown: 20,
      cost: 4,
    },
  ],
  passive: CALLING_SHOWN,
  treasures: [
    treasure('Sandstorm Arrow', (k) => ({
      words: `[Judgment of the Desert] Increases DMG by ${pct(k(UT.arrow.dmg))} upon every use. There is a ${pct(UT.arrow.chance)} chance that the hit enemy is inflicted with the Mark of Desert. DMG increase effect can be stacked up to max ${UT.arrow.most} times.`,
    })),
    treasure('Sand of Mirage', (k) => ({
      words: `[Blessing of the Sand Spirit] Dispels negative effects from self, and recovers ${k(UT.mirage.mana)} Mana every sec while the shield is active.`,
      skill: { index: 1, cleanse: 'self' },
    })),
    treasure('Soul of Oasis', (k) => ({
      words: `[Doom of the Desert] Skill cooldown is decreased by ${pct(UT.oasis.cooldown)} and effect activation chance is increased by ${pct(k(UT.oasis.chance))}.`,
      skill: { index: 2, cooldownShare: 1 - UT.oasis.cooldown },
    })),
    treasure('Black Cat, Hoabis', (k) => ({
      words: `[Calling of the Guardian] Upon a Critical Hit, stuns the target for ${UT.cat.stun} sec and increases P.DMG it takes by ${pct(k(UT.cat.takes))} for ${UT.cat.lasts} sec.`,
    })),
  ],
  perks: {
    's1-light': { words: `Crit DMG boost per use changes to ${pct(PERKS.critDamage)}.` },
    's1-dark': { words: `Stuns the hit enemy for ${PERKS.stun} sec.` },
    's2-light': { words: `If there are ${PERKS.allies} or less allies, applies shield to all allies. Sand Storm does not activate during this time.` },
    's2-dark': { words: `At the beginning of each battle, casts shield on self for ${PERKS.start.lasts} sec. Sand Storm does not activate during this time.` },
    's3-light': said({ skill: { index: 2, steady: true } }, () => 'Gains immunity to CC while in use.'),
    's3-dark': { words: `Duration of 'Pit of Sand' is increased by ${PERKS.longer} sec.` },
    's4-light': { words: `Inflicts Mark of Desert to all enemies every sec if there are more than ${PERKS.over} enemies.` },
    's4-dark': { words: `Activation chance changes to ${pct(PERKS.chance)}.` },
    't5-light': t5Light({ crit: 100 }, ({ crit }) => `Crit Chance +${crit}`),
    't5-dark': { words: `Upon Skill use, recovers ${PERKS.mana} Mana. If there are ${PERKS.many} or more enemies, Mana Recovery is doubled, and ATK Spd is increased by ${PERKS.speed} for ${PERKS.speedLasts} sec. This effect does not stack.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    const starts = attackStarts('zafir');
    /** Blessing's shields (whose, how long each has yet, and whether it is to become a [Sandstorm]); the [Sand Hell], and toward its next blow; Sandstorm Arrow's uses; Judgment's Light's stacks; [Will of Desert]'s stacks, and how long they last yet; toward Calling's Light's next mark; whether the fight has begun for him. */
    let shields: { on: Fighter; left: number; storm: boolean }[] = [];
    let hell = 0;
    let hellTick = 0;
    let arrows = 0;
    let judged = 0;
    let will = 0;
    let willLeft = 0;
    let marking = 0;
    let begun = false;

    /** The stacks of [Mark of Desert] on an enemy; put on, or taken off. */
    const marksOn = (foe: Foe): number => foe.statuses.find((status) => status.name === MARK)?.count ?? 0;
    const mark = (foe: Foe, by: number): void => {
      const count = Math.max(0, Math.min(CALLING.most, marksOn(foe) + by));
      foe.statuses = foe.statuses.filter((status) => status.name !== MARK);
      if (count > 0) foe.statuses.push({ name: MARK, left: Infinity, count, shown: 'curse' });
    };
    /** Her allies on the field, standing and in the fight (him too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** A shield of the Sand Spirit's on an ally: a [Sandstorm] if it holds (not its Light's, nor its Dark's). */
    const shelter = (on: Fighter, amount: number, lasts: number, storm: boolean): void => {
      fight.shield(on, amount, lasts, self);
      put(on.statuses, { name: SANDY.name, left: lasts, shown: SANDY });
      shields.push({ on, left: lasts, storm });
    };

    return {
      lands: {
        // His attack; on each part of it, now and then Calling of the Guardian's blow and a mark (its Dark: likelier; Black Cat: a critical one stuns, and the boss takes more).
        attack(part) {
          fight.hit(self, fight.basic);
          if (!starts.has(part) || fight.roll() >= (self.perks.has('s4-dark') ? PERKS.chance : CALLING.chance)) return;
          const critical = fight.hit(self, CALLING.blow);
          mark(fight.foe, 1);
          if (critical && wearsTreasure(self, 3)) {
            fight.stun(UT.cat.stun, { by: self });
            put(fight.foe.statuses, { name: 'Black Cat, Hoabis', left: UT.cat.lasts, takes: { physical: 1 + fromTreasure(self, 3, UT.cat.takes) }, shown: 'curse' });
          }
        },
        // A blow, harder on a marked enemy (a stack off it); its cooldown shorter for each struck (its Dark: a stun; Sandstorm Arrow: harder for each use, and now and then a mark).
        desert() {
          const marked = marksOn(fight.foe) > 0;
          fight.hit(self, (marked ? JUDGMENT.marked : JUDGMENT.blow) * (1 + fromTreasure(self, 0, UT.arrow.dmg) * arrows));
          if (marked) mark(fight.foe, -1);
          self.cooldowns[0] = Math.max(0, (self.cooldowns[0] ?? 0) - JUDGMENT.sooner);
          if (self.perks.has('s1-dark')) fight.stun(PERKS.stun, { by: self });
          if (wearsTreasure(self, 0) && fight.roll() < UT.arrow.chance) mark(fight.foe, 1);
        },
        // The shields (its Light, with few allies: on all of them, and no [Sandstorm]).
        spirit() {
          const few = allies().length <= PERKS.allies && self.perks.has('s2-light');
          const on = few ? allies() : allies().sort((a, b) => a.hp / a.stats.hp - b.hp / b.stats.hp).slice(0, SPIRIT.allies);
          fight.cue(self, 'spirit', on);
          for (const ally of on) shelter(ally, SPIRIT.shield, SPIRIT.lasts, !few);
        },
        // A blow and a mark; then the [Sand Hell] (tick; its Dark: longer).
        sandstorm() {
          fight.hit(self, DOOM.blow);
          mark(fight.foe, 1);
          hell = DOOM.lasts + (self.perks.has('s3-dark') ? PERKS.longer : 0);
          hellTick = 0;
        },
      },
      used(index) {
        // Judgment of the Desert's Light: his crit DMG higher for each use, up to its most (for good).
        if (index === 0 && self.perks.has('s1-light')) {
          judged = Math.min(PERKS.most, judged + 1);
          put(self.statuses, { name: JUDGED.name, left: Infinity, count: judged, critDamage: PERKS.critDamage * judged, shown: JUDGED });
        }
        // Sandstorm Arrow: Judgment of the Desert harder for each use.
        if (index === 0 && wearsTreasure(self, 0)) {
          arrows = Math.min(UT.arrow.most, arrows + 1);
          put(self.statuses, { name: ARROW.name, left: Infinity, count: arrows, shown: ARROW });
        }
        // Transcend 5's Dark: mana (with many enemies, twice, and quicker).
        if (self.perks.has('t5-dark')) {
          const many = fight.foes.filter((foe) => foe.hp > 0 && !foe.away).length >= PERKS.many;
          self.mana = Math.min(MAX_MANA, self.mana + PERKS.mana * (many ? 2 : 1));
          if (many) put(self.statuses, { name: SWIFT.name, left: PERKS.speedLasts, speed: PERKS.speed, shown: SWIFT });
        }
        // His unique weapon: a stack of [Will of Desert], each his ATK and crit DMG higher.
        if (tier !== null) {
          will = Math.min(ZARIES.most, will + 1);
          willLeft = ZARIES.lasts;
          put(self.statuses, { name: ZARIES_UP.name, left: ZARIES.lasts, count: will, atk: atTier(ZARIES.boost, tier) * will, critDamage: atTier(ZARIES.boost, tier) * will, shown: ZARIES_UP });
        }
      },
      tick(dt) {
        // Blessing of the Sand Spirit's Dark: as the fight begins, a shield on him (no [Sandstorm]).
        if (!begun && fight.field.includes(self)) {
          begun = true;
          if (self.perks.has('s2-dark')) shelter(self, PERKS.start.shield, PERKS.start.lasts, false);
        }
        // The shields: Sand of Mirage's mana every second; held to their end, a [Sandstorm] (two stacks of the mark).
        const mirage = fromTreasure(self, 1, UT.mirage.mana);
        for (const one of shields) {
          one.left -= dt;
          if (mirage > 0 && one.on.shield > 0) one.on.mana = Math.min(MAX_MANA, one.on.mana + mirage * dt);
          if (one.left <= 0 && one.storm && one.on.shield > 0 && one.on.hp > 0) {
            fight.hit(self, SPIRIT.storm);
            mark(fight.boss, SPIRIT.stacks);
          }
        }
        shields = shields.filter((one) => one.left > 0);
        // The [Sand Hell]: a blow every so often, the boss's P.DEF lower, now and then a mark (Soul of Oasis: likelier).
        if (hell > 0) {
          hell -= dt;
          hellTick += dt;
          if (hellTick >= DOOM.every) {
            hellTick -= DOOM.every;
            fight.hit(self, DOOM.tick);
            put(fight.boss.statuses, { name: 'Sand Hell', left: DOOM.defenseLasts, defends: { physical: DOOM.defense }, shown: 'curse' });
            if (fight.roll() < DOOM.chance + fromTreasure(self, 2, UT.oasis.chance)) mark(fight.boss, 1);
          }
        }
        if (willLeft > 0) {
          willLeft -= dt;
          if (willLeft <= 0) will = 0;
        }
        // Calling of the Guardian's Light: with more than so many enemies, a mark on each every second.
        if (self.perks.has('s4-light')) {
          marking += dt;
          if (marking >= 1) {
            marking -= 1;
            const standing = fight.foes.filter((foe) => foe.hp > 0 && !foe.away);
            if (standing.length > PERKS.over) for (const foe of standing) mark(foe, 1);
          }
        }
      },
      lit: () => hell > 0,
    };
  },
};
