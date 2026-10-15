import { share } from '../combat/damage';
import { t5Light } from '../perks';
import { num, pct, skillArt, type Buff } from '../shown';
import { CLASS_STATS, type HeroDef, type Passive } from './kit';
import { CODED } from './moves';

/*
 * Kirze's skills, as the game has them (what each costs and how long before it can be used again are
 * the game's too):
 * - Slash, Blade of Judgment!: seven cuts round itself, then a blow in front of it that knocks the boss down.
 * - Disperse, Crystal Haze!: a burst that stuns; then, for a while, it is quickened, and a shockwave goes
 *   out from it every so often that stuns again.
 * - Bloom, Crimson Flower!: crystals in a line that then burst, and curse the boss: its attacks are slowed,
 *   every blow on it while cursed is counted, and when the curse ends it bursts, the harder for each one.
 * What is drawn for each is ../../heroes/kirze/fx.ts; what her body does, ../../heroes/kirze/moves.ts.
 *
 * Her own perks (../perks.ts) are King's Raid's. Blade of Judgment's Dark has the boss alone always; Crimson Flower's Dark
 * is [Arcane Crystal Energy]'s, which this raid hasn't: it does nothing here.
 */
const JUDGMENT = { cuts: CODED.judgment.lands.length - 1, cut: 1500, blow: 6000, down: 3 };
const HAZE = { burst: 9000, stun: 2, lasts: 15, quicker: 1.5, every: 2, wave: 2500, waveStun: 1 };
// (Its slow, as the game has it: an ATK Spd reduction, in points.)
const FLOWER = { line: 8000, burst: 12000, speed: 200, slowed: 5, curse: 10, end: 6000, each: 800 };
/** Her passive's: her ATK higher, her crit chance (points), and the stuns on a boss longer. */
const DEEDS = { atk: 0.2, crit: 200, control: 0.3 };
/** Her own perks' numbers: the shockwave's longer stun, Crimson Flower's stronger slow (points), her DMG while awakened, her opening's (how long, how much), and Transcend 5's Dark's attack speed for each blow (most). */
const PERKS = { waveStun: 0.5, slower: 300, awakeDmg: 1.2, opening: 20, openingDmg: 1.25, quicker: 5, most: 100 };

const art = skillArt('kirze');

/** Her passive, the game's End to Evil Deeds!: her ATK higher, more of her blows critical, and the stuns on a boss longer. */
const EVIL_DEEDS: Passive = {
  attack: 1 + DEEDS.atk,
  crit: share(DEEDS.crit),
  control: 1 + DEEDS.control,
  shown: {
    name: 'End to Evil Deeds!',
    about: `Passive. Her blows are ${pct(DEEDS.atk)} harder and ${pct(share(DEEDS.crit))} more often critical, and her stuns on a boss last ${pct(DEEDS.control)} longer.`,
    icon: '⚜️',
    art: art(3),
  },
  words: `Increases own ATK by ${pct(DEEDS.atk)} and Crit Chance by ${DEEDS.crit}, while increasing the duration of CCs that all allies inflict to Bosses by ${pct(DEEDS.control)}`,
};
/** What Crystal Haze gives her for a while: shown beside her passive, with how long it has left. */
const AWAKENING: Buff = { name: 'Arcane Crystal Awakening', about: `Quickened, and a shockwave goes out from her every ${HAZE.every} seconds.`, icon: '💠', art: art(1) };

