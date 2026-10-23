import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { fine, pct, skillArt, type Buff } from '../shown';
import { atTier, MONOLITH, MONOLITH_UP } from '../unique';
import { attackStarts, bookDmg, CLASS_STATS, dmg, type HeroDef, type Passive, played } from './kit';

/*
 * Chase's skills, as King's Raid's playtest has them (stats/chase.md: how hard each hits at its level 90, and every number
 * here, are its; its words are its own, kingsraid.shodyra.com's where it says none). He is a warrior, Type. 0.
 * - I'll Break You!: a blow that knocks the boss back, and a blow more about it that stuns it.
 * - Remove Limit: a share of his HP for what the boss has left on him cleared and a blow; then [Remove Limit] until his HP
 *   is under a quarter: a share of it lost every second, immune to CC, his crit DMG and attack speed higher and growing (up
 *   to twice), and each part of his attack a blow more.
 * - Burn, Spear of Fury: a blow that knocks the boss down, and four more that stun it; each heals him.
 * His passive, Remember This in Hell: no lifesteal for him, but more max HP, crit chance (its books', as the playtest's) and
 * ACC; the more he is hurt, the higher his crit DMG and attack speed; and once, brought down, he fights on for a few seconds,
 * immune to CC and quicker, but can use no skill.
 * His unique weapon (../unique.ts) is worked here too: his crit DMG higher, and each part of his attack a blow of flame
 * more that heals him (twice under [Remove Limit]).
 * What is drawn for each, and what his body does, are King's Raid's own (../../assets/heroes/chase.ts).
 *
 * His own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Remember This
 * in Hell's Dark knocks the boss down as he rises. A heal "of DMG dealt" is of the blow as his ATK has it (before the
 * boss's defense).
 */
/** I'll Break You!: its blow and how long it knocks the boss back; its blow more and how long it stuns. */
const BREAK = { blow: played('warrior', 3220, 109_655), back: 1, more: played('warrior', 1240, 42_060), stun: 4 };
/** Remove Limit: its share of current HP, and its blow; then the share lost every second, its crit DMG and attack speed (each growing so much each step, up to `steps`), what each part of his attack deals more, and the share of HP it stops at. */
const LIMIT = { cost: 0.1, blow: played('warrior', 3336, 114_590), drain: 0.025, critDamage: 0.5, speed: 500, growth: 0.1, every: 0.6, steps: 10, attack: 300, floor: 0.25 };
/** Burn, Spear of Fury: its blow and how long it knocks the boss down; each of its four blows more and how long they stun; its heal (a share of max HP) and the share of what it deals. */
const FURY = { blow: played('warrior', 2150, 74_033), down: 4, more: played('warrior', 1072, 36_265), stun: 5, heal: 0.03, drain: 0.25 };
/** Remember This in Hell: his max HP and crit chance (its books' half again, twice over), ACC and CC ACC; crit DMG and attack speed at no HP; and rising: for how long, at least how much HP, his crit DMG and attack speed. */
const HELL = { hp: 0.2, crit: 250, acc: 100, accuracy: 100, critDamage: 1, speed: 400, rise: 5.2, floor: 0.05, risenCrit: 0.4, risenSpeed: 400 };
/**
 * His own perks' numbers: I'll Break You!'s Dark's more taken and for how long; Remove Limit's Light's stun and Dark's
 * heal rate more and less taken for each share of his HP lost (`hp`); Burn's Light's heals; Remember's Light's ATK and
 * Dark's knock down; Transcend 5's Dark's DMG every second, and how many at most.
 */
const PERKS = { takes: 1.25, lasts: 10, stun: 2, dark: { each: 0.004, hp: 0.01 }, heals: 2, risenAtk: 0.5, down: 3, every: { dmg: 0.01, most: 60 } };

/**
 * His unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): I'll Break You!'s mana for each blow;
 * Remove Limit's blow every second (a share of ATK) and more Heal Rate; Burn's more DMG; Remember's more DMG to and less
 * from Non-Hero enemies.
 */
