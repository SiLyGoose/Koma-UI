import { BOSSES } from './bosses';
import type { Input } from './events';
import { makeSim } from './fight';
import { HEROES } from './heroes';
import { MOST, RAGE_WIPE, RAID_TIME, STAGES, TICK } from './rules';
import { MOST_SKILLS, SKILLS } from './skills';
import { UNIQUE_HEROES, uniqueAbout } from './unique';

/*
 * The fight as the bot runs it: a room's raid (startRaid), stepped by the bot's clock with every player's
 * inputs as it relays them to the pages, so how it ends is the bot's own word; and a raid played over from
 * its inputs (replay). Built into one file for the bot (scripts/build-sim.mjs writes it to the bot's
 * vendor/), so everything it says of itself is here, written out (its types name nothing of the rest of the site).
 *
 * SIM_VERSION is to go up with anything that changes how a fight goes (a rule, a skill, a stat, a move's
 * timing): a page whose sim isn't the bot's version is told to reload.
 */

export const SIM_VERSION = 15;

/** Seconds in a step, and the most steps a raid can take (the raid's time, and the boss's rage after it). */
export const STEP_SECONDS: number = TICK;
export const MOST_TICKS: number = Math.ceil((RAID_TIME + RAGE_WIPE) / TICK) + 1;
/** The most inputs a raid is taken with (more than anyone presses in its time). */
export const MOST_INPUTS = 20_000;
export const MOST_STAGE: number = STAGES;

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
}

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

/** A raid as the bot gave it to the pages: the boss, the seed, the stage, its heroes in order, and whether it is fought alone (the boss easier). */
export interface Run {
  boss: string;
  seed: number;
  stage: number;
  heroes: readonly RunHero[];
  solo?: boolean;
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

/** The heroes and bosses there are, by id, and how many skins each hero has. */
export const HERO_SKINS: Readonly<Record<string, number>> = Object.fromEntries(HEROES.map((hero) => [hero.id, hero.skins.length]));
export const BOSS_IDS: readonly string[] = BOSSES.map((boss) => boss.id);

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
  const boss = BOSSES.find((one) => one.id === run.boss);
  if (!boss) return 'boss';
  if (!whole(run.stage - 1, STAGES)) return 'stage';
  if (run.heroes.length === 0 || run.heroes.length > MOST) return 'heroes';
  const entries = [];
  for (const hero of run.heroes) {
    const def = HEROES.find((one) => one.id === hero.id);
    if (!def || !whole(hero.skin, def.skins.length)) return 'hero';
    const gear: Record<string, number> = {};
    for (const [stat, n] of Object.entries(hero.gear)) if (Number.isFinite(n)) gear[stat] = n;
    const skills = Array.isArray(hero.skills) ? hero.skills.filter((id): id is string => typeof id === 'string') : [];
    entries.push({ def, skin: hero.skin, gear, set: typeof hero.set === 'string' ? hero.set : null, uw: typeof hero.uw === 'number' ? hero.uw : null, skills, sub: run.solo === true && hero.sub === true });
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
