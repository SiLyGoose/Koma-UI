import { POINTS } from '../combat/damage';
import { away, bolstering, defending, put } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { BLOW } from '../rules';
import { pct, seconds, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { atTier, CARPRAIN } from '../unique';
import { bookDmg, CLASS_STATS, dmg, type HeroDef, indexed, type Passive } from './kit';

/*
 * Morrah's skills, as the game has them (what each costs, how long before it can be used again, how long what it
 * does lasts, and the shares are the game's; how hard each hits, how long Flame lasts and how hard it burns are not
 * said there; how much M.DEF Hellfire gives is the King's Raid Index's, kingsraid.netlify.app). Her Flame is on the
 * boss: up to a hundred stacked, each burning it every second and taking a share off what heals it, all of it begun
 * again with each more.
 * - Burning Power: a blow that knocks the boss down and leaves 3 Flame on it; then for a while each blow of her
 *   attack deals more and leaves a Flame. Both are harder for each Flame on the boss.
 * - Hellfire: for a while every ally has more M.DEF and is likelier to block magic blows, and a Flame is left on the
 *   boss every second.
 * - Lava Eruption: a blow that knocks the boss down, harder for each Flame on it.
 * Her passive, Fire Smash: when she blocks, a blow back that leaves 3 Flame on the boss.
 * Her unique weapon (../unique.ts) is worked here too: now and then a blow of her attack leaves the boss
 * hitting less hard and taking more magic damage, the more with her Flame stacked full on it.
 * What is drawn for each is ../../heroes/morrah/fx.ts; what her body does for each, and for her attack, ../../heroes/morrah/moves.ts.
 *
 * Her own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Hellfire's
 * Dark deals DMG based on her M.DEF: every second while Hellfire lasts, a blow as hard as her M.DEF is then (Hellfire's
 * own among it), as the game measures a blow by ATK. Fire Smash's Dark counts 100 Flame or more. What Burning Power's
 * Light gives in attack speed is points of it, as gear's is; Hatchling Leather Gloves' DMG reduction is Tough (points).
 */
// (How hard each of her skills hits is the King's Raid Index's, at her class's ATK: ./kit.ts's indexed.)
const CLEAVE = { blow: BLOW, burning: indexed('knight', 11_763) };
const BURNING = { blow: indexed('knight', 58_356), flames: 3, down: 1, lasts: 15 };
// (Its M.DEF, added to each ally's, and its 250 M.Block (points), as the game has them.)
const HELLFIRE = { lasts: 20, defense: 6953, block: 250, every: 1 };
const ERUPTION = { blow: indexed('knight', 263_466), down: 3 };
const SMASH = { blow: indexed('knight', 35_664), flames: 3 };
/** The most Flame on the boss, how long it lasts once the last was left, how hard each burns every second, how much harder it makes her skills, and what each takes off the boss's heals. */
const FLAME = { most: 100, lasts: 10, each: 10, every: 1, more: 0.02, heals: 0.01 };
/**
 * Her own perks' numbers: Burning Power's attack speed (points), Hellfire's more M.Block and its blow every second (a
 * share of her M.DEF), Lava Eruption's heal (a share of what it dealt), Fire Smash's M.DEF for each block (most), the boss
 * taking more at full Flame, and Transcend 5's Dark's Flame.
 */
const PERKS = { quicker: 200, block: 1.2, scorch: 1, drain: 0.4, harder: { defense: 0.05, most: 10 }, full: 0.4, flame: { each: 2, most: 120 } };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts): Burning Power's DMG; Hellfire's Tough (points) and
 * M.Crit resist for a block of a magic blow while it lasts; Lava Eruption's DMG and less M.DEF on the boss; Fire Smash's
 * more Flame and slower boss (ATK Spd, points).
 */
const UT = {
  eye: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
  gloves: { less: [100, 120, 140, 170, 210, 250], critResist: 250 },
  stone: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], defends: 0.25, lasts: 7 },
  jewel: { flames: 3, speed: [140, 170, 210, 250, 300, 360], lasts: 5 },
};

const art = skillArt('morrah');