const UT = {
  sin: { mana: [200, 240, 290, 350, 420, 500] },
  handkerchief: { blow: [0.4, 0.48, 0.58, 0.7, 0.84, 1], heals: 0.3 },
  pauldron: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
  sensor: { dmg: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], taken: 0.2 },
};

const art = skillArt('chase');

const HELL_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Remember This in Hell', about: `Passive. No lifesteal, but ${pct(HELL.hp)} more max HP, +${HELL.crit} crit and +${HELL.acc} ACC; up to +${pct(HELL.critDamage)} crit DMG and +${HELL.speed} attack speed as he is hurt. Once, brought down, he fights on for ${HELL.rise} seconds.`, icon: '🔥', art: art(3) },
  words: `Chase is not affected by Lifesteal stats. Instead, increases self's Max HP by ${pct(HELL.hp)}, Crit Chance by ${HELL.crit}, CC ACC by ${HELL.accuracy}, and ACC by ${HELL.acc}. The more HP is lost, the more Crit DMG (up to ${pct(HELL.critDamage)}) and ATK Spd (up to ${HELL.speed}) increase. Upon taking a fatal DMG, resurrects for ${HELL.rise} sec, increasing Crit DMG by ${pct(HELL.risenCrit)}, ATK Spd by ${HELL.risenSpeed}, and gaining immunity to CC for the duration. The resurrection effect can be activated only once in battle, and resurrected Chase cannot use skills.`,
};
const UNLEASHED: Buff = { name: 'Remove Limit', about: 'Losing HP every second; immune to CC; crit DMG and attack speed higher and growing; his attack a blow more.', icon: '🩸', art: art(1) };
const HURT: Buff = { name: 'Remember This in Hell', about: 'Crit DMG and attack speed higher, the more he is hurt.', icon: '🔥', art: art(3) };
const RISEN: Buff = { name: 'Resurrection', about: 'Immune to CC, quicker and his crit DMG higher; no skills.', icon: '💀', art: art(3) };
const RELENTLESS: Buff = { name: 'Type. 0', about: 'Deals more to Non-Hero enemies for each.', icon: '🔥', art: art(3) };

