import { BOSSES, DRAGONS, TM_BOSSES } from './bosses';
import { DIVINE as DIVINE_DEFS, DIVINE_SIDES, divineFight, type DivineDef } from './bosses/divine';
import { DIVINE_LEVELS as LEVELS } from './bosses/divine/levels';
import { bossIn, stagesOf, type BossDef } from './bosses/boss';
import type { DamageType } from './combat/damage';
import type { Input } from './events';
import { FLY_OFF, makeSim, RUN_ON } from './fight';
import { HEROES } from './heroes';
import { perkStats, perksOf } from './perks';
import { MARCH, MOST, RAGE_WIPE, RAID_TIME, TICK } from './rules';
import { ARTIFACTS } from './artifacts';
import { KR_ARTIFACTS, KR_PIECES as PIECES, KR_POOLS as POOLS, KR_REFINE as REFINE, KR_RUNES as RUNES, KR_SETS as SETS, KR_UNIQUE as UNIQUE } from './gear/kr-data';
import { KR_BLASPHEMY as BLASPHEMY } from './gear/blasphemy';
import { SET_INFO, SET_PIECES } from './sets';
import { MOST_SKILLS, SKILLS } from './skills';
import { treasureAbout } from './treasures';
import { UNIQUE_HEROES, uniqueAbout } from './unique';
import { VERSION } from './version';

/*
 * The fight as the bot has it: a room's raid (startRaid), stepped by the bot's clock with every player's inputs as
 * it relays them to the pages, so how it ends is the bot's own word; a raid played over from its inputs (replay); and
 * what the bot says of the fight's heroes, sets, unique weapons and additional skills, as the fight has them. Built
 * into one file for the bot (scripts/sync.mjs writes it to the bot's vendor/), so everything it says of itself is
 * here, written out (its types name nothing of the rest of the site).
 */

/** The sim's version: a hash of it (./version.ts), so any change to it is another (a page whose sim isn't the bot's is told to reload). */
export const SIM_VERSION: string = VERSION;

/** Seconds in a step, and the most steps a raid can take (the raid's time, and the boss's rage after it). */
export const STEP_SECONDS: number = TICK;
export const MOST_TICKS: number = Math.ceil((MARCH + RAID_TIME + RAGE_WIPE) / TICK) + 1;
/** The most inputs a raid is taken with (more than anyone presses in its time). */
export const MOST_INPUTS = 20_000;
/**
 * The most stages any boss of the TechnoMagic Raid or the Dragon Raid has, in either mode (each boss's own: BossInfo.stages, and
 * its Normal mode's: BossInfo.normal). Divine Punishment's levels are apart: DIVINE_LEVELS.
 */
export const MOST_STAGE: number = Math.max(...[...TM_BOSSES, ...DRAGONS].flatMap((boss) => [stagesOf(boss), ...(boss.normal ? [stagesOf(boss.normal)] : [])]));

/**
 * A hero in a raid: its id, the index of its skin, what its gear gives it (the bot's HeroBonus), the TechnoMagic
 * set whose effect it has (three pieces worn), or none, its own unique weapon's tier (its refinement, 1
 * to 5), or none, the additional skill of each piece of TechnoMagic gear it wears (TM_SKILLS' ids), and whether it
 * is in the Sub Team (a raid fought alone: on Auto for the whole fight).
 */
export interface RunHero {
  id: string;
  skin: number;
  gear: Readonly<Record<string, number>>;
  set?: string | null;
  uw?: number | null;
  skills?: readonly string[] | null;
  sub?: boolean;
  /** Its transcendence perks (the bot's ids). */
  perks?: readonly string[] | null;
  /** Its main unique treasure: which of its four (1 to 4: UT1 to UT4), at which tier (its refinement, 1 to 5); or none. Its sub treasures' options are in `gear`. */
  ut?: { skill: number; tier: number } | null;
  /** Its artifact: which (KR_ARTIFACTS' id), at which tier (its refinement, 1 to 5); or none. */
  artifact?: { id: string; tier: number } | null;
  /**
   * For each Rune of Blasphemy it wears, the line for its class (KR_BLASPHEMY's lines' `skill`) and its rolled value (between the
   * line's min and max): what it does in the fight (./blasphemy.ts). Its main option is in `gear`.
   */
  blasphemy?: readonly { skill: string; value: number }[] | null;
}

