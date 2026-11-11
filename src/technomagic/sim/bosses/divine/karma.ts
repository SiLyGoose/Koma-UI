import { NONE, type BossStats } from '../../combat/damage';
import { put } from '../../combat/status';
import { stateArt, type Buff } from '../../shown';
import type { Fight, Fighter } from '../../types';
import type { BossDef, BossPart, KarmaCard, KarmaDef, KarmaWave, OwnMinion } from '../boss';
import type { KarmaKind } from '../dragon/minions';
import { kitOf, kitPart, type Skill } from './kit';
import { KARMA_CARDS } from './karma-cards';

/*
 * Divine Punishment's karma dungeons (King's Raid's chapters 70101 to 70104, Apocalypsion's, and 70201 to 70204, Solenis'): 3
 * heroes (one of a class at most), 120 seconds against Apocalypsion's (Inpele, Primal Azure Dragon, and her Draconians) or 90
 * against Solenis' (Vhegort and his golems), then 10 of rage (BattleDefine ExtraTime). Their four stages, one wave each, come
 * round and round without end (KarmaDungeonTable's NextLevel: 1, 2, 3, 4, 1, …), each a fresh wave of its monsters, the
 * stronger the more waves have gone (KR-extracted/briefs/divine-punishment.md §2, §3.2, §4.4):
 * - Each stage's monsters are King's Raid's own (CampaignWaveTable at level 100: HP, ATK, DEF), with the wave's own extra skills
 *   on them (so much more max HP and ATK: ModMaxHpR, ModPowerR; more DMG: ModAttackPower; less damage taken: DefensePower, 300
 *   being 30% less; Tough, dodge, block). Every karma monster's blows always hit (7060001's Unavoidable).
 * - Every wave, each the stronger by its KarmaEnemyPowerUpTable skills (701010001 and 2, 702010001 and 2): each op
 *   Mod{Power,Defence,MaxHp}RByStageLevel(v, every) adds ((1000 + v) / 1000) ^ floor(wave / every) − 1 of the stat, and its ops
 *   add up (an inference, as the brief's); the 10× terms at waves 30 and 31 make about wave 30 a wall.
 * - Stage 4's boss calls up four more every 18 seconds while it stands (3632037, 6101046: which four not read; one of each kind
 *   of its stage's here), and its eight others come 4 and 8 seconds in (a first guess of their wave's delays).
 * - The Karma Gauge (PunishmentHelper.GetFlaskExp): the first wave is worth 100, each after it as much as the one before times
 *   KarmaGaugeExponentialTable's exponent for it (1 to wave 5, 1.22 to 20, 0.86 from 21); a wave cleared, all its worth; the
 *   wave under way, its worth for each of its monsters beaten, of how many it has (those its boss calls up not counted). A run
 *   counts (won) once the gauge fills one Tier 1 Shard (500), however it ends.
 * - After each wave cleared, the heroes pick one of three cards (./karma-cards.ts), from different groups, each group as likely
 *   as its GroupChance and each card in it as its UniqueChance, only cards for the classes there are, a card taken as many
 *   times as it may at most left out; 10 seconds, then card 1 or 2 is picked for them at random (KarmaCardSelectWindow:
 *   Random.Range(0, 2), never the third). The fight stands still meanwhile (an inference: the game changes scene for the next
 *   wave), and the next wave comes as it is picked.
 * - Its heroes' extra skills (6110001: shields 75% weaker; 7060000: 8.5% less healing received) are on every hero throughout.
 * The bosses' and the others' kits are stand-ins (./kit.ts; ../dragon/minions.ts karmaMonster): Inpele's plain attack (400%,
 * and [Inferno], 2% of max HP every second for 10 seconds), her first skill (0.8% of the target's health, taken as its max HP
 * as the others', and knocked down 2 seconds, a first guess) and second (9% on every hero); Vhegort's plain attack (170% and
 * 70%, each 4% less ATK Spd, stacking), and his three skills (120% and 2.1% of the target's health; 110% and 0.9% on every
 * hero; 70% and a stun of 1.5 seconds, a first guess, and 0.52% on every hero). Their skills have no names in the game. Stage
 * 2's Vhegort gives himself back 0.5% of his max HP a second (6101045's amount not read: a first guess); his shield at 20% of
 * his health is not here. They go for whoever is foremost (King's Raid's HighestThreatener: threat is not here).
 */

/** A stage's monster as CampaignWaveTable has it at level 100 (HP, ATK, DEF), with its wave's extras (shares more: max HP, ATK, DMG; DefensePower, Tough, dodge, block in points). */
interface Monster {
  hp: number;
  atk: number;
  def: number;
  more?: { hp?: number; atk?: number; dmg?: number; defense?: number; tough?: number; dodge?: number; block?: number };
}

