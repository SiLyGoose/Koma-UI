import { alliesFrom, artifactBuff, artifactHooks, artifactOf, artifactStats, at, type ArtifactHooks } from './artifacts';
import { scaleAt, stagesOf, type BossDef, type BossPart, type Warning } from './bosses/boss';
import { ATK, CURVE, curved, HERO_LEVEL, NONE, POINTS, reachAt, share, SLOWEST, strike } from './combat/damage';
import { accurate, adding, amplified, away, blocking, bolstering, bound, critDamaging, critResisting, critTaking, critting, dealing, deals, defending, defends, dodging, filling, healing, pacing, piercing, put, resisting, sealed, stacked, takes, wear, type Status } from './combat/status';
import type { Input, Logged, Result, SimEvent } from './events';
import { geared } from './gear';
import { lineOf, nearer, NO_PASSIVE, type Ability, type HeroDef } from './heroes/kit';
import { KR_HEROES } from './heroes/kr';
import type { HeroMove } from './heroes/moves';
import { motionOf } from './motion';
import { seeded } from './random';
import { AUTO, AUTO_WAIT, BLOW, BOSS_REACH, BOSS_X, CLASS_BUFF, CRIT, formation, HERO_WAIT, HERO_X, MANA_PER_ATTACK, MARCH, MARCH_ABREAST, MARCH_FROM, marchLeft, MARCH_ROW, MANA_PER_HP_LOST, MANA_RATE, MAX_MANA, MOST, rage, RAGE_WIPE, RAID_TIME, REFORM, SECTION, TICK } from './rules';
import { grown, SET_UP, setOf, type SetEffect } from './sets';
import { stateArt, type Art, type Buff, type Mark, type Tone } from './shown';
import { CHAMPION_UP, DESPERATION_UP, foeSkills, MENDING_UP, SKILL, skilledCritDamage, skilledStats, skillsOf, SURGE_UP, type SkillId } from './skills';
import type { Doing, Fight, Fighter, Foe, GearBonus, GearStat } from './types';
import { atTier, ELICIPIRA, EXIAN, EXIAN_UP, ROSMERTA, ROSMERTA_KASEL, ROSMERTA_UP, uniqueName, uniqueOf } from './unique';
import { auraTotal, moveDmg, moveHeals, moveMarks, moveWhole, perkedStats, perksOf, tweaked, withPerks, type PerkDef, type SkillMark, type SkillStatus } from './perks';
import { treasureOf } from './treasures';
import { minionOf } from './bosses/dragon/common';
import { MINIONS, type MinionDef, type MinionMove } from './bosses/dragon/minions';
import type { WaveMinion } from './bosses/dragon/waves';
import { REACH } from './heroes/reach';

/*
 * The fight, worked out with nothing drawn: a boss and the heroes, up to MOST of them on the field at once,
 * each in its line, as King's Raid has it (the frontline nearest the boss, the backline furthest from it: ./rules.ts).
 * It keeps how everyone stands (health, mana, what is on them for a while), works out what each blow takes
 * (./combat/), and has each hero on the field attack by itself and use its skills. The boss goes for one
 * of them at a time, picked as each of its attacks begins. What each hero's skills do is the hero's own
 * (./heroes/: its part in the fight), and what the boss's do beyond hurting whoever they land on is the
 * boss's (./bosses/).
 *
 * It moves on a step (TICK) at a time, and every chance in it comes of its seed (./random.ts), so the same
 * seed and the same inputs, each before the same step, make the same fight wherever it runs: on the page,
 * which draws what it says happened (its events: ../fight/view.ts), and on the bot, which runs a room's fight
 * itself and gives what it is won for (./bot.ts).
 *
 * As in King's Raid, one try is all there is: a hero down stays down (unless a skill of another's revives it),
 * the boss beaten is won, and every hero on the field down (or the boss's rage wiping them, RAGE_WIPE after the
 * raid's time is up) is lost. A raid takes nothing but the heroes' skills and Auto; trying things out, heroes
 * come onto the field and leave it as the player likes, the boss is set attacking by hand, and with Deathless on
 * (the page's start) no one falls: a hero or the boss a blow would bring down is whole again instead, and the
 * raid's time stands still (no rage). A hero in a
 * TechnoMagic set's three pieces has the set's effect (./sets.ts), one wielding its own unique weapon has
 * the weapon's (./unique.ts), one with its own unique treasure as its main treasure has the treasure's (./treasures.ts:
 * among its perks), and each has the additional skills of the TechnoMagic gear it wears (./skills.ts).
 */

/**
 * A hero as it comes into the fight: which, in which of its skins (the first, unless it says), with what its gear
 * gives it, the TechnoMagic set whose effect it has (./sets.ts), its own unique weapon's tier (./unique.ts), and
 * the additional skill of each piece of TechnoMagic gear it wears (./skills.ts). One in the Sub Team (a raid fought
 * alone: the heroes past the Main Team's) is on Auto for the whole fight; in a raid, every other starts on it too.
 */
export interface Entry {
  def: HeroDef;
  skin?: number;
  gear?: GearBonus;
  set?: string | null;
  uw?: number | null;
  skills?: readonly string[] | null;
  sub?: boolean;
  /** Its transcendence perks (./perks.ts: the bot's ids). */
  perks?: readonly string[] | null;
  /** Its main unique treasure (./treasures.ts): which of its four (1 to 4: UT1 to UT4), at which tier (1 to 5). */
  ut?: { skill: number; tier: number } | null;
  /** Its artifact (./artifacts.ts): which (KR_ARTIFACTS' id), at which tier (R1 to R5). */
  artifact?: { id: string; tier: number } | null;
}

/** The dragons' ids: King's Raid's Dragon race, for an artifact's DMG against one (./artifacts.ts). */
const DRAGON_IDS: ReadonlySet<string> = new Set(['temeraire', 'scalaxia', 'zyrrkinoth', 'armarta']);

/** The additional skills that come round again every so many seconds: each first comes once that long has gone. */
const EVERY: readonly SkillId[] = ['regeneration', 'mana-spring', 'focus-1', 'focus-2', 'focus-3'];

export interface SimOptions {
  boss: BossDef;
  heroes: readonly Entry[];
  seed: number;
  /** The raid's stage (1 to the boss's last: stagesOf). */
  stage: number;
  /** A raid (every hero on the field, Boss auto on), or trying things out. */
  raid: boolean;
  /** Fought alone: the boss is as its stages have it alone (BossDef.stages). */
  solo?: boolean;
  /** Trying things out: the heroes on the field at first, by their index (with none of them, the first). */
  first?: readonly number[];
  /** Trying things out: no one falls (a raid: never). */
  deathless?: boolean;
}

export interface Sim extends Fight {
  readonly raid: boolean;
  /** The boss attacks by itself (always, in a raid). */
  readonly bossAuto: boolean;
  /** No one falls: a hero or the boss brought down is whole again, and the raid's time stands still (only when trying things out). */
  readonly deathless: boolean;
  /** Steps taken; seconds since the heroes ran in. */
  readonly tick: number;
  readonly elapsed: number;
  /** Seconds of the raid's time left (less than 0: so long since it was up, and the boss enraged). */
  readonly left: number;
  /** How the raid ended (null: it hasn't). */
  readonly result: Result | null;
  /** What has happened since the page last looked (it empties it). */
  readonly events: SimEvent[];
  /** A raid of more than one wave: seconds left of the heroes' run on to the next (0: none). */
  readonly moving: number;
  /** Every input so far, with the step it came before. */
  readonly log: readonly Logged[];
  /** The fight's checksum (./checksum) at the end of every second so far: where two runs of it part, the first that differs says when. */
  readonly sums: readonly number[];
  /** Something the player does: it counts from the next step. */
  input(input: Input): void;
  /** One step on. */
  step(): void;
  /** A hero could use a skill now, were it free: it is on the field, standing, the skill is ready, and it has the mana. */
  ready(fighter: Fighter, index: number): boolean;
  /** A hero can be told to use a skill as soon as it can (reserved): it could use it now but for its cooldown or its mana, which it then waits for. */
  reservable(fighter: Fighter, index: number): boolean;
  /** What one of a hero's skill slots holds for now: its own skill, another its skills have turned into, or null (sealed). */
  slot(fighter: Fighter, index: number): Ability | null;
  /** What is the matter with the boss, for under its health. */
  marks(): Mark[];
  /** How full the boss's CC gauge is (0 to 1), for the bar under its health (null: it has none). */
  gauge(): number | null;
  /** The boss's pattern alarm across the top of the field (null: none now), with how long it stays yet. */
  alarm(): (Warning & { left: number }) | null;
  /** How many times its own size the boss is drawn now. */
  size(): number;
  /** A number that sums up how the fight stands (two fights that stand the same have the same). */
  checksum(): number;
}

/** What knocks a hero down: shown on its card, with how long it has left. */
const KNOCKED: Buff = { name: 'Knocked down', about: 'Can do nothing until it is up.', icon: '💫', art: stateArt('Down'), harmful: true };

/** King's Raid's icon for what is on the boss, by its kind, for one whose hero's skill has no picture of the name. */
const TONE_STATE: Readonly<Record<Tone, string>> = { stun: 'Stun', down: 'Down', slow: 'SpeedDown', curse: 'DefenseDown', venom: 'Poison', burn: 'Burn', rage: 'AttackUp' };

/** Steps in a second (a checksum is kept at the end of each). */
const SECOND = Math.round(1 / TICK);

/** The run up to the boss: how much of the way through it the heroes begin fanning out to where each stands. */
const FAN = 0.6;
/** How far short of where it stands (along the field) a hero begins turning toward it, to arrive there and wait for the rest. */
const NEAR = 6;
/**
 * A raid of more than one wave: how long the heroes run on to the next (seconds; ../fight/view.ts runs them as long, the map
 * moving on as their run up to the boss has them go: flat out, then braking, as fast along the field as they ran then).
 */
export const RUN_ON = 5;
/** A raid of more than one wave: how long the boss takes flying off the field (the dragons' Phase clip) before the heroes run on. */
export const FLY_OFF = 4;
/** Where a wave's minions stand: about this far along the field (before the boss), as its wave has them, closer together (the field is narrower here). */
const MINION_X = BOSS_X - 2.5;

/** How far forward each line stands, for an enemy picking whom to go for. */
const LINE_FORWARD = { front: 3, middle: 2, back: 1 } as const;
/** A hero's width (metres) when King's Raid's playtest hasn't it: most of its heroes'. */
const HERO_SIZE = 0.5;

/**
 * The hero of `from` an enemy at (`x`, `z`) goes for, as King's Raid's go for theirs (its playtest's
 * BattleCreatureList.SortBySkillDistance): of those within its reach (`reach`, metres to a hero's edge), the one furthest
 * forward: by its line, then its weight in it (./heroes/kr.ts stand), then the better of its defenses, then its index in the
 * game's tables. None within it: the nearest (to its edge). Of two alike, the one that came onto the field first.
 */
/** How far a hero's edge is from a spot on the field (metres). */
const edgeTo = (on: Fighter, x: number, z: number): number => Math.hypot(on.x - x, on.z - z) - (KR_HEROES[on.id]?.stand.size ?? HERO_SIZE);

function foremost(from: readonly Fighter[], x: number, z: number, reach: number): Fighter | null {
  const edge = (on: Fighter): number => edgeTo(on, x, z);
  const within = from.filter((on) => edge(on) <= reach + 1e-9);
  if (within.length === 0) return from.reduce<Fighter | null>((best, on) => (!best || edge(on) < edge(best) - 1e-9 ? on : best), null);
  const rank = (on: Fighter): readonly number[] => {
    const stand = KR_HEROES[on.id]?.stand;
    return [LINE_FORWARD[lineOf(on.def)], stand?.weight ?? 0, Math.max(on.stats.physical, on.stats.magical), stand?.index ?? 0];
  };
  const ahead = (a: readonly number[], b: readonly number[]): boolean => {
    const i = a.findIndex((n, k) => n !== b[k]);
    return i >= 0 && (a[i] as number) > (b[i] as number);
  };
  return within.reduce((best, on) => (ahead(rank(on), rank(best)) ? on : best));
}

