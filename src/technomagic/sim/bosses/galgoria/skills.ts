import { healing, put, type Status } from '../../combat/status';
import { stateArt, type Buff, type Mark } from '../../shown';
import type { Fight, Fighter } from '../../types';
import type { BossPart } from '../boss';
import { GALGORIA_GAUGE, withGauge } from '../gauge';

/*
 * What Galgoria's skills do, as the game has them (its raid's skill list, from its players' guides on DC Inside's King's
 * Raid gallery, with how hard each hits, Swamp Destroyer's share of health, Fatal Venom's numbers and how much higher the
 * heroes' ATK is while one is imprisoned from King's Raid's playtest: its skills' shares of its ATK, as ./attacks.ts has it):
 * - Its attack: a head's venom at whoever it is going for (330%).
 * - Swamp Imprisonment: once the heroes have landed 150 blows, the one that has dealt the most since the last is held
 *   in the swamp for 8 seconds, doing nothing; every other hero's ATK is 70% higher meanwhile. Held, it is still hit, healed and
 *   helped as ever, but not knocked down (the playtest's Gargoria_Shackle: it can't move, attack or use a skill, and is
 *   proof against CC; it can still be aimed at and hurt by either side). Whoever is held comes out as the next is.
 * - Swamp Destroyer: each head's venom in turn on whoever it is going for (55% each), then all three down into the swamp:
 *   every hero is hurt by a share of the health it has left (the playtest's 100/110 of it), and knocked down for 3 seconds.
 * - Poisonous Swamp: a swamp under the heroes for 5 seconds that hurts them every second; while they stand in it their
 *   mana fills 40% slower, but their ATK is 40% higher.
 * - Poisonous Explosion: two blows of venom on every hero (110% each): the first leaves each hitting 50% softer for 10
 *   seconds, the second 500 less likely to land a critical blow.
 * - Fatal Venom: once it has used its skills 3 times, venom on every hero (140%) that stays the rest of the fight, and
 *   stacks: less healing reaches each; and Galgoria hits harder for each time.
 * Its passive, Persistent Life Force: nothing slows its attacks, no hero's life steal takes anything from it, and it
 * gives itself back 1% of its health every second (live King's Raid's; the playtest's is 0.4%), and its Heal Rate is 70%
 * higher, from stage 4 on 120%: added up with what cuts its healing, as the game's Heal Rate is, so a cut takes off that
 * first (1.7% a second, 2.2% from stage 4, with nothing on it). From stage 4 on, 40% less healing reaches the heroes, and
 * their shields are 60% weaker. It takes 20% more physical damage (its stats', the playtest's PhysicalDefensePower -200).
 * What is drawn for them is ./fx.ts.
 */
/** Its attack's share of its ATK. */
const HEAD = 3.3;
export const IMPRISONMENT = { hits: 150, lasts: 8, atk: 0.7 };
const DESTROYER = { venom: 0.55, share: 100 / 110, down: 3, cooldown: 10 };
export const SWAMP = { lasts: 5, every: 1, mana: 0.6, deals: 1.4, cooldown: 17 };
const EXPLOSION = { blow: 1.1, lasts: 10, deals: 0.5, crit: -0.5, cooldown: 18 };
const FATAL = { blow: 1.4, after: 3, heals: 0.2, most: 5, deals: 0.14, mostOnIt: 10 };
/** What it gives itself back a second, of its health, and how much higher its Heal Rate is: from stage `from` on, `later`. */
const LIFE_FORCE = { share: 0.01, healing: 0.7, later: 1.2, from: 4 };
/** From stage 4 on: how much healing reaches the heroes, and how strong their shields are. */
const STAGES = { from: 4, heals: 0.6, shields: 0.4 };
/** The physical damage it takes more of (its stats'). */
export const PHYSICAL_TAKEN = 0.2;

const IMPRISONED: Buff = { name: 'Swamp Imprisonment', about: 'Held in the swamp: it can do nothing (and can’t be knocked down), but the boss still hits it.', icon: '🪤', art: stateArt('3590043'), harmful: true };
const UNBOUND: Buff = { name: 'Swamp Imprisonment (free)', about: `An ally is held: ATK ${Math.round(IMPRISONMENT.atk * 100)}% higher meanwhile.`, icon: '🗡️', art: stateArt('AttackUp') };
const POISONED: Buff = { name: 'Poisonous Swamp', about: `Hurt every second; mana fills ${Math.round((1 - SWAMP.mana) * 100)}% slower, and ATK is ${Math.round((SWAMP.deals - 1) * 100)}% higher.`, icon: '🫧', art: stateArt('3590020'), harmful: true };
const WEAKENED: Buff = { name: 'Poisonous Explosion', about: `Hits ${Math.round((1 - EXPLOSION.deals) * 100)}% softer.`, icon: '💥', art: stateArt('3590030'), harmful: true };
const DULLED: Buff = { name: 'Poisonous Explosion (crit)', about: `${Math.round(-EXPLOSION.crit * 1000)} less crit chance.`, icon: '💥', art: stateArt('3590030'), harmful: true };
const FATAL_VENOM: Buff = { name: 'Fatal Venom', about: `${Math.round(FATAL.heals * 100)}% less healing reaches it for each (the rest of the fight), and the boss hits harder.`, icon: '☠️', art: stateArt('3590040'), harmful: true };

/** Its skills that count toward Fatal Venom, and each one's cooldown; and how long each waits as the fight begins (the playtest's). */
const COOLDOWNS: Readonly<Record<string, number>> = { destroyer: DESTROYER.cooldown, swamp: SWAMP.cooldown, explosion: EXPLOSION.cooldown };
const FIRST: Readonly<Record<string, number>> = { destroyer: 5, swamp: 8, explosion: 12 };