const FIRE_SMASH: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Fire Smash', about: `Passive. When she blocks she strikes back, leaving ${SMASH.flames} [Flame] on the boss.`, icon: '🔥', art: art(3) },
  words: `Upon Block, deals ${dmg('knight', SMASH.blow, bookDmg('morrah', 3))} M.DMG to enemies in range, and inflicts ${SMASH.flames} stack of Flame.`,
};
/** What Burning Power gives her for a while: shown beside her passive, with how long it has left. */
const BURNING_UP: Buff = { name: 'Burning Power', about: 'Each blow of her attack deals more and leaves a [Flame] on the boss.', icon: '🔥', art: art(0) };
/** What Hellfire gives every ally for a while: shown on each card, with how long it has left. */
const HELLFIRE_UP: Buff = { name: 'Hellfire', about: `+${HELLFIRE.defense} M.DEF, and +${HELLFIRE.block} M.Block.`, icon: '🌋', art: art(1) };
/** What her skills, and her unique weapon, leave on the boss. */
const FLAMED = 'Flame';
const SEARED = 'Searing Flame';
/** What her perks give her: Burning Power's Light's attack speed, and Fire Smash's Light's M.DEF. */
const QUICKENED: Buff = { name: 'Burning Power (speed)', about: 'Quicker.', icon: '🔥', art: art(0) };
const HARDENED: Buff = { name: 'Fire Smash (M.DEF)', about: `${pct(PERKS.harder.defense)} more M.DEF for each block (${PERKS.harder.most} at most).`, icon: '🔥', art: art(3) };

