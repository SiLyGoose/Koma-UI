import { NONE } from '../../combat/damage';
import { put, type Status } from '../../combat/status';
import type { Buff, Mark } from '../../shown';
import type { Fight, Fighter } from '../../types';
import type { BossPart, BossScale } from '../boss';

/*
 * What every dragon has, as King's Raid's Dragon Raid has it:
 * - Its CC Gauge: no stun holds a dragon. A hero's stun (or knock down) wears its gauge down instead, by how long it
 *   would have held it; once the gauge is empty the dragon is Knocked Down for a while (what it was doing cut short,
 *   its breath among it), taking more damage, and its gauge is full again as it gets up. "Trying to deplete the CC gauge
 *   before a dragon uses a powerful skill is the common strategy for all dragons" (the game's own tip).
 * - Its stages: the Dragon Raid is the raid heroes farm (for gear, essences and points), so it is easier than the
 *   TechnoMagic Raid's bosses (STAGE_HP, STAGE_DEF, STAGE_DEALS: first guesses, tried in fights).
 * And what its skills share: the heroes it can reach, a blow on each, what stacks on them for a while, and what eats at
 * them every second (a burn, poison).
 */

export const GAUGE = {
  /** How full it is. */
  full: 100,
  /** How much a second of a stun wears it down (knocked down: `down` times as much). */
  perSecond: 12,
  down: 1.5,
  /** Knocked down: for so long, taking so many times as much. */
  lasts: 6,
  takes: 1.3,
};

/** Its health, defense and how hard its blows are at each stage (1 to 8), fought with more than one player; alone, ROOM_HP times less health. */
const STAGE_HP = [1.6e8, 2.2e8, 3e8, 4.1e8, 5.6e8, 7.6e8, 1.03e9, 1.4e9];
const STAGE_DEF = [40_000, 50_000, 62_000, 77_000, 95_000, 118_000, 146_000, 180_000];
const STAGE_DEALS = [1.4, 1.6, 1.85, 2.1, 2.4, 2.7, 3, 3.35];
const ROOM_HP = 1.7;

/** A dragon's health and defense at stage 1 (`hp` and `def` times the table's), for its stats. */
export const firstOf = (hp: number, def: number): { hp: number; def: number } => ({ hp: (STAGE_HP[0] as number) * hp, def: (STAGE_DEF[0] as number) * def });

/** A dragon's stages, fought with others and alone. */
export function dragonStages(): { room: BossScale[]; solo: BossScale[] } {
  const scales = (times: number): BossScale[] =>
    STAGE_HP.map((hp, i) => ({ hp: (hp / (STAGE_HP[0] as number)) * times, deals: STAGE_DEALS[i] as number, defense: (STAGE_DEF[i] as number) / (STAGE_DEF[0] as number) }));
  return { room: scales(1), solo: scales(1 / ROOM_HP) };
}

/** Neither blocks nor dodges, of either kind. */
export const OPEN = { block: NONE, dodge: NONE };

const DOWNED: Buff = { name: 'Knocked Down', icon: '💫' };

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

/** Its skills' cooldowns: each begun as it is used, and run down every step. */
export function cooldowns(of: Readonly<Record<string, number>>): { used(attack: string): void; ready(attack: string): boolean; tick(dt: number): void } {
  const left = new Map<string, number>();
  return {
    used(attack) {
      const cooldown = of[attack];
      if (cooldown !== undefined) left.set(attack, cooldown);
    },
    ready: (attack) => (left.get(attack) ?? 0) <= 0,
    tick(dt) {
      for (const [attack, wait] of left) left.set(attack, Math.max(0, wait - dt));
    },
  };
}

/**
 * A dragon's part: its own (`own`), with its CC Gauge. A stun wears the gauge down rather than holding it; empty, it is
 * Knocked Down (and takes more), and full again once it is up.
 */
export function withGauge(fight: Fight, own: BossPart): BossPart {
  const { foe } = fight;
  let gauge = GAUGE.full;
  /** How long it is down for yet (the gauge is full again once it is up). */
  let downed = 0;
  return {
    ...own,
    controlled(seconds, down) {
      // (Down already: nothing more holds it, and nothing wears its gauge.)
      if (downed > 0) return null;
      gauge -= seconds * GAUGE.perSecond * (down ? GAUGE.down : 1);
      if (gauge > 0) return null;
      gauge = 0;
      downed = GAUGE.lasts;
      put(foe.statuses, { name: DOWNED.name, left: GAUGE.lasts, takes: GAUGE.takes, shown: 'down' });
      fight.cue(null, 'gauge');
      return { seconds: GAUGE.lasts, down: true };
    },
    tick(dt) {
      if (downed > 0) {
        downed = Math.max(0, downed - dt);
        if (downed === 0) gauge = GAUGE.full;
      }
      own.tick?.(dt);
    },
    beaten() {
      gauge = GAUGE.full;
      downed = 0;
      own.beaten?.();
    },
    marks(): Mark[] {
      // (Down, it says so as it is: Knocked Down.)
      return [...(downed > 0 ? [] : [{ text: `CC Gauge ${Math.ceil(gauge)}/${GAUGE.full}`, tone: 'stun' as const }]), ...(own.marks?.() ?? [])];
    },
  };
}
