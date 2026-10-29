import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { pct, skillArt, type Buff } from '../shown';
import { atTier, ROBURU } from '../unique';
import { bookDmg, CLASS_STATS, dmg, type HeroDef, indexed, type Passive } from './kit';
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
 * leaves it taking more magic damage for a while.
 * What is drawn for each is ../../heroes/lorraine/fx.ts; what her body does for each, and for her attack, ../../heroes/lorraine/moves.ts.
 *
 * Her own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy), though her
 * skills are still the older ones: live King's Raid's Lorraine has Seed of Belladonna where Tangled Vine is and Poison
 * where Blade Leaf is, and their perks and treasures are on these. Thornbush Forest's Light and Deadly Belladonna's
 * drain take mana the boss hasn't: they do nothing here. Tangled Vine's Light makes its blow after harder too; its Dark
 * has only her own CC on the boss last longer (the vine's shackle, the forest's knockdown), as no other hero's can be from
 * here. Blade Leaf's (Poison's) Dark is against the boss, not a minion.
 */
// (How hard each of her skills hits is the King's Raid Index's, at her class's ATK: ./kit.ts's indexed.)
// (As many blows as its move has.)
const THORNS = { hits: CODED.thornbush.lands.length, blow: indexed('wizard', 243_273) / CODED.thornbush.lands.length };
const VINE = { blow: indexed('wizard', 208_671), poison: 2, shackle: 4, after: 2, each: indexed('wizard', 208_671) / 2 };
const WRATH = { blow: indexed('wizard', 359_928), down: 3, more: 0.2 };
const LEAF = { chance: 0.3, times: 3, blow: indexed('wizard', 50_538) };
/** The most Poison on the boss, how long it lasts once the last was left, how hard each eats at it every second, and what each takes off the boss's heals. */
const POISON = { most: 5, lasts: 20, each: indexed('wizard', 271_720) / 20, every: 1, heals: 0.1 };
/**
 * Her own perks' numbers: Tangled Vine's more DMG, and its CC on the boss longer (how much, how long); the boss's ATK lower
 * for each Poison; her Poison's DMG on a boss; and Transcend 5's Dark's, as each battle begins: her skills' cooldowns
 * shorter (a share of each), and her DMG higher for a while (each stack's, the most stacks).
 */
const PERKS = { vine: 1.4, longer: { cc: 0.3, lasts: 5 }, weaker: 0.05, boss: 3, dark: { cooldown: 0.3, dmg: 0.2, lasts: 90, most: 5 } };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts): Thornbush Forest's DMG and shorter cooldown; Tangled Vine's
 * cheaper, the mana it would drain (the boss has none) and her own mana; Wrath of the Forest's DMG and, on a critical blow
 * at full Poison, the share off her skills' cooldowns; and her Poison's more M.DMG taken (as long as it is on).
 */
const UT = {
  book: { dmg: 0.5, cooldown: [1.2, 1.4, 1.7, 2.1, 2.5, 3] },
  belladonna: { cost: -1, drain: [200, 240, 290, 350, 420, 500], mana: [100, 120, 140, 170, 210, 250] },
  root: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], cooldown: 0.04, poison: 5 },
  terrarium: { takes: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25] },
};

const art = skillArt('lorraine');

const BLADE_LEAF: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Blade Leaf', about: `Passive. Her attack has a ${pct(LEAF.chance)} chance to send ${LEAF.times} leaves at the boss besides, each leaving a [Poison] on it (up to ${POISON.most}).`, icon: '🍃', art: art(3) },
  words: `When dealing a normal attack, attacks a random enemy ${LEAF.times} times with a ${pct(LEAF.chance)} chance of inflicting ${dmg('wizard', LEAF.blow, bookDmg('lorraine', 3))} M.DMG and 1 stack of Poison for ${POISON.lasts} seconds. Poison inflicts a total of ${dmg('wizard', POISON.each * POISON.lasts, bookDmg('lorraine', 3))} M.DMG over ${POISON.lasts} seconds, reduces Heal Rate, and can be stacked up to max ${POISON.most} times. If Lorraine dies, Poison effects on enemies will disappear.`,
};
/** What her skills leave on the boss; Terrarium of Circulation's, with it; and Tangled Vine's Dark's, CC on it longer. */
const POISONED = 'Poison';
const TERRARIUM = 'Terrarium of Circulation';
const HELD = 'Tangled Vine';
/** Transcend 5's Dark: what it gives her as each battle begins. */
const GROWTH: Buff = { name: 'Transcend 5 Dark', about: `DMG to the boss and its minions +${pct(PERKS.dark.dmg)} for each stack (up to ${PERKS.dark.most}).`, icon: '🌱', art: art(3) };

