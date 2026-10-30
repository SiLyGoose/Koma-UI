import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { fine, num, pct, skillArt, type Buff } from '../shown';
import { atTier, GIGANTIX, GIGANTIX_UP } from '../unique';
import { type Ability, bookDmg, CLASS_STATS, dmg, type HeroDef, type Passive, played } from './kit';

/*
 * Cecilia's skills, as King's Raid's playtest has them (stats/cecilia.md: how hard each hits at its level 90, and every number
 * here, are its; its words are the live game's, krinfo's legacy). She is a mechanic, the Crimson Wind of Justice.
 * - Outta the way!: the boss marked as the [Villain] (its attacks slowed) and a blow; then, at once (King's Raid's has each
 *   follow as the next press of the same button, at no cost: here they come in the one move), Crushing Kick!, a blow that
 *   knocks the boss down, and Tempest Kick!, a blow that stuns it.
 * - Infinite Potential: a blow that knocks the boss down; then [Infinite Potential] for a while: quicker, and every blow of
 *   her attack and of her other skills a blow more.
 * - WA-TAAAAAH!!!: six blows and a last that knocks the boss down; under [Infinite Potential], Special Move. Meteor Kick!!!
 *   after it (King's Raid's has it as the next press, for its own 1 mana: here it is the same move, the skill costing 1 more
 *   while she is under [Infinite Potential]; without it, the move ends with the last blow): a great blow, always critical,
 *   that stuns the boss.
 * Her passive, Inborn Talent: more DEF (its books' half again) and crit chance, and her blows never miss.
 * Her unique weapon (../unique.ts) is worked here too: quicker; each of her blows a stack of Explosion, and a chance to stun
 * the boss; at 100, Gigantix explodes: quicker still and likelier to dodge, for good.
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/cecilia.ts).
 *
 * Her own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Outta the way!'s
 * Dark takes what helps the boss off it (what has it deal more). Inborn Talent's Dark (DMG to Heroes) does nothing here: no
 * enemy is a Hero. WA-TAAAAAH!!!'s Light (one enemy) holds while the boss stands alone. [Infinite Potential]'s blow more is
 * its blow on a Non-Hero enemy (its blow on a Hero, kept apart, is for heroes to come).
 */
/** Outta the way!: the [Villain]'s slowing (points) for how long; its blow. */
const OUTTA = { slow: 200, lasts: 15, blow: played('mechanic', 1545, 82_834) };
/** Crushing Kick!: its blow, and how long it knocks the boss away; Tempest Kick!: its blow, and how long it stuns. */
const CRUSHING = { blow: played('mechanic', 2345, 86_483), down: 4 };
const TEMPEST = { blow: played('mechanic', 2777, 103_651), stun: 4 };
/** Infinite Potential: its blow, and how long it knocks the boss down; then the state's while, its attack speed, and its blow more on each of her blows (on a Hero, on a Non-Hero enemy). */
const POTENTIAL = { blow: played('mechanic', 2450, 104_077), down: 3, lasts: 15, speed: 300, hero: played('mechanic', 388, 17_811), boss: played('mechanic', 1164, 53_433) };
/** WA-TAAAAAH!!!: each of its six blows; its last, and how long that knocks the boss down; when (seconds into the move) Meteor Kick would begin. */
const WATAH = { blow: played('mechanic', 1213, 46_778), last: played('mechanic', 3945, 131_975), down: 4, ends: 4 };
/** Special Move. Meteor Kick!!!: its mana (sections), its blow (always critical), and how long it stuns. */
const METEOR = { cost: 1, blow: played('mechanic', 12345, 405_160), stun: 5 };
/** Inborn Talent: her DEF more (flat, its books' half again), her crit chance more (points), and ACC enough that no dodge is left (her blows never miss). */
const INBORN = { defense: 4501, books: 1.5, crit: 200, acc: 2000 };
/** Her own perks' numbers: Outta the way!'s Light's more physical damage taken, for how long; Infinite Potential's Light's more to Non-Hero enemies and Dark's less taken; WA-TAAAAAH!!!'s Light's skill power more; Inborn Talent's Light's less taken and Dark's more to Heroes; Transcend 5's Dark's ATK for each [Infinite Potential] blow, up to how many. */
const PERKS = { takes: 1.25, lasts: 10, boss: 1.2, taken: 0.8, alone: 1, inborn: 0.85, heroes: 0.15, dark: { atk: 0.005, most: 200 } };

