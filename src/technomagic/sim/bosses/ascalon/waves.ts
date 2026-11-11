import { NONE } from '../../combat/damage';
import type { OwnMinion } from '../boss';
import { PARTY } from '../playtest';
import type { AscalonKind } from './minions';

/*
 * The waves before Ascalon and the beasts his Dimension Warp calls up, King's Raid's own numbers, unscaled (as his are): his raid's
 * 9 stages (chapter 10's dungeons 1201 to 1209, CampaignWaveTable): waves 1 to 4 each the same five Synthetic Demon Beasts
 * (./minions.ts), wave 5 Ascalon. Their stats there as the game builds them (BattleCreatureCreateInfo.Create: each its own at
 * the wave's level and star, times its MonsterTierTable entry; the Failed's tier is the same at every stage, 10120113, as the
 * playtest has it). The Warp's beasts are made at Ascalon's own level and tier (SpawnCreature's tier 0: its caster's), at a
 * tenth of what they make them (its statRatio, 100 of 1000). Alone (KR_PARTY heroes), their health as much less as his.
 */

/** How many heroes King's Raid's raid is for here, and alone (his own: ./index.ts). */
const KR_PARTY = 7;
/** Each kind's health, ATK and DEF (P. and M. alike) at each stage. */
const STATS: Readonly<Record<AscalonKind, { hp: readonly number[]; atk: readonly number[]; def: readonly number[] }>> = {
  'beast-discarded': {
    hp: [1_119_743_497, 1_597_004_124, 1_819_604_241, 2_027_573_646, 2_233_953_459, 2_502_001_576, 3_121_986_868, 4_401_914_963, 6_968_593_174],
    atk: [2_559_178, 3_207_750, 4_158_900, 5_319_839, 6_080_642, 6_640_388, 8_285_924, 12_992_484, 20_568_375],
    def: [35_513, 38_925, 45_780, 47_409, 53_685, 45_798, 60_445, 71_981, 99_188],
  },
  'beast-discarded-ranged': {
    hp: [1_119_743_497, 1_597_004_124, 1_819_604_241, 2_027_573_646, 2_233_953_459, 2_502_001_576, 3_121_986_868, 4_401_914_963, 6_968_593_174],
    atk: [2_559_178, 3_207_750, 4_158_900, 5_319_839, 6_080_642, 6_640_388, 8_285_924, 12_992_484, 20_568_375],
    def: [35_513, 38_925, 45_780, 47_409, 53_685, 45_798, 60_445, 71_981, 99_188],
  },
  'beast-failed': {
    hp: [961_202_157, 1_054_272_205, 1_328_299_331, 1_673_552_905, 2_422_081_266, 2_656_598_662, 3_505_403_511, 5_313_197_323, 8_053_303_450],
    atk: [2_924_775, 3_207_750, 4_041_975, 5_092_500, 7_370_475, 8_083_950, 10_666_950, 16_168_425, 24_507_000],
    def: [35_513, 38_925, 49_050, 61_838, 89_475, 98_138, 129_525, 196_313, 297_563],
  },
  'beast-experimented': {
    hp: [691_041_881, 928_960_528, 1_048_966_823, 1_152_515_714, 1_769_748_644, 2_134_261_800, 2_688_167_790, 4_331_954_292, 6_871_413_056],
    atk: [487_463, 588_088, 664_135, 733_744, 611_749, 685_981, 864_023, 1_291_164, 2_048_085],
    def: [18_940, 20_760, 21_255, 20_613, 23_860, 24_207, 31_950, 44_498, 63_480],
  },
  'beast-ceased': {
    hp: [691_041_881, 928_960_528, 1_048_966_823, 1_152_515_714, 1_769_748_644, 2_134_261_800, 2_688_167_790, 4_331_954_292, 6_871_413_056],
    atk: [487_463, 588_088, 664_135, 733_744, 611_749, 685_981, 864_023, 1_291_164, 2_048_085],
    def: [18_940, 20_760, 21_255, 20_613, 23_860, 24_207, 31_950, 44_498, 63_480],
  },
};

/**
 * How many times as much DMG each takes: twice for all but the Discarded up close (their star grades' lookup 425,
 * PhysicalDefensePower and MagicalDefensePower -1000; the Discarded's, 424, none).
 */
const TAKEN: Readonly<Record<AscalonKind, number>> = { 'beast-discarded': 1, 'beast-discarded-ranged': 2, 'beast-failed': 2, 'beast-experimented': 2, 'beast-ceased': 2 };

/** One beast at a stage (1 to 9), where its wave has it (metres from the wave's middle: along the field, across it). */
export function beast(kind: AscalonKind, stage: number, x = 0, z = 0): OwnMinion {
  const of = STATS[kind];
  const at = Math.min(of.hp.length, Math.max(1, stage)) - 1;
  const def = of.def[at] as number;
  return {
    kind,
    x,
    z,
    hp: of.hp[at] as number,
    atk: of.atk[at] as number,
    def: [def, def],
    own: true,
    // (Their blows see past 500 of a hero's defense: their PiercePower 500, as his; a crit now and then, a first guess as his.)
    stats: { block: NONE, dodge: NONE, pen: 500, acc: 0, crit: 100, resist: 0 },
    ...(TAKEN[kind] !== 1 && { taken: TAKEN[kind] }),
    solo: KR_PARTY / PARTY,
  };
}

/** A wave's five, where they stand: the Discarded up close in front, the Failed either side of it, the Discarded from afar behind. */
const WAVE: readonly (readonly [AscalonKind, number, number])[] = [
  ['beast-discarded', 0, 0],
  ['beast-failed', 2, 5],
  ['beast-failed', 2, -5],
  ['beast-discarded-ranged', 8, 4],
  ['beast-discarded-ranged', 8, -4],
];
/** How many waves come before him. */
export const WAVES_BEFORE = 4;

/** The waves before him at a stage: four, each the same five. */
export const wavesAt = (stage: number): readonly (readonly OwnMinion[])[] =>
  Array.from({ length: WAVES_BEFORE }, () => WAVE.map(([kind, x, z]) => beast(kind, stage, x, z)));