export const LORRAINE: HeroDef = {
  id: 'lorraine',
  name: 'Lorraine',
  class: 'wizard',
  skins: ['Lorraine', 'Lorraine_Christmas', 'Lorraine_School', 'Lorraine_Summer', 'Lorraine_Frozen', 'Lorraine_Summer19', 'Lorraine_Dessert'],
  // A wizard (her blows magical, as a wizard's are): as her class stands.
  stats: { ...CLASS_STATS.wizard, deals: 'magical' },
  abilities: [
    {
      name: 'Thornbush Forest',
      about: `${THORNS.hits} blows, each leaving a [Poison] on the boss (up to ${POISON.most}): each eats at it every second and leaves it healed ${pct(POISON.heals)} less.`,
      words: `Attacks ${THORNS.hits} times at random, dealing a total of ${dmg('wizard', THORNS.blow * THORNS.hits, bookDmg('lorraine', 0))} M.DMG to enemies in range and inflicting 1 stack of Poison with each attack.`,
      icon: '🌿',
      art: art(0),
      move: 'thornbush',
      cooldown: 7,
      cost: 2,
    },
    {
      name: 'Tangled Vine',
      about: `A blow that leaves ${VINE.poison} [Poison] and shackles the boss for ${VINE.shackle} seconds (it can do nothing); ${VINE.after} seconds after, a blow the harder for each [Poison] on it.`,
      words: `Deals ${dmg('wizard', VINE.blow, bookDmg('lorraine', 1))} M.DMG to enemies in a straight line, stacking ${VINE.poison} Poison and shackling them for ${VINE.shackle} sec. After some time, deals ${dmg('wizard', VINE.each, bookDmg('lorraine', 1))} M.DMG for each Poison stack.`,
      icon: '🪢',
      art: art(1),
      move: 'vine',
      cooldown: 10,
      cost: 3,
    },
    {
      name: 'Wrath of the Forest',
      about: `A blow that knocks the boss down for ${WRATH.down} seconds, ${pct(WRATH.more)} harder for each [Poison] on it.`,
      words: `Deals ${dmg('wizard', WRATH.blow, bookDmg('lorraine', 2))} M.DMG to enemies in range and knocks them down for ${WRATH.down} sec. Enemies inflicted by Poison takes ${pct(WRATH.more)} more DMG per every stack.`,
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
      words: `[Thornbush Forest] Increases DMG by ${pct(UT.book.dmg)} and reduces Cooldown by ${k(UT.book.cooldown)} sec.`,
      skill: { index: 0, dmg: 1 + UT.book.dmg, cooldown: -k(UT.book.cooldown) },
    })),
    treasure('Deadly Belladonna', (k) => ({
      words: `[Tangled Vine] Reduces Mana Cost by ${-UT.belladonna.cost}, Mana of hit enemies by ${k(UT.belladonna.drain)}, and recovers own Mana by ${k(UT.belladonna.mana)}.`,
      skill: { index: 1, cost: UT.belladonna.cost, mana: k(UT.belladonna.mana) },
    })),
    treasure('Root of the World Tree', (k) => ({
      words: `[Wrath of the Forest] Increases DMG by ${pct(k(UT.root.dmg))}. Upon a Crit Hit on enemies with ${UT.root.poison} or more stacks of Poison, reduces Cooldown by ${pct(UT.root.cooldown)}.`,
      skill: { index: 2, dmg: 1 + k(UT.root.dmg) },
    })),
    treasure('Terrarium of Circulation', (k) => ({
      words: `[Blade Leaf] Poison effect becomes irremovable and for the duration of Poison, target takes ${pct(k(UT.terrarium.takes))} increased M.DMG.`,
    })),
  ],
  perks: {
    's1-light': { words: 'Reduces Mana of the hit target by 250. If the target is a boss, reduces Mana by 500.' },
    's1-dark': said({ skill: { index: 0, critMana: 250 } }, ({ skill }) => `Recovers ${skill.critMana} Mana upon Critical Hit.`),
    's2-light': said({ skill: { index: 1, dmg: PERKS.vine } }, ({ skill }) => `Increases DMG by ${pct(skill.dmg - 1)}.`),
    's2-dark': { words: `Increases the duration of the CC inflicted upon hit enemies by ${pct(PERKS.longer.cc)} for ${PERKS.longer.lasts} sec.` },
    's3-light': said({ skill: { index: 2, cost: 1, dmg: 2 } }, ({ skill }) => `Mana cost is increased by ${skill.cost} orb but DMG is boosted by ${pct(skill.dmg - 1)}.`),
    's3-dark': said({ skill: { index: 2, cost: 1, dispel: true } }, ({ skill }) => `Increases Mana Cost by ${skill.cost} and dispels positive effects of enemies within range.`),
    's4-light': { words: `Reduces target's ATK by ${pct(PERKS.weaker)} per stack of Poison.` },
    's4-dark': { words: `If the target is a boss, increases DMG of Poison by x${PERKS.boss}.` },
    't5-light': t5Light({ crit: 100 }, ({ crit }) => `Crit Chance +${crit}`),
    't5-dark': {
      words: `At the beginning of each battle, immediately reduces self's Cooldown of all active Skills by ${pct(PERKS.dark.cooldown)} and increases DMG dealt to Non-Hero enemies by ${pct(PERKS.dark.dmg)} for ${PERKS.dark.lasts} sec. DMG Boost effect can be stacked up to max ${PERKS.dark.most} times and is irremovable.`,
    },
  },
  attack: 'lash',
  join(fight, self) {
    /** How long until Tangled Vine's blow after (0: none coming); toward her Poison's next bite; and toward her unique weapon's next blow. */
    let vine = 0;
    let bitten = 0;
    let roburu = 0;
    const tier = self.unique?.tier ?? null;
    /** The battle Transcend 5's Dark was last given for (0: none yet). */
    let wave = 0;

    /** How many Poison are on the boss. */
    const poisons = (): number => fight.foe.statuses.find((status) => status.name === POISONED)?.count ?? 0;
    /**
     * So many more Poison on the boss (up to the most), all of it begun again: what heals it heals it less for each (and
     * with Blade Leaf's Light, its ATK lower for each). Terrarium of Circulation: more M.DMG taken, as long as it.
     */
    const poison = (count: number): void => {
      const stacks = Math.min(POISON.most, poisons() + count);
      put(fight.foe.statuses, { name: POISONED, left: POISON.lasts, count: stacks, heals: Math.max(0, 1 - POISON.heals * stacks), ...(self.perks.has('s4-light') && { deals: 1 - PERKS.weaker * stacks }), shown: 'venom' });
      const terrarium = fromTreasure(self, 3, UT.terrarium.takes);
      if (terrarium > 0) put(fight.foe.statuses, { name: TERRARIUM, left: POISON.lasts, takes: { magical: 1 + terrarium }, shown: 'venom' });
    };
    /** Her CC on the boss, so many seconds of it: longer while Tangled Vine's Dark is on it. */
    const held = (seconds: number): number => seconds * (fight.foe.statuses.some((status) => status.name === HELD) ? 1 + PERKS.longer.cc : 1);
    /** The Lorraines in the fight (there may be two: it is the same Poison), and whether any is standing. */
    const lorraines = () => fight.fighters.filter((one) => one.id === self.id);

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
        },
        // Each of three blows leaves a Poison.
        thornbush() {
          fight.hit(self, THORNS.blow);
          poison(1);
        },
        // The vine: a blow, 2 Poison, and the boss shackled (as a stun: it can do nothing); its blow after comes in a moment.
        // (Its Dark: CC on the boss longer for a while, this shackle with it.)
        vine() {
          fight.hit(self, VINE.blow);
          poison(VINE.poison);
          if (self.perks.has('s2-dark')) put(fight.foe.statuses, { name: HELD, left: PERKS.longer.lasts, shown: 'curse' });
          fight.stun(held(VINE.shackle), { by: self });
          vine = VINE.after;
        },
        // The forest bursts up under the boss, harder for each Poison on it: it is knocked down.
        wrath() {
          const critical = fight.hit(self, WRATH.blow * (1 + WRATH.more * poisons()));
          // (Root of the World Tree: a critical blow on the boss at full Poison takes a share off her skills' cooldowns.)
          if (critical && wearsTreasure(self, 2) && poisons() >= UT.root.poison) {
            self.abilities.forEach((ability, i) => {
              self.cooldowns[i] = Math.max(0, (self.cooldowns[i] as number) - ability.cooldown * UT.root.cooldown);
            });
          }
          fight.stun(held(WRATH.down), { down: true, by: self });
        },
      },
      tick(dt) {
        // Tangled Vine's blow after, the harder for each Poison on the boss.
        if (vine > 0) {
          vine -= dt;
          if (vine <= 0) {
            fight.cue(self, 'vine');
            fight.hit(self, VINE.each * poisons() * (self.perks.has('s2-light') ? PERKS.vine : 1), false);
          }
        }
        // Transcend 5's Dark: as each battle begins, her skills' cooldowns shorter, and a stack more of her DMG higher for a while.
        if (self.perks.has('t5-dark') && fight.wave !== wave && fight.field.includes(self) && self.hp > 0) {
          wave = fight.wave;
          self.abilities.forEach((ability, i) => {
            self.cooldowns[i] = Math.max(0, (self.cooldowns[i] as number) - ability.cooldown * PERKS.dark.cooldown);
          });
          const stacks = Math.min(PERKS.dark.most, (self.statuses.find((status) => status.name === GROWTH.name)?.count ?? 0) + 1);
          put(self.statuses, { name: GROWTH.name, left: PERKS.dark.lasts, count: stacks, deals: 1 + PERKS.dark.dmg * stacks, shown: GROWTH });
        }
        const count = poisons();
        // With no Lorraine standing, her Poison is gone (and Terrarium of Circulation's with it).
        if (count > 0 && lorraines().every((one) => one.hp <= 0)) {
          for (const name of [POISONED, TERRARIUM]) {
            const at = fight.foe.statuses.findIndex((status) => status.name === name);
            if (at >= 0) fight.foe.statuses.splice(at, 1);
          }
          return;
        }
        // Her unique weapon: every 7 seconds, with the boss poisoned, a blow that leaves its M.DEF lower and it taking more magic damage for a while.
        if (tier !== null && self.hp > 0) {
          roburu += dt;
          if (roburu >= ROBURU.every) {
            roburu -= ROBURU.every;
            if (count > 0) {
              fight.cue(self, 'roburu');
              fight.hit(self, atTier(ROBURU.blow, tier), false);
              put(fight.foe.statuses, { name: ROBURU.name, left: ROBURU.lasts, defends: { magical: 1 - atTier(ROBURU.defense, tier) }, takes: { magical: 1 + atTier(ROBURU.takes, tier) }, shown: 'curse' });
            }
          }
        }
        // Her Poison eats at the boss every second (the first Lorraine's, where there are two), each stack of it a blow of its own (counted as one).
        // (Blade Leaf's Dark: three times as hard on a boss.)
        if (count <= 0 || lorraines()[0] !== self) {
          bitten = 0;
          return;
        }
        bitten += dt;
        if (bitten >= POISON.every) {
          bitten -= POISON.every;
          fight.hit(self, POISON.each * count * (self.perks.has('s4-dark') && fight.foe === fight.boss ? PERKS.boss : 1), false);
        }
      },
      lit: () => poisons() >= POISON.most,
    };
  },
};
