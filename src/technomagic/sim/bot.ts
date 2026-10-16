import { BOSSES } from './bosses';
import type { Input } from './events';
import { makeSim } from './fight';
import { HEROES } from './heroes';
import { perkStats, perksOf } from './perks';
import { MARCH, MOST, RAGE_WIPE, RAID_TIME, STAGES, TICK } from './rules';
import { SET_INFO } from './sets';
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
  /** Its transcendence perks (the bot's ids). */
  perks?: readonly string[] | null;
  /** Its main unique treasure: which of its four (1 to 4: UT1 to UT4), at which tier (its refinement, 1 to 5); or none. Its sub treasures' options are in `gear`. */
  ut?: { skill: number; tier: number } | null;
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

/** A hero there is (the bot sells it, and the heroes page gears it): its id, its name, its class, and how many skins it has (its own first). */
export interface TmHero {
  id: string;
  name: string;
  class: string;
  skins: number;
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
  skins: hero.skins.length,
  skills: [
    ...hero.abilities.map(({ name, cost, cooldown, tag, words, about }) => ({ name, cost, cooldown, tag: tag ?? null, text: words ?? about ?? '' })),
    ...(hero.passive ? [{ name: hero.passive.shown.name, cost: null, cooldown: null, tag: hero.passive.tag ?? null, text: hero.passive.words ?? hero.passive.shown.about ?? '' }] : []),
  ],
  treasures: (hero.treasures ?? []).map((one) => one.name),
}));
export const BOSS_IDS: readonly string[] = BOSSES.map((boss) => boss.id);

/** A TechnoMagic set as the fight has it: its id, name and icon, and what it does for a hero of each class wearing three of its pieces (by class; one it does nothing for left out). */
export interface TmSetInfo {
  id: string;
  name: string;
  icon: string;
  effects: Readonly<Record<string, string>>;
}

export const TM_SET_INFO: readonly TmSetInfo[] = SET_INFO;

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
    const perks = Array.isArray(hero.perks) ? hero.perks.filter((id): id is string => typeof id === 'string') : [];
    const ut = hero.ut && typeof hero.ut.skill === 'number' && typeof hero.ut.tier === 'number' ? { skill: hero.ut.skill, tier: hero.ut.tier } : null;
    entries.push({ def, skin: hero.skin, gear, set: typeof hero.set === 'string' ? hero.set : null, uw: typeof hero.uw === 'number' ? hero.uw : null, skills, sub: run.solo === true && hero.sub === true, perks, ut });
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
