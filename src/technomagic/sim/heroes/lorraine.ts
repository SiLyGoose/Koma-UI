import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, treasureTier } from '../treasures';
import { pct, skillArt } from '../shown';
import { atTier, ROBURU } from '../unique';
import { CLASS_STATS, dmg, indexed, type HeroDef, type Passive } from './kit';
import { CODED } from './moves';

/*
 * Lorraine's skills, as the game has them (what each costs, how long before it can be used again, how long what it
 * does lasts, and the shares are the game's; how hard each hits and how hard her Poison burns are not said there,
 * nor how much less it leaves the boss healed). Her Poison is on the boss: up to 5 stacked, each eating at it every
 * second and leaving it healed less, all of it begun again with each more, and gone once no Lorraine is standing.
 * - Thornbush Forest: three blows, each leaving a Poison.
 * - Tangled Vine: a blow that leaves 2 Poison and shackles the boss (it can do nothing for a while); a little after,
 *   a blow the harder for each Poison on it.
 * - Wrath of the Forest: a blow that knocks the boss down, harder for each Poison on it.
 * Her passive, Blade Leaf: now and then her attack sends three leaves at the boss besides, each leaving a Poison.
 * Her unique weapon (../unique.ts) is worked here too: every 7 seconds, with the boss poisoned, a blow that
 * leaves it taking more magical damage for a while.
 * What is drawn for each is ../../heroes/lorraine/fx.ts; what her body does for each, and for her attack, ../../heroes/lorraine/moves.ts.
 *
 * Her own perks (../perks.ts) are King's Raid's, a shackle a stun as Tangled Vine's is. Wrath of the Forest's Dark does
 * nothing here: there is nothing on the boss to dispel. Blade Leaf's Dark is for the leaves, its hit enemies; Tangled
 * Vine's Light makes its blow after harder too, and its Dark has that (its final explosion) stun.
 */
// (How hard each of her skills hits is the King's Raid Index's, at her class's ATK: ./kit.ts's indexed.)
// (As many blows as its move has.)
const THORNS = { hits: CODED.thornbush.lands.length, blow: indexed('wizard', 243_273) / CODED.thornbush.lands.length };
const VINE = { blow: indexed('wizard', 208_671), poison: 2, shackle: 4, after: 2, each: indexed('wizard', 208_671) / 2 };
const WRATH = { blow: indexed('wizard', 359_928), down: 3, more: 0.2 };
const LEAF = { chance: 0.3, times: 3, blow: indexed('wizard', 50_538) };
/** The most Poison on the boss, how long it lasts once the last was left, how hard each eats at it every second, and what each takes off the boss's heals. */
const POISON = { most: 5, lasts: 20, each: indexed('wizard', 271_720) / 20, every: 1, heals: 0.1 };
/** Her own perks' numbers: Thornbush Forest's shackle at full Poison, Tangled Vine's more DMG and its stun after, more Poison at most, Blade Leaf's shackle (its chance), and Transcend 5's Dark's Thornbush Forest (how often, its chance). */
const PERKS = { hits: 1, full: 5, shackle: 3, vine: 1.4, after: 2, most: 6, leaf: { chance: 0.2, shackle: 2 }, forest: { every: 5, chance: 0.3 } };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts): Thornbush Forest's DMG and shorter cooldown; Tangled Vine's
 * cheaper, the mana it would drain (the boss has none) and her own mana; Wrath of the Forest's DMG and, on a critical blow
 * at full Poison, the share off her skills' cooldowns; and Blade Leaf's more M.DMG taken (as long as its Poison).
 */
const UT = {
  book: { dmg: 0.5, cooldown: [1.4, 1.7, 2.1, 2.5, 3] },
  belladonna: { cost: -1, drain: [240, 290, 350, 420, 500], mana: [120, 140, 170, 210, 250] },
  root: { dmg: [0.24, 0.29, 0.35, 0.42, 0.5], cooldown: 0.04, poison: 5 },
  terrarium: { takes: [0.12, 0.14, 0.17, 0.21, 0.25] },
};