/** Stacks one more of a status that stays the rest of the fight, up to `most`: `made` makes it, `count` of them stacked. */
function stack<Shown>(on: Status<Shown>[], name: string, most: number, made: (count: number) => Omit<Status<Shown>, 'name' | 'left' | 'count'>): void {
  const count = Math.min(most, (on.find((status) => status.name === name)?.count ?? 0) + 1);
  put(on, { ...made(count), name, left: Infinity, count });
}

export function galgoriaPart(fight: Fight): BossPart {
  return withGauge(fight, ownPart(fight), GALGORIA_GAUGE);
}

/** What its skills do, but for its CC Gauge. */
function ownPart(fight: Fight): BossPart {
  const { foe } = fight;
  /** Blows the heroes have landed toward the next imprisonment, and what each has dealt since the last. */
  let hits = 0;
  const dealt = new Map<Fighter, number>();
  /** The heroes shut away: a ring where each comes back out. */
  const shut = new Set<Fighter>();
  /** Its skills' cooldowns, by name; its skills used toward Fatal Venom; and how long its swamp lasts yet, its blow each so often. */
  const cooldowns = new Map<string, number>(Object.entries(FIRST));
  let used = 0;
  let swamp = 0;
  let swampHurts = 0;
  let swampAmount = 0;

  /** Whether the fight is at stage 4 or past it. */
  const late = (): boolean => fight.stage >= STAGES.from;
  /** Its own Heal Rate, as a share (added up with what is on it). */
  const lifeForce = (): number => 1 + (fight.stage >= LIFE_FORCE.from ? LIFE_FORCE.later : LIFE_FORCE.healing);
  /** The heroes the boss can reach. */
  const reachable = (): Fighter[] => fight.field.filter((fighter) => fighter.hp > 0 && !fighter.statuses.some((status) => status.away));

  /** The hero that has dealt the most since the last is held in the swamp (whoever was, let out); every other hero's ATK is higher meanwhile. */
  function imprison(): void {
    const heroes = reachable();
    for (const fighter of heroes) fighter.statuses = fighter.statuses.filter((status) => status.name !== IMPRISONED.name);
    const [top, ...rest] = heroes.sort((a, b) => (dealt.get(b) ?? 0) - (dealt.get(a) ?? 0));
    dealt.clear();
    if (!top) return;
    fight.stagger(top);
    top.reserved = null;
    top.statuses = top.statuses.filter((status) => status.name !== UNBOUND.name);
    put(top.statuses, { name: IMPRISONED.name, left: IMPRISONMENT.lasts, binds: true, guards: true, shown: IMPRISONED });
    for (const other of rest) put(other.statuses, { name: UNBOUND.name, left: IMPRISONMENT.lasts, atk: IMPRISONMENT.atk, shown: UNBOUND });
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
      left: (_part, amount) => venom(amount * HEAD),
      centre: (_part, amount) => venom(amount * HEAD),
      right: (_part, amount) => venom(amount * HEAD),
      destroyer(part, amount) {
        if (part < 3) return venom(amount * DESTROYER.venom);
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
          fight.hurt(fighter, amount * EXPLOSION.blow);
          if (part === 0) put(fighter.statuses, { name: WEAKENED.name, left: EXPLOSION.lasts, deals: EXPLOSION.deals, shown: WEAKENED });
          else put(fighter.statuses, { name: DULLED.name, left: EXPLOSION.lasts, crit: EXPLOSION.crit, shown: DULLED });
        }
        fight.cue(null, 'explosion', heroes);
      },
      // Venom on every hero: less healing reaches each for the rest of the fight; and it hits harder for each time.
      fatal(_part, amount) {
        const heroes = reachable();
        for (const fighter of heroes) {
          fight.hurt(fighter, amount * FATAL.blow);
          stack(fighter.statuses, FATAL_VENOM.name, FATAL.most, (count) => ({ heals: Math.max(0, 1 - FATAL.heals * count), shown: FATAL_VENOM }));
        }
        stack(foe.statuses, FATAL_VENOM.name, FATAL.mostOnIt, (count) => ({ deals: 1 + FATAL.deals * count, art: FATAL_VENOM.art, shown: 'venom' }));
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
    // Delayed (a hero's Fight.delay): each skill's cooldown longer, one ready too.
    delay(seconds) {
      for (const attack of Object.keys(COOLDOWNS)) cooldowns.set(attack, (cooldowns.get(attack) ?? 0) + seconds);
    },
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
      fight.mend(foe.maxHp * LIFE_FORCE.share * dt, lifeForce());
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
    taken: { physical: 1 + PHYSICAL_TAKEN },
    unstolen: true,
    steady: true,
    marks(): Mark[] {
      const heals = `${Number((LIFE_FORCE.share * healing(foe.statuses, lifeForce()) * 100).toPrecision(2))}%`;
      return [
        // (What it gives itself back a second now, of its health: less for what cuts its healing.)
        { text: `Persistent Life Force ${heals}`, tone: 'venom', art: stateArt('3590041'), count: heals },
        { text: `Swamp Imprisonment ${hits}/${IMPRISONMENT.hits}`, tone: 'venom', art: stateArt('3590043'), count: String(hits) },
        { text: `Fatal Venom ${Math.min(used, FATAL.after)}/${FATAL.after}`, tone: 'venom', art: stateArt('3590040'), count: String(Math.min(used, FATAL.after)) },
      ];
    },
  };
}