/**
 * Her unique treasures' numbers (0★ to 5★: ../treasures.ts; King's Raid's own): Outta the way!'s more physical damage taken,
 * for how long; Infinite Potential's more DMG; WA-TAAAAAH!!!'s more DMG to the boss for each use, up to how many; Inborn
 * Talent's more to Non-Hero enemies and less taken as the fight begins, for how long.
 */
const UT = {
  step: { takes: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 },
  memory: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
  respite: { boss: [0.04, 0.048, 0.058, 0.07, 0.084, 0.1], most: 10 },
  justice: { dmg: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], taken: 0.25, lasts: 20 },
};

const art = skillArt('cecilia');

const DEF = Math.round(INBORN.defense * INBORN.books);
const INBORN_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Inborn Talent', about: `Passive. DEF +${num(DEF)} and +${INBORN.crit} crit; her blows never miss.`, icon: '🦵', art: art(3) },
  words: `Increases own DEF by ${num(DEF)} and Crit Chance by ${INBORN.crit}. Cecilia's Normal and Skill attacks will not miss.`,
};
const VILLAIN = 'Villain';
const STEP = 'First Step of Hero';
const POTENT: Buff = { name: 'Infinite Potential', about: 'Quicker; every blow of her attack and her other skills a blow more.', icon: '🔥', art: art(1) };
const TALENT: Buff = { name: 'Inborn Talent', about: 'Her blows never miss.', icon: '🦵', art: art(3) };
const RESPITE: Buff = { name: 'Moment of Respite', about: 'DMG to the boss higher for each.', icon: '🎵', art: art(2) };
const JUSTICE: Buff = { name: 'Heart of Justice', about: 'Deals more to Non-Hero enemies and takes less.', icon: '🎀', art: art(3) };
const CRIMSON: Buff = { name: 'Crimson Wind of Justice', about: 'ATK higher for each.', icon: '🌪️', art: art(1) };
/** Meteor Kick, for its one blow: always critical. */
const SURE = 'Special Move. Meteor Kick!!!';

