import { put, type Status } from '../../combat/status';
import type { Buff, Mark } from '../../shown';
import type { Fight, Fighter } from '../../types';
import type { BossPart } from '../boss';

/*
 * What Galgoria's skills do, as the game has them (its raid's skill list, from its players' guides on DC Inside's King's
 * Raid gallery: each one's cooldown, how long what it does lasts, and its shares; how hard each hits, Swamp Destroyer's
 * share of health, the swamp's blows, Fatal Venom's numbers and how much more the heroes deal while one is imprisoned
 * are not said there, and are a first guess):
 * - Swamp Imprisonment: once the heroes have landed 150 blows, the one that has dealt the most since the last is shut
 *   away in the swamp for 8 seconds: not to be hit, and doing nothing; every other hero deals more meanwhile.
 * - Swamp Destroyer: each head's venom in turn on whoever it is going for, then all three down into the swamp: every
 *   hero is hurt by a share of the health it has left, and knocked down for 3 seconds.
 * - Poisonous Swamp: a swamp under the heroes for 5 seconds that hurts them every second; while they stand in it their
 *   mana fills 40% slower, but their ATK is 40% higher.
 * - Poisonous Explosion: two blows of venom on every hero: the first leaves each hitting 50% softer for 10 seconds, the
 *   second 500 less likely to land a critical blow.
 * - Fatal Venom: once it has used its skills 3 times, venom on every hero that stays the rest of the fight, and stacks:
 *   less healing reaches each; and Galgoria hits harder for each time.
 * Its passive, Persistent Life Force: nothing slows its attacks, no hero's life steal takes anything from it, and it
 * gives itself back 0.393% of its health every second, 70% more than that (its healing) and from stage 4 on 120% more
 * (less while something on it cuts healing). From stage 4 on, 40% less healing reaches the heroes, and their shields
 * are 60% weaker. It takes 20% more physical damage.
 * What is drawn for them is ./fx.ts.
 */
export const IMPRISONMENT = { hits: 150, lasts: 8, deals: 1.3 };
const DESTROYER = { share: 0.3, down: 3, cooldown: 10 };
export const SWAMP = { lasts: 5, every: 1, mana: 0.6, deals: 1.4, cooldown: 17 };
const EXPLOSION = { lasts: 10, deals: 0.5, crit: -0.5, cooldown: 18 };
const FATAL = { after: 3, heals: 0.2, most: 5, deals: 0.1, mostOnIt: 10 };
/** What it gives itself back a second, of its health, and how much more its healing gives it: from stage `from` on, `later`. */
const LIFE_FORCE = { share: 0.00393, healing: 0.7, later: 1.2, from: 4 };
/** From stage 4 on: how much healing reaches the heroes, and how strong their shields are. */
const STAGES = { from: 4, heals: 0.6, shields: 0.4 };
/** How many times as much it takes of each kind of damage. */
const TAKEN = { physical: 1.2 };

const IMPRISONED: Buff = { name: 'Swamp Imprisonment', about: 'Shut away in the swamp: it can do nothing, and the boss can’t reach it.', icon: '🪤', harmful: true };
const UNBOUND: Buff = { name: 'Swamp Imprisonment (free)', about: `An ally is shut away: ${Math.round((IMPRISONMENT.deals - 1) * 100)}% more damage dealt meanwhile.`, icon: '🗡️' };
const POISONED: Buff = { name: 'Poisonous Swamp', about: `Hurt every second; mana fills ${Math.round((1 - SWAMP.mana) * 100)}% slower, and ATK is ${Math.round((SWAMP.deals - 1) * 100)}% higher.`, icon: '🫧', harmful: true };
const WEAKENED: Buff = { name: 'Poisonous Explosion', about: `Hits ${Math.round((1 - EXPLOSION.deals) * 100)}% softer.`, icon: '💥', harmful: true };
const DULLED: Buff = { name: 'Poisonous Explosion (crit)', about: `${Math.round(-EXPLOSION.crit * 1000)} less crit chance.`, icon: '💥', harmful: true };
const FATAL_VENOM: Buff = { name: 'Fatal Venom', about: `${Math.round(FATAL.heals * 100)}% less healing reaches it for each (the rest of the fight), and the boss hits harder.`, icon: '☠️', harmful: true };

