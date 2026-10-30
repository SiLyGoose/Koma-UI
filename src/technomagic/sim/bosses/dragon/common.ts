import { NONE, type BossStats } from '../../combat/damage';
import { put, type Status } from '../../combat/status';
import type { Buff } from '../../shown';
import type { Fight, Fighter } from '../../types';
import type { BossDef, BossPart, BossScale } from '../boss';
import { MINIONS } from './minions';
import { NORMAL_STAGES, NORMAL_WAVES } from './normal';
import { WAVES, type WaveMinion } from './waves';
import { DRAGON_GAUGE, NORMAL_DRAGON_GAUGE, withGauge, type GaugeSize } from '../gauge';
import { HEROES_DEAL, HEROES_HP } from '../playtest';

/*
 * What every dragon has, as King's Raid's Dragon Raid has it:
 * - Its CC Gauge (../gauge.ts): no stun holds a dragon. A hero's stun (or knock down) wears its gauge down instead, by how
 *   long it would have held it; once the gauge is empty the dragon is Down for a while (what it was doing cut short, its
 *   breath among it), and its gauge is full again as it gets up. "Trying to deplete the CC gauge before a dragon uses a
 *   powerful skill is the common strategy for all dragons" (the game's own tip).
 * - Its penetration, 400 points of every hero's defense (the playtest's PiercePower).
 * - Its stages, King's Raid's playtest's Hard Dragon Raid's (KR_HP, KR_DEF, KR_ATK, KR_LEVEL); and its Normal mode, the
 *   Normal Dragon Raid's (normalDragon).
 * And what its skills share: the heroes it can reach, a blow on each, what stacks on them for a while, and what eats at
 * them every second (a burn, poison).
 */

/*
 * Its stages (1 to 10) are King's Raid's playtest's Hard Dragon Raid's (chapters 911 to 914), as the game builds its dragons:
 * each its creature's stats at the stage's level, times its MonsterTierTable entry (KR-extracted/scripts/boss-stats.mjs). All
 * four are alike, but Temeraire's ATK (KR_ATK × FIRE_ATK) and that the higher of Temeraire's and Scalaxia's DEF (P.DEF and
 * M.DEF) is HIGH_DEF times the other. Its health is the game's for its party of KR_PARTY, as much less as the heroes here deal
 * (../playtest.ts) and as much more as there are of them (DRAGON_PARTY); how hard it hits, the game's (its skills' shares of KR_ATK: ./moves.ts),
 * as much less as the heroes here have less health. Alone (SOLO heroes), its health is as much less again.
 */
const KR_HP = [931_159_153, 1_120_206_503, 1_347_633_837, 1_950_395_922, 3_900_791_843, 4_560_670_244, 5_725_394_959, 7_635_313_815, 9_271_452_032, 15_491_771_741];
export const KR_ATK = [1_898_512, 2_284_691, 2_748_592, 3_977_565, 7_955_939, 11_434_363, 13_797_120, 28_289_856, 34_351_968, 65_045_376];
const KR_DEF = [92_822, 111_751, 134_402, 194_515, 389_110, 504_410, 620_813, 1_026_648, 1_246_644, 2_217_456];
const KR_LEVEL = [77, 81, 85, 93, 108, 110, 110, 115, 115, 120];
export const FIRE_ATK = 1_763_309 / 1_898_512;
const HIGH_DEF = 132_660 / 92_822;
const KR_PARTY = 9;
/** The heroes a dragon is fought by here, with others (as the game's Dragon Raid: the bot's DRAGON_ROOM) and alone. */
export const DRAGON_PARTY = 9;
const SOLO = 8;
/** The Normal Dragon Raid's party (its MainSquardCount), which its dragons' health is for. */
const KR_NORMAL_PARTY = 6;

/** A dragon's health and defense at stage 1, for its stats: its lower defense, and its higher. */
export const FIRST = { hp: ((KR_HP[0] as number) * HEROES_DEAL * DRAGON_PARTY) / KR_PARTY, def: KR_DEF[0] as number, high: (KR_DEF[0] as number) * HIGH_DEF };

/** A dragon's stages, fought with others and alone (`atk`: its ATK, of the others'). */
export function dragonStages({ atk = 1 }: { atk?: number } = {}): { room: BossScale[]; solo: BossScale[] } {
  const scales = (times: number): BossScale[] =>
    KR_HP.map((hp, i) => ({
      hp: (hp / (KR_HP[0] as number)) * times,
      deals: HEROES_HP * atk * ((KR_ATK[i] as number) / (KR_ATK[0] as number)),
      defense: (KR_DEF[i] as number) / (KR_DEF[0] as number),
      level: KR_LEVEL[i] as number,
    }));
  return { room: scales(1), solo: scales(SOLO / DRAGON_PARTY) };
}

