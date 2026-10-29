import { BOSSES, DRAGONS, TM_BOSSES } from './bosses';
import { bossIn, stagesOf, type BossDef } from './bosses/boss';
import type { DamageType } from './combat/damage';
import type { Input } from './events';
import { makeSim } from './fight';
import { HEROES } from './heroes';
import { perkStats, perksOf } from './perks';
import { MARCH, MOST, RAGE_WIPE, RAID_TIME, TICK } from './rules';
import { ARTIFACTS } from './artifacts';
import { KR_ARTIFACTS, KR_PIECES as PIECES, KR_POOLS as POOLS, KR_REFINE as REFINE, KR_RUNES as RUNES, KR_SETS as SETS, KR_UNIQUE as UNIQUE } from './gear/kr-data';
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
/** The most stages any boss has, in either mode (each boss's own: BossInfo.stages, and its Normal mode's: BossInfo.normal). */
export const MOST_STAGE: number = Math.max(...BOSSES.flatMap((boss) => [stagesOf(boss), ...(boss.normal ? [stagesOf(boss.normal)] : [])]));

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
/** The TechnoMagic gear's unique options (King's Raid's 47), by number: the additional skill each is (null: none), and King's Raid's words and numbers. */
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

/** An input of the page's, as a raid takes it: a skill pressed, a hero's Auto, every hero's Auto, or leaving (with the step it came before). */
export interface RunInput {
  tick: number;
  kind: 'skill' | 'auto' | 'all-auto' | 'leave';
  fighter?: number;
  skill?: number;
}

const RAID_KINDS = new Set(['skill', 'auto', 'all-auto', 'leave']);
const whole = (n: unknown, below: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < below;

/** The page's inputs, as they are taken (null: something in them makes no sense). Only what a raid takes. */
export function readInputs(raw: unknown, heroes: number): RunInput[] | null {
  if (!Array.isArray(raw) || raw.length > MOST_INPUTS) return null;
  const inputs: RunInput[] = [];
  let last = 0;
  for (const one of raw as unknown[]) {
    if (typeof one !== 'object' || one === null) return null;
    const { tick, kind, fighter, skill } = one as Record<string, unknown>;
    if (!whole(tick, MOST_TICKS) || tick < last || typeof kind !== 'string' || !RAID_KINDS.has(kind)) return null;
    last = tick;
    if (kind === 'skill') {
      if (!whole(fighter, heroes) || !whole(skill, 16)) return null;
      inputs.push({ tick, kind: 'skill', fighter, skill });
    } else if (kind === 'auto') {
      if (!whole(fighter, heroes)) return null;
      inputs.push({ tick, kind: 'auto', fighter });
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
}

/** A raid ready to be fought (a string: why the run makes no sense). */
export function startRaid(run: Run): LiveRaid | string {
  if (!Number.isInteger(run.seed)) return 'seed';
  const found = BOSSES.find((one) => one.id === run.boss);
  if (!found) return 'boss';
  if (run.mode !== undefined && run.mode !== 'hard' && !(run.mode === 'normal' && found.normal)) return 'mode';
  const boss = bossIn(found, run.mode);
  if (!whole(run.stage - 1, stagesOf(boss))) return 'stage';
  if (run.heroes.length === 0 || run.heroes.length > MOST) return 'heroes';
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
    entries.push({ def, skin: hero.skin, gear, set: typeof hero.set === 'string' ? hero.set : null, uw: typeof hero.uw === 'number' ? hero.uw : null, skills, sub: run.solo === true && hero.sub === true, perks, ut, artifact });
  }
  const sim = makeSim({ boss, heroes: entries, seed: run.seed, stage: run.stage, raid: true, solo: run.solo === true });
  const heroes = entries.length;
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
      const read = readInputs([{ ...input, tick: 0 }], heroes);
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
  };
}

const invalid = (reason: string): Replay => ({ result: 'invalid', reason, ticks: 0, sums: [], parted: null, dealt: [] });

/** Plays a raid over with the page's inputs (and, to say where it parts from the page's, its checksums). */
export function replay(run: Run, rawInputs: unknown, pageSums: readonly number[] = []): Replay {
  const raid = startRaid(run);
  if (typeof raid === 'string') return invalid(raid);
  const inputs = readInputs(rawInputs, run.heroes.length);
  if (!inputs) return invalid('inputs');
  let next = 0;
  while (!raid.result && raid.tick < MOST_TICKS) {
    while (next < inputs.length && (inputs[next] as RunInput).tick === raid.tick) {
      const { tick: _tick, ...input } = inputs[next] as RunInput;
      raid.input(input);
      next++;
    }
    raid.step();
  }
  const sums = [...raid.sums];
  const at = sums.findIndex((sum, i) => i < pageSums.length && pageSums[i] !== sum);
  return { result: raid.result ?? 'lost', ticks: raid.tick, sums, parted: at < 0 ? null : at + 1, dealt: raid.dealt() };
}