/**
 * What a hero's unique treasure (its `skill`th: 1 to 4, UT1 to UT4) does at a tier (1 to 5) as its main treasure, as the
 * bot says it: its name, and King's Raid's words with the fight's numbers (null: no such hero or treasure).
 */
export const uniqueTreasureText = (hero: string, skill: number, tier: number): { name: string; text: string } | null =>
  treasureAbout(
    HEROES.find((one) => one.id === hero),
    skill,
    tier,
  );

/** The heroes that have a unique weapon, by id; and what one's does at a tier (1 to 5), as the bot says it: null for a hero with none. */
export const UNIQUE_WEAPON_HEROES: readonly string[] = UNIQUE_HEROES;
export const uniqueWeaponText = (hero: string, tier: number): string | null => uniqueAbout(hero, tier);

/** One of TechnoMagic gear's additional skills: its id, its name, its tier on the tier list (S down to F), and what it does. */
export interface TmSkill {
  id: string;
  name: string;
  tier: string;
  about: string;
}

/** Every additional skill a piece of TechnoMagic gear may come with (one, rolled as it drops: each as likely); and the most a hero has. */
export const TM_SKILLS: readonly TmSkill[] = SKILLS.map(({ id, name, tier, about }) => ({ id, name, tier, about }));
export const MOST_TM_SKILLS: number = MOST_SKILLS;

/**
 * A raid as the bot gave it to the pages: the boss, the seed, the stage, its heroes in order, whether it is fought alone (the
 * boss easier), and against which of the boss's modes (a dragon's Normal mode, or its Hard; none said: Hard, the only one most have).
 */
export interface Run {
  boss: string;
  seed: number;
  stage: number;
  heroes: readonly RunHero[];
  solo?: boolean;
  mode?: BossMode;
  /** A Divine Punishment boss's run (one of DIVINE_INFO's: required for them, startRaid's 'divine' without it): see DivineRun. */
  divine?: DivineRun;
}

/** How a raid played over went. */
export interface Replay {
  /** Won, lost, or (the inputs or the run making no sense) 'invalid'. */
  result: 'won' | 'lost' | 'invalid';
  /** Why it was invalid. */
  reason?: string;
  /** Steps it took, and the checksum at the end of each second. */
  ticks: number;
  sums: number[];
  /** The first second (from 1) whose checksum differs from the page's `sums` (null: none differs). */
  parted: number | null;
  /** What each hero's blows took of the boss, by its place in the run. */
  dealt: number[];
  /** A karma dungeon's: the waves cleared and the Karma Gauge's points as it ended. */
  karma?: KarmaOutcome;
}

/** A hero there is (the bot sells it, and the heroes page gears it): its id, its name, its class, and how many skins it has (its own first). */
export interface TmHero {
  id: string;
  name: string;
  class: string;
  /** The kind of damage its blows deal. */
  deals: DamageType;
  skins: number;
  /** Its skins' names, by their index (its own first): the others are its outfits, bought and worn on the site. */
  outfits: string[];
  /** Its three skills, then its passive: as the heroes page says them (King's Raid's words, with the fight's numbers). */
  skills: TmHeroSkill[];
  /** Its four unique treasures' names (UT1 to UT4: its skills', then its passive's). */
  treasures: string[];
}

/**
 * A hero's skill as the heroes page says it: its name; its mana cost and cooldown (seconds; a passive has neither);
 * what its tag says besides its cost, where not its cooldown (or, a passive's, where not "Passive"); and its words.
 */
export interface TmHeroSkill {
  name: string;
  cost: number | null;
  cooldown: number | null;
  tag: string | null;
  text: string;
}