/**
 * As the playtest's hard dragons are: no block; 150 dodge against both kinds; 400 points of a hero's defense seen past, and
 * 250 of its dodge (hit chance); a crit chance of 250; and no CC resist (the gauge stands for it).
 */
export const OPEN = { block: NONE, dodge: { physical: 150, magical: 150 }, pen: 400, acc: 250, crit: 250, resist: 0 };
/** The Hard Dragon Raid's time: 3 minutes (the playtest's Raid_Hard). */
export const DRAGON_TIME = 180;

/** What a dragon's skills have of its mode: how big its CC Gauge is (../gauge.ts), and the share of its health its ultimate opens at. */
export interface DragonMode {
  gauge: GaugeSize;
  ultimate: number;
}

/**
 * A dragon's Normal mode (BossDef.normal), as King's Raid's playtest's Normal Dragon Raid has it (chapters 901 to 904:
 * ./normal.ts): its own stats at each of its 20 stages, scaled to the heroes here as its Hard mode's are (its health the
 * game's for its party of KR_NORMAL_PARTY), its P.DEF and M.DEF the game's (alike, in every Normal dragon); its waves, flying off at
 * `leaves` of its health (the playtest's OnHpRatio: Scalaxia's 600, the rest's 500), and its landing a blow of 20% of its
 * ATK that knocks the heroes down 1.5 seconds (its OnBeginPlaying(0, 3)); its CC Gauge the Normal Dragon Raid's, and its
 * ultimate open from `leaves` too. Its skills are its Hard mode's: `part`, told its mode.
 */
export function normalDragon(hard: BossDef, leaves: number, part: (fight: Fight, mode: DragonMode) => BossPart): BossDef {
  const own = NORMAL_STAGES[hard.id];
  if (!own) throw new Error(`${hard.name} has no Normal stages`);
  const first = ((own.hp[0] as number) * HEROES_DEAL * DRAGON_PARTY) / KR_NORMAL_PARTY;
  const scales = (times: number): BossScale[] =>
    own.hp.map((hp, i) => ({
      hp: (hp / (own.hp[0] as number)) * times,
      deals: HEROES_HP * ((own.atk[i] as number) / (KR_ATK[0] as number)),
      defense: (own.def[i] as number) / (own.def[0] as number),
      level: own.level[i] as number,
    }));
  const waves = NORMAL_WAVES[hard.id] ?? [];
  const mode: DragonMode = { gauge: NORMAL_DRAGON_GAUGE, ultimate: leaves };
  const { waves: _hard, normal: _normal, ...rest } = hard;
  return {
    ...rest,
    stats: { ...hard.stats, hp: first, physical: own.pdef[0] as number, magical: own.def[0] as number },
    stages: { room: scales(1), solo: scales(SOLO / DRAGON_PARTY) },
    ...(waves.length > 0 && { waves: { at: (stage: number) => waves[stage - 1] ?? [], party: KR_NORMAL_PARTY, leaves, lands: { share: 0, blow: 0.2 * (KR_ATK[0] as number), knock: 1.5 } } }),
    join: (fight) => part(fight, mode),
  };
}

/** The heroes a dragon can reach: on the field, standing, and in the fight. */
export const reachable = (fight: Fight): Fighter[] => fight.field.filter((fighter) => fighter.hp > 0 && !fighter.statuses.some((status) => status.away));

/** A blow on whoever it is going for, then `then` on them. */
export function single(fight: Fight, amount: number, then?: (target: Fighter) => void): void {
  const target = fight.target();
  if (!target || target.hp <= 0) return;
  fight.hurt(target, amount);
  then?.(target);
}

/** A blow on every hero it can reach, then `then` on each; and `cue` drawn for them. Returns them. */
export function all(fight: Fight, amount: number, then?: (target: Fighter) => void, cue?: string): Fighter[] {
  const heroes = reachable(fight);
  for (const fighter of heroes) {
    fight.hurt(fighter, amount);
    if (fighter.hp > 0) then?.(fighter);
  }
  if (cue) fight.cue(null, cue, heroes);
  return heroes;
}

/** How many of a status a hero bears (0: none). */
export const stacksOf = (fighter: Fighter, name: string): number => fighter.statuses.find((status) => status.name === name)?.count ?? 0;

/** So many more of a status that stacks (up to `most`), begun again for `lasts` seconds: `made` makes it. Returns how many there are now. */
export function addStacks(fighter: Fighter, name: string, by: number, most: number, lasts: number, made: (count: number) => Omit<Status<Buff>, 'name' | 'left' | 'count'>): number {
  const count = Math.min(most, stacksOf(fighter, name) + by);
  put(fighter.statuses, { ...made(count), name, left: lasts, count });
  return count;
}

/** Takes a status off a hero. */
export function lift(fighter: Fighter, name: string): void {
  const at = fighter.statuses.findIndex((status) => status.name === name);
  if (at >= 0) fighter.statuses.splice(at, 1);
}

