import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { fine, pct, skillArt, type Buff } from '../shown';
import { atTier, LEGIOS, LEGIOS_UP } from '../unique';
import { attackStarts, bookDmg, CLASS_STATS, dmg, type HeroDef, type Passive, played } from './kit';

/*
 * Theo's skills, as King's Raid's playtest has them (stats/theo.md: how hard each hits at its level 90, and every number
 * here, are its; its words are the game's, kingsraid.shodyra.com's). He is a warrior whose blows are magical, the Knight of Loyalty.
 * - Final Crash: sixteen blows; each critical one raises his crit DMG for a while (up to 30 times), and may deal a blow
 *   more that stuns the boss a moment.
 * - God of Lightning: a spear of lightning that knocks the boss down, which then takes more magic damage for a while;
 *   and he is the God of Lightning for a while: his ATK far higher (its books', too), and For Jane likelier.
 * - Lightning Explosion: five blows that stun the boss.
 * His passive, For Jane: now and then a part of his attack deals a blow more that stuns the boss a moment.
 * His unique weapon (../unique.ts) is worked here too: each of his blows a stack of Lightning, and at 50 Lightning Bolt,
 * Legios for a while (his attack speed, crit DMG and penetration higher), stacking none meanwhile.
 * What is drawn for each, and what his body does, are King's Raid's own (../../assets/heroes/theo.ts).
 *
 * His own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Final Crash's
 * Light (one enemy) always holds. God of Lightning's Dark adds to its ATK Boost (as its books do: King's Raid adds them up). Fur Decoration of Sable's taking what helps the
 * boss off it takes what has it deal more.
 */
/** Final Crash: each of its blows; the crit DMG each critical one gives (a share, up to `most`, for `lasts` seconds), and the chance, blow and stun of its blow more. */
const CRASH = { blow: played('warrior', 350, 13_302), critDamage: 0.03, most: 30, lasts: 10, chance: 0.3, more: played('warrior', 371, 13_945), stun: 0.3 };
/** God of Lightning: its blow, and how long it knocks the boss down; the boss's more magic damage taken, and for how long; and the state's seconds, For Jane's chance more and ATK more (flat, its books' half again added to it). */
const THUNDER = { blow: played('warrior', 3932, 120_385), down: 2, takes: 1.5, marked: 10, lasts: 15, chance: 0.4, atk: 64_380, books: 1.5 };
/** Lightning Explosion: each of its five blows, and how long the first stuns the boss. */
const EXPLOSION = { blow: played('warrior', 1117, 39_914), stun: 3 };
/** For Jane: its chance on each part of his attack, its blow, and how long it stuns the boss. */
const JANE = { chance: 0.2, blow: played('warrior', 1716, 75_753), stun: 0.7 };
/** His own perks' numbers: God of Lightning's Dark's ATK more; Lightning Explosion's Dark's longer stun; For Jane's Light's more DMG and Dark's longer stun; Transcend 5's Dark's ATK, for how long, and how often at most. */
const PERKS = { thunder: 1, stun: 1, jane: { dmg: 1.4, stun: 0.2 }, dark: { atk: 0.5, lasts: 15, every: 20 } };

/**
 * His unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Final Crash's chance to take what helps
 * the boss off it; God of Lightning's attack speed and For Jane's chance more; Lightning Explosion's shorter cooldown and
 * each blow's blow more (a share of ATK); and For Jane's chance more and his attack speed at the start.
 */
const UT = {
  sable: { chance: [0.08, 0.1, 0.12, 0.14, 0.17, 0.2] },
  necklace: { speed: 250, chance: [0.08, 0.096, 0.115, 0.138, 0.165, 0.2] },
  essence: { cooldown: 0.3, blow: [0.4, 0.48, 0.58, 0.7, 0.84, 1] },
  doll: { chance: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], speed: 350, lasts: 30 },
};

const art = skillArt('theo');