export const CECILIA: HeroDef = {
  id: 'cecilia',
  name: 'Cecilia',
  class: 'mechanic',
  skins: ['Cecilia', 'Cecilia_Summer', 'Cecilia_Halloween', 'Cecilia_Christmas', 'Cecilia_Glory', 'Cecilia_Glory2', 'Cecilia_Wedding'],
  // A mechanic: her passive's DEF and crit chance.
  stats: { ...CLASS_STATS.mechanic, deals: 'physical', physical: CLASS_STATS.mechanic.physical + DEF, magical: CLASS_STATS.mechanic.magical + DEF, crit: CLASS_STATS.mechanic.crit + INBORN.crit },
  abilities: [
    {
      name: 'Outta the way!',
      about: `The boss marked as the [Villain] (its attack speed ${OUTTA.slow} lower for ${OUTTA.lasts} seconds) and a blow; then Crushing Kick!, a blow that knocks it down for ${CRUSHING.down} seconds, and Tempest Kick!, a blow that stuns it for ${TEMPEST.stun}.`,
      words: `Marks the farthest enemy as the [Villain], reducing its ATK Spd by ${OUTTA.slow} for ${OUTTA.lasts} sec. Then, moves to the target to deal ${dmg('mechanic', OUTTA.blow, bookDmg('cecilia', 0))} P.DMG. After using this Skill, [Crushing Kick!] becomes available.\n[Crushing Kick!] Attacks the target, dealing ${dmg('mechanic', CRUSHING.blow, bookDmg('cecilia', 0))} P.DMG and knocking it away for ${CRUSHING.down} sec. Enemies marked as [Villain] are prioritized. After using this Skill, [Tempest Kick!] becomes available.\n[Tempest Kick!] Moves to the farthest enemy, dealing ${dmg('mechanic', TEMPEST.blow, bookDmg('cecilia', 0))} P.DMG and stunning it for ${TEMPEST.stun} sec. Enemies marked as [Villain] are prioritized.`,
      icon: '🦶',
      art: art(0),
      move: 'outta',
      cooldown: 12,
      cost: 3,
    },
    {
      name: 'Infinite Potential',
      about: `A blow that knocks the boss down for ${POTENTIAL.down} seconds; then [Infinite Potential] for ${POTENTIAL.lasts}: +${POTENTIAL.speed} attack speed, and every blow of her attack and her other skills a blow more.`,
      words: `Deals ${dmg('mechanic', POTENTIAL.blow, bookDmg('cecilia', 1))} P.DMG to nearby enemies in a circular range of self, knocking them down for ${POTENTIAL.down} sec. Afterward, Cecilia gains [Infinite Potential], which increases own ATK Spd by ${POTENTIAL.speed} for ${POTENTIAL.lasts} sec. While under [Infinite Potential], Normal and Skill attacks deal ${dmg('mechanic', POTENTIAL.hero, bookDmg('cecilia', 1))} P.DMG to Heroes and ${dmg('mechanic', POTENTIAL.boss, bookDmg('cecilia', 1))} P.DMG to Non-Hero enemies. This effect is irremovable.`,
      icon: '🔥',
      art: art(1),
      move: 'potential',
      cooldown: 20,
      cost: 3,
    },
    {
      name: 'WA-TAAAAAH!!!',
      about: `Six blows, and a last that knocks the boss down for ${WATAH.down} seconds. Under [Infinite Potential] (costing ${METEOR.cost} more), Meteor Kick after: a great blow, always critical, that stuns it for ${METEOR.stun}.`,
      words: `Deals ${dmg('mechanic', WATAH.blow * 6, bookDmg('cecilia', 2))} P.DMG over 6 attacks to nearby enemies in a circular range of self. Afterward, deals ${dmg('mechanic', WATAH.last, bookDmg('cecilia', 2))} P.DMG to the target and its nearby enemies, knocking them down for ${WATAH.down} sec. While under [Infinite Potential], [Special Move. Meteor Kick!!!] becomes available for 10 sec.\n[Special Move. Meteor Kick!!!] (${METEOR.cost} Mana) Launches a full force attack that deals ${dmg('mechanic', METEOR.blow, bookDmg('cecilia', 2))} P.DMG to the target and enemies nearby, stunning them for ${METEOR.stun} sec. This Skill will always be a Critical Hit.`,
      icon: '🌠',
      art: art(2),
      move: 'watah',
      cooldown: 21,
      cost: 3,
    },
  ],
  passive: INBORN_SHOWN,
  treasures: [
    treasure('First Step of Hero', (k) => ({
      words: `[Outta the Way!] Reduces Mana Cost by 1 and increases P.DMG the target takes by ${fine(k(UT.step.takes))} for ${UT.step.lasts} sec.`,
      skill: { index: 0, cost: -1 },
    })),
    treasure('Childhood Memory', (k) => ({
      words: `[Infinite Potential] Dispels negative effects from self and increases DMG by ${fine(k(UT.memory.dmg))}.`,
      skill: { index: 1, cleanse: 'self', dmg: 1 + k(UT.memory.dmg) },
    })),
    treasure('Moment of Respite', (k) => ({
      words: `[WA-TAAAAAH!!!] Increases own DMG to Boss by ${fine(k(UT.respite.boss))} per every Skill use. This effect can be stacked up to max ${UT.respite.most} times. Reduces Mana Cost of [Special Move. Meteor Kick!!!] by 1.`,
    })),
    treasure('Heart of Justice', (k) => ({
      words: `[Inborn Talent] At the beginning of each battle, deals ${fine(k(UT.justice.dmg))} increased DMG to Non-Hero enemies and takes ${pct(UT.justice.taken)} reduced DMG for ${UT.justice.lasts} sec.`,
    })),
  ],
  perks: {
    's1-light': { words: `Increases P.DMG the target takes by ${pct(PERKS.takes - 1)} for ${PERKS.lasts} sec.` },
    's1-dark': { words: 'Dispels positive effects from the target.' },
    's2-light': { words: `Increases DMG to Non-Hero enemies by ${pct(PERKS.boss - 1)} for the duration of Skill.` },
    's2-dark': { words: `Takes ${pct(1 - PERKS.taken)} reduced DMG for the duration of Skill.` },
    's3-light': { words: `Increases DMG by ${pct(PERKS.alone)} when there is only 1 enemy left.` },
    's3-dark': { words: 'Gains immunity to CC for the duration of Skill.' },
    's4-light': said({ taken: PERKS.inborn }, ({ taken }) => `Takes ${pct(1 - taken)} reduced DMG.`),
    's4-dark': { words: `Increases DMG to Heroes by ${pct(PERKS.heroes)}.` },
    't5-light': t5Light({ critDamage: 0.2 }, ({ critDamage }) => `Crit DMG +${pct(critDamage)}`),
    't5-dark': { words: `Attacking the enemy with the additional DMG gained from [Infinite Potential] will increase own ATK by ${fine(PERKS.dark.atk)}. This effect can be stacked up to max ${PERKS.dark.most} times and is irremovable.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /** How long [Infinite Potential] lasts yet; whether this WA-TAAAAAH!!! has its Meteor Kick; Moment of Respite's stacks; Transcend 5's Dark's; her unique weapon's Explosion, and whether Gigantix has exploded. */
    let potential = 0;
    let meteor = false;
    let respite = 0;
    let crimson = 0;
    let explosion = 0;
    let exploded = false;
    // (Inborn Talent: her blows never miss.)
    put(self.statuses, { name: TALENT.name, left: Infinity, acc: INBORN.acc, shown: TALENT });
    // (Heart of Justice: more to Non-Hero enemies and less taken, as the fight begins.)
    if (wearsTreasure(self, 3)) put(self.statuses, { name: JUSTICE.name, left: UT.justice.lasts, deals: 1 + fromTreasure(self, 3, UT.justice.dmg), takes: 1 - UT.justice.taken, shown: JUSTICE });
    // (Her unique weapon: quicker, for good.)
    if (tier !== null) put(self.statuses, { name: GIGANTIX.name, left: Infinity, speed: atTier(GIGANTIX.speed, tier), shown: GIGANTIX_UP });

    /** Whether the boss (or whichever enemy) stands alone. */
    const alone = (): boolean => fight.foes.filter((foe) => foe.hp > 0 && !foe.away).length <= 1;
    /** WA-TAAAAAH!!!'s Light, with one enemy: its 100% added to the skill's power, as its books are (King's Raid adds them up). */
    const light = (): number => (self.perks.has('s3-light') && alone() ? 1 + PERKS.alone / bookDmg('cecilia', 2) : 1);
    /**
     * Under [Infinite Potential], a blow of hers a blow more (not counted: it comes of the state). Its books are its skill's: in
     * her attack (none there) put in by hand. Transcend 5's Dark: each one her ATK higher, for good.
     */
    const more = (attacking: boolean): void => {
      if (potential <= 0) return;
      fight.hit(self, POTENTIAL.boss * (attacking ? bookDmg('cecilia', 1) : 1), false);
      if (!self.perks.has('t5-dark') || crimson >= PERKS.dark.most) return;
      crimson++;
      put(self.statuses, { name: CRIMSON.name, left: Infinity, count: crimson, atk: PERKS.dark.atk * crimson, shown: CRIMSON });
    };
    /** Outta the way!'s Dark: what helps the boss (has it deal more) taken off it. */
    const dispel = (): void => {
      if (!self.perks.has('s1-dark')) return;
      const { statuses } = fight.foe;
      for (let i = statuses.length - 1; i >= 0; i--) if ((statuses[i]?.deals ?? 1) > 1) statuses.splice(i, 1);
    };
    /** WA-TAAAAAH!!! under [Infinite Potential]: Meteor Kick's mana on top (Moment of Respite: none). */
    const meteorCost = (): number => (wearsTreasure(self, 2) ? METEOR.cost - 1 : METEOR.cost);

    return {
      lands: {
        // A blow of her attack; under [Infinite Potential] a blow more.
        attack() {
          fight.hit(self, fight.basic);
          more(true);
        },
        // The [Villain]; a blow (its Light: more physical damage taken; First Step of Hero: more again); Crushing Kick!'s,
        // knocking the boss down; Tempest Kick!'s dash, and its blow, stunning it. (Its Dark: what helps the boss off it, with each.)
        outta(part) {
          if (part === 0) {
            fight.slow(OUTTA.slow, OUTTA.lasts);
            put(fight.foe.statuses, { name: VILLAIN, left: OUTTA.lasts, shown: 'curse' });
            return;
          }
          if (part === 3) return;
          dispel();
          fight.hit(self, part === 1 ? OUTTA.blow : part === 2 ? CRUSHING.blow : TEMPEST.blow);
          more(false);
          if (self.perks.has('s1-light')) put(fight.foe.statuses, { name: 'Outta the way!', left: PERKS.lasts, takes: { physical: PERKS.takes }, shown: 'curse' });
          if (part === 1 && wearsTreasure(self, 0)) put(fight.foe.statuses, { name: STEP, left: UT.step.lasts, takes: { physical: 1 + fromTreasure(self, 0, UT.step.takes) }, shown: 'curse' });
          if (part === 2) fight.stun(CRUSHING.down, { down: true, by: self });
          if (part === 4) fight.stun(TEMPEST.stun, { by: self });
        },
        // A blow that knocks the boss down; then [Infinite Potential] (its Light: more to Non-Hero enemies; its Dark: less taken).
        potential() {
          fight.hit(self, POTENTIAL.blow);
          fight.stun(POTENTIAL.down, { down: true, by: self });
          potential = POTENTIAL.lasts;
          put(self.statuses, {
            name: POTENT.name,
            left: POTENTIAL.lasts,
            speed: POTENTIAL.speed,
            ...(self.perks.has('s2-light') && { deals: PERKS.boss }),
            ...(self.perks.has('s2-dark') && { takes: PERKS.taken }),
            shown: POTENT,
          });
        },
        // Six blows, and a last that knocks the boss down; then (under [Infinite Potential]) Meteor Kick, always critical, that
        // stuns it. Its Light, with one enemy: harder. Each a blow more, under [Infinite Potential].
        watah(part) {
          if (part === 7) {
            put(self.statuses, { name: SURE, left: 0.01, crit: 1, shown: POTENT });
            fight.hit(self, METEOR.blow * light());
            self.statuses = self.statuses.filter((status) => status.name !== SURE);
            more(false);
            fight.stun(METEOR.stun, { by: self });
            return;
          }
          fight.hit(self, (part < 6 ? WATAH.blow : WATAH.last) * light());
          more(false);
          if (part === 6) fight.stun(WATAH.down, { down: true, by: self });
        },
      },
      // WA-TAAAAAH!!! under [Infinite Potential]: Meteor Kick's mana on top.
      slot(index) {
        const own = self.abilities[index] ?? null;
        return own && index === 2 && potential > 0 ? { ...own, cost: own.cost + meteorCost() } : own;
      },
      used(index: number, ability: Ability) {
        if (index !== 2) return;
        // WA-TAAAAAH!!!: Meteor Kick with it, if she is under [Infinite Potential] (and paid for it); Moment of Respite: a stack more.
        meteor = potential > 0 && ability.cost >= (self.abilities[2]?.cost ?? 0) + meteorCost();
        if (!wearsTreasure(self, 2)) return;
        respite = Math.min(UT.respite.most, respite + 1);
        put(self.statuses, { name: RESPITE.name, left: Infinity, count: respite, shown: RESPITE });
      },
      // Auto: Infinite Potential first, and WA-TAAAAAH!!! while she is under it (Meteor Kick with it).
      now: (index) => index === 1 || (index === 2 && potential > 0),
      // WA-TAAAAAH!!!'s Dark: immune to CC while she uses it.
      guards: () => self.perks.has('s3-dark') && self.doing?.move === 'watah',
      // Moment of Respite: more to the boss (not its minions) for each stack.
      deals: () => 1 + (fight.foe.kind === 'boss' ? fromTreasure(self, 2, UT.respite.boss) * respite : 0),
      // Her unique weapon: each blow of hers a stack of Explosion, and a chance to stun the boss; at its most, Gigantix explodes, for good.
      blow() {
        if (tier === null) return;
        if (fight.roll() < GIGANTIX.chance) fight.stun(GIGANTIX.stun, { by: self });
        if (exploded) return;
        explosion++;
        if (explosion < GIGANTIX.stacks) return;
        exploded = true;
        const burst = atTier(GIGANTIX.burst, tier);
        put(self.statuses, { name: GIGANTIX_UP.name, left: Infinity, speed: burst, dodges: { physical: burst, magical: burst }, shown: GIGANTIX_UP });
      },
      tick(dt) {
        if (potential > 0) potential -= dt;
        // WA-TAAAAAH!!! without Meteor Kick: over with its last blow.
        if (!meteor && self.doing?.move === 'watah' && self.doing.t >= WATAH.ends) self.doing = null;
      },
      lit: () => potential > 0,
      buffs: () => (tier !== null && !exploded ? [{ ...GIGANTIX_UP, name: 'Explosion', about: `At ${GIGANTIX.stacks}: Gigantix explodes.`, count: explosion }] : []),
    };
  },
};