/**
 * Something that eats at the heroes bearing a status, every second while they do: `each` says how much (by the hero:
 * its stacks, the blow it came of), and it is a blow of the dragon's that nothing blocks.
 */
export function dot(fight: Fight, name: string, each: (fighter: Fighter) => number): (dt: number) => void {
  let since = 0;
  return (dt) => {
    since += dt;
    if (since < 1) return;
    since -= 1;
    for (const fighter of reachable(fight)) {
      if (!fighter.statuses.some((status) => status.name === name)) continue;
      const amount = each(fighter);
      if (amount > 0) fight.hurt(fighter, amount, false);
    }
  };
}

/**
 * Its skills' cooldowns (seconds), each begun as it is used and run down every step; and, as King's Raid's (InitialCoolTimeMs),
 * how long each waits as the fight begins: [cooldown, first], or just its cooldown (ready from the start). Delayed (a hero's
 * Fight.delay), each is so many seconds longer, one ready too.
 */
export function cooldowns(of: Readonly<Record<string, number | readonly [number, number]>>): { used(attack: string): void; ready(attack: string): boolean; tick(dt: number): void; delay(seconds: number): void } {
  const length = (one: number | readonly [number, number]): number => (typeof one === 'number' ? one : one[0]);
  const left = new Map<string, number>(Object.entries(of).flatMap(([attack, one]) => (typeof one === 'number' ? [] : [[attack, one[1]] as const])));
  return {
    used(attack) {
      const cooldown = of[attack];
      if (cooldown !== undefined) left.set(attack, length(cooldown));
    },
    ready: (attack) => (left.get(attack) ?? 0) <= 0,
    tick(dt) {
      for (const [attack, wait] of left) left.set(attack, Math.max(0, wait - dt));
    },
    delay(seconds) {
      for (const attack of Object.keys(of)) left.set(attack, (left.get(attack) ?? 0) + seconds);
    },
  };
}

/**
 * A blow that takes `share` of what health each of `heroes` has left, as King's Raid's playtest's dragons' do ($ByMEHp4), and
 * nothing blocks.
 */
export function fraction(fight: Fight, heroes: readonly (Fighter | null)[], share: number): void {
  for (const fighter of heroes) if (fighter && fighter.hp > 0) fight.hurt(fighter, fighter.hp * share, false);
}

/** A dragon's ultimate is open once it is down to this share of its health (the Hard Dragon Raid's OnHpRatio 700). */
export const ULTIMATE = 0.7;
/** Whether a dragon's ultimate is open (at `at` of its health: none said, ULTIMATE). */
export const opened = (fight: Fight, at: number = ULTIMATE): boolean => fight.foe.hp <= fight.foe.maxHp * at;
/** A Hard dragon's mode: the Hard Dragon Raid's CC Gauge (../gauge.ts), its ultimate open at ULTIMATE. */
export const HARD: DragonMode = { gauge: DRAGON_GAUGE, ultimate: ULTIMATE };
/** How long a dragon rests after an attack: as long as makes its bite take its plain attack's time, `seconds` (the playtest's). */
export const restFor = (seconds: number): number => seconds - 1.7;

/**
 * A dragon's raid's waves (./waves.ts: the Hard Dragon Raid's): at 70% of its health it flies off (the playtest's OnHpRatio 700,
 * BeginResting), its minions come in two waves on the platforms on, and it comes back for the last, its landing taking half of
 * what health every hero has left and knocking them down 1.5 seconds (its OnBeginPlaying(0, 3): $ByMEHp4(500), Knockback).
 */
export const dragonWaves = (id: string): NonNullable<BossDef['waves']> => ({ at: (stage) => WAVES[id]?.[stage - 1] ?? [], leaves: ULTIMATE, lands: { share: 0.5, knock: 1.5 } });

/**
 * A minion of a wave (./waves.ts) as the dragons are scaled: its health the game's as much less as the heroes here deal and
 * as much more as there are of them than its raid's `party` (alone, as much less again); its ATK (what its blows are shares
 * of: ./minions.ts) as much less as the heroes here have less health; its defenses the game's; and the rest as the hard dragons' (OPEN).
 */
export function minionOf(minion: WaveMinion, solo: boolean, party: number = KR_PARTY): { hp: number; atk: number; stats: BossStats } {
  const hp = ((minion.hp * HEROES_DEAL * DRAGON_PARTY) / party) * (solo ? SOLO / DRAGON_PARTY : 1);
  return { hp, atk: minion.atk * HEROES_HP, stats: { hp, deals: MINIONS[minion.kind].deals, magical: minion.def[0], physical: minion.def[1], ...OPEN } };
}

/** A dragon's part: its own (`own`), with its CC Gauge (../gauge.ts: of `size`, none said the Hard Dragon Raid's). */
export const withDragonGauge = (fight: Fight, own: BossPart, size: GaugeSize = DRAGON_GAUGE): BossPart => withGauge(fight, own, size);