const FOR_JANE: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'For Jane', about: `Passive. Each part of his attack has a ${pct(JANE.chance)} chance to deal a blow more that stuns the boss for ${JANE.stun} seconds.`, icon: '⚡', art: art(3) },
  words: `Each auto attack has a ${pct(JANE.chance)} chance of dealing ${dmg('warrior', JANE.blow, bookDmg('theo', 3))} M.DMG and inflicting Stun for ${JANE.stun} sec.`,
};
/** Final Crash's crit DMG, stacked; the God of Lightning state; the boss under God of Lightning's spear; Transcend 5's Dark's ATK; Another Funeral Doll's attack speed. */
const CRASHING: Buff = { name: 'Final Crash', about: 'Crit DMG higher for each.', icon: '💥', art: art(0) };
const GOD: Buff = { name: 'God of Lightning', about: 'ATK far higher, and For Jane likelier.', icon: '⚡', art: art(1) };
const FULL: Buff = { name: 'Lightning Surge', about: 'ATK higher.', icon: '🔋', art: art(3) };
const DOLL: Buff = { name: 'Another Funeral Doll', about: 'Attack speed higher.', icon: '🪆', art: art(3) };

export const THEO: HeroDef = {
  id: 'theo',
  name: 'Theo',
  class: 'warrior',
  skins: ['Theo', 'Theo_Idol', 'Theo_Christmas', 'Theo_School', 'Theo_Wedding', 'Theo_Story', 'Theo_Summer', 'Theo_Glory', 'Theo_UserPick', 'Theo_Dessert', 'Theo_Fallen'],
  // A warrior whose blows are magical: as his class stands, otherwise.
  stats: { ...CLASS_STATS.warrior, deals: 'magical' },
  abilities: [
    {
      name: 'Final Crash',
      about: `${16} blows. Each critical one raises his crit DMG by ${pct(CRASH.critDamage)} for ${CRASH.lasts} seconds (up to ${CRASH.most} times), and has a ${pct(CRASH.chance)} chance to deal a blow more that stuns the boss for ${CRASH.stun} seconds.`,
      words: `Attacks 16 times, dealing a total of ${dmg('warrior', CRASH.blow * 16, bookDmg('theo', 0))} M.DMG to enemies in range. Upon each Crit Hit, Crit DMG is increased by ${pct(CRASH.critDamage)} for ${CRASH.lasts} sec, and there is a ${pct(CRASH.chance)} chance to deal ${dmg('warrior', CRASH.more, bookDmg('theo', 0))} extra M.DMG, inflicting stun for ${CRASH.stun} sec. Crit DMG boost can be stacked up to ${CRASH.most} times max.`,
      icon: '💥',
      art: art(0),
      move: 'crash',
      cooldown: 12,
      cost: 2,
    },
    {
      name: 'God of Lightning',
      about: `A spear of lightning that knocks the boss down for ${THUNDER.down} seconds; it takes ${pct(THUNDER.takes - 1)} more magic damage for ${THUNDER.marked} seconds. He is the God of Lightning for ${THUNDER.lasts} seconds: his ATK far higher, and For Jane ${pct(THUNDER.chance)} likelier.`,
      words: `Upon casting, activates 'God of Lightning' and throws a spear of lightning at the enemy, dealing ${dmg('warrior', THUNDER.blow, bookDmg('theo', 1))} M.DMG and knocking them back. Hit enemy takes ${pct(THUNDER.takes - 1)} increased M.DMG for ${THUNDER.marked} sec. While in 'God of Lightning' state, increases activation chance of 'For Jane' by ${pct(THUNDER.chance)} and ATK by ${Math.round(THUNDER.atk * THUNDER.books).toLocaleString('en-US')} for ${THUNDER.lasts} sec.`,
      icon: '⚡',
      art: art(1),
      move: 'thunder',
      cooldown: 20,
      cost: 2,
    },
    {
      name: 'Lightning Explosion',
      about: `Five blows that stun the boss for ${EXPLOSION.stun} seconds.`,
      words: `Jumps and strikes, thrusting the spear to the ground and hitting target enemy and enemies in range 5 times, dealing a total of ${dmg('warrior', EXPLOSION.blow * 5, bookDmg('theo', 2))} M.DMG and inflicting Stun for ${EXPLOSION.stun} sec.`,
      icon: '🌩️',
      art: art(2),
      move: 'explosion',
      cooldown: 22,
      cost: 3,
    },
  ],
  passive: FOR_JANE,
  treasures: [
    treasure('Fur Decoration of Sable', (k) => ({
      words: `[Final Crash] Dispels all negative effects from self, and upon each hit, has an ${pct(k(UT.sable.chance))} chance to remove all positive effects from the target.`,
      skill: { index: 0, cleanse: 'self' },
    })),
    treasure('God of Lightning’s Necklace', (k) => ({
      words: `[God of Lightning] ATK Spd is increased by ${UT.necklace.speed} for the duration of skill, and the activation chance of 'For Jane' is increased by an additional ${fine(k(UT.necklace.chance))}.`,
    })),
    treasure('Essence of Red Lightning', (k) => ({
      words: `[Lightning Explosion] Skill cooldown is reduced by ${pct(UT.essence.cooldown)} and upon attack, deals ${pct(k(UT.essence.blow))} of ATK as extra M.DMG.`,
      skill: { index: 2, cooldownShare: 1 - UT.essence.cooldown },
    })),
    treasure('Another Funeral Doll', (k) => ({
      words: `[For Jane] Increases activation chance by ${pct(k(UT.doll.chance))} and own ATK Spd by ${UT.doll.speed} for ${UT.doll.lasts} sec at the beginning of every battle.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, dmg: 2 } }, ({ skill }) => `If there is 1 enemy, DMG is increased by ${pct(skill.dmg - 1)}.`),
    's1-dark': said({ skill: { index: 0, cooldown: -2 } }, ({ skill }) => `Cooldown is reduced by ${-skill.cooldown} sec.`),
    's2-light': said({ skill: { index: 1, cost: -1 } }, ({ skill }) => `Mana cost is reduced by ${-skill.cost}.`),
    's2-dark': { words: `Increases ATK Boost by ${pct(PERKS.thunder)} during God of Lightning state.` },
    's3-light': said({ skill: { index: 2, dmg: 1.4 } }, ({ skill }) => `DMG is increased by ${pct(skill.dmg - 1)}.`),
    's3-dark': { words: `Stun duration is increased by ${PERKS.stun} sec.` },
    's4-light': { words: `DMG is increased by ${pct(PERKS.jane.dmg - 1)}.` },
    's4-dark': { words: `Stun duration is increased by ${PERKS.jane.stun} sec.` },
    't5-light': t5Light({ crit: 100 }, ({ crit }) => `Crit Chance +${crit}`),
    't5-dark': { words: `At full Mana, increases ATK by ${pct(PERKS.dark.atk)} for ${PERKS.dark.lasts} sec. This effect only activates once every ${PERKS.dark.every} sec.` },
  },
  join(fight, self) {
    /** Final Crash's crit DMG stacks, and how long they last yet; how long the God of Lightning state lasts yet; Transcend 5's Dark's wait; his unique weapon's Lightning, and how long Lightning Bolt, Legios lasts yet. */
    let crashed = 0;
    let crashLeft = 0;
    let god = 0;
    let surge = 0;
    let lightning = 0;
    let legios = 0;
    const tier = self.unique?.tier ?? null;
    const starts = attackStarts('theo');
    // (God of Lightning's ATK: a share of his own, as the fight begins; its Dark's ATK Boost added to its books', as King's Raid adds them.)
    const godAtk = (THUNDER.atk * (THUNDER.books + (self.perks.has('s2-dark') ? PERKS.thunder : 0))) / self.stats.atk;
    // (Another Funeral Doll: quicker for a while as the fight begins.)
    if (wearsTreasure(self, 3)) put(self.statuses, { name: DOLL.name, left: UT.doll.lasts, speed: UT.doll.speed, shown: DOLL });

    /** For Jane's chance, for now. */
    const janeChance = (): number =>
      JANE.chance + (god > 0 ? THUNDER.chance + fromTreasure(self, 1, UT.necklace.chance) : 0) + fromTreasure(self, 3, UT.doll.chance);

    return {
      lands: {
        // His attack: a blow; and on each part of it, now and then For Jane's blow more (its Light: harder; its Dark: a longer stun).
        attack(part) {
          fight.hit(self, fight.basic);
          if (!starts.has(part) || fight.roll() >= janeChance()) return;
          fight.hit(self, JANE.blow * (self.perks.has('s4-light') ? PERKS.jane.dmg : 1));
          fight.stun(JANE.stun + (self.perks.has('s4-dark') ? PERKS.jane.stun : 0), { by: self });
        },
        // Each critical blow raises his crit DMG, and may deal a blow more that stuns the boss a moment. Fur Decoration of
        // Sable: each blow may take what helps the boss off it (what has it deal more).
        crash() {
          const critical = fight.hit(self, CRASH.blow);
          const sable = fromTreasure(self, 0, UT.sable.chance);
          if (sable > 0 && fight.roll() < sable) {
            const { statuses } = fight.foe;
            for (let i = statuses.length - 1; i >= 0; i--) if ((statuses[i]?.deals ?? 1) > 1) statuses.splice(i, 1);
          }
          if (!critical) return;
          crashed = Math.min(CRASH.most, crashed + 1);
          crashLeft = CRASH.lasts;
          put(self.statuses, { name: CRASHING.name, left: CRASH.lasts, count: crashed, critDamage: CRASH.critDamage * crashed, shown: CRASHING });
          if (fight.roll() < CRASH.chance) {
            fight.hit(self, CRASH.more);
            fight.stun(CRASH.stun, { by: self });
          }
        },
        // The spear: the boss knocked down, and taking more magic damage for a while.
        thunder() {
          fight.hit(self, THUNDER.blow);
          fight.stun(THUNDER.down, { down: true, by: self });
          put(fight.foe.statuses, { name: GOD.name, left: THUNDER.marked, takes: { magical: THUNDER.takes }, shown: 'curse' });
        },
        // Five blows, the first stunning the boss (its Dark: longer); with Essence of Red Lightning, each a blow more.
        explosion(part) {
          fight.hit(self, EXPLOSION.blow);
          const essence = fromTreasure(self, 2, UT.essence.blow);
          if (essence > 0) fight.hit(self, essence * 1000, false);
          if (part === 0) fight.stun(EXPLOSION.stun + (self.perks.has('s3-dark') ? PERKS.stun : 0), { by: self });
        },
      },
      used(index) {
        if (index !== 1) return;
        // God of Lightning: the state (its Dark: its ATK twice over, godAtk; God of Lightning's Necklace: quicker meanwhile).
        god = THUNDER.lasts;
        const necklace = wearsTreasure(self, 1) ? { speed: UT.necklace.speed } : {};
        put(self.statuses, { name: GOD.name, left: THUNDER.lasts, atk: godAtk, ...necklace, shown: GOD });
      },
      // His unique weapon: each blow of his a stack of Lightning (none while Legios is on); at 50, Lightning Bolt, Legios.
      blow() {
        if (tier === null || legios > 0) return;
        lightning++;
        if (lightning < LEGIOS.stacks) return;
        lightning = 0;
        legios = LEGIOS.lasts;
        put(self.statuses, { name: LEGIOS_UP.name, left: LEGIOS.lasts, speed: atTier(LEGIOS.speed, tier), critDamage: atTier(LEGIOS.critDamage, tier), pen: atTier(LEGIOS.pen, tier), shown: LEGIOS_UP });
      },
      tick(dt) {
        if (god > 0) god -= dt;
        if (legios > 0) legios -= dt;
        if (crashLeft > 0) {
          crashLeft -= dt;
          if (crashLeft <= 0) crashed = 0;
        }
        // Transcend 5's Dark: his mana full, his ATK higher for a while, no more often than so many seconds.
        if (surge > 0) surge -= dt;
        if (self.perks.has('t5-dark') && surge <= 0 && self.mana >= MAX_MANA) {
          surge = PERKS.dark.every;
          put(self.statuses, { name: FULL.name, left: PERKS.dark.lasts, atk: PERKS.dark.atk, shown: FULL });
        }
      },
      lit: () => god > 0,
      buffs: () => (tier !== null && legios <= 0 ? [{ ...LEGIOS_UP, name: 'Lightning', about: `At ${LEGIOS.stacks}: Lightning Bolt, Legios.`, count: lightning }] : []),
    };
  },
};