/**
 * What a hero's perks (the bot's ids) give its own stats, as gear's bonus has them (shares of ATK, max HP and crit DMG;
 * chances and the like in points, 10 to 1%), and Offensive Guard's ATK from its physical defense (a share of it): for
 * its Perk Effects on the heroes page. Null: no such hero.
 */
export function tmPerkStats(hero: string, perks: readonly string[]): { bonus: Readonly<Record<string, number>>; atkFromDefense: number } | null {
  const def = HEROES.find((one) => one.id === hero);
  return def ? perkStats(perksOf(perks, def).values()) : null;
}

/** The heroes there are, in the order of their cards; and the bosses, by id. */
export const TM_HEROES: readonly TmHero[] = HEROES.map((hero) => ({
  id: hero.id,
  name: hero.name,
  class: hero.class,
  deals: hero.stats.deals,
  skins: hero.skins.length,
  outfits: [...hero.skins],
  skills: [
    ...hero.abilities.map(({ name, cost, cooldown, tag, words, about }) => ({ name, cost, cooldown, tag: tag ?? null, text: words ?? about ?? '' })),
    ...(hero.passive ? [{ name: hero.passive.shown.name, cost: null, cooldown: null, tag: hero.passive.tag ?? null, text: hero.passive.words ?? hero.passive.shown.about ?? '' }] : []),
  ],
  treasures: (hero.treasures ?? []).map((one) => one.name),
}));
export const BOSS_IDS: readonly string[] = BOSSES.map((boss) => boss.id);

/** Which of a boss's modes a raid is against (./bosses/boss.ts BossMode): a dragon's Normal mode, or its Hard. */
export type BossMode = 'normal' | 'hard';

/** A boss as the bot says it: its id, its name and how many stages it has (in its Hard mode); and, one with a Normal mode, how many that has. */
export interface BossInfo {
  id: string;
  name: string;
  stages: number;
  normal?: number;
}
const infoOf = (boss: BossDef): BossInfo => ({ id: boss.id, name: boss.name, stages: stagesOf(boss), ...(boss.normal && { normal: stagesOf(boss.normal) }) });
/** The TechnoMagic Raid's bosses, and the Dragon Raid's dragons, in order. */
export const TM_BOSS_INFO: readonly BossInfo[] = TM_BOSSES.map(infoOf);
export const DRAGON_INFO: readonly BossInfo[] = DRAGONS.map(infoOf);

/** A TechnoMagic set as the fight has it: its id, name and icon, and what it does for a hero of each class wearing three of its pieces (by class; one it does nothing for left out). */
export interface TmSetInfo {
  id: string;
  name: string;
  icon: string;
  effects: Readonly<Record<string, string>>;
}

export const TM_SET_INFO: readonly TmSetInfo[] = SET_INFO;

/** How many of a TechnoMagic set's pieces a hero wears for its effect. */
export const TM_SET_PIECES: number = SET_PIECES;

/**
 * King's Raid's hero gear as the TechnoMagic Raid has it (./gear/kr-data.ts, from the CBT2 playtest's tables): the pieces,
 * their option pools, the sets' bonuses, the unique options, the runes, and how refinement raises a main stat. The bot
 * makes its items, drops and copies of them; the fight is given what they add up to (RunHero.gear, set, artifact).
 */
export type KrPart = 'weapon' | 'armor' | 'secondary' | 'accessory' | 'orb';
export type KrMainStat = 'atk' | 'hp' | 'defPhysical' | 'defMagical';

/** An option a piece may roll: its stat (a gear stat's id), the share it gives (from min to max, in `steps` steps), and how likely it is next to the others. */
export interface KrOptionData {
  stat: string;
  min: number;
  max: number;
  steps: number;
  weight: number;
}

