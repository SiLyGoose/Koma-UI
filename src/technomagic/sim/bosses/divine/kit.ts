import type { Fight, Fighter } from '../../types';
import type { BossAttack, BossMove, BossPart, Plan, Warning } from '../boss';
import { cooldowns, reachable } from '../dragon/common';

/*
 * Divine Punishment's bosses' stand-in kits (their full King's Raid kits are to come: KR-extracted/briefs/divine-punishment/gen/
 * kit-*.md): each boss has a few of its main skills, by King's Raid's names, cooldowns and first waits, their blows the shares
 * of its ATK that King's Raid's have (or, where its ops give none that fits, a first guess, said so where it is), on whoever it
 * goes for, on every hero, or on so many at random; with a share of each one's max HP more (King's Raid's $ByMEHp3: thousandths
 * of a percent, 4500 being 4.5%, taken as of the hero's max HP), a stun, and whatever else its skill does besides (`then`, on
 * each hero struck; `done`, once its last blow is in). What its passives do every so many seconds is the boss's own part
 * (./apocalypsion.ts and the rest). One body (B): its attacks never overlap.
 */

/** A stand-in skill of a boss. */
export interface Skill {
  name: string;
  label: string;
  /** Its cooldown and first wait (seconds, King's Raid's OnAuto trigger's): none, its plain attack. */
  cooldown?: number;
  first?: number;
  /** How long it takes (King's Raid's duration), and when its blows land (seconds in), each `share` of its ATK (or each its own). */
  length: number;
  blows: readonly number[];
  share: number | readonly number[];
  /** So much harder every time it is used (King's Raid's ModSkillPowerR on itself: Engraving Aura's 20%). */
  grows?: number;
  /** On whom each blow lands: whoever it goes for, every hero, or so many at random (picked as its first blow lands). */
  on: 'target' | 'all' | number;
  /** A share of each struck hero's max HP more, that nothing blocks. */
  hp?: number;
  /** Each struck hero stunned for so many seconds (as the first blow lands, unless it says `stunEvery`). */
  stun?: number;
  stunEvery?: boolean;
  /** Nothing blocks or dodges it (King's Raid's IgnoreBlock; that none of a boss's blows is dodged, its Unavoidable, is its ACC). */
  sure?: boolean;
  warning?: Warning;
  then?(on: Fighter, blow: number): void;
  done?(): void;
}

/** One body: all of a stand-in boss's moves are its. */
const BODY = 'B';

/** A boss's stand-in skills as its BossDef has them (`atk`: its ATK at level 1, which its blows are shares of): its attacks, plans, moves and plain attack. */
export function kitOf(skills: readonly Skill[], atk: number): { attacks: BossAttack[]; plans: Record<string, Plan>; moves: Record<string, BossMove>; basic: string[] } {
  const plans: Record<string, Plan> = {};
  const moves: Record<string, BossMove> = {};
  for (const skill of skills) {
    const plan: [string, string, number][] = [];
    skill.blows.forEach((at, i) => {
      const from = i === 0 ? 0 : (skill.blows[i - 1] as number);
      const last = i === skill.blows.length - 1;
      const name = `${skill.name}${i}`;
      const share = typeof skill.share === 'number' ? skill.share : (skill.share[i] ?? 0);
      moves[name] = { length: (last ? skill.length : at) - from, hit: at - from, hurts: [share * atk, share * atk] };
      plan.push([name, BODY, 0]);
    });
    // (One with no blows: a move that lands nothing, for its length.)
    if (skill.blows.length === 0) {
      moves[skill.name] = { length: skill.length, hit: null };
      plan.push([skill.name, BODY, 0]);
    }
    plans[skill.name] = plan;
  }
  return {
    attacks: skills.map(({ name, label, warning }) => ({ name, label, ...(warning && { warning }) })),
    plans,
    moves,
    basic: skills.filter((one) => one.cooldown === undefined).map((one) => one.name),
  };
}

/** The heroes a blow of `skill` lands on: whoever the boss goes for, every hero it can reach, or `n` of them at random. */
function struck(fight: Fight, skill: Skill, picked: Fighter[]): Fighter[] {
  if (skill.on === 'all') return reachable(fight);
  if (skill.on === 'target') {
    const target = fight.target();
    return target && target.hp > 0 ? [target] : [];
  }
  return picked.filter((on) => on.hp > 0);
}

/**
 * A boss's stand-in skills' part: each blow on whom its skill says, with what comes of it; their cooldowns (Boss auto picks a
 * skill as soon as it is ready, else its plain attack). `own` is what the boss has besides (its passives), over it.
 */
export function kitPart(fight: Fight, skills: readonly Skill[], own: Partial<BossPart> = {}): BossPart {
  const waits = cooldowns(Object.fromEntries(skills.filter((one) => one.cooldown !== undefined).map((one) => [one.name, [one.cooldown as number, one.first ?? (one.cooldown as number)] as const])));
  /** The heroes picked at random for the skill under way; how many times each skill has been used. */
  let picked: Fighter[] = [];
  const uses = new Map<string, number>();
  const lands: BossPart['lands'] = {};
  for (const skill of skills) {
    lands[skill.name] = (blow, amount) => {
      if (typeof skill.on === 'number' && blow === 0) {
        const from = reachable(fight).slice();
        picked = [];
        while (picked.length < skill.on && from.length > 0) picked.push(...from.splice(Math.floor(fight.roll() * from.length), 1));
      }
      const hard = amount * (1 + (skill.grows ?? 0) * Math.max(0, (uses.get(skill.name) ?? 1) - 1));
      for (const on of struck(fight, skill, picked)) {
        if (hard > 0) fight.hurt(on, hard, !skill.sure);
        if (skill.hp && on.hp > 0) fight.hurt(on, on.stats.hp * skill.hp, false);
        if (skill.stun && on.hp > 0 && (blow === 0 || skill.stunEvery)) fight.knock(on, skill.stun);
        if (on.hp > 0) skill.then?.(on, blow);
      }
      if (blow === skill.blows.length - 1) skill.done?.();
    };
  }
  const ownTick = own.tick;
  const ownUsed = own.used;
  const ownReady = own.ready;
  return {
    ...own,
    lands: { ...lands, ...own.lands },
    used(attack) {
      waits.used(attack);
      uses.set(attack, (uses.get(attack) ?? 0) + 1);
      ownUsed?.(attack);
    },
    ready: (attack) => waits.ready(attack) && (ownReady?.(attack) ?? true),
    delay(seconds) {
      waits.delay(seconds);
      own.delay?.(seconds);
    },
    tick(dt) {
      waits.tick(dt);
      ownTick?.(dt);
    },
  };
}

/** Something a boss does every `every` seconds (the first `first` seconds in: none said, `every`), as its part's tick goes. */
export function timer(every: number, run: () => void, first: number = every): (dt: number) => void {
  let left = first;
  return (dt) => {
    left -= dt;
    while (left <= 0) {
      left += every;
      run();
    }
  };
}