export const CHASE: HeroDef = {
  id: 'chase',
  name: 'Chase',
  class: 'warrior',
  skins: ['Chase'],
  // A warrior: his passive's max HP, crit chance and ACC.
  stats: { ...CLASS_STATS.warrior, deals: 'physical', hp: CLASS_STATS.warrior.hp * (1 + HELL.hp), crit: CLASS_STATS.warrior.crit + HELL.crit, acc: CLASS_STATS.warrior.acc + HELL.acc },
  abilities: [
    {
      name: 'I’ll Break You!',
      about: `A blow that knocks the boss back, and a blow more about it that stuns it for ${BREAK.stun} seconds.`,
      words: `Prevents the target from receiving positive effects for 4 seconds, and attacks to inflict ${dmg('warrior', BREAK.blow, bookDmg('chase', 0))} P.DMG and knocks the target back.\nInflicts ${dmg('warrior', BREAK.more, bookDmg('chase', 0))} P.DMG after 1 second to enemies around the target and stuns them for ${BREAK.stun} seconds.`,
      icon: '🔱',
      art: art(0),
      move: 'break',
      cooldown: 12,
      cost: 2,
    },
    {
      name: 'Remove Limit',
      about: `${pct(LIMIT.cost)} of his HP: what the boss has left on him cleared, and a blow. Then [Remove Limit] until his HP is under ${pct(LIMIT.floor)}: ${pct(LIMIT.drain)} of it lost every second, immune to CC, +${pct(LIMIT.critDamage)} crit DMG and +${LIMIT.speed} attack speed (growing, up to twice), and each part of his attack a blow more.`,
      words: `Upon activation, [Remove Limit] takes effect. When activated, consumes ${pct(LIMIT.cost)} of current HP to remove all negative effects from self and deal ${dmg('warrior', LIMIT.blow, bookDmg('chase', 1))} P.DMG to nearby enemies in range. While [Remove Limit] is activated, consumes ${pct(LIMIT.drain)} of current HP every 1 sec, gains immunity to CC, increases Crit DMG by ${pct(LIMIT.critDamage)} and ATK Spd by ${LIMIT.speed}, and enhances normal attacks. The HP consumption, Crit DMG and ATK Spd Boost grow stronger over time. This effect is irremovable, and is automatically deactivated when HP falls under ${pct(LIMIT.floor)}.`,
      icon: '🩸',
      art: art(1),
      move: 'limit',
      cooldown: 10,
      cost: 3,
    },
    {
      name: 'Burn, Spear of Fury',
      about: `A blow that knocks the boss down for ${FURY.down} seconds, and four more that stun it for ${FURY.stun}; each heals him.`,
      words: `Charges at an enemy, dealing ${dmg('warrior', FURY.blow, bookDmg('chase', 2))} P.DMG and knocking it down. Afterward, explodes the ground around self to attack 4 times, dealing a total of ${dmg('warrior', FURY.more * 4, bookDmg('chase', 2))} P.DMG and inflicting Stun for ${FURY.stun} sec. Each hit recovers HP equal to ${pct(FURY.heal)} of Chase's Max HP + ${pct(FURY.drain)} of DMG.`,
      icon: '🔥',
      art: art(2),
      move: 'fury',
      cooldown: 20,
      cost: 3,
    },
  ],
  passive: HELL_SHOWN,
  treasures: [
    treasure('Guide of Sin', (k) => ({
      words: `[I'll Break You!] Gains immunity to CC for the skill's duration, and recovers Mana by ${k(UT.sin.mana)} upon hit.`,
      skill: { index: 0, steady: true },
    })),
    treasure('Handkerchief of Loyalty', (k) => ({
      words: `[Remove Limit] Deals P.DMG equal to ${pct(k(UT.handkerchief.blow))} of ATK to nearby enemies every sec and increases Heal Rate by ${pct(UT.handkerchief.heals)} for the duration of Skill.`,
    })),
    treasure('Unrelenting Pauldron', (k) => ({
      words: `[Burn, Spear of Fury] Reduces Mana Cost by 1 and increases DMG by ${pct(k(UT.pauldron.dmg))}.`,
      skill: { index: 2, cost: -1, dmg: 1 + k(UT.pauldron.dmg) },
    })),
    treasure('Biometric Sensor - Type. 0', (k) => ({
      words: `[Remember This in Hell] Increases DMG dealt to Non-Hero targets by ${pct(k(UT.sensor.dmg))} and reduces DMG taken from Non-Hero enemies by ${pct(UT.sensor.taken)}.`,
      dmg: 1 + k(UT.sensor.dmg),
      taken: 1 - UT.sensor.taken,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, cost: -1 } }, ({ skill }) => `Reduces Mana Cost by ${-skill.cost}.`),
    's1-dark': said(
      { skill: { index: 0, mark: { name: 'I’ll Break You!', lasts: PERKS.lasts, takes: { physical: PERKS.takes } } } },
      ({ skill }) => `The inflicted target takes ${pct(skill.mark.takes.physical - 1)} more P.DMG for ${skill.mark.lasts} seconds.`,
    ),
    's2-light': { words: `Enemies hit are stunned for ${PERKS.stun} sec.` },
    's2-dark': { words: `Whenever HP drops by ${pct(PERKS.dark.hp)} for the duration of Skill, increases Heal Rate by ${fine(PERKS.dark.each)} and reduces All DMG taken by ${fine(PERKS.dark.each)}.` },
    's3-light': said({ skill: { index: 2, cost: 1 } }, ({ skill }) => `Increases Mana Cost by ${skill.cost} and Heal Rate by ${pct(PERKS.heals - 1)}.`),
    's3-dark': said({ skill: { index: 2, cleanse: 'self' } }, () => 'Upon use, dispels negative effects from self.'),
    's4-light': { words: `Upon the activation of resurrection, increases ATK by ${pct(PERKS.risenAtk)}.` },
    's4-dark': { words: `Upon the activation of resurrection, knocks back nearby enemies in range for ${PERKS.down} seconds.` },
    't5-light': t5Light({ critDamage: 0.2 }, ({ critDamage }) => `Crit DMG +${pct(critDamage)}`),
    't5-dark': { words: `Increases DMG dealt to Non-Hero enemies by ${pct(PERKS.every.dmg)} every 1 sec. This effect can be stacked up to max ${PERKS.every.most} times and is irremovable.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    const starts = attackStarts('chase');
    /** [Remove Limit]: on, how long it has been, and toward its next second; whether he has risen, and how long he has yet; Transcend 5's Dark's stacks, and toward the next. */
    let limit = false;
    let limitFor = 0;
    let drain = 0;
    let risen = false;
    let rising = 0;
    /** Just risen: healed as the next moment comes (the blow that brought him down leaves him on 1 HP first). */
    let rose = false;
    let relentless = 0;
    let next = 0;
    /** A heal of a share of a blow (as his ATK has it). */
    const drink = (blow: number, share: number): void => void fight.heal(self, (blow / 1000) * self.stats.atk * share, undefined, self);
    /** [Remove Limit] off: its state gone. */
    const off = (): void => {
      limit = false;
      self.statuses = self.statuses.filter((status) => status.name !== UNLEASHED.name);
    };
    // His unique weapon: his crit DMG higher, for good.
    if (tier !== null) put(self.statuses, { name: MONOLITH_UP.name, left: Infinity, critDamage: atTier(MONOLITH.critDamage, tier), shown: MONOLITH_UP });

    return {
      lands: {
        // His attack; each part of it under [Remove Limit] a blow more; with his unique weapon, a blow of flame that heals him (twice under [Remove Limit]).
        attack(part) {
          fight.hit(self, fight.basic);
          if (!starts.has(part)) return;
          if (limit) fight.hit(self, LIMIT.attack);
          if (tier !== null) {
            const flame = atTier(MONOLITH.flame, tier) * 1000 * (limit ? 2 : 1);
            fight.hit(self, flame);
            drink(flame, MONOLITH.heal);
          }
        },
        // A blow that knocks the boss back, and a blow more about it that stuns it. Guide of Sin: mana for each.
        break() {
          fight.hit(self, BREAK.blow);
          fight.stun(BREAK.back, { down: true, by: self });
          fight.hit(self, BREAK.more);
          fight.stun(BREAK.stun, { by: self });
          const mana = fromTreasure(self, 0, UT.sin.mana);
          if (mana > 0) self.mana = Math.min(MAX_MANA, self.mana + mana * 2);
        },
        // A share of his HP; what the boss has left on him cleared; a blow (its Light: stunning the boss); then [Remove Limit] (tick).
        limit() {
          self.hp = Math.max(1, self.hp * (1 - LIMIT.cost));
          self.statuses = self.statuses.filter((status) => status.shown.harmful !== true || status.binds === true);
          fight.hit(self, LIMIT.blow);
          if (self.perks.has('s2-light')) fight.stun(PERKS.stun, { by: self });
          limit = true;
          limitFor = 0;
          drain = 0;
        },
        // A blow that knocks the boss down, and four that stun it; each heals him (its Light: twice).
        fury(part) {
          const blow = part === 0 ? FURY.blow : FURY.more;
          fight.hit(self, blow);
          if (part === 0) fight.stun(FURY.down, { down: true, by: self });
          else if (part === 1) fight.stun(FURY.stun, { by: self });
          const heals = self.perks.has('s3-light') ? PERKS.heals : 1;
          if (part === 0) fight.heal(self, self.stats.hp * FURY.heal * heals, undefined, self);
          drink(blow, FURY.drain * heals);
        },
      },
      // Risen, he can use no skill; under [Remove Limit], not Remove Limit again (nor Auto pick it, as King's Raid's says).
      slot: (index) => (rising > 0 || (index === 1 && limit) ? null : (self.abilities[index] ?? null)),
      autoOff: (index) => index === 1 && limit,
      // Brought down the first time: he rises (tick), left on 1 HP; risen, he goes no lower than so much of it.
      spared() {
        if (rising > 0) return true;
        if (risen) return false;
        risen = true;
        rising = HELL.rise;
        off();
        rose = true;
        if (self.perks.has('s4-dark')) fight.stun(PERKS.down, { down: true, by: self });
        put(self.statuses, { name: RISEN.name, left: rising, critDamage: HELL.risenCrit, speed: HELL.risenSpeed, guards: true, ...(self.perks.has('s4-light') && { atk: PERKS.risenAtk }), shown: RISEN });
        return true;
      },
      guards: () => limit || rising > 0,
      tick(dt) {
        // Risen: when his while is up, he falls.
        if (rising > 0) {
          rising -= dt;
          if (rising <= 0) {
            // (Brought down as the fight brings anyone down, what it does then the fight's, a practice fight's sparing among it: a blow
            // more than his HP through any DEF, the most of which is 90%.)
            self.statuses = self.statuses.filter((status) => status.name !== RISEN.name);
            fight.hurt(self, self.hp * 20, false);
            return;
          }
        }
        if (self.hp <= 0) return;
        if (rose) {
          rose = false;
          fight.heal(self, self.stats.hp * HELL.floor, undefined, self);
        }
        // His passive: the more he is hurt, the higher his crit DMG and attack speed.
        const lost = 1 - self.hp / self.stats.hp;
        put(self.statuses, { name: HURT.name, left: Infinity, critDamage: HELL.critDamage * lost, speed: HELL.speed * lost, shown: HURT });
        // [Remove Limit]: HP lost every second (never below its floor: it ends there), its crit DMG and attack speed growing; its Dark: for each 1% of his HP lost, more healing and less taken; Handkerchief of Loyalty: a blow every second, and more healing.
        if (limit) {
          limitFor += dt;
          drain += dt;
          const steps = Math.min(LIMIT.steps, Math.floor(limitFor / LIMIT.every));
          const grown = 1 + LIMIT.growth * steps;
          const dark = self.perks.has('s2-dark') ? PERKS.dark.each * Math.floor(lost / PERKS.dark.hp + 1e-9) : 0;
          put(self.statuses, {
            name: UNLEASHED.name,
            left: Infinity,
            critDamage: LIMIT.critDamage * grown,
            speed: LIMIT.speed * grown,
            guards: true,
            ...(dark > 0 && { heals: 1 + dark, takes: 1 - dark }),
            ...(wearsTreasure(self, 1) && { heals: 1 + dark + UT.handkerchief.heals }),
            shown: UNLEASHED,
          });
          if (drain >= 1) {
            drain -= 1;
            self.hp = Math.max(1, self.hp * (1 - LIMIT.drain * grown));
            const blow = fromTreasure(self, 1, UT.handkerchief.blow);
            if (blow > 0) fight.hit(self, blow * 1000, false);
          }
          if (self.hp <= self.stats.hp * LIMIT.floor) off();
        }
        // Transcend 5's Dark: more to Non-Hero enemies every second, for good.
        if (self.perks.has('t5-dark') && relentless < PERKS.every.most) {
          next += dt;
          if (next >= 1) {
            next -= 1;
            relentless++;
            put(self.statuses, { name: RELENTLESS.name, left: Infinity, count: relentless, deals: 1 + PERKS.every.dmg * relentless, shown: RELENTLESS });
          }
        }
      },
      lit: () => limit || rising > 0,
    };
  },
};