export const MORRAH: HeroDef = {
  id: 'morrah',
  name: 'Morrah',
  class: 'knight',
  skins: ['Morrah', 'Morrah_School', 'Morrah_Summer', 'Morrah_NewYear', 'Morrah_Wedding', 'Morrah_Halloween', 'Morrah_Summer20', 'Morrah_DailyLook'],
  // A knight whose blows are magical: as her class stands, otherwise (King's Raid's own; what makes her stand magic best
  // is Hellfire).
  stats: { ...CLASS_STATS.knight, deals: 'magical' },
  abilities: [
    {
      name: 'Burning Power',
      about: `A blow that knocks the boss down for ${seconds(BURNING.down)} and leaves ${BURNING.flames} [Flame] on it. Then for ${BURNING.lasts} seconds each blow of her attack deals more and leaves a [Flame]. Both are ${pct(FLAME.more)} harder for each [Flame] on the boss.`,
      words: `Deals ${dmg('knight', BURNING.blow, bookDmg('morrah', 0))} M.DMG to enemies in range and knocks them down, inflicting ${BURNING.flames} stacks of Flame. Then for ${BURNING.lasts} sec, each auto attack deals ${dmg('knight', CLEAVE.burning, bookDmg('morrah', 0))} M.DMG and inflicts 1 stack of Flame on enemy. Per each stacked Flame, DMG is increased by ${pct(FLAME.more)}. Each Flame stack deals separate ${dmg('knight', FLAME.each, bookDmg('morrah', 0))} M.DMG every second and reduces Heal rate by ${pct(FLAME.heals)}.`,
      icon: '🔥',
      art: art(0),
      move: 'burning',
      cooldown: 6,
      cost: 2,
    },
    {
      name: 'Hellfire',
      auto: { keeps: HELLFIRE_UP.name },
      about: `For ${HELLFIRE.lasts} seconds every ally has +${HELLFIRE.defense} M.DEF and +${HELLFIRE.block} M.Block, and a [Flame] is left on the boss every ${seconds(HELLFIRE.every)}.`,
      words: `For ${HELLFIRE.lasts} sec, all allies' M.DEF is increased by ${HELLFIRE.defense} and M.Block Chance is increased by ${HELLFIRE.block}. Additionally, every ${HELLFIRE.every} sec, inflicts 1 stack of Flame on nearby enemies.`,
      icon: '🌋',
      art: art(1),
      move: 'hellfire',
      cooldown: 12,
      cost: 3,
    },
    {
      name: 'Lava Eruption',
      about: `A blow that knocks the boss down for ${seconds(ERUPTION.down)}, ${pct(FLAME.more)} harder for each [Flame] on it.`,
      words: `Deals ${dmg('knight', ERUPTION.blow, bookDmg('morrah', 2))} M.DMG to enemies in range and inflict knock down. Per every stacked Flame, DMG is increased by ${pct(FLAME.more)}.`,
      icon: '☄️',
      art: art(2),
      move: 'eruption',
      cooldown: 20,
      cost: 3,
    },
  ],
  passive: FIRE_SMASH,
  treasures: [
    treasure('Hell’s Eye', (k) => ({
      words: `[Burning Power] Increases DMG by ${pct(k(UT.eye.dmg))}, and Flame stacked upon enemies become irremovable.`,
      skill: { index: 0, dmg: 1 + k(UT.eye.dmg) },
    })),
    treasure('Hatchling Leather Gloves', (k) => ({
      words: `[Hellfire] Upon blocking target's M.ATK during the skill's duration, DMG reduction is increased by ${k(UT.gloves.less)} and M.Crit resistance is increased by ${UT.gloves.critResist}.`,
    })),
    treasure('Hellish Sealing Stone', (k) => ({
      words: `[Lava Eruption] Increases DMG by ${pct(k(UT.stone.dmg))}, and reduces the target's M.DEF by ${pct(UT.stone.defends)} for ${UT.stone.lasts} sec.`,
      skill: { index: 2, dmg: 1 + k(UT.stone.dmg), mark: { name: 'Hellish Sealing Stone', defends: { magical: 1 - UT.stone.defends }, lasts: UT.stone.lasts } },
    })),
    treasure('Jewel of Inferno', (k) => ({
      words: `[Fire Smash] Increases the number of Flame stacks by ${UT.jewel.flames}. Hit targets have their ATK Spd reduced by ${k(UT.jewel.speed)} for ${UT.jewel.lasts} sec.`,
    })),
  ],
  perks: {
    's1-light': { words: `ATK Spd. is increased by ${PERKS.quicker} for ${BURNING.lasts} sec.` },
    's1-dark': said({ skill: { index: 0, cooldownShare: 0.94 } }, ({ skill }) => `Reduces cooldown by ${pct(1 - skill.cooldownShare)} per each enemy hit.`),
    's2-light': { words: `M.Block rate is boosted by ${pct(PERKS.block - 1)}.` },
    's2-dark': { words: 'While Hellfire is active, deal DMG based on own M.DEF to nearby enemies.' },
    's3-light': said({ skill: { index: 2, dmg: 1.4 } }, ({ skill }) => `DMG is increased by ${pct(skill.dmg - 1)}.`),
    's3-dark': { words: `Heals HP equal to ${pct(PERKS.drain)} of DMG dealt.` },
    's4-light': { words: `Increases own M.DEF by ${pct(PERKS.harder.defense)} per each block. Max stack is ${PERKS.harder.most}.` },
    's4-dark': { words: `Target with over ${FLAME.most} stacks of Flame takes ${pct(PERKS.full)} increased M.DMG.` },
    't5-light': t5Light({ blockMagical: 200 }, ({ blockMagical }) => `M. Block +${blockMagical}`),
    't5-dark': { words: `Flame stack DMG is increased by ${pct(PERKS.flame.each - 1)}, and max stack number is changed to ${PERKS.flame.most}.` },
  },
  attack: 'cleave',
  // Klaus’s slash (her animations are copies of his), timed as his is.
  timing: { attack: [{ lands: [0.68], until: 0.8 }] },
  join(fight, self) {
    /** How long Burning Power has her attack burning for yet; how long her Hellfire lasts yet, and toward its next Flame; and toward her Flame's next burn. */
    let burning = 0;
    let hellfire = 0;
    let fanned = 0;
    let burnt = 0;
    const tier = self.unique?.tier ?? null;
    /** Her perks: the most Flame there can be, and how hard each burns (Transcend 5's Dark); and her blocks counted for M.DEF (Fire Smash's Light). */
    const most = self.perks.has('t5-dark') ? PERKS.flame.most : FLAME.most;
    const each = FLAME.each * (self.perks.has('t5-dark') ? PERKS.flame.each : 1);
    let blocks = 0;

    /** How many Flame are on the boss. */
    const flames = (): number => fight.foe.statuses.find((status) => status.name === FLAMED)?.count ?? 0;
    /** So many more Flame on the boss (up to the most), all of it begun again: what heals it heals it less for each. */
    const burn = (count: number): void => {
      const stacks = Math.min(most, flames() + count);
      put(fight.foe.statuses, { name: FLAMED, left: FLAME.lasts, count: stacks, heals: Math.max(0, 1 - FLAME.heals * stacks), shown: 'burn' });
      // (Fire Smash's Dark: at full Flame, the boss takes more magic damage, as long as it.)
      if (self.perks.has('s4-dark') && stacks >= FLAME.most) put(fight.foe.statuses, { name: SEARED, left: FLAME.lasts, takes: { magical: 1 + PERKS.full }, shown: 'burn' });
    };
    /** How much harder her skills are for the Flame on the boss. */
    const fanning = (): number => 1 + FLAME.more * flames();
    /** Her allies on the field, standing and in the fight (her too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));

    /** A cut of her attack. With Burning Power, harder for its Flame, and leaving one more; with her unique weapon, now and then it hits less hard and takes more. */
    const cleave = (): void => {
      if (burning > 0) {
        fight.hit(self, fight.basic + CLEAVE.burning * fanning());
        burn(1);
      } else fight.hit(self, fight.basic);
      if (tier === null || fight.roll() >= CARPRAIN.chance) return;
      const weaker = atTier(CARPRAIN.weaker, tier);
      const takes = weaker * (flames() >= most ? CARPRAIN.full : 1);
      put(fight.foe.statuses, { name: CARPRAIN.name, left: CARPRAIN.lasts, deals: 1 - weaker, takes: { magical: 1 + takes }, shown: 'curse' });
    };

    return {
      lands: {
        // Her attack: a cut across the boss one way and then the other, as written in code; or Klaus's slash, as his rig has it.
        cleave,
        attack: cleave,
        // Down on the boss, harder for its Flame: it is knocked down, and 3 more Flame; her attack burns for a while.
        burning() {
          fight.hit(self, BURNING.blow * fanning());
          fight.stun(BURNING.down, { down: true, by: self });
          burn(BURNING.flames);
          burning = BURNING.lasts;
          if (self.perks.has('s1-light')) put(self.statuses, { name: QUICKENED.name, left: BURNING.lasts, speed: PERKS.quicker, shown: QUICKENED });
        },
        // The fire goes up round every ally: more M.DEF and M.Block for a while, and a Flame on the boss every second meanwhile.
        hellfire() {
          const on = allies();
          fight.cue(self, 'hellfire', on);
          for (const ally of on) {
            put(ally.statuses, { name: HELLFIRE_UP.name, left: HELLFIRE.lasts, bolsters: { magical: HELLFIRE.defense }, blocks: { magical: HELLFIRE.block * (self.perks.has('s2-light') ? PERKS.block : 1) }, shown: HELLFIRE_UP });
          }
          hellfire = HELLFIRE.lasts;
          fanned = 0;
        },
        // The lava bursts up under the boss, harder for its Flame: it is knocked down.
        eruption() {
          const before = fight.foe.hp;
          fight.hit(self, ERUPTION.blow * fanning());
          fight.stun(ERUPTION.down, { down: true, by: self });
          // (Its Dark: what it dealt heals her a share.)
          if (self.perks.has('s3-dark')) fight.heal(self, PERKS.drain * Math.max(0, before - fight.foe.hp), undefined, self);
        },
      },
      // Blocked: a blow back, and 3 more Flame.
      blocked() {
        fight.cue(self, 'smash');
        fight.hit(self, SMASH.blow);
        // (Jewel of Inferno: more Flame, and the boss slower a moment.)
        const jewel = wearsTreasure(self, 3);
        burn(SMASH.flames + (jewel ? UT.jewel.flames : 0));
        if (jewel) fight.slow(fromTreasure(self, 3, UT.jewel.speed), UT.jewel.lasts);
        // (Hatchling Leather Gloves: a magic blow blocked while her Hellfire lasts, she is tougher and crit less, as long as it.)
        if (hellfire > 0 && wearsTreasure(self, 1) && fight.foe.def.stats.deals === 'magical') {
          const less = fromTreasure(self, 1, UT.gloves.less);
          put(self.statuses, { name: 'Hatchling Leather Gloves', left: hellfire, tough: less, critResist: { magical: UT.gloves.critResist }, shown: { name: 'Hatchling Leather Gloves', about: `+${less} Tough, and is crit less by magic.`, icon: '🧤', art: art(1) } });
        }
        // (Its Light: more M.DEF for each block, up to 10.)
        if (self.perks.has('s4-light') && blocks < PERKS.harder.most) {
          blocks++;
          put(self.statuses, { name: HARDENED.name, left: Infinity, count: blocks, defends: { magical: 1 + PERKS.harder.defense * blocks }, shown: HARDENED });
        }
      },
      tick(dt) {
        if (burning > 0) burning = Math.max(0, burning - dt);
        // Hellfire: a Flame on the boss every second.
        if (hellfire > 0) {
          hellfire -= dt;
          fanned += dt;
          if (fanned >= HELLFIRE.every) {
            fanned -= HELLFIRE.every;
            burn(1);
            // (Its Dark: a blow by her M.DEF.)
            if (self.perks.has('s2-dark') && self.hp > 0 && fight.field.includes(self)) {
              // (A blow is so many thousandths of her ATK: as hard as her M.DEF is that share of it.)
              const defense = (self.stats.magical + bolstering(self.statuses, 'magical') + bolstering(fight.party, 'magical')) * defending([...self.statuses, ...fight.party], 'magical');
              fight.hit(self, (POINTS * PERKS.scorch * defense) / self.stats.atk, false);
            }
          }
        }
        // Her Flame burns the boss every second (the first Morrah's, where there are two: it is the same Flame), each stack of it a blow of its own (counted as one).
        const count = flames();
        if (count <= 0 || fight.fighters.find((one) => one.id === self.id) !== self) {
          burnt = 0;
          return;
        }
        burnt += dt;
        if (burnt >= FLAME.every) {
          burnt -= FLAME.every;
          fight.cue(self, 'flame');
          fight.continuous(self, each * count);
        }
      },
      lit: () => burning > 0,
      buffs: () => (burning > 0 ? [{ ...BURNING_UP, left: burning }] : []),
    };
  },
};
