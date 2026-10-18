import { NONE } from '../../combat/damage';
import { put, type Status } from '../../combat/status';
import type { Buff } from '../../shown';
import type { Fight, Fighter } from '../../types';
import type { BossPart, BossScale } from '../boss';
import { DRAGON_GAUGE, withGauge } from '../gauge';

/*
 * What every dragon has, as King's Raid's Dragon Raid has it:
 * - Its CC Gauge (../gauge.ts): no stun holds a dragon. A hero's stun (or knock down) wears its gauge down instead, by how
 *   long it would have held it; once the gauge is empty the dragon is Down for a while (what it was doing cut short, its
 *   breath among it), and its gauge is full again as it gets up. "Trying to deplete the CC gauge before a dragon uses a
 *   powerful skill is the common strategy for all dragons" (the game's own tip).
 * - Its penetration, 400 points of every hero's defense (the playtest's PiercePower).
 * - Its stages, King's Raid's Hard Dragon Raid's (KR_HP, KR_DEF, KR_ATK): the Dragon Raid is the raid heroes farm (for
 *   gear, essences and points), so it is easier than the TechnoMagic Raid's bosses.
 * And what its skills share: the heroes it can reach, a blow on each, what stacks on them for a while, and what eats at
 * them every second (a burn, poison).
 */

/*
 * Its stages (1 to 10) are King's Raid's Hard Dragon Raid's (its game data: MonsterTierTable, by CampaignWaveTable's
 * chapters 911 to 914), where all four dragons are the same: KR_DEF is their defense as it is, KR_LEVEL their level; KR_ATK is their ATK, of
 * which how hard its blows are at each stage is (DEALS times stage 1's); and KR_HP is their health, of which its health
 * is (HP times). The game's own health is far less than its TechnoMagic Raid's (Galgoria's 20 billion), so HP is what
 * test fights found to make it the easier raid: 8 heroes on Auto in the usual King's Raid gear (UW R5, ATK potentials)
 * beat it in about 30 seconds at stages 1 to 5 and 2 to 2½ minutes at stage 10, where Galgoria takes them over 3 minutes
 * at stage 1. Fought with more than one player; alone, ROOM_HP times less health.
 */
const KR_HP = [9_262_000, 9_262_000, 9_262_000, 9_262_000, 9_262_000, 9_872_000, 12_390_000, 13_120_000, 15_930_000, 21_130_000];
const KR_DEF = [79_200, 79_200, 79_200, 79_200, 79_200, 93_600, 115_200, 151_200, 183_600, 259_200];
const KR_ATK = [809_600, 809_600, 809_600, 809_600, 809_600, 1_060_800, 1_280_000, 2_083_200, 2_529_600, 3_801_600];
const KR_LEVEL = [77, 81, 85, 93, 108, 110, 110, 115, 115, 120];
const HP = 12.5;
const DEALS = 1.4;
const ROOM_HP = 1.7;

/** A dragon's health and defense at stage 1, for its stats. */
export const FIRST = { hp: (KR_HP[0] as number) * HP, def: KR_DEF[0] as number };

/**
 * A dragon's stages, fought with others and alone: so many times as hard its blows, and so many times its health, as the
 * rest's (`own`: how it stood the test fights, with King's Raid's playtest's rules, beside what they were before).
 */
export function dragonStages(own: { deals?: number; hp?: number } = {}): { room: BossScale[]; solo: BossScale[] } {
  const scales = (times: number): BossScale[] =>
    KR_HP.map((hp, i) => ({
      hp: (hp / (KR_HP[0] as number)) * times * (own.hp ?? 1),
      deals: DEALS * (own.deals ?? 1) * ((KR_ATK[i] as number) / (KR_ATK[0] as number)),
      defense: (KR_DEF[i] as number) / (KR_DEF[0] as number),
      level: KR_LEVEL[i] as number,
    }));
  return { room: scales(1), solo: scales(1 / ROOM_HP) };
}

/** Neither blocks nor dodges, of either kind; and sees past 400 points of a hero's defense. */
export const OPEN = { block: NONE, dodge: NONE, pen: 400 };

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

/** A dragon's part: its own (`own`), with its CC Gauge (../gauge.ts: the Hard Dragon Raid's). */
export const withDragonGauge = (fight: Fight, own: BossPart): BossPart => withGauge(fight, own, DRAGON_GAUGE);