/** A stage: its boss, its others (their kind, and how many seconds into the wave each comes), and whether its boss calls up more. */
interface Stage {
  boss: Monster;
  others: readonly { kind: KarmaKind; after: number; as: Monster }[];
  summons?: boolean;
}

/** A group's karma dungeon as King's Raid's tables have it. */
interface Group {
  id: string;
  name: string;
  time: number;
  /** The boss's kind of damage, its star-grade lookup's stats (240, 247), and its stand-in kit (`atk`: its ATK then; `stage`: 1 to 4). */
  deals: 'magical' | 'physical';
  lookup: Partial<Omit<BossStats, 'hp' | 'deals' | 'physical' | 'magical'>>;
  skills(stage: number): Skill[];
  /** What grows by the wave: ATK, DEF and max HP, each its ops' [v, every]. */
  grows: { atk: readonly (readonly [number, number])[]; def: readonly (readonly [number, number])[]; hp: readonly (readonly [number, number])[] };
  stages: readonly Stage[];
  /** What its boss of `stage` has besides its kit (none: nothing). */
  part?(fight: Fight, stage: number): Partial<BossPart>;
}

/** (1000 + v) / 1000 to the power of floor(wave / every), less 1: by + * and / alone (../../rules.ts). */
function growth(v: number, every: number, wave: number): number {
  let times = 1;
  for (let k = 0; k < Math.floor(wave / every); k++) times *= (1000 + v) / 1000;
  return times - 1;
}
/** How many times its own a stat is at a wave: its ops' growth, added up. */
const grown = (ops: readonly (readonly [number, number])[], wave: number): number => 1 + ops.reduce((sum, [v, every]) => sum + growth(v, every, wave), 0);

/** The most waves a karma run is fought for: past 30 or so no hero gets far (a bound on its length; my default, King's Raid has none). */
export const KARMA_MOST_WAVES = 100;

/** Every karma monster's blows always hit (2000 ACC: none dodged). */
const SURE = 2000;

/** The Karma Gauge's exponent for a wave (KarmaGaugeExponentialTable, both groups alike: as King's Raid's single floats). */
export function gaugeExponent(wave: number): number {
  if (wave >= 21) return 0.8600000143051147;
  if (wave >= 6) return 1.2200000286102295;
  return 1;
}

const INFERNO: Buff = { name: 'Inferno', about: '2% of max HP every second.', icon: '🔥', art: stateArt('Burn'), harmful: true };
const SLOWED: Buff = { name: 'Karma Speed Debuff', about: '4% less ATK Spd a stack.', icon: '🐢', art: stateArt('SpeedDown'), harmful: true };

const INPELE: Group = {
  id: 'karma-apocalypsion',
  name: 'Karma Dungeon: Apocalypsion',
  time: 120,
  deals: 'magical',
  lookup: { crit: 100, dodge: { physical: 100, magical: 100 }, pen: 300, resist: 200, tough: { physical: 400, magical: 400 } },
  skills: () => [
    { name: 'attack', label: 'Attack', length: 2.7, blows: [0.5], share: 4, on: 'target', then: (on) => put(on.statuses, { name: INFERNO.name, left: 10, shown: INFERNO }) },
    { name: 'skill1', label: 'Skill 1', cooldown: 10, first: 12, length: 4.1, blows: [2.9], share: 0, on: 'target', hp: 0.008, stun: 2 },
    { name: 'skill2', label: 'Skill 2', cooldown: 18, first: 12, length: 4.2, blows: [3], share: 0, on: 'all', hp: 0.09 },
  ],
  grows: { atk: [[430, 1], [10000, 35], [150, 5], [9000, 30], [9000, 31]], def: [[10, 1], [10000, 35], [9000, 30], [9000, 31]], hp: [[580, 1], [10000, 35], [9000, 30], [9000, 31]] },
  stages: [
    {
      boss: { hp: 509_280_000, atk: 40_740, def: 34_629, more: { hp: 5, atk: 0.5, defense: 300 } },
      others: (['kauron', 'kauron', 'moira', 'moira', 'theakel', 'theakel', 'reuss', 'reuss'] as const).map((kind) => ({ kind, after: 0, as: { hp: 509_280_000, atk: 40_740, def: 34_629 } })),
    },
    { boss: { hp: 611_136_000, atk: 242_500, def: 34_629, more: { hp: 8, atk: 1, dmg: 0.4, defense: 400, dodge: 500 } }, others: [] },
    {
      boss: { hp: 916_704_000, atk: 213_400, def: 46_172, more: { hp: 9, atk: 0.9, dmg: 0.4, defense: 500, tough: 900 } },
      others: (['kauron', 'moira'] as const).map((kind) => ({ kind, after: 0, as: { hp: 916_704_000, atk: 213_400, def: 46_172, more: { hp: 1, atk: 0.5, defense: 300 } } })),
    },
    {
      boss: { hp: 712_992_000, atk: 36_860, def: 34_629, more: { hp: 10, atk: 0.5, defense: 500, tough: 500 } },
      others: (['kauron', 'moira', 'theakel', 'reuss', 'kauron', 'moira', 'theakel', 'reuss'] as const).map((kind, i) => ({ kind, after: i < 4 ? 4 : 8, as: { hp: 712_992_000, atk: 36_860, def: 34_629 } })),
      summons: true,
    },
  ],
};