/**
 * A piece of hero gear: its id, KR code and name, its set and tier, its part (an accessory's kind, an armor's weight), who
 * wears it (class ids), its main stat's base, its option pool and how many options it rolls, whether it has a unique option
 * (the additional skills: TM_SKILLS), its rune sockets, and its icon (Koma-UI's public/kr/items/<icon>.webp).
 */
export interface KrPieceData {
  id: string;
  code: string;
  name: string;
  set: string;
  tier: number;
  part: KrPart;
  kind?: string;
  classes: readonly string[];
  main: readonly [KrMainStat, number];
  pool: string;
  options: number;
  unique?: boolean;
  runes: number;
  icon: string;
}

/** A set's bonuses: a dragon set's 2- and 4-piece stats (both at 4: shares, by gear stat), a TechnoMagic set's 4-piece skill for each class and King's Raid's words for it. */
export interface KrSetData {
  name: string;
  two?: Readonly<Record<string, number>>;
  four: Readonly<Record<string, number>> | Readonly<Record<string, { skill: number; text: string }>>;
  detail?: number;
}

/** A rune: its id, KR code and name, grade (1 Common to 6 Legendary; Ancient and Velkazar 5), colour, the parts it goes in, its stats (shares, by gear stat) and icon. */
export interface KrRuneData {
  id: string;
  code: string;
  name: string;
  grade: number;
  color: string;
  parts: readonly KrPart[];
  stats: Readonly<Record<string, number>>;
  icon: string;
  ancient?: boolean;
}

export const KR_PIECES: readonly KrPieceData[] = PIECES;
export const KR_POOLS: Readonly<Record<string, readonly KrOptionData[]>> = POOLS;
/** A main stat's base, times its refinement's factor (R1 to R5: thousandths, at max level) for its kind of stat. */
export const KR_REFINE: { readonly atk: readonly number[]; readonly hp: readonly number[]; readonly def: readonly number[] } = REFINE;
export const KR_SETS: Readonly<Record<string, KrSetData>> = SETS;
export const KR_RUNES: readonly KrRuneData[] = RUNES;
/** The TechnoMagic gear's unique options (King's Raid's 47), by number: the additional skill each is, and King's Raid's words and numbers. */
export const KR_UNIQUE: readonly { n: number; skill: string | null; text: string; params: readonly string[] }[] = UNIQUE;

/** An artifact the fight has a use for (./artifacts.ts): its id, KR code and name, icon, and what it does at R1 to R5 in King's Raid's words. */
export interface TmArtifactInfo {
  id: string;
  code: string;
  name: string;
  icon: string;
  text: readonly string[];
}

export const TM_ARTIFACTS: readonly TmArtifactInfo[] = KR_ARTIFACTS.filter((one) => one.id in ARTIFACTS).map(({ id, code, name, icon, text }) => ({
  id,
  code,
  name,
  icon,
  text: (text ?? []).map((line) => line ?? ''),
}));

/**
 * An input of the page's, as a raid takes it: a skill pressed, a hero's Auto, every hero's Auto, leaving, or a karma dungeon's
 * card picked (`card`: its place among the three offered) (with the step it came before).
 */
export interface RunInput {
  tick: number;
  kind: 'skill' | 'auto' | 'all-auto' | 'leave' | 'card';
  fighter?: number;
  skill?: number;
  card?: 0 | 1 | 2;
}

