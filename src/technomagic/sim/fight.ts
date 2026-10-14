import type { BossDef, BossPart } from '../bosses/boss';
import { ATK, NONE, share, strike } from '../combat/damage';
import { away, bound, critting, dealing, filling, healing, pacing, put, taking, wear, type Status } from '../combat/status';
import type { Mark } from '../hud/boss-bar';
import type { Buff } from '../hud/buff';
import { lineOf, NO_PASSIVE, type HeroDef } from '../heroes/kit';
import type { HeroMove } from '../heroes/moves';
import type { Input, Logged, Result, SimEvent } from './events';
import { geared } from './gear';
import { motionOf } from './motion';
import { seeded } from './random';
import { AUTO_WAIT, BLOW, CRIT, formation, HERO_WAIT, MANA_HIT, MANA_RATE, MAX_MANA, MOST, RAGE_WIPE, RAID_TIME, rage, REFORM, SECTION, SOLO_BOSS_HP, STAGES, TICK } from './rules';
import type { Fight, Fighter, Foe, GearBonus } from './types';

/*
 * The fight, worked out with nothing drawn: a boss and the heroes, up to MOST of them on the field at once,
 * each where its class stands (the frontline nearest the boss, the backline furthest from it: ./rules.ts).
 * It keeps how everyone stands (health, mana, what is on them for a while), works out what each blow takes
 * (../combat/), and has each hero on the field attack by itself and use its skills. The boss goes for one
 * of them at a time, picked as each of its attacks begins. What each hero's skills do is the hero's own
 * (../heroes/: its part in the fight), and what the boss's do beyond hurting whoever they land on is the
 * boss's (../bosses/).
 *
 * It moves on a step (TICK) at a time, and every chance in it comes of its seed (./random.ts), so the same
 * seed and the same inputs, each before the same step, make the same fight wherever it runs: on the page,
 * which draws what it says happened (its events: ../fight/view.ts), and on the bot, which plays a raid won
 * over to be sure of it before it gives anything for it (./verify.ts).
 *
 * As in King's Raid, one try is all there is: a hero down stays down (unless a skill of another's revives it),
 * the boss beaten is won, and every hero on the field down (or the boss's rage wiping them, RAGE_WIPE after the
 * raid's time is up) is lost. A raid takes nothing but the heroes' skills and Auto; trying things out, heroes
 * come onto the field and leave it as the player likes, and the boss is set attacking by hand.
 */

/** A hero as it comes into the fight: which, in which of its skins (the first, unless it says), with what its gear gives it. */
export interface Entry {
  def: HeroDef;
  skin?: number;
  gear?: GearBonus;
}

export interface SimOptions {
  boss: BossDef;
  heroes: readonly Entry[];
  seed: number;
  /** The raid's stage (1 to STAGES). */
  stage: number;
  /** A raid (every hero on the field, Boss auto on), or trying things out. */
  raid: boolean;
  /** Fought alone: the boss is easier (SOLO_BOSS_HP of its health). */
  solo?: boolean;
  /** Trying things out: the heroes on the field at first, by their index (with none of them, the first). */
  first?: readonly number[];
}

export interface Sim extends Fight {
  readonly raid: boolean;
  /** The boss attacks by itself (always, in a raid). */
  readonly bossAuto: boolean;
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
  /** What is the matter with the boss, for under its health. */
  marks(): Mark[];
  /** A number that sums up how the fight stands (two fights that stand the same have the same). */
  checksum(): number;
}

/** What knocks a hero down: shown on its card, with how long it has left. */
const KNOCKED: Buff = { name: 'Knocked down', about: 'Can do nothing until it is up.', icon: '💫', harmful: true };

/** Steps in a second (a checksum is kept at the end of each). */
const SECOND = Math.round(1 / TICK);