const VHEGORT: Group = {
  id: 'karma-solenis',
  name: 'Karma Dungeon: Solenis',
  time: 90,
  deals: 'physical',
  lookup: { crit: 100, dodge: { physical: 100, magical: 100 }, pen: 300, resist: 200 },
  skills: () => [
    {
      name: 'attack',
      label: 'Attack',
      length: 4.4,
      blows: [0.7, 2],
      share: [1.7, 0.7],
      on: 'target',
      then: (on) => void addSlow(on),
    },
    { name: 'skill1', label: 'Skill 1', cooldown: 7, first: 10, length: 6.3, blows: [2.8], share: 1.2, on: 'target', hp: 0.021 },
    { name: 'skill2', label: 'Skill 2', cooldown: 9, first: 10, length: 6, blows: [4.3], share: 1.1, on: 'all', hp: 0.009 },
    { name: 'skill3', label: 'Skill 3', cooldown: 9, first: 14, length: 5.6, blows: [3.3], share: 0.7, on: 'all', hp: 0.0052, stun: 1.5 },
  ],
  grows: { atk: [[410, 1], [10000, 35], [150, 5], [9000, 30], [9000, 31]], def: [[10, 1], [10000, 35], [9000, 30], [9000, 31]], hp: [[600, 1], [10000, 35], [9000, 30], [9000, 31]] },
  stages: [
    {
      boss: { hp: 628_112_000, atk: 36_860, def: 39_576, more: { hp: 6, atk: 0.4, defense: 300 } },
      others: (['golem-guardian', 'golem-guardian', 'golem-destroyer', 'golem-destroyer', 'golem-berserk', 'golem-berserk', 'golem-mountain', 'golem-mountain'] as const).map((kind) => ({
        kind,
        after: 0,
        as: { hp: 448_650_900, atk: 36_860, def: 58_200 },
      })),
    },
    { boss: { hp: 729_968_000, atk: 194_000, def: 39_576, more: { hp: 9.2, atk: 0.7, dmg: 0.2, defense: 400 } }, others: [] },
    {
      boss: { hp: 1_001_584_000, atk: 174_600, def: 52_768, more: { hp: 10.8, atk: 0.6, dmg: 0.1, defense: 500, block: 500 } },
      others: (['golem-guardian', 'golem-destroyer'] as const).map((kind) => ({ kind, after: 0, as: { hp: 715_416_300, atk: 174_600, def: 77_600, more: { hp: 1.3, atk: 0.3, defense: 400 } } })),
    },
    {
      boss: { hp: 797_872_000, atk: 30_070, def: 39_576, more: { hp: 12, atk: 0.4, defense: 500, block: 500 } },
      others: (['golem-guardian', 'golem-destroyer', 'golem-berserk', 'golem-mountain', 'golem-guardian', 'golem-destroyer', 'golem-berserk', 'golem-mountain'] as const).map((kind, i) => ({
        kind,
        after: i < 4 ? 4 : 8,
        as: { hp: 569_907_900, atk: 30_070, def: 58_200 },
      })),
      summons: true,
    },
  ],
  part: (fight, stage) => (stage === 2 ? { tick: (dt) => fight.mend(fight.foe.maxHp * 0.005 * dt) } : {}),
};

/** Vhegort's plain attack: 4% less ATK Spd, stacking (King's Raid's Karma_SpeedDebuff). */
function addSlow(on: Fighter): void {
  const count = Math.min(20, (on.statuses.find((status) => status.name === SLOWED.name)?.count ?? 0) + 1);
  put(on.statuses, { name: SLOWED.name, left: Infinity, count, pace: Math.max(0.1, 1 - 0.04 * count), shown: SLOWED });
}