/** Its skills that count toward Fatal Venom, and each one's cooldown. */
const COOLDOWNS: Readonly<Record<string, number>> = { destroyer: DESTROYER.cooldown, swamp: SWAMP.cooldown, explosion: EXPLOSION.cooldown };

/** Stacks one more of a status that stays the rest of the fight, up to `most`: `made` makes it, `count` of them stacked. */
function stack<Shown>(on: Status<Shown>[], name: string, most: number, made: (count: number) => Omit<Status<Shown>, 'name' | 'left' | 'count'>): void {
  const count = Math.min(most, (on.find((status) => status.name === name)?.count ?? 0) + 1);
  put(on, { ...made(count), name, left: Infinity, count });
}

export function galgoriaPart(fight: Fight): BossPart {
  const { foe } = fight;
  /** Blows the heroes have landed toward the next imprisonment, and what each has dealt since the last. */
  let hits = 0;
  const dealt = new Map<Fighter, number>();
  /** The heroes shut away: a ring where each comes back out. */
  const shut = new Set<Fighter>();
  /** Its skills' cooldowns, by name; its skills used toward Fatal Venom; and how long its swamp lasts yet, its blow each so often. */
  const cooldowns = new Map<string, number>();
  let used = 0;
  let swamp = 0;
  let swampHurts = 0;
  let swampAmount = 0;

  /** Whether the fight is at stage 4 or past it. */
  const late = (): boolean => fight.stage >= STAGES.from;
  /** The heroes the boss can reach. */
  const reachable = (): Fighter[] => fight.field.filter((fighter) => fighter.hp > 0 && !fighter.statuses.some((status) => status.away));

  /** The hero that has dealt the most since the last is shut away in the swamp; every other hero deals more meanwhile. */
  function imprison(): void {
    const [top, ...rest] = reachable().sort((a, b) => (dealt.get(b) ?? 0) - (dealt.get(a) ?? 0));
    dealt.clear();
    if (!top) return;
    fight.stagger(top);
    top.reserved = null;
    put(top.statuses, { name: IMPRISONED.name, left: IMPRISONMENT.lasts, away: true, shown: IMPRISONED });
    for (const other of rest) put(other.statuses, { name: UNBOUND.name, left: IMPRISONMENT.lasts, deals: IMPRISONMENT.deals, shown: UNBOUND });
    fight.cue(null, 'imprison', [top]);
    shut.add(top);
  }

  /** The venom of a blow lands on whoever it is going for: what it takes, and then `then` on it. */
  function venom(amount: number, then?: (target: Fighter) => void): void {
    const target = fight.target();
    if (!target || target.hp <= 0) return;
    fight.hurt(target, amount);
    then?.(target);
  }

  return {
    lands: {
      // Each head's venom; then all three down into the swamp, over the whole field: a share of what health each has left.
      destroyer(part, amount) {
        if (part < 3) return venom(amount);
        if (part > 3) return;
        const heroes = reachable();
        fight.cue(null, 'destroyer', heroes);
        for (const fighter of heroes) {
          fight.hurt(fighter, fighter.hp * DESTROYER.share, false);
          fight.knock(fighter, DESTROYER.down);
        }
      },
      // The swamp, under every hero on the field: it hurts them every second while it lasts; meanwhile their mana fills slower, but they hit harder.
      swamp(part, amount) {
        if (part > 0) return;
        const heroes = reachable();
        if (heroes.length === 0) return;
        fight.cue(null, 'swamp', heroes);
        for (const fighter of heroes) put(fighter.statuses, { name: POISONED.name, left: SWAMP.lasts, mana: SWAMP.mana, deals: SWAMP.deals, shown: POISONED });
        swamp = SWAMP.lasts;
        swampHurts = 0;
        swampAmount = amount / (SWAMP.lasts / SWAMP.every);
      },
      // Two blows of venom on every hero: the first leaves each hitting softer, the second less likely to land a critical blow.
      explosion(part, amount) {
        const heroes = reachable();
        for (const fighter of heroes) {
          fight.hurt(fighter, amount);
          if (part === 0) put(fighter.statuses, { name: WEAKENED.name, left: EXPLOSION.lasts, deals: EXPLOSION.deals, shown: WEAKENED });
          else put(fighter.statuses, { name: DULLED.name, left: EXPLOSION.lasts, crit: EXPLOSION.crit, shown: DULLED });
        }
        fight.cue(null, 'explosion', heroes);
      },
      // Venom on every hero: less healing reaches each for the rest of the fight; and it hits harder for each time.
      fatal(_part, amount) {
        const heroes = reachable();
        for (const fighter of heroes) {
          fight.hurt(fighter, amount);
          stack(fighter.statuses, FATAL_VENOM.name, FATAL.most, (count) => ({ heals: Math.max(0, 1 - FATAL.heals * count), shown: FATAL_VENOM }));
        }
        stack(foe.statuses, FATAL_VENOM.name, FATAL.mostOnIt, (count) => ({ deals: 1 + FATAL.deals * count, shown: 'venom' }));
        fight.cue(null, 'fatal', heroes);
      },
    },
    // Every blow counts toward the next imprisonment, and what it dealt toward who is shut away.
    struck(by, amount) {
      dealt.set(by, (dealt.get(by) ?? 0) + amount);
      if (++hits < IMPRISONMENT.hits) return;
      hits = 0;
      imprison();
    },
    // A skill used: its cooldown begun, and one more toward Fatal Venom (that, used, begins the count again).
    used(attack) {
      const cooldown = COOLDOWNS[attack];
      if (cooldown !== undefined) {
        cooldowns.set(attack, cooldown);
        used++;
      } else if (attack === 'fatal') used = 0;
    },
    next: () => (used >= FATAL.after ? 'fatal' : null),
    // Boss auto: a skill once its cooldown is over; Fatal Venom only of itself (next).
    ready: (attack) => attack !== 'fatal' && (cooldowns.get(attack) ?? 0) <= 0,
    // Beaten: whole again, it starts over (nothing is at stake here). Its venom goes with it.
    beaten() {
      hits = 0;
      used = 0;
      dealt.clear();
      for (const on of [foe.statuses, ...fight.fighters.map((fighter) => fighter.statuses)]) {
        const at = on.findIndex((status) => status.name === FATAL_VENOM.name);
        if (at >= 0) on.splice(at, 1);
      }
    },
    tick(dt) {
      for (const [attack, left] of cooldowns) cooldowns.set(attack, Math.max(0, left - dt));
      fight.mend(foe.maxHp * LIFE_FORCE.share * (1 + (fight.stage >= LIFE_FORCE.from ? LIFE_FORCE.later : LIFE_FORCE.healing)) * dt);
      // The swamp's blow every so often while it lasts, on every hero standing in it.
      if (swamp > 0) {
        swamp -= dt;
        swampHurts += dt;
        if (swampHurts >= SWAMP.every) {
          swampHurts -= SWAMP.every;
          for (const fighter of reachable()) if (fighter.statuses.some((status) => status.name === POISONED.name)) fight.hurt(fighter, swampAmount);
        }
      }
      // A hero shut away comes back out of the swamp.
      for (const fighter of shut) {
        if (fighter.statuses.some((status) => status.name === IMPRISONED.name)) continue;
        shut.delete(fighter);
        fight.cue(null, 'free', [fighter]);
      }
    },
    healing: () => (late() ? STAGES.heals : 1),
    shielding: () => (late() ? STAGES.shields : 1),
    taken: TAKEN,
    unstolen: true,
    steady: true,
    marks(): Mark[] {
      return [
        { text: 'Life Force', tone: 'venom' },
        { text: `Imprisonment ${hits}/${IMPRISONMENT.hits}`, tone: 'venom' },
        { text: `Fatal Venom ${Math.min(used, FATAL.after)}/${FATAL.after}`, tone: 'venom' },
      ];
    },
  };
}