const art = skillArt('lorraine');

const BLADE_LEAF: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Blade Leaf', about: `Passive. Her attack has a ${pct(LEAF.chance)} chance to send ${LEAF.times} leaves at the boss besides, each leaving a [Poison] on it (up to ${POISON.most}).`, icon: '🍃', art: art(3) },
  words: `When dealing a normal attack, attacks a random enemy ${LEAF.times} times with a ${pct(LEAF.chance)} chance of inflicting ${dmg('wizard', LEAF.blow)} M.DMG and 1 stack of Poison for ${POISON.lasts} seconds. Poison inflicts a total of ${dmg('wizard', POISON.each * POISON.lasts)} M.DMG over ${POISON.lasts} seconds, reduces Heal Rate, and can be stacked up to max ${POISON.most} times. If Lorraine dies, Poison effects on enemies will disappear.`,
};
/** What her skills leave on the boss. */
const POISONED = 'Poison';

export const LORRAINE: HeroDef = {
  id: 'lorraine',
  name: 'Lorraine',
  class: 'wizard',
  skins: ['Lorraine', 'Lorraine_Christmas'],
  // A wizard (her blows magical, as a wizard's are): as her class stands.
  stats: { ...CLASS_STATS.wizard, deals: 'magical' },
  abilities: [
    {
      name: 'Thornbush Forest',
      about: `${THORNS.hits} blows, each leaving a [Poison] on the boss (up to ${POISON.most}): each eats at it every second and leaves it healed ${pct(POISON.heals)} less.`,
      words: `Attacks ${THORNS.hits} times at random, dealing a total of ${dmg('wizard', THORNS.blow * THORNS.hits)} M.DMG to enemies in range and inflicting 1 stack of Poison with each attack.`,
      icon: '🌿',
      art: art(0),
      move: 'thornbush',
      cooldown: 7,
      cost: 2,
    },
    {
      name: 'Tangled Vine',
      about: `A blow that leaves ${VINE.poison} [Poison] and shackles the boss for ${VINE.shackle} seconds (it can do nothing); ${VINE.after} seconds after, a blow the harder for each [Poison] on it.`,
      words: `Deals ${dmg('wizard', VINE.blow)} M.DMG to enemies in a straight line, stacking ${VINE.poison} Poison and shackling them for ${VINE.shackle} sec. After some time, deals ${dmg('wizard', VINE.each)} M.DMG for each Poison stack.`,
      icon: '🪢',
      art: art(1),
      move: 'vine',
      cooldown: 10,
      cost: 3,
    },
    {
      name: 'Wrath of the Forest',
      about: `A blow that knocks the boss down for ${WRATH.down} seconds, ${pct(WRATH.more)} harder for each [Poison] on it.`,
      words: `Deals ${dmg('wizard', WRATH.blow)} M.DMG to enemies in range and knocks them down for ${WRATH.down} sec. Enemies inflicted by Poison takes ${pct(WRATH.more)} more DMG per every stack.`,
      icon: '🌳',
      art: art(2),
      move: 'wrath',
      cooldown: 23,
      cost: 3,
    },
  ],
  passive: BLADE_LEAF,
  treasures: [
    treasure('Book of Life', (k) => ({
      words: `[Thornbush Forest] DMG is increased by ${pct(UT.book.dmg)} and Cooldown is reduced by ${k(UT.book.cooldown)} sec.`,
      skill: { index: 0, dmg: 1 + UT.book.dmg, cooldown: -k(UT.book.cooldown) },
    })),
    treasure('Deadly Belladonna', (k) => ({
      words: `[Tangled Vine] Reduces Mana Cost by ${-UT.belladonna.cost} and drains ${k(UT.belladonna.drain)} MP from the affected enemy that took the DMG, and recovers own Mana by ${k(UT.belladonna.mana)}.`,
      skill: { index: 1, cost: UT.belladonna.cost, mana: k(UT.belladonna.mana) },
    })),
    treasure('Root of the World Tree', (k) => ({
      words: `[Wrath of the Forest] DMG is increased by ${pct(k(UT.root.dmg))}. Upon Crit Hit on enemies with over ${UT.root.poison} stacks of Poison, skill cooldown is reduced by ${pct(UT.root.cooldown)}.`,
      skill: { index: 2, dmg: 1 + k(UT.root.dmg) },
    })),
    treasure('Terrarium of Circulation', (k) => ({
      words: `[Blade Leaf] Posion effect will become irremovable, and increases M.DMG the target takes by ${pct(k(UT.terrarium.takes))} for the duration of the skill.`,
    })),
  ],
  perks: {
    's1-light': { words: `Hit count is increased by ${PERKS.hits}.` },
    's1-dark': { words: `Enemies with ${PERKS.full} or more stacks of Poison are shackled for ${PERKS.shackle} sec upon hit.` },
    's2-light': said({ skill: { index: 1, dmg: PERKS.vine } }, ({ skill }) => `DMG is increased by ${pct(skill.dmg - 1)}.`),
    's2-dark': { words: `Enemies hit by the final explosion effect are stunned for ${PERKS.after} sec.` },
    's3-light': said({ skill: { index: 2, cost: 1, dmg: 2 } }, ({ skill }) => `Mana cost is increased by ${skill.cost} orb but DMG is boosted by ${pct(skill.dmg - 1)}.`),
    's3-dark': { words: 'Enemies with 5 or more stacks of Poison lose their positive effects.' },
    's4-light': { words: `Poison stack maximum is changed to ${PERKS.most}.` },
    's4-dark': { words: `There is a ${pct(PERKS.leaf.chance)} chance that hit enemies are shackled for ${PERKS.leaf.shackle} sec.` },
    't5-light': t5Light({ crit: 100 }, ({ crit }) => `Crit Chance +${crit}`),
    't5-dark': { words: `Every ${PERKS.forest.every} sec, targets all enemies and attacks with 'Thornbush Forest' with ${pct(PERKS.forest.chance)} chance on each enemy.` },
  },
  attack: 'lash',
  join(fight, self) {
    /** How long until Tangled Vine's blow after (0: none coming); toward her Poison's next bite; and toward her unique weapon's next blow. */
    let vine = 0;
    let bitten = 0;
    let roburu = 0;
    const tier = self.unique?.tier ?? null;
    /** Her perks: the most Poison there can be (Blade Leaf's Light); and toward Transcend 5's Dark's next Thornbush Forest. */
    const most = self.perks.has('s4-light') ? PERKS.most : POISON.most;
    let forest = 0;

    /** How many Poison are on the boss. */
    const poisons = (): number => fight.foe.statuses.find((status) => status.name === POISONED)?.count ?? 0;
    /** So many more Poison on the boss (up to the most), all of it begun again: what heals it heals it less for each. */
    const poison = (count: number): void => {
      const stacks = Math.min(most, poisons() + count);
      put(fight.foe.statuses, { name: POISONED, left: POISON.lasts, count: stacks, heals: Math.max(0, 1 - POISON.heals * stacks), shown: 'venom' });
    };
    /** The Lorraines in the fight (there may be two: it is the same Poison), and whether any is standing. */
    const lorraines = () => fight.fighters.filter((one) => one.id === self.id);
    /** A blow of Thornbush Forest: a Poison (and with its Dark, at full Poison, the boss shackled). */
    const thorn = (): void => {
      fight.hit(self, THORNS.blow);
      poison(1);
      if (self.perks.has('s1-dark') && poisons() >= PERKS.full) fight.stun(PERKS.shackle, { by: self });
    };

    return {
      lands: {
        // Her attack: a thorn at the boss; now and then three leaves besides, each leaving a Poison.
        lash() {
          if (fight.roll() >= LEAF.chance) {
            fight.hit(self, fight.basic);
            return;
          }
          fight.cue(self, 'leaf');
          fight.hit(self, fight.basic + LEAF.blow * LEAF.times);
          poison(LEAF.times);
          // (Terrarium of Circulation: more M.DMG taken, as long as its Poison.)
          const terrarium = fromTreasure(self, 3, UT.terrarium.takes);
          if (terrarium > 0) put(fight.foe.statuses, { name: 'Terrarium of Circulation', left: POISON.lasts, takes: { magical: 1 + terrarium }, shown: 'venom' });
          // (Its Dark: now and then the boss shackled.)
          if (self.perks.has('s4-dark') && fight.roll() < PERKS.leaf.chance) fight.stun(PERKS.leaf.shackle, { by: self });
        },
        // Each of three blows leaves a Poison (its Light: a fourth, with the third).
        thornbush(part) {
          thorn();
          if (part === THORNS.hits - 1 && self.perks.has('s1-light')) for (let i = 0; i < PERKS.hits; i++) thorn();
        },
        // The vine: a blow, 2 Poison, and the boss shackled (as a stun: it can do nothing); its blow after comes in a moment.
        vine() {
          fight.hit(self, VINE.blow);
          poison(VINE.poison);
          fight.stun(VINE.shackle, { by: self });
          vine = VINE.after;
        },
        // The forest bursts up under the boss, harder for each Poison on it: it is knocked down.
        wrath() {
          const critical = fight.hit(self, WRATH.blow * (1 + WRATH.more * poisons()));
          // (Root of the World Tree: a critical blow on the boss at full Poison takes a share off her skills' cooldowns.)
          if (critical && treasureTier(self, 2) > 0 && poisons() >= UT.root.poison) {
            self.abilities.forEach((ability, i) => {
              self.cooldowns[i] = Math.max(0, (self.cooldowns[i] as number) - ability.cooldown * UT.root.cooldown);
            });
          }
          fight.stun(WRATH.down, { down: true, by: self });
        },
      },
      tick(dt) {
        // Tangled Vine's blow after, the harder for each Poison on the boss.
        if (vine > 0) {
          vine -= dt;
          if (vine <= 0) {
            fight.cue(self, 'vine');
            fight.hit(self, VINE.each * poisons() * (self.perks.has('s2-light') ? PERKS.vine : 1), false);
            if (self.perks.has('s2-dark')) fight.stun(PERKS.after, { by: self });
          }
        }
        const count = poisons();
        // With no Lorraine standing, her Poison is gone.
        if (count > 0 && lorraines().every((one) => one.hp <= 0)) {
          fight.foe.statuses.splice(fight.foe.statuses.findIndex((status) => status.name === POISONED), 1);
          return;
        }
        // Her unique weapon: every 7 seconds, with the boss poisoned, a blow that leaves it taking more magical damage for a while.
        if (tier !== null && self.hp > 0) {
          roburu += dt;
          if (roburu >= ROBURU.every) {
            roburu -= ROBURU.every;
            if (count > 0) {
              fight.cue(self, 'roburu');
              fight.hit(self, atTier(ROBURU.blow, tier), false);
              put(fight.foe.statuses, { name: ROBURU.name, left: ROBURU.lasts, takes: { magical: 1 + atTier(ROBURU.takes, tier) }, shown: 'curse' });
            }
          }
        }
        // Transcend 5's Dark: every so often, now and then a Thornbush Forest of her own.
        if (self.perks.has('t5-dark') && self.hp > 0 && fight.field.includes(self)) {
          forest += dt;
          if (forest >= PERKS.forest.every) {
            forest -= PERKS.forest.every;
            if (fight.roll() < PERKS.forest.chance) {
              fight.cue(self, 'thornbush');
              for (let i = 0; i < THORNS.hits; i++) thorn();
            }
          }
        }
        // Her Poison eats at the boss every second (the first Lorraine's, where there are two), each stack of it a blow of its own (counted as one).
        if (count <= 0 || lorraines()[0] !== self) {
          bitten = 0;
          return;
        }
        bitten += dt;
        if (bitten >= POISON.every) {
          bitten -= POISON.every;
          fight.hit(self, POISON.each * count, false);
        }
      },
      lit: () => poisons() >= most,
    };
  },
};