/** A monster of `group` at `wave` (from 1): its health, ATK and stats as its stage and the wave's growth have them. */
function monster(group: Group, one: Monster, wave: number): { hp: number; atk: number; dmg: number; def: number; taken: number; stats: Partial<BossStats> } {
  const more = one.more ?? {};
  const def = one.def * grown(group.grows.def, wave);
  return {
    hp: one.hp * (1 + (more.hp ?? 0)) * grown(group.grows.hp, wave),
    atk: one.atk * (1 + (more.atk ?? 0)) * grown(group.grows.atk, wave),
    dmg: 1 + (more.dmg ?? 0),
    def,
    taken: 1 - (more.defense ?? 0) / 1000,
    stats: {
      acc: SURE,
      ...(more.tough && { tough: { physical: more.tough, magical: more.tough } }),
      ...(more.dodge && { dodge: { physical: more.dodge, magical: more.dodge } }),
      ...(more.block && { block: { physical: more.block, magical: more.block } }),
    },
  };
}

/** Where a stage's others stand about its boss (metres: along the field, across it), in turn. */
const SPOTS: readonly (readonly [number, number])[] = [
  [-1, 3],
  [-1, -3],
  [1, 4],
  [1, -4],
  [-2, 1.5],
  [-2, -1.5],
  [2, 2],
  [2, -2],
];

/** A group's karma dungeon as the fight has it: each wave's boss and others, its gauge and cards. */
function karmaOf(group: Group): KarmaDef {
  const wave = (level: number): KarmaWave => {
    const index = (level - 1) % group.stages.length;
    const stage = group.stages[index] as Stage;
    const boss = monster(group, stage.boss, level);
    const skills = group.skills(index + 1);
    const lookup = group.lookup;
    const def: BossDef = {
      id: group.id,
      name: group.name,
      stats: {
        hp: boss.hp,
        deals: group.deals,
        physical: boss.def,
        magical: boss.def,
        block: NONE,
        dodge: NONE,
        crit: 0,
        resist: 0,
        ...lookup,
        ...boss.stats,
        ...(lookup.tough && boss.stats.tough && { tough: { physical: lookup.tough.physical + boss.stats.tough.physical, magical: lookup.tough.magical + boss.stats.tough.magical } }),
        ...(lookup.dodge && boss.stats.dodge && { dodge: { physical: lookup.dodge.physical + boss.stats.dodge.physical, magical: lookup.dodge.magical + boss.stats.dodge.magical } }),
      },
      stages: { room: [{ hp: 1, deals: boss.dmg, level: 100 }], solo: [{ hp: 1, deals: boss.dmg, level: 100 }] },
      ...kitOf(skills, boss.atk),
      rest: 0.3,
      time: group.time,
      rage: 10,
      join(fight) {
        const own = group.part?.(fight, index + 1) ?? {};
        const ownTick = own.tick;
        let since = 0;
        return kitPart(fight, skills, {
          ...own,
          taken: { physical: boss.taken, magical: boss.taken },
          // (The heroes' extra skills: shields 75% weaker, healing 8.5% less.)
          shielding: () => 0.25,
          healing: () => 0.915,
          tick(dt) {
            ownTick?.(dt);
            // (Inpele's Inferno: 2% of max HP every second on those bearing it.)
            since += dt;
            if (since < 1) return;
            since -= 1;
            for (const on of fight.field) if (on.hp > 0 && on.statuses.some((status) => status.name === INFERNO.name)) fight.hurt(on, on.stats.hp * 0.02, false);
          },
        });
      },
    };
    const minion = (kind: KarmaKind, as: Monster, at: number): OwnMinion => {
      const made = monster(group, as, level);
      const [x, z] = SPOTS[at % SPOTS.length] as readonly [number, number];
      return { kind, x, z, hp: made.hp, atk: made.atk * made.dmg, def: [made.def, made.def], own: true, stats: made.stats, taken: made.taken };
    };
    const others = stage.others.map(({ kind, after, as }, i) => ({ minion: minion(kind, as, i), after }));
    const kinds = [...new Set(stage.others.map((one) => one.kind))];
    return {
      boss: def,
      minions: others,
      ...(stage.summons && { summon: { every: 18, minions: kinds.slice(0, 4).map((kind, i) => minion(kind, stage.others.find((one) => one.kind === kind)?.as ?? stage.boss, i)) } }),
    };
  };
  return { wave, gauge: { first: 100, exponent: gaugeExponent }, least: 500, most: KARMA_MOST_WAVES, cards: KARMA_CARDS, pick: 10 };
}

/** A karma dungeon's BossDef: its first wave's boss, as the fight begins (the fight goes on to each next wave's: BossDef.karma). */
function karmaDungeon(group: Group): BossDef {
  const karma = karmaOf(group);
  return { ...karma.wave(1).boss, karma };
}

export const KARMA_APOCALYPSION: BossDef = karmaDungeon(INPELE);
export const KARMA_SOLENIS: BossDef = karmaDungeon(VHEGORT);
export type { KarmaCard };
