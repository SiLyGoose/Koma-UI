import { scaleAt, stagesOf, type BossDef, type BossPart } from './bosses/boss';
import { ATK, HERO_LEVEL, NONE, POINTS, reachAt, share, soft, SOFT, strike } from './combat/damage';
import { accurate, amplified, away, blocking, bolstering, bound, critDamaging, critResisting, critTaking, critting, dealing, deals, defending, defends, filling, healing, pacing, piercing, put, resisting, stacked, takes, wear, type Status } from './combat/status';
import type { Input, Logged, Result, SimEvent } from './events';
import { geared } from './gear';
import { lineOf, nearer, NO_PASSIVE, type Ability, type HeroDef } from './heroes/kit';
import type { HeroMove } from './heroes/moves';
import { motionOf } from './motion';
import { seeded } from './random';
import { AUTO, AUTO_WAIT, BLOW, CRIT, formation, HERO_WAIT, HERO_X, MANA_PER_ATTACK, MARCH, MARCH_ABREAST, MARCH_FROM, marchLeft, MARCH_ROW, MANA_PER_HP_LOST, MANA_RATE, MAX_MANA, MOST, rage, RAGE_WIPE, RAID_TIME, REFORM, SECTION, TICK } from './rules';
import { AUTHORITY, GUARDED, HOPE, PERSEVERANCE, setOf } from './sets';
import type { Buff, Mark } from './shown';
import { CHAMPION_UP, DESPERATION_UP, MENDING_UP, SKILL, skilledCritDamage, skilledStats, skillsOf, SURGE_UP, type SkillId } from './skills';
import type { Fight, Fighter, Foe, GearBonus } from './types';
import { atTier, ELICIPIRA, EXIAN, EXIAN_UP, ROSMERTA, ROSMERTA_UP, uniqueOf } from './unique';
import { auraTotal, moveDmg, moveHeals, moveMarks, moveWhole, perkedStats, perksOf, tweaked, withPerks, type PerkDef, type SkillMark, type SkillStatus } from './perks';
import { treasureOf } from './treasures';

/*
 * The fight, worked out with nothing drawn: a boss and the heroes, up to MOST of them on the field at once,
 * each where its class stands (the frontline nearest the boss, the backline furthest from it: ./rules.ts).
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
}

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
  /** A number that sums up how the fight stands (two fights that stand the same have the same). */
  checksum(): number;
}

/** The boss's defenses as blows with `acc` points of ACC find them (soft-capped): so much less likely dodged or blocked. */
const seenPast = (stats: BossDef['stats'], points: number): BossDef['stats'] => {
  const acc = soft(points, SOFT.acc);
  return {
    ...stats,
    dodge: { physical: Math.max(0, stats.dodge.physical - acc), magical: Math.max(0, stats.dodge.magical - acc) },
    block: { physical: Math.max(0, stats.block.physical - acc), magical: Math.max(0, stats.block.magical - acc) },
  };
};

/** What knocks a hero down: shown on its card, with how long it has left. */
const KNOCKED: Buff = { name: 'Knocked down', about: 'Can do nothing until it is up.', icon: '💫', harmful: true };

/** Steps in a second (a checksum is kept at the end of each). */
const SECOND = Math.round(1 / TICK);

/** The run up to the boss: how much of the way through it the heroes begin fanning out to where each stands. */
const FAN = 0.6;
/** How far short of where it stands (along the field) a hero begins turning toward it, to arrive there and wait for the rest. */
const NEAR = 6;