export function makeSim({ boss: def, heroes, seed, stage: firstStage, raid, solo = false, first = [], deathless: noDeaths = false }: SimOptions): Sim {
  const random = seeded(seed);
  const roll = (): number => random.next();
  const events: SimEvent[] = [];
  const log: Logged[] = [];
  const sums: number[] = [];
  let pending: Input[] = [];
  const maxHp = def.stats.hp * scaleAt(def, firstStage, solo).hp;
  const boss: Foe = { index: 0, kind: 'boss', def, part: { lands: {} }, hp: maxHp, maxHp, stunned: 0, slowed: 0, slowRate: 1, statuses: [], x: BOSS_X, z: 0, away: false };
  /** Every enemy that has come onto the field, the boss first. */
  const foes: Foe[] = [boss];
  /**
   * The enemy in question (Fight.foe): set as a hero's move lands (the one it is fighting), as a blow lands (the one it lands
   * on), as an enemy's own move goes (that one); otherwise the boss, or while it is away the first minion standing.
   */
  let focus: Foe | null = null;
  /** The enemies standing on the field (not away, not beaten). */
  const standing = (): Foe[] => foes.filter((one) => !one.away && one.hp > 0);
  const current = (): Foe => focus ?? (!boss.away ? boss : (standing()[0] ?? boss));
  /** `run` with `on` the enemy in question (and back to the one before after). */
  function as<T>(on: Foe, run: () => T): T {
    const was = focus;
    focus = on;
    try {
      return run();
    } finally {
      focus = was;
    }
  }
  /** Whom each hero is fighting: the enemy nearest it (as King's Raid's heroes go for theirs), kept until it is beaten or away. */
  const aims = new Map<Fighter, Foe>();
  function targetOf(fighter: Fighter): Foe | null {
    const aim = aims.get(fighter);
    if (aim && !aim.away && aim.hp > 0) return aim;
    const far = (one: Foe): number => (one.x - fighter.x) * (one.x - fighter.x) + (one.z - fighter.z) * (one.z - fighter.z);
    const near = standing().reduce<Foe | null>((best, one) => (!best || far(one) < far(best) - 1e-9 ? one : best), null);
    if (near) aims.set(fighter, near);
    else aims.delete(fighter);
    return near;
  }
  /** `run` as `fighter` would have it: the enemy in question the one it is fighting. */
  const asFighter = <T>(fighter: Fighter, run: () => T): T => as(targetOf(fighter) ?? current(), run);

  /** A raid of more than one wave (BossDef.waves): its waves past the first, as its stage has them as the fight begins; the wave it is on, and how many seconds are left of the heroes' run on to the next. */
  const later = def.waves?.at(Math.min(stagesOf(def), Math.max(1, Math.floor(firstStage) || 1))) ?? [];
  const waves = 1 + later.length;
  let wave = 1;
  let moving = 0;
  /** The boss flying off (the first wave over): seconds left until the heroes run on. */
  let lifting = 0;
  /** Each minion on the field: what it is, its ATK, what it is doing (a move, and whom at), how long it rests yet, how long before its skill is ready, and how long it has stood. */
  interface Minion {
    def: MinionDef;
    atk: number;
    doing: { move: MinionMove; t: number; landed: number; target: Fighter | null } | null;
    rest: number;
    skill: number;
    life: number;
    fused: boolean;
  }
  const minions = new Map<Foe, Minion>();
  let tick = 0;
  let elapsed = 0;
  /** Seconds of the raid's time gone, against this boss; and how long its raid lasts. */
  let clock = 0;
  const raidTime = def.time ?? RAID_TIME;
  let stage = Math.min(stagesOf(def), Math.max(1, Math.floor(firstStage) || 1));
  let bossAuto = raid;
  let deathless = noDeaths && !raid;
  let result: Result | null = null;
  /** A raid's run up to the boss: the steps it takes (the first steps of the fight). */
  const marching = raid ? Math.round(MARCH / TICK) : 0;
  /** The boss's health given back since it was last shown, and how long since then. */
  let mended = 0;
  let mendShown = 0;
  const party: Status<Buff>[] = [];

  // (A main unique treasure's effect is one of its perks: 'ut'.)
  const treasures = heroes.map(({ def: hero, ut }) => treasureOf(hero, ut));
  const perkSets = heroes.map(({ def: hero, perks }, index) => {
    const out = perksOf(perks, hero);
    const ut = treasures[index];
    const def = ut && hero.treasures?.[ut.index];
    if (ut && def) out.set('ut', def.at(ut.tier));
    return out;
  });
  /** What every ally gains from the start, by perks like Battle Cry (each wearer's: the first in full, the rest each `again`). */
  const startAura = (key: keyof NonNullable<PerkDef['allies']>): number => auraTotal(perkSets.map((perks) => [...perks.values()]), key);
  const battleCry = startAura('hp');
  // (And every ally's from the artifacts the heroes wear: the highest of them, as King's Raid's don't stack.)
  const artifactHp = heroes.reduce((most, { artifact }) => {
    const worn = artifactOf(artifact);
    return Math.max(most, worn ? at(worn.def.allies?.hp, worn.tier) : 0);
  }, 0);
  const fighters: Fighter[] = heroes.map(({ def: hero, skin = 0, gear: worn = {}, set: wearing = null, uw = null, skills: tm = null, sub = false, artifact = null }, index) => {
    const set = setOf(wearing, hero.class);
    const relic = artifactOf(artifact);
    const tier = uniqueOf(hero.id, uw);
    const skills = skillsOf(tm);
    const n = (id: SkillId): number => skills[id] ?? 0;
    // Its perks' stats, as its gear's are (and Battle Cry's max HP, from every ally's).
    const perks = perkSets[index] as Map<string, PerkDef>;
    const gear = withPerks(worn, perks.values());
    if (battleCry > 0) gear.hp = (gear.hp ?? 0) + battleCry;
    // (And its set's own stats from the start: ./sets.ts.)
    // (And its artifact's: ./artifacts.ts.)
    for (const [stat, value] of Object.entries({ ...set?.effect.own }).concat(Object.entries(artifactStats(relic))) as [GearStat, number][]) gear[stat] = (gear[stat] ?? 0) + value;
    if (artifactHp > 0) gear.hp = (gear.hp ?? 0) + artifactHp;
    // (And its class buffs: ../rules.ts; and what its books add to its ATK: ./heroes/kr.ts.)
    gear.atk = (gear.atk ?? 0) + CLASS_BUFF.atk + (KR_HEROES[hero.id]?.books.atk ?? 0);
    gear.hp = (gear.hp ?? 0) + CLASS_BUFF.hp;
    const stats = perkedStats(geared(hero.stats, gear), perks.values());
    // Its additional skills' on its own stats, from the start; and its books' crit chance.
    skilledStats(stats, skills);
    stats.crit += KR_HEROES[hero.id]?.books.critStat ?? 0;
    const motion = motionOf(hero);
    // (Its mana, King's Raid's playtest's: ./heroes/kr.ts.)
    const mana = KR_HEROES[hero.id]?.mana ?? { regen: MANA_RATE, attack: MANA_PER_ATTACK };
    const name = hero.skins[skin] ?? hero.skins[0] ?? hero.name;
    const defs = [...perks.values()];
    // (Its perks' DMG and what it takes add up, as King's Raid's do: ./combat/status.ts.)
    const sum = (of: (perk: PerkDef) => number | undefined): number => amplified(defs.map((perk) => of(perk) ?? 1));
    return {
      index,
      id: hero.id,
      name,
      def: hero,
      perks: new Set(perks.keys()),
      perkDefs: defs,
      abilities: hero.abilities.map((ability, i) => tweaked(ability, defs.filter((perk) => perk.skill?.index === i || perk.allSkills))),
      moveDmg: moveDmg(hero, perks),
      moveWhole: moveWhole(hero, perks),
      moveMarks: moveMarks(hero, perks),
      moveHeals: moveHeals(hero, perks),
      perkDmg: sum((perk) => perk.dmg),
      perkTaken: { physical: amplified(defs.flatMap((perk) => [perk.taken ?? 1, perk.takenPhysical ?? 1])), magical: sum((perk) => perk.taken) },
      acc: stats.acc + defs.reduce((sum, perk) => sum + (perk.acc ?? 0), 0),
      perkWaits: {},
      immune: 0,
      nimble: 0,
      wound: 0,
      stats,
      critTimes: CRIT + stats.critDamage + (gear.critDamage ?? 0) + skilledCritDamage(skills),
      healTimes: 1 + (gear.heal ?? 0),
      set,
      setDone: { wind: false, full: false },
      artifact: relic,
      unique: tier === null ? null : { tier, casts: 0 },
      treasure: treasures[index] ?? null,
      skills,
      stacks: { momentum: 0, steadfast: 0, bloodlust: 0, bulwark: 0 },
      waits: Object.fromEntries(EVERY.filter((id) => n(id) > 0).map((id) => [id, (SKILL[id] as { every: number }).every])),
      controlTimes: 1 + (gear.control ?? 0),
      accuracy: gear.accuracy ?? 0,
      lifesteal: gear.lifesteal ?? 0,
      recovery: gear.recovery ?? 0,
      manaDamage: gear.manaDamage ?? 0,
      critResist: { physical: (gear.critResist ?? 0) + (gear.critResistPhysical ?? 0), magical: (gear.critResist ?? 0) + (gear.critResistMagical ?? 0) },
      manaPerAttack: mana.attack * (1 + (gear.manaAttack ?? 0)),
      manaRegen: mana.regen * (1 + (gear.manaRegen ?? 0)),
      motion,
      attack: motion.attack,
      part: { lands: {} },
      hp: stats.hp,
      shield: 0,
      shieldLeft: 0,
      statuses: [],
      // As it comes into the fight: whole, with no mana, as in King's Raid's raids.
      mana: 0,
      sub,
      // On Auto from the start in a raid (the Main Team's can be taken off it); trying things out, not.
      auto: sub || raid,
      cooldowns: hero.abilities.map(() => 0),
      reserved: null,
      autoPicked: false,
      autoWait: 0,
      rested: 0,
      dealt: 0,
      healed: 0,
      shielded: 0,
      mitigated: 0,
      taken: 0,
      doing: null,
      haste: 1,
      x: 0,
      z: 0,
    };
  });

  /** Who is on the field, and where each is to stand: it moves there (from where it was, should others have come or gone). */
  let field: Fighter[] = [];
  const spots = new Map<Fighter, readonly [number, number]>();
  function form(): void {
    const places = formation(field.map((on) => lineOf(on.def)));
    field.forEach((on, i) => spots.set(on, places[i] as readonly [number, number]));
  }
  /** A hero runs onto the field, at its place in its line (false: the field is full). */
  function stand(fighter: Fighter): boolean {
    if (field.length >= MOST) return false;
    field = [...field, fighter];
    form();
    [fighter.x, fighter.z] = spots.get(fighter) as readonly [number, number];
    fighter.rested = 0;
    fighter.doing = { move: 'enter', t: 0, part: 0, landed: 0, blows: 0 };
    events.push({ kind: 'enter', who: fighter.index, ...(tick < marching && { run: MARCH }) });
    return true;
  }
  /**
   * The run up to the boss, `k` of the way (0 to 1): two abreast, the frontline first (its tanks leading), each pair
   * behind the one before, flat out until they slow to a stop near the boss (marchLeft), fanning out toward the end to
   * where each stands. One that comes up to where it stands sooner (further back) turns toward it as it nears it, and
   * stays there once it has (`arrived` is told of each there).
   * (Only + - * /: ./rules.ts.)
   */
  function lineUp(k: number, arrived?: (on: Fighter) => void): void {
    const back = MARCH_FROM * marchLeft(k);
    const s = Math.max(0, (k - FAN) / (1 - FAN));
    const fan = s * s * (3 - 2 * s);
    const order = [...field].sort((a, b) => nearer(a.def, b.def));
    order.forEach((on, i) => {
      // (One left over at the back runs in the middle.)
      const side = i === order.length - 1 && i % 2 === 0 ? 0 : i % 2 ? -1 : 1;
      const x = HERO_X - back - (i >> 1) * MARCH_ROW;
      const z = (side * MARCH_ABREAST) / 2;
      const [toX, toZ] = spots.get(on) as readonly [number, number];
      const near = Math.min(1, Math.max(0, 1 - (toX - x) / NEAR));
      const there = Math.max(fan, near * near * (3 - 2 * near));
      const from = Math.min(x, toX);
      on.x = from + (toX - from) * there;
      on.z = z + (toZ - z) * there;
      if (there >= 1) arrived?.(on);
    });
  }

  /** The hero whose attack's blow is landing right now (null: none: a skill's, or something else's), and how hard it is (King's Raid's); and whose move, and which. */
  let attacking: Fighter | null = null;
  let basic = 0;
  let landing: { by: Fighter; move: HeroMove } | null = null;
  /** Whether the blow landing now is continuous DMG (Fight.continuous: a Poison's, a Bleed's, a Flame's, a Mortal Wound's). */
  let seeping = false;

  /** How long the boss has been still; what each of its parts (heads) is doing, and will do after; whom it goes for, and whether it was busy last step. */
  let idle = 0;
  const going = new Map<string, { move: string; attack: string; part: number; t: number; hit: boolean }[]>();
  let aim: Fighter | null = null;
  let was = false;
  const bossBusy = (): boolean => going.size > 0 || boss.stunned > 0;
  /** The boss's pattern alarm up now (its attack's warning), and how long it stays yet. */
  let warned: { warning: Warning; left: number } | null = null;
  /** The boss begins an attack: not while it is stunned, or while any part of it the attack needs is still at another. */
  function bossUse(attack: string): void {
    const plan = def.plans[attack] ?? [];
    if (boss.away || boss.stunned > 0 || plan.length === 0 || plan.some(([, by]) => going.has(by))) return;
    plan.forEach(([move, by, after], part) => {
      const moves = going.get(by) ?? [];
      moves.push({ move, attack, part, t: -after, hit: false });
      going.set(by, moves);
    });
    events.push({ kind: 'boss-use', attack });
    const warning = def.attacks.find((one) => one.name === attack)?.warning;
    if (warning) warned = { warning, left: warning.lasts };
    as(boss, () => boss.part.used?.(attack));
  }
  /** The boss's stats as it stands the heroes' blows at this stage: its defenses so many times its own. */
  function bossStands(): BossDef['stats'] {
    const times = scaleAt(def, stage, solo).defense ?? 1;
    return times === 1 ? def.stats : { ...def.stats, physical: def.stats.physical * times, magical: def.stats.magical * times };
  }
  /**
   * The hero on the field the boss goes for (not one out of the fight): as King's Raid's bosses go for theirs (foremost);
   * one standing, if any is (null: there is none).
   */
  const anyone = (): Fighter | null => {
    const there = field.filter((fighter) => !away(fighter.statuses));
    const up = there.filter((fighter) => fighter.hp > 0);
    return foremost(up.length > 0 ? up : there, BOSS_X, 0, BOSS_REACH);
  };
  /** Each hero's artifact's hooks (./artifacts.ts), wearing one the fight has a use for. */
  const relics = new Map<Fighter, ArtifactHooks>();
  /** Whom the boss is going for: another, should that one have left the field, or the fight. */
  const aimed = (): Fighter | null => {
    if (!aim || !field.includes(aim) || away(aim.statuses)) aim = anyone();
    return aim;
  };

  /**
   * What the sets worn by the heroes on the field, standing and in the fight, give `to` (an ally) of `key` (./sets.ts
   * SetEffect.allies), added up: twice over the front line's ATK Spd, or the rest's crit DMG, for a set that says so; mana
   * recovery only once its time has come.
   */
  const allied = (to: Fighter, key: 'atk' | 'defense' | 'speed' | 'critDamage' | 'dmg' | 'recovery' | 'mana'): number =>
    field.reduce((sum, on) => {
      const allies = on.hp > 0 && !away(on.statuses) ? on.set?.effect.allies : undefined;
      if (!allies?.[key] || (key === 'mana' && elapsed < (allies.manaAfter ?? 0))) return sum;
      const front = lineOf(to.def) === 'front';
      const twice = (allies.twice === 'front' && key === 'speed' && front) || (allies.twice === 'back' && key === 'critDamage' && !front);
      return sum + (allies[key] as number) * (twice ? 2 : 1);
    }, 0);
  /** Its set's effect (none: an empty one). */
  const setEffect = (by: Fighter): SetEffect => by.set?.effect ?? {};
  /** How many of an additional skill the heroes on the field, standing and in the fight, have between them (one that gives every ally something). */
  const among = (id: SkillId): number => field.reduce((count, on) => count + (on.hp > 0 && !away(on.statuses) ? (on.skills[id] ?? 0) : 0), 0);
  /** What every ally gains, as this step began, from the perks of the heroes on the field and standing (./perks.ts's auras). */
  const auras = { atk: 0, crit: 0, critDamage: 0, speed: 0, pen: 0, acc: 0, accuracy: 0, resist: 0, mend: 0 };
  /** The heroes whose Inner Peace the mend is, as this step began: its healing is theirs, shared evenly. */
  let menders: Fighter[] = [];
  function aurasNow(): void {
    const standing = field.filter((on) => on.hp > 0 && !away(on.statuses));
    for (const key of Object.keys(auras) as (keyof typeof auras)[]) auras[key] = auraTotal(standing.map((on) => on.perkDefs), key);
    menders = standing.filter((on) => on.perkDefs.some((perk) => perk.allies?.mend));
  }
  /** Whether a hero's perk that waits between times (by its name) comes now: then it waits again, `again` seconds. */
  function perkDue(fighter: Fighter, name: string, again: number): boolean {
    if ((fighter.perkWaits[name] ?? 0) > 0) return false;
    fighter.perkWaits[name] = again;
    return true;
  }
  /** How many of an additional skill a hero has. */
  const has = (fighter: Fighter, id: SkillId): number => fighter.skills[id] ?? 0;
  const bears = (fighter: Fighter, name: string): boolean => fighter.statuses.some((status) => status.name === name);
  /**
   * How many times its ATK a hero's blows, heals and shields go by, for now: what the sets on the field give every ally
   * and every War Cry among them; its own set's, growing, at first or once its mana has been full; its own Momentum's and
   * Bloodlust's stacks and Desperation; and what its skills that count enemies give for those standing now (foeSkills).
   * (All added up, as King's Raid's ATK is: ./combat/status.ts.)
   */
  const atkTimes = (by: Fighter): number => {
    const own = setEffect(by);
    const set = (own.grows?.atk ?? 0) * grown(own, elapsed) + (own.opening && elapsed < own.opening.lasts ? own.opening.atk : 0) + (own.fullMana && by.setDone.full ? own.fullMana.atk : 0);
    return stacked([
      1 + allied(by, 'atk') + set + SKILL['war-cry'].atk * among('war-cry') + auras.atk + alliesFrom(field, 'atk') + adding(by.statuses, 'atk') + adding(party, 'atk'),
      1 + SKILL.momentum.atk * by.stacks.momentum * has(by, 'momentum') + SKILL.bloodlust.atk * by.stacks.bloodlust * has(by, 'bloodlust'),
      bears(by, DESPERATION_UP.name) ? 1 + SKILL.desperation.atk * has(by, 'desperation') : 1,
      1 + foeSkills(by.skills, standing().length).atk,
    ]);
  };
  /**
   * How many times as much DMG a hero's blows deal besides (not its heals): its set's, growing as the fight goes on, and
   * what the sets on the field give every ally; and its own Vigor while its health is high, Persistence growing, and
   * Fundamentals on its attack.
   */
  const dmgTimes = (by: Fighter): number => {
    const own = setEffect(by);
    const set = (own.dmg ?? 0) + (own.grows?.dmg ?? 0) * grown(own, elapsed) + allied(by, 'dmg');
    const vigor = by.hp > by.stats.hp * SKILL.vigor.above ? SKILL.vigor.dmg * has(by, 'vigor') : 0;
    const persistence = SKILL.persistence.dmg * has(by, 'persistence') * Math.min(SKILL.persistence.most, Math.floor(elapsed / SKILL.persistence.every));
    const fundamentals = attacking === by ? SKILL.fundamentals.dmg * has(by, 'fundamentals') : 0;
    return 1 + set + vigor + persistence + fundamentals;
  };
  /** How many times as much a heal or a shield gives for the hero whose it is (its attack, its gear and its Mending; one that is no hero's: as much as it says). */
  const byAttack = (by: Fighter | undefined): number =>
    by ? (by.stats.atk / ATK) * atkTimes(by) * by.healTimes * (bears(by, MENDING_UP.name) ? 1 + SKILL.mending.heal * has(by, 'mending') : 1) : 1;

  /**
   * Its skills' books (./heroes/kr.ts: all of them), on what of its own lands (`kind`: its blows, or its heals and shields): the
   * skill using's; what comes of one later, or of its passive, as its books give on the whole (those that give any). Its
   * attack's, none.
   */
  const bookShare = (by: Fighter, kind: 'dmg' | 'heal' | 'crit'): number => {
    if (attacking === by) return 0;
    const books = KR_HEROES[by.id]?.books[kind];
    if (!books) return 0;
    const skill = landing?.by === by ? by.doing?.skill : undefined;
    if (skill !== undefined) return books[skill] ?? 0;
    const some = books.filter((one) => one > 0);
    return some.length > 0 ? some.reduce((sum, one) => sum + one, 0) / some.length : 0;
  };
  /** How many times as much the heal or shield of the skill landing gives, by its books and its perks (its main unique treasure's: moveHeals), added up as King's Raid's skill power is. */
  const healed = (by: Fighter | undefined): number => (by ? 1 + bookShare(by, 'heal') + (landing?.by === by ? (by.moveHeals[landing.move] ?? 1) : 1) - 1 : 1);

  /** Deathless: a hero brought down is whole again. */
  function spare(fighter: Fighter): void {
    if (deathless && fighter.hp <= 0) fighter.hp = fighter.stats.hp;
  }

  function end(how: Result): void {
    if (result) return;
    result = how;
    events.push({ kind: 'end', result: how });
  }

  function stagger(fighter: Fighter): void {
    if (fighter.doing?.move === 'enter') return;
    fighter.doing = { move: 'hit', t: 0, part: 0, landed: 0, blows: 0 };
    events.push({ kind: 'stagger', who: fighter.index });
  }

  /** A hero begins a move (it must be free): its attack, or the skill in one of its slots. */
  function begin(fighter: Fighter, move: HeroMove, skill: number | null): void {
    fighter.doing = { move, t: 0, part: 0, landed: 0, blows: 0, ...(skill !== null && { skill }) };
    events.push({ kind: 'start', who: fighter.index, move, skill: skill !== null });
  }

  /**
   * Whether what a hero is doing is its attack: a move begun as its attack, whichever that was (its own, or what its skills
   * had turned its attack into: HeroPart.attack, Talisha's in [Luberry]), not a skill, nor its flinch or entrance.
   */
  const attackMove = (doing: Doing): boolean => doing.skill === undefined && doing.move !== 'hit' && doing.move !== 'enter';

  /** Whether a hero is free for a skill: doing nothing, or only its attack (which the skill cuts short, as King's Raid's does; not another skill, nor its flinch or entrance). */
  function cuttable(fighter: Fighter): boolean {
    const { doing } = fighter;
    return !doing || attackMove(doing);
  }

  /** A hero uses a skill (true if it did: it must be free, or only attacking). */
  function use(fighter: Fighter, index: number): boolean {
    const ability = sim.slot(fighter, index);
    if (!ability || !cuttable(fighter) || !sim.ready(fighter, index)) return false;
    begin(fighter, ability.move, index);
    for (const perk of fighter.perkDefs) if (perk.skill?.index === index) usedWith(fighter, perk.skill);
    fighter.cooldowns[index] = ability.cooldown;
    fighter.mana -= ability.cost * SECTION;
    noting(ability.art ?? passiveArt(fighter), () => asFighter(fighter, () => fighter.part.used?.(index, ability)));
    uniqueCast(fighter);
    skillCast(fighter);
    setCast(fighter);
    return true;
  }

  /** What helps the boss (makes it deal more) is gone. */
  function dispel(): void {
    const foe = current();
    for (let i = foe.statuses.length - 1; i >= 0; i--) if (((foe.statuses[i] as Status<unknown>).deals ?? 1) > 1) foe.statuses.splice(i, 1);
  }

  /** A status a skill puts on a hero for a while (a perk's: SkillStatus), shown as its skill's square. */
  function given(status: SkillStatus, ability: Ability | undefined): Status<Buff> {
    const { name, lasts, ...does } = status;
    return { name, left: lasts, ...does, shown: { name, icon: ability?.icon ?? '✨', ...(ability?.art && { art: ability.art }) } };
  }

  /** A hero uses a skill one of its perks changes (its main unique treasure's: ./treasures.ts): what comes of it as it is used. */
  function usedWith(fighter: Fighter, skill: NonNullable<PerkDef['skill']>): void {
    const ability = fighter.abilities[skill.index];
    if (skill.mana) fighter.mana = Math.min(MAX_MANA, fighter.mana + skill.mana);
    if (skill.heal) sim.heal(fighter, skill.heal * fighter.stats.hp, undefined, fighter);
    const allies = field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    if (skill.cleanse) for (const ally of skill.cleanse === 'self' ? [fighter] : allies) ally.statuses = ally.statuses.filter((status) => status.shown.harmful !== true || status.binds === true);
    if (skill.dispel) dispel();
    if (skill.self) put(fighter.statuses, given(skill.self, ability));
    if (skill.party) for (const ally of allies) put(ally.statuses, given(skill.party, ability));
    if (skill.allyMana) for (const ally of allies) ally.mana = Math.min(MAX_MANA, ally.mana + skill.allyMana);
  }

  /** What a skill leaves on the boss as its first blow lands (a perk's: SkillMark). */
  function marked(mark: SkillMark): void {
    const { name, lasts, ...does } = mark;
    put(current().statuses, { name, left: lasts, ...does, shown: 'curse' });
  }

  /**
   * Auto, as King's Raid's goes (BattleManagement.UpdateSkillAutoReserve): every AUTO.every seconds that a hero has
   * nothing reserved and isn't using a skill (but while its skills say Auto picks only from some), one of its skills whose
   * cooldown is over at random (null: none), whatever its mana (the hero attacks till it has it), nor one its skills say
   * Auto may not pick. Unlike King's Raid's, not one that would be wasted (wanted: a status it keeps up still is; its hero
   * says it waits); one whose moment its hero says it is, before any other.
   */
  function autoSkill(on: Fighter): number | null {
    const ready = on.abilities.flatMap((_, index) => {
      const ability = sim.slot(on, index);
      return ability && sim.reservable(on, index) && (on.cooldowns[index] as number) <= 0 && wanted(on, index, ability) ? [index] : [];
    });
    const now = ready.filter((index) => on.part.now?.(index));
    const from = now.length > 0 ? now : ready;
    return from.length > 0 ? (from[Math.floor(roll() * from.length)] as number) : null;
  }

  /** Auto: whether `on`'s skill in slot `index` may be picked now (not one its skills say not to, nor one that keeps a status up while it still is, nor one its hero says waits). */
  function wanted(on: Fighter, index: number, ability: Ability): boolean {
    const only = on.part.autoOnly?.();
    if ((only && !only.includes(index)) || on.part.autoOff?.(index) || on.part.waits?.(index)) return false;
    const allies = field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    const keeps = ability.auto?.keeps;
    if (keeps && [party, ...allies.map((ally) => ally.statuses)].some((on) => on.some((status) => status.name === keeps && status.left > AUTO.spare))) return false;
    return true;
  }

  /** A hero has used a skill: its additional skills that count them (Momentum, Steadfast) or come of it (Mending). */
  function skillCast(fighter: Fighter): void {
    if (has(fighter, 'momentum') > 0) fighter.stacks.momentum = Math.min(SKILL.momentum.most, fighter.stacks.momentum + 1);
    if (has(fighter, 'steadfast') > 0) fighter.stacks.steadfast = Math.min(SKILL.steadfast.most, fighter.stacks.steadfast + 1);
    if (due(fighter, 'mending', SKILL.mending.wait)) put(fighter.statuses, { name: MENDING_UP.name, left: SKILL.mending.lasts, shown: MENDING_UP });
  }

  /** A hero has used a skill: its set's that comes of it (Hope's assassin: mana, and crit DMG for a while). */
  function setCast(fighter: Fighter): void {
    const on = setEffect(fighter).onSkill;
    if (!on) return;
    fighter.mana = Math.min(MAX_MANA, fighter.mana + on.mana);
    put(fighter.statuses, { name: SET_UP.onSkill.name, left: on.lasts, critDamage: on.critDamage, shown: SET_UP.onSkill });
  }

  /**
   * A step's time passes for a hero's set (on the field, standing and in the fight): Hope's mechanic's mana and cooldowns for
   * every ally, every so often; Authority's wizard's, once its mana is first full; Authority's warrior's second wind.
   */
  function setTick(fighter: Fighter): void {
    const own = setEffect(fighter);
    if (!field.includes(fighter) || fighter.hp <= 0 || away(fighter.statuses)) return;
    if (own.tick && perkDue(fighter, 'set', own.tick.every)) {
      for (const ally of field.filter((on) => on.hp > 0 && !away(on.statuses))) {
        ally.mana = Math.min(MAX_MANA, ally.mana + own.tick.mana);
        ally.cooldowns = ally.cooldowns.map((left) => Math.max(0, left - (own.tick?.cooldown ?? 0)));
      }
    }
    if (own.fullMana && !fighter.setDone.full && fighter.mana >= MAX_MANA) {
      fighter.setDone.full = true;
      put(fighter.statuses, { name: SET_UP.fullMana.name, left: Infinity, mana: 1 + own.fullMana.mana, shown: SET_UP.fullMana });
    }
    if (own.secondWind && !fighter.setDone.wind && fighter.hp < fighter.stats.hp * own.secondWind.below) {
      fighter.setDone.wind = true;
      sim.heal(fighter, own.secondWind.heal * fighter.stats.hp, undefined, fighter);
      fighter.stats.speed += own.secondWind.speed;
      put(fighter.statuses, { name: SET_UP.secondWind.name, left: Infinity, shown: SET_UP.secondWind });
    }
  }

  /** Whether a hero's additional skill that waits between times comes now (it has it, and its wait is over): then it waits again, `again` seconds. */
  function due(fighter: Fighter, id: SkillId, again: number): boolean {
    if (has(fighter, id) === 0 || (fighter.waits[id] ?? 0) > 0) return false;
    fighter.waits[id] = again;
    return true;
  }

  /** A step's time passes for a hero's additional skills: their waits run down, and what comes round again, or comes of how it stands, comes (only on the field, standing and in the fight). */
  function skillTick(fighter: Fighter, dt: number): void {
    const { waits } = fighter;
    for (const id of Object.keys(waits) as SkillId[]) waits[id] = (waits[id] as number) - dt;
    if (!field.includes(fighter) || fighter.hp <= 0 || away(fighter.statuses)) return;
    const n = (id: SkillId): number => has(fighter, id);
    const full = fighter.mana >= MAX_MANA;
    if (due(fighter, 'regeneration', SKILL.regeneration.every)) sim.heal(fighter, SKILL.regeneration.heal * n('regeneration') * fighter.stats.hp, undefined, fighter);
    if (due(fighter, 'mana-spring', SKILL['mana-spring'].every)) fighter.mana = Math.min(MAX_MANA, fighter.mana + SKILL['mana-spring'].mana * n('mana-spring'));
    for (const id of ['focus-1', 'focus-2', 'focus-3'] as const) {
      const { skill, cooldown, every } = SKILL[id];
      const ability = fighter.abilities[skill];
      if (ability && due(fighter, id, every)) fighter.cooldowns[skill] = Math.max(0, (fighter.cooldowns[skill] as number) - ability.cooldown * cooldown * n(id));
    }
    if (full && due(fighter, 'overflow', SKILL.overflow.wait)) {
      for (const ally of field) ally.cooldowns = ally.cooldowns.map((left, i) => Math.max(0, left - (ally.abilities[i]?.cooldown ?? 0) * SKILL.overflow.cooldown * n('overflow')));
    }
    if (full && due(fighter, 'surge', SKILL.surge.wait)) put(fighter.statuses, { name: SURGE_UP.name, left: SKILL.surge.lasts, deals: 1 + SKILL.surge.dmg * n('surge'), shown: SURGE_UP });
    if (fighter.hp < fighter.stats.hp * SKILL.desperation.below && due(fighter, 'desperation', SKILL.desperation.wait)) {
      put(fighter.statuses, { name: DESPERATION_UP.name, left: SKILL.desperation.lasts, shown: DESPERATION_UP });
    }
  }

  /**
   * A step's time passes for a hero's perks: their waits run down, and what its Mortal Wound has left on the boss; and,
   * every second (on the field, standing), Inner Peace mends it and Swift and Nimble stacks. Its Mortal Wound eats at
   * the boss every second while it is there, wherever the hero is.
   */
  function perkTick(fighter: Fighter, dt: number): void {
    for (const name of Object.keys(fighter.perkWaits)) fighter.perkWaits[name] = (fighter.perkWaits[name] as number) - dt;
    fighter.wound = Math.max(0, fighter.wound - dt);
    const wound = fighter.wound > 0 ? fighter.perkDefs.find((perk) => perk.wound)?.wound : undefined;
    if (wound && (tick + 1) % SECOND === 0) sim.continuous(fighter, wound.each);
    if ((tick + 1) % SECOND !== 0 || !field.includes(fighter) || fighter.hp <= 0 || away(fighter.statuses)) return;
    // (A share of its max HP, not by anyone's ATK: what it gives is counted as its givers' healing.)
    if (auras.mend > 0) {
      const given = sim.heal(fighter, auras.mend * fighter.stats.hp);
      for (const by of menders) by.healed += given / menders.length;
    }
    const nimble = fighter.perkDefs.find((perk) => perk.nimble)?.nimble;
    if (nimble) fighter.nimble = Math.min(nimble.most, fighter.nimble + 1);
  }

  /** A hero wielding its own unique weapon has used a skill (./unique.ts): Klaus's every third, and Fallen Frey's every one. */
  function uniqueCast(fighter: Fighter): void {
    const unique = fighter.unique;
    if (!unique) return;
    unique.casts++;
    // (The allies standing in the fight, the highest ATK first: a tie in the field's order.)
    const byAtk = (): Fighter[] => field.filter((ally) => ally.hp > 0 && !away(ally.statuses)).sort((a, b) => b.stats.atk - a.stats.atk);
    if (fighter.id === 'klaus' && unique.casts % EXIAN.every === 0) {
      // Every ally's P.DEF and ATK higher for a while; the ATK twice as much for the ally with the highest ATK.
      const allies = byAtk();
      for (const ally of allies) {
        const atk = atTier(EXIAN.atk, unique.tier) * (ally === allies[0] ? EXIAN.top : 1);
        put(ally.statuses, { name: EXIAN_UP.name, left: EXIAN.lasts, atk, defends: { physical: 1 + atTier(EXIAN.defense, unique.tier) }, shown: EXIAN_UP });
      }
    } else if (fighter.id === 'fallen-frey') {
      // The allies with the highest ATK (her among them, if she is one): healed by a share of her ATK (a heal's numbers are at
      // ATK), and seeing past more of the boss's defense for a while; and Dark Lord Kasel, with her, quicker as long.
      for (const ally of byAtk().slice(0, ROSMERTA.allies)) {
        sim.heal(ally, atTier(ROSMERTA.heal, unique.tier) * ATK, fighter);
        put(ally.statuses, { name: ROSMERTA_UP.name, left: ROSMERTA.lasts, pen: atTier(ROSMERTA.pen, unique.tier), shown: ROSMERTA_UP });
      }
      for (const kasel of byAtk().filter((ally) => ally.id === 'dark-lord-kasel'))
        put(kasel.statuses, { name: ROSMERTA_KASEL.name, left: ROSMERTA.lasts, speed: atTier(ROSMERTA.kasel, unique.tier), shown: ROSMERTA_KASEL });
    }
  }

  /** What comes of the moves every hero has, as each part lands (unless its own part says otherwise). */
  const common: Partial<Record<HeroMove, (fighter: Fighter, part: number) => void>> = {
    // A blow of its attack: as King's Raid's has it, or else the last the hardest.
    attack: (fighter, part) => sim.hit(fighter, basic || BLOW * (part === 4 ? 1.6 : 1)),
    cast: (fighter) => sim.hit(fighter, BLOW * 3),
  };

  /** A hero's move goes on by `dt` (of its own time): each blow of it that lands, and on to its next part or done. */
  function advance(fighter: Fighter, dt: number): void {
    const doing = fighter.doing;
    if (!doing) return;
    const timeline = fighter.motion.moves[doing.move];
    doing.t += dt * timeline.speed;
    const part = timeline.parts[doing.part];
    if (!part) {
      fighter.doing = null;
      return;
    }
    while (doing.landed < part.lands.length && doing.t >= (part.lands[doing.landed] as number)) {
      doing.landed++;
      doing.blows++;
      if (doing.move !== 'hit' && doing.move !== 'enter') {
        const move = doing.move;
        // The last blow of its attack's own animations is the hardest (the fight knows it as the fifth).
        const last = timeline.fifth && doing.part === timeline.parts.length - 1 && doing.landed === part.lands.length;
        const index = last ? 4 : doing.blows - 1;
        events.push({ kind: 'land', who: fighter.index, move, part: index });
        // (hit() is told whose attack is landing; and its parts are told how hard King's Raid's blow is: sim.basic.)
        attacking = attackMove(doing) ? fighter : null;
        basic = attacking ? (part.blows?.[doing.landed - 1] ?? 0) : 0;
        landing = { by: fighter, move };
        // Each part of its attack gains it mana, as its first blow lands (King's Raid's: once a part of its attack is under way).
        if (attacking && doing.landed === 1) {
          fighter.mana = Math.min(MAX_MANA, fighter.mana + fighter.manaPerAttack);
          relics.get(fighter)?.basic();
        }
        // (The enemy in question as it lands: the one it is fighting.)
        noting(fighter.abilities.find((one) => one.move === move)?.art ?? passiveArt(fighter), () => asFighter(fighter, () => {
          const own = fighter.part.lands[move];
          if (own) own(index);
          else common[move]?.(fighter, index);
          attacking = null;
          basic = 0;
          landing = null;
          if (doing.blows === 1) {
            for (const mark of fighter.moveMarks[move] ?? []) marked(mark);
            // (A perk's that slows the boss's attacks: its main unique treasure's.)
            const slowing = doing.skill === undefined ? undefined : fighter.perkDefs.find((perk) => perk.skill?.index === doing.skill && perk.skill?.slow)?.skill?.slow;
            if (slowing) sim.slow(slowing.points, slowing.lasts);
          }
        }));
      }
      // (What landed may have cut it short, or ended the raid.)
      if (fighter.doing !== doing || result) return;
    }
    if (doing.t >= part.until) fighter.doing = doing.part + 1 < timeline.parts.length ? { ...doing, part: doing.part + 1, t: 0, landed: 0 } : null;
  }

  /** The boss's parts go on by `dt`: each blow that lands, on whoever it is going for (or as its part says). */
  function bossAdvance(dt: number): void {
    const rate = boss.slowed > 0 ? boss.slowRate : 1;
    for (const [by, moves] of going) {
      const doing = moves[0];
      if (!doing) {
        going.delete(by);
        continue;
      }
      doing.t += dt * rate;
      const move = def.moves[doing.move];
      if (!move) {
        moves.shift();
        if (moves.length === 0) going.delete(by);
        continue;
      }
      if (move.hit !== null && !doing.hit && doing.t >= move.hit) {
        doing.hit = true;
        const [least, most] = move.hurts ?? [0, 0];
        const amount = least + roll() * (most - least);
        const own = boss.part.lands[doing.attack];
        as(boss, () => {
          if (own) own(doing.part, amount);
          else {
            const target = aimed();
            if (target) sim.hurt(target, amount);
          }
        });
        if (result) return;
      }
      if (doing.t >= move.length && going.get(by) === moves) {
        moves.shift();
        if (moves.length === 0) going.delete(by);
      }
    }
  }

  /** A hero's blow on one enemy (`foe`), as Fight.hit says. */
  function strikeFoe(foe: Foe, by: Fighter, amount: number, counted: boolean, pierce: number, whole: boolean): boolean {
      if (foe.hp <= 0 || foe.away || result) return false;
      // The hero whose blow it is: as hard as its attack, and its passive, have it (and harder or softer again for what is on it); now and
      // then far harder, by its crit chance and what its passive and what is on it add; and through its penetration, and the blow's own.
      const { attack, crit } = by.def.passive ?? NO_PASSIVE;
      const { atk, deals: type, crit: points, pen } = by.stats;
      // (Every blow a crit with crit chance enough: Authority's mechanic's.)
      const allCrit = by.set?.effect.allCrit;
      const critical = (allCrit !== undefined && points >= allCrit.at) || roll() < share(curved(CURVE.crit, points + auras.crit + bookShare(by, 'crit') + adding(by.statuses, 'critPoints') + adding(party, 'critPoints')) + critTaking(foe.statuses, type) - curved(CURVE.chance, foe.part.critResist ?? 0)) + crit + critting(by.statuses) + critting(party);
      // (Its additional skills' DMG, and every Whetstone on the field's crit DMG, and what is on it adds: Seria's Cold-Blooded Witch.)
      // (And its Concentration: more for every so many seconds of the fight.)
      const focus = by.perkDefs.find((perk) => perk.focus)?.focus;
      const focused = focus ? focus.critDamage * Math.min(focus.most, Math.floor(elapsed / focus.every)) : 0;
      // (And its set's, growing, and what the sets on the field give every ally.)
      const setCrit = (setEffect(by).grows?.critDamage ?? 0) * grown(setEffect(by), elapsed) + allied(by, 'critDamage') + alliesFrom(field, 'critDamage');
      const critTimes = by.critTimes + SKILL.whetstone.critDamage * among('whetstone') + critDamaging(by.statuses) + critDamaging(party) + auras.critDamage + focused + setCrit;
      // (And its perks': more against the boss, and more for the skill whose blow it is. Its ACC sees past some of the boss's dodge: strike.)
      const skilled = landing?.by === by ? (by.moveDmg[landing.move] ?? 1) : 1;
      const acc = by.acc + auras.acc + adding(by.statuses, 'acc') + adding(party, 'acc');
      // (Less of a block for what is on the boss: a unique treasure's.)
      const plain = foe === boss ? bossStands() : foe.def.stats;
      const lower = { physical: blocking(foe.statuses, 'physical'), magical: blocking(foe.statuses, 'magical') };
      // (And more or less of a dodge for what is on it: Phillop's Destroy Armor's book.)
      const dodge = { physical: Math.max(0, plain.dodge.physical + dodging(foe.statuses, 'physical')), magical: Math.max(0, plain.dodge.magical + dodging(foe.statuses, 'magical')) };
      // (None at all for a hero no block touches: Rebel Klaus's.)
      const unblocked = by.def.passive?.unblocked === true;
      const stood = { ...plain, dodge, block: unblocked ? NONE : { physical: Math.max(0, plain.block.physical + lower.physical), magical: Math.max(0, plain.block.magical + lower.magical) } };
      const through = whole || (landing?.by === by && by.moveWhole.has(landing.move));
      // (Not lowered at all on one whose DEF nothing lowers: Siegfried's.)
      const fixed = foe.part.fixedDefense === true;
      const against = through ? { ...stood, physical: 0, magical: 0 } : fixed ? stood : { ...stood, physical: stood.physical * defending(foe.statuses, 'physical'), magical: stood.magical * defending(foe.statuses, 'magical') };
      // (Its skill's power: its books and its perks for the skill, added up. Then its DMG, all that makes it more, and what is on the
      // boss that has it take more, added up: King's Raid's damage amplifiers.)
      // (And DMG past DEF, the more for its set (Authority's assassin's) and its Sunder; and continuous DMG, for its Corrosion.)
      const pastDef = through ? 1 + (setEffect(by).pastDef ?? 0) + SKILL.sunder.dmg * has(by, 'sunder') : 1;
      const seeped = seeping ? 1 + SKILL.corrosion.dmg * has(by, 'corrosion') : 1;
      const power = (1 + bookShare(by, 'dmg') + skilled - 1) * pastDef * seeped;
      // (And its artifact's: ./artifacts.ts.)
      const more = amplified([dmgTimes(by), attack, ...deals(by.statuses), ...deals(party), by.perkDmg, by.part.deals?.() ?? 1, relics.get(by)?.deals(foe) ?? 1, ...takes(foe.statuses, type)]);
      const { taken, blocked, dodged } = strike(amount * (atk / POINTS) * atkTimes(by) * power * more * (critical ? critTimes : 1), type, against, pen + auras.pen + pierce + piercing(by.statuses) + piercing(party), reachAt(HERO_LEVEL), roll, acc);
      if (dodged) {
        events.push({ kind: 'number', on: 'boss', foe: foe.index, amount: 0, type: 'dodged' });
        return false;
      }
      // (One it is untouched by for now says so, as King's Raid's immune blows do: nothing comes of it.)
      if (foe.part.untouched?.()) {
        events.push({ kind: 'number', on: 'boss', foe: foe.index, amount: 0, type: 'immune', ...(type === 'magical' && { magical: true }) });
        return false;
      }
      events.push({ kind: 'boss-hit', foe: foe.index });
      relics.get(by)?.blow();
      // Its perks that mark the boss as its blows land (Vital Detection, Experienced Fighter, Special Bullet): after this one.
      const marking = by.perkDefs.filter((perk) => perk.mark && (perk.mark.every === undefined || perkDue(by, perk.mark.name, perk.mark.every)));
      // (And more or less by the boss's own: Galgoria's more physical damage, Siegfried's more magic, Scalaxia's less magic; and its attack's blows, Siegfried's more.) Deathless: all of it, and the boss whole again once it would be beaten.
      const struck = taken * (foe.part.taken?.[type] ?? 1) * (attacking === by ? (foe.part.attackTaken ?? 1) : 1);
      const dealt = deathless && foe === boss ? struck : Math.min(foe.hp, struck);
      foe.hp -= dealt;
      if (deathless && foe === boss && foe.hp <= 0) foe.hp = foe.maxHp;
      // (A boss its part spares as it would be beaten is left on its last: Siegfried's Divine Power.)
      if (foe === boss && foe.hp <= 0 && as(boss, () => foe.part.spared?.() === true)) foe.hp = Math.max(foe.hp, 1);
      by.dealt += dealt;
      // (Shown as King's Raid's: a crit over a block, and a skill's blow apart from its attack's and its passive's.)
      const skill = landing?.by === by && by.doing?.skill !== undefined;
      events.push({ kind: 'number', on: 'boss', foe: foe.index, amount: dealt, type: critical ? 'crit' : blocked ? 'blocked' : skill ? 'skill' : 'hit' });
      for (const { mark } of marking) if (mark) put(foe.statuses, { name: mark.name, left: mark.lasts, ...(mark.takes && { takes: mark.takes }), ...(mark.deals && { deals: mark.deals }), ...(mark.crit && { crit: mark.crit }), shown: 'curse' as const });
      // Mortal Wound: a critical blow leaves the boss healed less, and eating at it (perkTick), for a while.
      const wound = critical ? by.perkDefs.find((perk) => perk.wound) : undefined;
      if (wound?.wound) {
        by.wound = wound.wound.lasts;
        put(foe.statuses, { name: wound.name ?? 'Mortal Wound', left: wound.wound.lasts, heals: wound.wound.heals, shown: 'curse' });
      }
      // Lifesteal: a share of what it dealt heals it (less what the boss's skills take off healing).
      // (Not with its artifact having none: Otherworldly Sword's.)
      if (by.lifesteal > 0 && by.hp > 0 && !foe.part.unstolen && relics.get(by)?.steals() !== false) {
        const stolen = Math.min(dealt * share(curved(CURVE.chance, by.lifesteal)) * healing([...by.statuses, ...party]) * (boss.part.healing?.() ?? 1), by.stats.hp - by.hp);
        if (stolen > 0) by.hp += stolen;
      }
      // A critical blow of a skill a perk of its changes (its main unique treasure's): mana, and its cooldown shorter.
      const skillIndex = critical && landing?.by === by && attacking !== by ? by.doing?.skill : undefined;
      if (skillIndex !== undefined) {
        for (const perk of by.perkDefs) {
          if (perk.skill?.index !== skillIndex) continue;
          if (perk.skill.critMana) by.mana = Math.min(MAX_MANA, by.mana + perk.skill.critMana);
          if (perk.skill.critCooldown) by.cooldowns[skillIndex] = Math.max(0, (by.cooldowns[skillIndex] as number) - (by.abilities[skillIndex]?.cooldown ?? 0) * perk.skill.critCooldown);
        }
      }
      if (counted) {
        for (const fighter of fighters) fighter.part.struck?.(by);
        foe.part.struck?.(by, dealt, critical);
        by.part.blow?.(attacking !== by);
      }
      // Kirze's unique weapon: now and then a blow of hers (her attack's or a skill's) deals more, twice over against the boss.
      // (Not mana for her attack, and not counted: it isn't a blow of its own.)
      if (counted && foe.hp > 0 && by.id === 'kirze' && by.unique && roll() < ELICIPIRA.chance) {
        const was = attacking;
        attacking = null;
        strikeFoe(foe, by, atTier(ELICIPIRA.blow, by.unique.tier) * ELICIPIRA.boss, false, 0, false);
        attacking = was;
      }
      // (Brought down already, by what came of the blow: a blow of its hero's own, from its part.)
      if (foe.away || result) return critical;
      if (foe.hp > 0) {
        // (A raid of more than one wave: the boss down to its share, it flies off.)
        if (foe === boss && wave === 1 && waves > 1 && def.waves && foe.hp <= foe.maxHp * def.waves.leaves) bossLeave();
        return critical;
      }
      // (Brought down by its blow: its Bloodlust's stacks.)
      if (has(by, 'bloodlust') > 0) by.stacks.bloodlust = Math.min(SKILL.bloodlust.most, by.stacks.bloodlust + 1);
      beaten(foe);
      return critical;
  }

  /**
   * A hero's blow: on the enemy in question (as its move lands, the one it is fighting; else the one it would be), and, as far
   * about it as the move reaches (./heroes/reach.ts), on every other enemy there (not counted again: a blow of its own each).
   */
  function hitting(by: Fighter, amount: number, counted: boolean, pierce: number, whole: boolean): boolean {
    const target = focus && !focus.away && focus.hp > 0 ? focus : targetOf(by);
    if (!target) return false;
    const critical = as(target, () => strikeFoe(target, by, amount, counted, pierce, whole));
    const reach = counted ? reachOf(by) : 0;
    if (reach > 0)
      for (const other of standing())
        if (other !== target && (other.x - target.x) * (other.x - target.x) + (other.z - target.z) * (other.z - target.z) <= reach * reach) as(other, () => strikeFoe(other, by, amount, false, pierce, whole));
    return critical;
  }
  /** How far about its target a hero's blow landing now reaches (metres): its attack's, or the skill's it is using (./heroes/reach.ts). */
  function reachOf(by: Fighter): number {
    const reach = REACH[by.id];
    if (!reach) return 0;
    if (attacking === by) return reach.attack;
    const skill = landing?.by === by ? by.doing?.skill : undefined;
    // (Kirze's unique weapon: Bloom, Crimson Flower! the wider.)
    if (skill === 2 && by.id === 'kirze' && by.unique) return ELICIPIRA.reach;
    return skill === undefined ? 0 : (reach.skills[skill] ?? 0);
  }

  /** An enemy beaten: the boss, won; a minion, off the field (and its wave, once no other stands, over). */
  function beaten(foe: Foe, blast = false): void {
    // (Once only: a hero's blow that brings it down from inside another's, as Yanne's and Lucikiel's do, already has.)
    if (foe.away || result) return;
    if (foe === boss) {
      as(boss, () => sim.stun(1, { down: true }));
      boss.part.beaten?.();
      end('won');
      return;
    }
    foe.away = true;
    minions.delete(foe);
    events.push({ kind: 'foe-down', foe: foe.index, ...(blast && { blast: true }) });
    if (boss.away && wave < waves && standing().length === 0) nextWave();
  }

  /** The boss flies off the field (the first wave over): the heroes stand while it does (nothing else happens meanwhile), then move on. */
  function bossLeave(): void {
    boss.away = true;
    boss.stunned = 0;
    going.clear();
    aims.clear();
    for (const on of field) on.doing = null;
    lifting = FLY_OFF;
    events.push({ kind: 'boss-leave' });
  }

  /** On to the next wave: the heroes run on (nothing else happens meanwhile), and what is there comes onto the field as they arrive (arrive()). */
  function nextWave(): void {
    wave++;
    moving = RUN_ON;
    aims.clear();
    for (const on of field) on.doing = null;
    events.push({ kind: 'wave', wave, of: waves });
  }

  /** A minion comes onto the field (one of a wave's, or one the boss calls up: Fight.summon), where it stands, as strong as the dragons' are scaled (minionOf). */
  function enter(one: WaveMinion, x: number, z: number): void {
    const made = minionOf(one, solo, def.waves?.party);
    const kind = MINIONS[one.kind];
    const foe: Foe = {
      index: foes.length,
      kind: one.kind,
      def: { id: one.kind, name: kind.name, stats: made.stats },
      part: { lands: {}, ...(kind.steady && { steady: true }) },
      hp: made.hp,
      maxHp: made.hp,
      stunned: 0,
      slowed: 0,
      slowRate: 1,
      statuses: [],
      x,
      z,
      away: false,
    };
    foes.push(foe);
    minions.set(foe, { def: kind, atk: made.atk, doing: null, rest: 0, skill: kind.skill?.first ?? 0, life: 0, fused: false });
    events.push({ kind: 'foe-enter', foe: foe.index, minion: one.kind, x, z });
  }

  /** Arrived at a wave: its minions come onto the field, and at the last, the boss comes back, its landing on the heroes. */
  function arrive(): void {
    const list = later[wave - 2] ?? [];
    /** How many have stood where each spot is so far (by where the wave has them). */
    const placed = new Map<string, number>();
    for (const one of list) {
      let x = MINION_X + one.x * 0.5;
      let z = one.z * 0.45;
      // (Several where one stands: the rest round it, each a turn further on.)
      const spot = `${one.x},${one.z}`;
      const before = placed.get(spot) ?? 0;
      placed.set(spot, before + 1);
      if (before > 0) {
        x += Math.cos((before * Math.PI * 2) / 5) * 1.8;
        z += Math.sin((before * Math.PI * 2) / 5) * 1.8;
      }
      enter(one, x, z);
    }
    if (wave === waves && boss.away && def.waves) {
      boss.away = false;
      events.push({ kind: 'boss-return' });
      const { share, blow, knock } = def.waves.lands;
      as(boss, () => {
        for (const on of reachable()) {
          if (share > 0) sim.hurt(on, on.hp * share, false);
          if (blow) sim.hurt(on, blow);
          sim.knock(on, knock);
        }
      });
    }
    // (What the heroes' artifacts do as a wave begins.)
    for (const hooks of relics.values()) hooks.wave();
  }

  /** The heroes an enemy can reach: on the field, standing, and in the fight. */
  const reachable = (): Fighter[] => field.filter((on) => on.hp > 0 && !away(on.statuses));
  /** The hero a minion goes for with `move`: as King's Raid's go for theirs (foremost, within the move's range), or (`random`) any. */
  function heroFor(foe: Foe, move: MinionMove): Fighter | null {
    const can = reachable();
    if (can.length === 0) return null;
    if (move.random) return can[Math.floor(roll() * can.length)] ?? null;
    return foremost(can, foe.x, foe.z, move.range ?? 0);
  }

  /** The minions' moves go on by `dt`: each fights by itself (./bosses/dragon/minions.ts). */
  function minionsAdvance(dt: number): void {
    for (const [foe, minion] of minions) {
      if (foe.away || foe.hp <= 0) continue;
      minion.life += dt;
      const fuse = minion.def.fuse;
      if (fuse && !minion.fused && minion.life >= fuse.after) {
        // Left standing too long: it lays every hero low; or bursts on those about it (and, gone with it, falls as it does).
        minion.fused = true;
        const { share, blast } = fuse;
        if (!fuse.dies) events.push({ kind: 'foe-use', foe: foe.index, move: 'skill' });
        as(foe, () => {
          if (share) for (const on of reachable()) sim.hurt(on, on.stats.hp * share, false);
          if (blast) for (const on of reachable()) if (edgeTo(on, foe.x, foe.z) <= blast.reach + 1e-9) sim.hurt(on, blast.share * minion.atk, true, blast.deals);
        });
        if (result) return;
        if (fuse.dies) {
          foe.hp = 0;
          beaten(foe, true);
        }
        continue;
      }
      if (foe.stunned > 0) {
        minion.doing = null;
        continue;
      }
      minion.rest -= dt;
      minion.skill -= dt;
      if (!minion.doing && minion.rest <= 0) {
        const skill = minion.def.skill && minion.skill <= 0 ? minion.def.skill : null;
        const move = skill ?? minion.def.attack;
        const target = heroFor(foe, move);
        if (!target) continue;
        if (skill) minion.skill = skill.cooldown;
        minion.doing = { move, t: 0, landed: 0, target };
        events.push({ kind: 'foe-use', foe: foe.index, move: skill ? 'skill' : 'attack' });
      }
      const doing = minion.doing;
      if (!doing) continue;
      doing.t += dt * (foe.slowed > 0 ? foe.slowRate : 1);
      while (doing.landed < doing.move.lands.length && doing.t >= (doing.move.lands[doing.landed] as number)) {
        doing.landed++;
        as(foe, () => minionBlow(foe, minion, doing));
        if (result) return;
      }
      if (doing.t >= doing.move.length) {
        minion.doing = null;
        minion.rest = minion.def.rest;
      }
    }
  }

  /** A blow of a minion's move lands: on its target (or, gone, another), and every hero as far about it as it reaches; and what it leaves on each. */
  function minionBlow(foe: Foe, minion: Minion, doing: NonNullable<Minion['doing']>): void {
    const was = doing.target;
    const target = was && was.hp > 0 && field.includes(was) && !away(was.statuses) ? was : heroFor(foe, doing.move);
    if (!target) return;
    doing.target = target;
    const { reach, leaves } = doing.move;
    const struck = reach === Infinity ? reachable() : reachable().filter((on) => on === target || (on.x - target.x) * (on.x - target.x) + (on.z - target.z) * (on.z - target.z) <= reach * reach);
    for (const on of struck) {
      const took = sim.hurt(on, doing.move.share * minion.atk, true, doing.move.deals);
      if (!leaves || took <= 0 || on.hp <= 0) continue;
      if ('freeze' in leaves) sim.knock(on, leaves.freeze);
      else if ('slow' in leaves) {
        const { lasts, pace, ...shown } = leaves.slow;
        put(on.statuses, { name: shown.name, left: lasts, pace, shown });
      } else {
        const { each, most, ...shown } = leaves.weaken;
        const count = Math.min(most, (on.statuses.find((status) => status.name === shown.name)?.count ?? 0) + 1);
        put(on.statuses, { name: shown.name, left: Infinity, count, deals: Math.max(0, 1 - each * count), shown });
      }
    }
  }

  /**
   * What is on the boss, shown by a picture of what put it there: a skill's, passive's, unique weapon's or artifact's of a
   * hero on the field by its name (`named`, its words in brackets after it aside); else (`whose`) the picture of what the
   * hero was doing as it was put there first: the skill it used, or whose move was landing, or its passive (its attack's
   * blows, and what goes on by itself). Only the page asks: nothing the fight does turns on these.
   */
  const named = new Map<string, Art>();
  for (const { def, artifact } of fighters) {
    for (const shown of [...def.abilities, ...(def.passive ? [def.passive.shown] : [])]) if (shown.art && !named.has(shown.name)) named.set(shown.name, shown.art);
    const weapon = uniqueName(def.id);
    if (weapon) named.set(weapon, { uw: def.id });
    const relic = artifact && artifactBuff(artifact);
    if (relic?.art) named.set(relic.name, relic.art);
  }
  const whose = new Map<string, Art>();
  /** `run` (what `fighter` does), with what it puts on the boss first known by `art`. */
  const noting = <T>(art: Art | undefined, run: () => T): T => {
    if (!art) return run();
    const before = boss.statuses.slice();
    const done = run();
    for (const status of boss.statuses) if (!before.includes(status) && !whose.has(status.name)) whose.set(status.name, art);
    return done;
  };
  const passiveArt = (fighter: Fighter): Art | undefined => fighter.def.passive?.shown.art;
  const statusArt = (status: Status<Tone>): Art => status.art ?? named.get(status.name) ?? named.get(status.name.replace(/ \(.*\)$/, '')) ?? whose.get(status.name) ?? stateArt(TONE_STATE[status.shown]);

  const sim: Sim = {
    raid,
    fighters,
    get field() {
      return field;
    },
    get foe() {
      return current();
    },
    boss,
    foes,
    get wave() {
      return wave;
    },
    waves,
    get moving() {
      return moving;
    },
    party,
    get stage() {
      return stage;
    },
    get bossAuto() {
      return bossAuto;
    },
    get deathless() {
      return deathless;
    },
    get tick() {
      return tick;
    },
    get elapsed() {
      return elapsed;
    },
    get left() {
      return raidTime - clock;
    },
    get result() {
      return result;
    },
    get basic() {
      return basic;
    },
    events,
    log,
    sums,
    roll,
    hit(by, amount, counted = true, pierce = 0, whole = false) {
      return hitting(by, amount, counted, pierce, whole);
    },
    continuous(by, amount) {
      seeping = true;
      try {
        return hitting(by, amount, false, 0, false);
      } finally {
        seeping = false;
      }
    },
    on: as,
    heal(fighter, amount, by, from) {
      if (fighter.hp <= 0) return 0;
      // (The more for its Recovery: its gear's, and what the sets on the field give every ally.)
      const given = amount * byAttack(by) * healed(by) * healing([...fighter.statuses, ...party], 1 + fighter.recovery + allied(fighter, 'recovery')) * (boss.part.healing?.() ?? 1);
      // (Its health goes up only to its max, but the whole heal is counted and shown: its giver's HPS isn't less for an ally at full.)
      fighter.hp = Math.min(fighter.stats.hp, fighter.hp + given);
      const giver = by ?? from;
      if (giver) giver.healed += given;
      if (given > 0) events.push({ kind: 'number', on: fighter.index, amount: given, type: 'heal' });
      return given;
    },
    shield(fighter, amount, seconds = Infinity, by) {
      if (fighter.hp <= 0) return;
      // (And more for its Aegis.)
      const given = amount * byAttack(by) * healed(by) * (by ? 1 + SKILL.aegis.shield * has(by, 'aegis') : 1) * (boss.part.shielding?.() ?? 1);
      fighter.shield += given;
      fighter.shieldLeft = Math.max(fighter.shieldLeft, seconds);
      if (by) by.shielded += given;
    },
    target: aimed,
    hurt(target, amount, blockable = true, kind) {
      if (target.hp <= 0 || away(target.statuses) || result) return 0;
      // (Whose blow it is: the enemy in question, the boss or a minion.)
      const foe = current();
      // Deception: immune to the boss's next blows. (Or what it is doing has it untouched for now.)
      if (target.immune > 0 || target.part.untouched?.()) {
        if (target.immune > 0) target.immune--;
        // (Which kind of damage it is immune to, as King's Raid says: Physical Immune, Magic Immune.)
        events.push({ kind: 'number', on: target.index, amount: 0, type: 'immune', ...((kind ?? foe.def.stats.deals) === 'magical' && { magical: true }) });
        return 0;
      }
      const type = kind ?? foe.def.stats.deals;
      // Harder or softer for what is on the boss, and harder again once the raid's time is up; then dodged, or what the hero's defense against that kind of damage
      // (more for every Hope support on the field), and a block, take off.
      // (And for what is on it: Klaus's unique weapon, Morrah's Hellfire. And what the sets on the field give every ally, and every Bastion among them;
      // and Iron Wall's block, the more at first, and Bulwark's stacks, and what is on it adds. And its set's Tough, growing: Perseverance's knight's.
      // And what its skills that count enemies give for those standing now: foeSkills.)
      const guarded = 1 + allied(target, 'defense') + SKILL.bastion.defense * among('bastion') + alliesFrom(field, 'defense') + foeSkills(target.skills, standing().length).defense;
      const toughened = (setEffect(target).grows?.tough ?? 0) * grown(setEffect(target), elapsed) + adding(target.statuses, 'tough');
      // (None at all while its artifact has it so: Nail Ornament of the Deep's.)
      const bare = relics.get(target)?.noDef() === true;
      const walled = (elapsed < SKILL['iron-wall'].lasts ? SKILL['iron-wall'].more * has(target, 'iron-wall') : 0) + SKILL.bulwark.block * target.stacks.bulwark * has(target, 'bulwark');
      const stands = {
        ...target.stats,
        physical: bare ? 0 : (target.stats.physical + bolstering(target.statuses, 'physical') + bolstering(party, 'physical')) * stacked([guarded, ...defends(target.statuses, 'physical'), ...defends(party, 'physical')]),
        magical: bare ? 0 : (target.stats.magical + bolstering(target.statuses, 'magical') + bolstering(party, 'magical')) * stacked([guarded, ...defends(target.statuses, 'magical'), ...defends(party, 'magical')]),
        block: { physical: target.stats.block.physical + walled + blocking(target.statuses, 'physical'), magical: target.stats.block.magical + walled + blocking(target.statuses, 'magical') },
        tough: { physical: (target.stats.tough?.physical ?? 0) + toughened, magical: (target.stats.tough?.magical ?? 0) + toughened },
      };
      // (Swift and Nimble: more dodge for every second since it last dodged.)
      const nimble = target.nimble > 0 ? target.nimble * (target.perkDefs.find((perk) => perk.nimble)?.nimble?.dodge ?? 0) : 0;
      // (And what it is doing adds: Tanya's Stealth.)
      const nimbler = nimble + (target.part.dodge?.() ?? 0);
      // (And what is on it, or on every hero, adds to it.)
      const nimblest = { physical: nimbler + dodging(target.statuses, 'physical') + dodging(party, 'physical'), magical: nimbler + dodging(target.statuses, 'magical') + dodging(party, 'magical') };
      if (nimblest.physical !== 0 || nimblest.magical !== 0) stands.dodge = { physical: Math.max(0, stands.dodge.physical + nimblest.physical), magical: Math.max(0, stands.dodge.magical + nimblest.magical) };
      // Now and then a crit, by the boss's crit chance less the hero's crit resist against its kind of damage (and what is on it adds).
      const critical = roll() < share(curved(CURVE.crit, foe.def.stats.crit) - curved(CURVE.chance, target.critResist[type] + critResisting(target.statuses, type) + critResisting(party, type))) + critting(foe.statuses);
      // (Through its penetration, and as much of the hero's defense as counts against its level.)
      // (A minion's blows are as hard as they are already: only the boss's go by its stage.)
      const staged = scaleAt(def, stage, solo);
      const scale = foe === boss ? staged : { ...staged, deals: 1 };
      const blow = amount * scale.deals * dealing(foe.statuses) * rage(clock - raidTime) * (critical ? CRIT : 1);
      const { taken, blocked, dodged } = strike(blow, type, blockable ? stands : { ...stands, block: NONE, dodge: NONE }, Math.max(0, (foe.def.stats.pen ?? 0) + piercing(foe.statuses)), reachAt(scale.level), roll, foe.def.stats.acc ?? 0);
      if (dodged) {
        target.mitigated += blow;
        target.nimble = 0;
        events.push({ kind: 'number', on: target.index, amount: 0, type: 'dodged' });
        target.part.dodged?.();
        // Mirage: a dodge mends it a little.
        if (due(target, 'mirage', SKILL.mirage.wait)) sim.heal(target, SKILL.mirage.heal * has(target, 'mirage') * target.stats.hp, undefined, target);
        relics.get(target)?.dodged();
        return 0;
      }
      events.push({ kind: 'hurt', who: target.index, blocked, ...(foe !== boss && { by: foe.index }) });
      // (Less again while every hero is guarded, or it is; more if its passive leaves it easier to hurt;
      // less for its Steadfast's stacks, and a Ward against the boss's kind of damage, the more as the fight's first seconds go.
      // What makes it more adds up, and what makes it less: King's Raid's.)
      const ward = type === 'physical' ? SKILL['physical-ward'] : SKILL['magical-ward'];
      const warded = has(target, type === 'physical' ? 'physical-ward' : 'magical-ward');
      let dealt =
        taken *
        amplified([
          ...takes(party, type),
          ...takes(target.statuses, type),
          target.def.passive?.taken ?? 1,
          target.perkTaken[type],
          target.part.takes?.() ?? 1,
          relics.get(target)?.taken() ?? 1,
          1 - Math.min(0.9, SKILL.steadfast.taken * target.stacks.steadfast * has(target, 'steadfast')),
          warded > 0 ? 1 - Math.min(0.9, warded * (ward.taken + (ward.most - ward.taken) * Math.min(1, elapsed / ward.over))) : 1,
        ]);
      target.mitigated += Math.max(0, blow - dealt);
      target.taken += dealt;
      // A shield on it takes what it can first; its health, the rest.
      const soaked = Math.min(target.shield, dealt);
      target.shield -= soaked;
      if (soaked > 0) events.push({ kind: 'number', on: target.index, amount: soaked, type: 'shield' });
      // Health lost to the boss gains it mana, by the share of its max HP lost. (A blow that would bring down one its part spares leaves it on 1 HP.)
      const losing = Math.min(target.hp, Math.max(0, dealt - soaked));
      // (Nor below what its artifact keeps it at: Ring of Spirit Morph's, at first.)
      const floor = relics.get(target)?.floor() ?? 0;
      const kept = floor > 0 && target.hp > floor ? Math.min(losing, target.hp - floor) : losing;
      const lost = kept >= target.hp && target.hp > 1 && target.part.spared?.() ? target.hp - 1 : kept;
      if (dealt > soaked) {
        target.hp -= lost;
        spare(target);
        events.push({ kind: 'number', on: target.index, amount: dealt - soaked, type: critical ? 'crit' : blocked ? 'blocked' : 'hit' });
      }
      if (target.hp <= 0) {
        target.shield = 0;
        target.doing = null;
        target.reserved = null;
      }
      // (The more for its gear's mana on taking damage.)
      target.mana = Math.min(MAX_MANA, target.mana + (MANA_PER_HP_LOST * (1 + target.manaDamage) * lost) / target.stats.hp);
      if (dealt > 0) for (const fighter of fighters) fighter.part.hurt?.(target);
      if (dealt > 0) relics.get(target)?.hurt(type);
      // Its perks that come of being hit: Vengeful Curse (on the boss), and Deception (once it has taken something).
      for (const perk of target.perkDefs) {
        if (perk.curse && perkDue(target, perk.name ?? perk.words, perk.curse.every)) put(foe.statuses, { name: perk.name ?? 'Curse', art: stateArt('AttackDown'), left: perk.curse.lasts, deals: perk.curse.deals, shown: 'curse' });
        if (perk.immunity && dealt > 0 && target.hp > 0 && perkDue(target, perk.name ?? perk.words, perk.immunity.every)) target.immune = perk.immunity.hits;
      }
      if (blocked) {
        target.part.blocked?.();
        // Parry: a block gains it mana. Bulwark: a block, more block (once in a while).
        if (target.hp > 0 && due(target, 'parry', SKILL.parry.wait)) target.mana = Math.min(MAX_MANA, target.mana + SKILL.parry.mana * has(target, 'parry'));
        if (target.hp > 0 && due(target, 'bulwark', SKILL.bulwark.wait)) target.stacks.bulwark = Math.min(SKILL.bulwark.most, target.stacks.bulwark + 1);
        // Its set's: its skills' cooldowns shorter (Authority's knight's, once in a while).
        const onBlock = setEffect(target).onBlock;
        if (onBlock && target.hp > 0 && perkDue(target, 'set-block', onBlock.wait)) target.cooldowns = target.cooldowns.map((left) => Math.max(0, left - onBlock.cooldown));
      }
      // (What comes of it for the boss whose blow it was: Siegfried's mana, and the shield he breaks.)
      if (foe === boss) boss.part.landed?.(target, blocked);
      return dealt;
    },
    revive(fighter, share, by) {
      if (fighter.hp > 0 || result) return;
      fighter.hp = Math.max(1, fighter.stats.hp * share);
      fighter.doing = null;
      fighter.statuses = [];
      fighter.rested = 0;
      if (by) by.healed += fighter.hp;
      events.push({ kind: 'revive', who: fighter.index });
      events.push({ kind: 'number', on: fighter.index, amount: fighter.hp, type: 'heal' });
    },
    knock(fighter, seconds) {
      // (Not one Authority guards.)
      if (fighter.hp <= 0 || away(fighter.statuses) || fighter.statuses.some((status) => status.guards) || fighter.part.guards?.()) return;
      // (Nor one using a skill a perk has it steady through: its main unique treasure's.)
      const using = fighter.doing?.skill;
      if (using !== undefined && fighter.perkDefs.some((perk) => perk.skill?.index === using && perk.skill.steady)) return;
      // (Nor one its artifact keeps up: Talismans of Resistance's.)
      if (relics.get(fighter)?.knocked() === false) return;
      stagger(fighter);
      // (The shorter for its CC resist, and what is on it adds to it, and its Tenacity; and as its passive, and its part for now, have it.)
      const shorter = Math.max(0, 1 - SKILL.tenacity.control * has(fighter, 'tenacity')) * (fighter.def.passive?.held ?? 1) * (fighter.part.held?.() ?? 1);
      put(fighter.statuses, { name: KNOCKED.name, left: seconds * (1 - share(curved(CURVE.resist, fighter.stats.resist + resisting(fighter.statuses) + auras.resist))) * shorter, binds: true, shown: KNOCKED });
    },
    stagger,
    mend(amount, ...more) {
      const foe = current();
      if (foe.hp <= 0) return;
      const given = Math.min(amount * healing(foe.statuses, ...more), foe.maxHp - foe.hp);
      foe.hp += given;
      mended += given;
    },
    stun(seconds, { down = false, by } = {}) {
      const foe = current();
      if (foe.away || foe.hp <= 0) return;
      // (A hero's: the shorter for the boss's CC resist, less what the hero's accuracy sees past.)
      const held = seconds * (by ? (by.def.passive?.control ?? 1) * by.controlTimes * (1 - share(curved(CURVE.resist, Math.max(0, foe.def.stats.resist + resisting(foe.statuses))) - curved(CURVE.accuracy, by.accuracy + auras.accuracy + accurate(by.statuses) + accurate(party)))) : 1);
      // (A boss with a CC gauge takes it off that instead: only once it is empty is it held, knocked down. Not as it is beaten.)
      // (A minion nothing holds shrugs it off; another is held, what it was doing cut short.)
      if (foe !== boss) {
        if (foe.part.steady || held <= 0) return;
        foe.stunned = Math.max(foe.stunned, held);
        const minion = minions.get(foe);
        if (minion) minion.doing = null;
        events.push({ kind: 'foe-daze', foe: foe.index, seconds: held });
        return;
      }
      const taken = foe.part.controlled && foe.hp > 0 ? foe.part.controlled(held, down) : { seconds: held, down };
      if (!taken || taken.seconds <= 0) return;
      const lasts = taken.seconds;
      going.clear();
      foe.stunned = Math.max(foe.stunned, lasts);
      events.push({ kind: 'boss-daze', seconds: lasts, down: taken.down });
    },
    slow(points, seconds) {
      // (A boss, or minion, nothing slows shrugs it off.)
      const foe = current();
      if (foe.part.steady || foe.away) return;
      const rate = 1 - share(points);
      foe.slowRate = rate;
      foe.slowed = seconds;
      if (foe === boss) events.push({ kind: 'boss-slow', rate, seconds });
    },
    delay(seconds) {
      // (The boss's, as its part keeps them; a minion's skill's, from now if it was ready.)
      const foe = current();
      if (foe.away || foe.hp <= 0) return;
      if (foe === boss) {
        foe.part.delay?.(seconds);
        return;
      }
      const minion = minions.get(foe);
      if (minion?.def.skill) minion.skill = Math.max(0, minion.skill) + seconds;
    },
    summon(one, count, within) {
      if (result) return;
      // (Anywhere within `within` of the boss, as King's Raid's SpawnCreature puts them: its own random offset either way.)
      for (let i = 0; i < count; i++) enter(one, boss.x + (roll() * 2 - 1) * within, boss.z + (roll() * 2 - 1) * within);
      // (The heroes look again for the nearest to go for.)
      aims.clear();
    },
    force(attack) {
      if (boss.away || result) return;
      going.clear();
      boss.stunned = 0;
      bossUse(attack);
    },
    cue(who, name, targets = []) {
      events.push({ kind: 'cue', who: who?.index ?? null, name, targets: targets.map((one) => one.index) });
    },
    ready(fighter, index) {
      return sim.reservable(fighter, index) && (fighter.cooldowns[index] as number) <= 0 && fighter.mana >= (sim.slot(fighter, index) as Ability).cost * SECTION;
    },
    reservable(fighter, index) {
      return sim.slot(fighter, index) !== null && field.includes(fighter) && fighter.hp > 0 && !bound(fighter.statuses) && !sealed(fighter.statuses);
    },
    slot(fighter, index) {
      if (index < 0 || index >= fighter.abilities.length) return null;
      return fighter.part.slot ? fighter.part.slot(index) : (fighter.abilities[index] ?? null);
    },
    input(input) {
      pending.push(input);
      log.push({ ...input, tick });
    },
    marks() {
      const foe = boss;
      const marks: Mark[] = [];
      if (foe.hp <= 0) marks.push({ text: 'Beaten', tone: 'down' });
      else if (foe.stunned > 0) marks.push({ text: `Stunned ${Math.ceil(foe.stunned)}`, tone: 'stun', art: stateArt('Stun'), left: foe.stunned });
      if (foe.slowed > 0) marks.push({ text: `Slowed ${Math.ceil(foe.slowed)}`, tone: 'slow', art: stateArt('SpeedDown'), left: foe.slowed });
      if (foe.hp > 0 && clock > raidTime) {
        const times = rage(clock - raidTime);
        const shown = `×${times < 10 ? times.toFixed(1) : Math.round(times).toLocaleString('en-US')}`;
        marks.push({ text: `Enraged ${shown}`, tone: 'rage', art: stateArt('AttackUp'), count: shown });
      }
      // (One that stacks, or lasts the rest of the fight, says how many are stacked in it in its corner; one that only runs out,
      // the seconds it has left as its sweep. Its words say both.)
      // Its picture: the skill's (or passive's) of the hero whose it is, by its name; else King's Raid's icon for its kind.
      for (const status of foe.statuses) {
        const timed = Number.isFinite(status.left);
        const stacked = status.count !== undefined && timed ? ` ×${status.count}` : '';
        const said = timed ? String(Math.ceil(status.left)) : `×${status.count ?? 1}`;
        const corner = status.count !== undefined || !timed ? { count: String(status.count ?? 1) } : { left: status.left };
        marks.push({ text: `${status.name}${stacked} ${said}`, tone: status.shown, art: statusArt(status), ...corner });
      }
      marks.push(...(foe.part.marks?.() ?? []));
      for (const fighter of fighters) marks.push(...(fighter.part.marks?.() ?? []));
      return marks;
    },
    gauge: () => boss.part.gauge?.() ?? null,
    alarm: () => (warned && boss.hp > 0 && !result ? { ...warned.warning, left: warned.left } : null),
    size: () => boss.part.size?.() ?? 1,
    checksum() {
      const word = new DataView(new ArrayBuffer(8));
      let hash = 0x811c9dc5;
      const mix = (n: number): void => {
        word.setFloat64(0, n);
        for (let i = 0; i < 8; i++) hash = Math.imul(hash ^ word.getUint8(i), 0x01000193);
      };
      mix(tick);
      mix(clock);
      mix(wave);
      mix(moving);
      mix(lifting);
      for (const foe of foes) {
        mix(foe.hp);
        mix(foe.stunned);
        mix(foe.slowed);
        mix(foe.statuses.length);
      }
      for (const fighter of fighters) {
        mix(fighter.hp);
        mix(fighter.mana);
        mix(fighter.shield);
        mix(fighter.dealt);
        mix(fighter.statuses.length);
        mix(fighter.stacks.momentum + fighter.stacks.steadfast + fighter.stacks.bloodlust + fighter.stacks.bulwark);
        mix(fighter.doing ? fighter.doing.t : -1);
        mix(fighter.reserved ?? -1);
        mix(fighter.immune + fighter.nimble + fighter.wound);
        for (const left of fighter.cooldowns) mix(left);
      }
      for (const n of random.state()) mix(n);
      return hash >>> 0;
    },
    step() {
      // (Over: no more steps.)
      if (result) return;
      const from = tick;
      stepOn();
      // A step that ends the fight (the boss beaten, or given up) is one too, as one that doesn't: a page runs its fight to
      // the step the bot's has got to, so it takes the step that ends it as well.
      if (tick === from) {
        tick++;
        if (tick % SECOND === 0) sums.push(sim.checksum());
      }
    },
  };

  /** One step on (sim.step): it may end the fight partway, without moving the step on. */
  function stepOn(): void {
    // What the player did before this step.
    const now = pending;
    pending = [];
    for (const input of now) apply(input);
    if (result) return;
    // A raid's run up to the boss: the heroes run in and nothing else happens (a skill reserved meanwhile waits for it to be
    // over); arrived, they are free to fight.
    if (tick < marching) {
      tick++;
      lineUp(tick / marching);
      if (tick === marching) for (const on of field) on.doing = null;
      if (tick % SECOND === 0) sums.push(sim.checksum());
      return;
    }
    const dt = TICK;
    elapsed += dt;
    aurasNow();
    if (warned && ((warned.left -= dt) <= 0 || (warned.warning.breaks && boss.part.gauge?.() === 0))) warned = null;

    // Boss auto: once the boss has rested, another attack: the one it must use next; or, as King's Raid's bosses do, the first of
    // its skills that is ready, else its plain attack; or (a boss that doesn't say what its plain attack is) one it may, at random.
    idle = bossBusy() ? 0 : idle + dt;
    if (bossAuto && !boss.away && moving <= 0 && idle >= (def.rest ?? AUTO_WAIT)) {
      const forced = boss.part.next?.() ?? null;
      const may = def.attacks.filter((one) => boss.part.ready?.(one.name) ?? true);
      const basic = def.basic;
      const skill = basic ? may.find((one) => !basic.includes(one.name))?.name : undefined;
      // (Of its plain attacks, those it may now: Siegfried's, by how often he has risen again.)
      const plains = basic?.filter((name) => boss.part.ready?.(name) ?? true);
      const pool = plains && plains.length > 0 ? plains : basic;
      const plain = pool ? pool[Math.floor(roll() * pool.length)] : (may[Math.floor(roll() * may.length)] ?? def.attacks[0])?.name;
      bossUse(forced ?? skill ?? plain ?? '');
    }

    for (const fighter of fighters) {
      // (Slower while something on it, or on every hero, holds its mana back.)
      // (Faster for what the sets on the field give every ally.)
      fighter.mana = Math.min(MAX_MANA, fighter.mana + fighter.manaRegen * dt * filling([...fighter.statuses, ...party], 1 + allied(fighter, 'mana')));
      fighter.cooldowns = fighter.cooldowns.map((left) => Math.max(0, left - dt));
      // What another hero gave it runs down: its shield, once its time is up, is gone.
      wear(fighter.statuses, dt);
      fighter.shieldLeft = Math.max(0, fighter.shieldLeft - dt);
      if (fighter.shieldLeft <= 0) fighter.shield = 0;
      skillTick(fighter, dt);
      perkTick(fighter, dt);
      setTick(fighter);
      relics.get(fighter)?.tick(dt);
      noting(passiveArt(fighter), () => asFighter(fighter, () => fighter.part.tick?.(dt)));
      // Hope's wizard's: the ally who has dealt the most, once its time has come, deals more for good.
      const top = setEffect(fighter).top;
      if (top && elapsed >= top.after && elapsed - dt < top.after && field.includes(fighter) && fighter.hp > 0) {
        const most = field.reduce<Fighter | null>((best, on) => (on.hp > 0 && (!best || on.dealt > best.dealt) ? on : best), null);
        if (most) put(most.statuses, { name: `${SET_UP.top.name} ${fighter.index}`, left: Infinity, deals: 1 + top.dmg, shown: SET_UP.top });
      }
      if (result) return;
    }
    // What is on the boss and on the heroes for a while runs down.
    for (const foe of foes) {
      foe.slowed = Math.max(0, foe.slowed - dt);
      foe.stunned = Math.max(0, foe.stunned - dt);
      wear(foe.statuses, dt);
    }
    wear(party, dt);
    if (!deathless) clock += dt;
    as(boss, () => boss.part.tick?.(dt));
    if (result) return;
    // What the boss has given itself back, shown once a second rather than a number every step.
    mendShown += dt;
    if (mendShown >= 1) {
      if (mended >= 1) events.push({ kind: 'number', on: 'boss', amount: mended, type: 'heal', mend: true });
      mended = 0;
      mendShown = 0;
    }

    // The boss flying off, then the heroes running on to the next wave: nothing else happens meanwhile; it gone, they
    // set off; arrived, what is there comes onto the field.
    if (lifting > 0 || moving > 0) {
      if (lifting > 0) {
        lifting = Math.max(0, lifting - dt);
        if (lifting <= 0) nextWave();
      } else {
        moving = Math.max(0, moving - dt);
        if (moving <= 0) arrive();
      }
      tick++;
      if (tick % SECOND === 0) sums.push(sim.checksum());
      return;
    }

    // Each hero on the field: the skill it was told to use (or, on Auto, the one Auto picked), as soon as it is free or only
    // attacking (King's Raid's cuts the attack short); or else, free, its attack. (Not one that can do nothing for now.)
    for (const on of field) {
      on.rested = on.doing ? 0 : on.rested + dt;
      // (On Auto: a pick every so often while it has none and isn't using a skill, or while its skills say Auto picks only
      // from some. What Auto picked is let go once its cooldown has begun again or it may no longer be picked, or Auto is
      // off; not for want of mana, which it waits for.)
      on.autoWait = on.doing?.skill !== undefined && !on.part.autoOnly?.() ? 0 : on.autoWait + dt;
      if (on.reserved !== null && on.autoPicked) {
        const ability = sim.slot(on, on.reserved);
        if (!on.auto || !ability || (on.cooldowns[on.reserved] as number) > 0 || !wanted(on, on.reserved, ability)) {
          on.reserved = null;
          on.autoWait = 0;
        }
      }
      if (on.auto && on.reserved === null && on.autoWait >= AUTO.every) {
        on.reserved = autoSkill(on);
        on.autoPicked = true;
        on.autoWait = 0;
      }
      // (A skill pressed while it can do nothing waits for it; and one pressed short of mana waits for the mana, the hero
      // attacking meanwhile.)
      if (on.reserved !== null && !sim.reservable(on, on.reserved) && !bound(on.statuses)) on.reserved = null;
      if (on.hp > 0 && !bound(on.statuses)) {
        if (on.reserved !== null && use(on, on.reserved)) on.reserved = null;
        else if (!on.doing && on.rested >= (KR_HEROES[on.id]?.wait ?? HERO_WAIT) && targetOf(on)) begin(on, on.part.attack?.() ?? on.attack, null);
      }
    }

    // The boss has just begun an attack (or been stunned): whom it goes for, this time.
    const busy = bossBusy();
    if (busy && !was) aim = anyone();
    was = busy;
    bossAdvance(dt);
    if (result) return;
    minionsAdvance(dt);
    if (result) return;
    // Each hero's move goes on (quickened by its attack speed, its own skills and what is on it), and each over to its spot.
    const reform = Math.min(1, dt * REFORM);
    for (const on of field) {
      // (Its attack speed, all of it with what is on it and what quickens it, on King's Raid's curve: 1000 points as quick as it
      // comes, never slower than SLOWEST. One whose passive has it steady: as it comes, whatever its attack speed or what is on it.)
      const speed = (on.stats.speed + auras.speed + allied(on, 'speed') + adding(on.statuses, 'speed') + adding(party, 'speed') + (on.part.speed?.() ?? 0)) * pacing([...on.statuses, ...party], on.part.pace?.() ?? 1);
      on.haste = on.def.passive?.steady ? 1 : Math.max(SLOWEST, curved(CURVE.speed, speed)) / POINTS;
      advance(on, dt * on.haste);
      if (result) return;
      const [x, z] = spots.get(on) as readonly [number, number];
      on.x += (x - on.x) * reform;
      on.z += (z - on.z) * reform;
    }

    // Every hero on the field down, or wiped by the boss's rage: lost.
    if (!deathless && ((field.length > 0 && field.every((on) => on.hp <= 0)) || clock >= raidTime + RAGE_WIPE)) end('lost');
    tick++;
    if (tick % SECOND === 0) sums.push(sim.checksum());
  }

  /** An input, as it counts (one that makes no sense, or only does when trying things out, in a raid: none). */
  function apply(input: Input): void {
    const fighter = 'fighter' in input ? fighters[input.fighter] : undefined;
    switch (input.kind) {
      case 'skill':
        if (!fighter) return;
        if (fighter.reserved === input.skill) fighter.reserved = null;
        else if (sim.reservable(fighter, input.skill)) {
          fighter.reserved = input.skill;
          fighter.autoPicked = false;
        }
        return;
      // (Not one in the Sub Team's: it stays on Auto.)
      case 'auto':
        if (fighter && !fighter.sub) fighter.auto = !fighter.auto;
        return;
      case 'all-auto': {
        const main = fighters.filter((one) => !one.sub);
        const on = !main.every((one) => one.auto);
        for (const one of main) one.auto = on;
        return;
      }
      case 'leave':
        if (raid) end('lost');
        return;
    }
    if (raid) return;
    switch (input.kind) {
      case 'toggle':
        if (!fighter) return;
        if (!field.includes(fighter)) {
          stand(fighter);
          return;
        }
        field = field.filter((on) => on !== fighter);
        spots.delete(fighter);
        form();
        fighter.reserved = null;
        fighter.doing = null;
        events.push({ kind: 'leave', who: fighter.index });
        return;
      case 'boss':
        bossUse(input.attack);
        return;
      case 'boss-auto':
        bossAuto = !bossAuto;
        return;
      case 'deathless':
        deathless = !deathless;
        // (Turned on: anyone down already is up again, whole.)
        if (deathless) {
          for (const fighter of fighters) if (fighter.hp <= 0) sim.revive(fighter, 1);
          if (boss.hp <= 0) boss.hp = boss.maxHp;
        }
        return;
      case 'stage':
        stage = Math.min(stagesOf(def), Math.max(1, Math.floor(input.stage) || 1));
        return;
    }
  }

  boss.part = as(boss, () => def.join?.(sim) as BossPart | undefined) ?? boss.part;
  // Each hero's artifact (./artifacts.ts): what it does as the fight goes, and what comes of it beginning.
  for (const fighter of fighters) {
    const hooks = artifactHooks(fighter, {
      elapsed: () => elapsed,
      field: () => field,
      boss: () => boss,
      foe: current,
      aim: (by) => targetOf(by) ?? current(),
      foes: standing,
      on: (foe, run) => void as(foe, run),
      dragon: DRAGON_IDS.has(def.id),
      roll,
      hit: (by, amount) => void sim.hit(by, amount, true),
      continuous: (by, amount) => void sim.continuous(by, amount),
      whole: (by, amount) => void sim.hit(by, amount, false, 0, true),
      // (Its wearer's healing, and shield.)
      heal: (on, amount) => void sim.heal(on, amount, undefined, fighter),
      shield: (on, amount, seconds) => sim.shield(on, amount, seconds),
      stun: (by, seconds, down = false) => sim.stun(seconds, { down, by }),
      slow: (points, seconds) => sim.slow(points, seconds),
      delay: (seconds) => sim.delay(seconds),
      dispel,
      // (Only an enemy that has mana: Siegfried.)
      drain: (mana) => current().part.drain?.(mana),
      due: (on, name, again) => perkDue(on, name, again),
    });
    if (hooks) relics.set(fighter, hooks);
  }
  for (const hooks of relics.values()) hooks.begin();
  // A set's that comes round every so often (Hope's mechanic's) comes first after that long, as King's Raid's timers do.
  for (const fighter of fighters) {
    const tick = setEffect(fighter).tick;
    if (tick) fighter.perkWaits.set = tick.every;
  }
  // Champion: the ally with the highest ATK deals more for a while (more again for every Champion among them).
  const champions = fighters.reduce((count, fighter) => count + has(fighter, 'champion'), 0);
  if (champions > 0) {
    const strongest = fighters.reduce<Fighter | null>((best, fighter) => (!best || fighter.stats.atk > best.stats.atk ? fighter : best), null);
    if (strongest) put(strongest.statuses, { name: CHAMPION_UP.name, left: SKILL.champion.lasts, deals: 1 + SKILL.champion.dmg * champions, shown: CHAMPION_UP });
  }
  for (const fighter of fighters) fighter.part = fighter.def.join(sim, fighter);
  // On the field from the start: in a raid, every hero (as many as fit); trying things out, the ones asked for, or the first.
  for (const fighter of raid ? fighters : first.map((index) => fighters[index])) if (fighter && !field.includes(fighter)) stand(fighter);
  if (field.length === 0 && fighters[0]) stand(fighters[0]);
  if (marching > 0) {
    // How long each hero runs, for its body to stop running as it arrives where it stands.
    const runs = new Map<Fighter, number>();
    for (let t = 1; t <= marching; t++)
      lineUp(t / marching, (on) => {
        if (!runs.has(on)) runs.set(on, t * TICK);
      });
    for (const event of events) if (event.kind === 'enter') event.run = runs.get(fighters[event.who] as Fighter) ?? MARCH;
    lineUp(0);
  }
  return sim;
}