export const KIRZE: HeroDef = {
  id: 'kirze',
  name: 'Kirze',
  class: 'warrior',
  skins: ['Kirze', 'Kirze_Glory'],
  // A warrior whose blows are magical: as her class stands, otherwise.
  stats: { ...CLASS_STATS.warrior, deals: 'magical' },
  abilities: [
    {
      name: 'Slash, Blade of Judgment!',
      about: `${JUDGMENT.cuts} cuts as she spins, then a blow that knocks the boss down for ${JUDGMENT.down} seconds.`,
      words: `Deals M.DMG over ${JUDGMENT.cuts} attacks to nearby enemies in a circular range of self. Then, attacks frontal enemies in range, dealing M.DMG and knocking them down for ${JUDGMENT.down} sec.`,
      icon: '🌀',
      art: art(0),
      move: 'judgment',
      cooldown: 9,
      cost: 2,
    },
    {
      name: 'Disperse, Crystal Haze!',
      about: `A burst that stuns the boss for ${HAZE.stun} seconds. Then for ${HAZE.lasts} seconds she is ${pct(HAZE.quicker - 1)} quicker, and a shockwave goes out from her every ${HAZE.every} seconds that stuns it for ${HAZE.waveStun}.`,
      words: `Unleashes the power of Arcane Crystals within to deal M.DMG to all enemies and stun them for ${HAZE.stun} sec. Upon casting, activates [Arcane Crystal Awakening] for ${HAZE.lasts} sec, which increases ATK Spd of all allies by 300 and releases a shockwave every ${HAZE.every} sec to enemies in range of self, dealing M.DMG and stunning them for ${HAZE.waveStun} sec.`,
      icon: '💠',
      art: art(1),
      move: 'haze',
      cooldown: 17,
      cost: 3,
    },
    {
      name: 'Bloom, Crimson Flower!',
      about: `Crystals in a line to the boss, then they burst: its attacks are ${pct(share(FLOWER.speed))} slower for ${FLOWER.slowed} seconds, and it is cursed for ${FLOWER.curse}. When the curse ends it bursts, the harder for every blow landed on the boss meanwhile.`,
      words: `Summons Arcane Crystals and deals M.DMG to frontal enemies in a straight line. Shortly afterward, causes an explosion that deals ${num(FLOWER.burst)} additional M.DMG and inflicts [Arcane Crystal Curse] upon enemies for ${FLOWER.slowed} sec, reducing their ATK Spd by ${FLOWER.speed}. Attacking enemies under [Arcane Crystal Curse] inflicts a stack of [Arcane Crystal Energy]. [Arcane Crystal Curse] explodes after ${FLOWER.curse} sec, dealing M.DMG equal to ${num(FLOWER.end)} + ${num(FLOWER.each)} per stack of Arcane Crystal Energy.`,
      icon: '🌺',
      art: art(2),
      move: 'flower',
      cooldown: 20,
      cost: 4,
    },
  ],
  passive: EVIL_DEEDS,
  perks: {
    's1-light': { words: 'Reduces Cooldown by 3% per each enemy hit.', skill: { index: 0, cooldownShare: 0.97 } },
    's1-dark': { words: 'If there is only 1 enemy, DMG is increased by 100%.', skill: { index: 0, dmg: 2 } },
    's2-light': { words: 'The duration of stun from the shockwave increases by 0.5 sec against Non-Hero enemies.' },
    's2-dark': { words: 'While under [Arcane Crystal Awakening], self deals 20% increased DMG to Non-Hero enemies.' },
    's3-light': { words: 'Increases ATK Spd reduction by 300.' },
    's3-dark': { words: 'If there is only 1 enemy, inflicts 2 stacks of [Arcane Crystal Energy].' },
    's4-light': { words: 'At the beginning of each battle, self deals 25% increased DMG to Non-Hero enemies for 20 sec.' },
    's4-dark': { words: 'Deals 15% increased DMG to Bosses.', dmg: 1.15 },
    't5-light': t5Light('ATK, DEF, HP +15% / ATK Spd +100', { speed: 100 }),
    't5-dark': { words: 'Every normal and Skill attack increases ATK Spd by 5. This effect can be stacked up to max 100 times.' },
  },
  // Her Glory League animations (both skins move by them): one cut inward where she stands, then three as she walks forward.
  timing: {
    attack: [
      { lands: [1.29], until: 1.6 },
      { lands: [0.75, 1.32, 2.55], until: 3 },
    ],
  },
  join(fight, self) {
    /** How long she is quickened for yet (Crystal Haze), and until her next shockwave. */
    let awake = 0;
    let wave = 0;
    /** Her curse on the boss: how long it has left, and the blows counted against it. */
    let curse: { left: number; blows: number } | null = null;
    /** Her perks: how long her opening's more DMG lasts yet (End to Evil Deeds!'s Light), and her blows counted for attack speed (Transcend 5's Dark). */
    let opening = self.perks.has('s4-light') ? PERKS.opening : 0;
    let quicker = 0;

    return {
      lands: {
        // Seven cuts as she spins, then the blow that knocks the boss down.
        judgment(part) {
          if (part < JUDGMENT.cuts) return fight.hit(self, JUDGMENT.cut);
          fight.hit(self, JUDGMENT.blow);
          fight.stun(JUDGMENT.down, { down: true, by: self });
        },
        // The burst over the whole field: the boss stunned, and she is quickened.
        haze() {
          fight.hit(self, HAZE.burst);
          fight.stun(HAZE.stun, { by: self });
          awake = HAZE.lasts;
          wave = HAZE.every;
        },
        // Crystals up in a line to the boss; then they burst, and the boss is cursed.
        flower(part) {
          if (part === 0) return fight.hit(self, FLOWER.line);
          fight.hit(self, FLOWER.burst);
          curse = { left: FLOWER.curse, blows: 0 };
          fight.slow(FLOWER.speed + (self.perks.has('s3-light') ? PERKS.slower : 0), FLOWER.slowed);
        },
      },
      // A blow on the boss while it is cursed is counted.
      struck() {
        if (curse) curse.blows++;
      },
      tick(dt) {
        opening = Math.max(0, opening - dt);
        // Quickened: a shockwave out from her every so often, while she is on the field, that hurts the boss and stuns it.
        if (awake > 0) {
          awake = Math.max(0, awake - dt);
          wave -= dt;
          if (wave <= 0 && fight.field.includes(self)) {
            wave += HAZE.every;
            fight.cue(self, 'wave');
            fight.hit(self, HAZE.wave);
            fight.stun(HAZE.waveStun + (self.perks.has('s2-light') ? PERKS.waveStun : 0), { by: self });
          }
        }
        // Her curse runs out and bursts, the harder for each blow counted (what the burst does isn't one of them).
        if (curse) {
          curse.left -= dt;
          if (curse.left <= 0) {
            const { blows } = curse;
            curse = null;
            fight.cue(self, 'curse');
            fight.hit(self, FLOWER.end + FLOWER.each * blows, false);
          }
        }
      },
      pace: () => (awake > 0 ? HAZE.quicker : 1),
      deals: () => (awake > 0 && self.perks.has('s2-dark') ? PERKS.awakeDmg : 1) * (opening > 0 ? PERKS.openingDmg : 1),
      speed: () => quicker * PERKS.quicker,
      blow() {
        if (self.perks.has('t5-dark')) quicker = Math.min(PERKS.most, quicker + 1);
      },
      lit: () => awake > 0,
      buffs: () => (awake > 0 ? [{ ...AWAKENING, left: awake }] : []),
      marks: () => (curse ? [{ text: `Curse ${Math.ceil(curse.left)} · ${curse.blows} blows`, tone: 'curse' }] : []),
    };
  },
};