export function makeSim({ boss: def, heroes, seed, stage: firstStage, raid, solo = false, first = [], deathless: noDeaths = false }: SimOptions): Sim {
  const random = seeded(seed);
  const roll = (): number => random.next();
  const events: SimEvent[] = [];
  /** The mana each hero has spent on skills this step (what it gained is counted past it, for its Auto). */
  const spent = new Map<Fighter, number>();
  const log: Logged[] = [];
  const sums: number[] = [];
  let pending: Input[] = [];
  const maxHp = def.stats.hp * scaleAt(def, firstStage, solo).hp;
  const foe: Foe = { def, part: { lands: {} }, hp: maxHp, maxHp, stunned: 0, slowed: 0, slowRate: 1, statuses: [] };
  let tick = 0;
  let elapsed = 0;
  /** Seconds of the raid's time gone, against this boss. */
  let clock = 0;
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
  const fighters: Fighter[] = heroes.map(({ def: hero, skin = 0, gear: worn = {}, set: wearing = null, uw = null, skills: tm = null, sub = false }, index) => {
    const set = setOf(wearing, hero.class);
    const tier = uniqueOf(hero.id, uw);
    const skills = skillsOf(tm);
    const n = (id: SkillId): number => skills[id] ?? 0;
    // Its perks' stats, as its gear's are (and Battle Cry's max HP, from every ally's).
    const perks = perkSets[index] as Map<string, PerkDef>;
    const gear = withPerks(worn, perks.values());
    if (battleCry > 0) gear.hp = (gear.hp ?? 0) + battleCry;
    const stats = perkedStats(geared(hero.stats, gear), perks.values());
    // A set's effects on its wearer's own stats, from the start.
    if (set?.id === 'authority' && set.role === 'dps') stats.pen += AUTHORITY.pen;
    if (set?.id === 'authority' && set.role === 'knight') stats.resist += AUTHORITY.resist;
    // Its additional skills' on its own stats, from the start.
    skilledStats(stats, skills);
    const motion = motionOf(hero);
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
      unique: tier === null ? null : { tier, casts: 0 },
      treasure: treasures[index] ?? null,
      skills,
      stacks: { momentum: 0, steadfast: 0 },
      waits: Object.fromEntries(EVERY.filter((id) => n(id) > 0).map((id) => [id, (SKILL[id] as { every: number }).every])),
      controlTimes: 1 + (gear.control ?? 0),
      accuracy: gear.accuracy ?? 0,
      lifesteal: gear.lifesteal ?? 0,
      critResist: { physical: (gear.critResist ?? 0) + (gear.critResistPhysical ?? 0), magical: (gear.critResist ?? 0) + (gear.critResistMagical ?? 0) },
      manaPerAttack: MANA_PER_ATTACK * (1 + (gear.manaAttack ?? 0)),
      manaRegen: MANA_RATE * (1 + (gear.manaRegen ?? 0)),
      motion,
      attack: motion.attack,
      part: { lands: {} },
      hp: stats.hp,
      shield: 0,
      shieldLeft: 0,
      statuses: [],
      // As it comes into the fight: whole, with half its mana (and more with Authority's support).
      mana: Math.min(MAX_MANA, MAX_MANA / 2 + (set?.id === 'authority' && set.role === 'support' ? AUTHORITY.mana : 0)),
      sub,
      // On Auto from the start in a raid (the Main Team's can be taken off it); trying things out, not.
      auto: sub || raid,
      cooldowns: hero.abilities.map(() => 0),
      reserved: null,
      lastUsed: hero.abilities.map(() => -Infinity),
      income: MANA_RATE * (1 + (gear.manaRegen ?? 0)),
      rested: 0,
      dealt: 0,
      healed: 0,
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

  /** The hero whose attack's blow is landing right now (null: none: a skill's, or something else's); and whose move, and which. */
  let attacking: Fighter | null = null;
  let landing: { by: Fighter; move: HeroMove } | null = null;

  /** How long the boss has been still; what each of its parts (heads) is doing, and will do after; whom it goes for, and whether it was busy last step. */
  let idle = 0;
  const going = new Map<string, { move: string; attack: string; part: number; t: number; hit: boolean }[]>();
  let aim: Fighter | null = null;
  let was = false;
  const bossBusy = (): boolean => going.size > 0 || foe.stunned > 0;
  /** The boss begins an attack: not while it is stunned, or while any part of it the attack needs is still at another. */
  function bossUse(attack: string): void {
    const plan = def.plans[attack] ?? [];
    if (foe.stunned > 0 || plan.length === 0 || plan.some(([, by]) => going.has(by))) return;
    plan.forEach(([move, by, after], part) => {
      const moves = going.get(by) ?? [];
      moves.push({ move, attack, part, t: -after, hit: false });
      going.set(by, moves);
    });
    events.push({ kind: 'boss-use', attack });
    foe.part.used?.(attack);
  }
  /** The boss's stats as it stands the heroes' blows at this stage: its defenses so many times its own. */
  function bossStands(): BossDef['stats'] {
    const times = scaleAt(def, stage, solo).defense ?? 1;
    return times === 1 ? def.stats : { ...def.stats, physical: def.stats.physical * times, magical: def.stats.magical * times };
  }
  /** One of the heroes on the field the boss can go for (not one out of the fight), at random: one standing, if any is (null: there is none). */
  const anyone = (): Fighter | null => {
    const there = field.filter((fighter) => !away(fighter.statuses));
    const up = there.filter((fighter) => fighter.hp > 0);
    const from = up.length > 0 ? up : there;
    return from.length > 0 ? (from[Math.floor(roll() * from.length)] as Fighter) : null;
  };
  /** Whom the boss is going for: another, should that one have left the field, or the fight. */
  const aimed = (): Fighter | null => {
    if (!aim || !field.includes(aim) || away(aim.statuses)) aim = anyone();
    return aim;
  };

  /** Heroes on the field, standing and in the fight, with a set's `role` (each support of Hope's or Perseverance's gives every ally more). */
  const wearing = (id: string, role: string): Fighter[] => field.filter((on) => on.hp > 0 && !away(on.statuses) && on.set?.id === id && on.set.role === role);
  /** How many of an additional skill the heroes on the field, standing and in the fight, have between them (one that gives every ally something). */
  const among = (id: SkillId): number => field.reduce((count, on) => count + (on.hp > 0 && !away(on.statuses) ? (on.skills[id] ?? 0) : 0), 0);
  /** What every ally gains, as this step began, from the perks of the heroes on the field and standing (./perks.ts's auras). */
  const auras = { atk: 0, crit: 0, critDamage: 0, speed: 0, pen: 0, acc: 0, accuracy: 0, resist: 0, mend: 0 };
  function aurasNow(): void {
    const standing = field.filter((on) => on.hp > 0 && !away(on.statuses)).map((on) => on.perkDefs);
    for (const key of Object.keys(auras) as (keyof typeof auras)[]) auras[key] = auraTotal(standing, key);
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
   * How many times its ATK a hero's blows, heals and shields go by, for now: every Hope and Perseverance support
   * on the field and every War Cry among them; and its own Momentum's stacks and Desperation. (All added up, as King's
   * Raid's ATK is: ./combat/status.ts.)
   */
  const atkTimes = (by: Fighter): number =>
    stacked([
      1 + HOPE.atk * wearing('hope', 'support').length + PERSEVERANCE.atk * wearing('perseverance', 'support').length + SKILL['war-cry'].atk * among('war-cry') + auras.atk,
      1 + SKILL.momentum.atk * by.stacks.momentum * has(by, 'momentum'),
      bears(by, DESPERATION_UP.name) ? 1 + SKILL.desperation.atk * has(by, 'desperation') : 1,
    ]);
  /**
   * How many times as much DMG a hero's blows deal besides (not its heals): Perseverance's damage dealer, growing as
   * the fight goes on; and its own Vigor while its health is high, Persistence growing, and Fundamentals on its attack.
   */
  const dmgTimes = (by: Fighter): number => {
    const set = by.set?.id === 'perseverance' && by.set.role === 'dps' ? PERSEVERANCE.dmg + PERSEVERANCE.step * Math.min(PERSEVERANCE.most, Math.floor(elapsed / PERSEVERANCE.every)) : 0;
    const vigor = by.hp > by.stats.hp * SKILL.vigor.above ? SKILL.vigor.dmg * has(by, 'vigor') : 0;
    const persistence = SKILL.persistence.dmg * has(by, 'persistence') * Math.min(SKILL.persistence.most, Math.floor(elapsed / SKILL.persistence.every));
    const fundamentals = attacking === by ? SKILL.fundamentals.dmg * has(by, 'fundamentals') : 0;
    return 1 + set + vigor + persistence + fundamentals;
  };
  /** How many times as much a heal or a shield gives for the hero whose it is (its attack, its gear and its Mending; one that is no hero's: as much as it says). */
  const byAttack = (by: Fighter | undefined): number =>
    by ? (by.stats.atk / ATK) * atkTimes(by) * by.healTimes * (bears(by, MENDING_UP.name) ? 1 + SKILL.mending.heal * has(by, 'mending') : 1) : 1;

  /** How many times as much the heal or shield of the skill landing gives, by its perks (its main unique treasure's: moveHeals). */
  const healed = (by: Fighter | undefined): number => (by && landing?.by === by ? (by.moveHeals[landing.move] ?? 1) : 1);

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

  /** A hero uses a skill (true if it did: it must be free). */
  function use(fighter: Fighter, index: number): boolean {
    const ability = sim.slot(fighter, index);
    if (!ability || fighter.doing || !sim.ready(fighter, index)) return false;
    begin(fighter, ability.move, index);
    // Authority's knight: its skills strip what helps the boss.
    if (fighter.set?.id === 'authority' && fighter.set.role === 'knight') dispel();
    for (const perk of fighter.perkDefs) if (perk.skill?.index === index) usedWith(fighter, perk.skill);
    fighter.cooldowns[index] = ability.cooldown;
    fighter.lastUsed[index] = elapsed;
    fighter.mana -= ability.cost * SECTION;
    spent.set(fighter, (spent.get(fighter) ?? 0) + ability.cost * SECTION);
    fighter.part.used?.(index, ability);
    uniqueCast(fighter);
    skillCast(fighter);
    return true;
  }

  /** What helps the boss (makes it deal more) is gone. */
  function dispel(): void {
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
    if (skill.heal) sim.heal(fighter, skill.heal * fighter.stats.hp);
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
    put(foe.statuses, { name, left: lasts, ...does, shown: 'curse' });
  }

  /**
   * Auto: the skill a hero uses now (null: none yet: it attacks meanwhile). Of the skills it wants (a heal once an ally
   * is hurt or bears something it can clear, one that keeps a status up once that runs out, any other always), it goes
   * for the one it has gone longest without whose cooldown is over (the dearer, where alike), or else the one whose
   * cooldown ends soonest, and saves its mana for it; another it uses meanwhile only if that still has its mana once it
   * can be used, by what the hero gains a second lately. One whose moment its hero says hasn't come is saved for, not
   * used. At full mana, rather than waste what it gains, the one it has gone longest without that it can use.
   */
  function autoSkill(on: Fighter): number | null {
    // (Nothing it could use now: nothing to pick yet.)
    if (!on.abilities.some((_, index) => sim.ready(on, index))) return null;
    const wait = (index: number): number => on.cooldowns[index] as number;
    const last = (index: number): number => on.lastUsed[index] ?? -Infinity;
    // Longest without first, then the dearer, then the later in its slots.
    const slots = on.abilities
      .map((_, index) => ({ index, ability: sim.slot(on, index) }))
      .filter((one): one is { index: number; ability: Ability } => one.ability !== null && wanted(one.ability))
      .sort((a, b) => (last(a.index) === last(b.index) ? 0 : last(a.index) < last(b.index) ? -1 : 1) || b.ability.cost - a.ability.cost || b.index - a.index);
    const ripe = (index: number): boolean => on.part.ripe?.(index) ?? true;
    const usable = ({ index }: { index: number }): boolean => ripe(index) && sim.ready(on, index);
    const target = slots.find((slot) => wait(slot.index) <= 0) ?? slots.reduce<(typeof slots)[number] | undefined>((soonest, slot) => (!soonest || wait(slot.index) < wait(soonest.index) ? slot : soonest), undefined);
    if (!target) return null;
    if (usable(target)) return target.index;
    // Another meanwhile, if what the target would then lack comes in before its cooldown is over.
    for (const slot of slots) {
      if (slot === target || !usable(slot)) continue;
      const lacks = target.ability.cost * SECTION - (on.mana - slot.ability.cost * SECTION);
      if (lacks <= 0 || lacks <= on.income * wait(target.index)) return slot.index;
    }
    if (on.mana < MAX_MANA) return null;
    return slots.find(usable)?.index ?? null;
  }

  /** Auto: whether a skill is wanted now (a heal once an ally is hurt or bears something it can clear; one that keeps a status up once it runs out). */
  function wanted(ability: Ability): boolean {
    const allies = field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    if (ability.auto?.heals && !allies.some((ally) => ally.hp < ally.stats.hp * AUTO.hurt || ally.statuses.some((status) => status.shown.harmful === true && !status.binds && !status.away))) return false;
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
    if (due(fighter, 'regeneration', SKILL.regeneration.every)) sim.heal(fighter, SKILL.regeneration.heal * n('regeneration') * fighter.stats.hp);
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
    if (wound && (tick + 1) % SECOND === 0) sim.hit(fighter, wound.each, false);
    if ((tick + 1) % SECOND !== 0 || !field.includes(fighter) || fighter.hp <= 0 || away(fighter.statuses)) return;
    if (auras.mend > 0) sim.heal(fighter, auras.mend * fighter.stats.hp);
    const nimble = fighter.perkDefs.find((perk) => perk.nimble)?.nimble;
    if (nimble) fighter.nimble = Math.min(nimble.most, fighter.nimble + 1);
  }

  /** A hero wielding its own unique weapon has used a skill (./unique.ts): Klaus's every third, and Fallen Frey's every one. */
  function uniqueCast(fighter: Fighter): void {
    const unique = fighter.unique;
    if (!unique) return;
    unique.casts++;
    if (fighter.id === 'klaus' && unique.casts % EXIAN.every === 0) {
      const boost = 1 + atTier(EXIAN.boost, unique.tier);
      put(fighter.statuses, { name: EXIAN_UP.name, left: EXIAN.lasts, deals: boost, defends: boost, shown: EXIAN_UP });
    } else if (fighter.id === 'fallen-frey') {
      // (A share of her ATK: a heal's numbers are at ATK.)
      sim.heal(fighter, atTier(ROSMERTA.heal, unique.tier) * ATK, fighter);
      put(fighter.statuses, { name: ROSMERTA_UP.name, left: ROSMERTA.lasts, pen: atTier(ROSMERTA.pen, unique.tier), shown: ROSMERTA_UP });
    }
  }

  /** What comes of the moves every hero has, as each part lands (unless its own part says otherwise). */
  const common: Partial<Record<HeroMove, (fighter: Fighter, part: number) => void>> = {
    // A blow of its attack, the last the hardest.
    attack: (fighter, part) => sim.hit(fighter, BLOW * (part === 4 ? 1.6 : 1)),
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
        // (A blow of its attack gains it mana: hit() is told whose attack is landing.)
        attacking = move === fighter.attack ? fighter : null;
        landing = { by: fighter, move };
        const own = fighter.part.lands[move];
        if (own) own(index);
        else common[move]?.(fighter, index);
        attacking = null;
        landing = null;
        if (doing.blows === 1) {
          for (const mark of fighter.moveMarks[move] ?? []) marked(mark);
          // (A perk's that slows the boss's attacks: its main unique treasure's.)
          const slowing = doing.skill === undefined ? undefined : fighter.perkDefs.find((perk) => perk.skill?.index === doing.skill && perk.skill?.slow)?.skill?.slow;
          if (slowing) sim.slow(slowing.points, slowing.lasts);
        }
      }
      // (What landed may have cut it short, or ended the raid.)
      if (fighter.doing !== doing || result) return;
    }
    if (doing.t >= part.until) fighter.doing = doing.part + 1 < timeline.parts.length ? { ...doing, part: doing.part + 1, t: 0, landed: 0 } : null;
  }

  /** The boss's parts go on by `dt`: each blow that lands, on whoever it is going for (or as its part says). */
  function bossAdvance(dt: number): void {
    const rate = foe.slowed > 0 ? foe.slowRate : 1;
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
        const own = foe.part.lands[doing.attack];
        if (own) own(doing.part, amount);
        else {
          const target = aimed();
          if (target) sim.hurt(target, amount);
        }
        if (result) return;
      }
      if (doing.t >= move.length && going.get(by) === moves) {
        moves.shift();
        if (moves.length === 0) going.delete(by);
      }
    }
  }

  const sim: Sim = {
    raid,
    fighters,
    get field() {
      return field;
    },
    foe,
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
      return RAID_TIME - clock;
    },
    get result() {
      return result;
    },
    events,
    log,
    sums,
    roll,
    hit(by, amount, counted = true, pierce = 0, whole = false) {
      if (foe.hp <= 0 || result) return false;
      // The hero whose blow it is: as hard as its attack, and its passive, have it (and harder or softer again for what is on it); now and
      // then far harder, by its crit chance and what its passive and what is on it add; and through its penetration, and the blow's own.
      const { attack, crit } = by.def.passive ?? NO_PASSIVE;
      const { atk, deals: type, crit: points, pen } = by.stats;
      const critical = roll() < share(points + auras.crit + critTaking(foe.statuses, type) - (foe.part.critResist ?? 0)) + crit + critting(by.statuses);
      // (Its additional skills' DMG, and every Whetstone on the field's crit DMG, and what is on it adds: Seria's Cold-Blooded Witch.)
      // (And its Concentration: more for every so many seconds of the fight.)
      const focus = by.perkDefs.find((perk) => perk.focus)?.focus;
      const focused = focus ? focus.critDamage * Math.min(focus.most, Math.floor(elapsed / focus.every)) : 0;
      const critTimes = by.critTimes + SKILL.whetstone.critDamage * among('whetstone') + critDamaging(by.statuses) + auras.critDamage + focused;
      // (And its perks': more against the boss, and more for the skill whose blow it is. Its ACC sees past some of the boss's dodge and block.)
      const skilled = landing?.by === by ? (by.moveDmg[landing.move] ?? 1) : 1;
      const acc = by.acc + auras.acc;
      // (Less of a block for what is on the boss: a unique treasure's.)
      const plain = bossStands();
      const lower = { physical: blocking(foe.statuses, 'physical'), magical: blocking(foe.statuses, 'magical') };
      const stood = lower.physical === 0 && lower.magical === 0 ? plain : { ...plain, block: { physical: Math.max(0, plain.block.physical + lower.physical), magical: Math.max(0, plain.block.magical + lower.magical) } };
      const seen = acc > 0 ? seenPast(stood, acc) : stood;
      const through = whole || (landing?.by === by && by.moveWhole.has(landing.move));
      const against = through ? { ...seen, physical: 0, magical: 0 } : { ...seen, physical: seen.physical * defending(foe.statuses, 'physical'), magical: seen.magical * defending(foe.statuses, 'magical') };
      // (Its DMG, all that makes it more, and what is on the boss that has it take more, add up: King's Raid's damage amplifiers.)
      const more = amplified([dmgTimes(by), attack, ...deals(by.statuses), by.perkDmg, skilled, by.part.deals?.() ?? 1, ...takes(foe.statuses, type)]);
      const { taken, blocked, dodged } = strike(amount * (atk / POINTS) * atkTimes(by) * more * (critical ? critTimes : 1), type, against, pen + auras.pen + pierce + piercing(by.statuses), reachAt(HERO_LEVEL), roll);
      if (dodged) {
        events.push({ kind: 'number', on: 'boss', amount: 0, type: 'dodged' });
        return false;
      }
      events.push({ kind: 'boss-hit' });
      // Its perks that mark the boss as its blows land (Vital Detection, Experienced Fighter, Special Bullet): after this one.
      const marking = by.perkDefs.filter((perk) => perk.mark && (perk.mark.every === undefined || perkDue(by, perk.mark.name, perk.mark.every)));
      // (And more or less by the boss's own: Galgoria's more physical damage.) Deathless: all of it, and the boss whole again once it would be beaten.
      const struck = taken * (foe.part.taken?.[type] ?? 1);
      const dealt = deathless ? struck : Math.min(foe.hp, struck);
      foe.hp -= dealt;
      if (deathless && foe.hp <= 0) foe.hp = foe.maxHp;
      by.dealt += dealt;
      events.push({ kind: 'number', on: 'boss', amount: dealt, type: blocked ? 'blocked' : critical ? 'crit' : 'hit' });
      for (const { mark } of marking) if (mark) put(foe.statuses, { name: mark.name, left: mark.lasts, ...(mark.takes && { takes: mark.takes }), ...(mark.deals && { deals: mark.deals }), ...(mark.crit && { crit: mark.crit }), shown: 'curse' as const });
      // Mortal Wound: a critical blow leaves the boss healed less, and eating at it (perkTick), for a while.
      const wound = critical ? by.perkDefs.find((perk) => perk.wound) : undefined;
      if (wound?.wound) {
        by.wound = wound.wound.lasts;
        put(foe.statuses, { name: wound.name ?? 'Mortal Wound', left: wound.wound.lasts, heals: wound.wound.heals, shown: 'curse' });
      }
      // Lifesteal: a share of what it dealt heals it (less what the boss's skills take off healing).
      if (by.lifesteal > 0 && by.hp > 0 && !foe.part.unstolen) {
        const stolen = Math.min(dealt * share(soft(by.lifesteal, SOFT.lifesteal)) * healing(by.statuses) * (foe.part.healing?.() ?? 1), by.stats.hp - by.hp);
        if (stolen > 0) by.hp += stolen;
      }
      // A blow of its attack: its mana per attack.
      if (attacking === by) by.mana = Math.min(MAX_MANA, by.mana + by.manaPerAttack);
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
        sim.hit(by, atTier(ELICIPIRA.blow, by.unique.tier) * ELICIPIRA.boss, false);
        attacking = was;
      }
      if (foe.hp > 0) return critical;
      // Beaten: won.
      sim.stun(1, { down: true });
      foe.part.beaten?.();
      end('won');
      return critical;
    },
    heal(fighter, amount, by) {
      if (fighter.hp <= 0) return;
      const given = Math.min(amount * byAttack(by) * healed(by) * healing(fighter.statuses) * (foe.part.healing?.() ?? 1), fighter.stats.hp - fighter.hp);
      fighter.hp += given;
      if (by) by.healed += given;
      if (given > 0) events.push({ kind: 'number', on: fighter.index, amount: given, type: 'heal' });
    },
    shield(fighter, amount, seconds = Infinity, by) {
      if (fighter.hp <= 0) return;
      // (And more for its Aegis.)
      const given = amount * byAttack(by) * healed(by) * (by ? 1 + SKILL.aegis.shield * has(by, 'aegis') : 1) * (foe.part.shielding?.() ?? 1);
      fighter.shield += given;
      fighter.shieldLeft = Math.max(fighter.shieldLeft, seconds);
      if (by) by.healed += given;
    },
    target: aimed,
    hurt(target, amount, blockable = true) {
      if (target.hp <= 0 || away(target.statuses) || result) return 0;
      // Deception: immune to the boss's next blows. (Or what it is doing has it untouched for now.)
      if (target.immune > 0 || target.part.untouched?.()) {
        if (target.immune > 0) target.immune--;
        events.push({ kind: 'number', on: target.index, amount: 0, type: 'immune' });
        return 0;
      }
      const type = foe.def.stats.deals;
      // Harder or softer for what is on the boss, and harder again once the raid's time is up; then dodged, or what the hero's defense against that kind of damage
      // (more for every Hope support on the field), and a block, take off.
      // (And for what is on it: Klaus's unique weapon, Morrah's Hellfire. And every Perseverance support's on the field, and every Bastion among them;
      // and Iron Wall's block, the more at first, and what is on it adds.)
      const guarded = 1 + HOPE.defense * wearing('hope', 'support').length + PERSEVERANCE.defense * wearing('perseverance', 'support').length + SKILL.bastion.defense * among('bastion');
      const walled = elapsed < SKILL['iron-wall'].lasts ? SKILL['iron-wall'].more * has(target, 'iron-wall') : 0;
      const stands = {
        ...target.stats,
        physical: (target.stats.physical + bolstering(target.statuses, 'physical') + bolstering(party, 'physical')) * stacked([guarded, ...defends(target.statuses, 'physical'), ...defends(party, 'physical')]),
        magical: (target.stats.magical + bolstering(target.statuses, 'magical') + bolstering(party, 'magical')) * stacked([guarded, ...defends(target.statuses, 'magical'), ...defends(party, 'magical')]),
        block: { physical: target.stats.block.physical + walled + blocking(target.statuses, 'physical'), magical: target.stats.block.magical + walled + blocking(target.statuses, 'magical') },
      };
      // (Swift and Nimble: more dodge for every second since it last dodged.)
      const nimble = target.nimble > 0 ? target.nimble * (target.perkDefs.find((perk) => perk.nimble)?.nimble?.dodge ?? 0) : 0;
      // (And what it is doing adds: Tanya's Stealth.)
      const nimbler = nimble + (target.part.dodge?.() ?? 0);
      if (nimbler > 0) stands.dodge = { physical: stands.dodge.physical + nimbler, magical: stands.dodge.magical + nimbler };
      // Now and then a crit, by the boss's crit chance less the hero's crit resist against its kind of damage (and what is on it adds).
      const critical = roll() < share(foe.def.stats.crit - target.critResist[type] - critResisting(target.statuses, type) - critResisting(party, type)) + critting(foe.statuses);
      // (Through its penetration, and as much of the hero's defense as counts against its level.)
      const scale = scaleAt(def, stage, solo);
      const { taken, blocked, dodged } = strike(amount * scale.deals * dealing(foe.statuses) * rage(clock - RAID_TIME) * (critical ? CRIT : 1), type, blockable ? stands : { ...stands, block: NONE, dodge: NONE }, foe.def.stats.pen ?? 0, reachAt(scale.level), roll);
      if (dodged) {
        target.nimble = 0;
        events.push({ kind: 'number', on: target.index, amount: 0, type: 'dodged' });
        target.part.dodged?.();
        // Mirage: a dodge mends it a little.
        if (due(target, 'mirage', SKILL.mirage.wait)) sim.heal(target, SKILL.mirage.heal * has(target, 'mirage') * target.stats.hp);
        return 0;
      }
      events.push({ kind: 'hurt', who: target.index, blocked });
      // (Less again while every hero is guarded, or it is; more if its passive leaves it easier to hurt; less for Hope's knight;
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
          target.set?.id === 'hope' && target.set.role === 'knight' ? HOPE.taken : 1,
          target.perkTaken[type],
          target.part.takes?.() ?? 1,
          1 - Math.min(0.9, SKILL.steadfast.taken * target.stacks.steadfast * has(target, 'steadfast')),
          warded > 0 ? 1 - Math.min(0.9, warded * (ward.taken + (ward.most - ward.taken) * Math.min(1, elapsed / ward.over))) : 1,
        ]);
      // Hope's knight takes a share of what any other ally takes on itself.
      const cover = target.def.class === 'knight' ? undefined : wearing('hope', 'knight').find((knight) => knight !== target);
      if (cover) {
        const covered = dealt * HOPE.covers;
        dealt -= covered;
        const soak = Math.min(cover.shield, covered);
        cover.shield -= soak;
        if (covered > soak) {
          const lost = Math.min(cover.hp, covered - soak);
          cover.hp -= lost;
          spare(cover);
          cover.mana = Math.min(MAX_MANA, cover.mana + (MANA_PER_HP_LOST * lost) / cover.stats.hp);
          events.push({ kind: 'number', on: cover.index, amount: covered - soak, type: 'hit' });
          if (cover.hp <= 0) {
            cover.shield = 0;
            cover.doing = null;
            cover.reserved = null;
          }
        }
      }
      // A shield on it takes what it can first; its health, the rest.
      const soaked = Math.min(target.shield, dealt);
      target.shield -= soaked;
      if (soaked > 0) events.push({ kind: 'number', on: target.index, amount: soaked, type: 'shield' });
      // Health lost to the boss gains it mana, by the share of its max HP lost. (A blow that would bring down one its part spares leaves it on 1 HP.)
      const losing = Math.min(target.hp, Math.max(0, dealt - soaked));
      const lost = losing >= target.hp && target.hp > 1 && target.part.spared?.() ? target.hp - 1 : losing;
      if (dealt > soaked) {
        target.hp -= lost;
        spare(target);
        events.push({ kind: 'number', on: target.index, amount: dealt - soaked, type: blocked ? 'blocked' : critical ? 'crit' : 'hit' });
      }
      if (target.hp <= 0) {
        target.shield = 0;
        target.doing = null;
        target.reserved = null;
      }
      target.mana = Math.min(MAX_MANA, target.mana + (MANA_PER_HP_LOST * lost) / target.stats.hp);
      if (dealt > 0) for (const fighter of fighters) fighter.part.hurt?.(target);
      // Its perks that come of being hit: Vengeful Curse (on the boss), and Deception (once it has taken something).
      for (const perk of target.perkDefs) {
        if (perk.curse && perkDue(target, perk.name ?? perk.words, perk.curse.every)) put(foe.statuses, { name: perk.name ?? 'Curse', left: perk.curse.lasts, deals: perk.curse.deals, shown: 'curse' });
        if (perk.immunity && dealt > 0 && target.hp > 0 && perkDue(target, perk.name ?? perk.words, perk.immunity.every)) target.immune = perk.immunity.hits;
      }
      if (blocked) {
        target.part.blocked?.();
        // Parry: a block gains it mana.
        if (target.hp > 0 && due(target, 'parry', SKILL.parry.wait)) target.mana = Math.min(MAX_MANA, target.mana + SKILL.parry.mana * has(target, 'parry'));
      }
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
      stagger(fighter);
      // (The shorter for its CC resist, and what is on it adds to it, and its Tenacity; and as its passive, and its part for now, have it.)
      const shorter = Math.max(0, 1 - SKILL.tenacity.control * has(fighter, 'tenacity')) * (fighter.def.passive?.held ?? 1) * (fighter.part.held?.() ?? 1);
      put(fighter.statuses, { name: KNOCKED.name, left: seconds * (1 - share(soft(fighter.stats.resist + resisting(fighter.statuses) + auras.resist, SOFT.resist))) * shorter, binds: true, shown: KNOCKED });
    },
    stagger,
    mend(amount) {
      if (foe.hp <= 0) return;
      const given = Math.min(amount * healing(foe.statuses), foe.maxHp - foe.hp);
      foe.hp += given;
      mended += given;
    },
    stun(seconds, { down = false, by } = {}) {
      // (A hero's: the shorter for the boss's CC resist, less what the hero's accuracy sees past.)
      const held = seconds * (by ? (by.def.passive?.control ?? 1) * by.controlTimes * (1 - share(soft(Math.max(0, foe.def.stats.resist + resisting(foe.statuses)), SOFT.resist) - soft(by.accuracy + auras.accuracy + accurate(by.statuses), SOFT.acc))) : 1);
      // (A boss with a CC gauge takes it off that instead: only once it is empty is it held, knocked down. Not as it is beaten.)
      const taken = foe.part.controlled && foe.hp > 0 ? foe.part.controlled(held, down) : { seconds: held, down };
      if (!taken || taken.seconds <= 0) return;
      const lasts = taken.seconds;
      going.clear();
      foe.stunned = Math.max(foe.stunned, lasts);
      events.push({ kind: 'boss-daze', seconds: lasts, down: taken.down });
    },
    slow(points, seconds) {
      // (A boss nothing slows shrugs it off.)
      if (foe.part.steady) return;
      const rate = 1 - share(points);
      foe.slowRate = rate;
      foe.slowed = seconds;
      events.push({ kind: 'boss-slow', rate, seconds });
    },
    cue(who, name, targets = []) {
      events.push({ kind: 'cue', who: who?.index ?? null, name, targets: targets.map((one) => one.index) });
    },
    ready(fighter, index) {
      return sim.reservable(fighter, index) && (fighter.cooldowns[index] as number) <= 0 && fighter.mana >= (sim.slot(fighter, index) as Ability).cost * SECTION;
    },
    reservable(fighter, index) {
      return sim.slot(fighter, index) !== null && field.includes(fighter) && fighter.hp > 0 && !bound(fighter.statuses);
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
      const marks: Mark[] = [];
      if (foe.hp <= 0) marks.push({ text: 'Beaten', tone: 'down' });
      else if (foe.stunned > 0) marks.push({ text: `Stunned ${Math.ceil(foe.stunned)}`, tone: 'stun' });
      if (foe.slowed > 0) marks.push({ text: `Slowed ${Math.ceil(foe.slowed)}`, tone: 'slow' });
      if (foe.hp > 0 && clock > RAID_TIME) {
        const times = rage(clock - RAID_TIME);
        marks.push({ text: `Enraged ×${times < 10 ? times.toFixed(1) : Math.round(times).toLocaleString('en-US')}`, tone: 'rage' });
      }
      // (One for the rest of the fight says how many are stacked in it, in place of the seconds it has left; one that stacks for a while, both.)
      for (const status of foe.statuses) {
        const stacked = status.count !== undefined && Number.isFinite(status.left) ? ` ×${status.count}` : '';
        marks.push({ text: `${status.name}${stacked} ${Number.isFinite(status.left) ? Math.ceil(status.left) : `×${status.count ?? 1}`}`, tone: status.shown });
      }
      marks.push(...(foe.part.marks?.() ?? []));
      for (const fighter of fighters) marks.push(...(fighter.part.marks?.() ?? []));
      return marks;
    },
    gauge: () => foe.part.gauge?.() ?? null,
    checksum() {
      const word = new DataView(new ArrayBuffer(8));
      let hash = 0x811c9dc5;
      const mix = (n: number): void => {
        word.setFloat64(0, n);
        for (let i = 0; i < 8; i++) hash = Math.imul(hash ^ word.getUint8(i), 0x01000193);
      };
      mix(tick);
      mix(clock);
      mix(foe.hp);
      mix(foe.stunned);
      mix(foe.slowed);
      mix(foe.statuses.length);
      for (const fighter of fighters) {
        mix(fighter.hp);
        mix(fighter.mana);
        mix(fighter.shield);
        mix(fighter.dealt);
        mix(fighter.statuses.length);
        mix(fighter.stacks.momentum + fighter.stacks.steadfast);
        mix(fighter.doing ? fighter.doing.t : -1);
        mix(fighter.reserved ?? -1);
        mix(fighter.immune + fighter.nimble + fighter.wound);
        for (const left of fighter.cooldowns) mix(left);
      }
      for (const n of random.state()) mix(n);
      return hash >>> 0;
    },
    step() {
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
      const before = fighters.map((fighter) => fighter.mana);
      spent.clear();

      // Boss auto: once the boss has been still a moment, another attack: the one it must use next, or one of those it may, picked at random.
      idle = bossBusy() ? 0 : idle + dt;
      if (bossAuto && idle >= AUTO_WAIT) {
        const forced = foe.part.next?.() ?? null;
        const may = def.attacks.filter((one) => foe.part.ready?.(one.name) ?? true);
        bossUse(forced ?? (may[Math.floor(roll() * may.length)] ?? def.attacks[0])?.name ?? '');
      }

      for (const fighter of fighters) {
        // (Slower while something on it, or on every hero, holds its mana back.)
        fighter.mana = Math.min(MAX_MANA, fighter.mana + fighter.manaRegen * dt * filling([...fighter.statuses, ...party]));
        fighter.cooldowns = fighter.cooldowns.map((left) => Math.max(0, left - dt));
        // What another hero gave it runs down: its shield, once its time is up, is gone.
        wear(fighter.statuses, dt);
        fighter.shieldLeft = Math.max(0, fighter.shieldLeft - dt);
        if (fighter.shieldLeft <= 0) fighter.shield = 0;
        skillTick(fighter, dt);
        perkTick(fighter, dt);
        fighter.part.tick?.(dt);
        if (result) return;
      }
      // What is on the boss and on the heroes for a while runs down.
      foe.slowed = Math.max(0, foe.slowed - dt);
      foe.stunned = Math.max(0, foe.stunned - dt);
      wear(foe.statuses, dt);
      wear(party, dt);
      if (!deathless) clock += dt;
      foe.part.tick?.(dt);
      // What the boss has given itself back, shown once a second rather than a number every step.
      mendShown += dt;
      if (mendShown >= 1) {
        if (mended >= 1) events.push({ kind: 'number', on: 'boss', amount: mended, type: 'heal', mend: true });
        mended = 0;
        mendShown = 0;
      }

      // Each hero on the field, when it is free: the skill it was told to use (or, on Auto, the dearest it can), or else its attack. (Not one that can do nothing for now.)
      for (const on of field) {
        on.rested = on.doing ? 0 : on.rested + dt;
        // (On Auto, once it is free: what it uses is picked as it can use it.)
        if (on.auto && on.reserved === null && !on.doing) on.reserved = autoSkill(on);
        // (A skill pressed while it can do nothing waits for it; and one pressed short of mana waits for the mana, the hero
        // attacking meanwhile.)
        if (on.reserved !== null && !sim.reservable(on, on.reserved) && !bound(on.statuses)) on.reserved = null;
        if (!on.doing && on.hp > 0 && !bound(on.statuses)) {
          if (on.reserved !== null && use(on, on.reserved)) on.reserved = null;
          else if (on.rested >= HERO_WAIT && foe.hp > 0) begin(on, on.attack, null);
        }
      }

      // The boss has just begun an attack (or been stunned): whom it goes for, this time.
      const busy = bossBusy();
      if (busy && !was) aim = anyone();
      was = busy;
      bossAdvance(dt);
      if (result) return;
      // Each hero's move goes on (quickened by its attack speed, its own skills and what is on it), and each over to its spot.
      const reform = Math.min(1, dt * REFORM);
      for (const on of field) {
        // (Its attack speed: 1000 points as quick as it comes; what is more, soft-capped.)
        const quicker = Math.max(0, on.stats.speed + auras.speed + (on.part.speed?.() ?? 0) - POINTS);
        // (One whose passive has it steady: as it comes, whatever its attack speed or what is on it.)
        on.haste = on.def.passive?.steady ? 1 : ((POINTS + soft(quicker, SOFT.chance, SOFT.hard)) / POINTS) * pacing(on.statuses, on.part.pace?.() ?? 1);
        advance(on, dt * on.haste);
        if (result) return;
        const [x, z] = spots.get(on) as readonly [number, number];
        on.x += (x - on.x) * reform;
        on.z += (z - on.z) * reform;
      }

      // Every hero on the field down, or wiped by the boss's rage: lost.
      if (!deathless && ((field.length > 0 && field.every((on) => on.hp <= 0)) || clock >= RAID_TIME + RAGE_WIPE)) end('lost');
      // What each hero gained this step, counted toward what it gains a second (not while its mana is full: it gains nothing then).
      fighters.forEach((fighter, i) => {
        const was = before[i] as number;
        if (was >= MAX_MANA || fighter.mana >= MAX_MANA) return;
        const gained = Math.max(0, fighter.mana - was + (spent.get(fighter) ?? 0));
        fighter.income += (gained / dt - fighter.income) * (dt / AUTO.income);
      });
      tick++;
      if (tick % SECOND === 0) sums.push(sim.checksum());
    },
  };

  /** An input, as it counts (one that makes no sense, or only does when trying things out, in a raid: none). */
  function apply(input: Input): void {
    const fighter = 'fighter' in input ? fighters[input.fighter] : undefined;
    switch (input.kind) {
      case 'skill':
        if (!fighter) return;
        if (fighter.reserved === input.skill) fighter.reserved = null;
        else if (sim.reservable(fighter, input.skill)) fighter.reserved = input.skill;
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
          if (foe.hp <= 0) foe.hp = foe.maxHp;
        }
        return;
      case 'stage':
        stage = Math.min(stagesOf(def), Math.max(1, Math.floor(input.stage) || 1));
        return;
    }
  }

  foe.part = (def.join?.(sim) as BossPart | undefined) ?? foe.part;
  // Authority's support: the ally with the highest ATK can't be knocked down for a while.
  if (fighters.some((fighter) => fighter.set?.id === 'authority' && fighter.set.role === 'support')) {
    const strongest = fighters.reduce<Fighter | null>((best, fighter) => (!best || fighter.stats.atk > best.stats.atk ? fighter : best), null);
    if (strongest) put(strongest.statuses, { name: GUARDED.name, left: AUTHORITY.guardFor, guards: true, shown: GUARDED });
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