export function makeSim({ boss: def, heroes, seed, stage: firstStage, raid, solo = false, first = [] }: SimOptions): Sim {
  const random = seeded(seed);
  const roll = (): number => random.next();
  const events: SimEvent[] = [];
  const log: Logged[] = [];
  const sums: number[] = [];
  let pending: Input[] = [];
  const maxHp = def.stats.hp * (solo ? SOLO_BOSS_HP : 1);
  const foe: Foe = { def, part: { lands: {} }, hp: maxHp, maxHp, stunned: 0, slowed: 0, slowRate: 1, statuses: [] };
  let tick = 0;
  let elapsed = 0;
  /** Seconds of the raid's time gone, against this boss. */
  let clock = 0;
  let stage = Math.min(STAGES, Math.max(1, Math.floor(firstStage) || 1));
  let bossAuto = raid;
  let result: Result | null = null;
  /** The boss's health given back since it was last shown, and how long since then. */
  let mended = 0;
  let mendShown = 0;
  const party: Status<Buff>[] = [];

  const fighters: Fighter[] = heroes.map(({ def: hero, skin = 0, gear = {} }, index) => {
    const stats = geared(hero.stats, gear);
    const motion = motionOf(hero, skin);
    const name = (hero.assets.skins[skin] ?? hero.assets.skins[0])?.name ?? hero.name;
    return {
      index,
      id: hero.id,
      name,
      def: hero,
      stats,
      critTimes: CRIT + (gear.critDamage ?? 0),
      healTimes: 1 + (gear.heal ?? 0),
      controlTimes: 1 + (gear.control ?? 0),
      motion,
      attack: motion.attack,
      part: { lands: {} },
      hp: stats.hp,
      shield: 0,
      shieldLeft: 0,
      statuses: [],
      // As it comes into the fight: whole, with half its mana.
      mana: MAX_MANA / 2,
      auto: false,
      cooldowns: hero.abilities.map(() => 0),
      reserved: null,
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
    events.push({ kind: 'enter', who: fighter.index });
    return true;
  }

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

  /** How many times as much a heal or a shield gives for the hero whose it is (its attack and its gear; one that is no hero's: as much as it says). */
  const byAttack = (by: Fighter | undefined): number => (by ? (by.stats.atk / ATK) * by.healTimes : 1);

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

  /** A hero begins a move (it must be free). */
  function begin(fighter: Fighter, move: HeroMove, skill: boolean): void {
    fighter.doing = { move, t: 0, part: 0, landed: 0, blows: 0 };
    events.push({ kind: 'start', who: fighter.index, move, skill });
  }

  /** A hero uses a skill (true if it did: it must be free). */
  function use(fighter: Fighter, index: number): boolean {
    const ability = fighter.def.abilities[index];
    if (!ability || fighter.doing || !sim.ready(fighter, index)) return false;
    begin(fighter, ability.move, true);
    fighter.cooldowns[index] = ability.cooldown;
    fighter.mana -= ability.cost * SECTION;
    return true;
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
        const own = fighter.part.lands[move];
        if (own) own(index);
        else common[move]?.(fighter, index);
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
    hit(by, amount, counted = true, pierce = 0) {
      if (foe.hp <= 0 || result) return;
      // The hero whose blow it is: as hard as its attack, and its passive, have it (and harder or softer again for what is on it); now and
      // then far harder, by its crit chance and what its passive and what is on it add; and through its penetration, and the blow's own.
      const { attack, crit } = by.def.passive ?? NO_PASSIVE;
      const { atk, deals: type, crit: points, pen } = by.stats;
      const critical = roll() < share(points) + crit + critting(by.statuses);
      const { taken, blocked, dodged } = strike(amount * (atk / ATK) * attack * dealing(by.statuses) * (critical ? by.critTimes : 1), type, foe.def.stats, pen + pierce, roll);
      if (dodged) {
        events.push({ kind: 'number', on: 'boss', amount: 0, type: 'dodged' });
        return;
      }
      events.push({ kind: 'boss-hit' });
      // (And more or less by what is on the boss: a Shield Strike has left it easier to hurt.)
      const dealt = Math.min(foe.hp, taken * taking(foe.statuses, type));
      foe.hp -= dealt;
      by.dealt += dealt;
      events.push({ kind: 'number', on: 'boss', amount: dealt, type: blocked ? 'blocked' : critical ? 'crit' : 'hit' });
      by.mana = Math.min(MAX_MANA, by.mana + MANA_HIT);
      if (counted) {
        for (const fighter of fighters) fighter.part.struck?.();
        foe.part.struck?.(by, dealt);
      }
      if (foe.hp > 0) return;
      // Beaten: won.
      sim.stun(1, { down: true });
      foe.part.beaten?.();
      end('won');
    },
    heal(fighter, amount, by) {
      if (fighter.hp <= 0) return;
      const given = Math.min(amount * byAttack(by) * healing(fighter.statuses) * (foe.part.healing?.() ?? 1), fighter.stats.hp - fighter.hp);
      fighter.hp += given;
      if (by) by.healed += given;
      if (given > 0) events.push({ kind: 'number', on: fighter.index, amount: given, type: 'heal' });
    },
    shield(fighter, amount, seconds = Infinity, by) {
      if (fighter.hp <= 0) return;
      const given = amount * byAttack(by) * (foe.part.shielding?.() ?? 1);
      fighter.shield += given;
      fighter.shieldLeft = Math.max(fighter.shieldLeft, seconds);
      if (by) by.healed += given;
    },
    target: aimed,
    hurt(target, amount, blockable = true) {
      if (target.hp <= 0 || away(target.statuses) || result) return 0;
      const type = foe.def.stats.deals;
      // Harder or softer for what is on the boss, and harder again once the raid's time is up; then dodged, or what the hero's defence against that kind of damage, and a block, take off.
      const { taken, blocked, dodged } = strike(amount * dealing(foe.statuses) * rage(clock - RAID_TIME), type, blockable ? target.stats : { ...target.stats, block: NONE, dodge: NONE }, 0, roll);
      if (dodged) {
        events.push({ kind: 'number', on: target.index, amount: 0, type: 'dodged' });
        return 0;
      }
      events.push({ kind: 'hurt', who: target.index, blocked });
      // (Less again while every hero is guarded, or it is; more if its passive leaves it easier to hurt.)
      const dealt = taken * taking(party, type) * taking(target.statuses, type) * (target.def.passive?.taken ?? 1);
      // A shield on it takes what it can first; its health, the rest.
      const soaked = Math.min(target.shield, dealt);
      target.shield -= soaked;
      if (soaked > 0) events.push({ kind: 'number', on: target.index, amount: soaked, type: 'shield' });
      if (dealt > soaked) {
        target.hp = Math.max(0, target.hp - (dealt - soaked));
        events.push({ kind: 'number', on: target.index, amount: dealt - soaked, type: blocked ? 'blocked' : 'hit' });
      }
      if (target.hp <= 0) {
        target.shield = 0;
        target.doing = null;
        target.reserved = null;
      }
      target.mana = Math.min(MAX_MANA, target.mana + MANA_HIT);
      if (blocked) target.part.blocked?.();
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
      if (fighter.hp <= 0 || away(fighter.statuses)) return;
      stagger(fighter);
      // (The shorter for its CC resist.)
      put(fighter.statuses, { name: KNOCKED.name, left: seconds * (1 - share(fighter.stats.resist)), binds: true, shown: KNOCKED });
    },
    stagger,
    mend(amount) {
      if (foe.hp <= 0) return;
      const given = Math.min(amount * healing(foe.statuses), foe.maxHp - foe.hp);
      foe.hp += given;
      mended += given;
    },
    stun(seconds, { down = false, by } = {}) {
      const lasts = seconds * (by ? (by.def.passive?.control ?? 1) * by.controlTimes : 1);
      going.clear();
      foe.stunned = Math.max(foe.stunned, lasts);
      events.push({ kind: 'boss-daze', seconds: lasts, down });
    },
    slow(rate, seconds) {
      // (A boss nothing slows shrugs it off.)
      if (foe.part.steady) return;
      foe.slowRate = rate;
      foe.slowed = seconds;
      events.push({ kind: 'boss-slow', rate, seconds });
    },
    cue(who, name, targets = []) {
      events.push({ kind: 'cue', who: who?.index ?? null, name, targets: targets.map((one) => one.index) });
    },
    ready(fighter, index) {
      const ability = fighter.def.abilities[index];
      return ability !== undefined && field.includes(fighter) && fighter.hp > 0 && !bound(fighter.statuses) && (fighter.cooldowns[index] as number) <= 0 && fighter.mana >= ability.cost * SECTION;
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
      // (One for the rest of the fight says how many are stacked in it, in place of the seconds it has left.)
      for (const status of foe.statuses) marks.push({ text: `${status.name} ${Number.isFinite(status.left) ? Math.ceil(status.left) : `×${status.count ?? 1}`}`, tone: status.shown });
      marks.push(...(foe.part.marks?.() ?? []));
      for (const fighter of fighters) marks.push(...(fighter.part.marks?.() ?? []));
      return marks;
    },
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
        mix(fighter.doing ? fighter.doing.t : -1);
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
      const dt = TICK;
      elapsed += dt;

      // Boss auto: once the boss has been still a moment, another attack, picked at random.
      idle = bossBusy() ? 0 : idle + dt;
      if (bossAuto && idle >= AUTO_WAIT) bossUse((def.attacks[Math.floor(roll() * def.attacks.length)] ?? def.attacks[0])?.name ?? '');

      for (const fighter of fighters) {
        // (Slower while something on it, or on every hero, holds its mana back.)
        fighter.mana = Math.min(MAX_MANA, fighter.mana + MANA_RATE * dt * filling(fighter.statuses) * filling(party));
        fighter.cooldowns = fighter.cooldowns.map((left) => Math.max(0, left - dt));
        // What another hero gave it runs down: its shield, once its time is up, is gone.
        wear(fighter.statuses, dt);
        fighter.shieldLeft = Math.max(0, fighter.shieldLeft - dt);
        if (fighter.shieldLeft <= 0) fighter.shield = 0;
        fighter.part.tick?.(dt);
        if (result) return;
      }
      // What is on the boss and on the heroes for a while runs down.
      foe.slowed = Math.max(0, foe.slowed - dt);
      foe.stunned = Math.max(0, foe.stunned - dt);
      wear(foe.statuses, dt);
      wear(party, dt);
      clock += dt;
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
        if (on.auto && on.reserved === null) {
          for (let index = on.def.abilities.length - 1; index >= 0 && on.reserved === null; index--) if (sim.ready(on, index)) on.reserved = index;
        }
        // (A skill pressed while it can do nothing waits for it.)
        if (on.reserved !== null && !sim.ready(on, on.reserved) && !bound(on.statuses)) on.reserved = null;
        if (!on.doing && on.hp > 0 && !bound(on.statuses)) {
          if (on.reserved !== null) {
            if (use(on, on.reserved)) on.reserved = null;
          } else if (on.rested >= HERO_WAIT && foe.hp > 0) begin(on, on.attack, false);
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
        on.haste = (1 + share(on.stats.speed)) * (on.part.pace?.() ?? 1) * pacing(on.statuses);
        advance(on, dt * on.haste);
        if (result) return;
        const [x, z] = spots.get(on) as readonly [number, number];
        on.x += (x - on.x) * reform;
        on.z += (z - on.z) * reform;
      }

      // Every hero on the field down, or wiped by the boss's rage: lost.
      if ((field.length > 0 && field.every((on) => on.hp <= 0)) || clock >= RAID_TIME + RAGE_WIPE) end('lost');
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
        else if (sim.ready(fighter, input.skill)) fighter.reserved = input.skill;
        return;
      case 'auto':
        if (fighter) fighter.auto = !fighter.auto;
        return;
      case 'all-auto': {
        const on = !fighters.every((one) => one.auto);
        for (const one of fighters) one.auto = on;
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
      case 'stage':
        stage = Math.min(STAGES, Math.max(1, Math.floor(input.stage) || 1));
        return;
    }
  }

  foe.part = (def.join?.(sim) as BossPart | undefined) ?? foe.part;
  for (const fighter of fighters) fighter.part = fighter.def.join(sim, fighter);
  // On the field from the start: in a raid, every hero (as many as fit); trying things out, the ones asked for, or the first.
  for (const fighter of raid ? fighters : first.map((index) => fighters[index])) if (fighter && !field.includes(fighter)) stand(fighter);
  if (field.length === 0 && fighters[0]) stand(fighters[0]);
  return sim;
}