const RAID_KINDS = new Set(['skill', 'auto', 'all-auto', 'leave', 'card']);
const whole = (n: unknown, below: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < below;

/**
 * The page's inputs, as they are taken (null: something in them makes no sense). Only what a raid takes, before step `most` (none
 * said: MOST_TICKS; a Divine Punishment run's own: mostTicks).
 */
export function readInputs(raw: unknown, heroes: number, most: number = MOST_TICKS): RunInput[] | null {
  if (!Array.isArray(raw) || raw.length > MOST_INPUTS) return null;
  const inputs: RunInput[] = [];
  let last = 0;
  for (const one of raw as unknown[]) {
    if (typeof one !== 'object' || one === null) return null;
    const { tick, kind, fighter, skill, card } = one as Record<string, unknown>;
    if (!whole(tick, most) || tick < last || typeof kind !== 'string' || !RAID_KINDS.has(kind)) return null;
    last = tick;
    if (kind === 'skill') {
      if (!whole(fighter, heroes) || !whole(skill, 16)) return null;
      inputs.push({ tick, kind: 'skill', fighter, skill });
    } else if (kind === 'auto') {
      if (!whole(fighter, heroes)) return null;
      inputs.push({ tick, kind: 'auto', fighter });
    } else if (kind === 'card') {
      if (!whole(card, 3)) return null;
      inputs.push({ tick, kind: 'card', card: card as 0 | 1 | 2 });
    } else inputs.push({ tick, kind: kind as RunInput['kind'] });
  }
  return inputs;
}

/** A raid being fought, step by step: what the bot runs a room's fight with (each page runs its own, with the same inputs). */
export interface LiveRaid {
  /** Steps taken so far, and how the raid ended (null: it hasn't). */
  readonly tick: number;
  readonly result: 'won' | 'lost' | null;
  /** The checksum at the end of each second so far. */
  readonly sums: readonly number[];
  /** Something a player does, counting from the next step (false: it makes no sense in a raid). */
  input(input: Omit<RunInput, 'tick'>): boolean;
  /** One step on. */
  step(): void;
  /** Whether each hero's Auto is on, and what each hero's blows have taken of the boss, by its place in the run. */
  autos(): boolean[];
  dealt(): number[];
  /** A karma dungeon's waves cleared and Karma Gauge so far (null: the raid is none). */
  karma(): KarmaOutcome | null;
}

/** A raid ready to be fought (a string: why the run makes no sense). */
export function startRaid(run: Run): LiveRaid | string {
  if (!Number.isInteger(run.seed)) return 'seed';
  const found = BOSSES.find((one) => one.id === run.boss);
  if (!found) return 'boss';
  if (run.mode !== undefined && run.mode !== 'hard' && !(run.mode === 'normal' && found.normal)) return 'mode';
  const divine = DIVINE_DEFS.find((one) => one.def.id === found.id);
  // (A Divine Punishment boss: its run as the bot gives it, read, and its fight as that has it.)
  const fight = divine ? divineOf(divine, run) : null;
  if (fight === 'divine') return 'divine';
  const boss = fight ?? bossIn(found, run.mode);
  if (!whole(run.stage - 1, stagesOf(boss))) return 'stage';
  if (run.heroes.length === 0 || run.heroes.length > MOST) return 'heroes';
  // (Divine Punishment's: King's Raid's 4 Main and 4 Sub; a karma dungeon's 3, one of a class at most. Fought alone.)
  if (divine && run.heroes.length > (divine.kind === 'karma' ? KARMA_HEROES : DIVINE_HEROES)) return 'heroes';
  const solo = run.solo === true || divine !== undefined;
  const entries = [];
  for (const hero of run.heroes) {
    const def = HEROES.find((one) => one.id === hero.id);
    if (!def || !whole(hero.skin, def.skins.length)) return 'hero';
    const gear: Record<string, number> = {};
    for (const [stat, n] of Object.entries(hero.gear)) if (Number.isFinite(n)) gear[stat] = n;
    const skills = Array.isArray(hero.skills) ? hero.skills.filter((id): id is string => typeof id === 'string') : [];
    const perks = Array.isArray(hero.perks) ? hero.perks.filter((id): id is string => typeof id === 'string') : [];
    const ut = hero.ut && typeof hero.ut.skill === 'number' && typeof hero.ut.tier === 'number' ? { skill: hero.ut.skill, tier: hero.ut.tier } : null;
    const artifact = hero.artifact && typeof hero.artifact.id === 'string' && typeof hero.artifact.tier === 'number' ? { id: hero.artifact.id, tier: hero.artifact.tier } : null;
    const blasphemy = Array.isArray(hero.blasphemy) ? hero.blasphemy.filter((one) => typeof one?.skill === 'string' && Number.isFinite(one.value)).map(({ skill, value }) => ({ skill, value })) : [];
    entries.push({ def, skin: hero.skin, gear, set: typeof hero.set === 'string' ? hero.set : null, uw: typeof hero.uw === 'number' ? hero.uw : null, skills, sub: solo && hero.sub === true, perks, ut, artifact, blasphemy });
  }
  if (divine?.kind === 'karma' && new Set(entries.map((one) => one.def.class)).size < entries.length) return 'heroes';
  const sim = makeSim({ boss, heroes: entries, seed: run.seed, stage: run.stage, raid: true, solo });
  const heroes = entries.length;
  const most = mostTicks(run);
  return {
    get tick() {
      return sim.tick;
    },
    get result() {
      return sim.result;
    },
    get sums() {
      return sim.sums;
    },
    input(input) {
      const read = readInputs([{ ...input, tick: 0 }], heroes, most);
      if (!read?.[0]) return false;
      const { tick: _tick, ...valid } = read[0];
      sim.input(valid as Input);
      return true;
    },
    step() {
      sim.step();
      sim.events.length = 0;
    },
    autos: () => sim.fighters.map((fighter) => fighter.auto),
    dealt: () => sim.fighters.map((fighter) => fighter.dealt),
    karma() {
      const state = sim.karma();
      return state ? { waves: state.cleared, gauge: state.gauge } : null;
    },
  };
}

const invalid = (reason: string): Replay => ({ result: 'invalid', reason, ticks: 0, sums: [], parted: null, dealt: [] });

/** Plays a raid over with the page's inputs (and, to say where it parts from the page's, its checksums). */
export function replay(run: Run, rawInputs: unknown, pageSums: readonly number[] = []): Replay {
  const raid = startRaid(run);
  if (typeof raid === 'string') return invalid(raid);
  const most = mostTicks(run);
  const inputs = readInputs(rawInputs, run.heroes.length, most);
  if (!inputs) return invalid('inputs');
  let next = 0;
  while (!raid.result && raid.tick < most) {
    while (next < inputs.length && (inputs[next] as RunInput).tick === raid.tick) {
      const { tick: _tick, ...input } = inputs[next] as RunInput;
      raid.input(input);
      next++;
    }
    raid.step();
  }
  const sums = [...raid.sums];
  const at = sums.findIndex((sum, i) => i < pageSums.length && pageSums[i] !== sum);
  const karma = raid.karma();
  return { result: raid.result ?? 'lost', ticks: raid.tick, sums, parted: at < 0 ? null : at + 1, dealt: raid.dealt(), ...(karma && { karma }) };
}

/*
 * King's Raid's Divine Punishment Raid (./bosses/divine/), as the bot has it: its bosses, fought alone, each run saying which
 * group's it is, its Infinite level, the side bosses cleared in its opening (for a final boss) and the shards brought; the karma
 * dungeons' outcome (waves cleared, the Karma Gauge) and what their gauge fills; and the Runes of Blasphemy.
 */

export type DivineGroup = 'apocalypsion' | 'solenis';
/** A side boss (a dragon, a mid-boss), a group's final boss, or its karma dungeon. */
export type DivineKind = 'side' | 'final' | 'karma';
/** A Divine Punishment boss: its id (a Run's boss), name, group and kind, and how long its raid lasts (seconds: a karma dungeon's before its 10 of rage). */
export interface DivineBossInfo {
  id: string;
  name: string;
  group: DivineGroup;
  kind: DivineKind;
  time: number;
}
/** Every Divine Punishment boss: Apocalypsion's four dragons and her, Solenis' two mid-bosses and her, and the two karma dungeons. */
export const DIVINE_INFO: readonly DivineBossInfo[] = DIVINE_DEFS.map(({ def, group, kind }) => ({ id: def.id, name: def.name, group, kind, time: def.time ?? RAID_TIME }));
/** The highest Infinite level the sim has numbers for. */
export const DIVINE_LEVELS: number = LEVELS;

/**
 * A Divine Punishment run: its group (the boss's); its Infinite level (a boss dungeon's, 1 to DIVINE_LEVELS: the Run's stage too;
 * a karma dungeon has none); the side bosses cleared this opening (a final boss's: their ids, Apocalypsion's dragons two at most);
 * the Full Shards brought (a boss dungeon's, of its group's: their tier and how many) and the Empty Shards (a karma dungeon's,
 * tier 2 to 5: tier 1 is free and unlimited, as none).
 */
export interface DivineRun {
  group: DivineGroup;
  level?: number;
  cleared?: readonly string[];
  shard?: { tier: 1 | 2 | 3 | 4 | 5; count: number } | null;
  empty?: { tier: 2 | 3 | 4 | 5; count: number } | null;
}

/** The heroes in a Divine Punishment boss dungeon (King's Raid's 4 Main and 4 Sub) and in a karma dungeon, at most. */
const DIVINE_HEROES = 8;
const KARMA_HEROES = 3;
/** The most Full or Empty Shards a run is taken with (more than anyone has: a bound). */
const MOST_SHARDS = 999;

const tierOf = (n: unknown, from: number): boolean => typeof n === 'number' && Number.isInteger(n) && n >= from && n <= 5;
const countOf = (n: unknown, least: number): boolean => typeof n === 'number' && Number.isInteger(n) && n >= least && n <= MOST_SHARDS;

/** A Divine Punishment boss's fight as `run` has it ('divine': its run is missing, or makes no sense). */
function divineOf(one: DivineDef, run: Run): BossDef | 'divine' {
  const divine = run.divine as Partial<DivineRun> | undefined;
  if (!divine || typeof divine !== 'object' || divine.group !== one.group) return 'divine';
  if (one.kind !== 'karma' && (!whole((divine.level ?? 0) - 1, LEVELS) || divine.level !== run.stage)) return 'divine';
  const sides = DIVINE_SIDES[one.group];
  const cleared = divine.cleared ?? [];
  if (!Array.isArray(cleared) || !cleared.every((id) => typeof id === 'string' && sides.includes(id))) return 'divine';
  const known = one.kind === 'final' ? [...new Set(cleared as string[])] : [];
  // (Apocalypsion's dragons: two at most cleared an opening.)
  if (one.group === 'apocalypsion' && known.length > 2) return 'divine';
  const { shard, empty } = divine;
  if (shard !== undefined && shard !== null && (typeof shard !== 'object' || !tierOf(shard.tier, 1) || !countOf(shard.count, 1))) return 'divine';
  if (empty !== undefined && empty !== null && (typeof empty !== 'object' || !tierOf(empty.tier, 2) || !countOf(empty.count, 0))) return 'divine';
  return divineFight(one, known, one.kind !== 'karma' && shard ? { tier: shard.tier, count: shard.count } : null);
}

/**
 * The most steps a run can take: MOST_TICKS for the TechnoMagic Raid and the Dragon Raid (Ascalon's, each of his waves' time and
 * rage, and the runs on between them); a Divine Punishment boss's, its own
 * time and rage (Armarta's 600 seconds, Luciteron's 120 and none), and a karma dungeon's with its card picks besides (the fight
 * stands still while the heroes pick: as many as its most waves). Its inputs are read up to it (readInputs), and a replay goes on
 * to it.
 */
export function mostTicks(run: Pick<Run, 'boss'>): number {
  const found = DIVINE_DEFS.find((one) => one.def.id === run.boss)?.def;
  // (A boss whose every wave has the raid's whole time of its own, Ascalon's: all of them, and the heroes' runs on between them.)
  const waved = found ? undefined : TM_BOSSES.find((one) => one.id === run.boss && one.waves?.perWave);
  if (waved?.waves) {
    const waves = 1 + Math.max(...Array.from({ length: stagesOf(waved) }, (_, i) => waved.waves?.at(i + 1).length ?? 0));
    return Math.ceil((MARCH + waves * ((waved.time ?? RAID_TIME) + (waved.rage ?? RAGE_WIPE) + 1) + (waves - 1) * RUN_ON) / TICK) + 1;
  }
  if (!found) return MOST_TICKS;
  const picks = found.karma ? found.karma.most * (found.karma.pick + 1) : 0;
  // (And the boss's flight off and the heroes' run on to its next wave, which a fight ends only after; and a second more: the
  // raid's clock is summed a step at a time, a hair short of its seconds.)
  return Math.ceil((MARCH + (found.time ?? RAID_TIME) + (found.outlast ? 0 : (found.rage ?? RAGE_WIPE)) + picks + FLY_OFF + RUN_ON + 1) / TICK) + 1;
}

/** How a karma run went: the waves cleared, and the Karma Gauge's points. */
export interface KarmaOutcome {
  waves: number;
  gauge: number;
}

/** What a karma run's gauge fills: the Empty Shards brought used up, and the Full Shards made, by tier. */
export interface ShardFill {
  empty: number;
  full: Record<1 | 2 | 3 | 4 | 5, number>;
}

/** Each tier's Empty Shard's FlaskGauge (ShardFlaskItemTable, both groups alike): the gauge points that fill one. */
export const SHARD_GAUGE: Readonly<Record<1 | 2 | 3 | 4 | 5, number>> = { 1: 500, 2: 1200, 3: 2200, 4: 4500, 5: 10_000 };

/**
 * What a karma run's gauge fills, as King's Raid's PunishmentHelper.GetFullFlask has it: the Empty Shards brought (a tier 2 to 5)
 * first, as many as the gauge fills (floor(gauge / its FlaskGauge)) and no more than were brought; the rest into free Tier 1
 * Shards, 500 each. As the game's: one brought that the gauge fills none of gives nothing at all, not even Tier 1 Shards (its
 * `selectedFullFlaksCount <= 0` return; its AnyFlaskCollected counts that run as failed too).
 */
export function fillShards(gauge: number, empty: DivineRun['empty']): ShardFill {
  const full: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let left = Number.isFinite(gauge) ? Math.max(0, gauge) : 0;
  let used = 0;
  if (empty && tierOf(empty.tier, 2)) {
    used = Math.min(Math.floor(left / SHARD_GAUGE[empty.tier]), Math.max(0, Math.floor(empty.count)));
    if (used <= 0) return { empty: 0, full };
    full[empty.tier] = used;
    left -= used * SHARD_GAUGE[empty.tier];
  }
  full[1] = Math.floor(left / SHARD_GAUGE[1]);
  return { empty: used, full };
}

/** A Rune of Blasphemy's extra skill for a class group: its id (RunHero.blasphemy's skill), its rolled value's range, and King's Raid's words, {v} for the value. */
export interface BlasphemyLine {
  skill: string;
  min: number;
  max: number;
  text: string;
}

/**
 * A Rune of Blasphemy (./gear/blasphemy.ts: King's Raid's PunishmentRuneTable): its id, KR code and name; the group whose Blood
 * crafts it; its socket (a unique weapon's Doh, Laz, Geb; an armor's Oth; a secondary's Ans); its colour; the Legendary rune
 * it is crafted from (KR_RUNES' id: its main option's stat); its main option (a gear stat, its share from min to max); its three
 * lines (Warrior and Knight; Archer, Assassin and Mechanic; Wizard and Priest); its icon (its code: not cut yet).
 */
export interface BlasphemyRuneData {
  id: string;
  code: string;
  name: string;
  group: DivineGroup;
  socket: 'doh' | 'laz' | 'geb' | 'oth' | 'ans';
  color: string;
  legend: string;
  main: { stat: string; min: number; max: number };
  lines: readonly [BlasphemyLine, BlasphemyLine, BlasphemyLine];
  icon: string;
}

export const KR_BLASPHEMY: readonly BlasphemyRuneData[] = BLASPHEMY;

