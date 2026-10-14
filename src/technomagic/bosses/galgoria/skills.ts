import { put, type Status } from '../../combat/status';
import type { Mark } from '../../hud/boss-bar';
import type { Buff } from '../../hud/buff';
import type { Fight, Fighter } from '../../sim/types';
import type { BossPart } from '../boss';

/*
 * What Galgoria's skills do, as the game has them (how hard each hits, how long each lasts and how much
 * each takes off are a first guess: the game's are not known here):
 * - Swamp Imprisonment: every so many blows the heroes land, the one that has dealt the most since the
 *   last is shut in a cage of light in the swamp for a while: not to be hit, and doing nothing. (One hero
 *   dealing all the damage is left with none: two are wanted.)
 * - Swamp Destroyer: each head's venom in turn on whoever it is going for, then all three down into the
 *   swamp: every hero's shield is drained, and every hero is hurt by a share of its own health and knocked down.
 * - Poisonous Swamp: a swamp under the heroes that hurts them all; while it lasts their mana fills slower,
 *   and Galgoria hits harder.
 * - Poisonous Explosion: two blows of venom on whoever it is going for, that leave it hitting softer, and
 *   less often critically, for a while.
 * - Fatal Venom: venom on whoever it is going for that stays the rest of the fight, and stacks: less
 *   healing reaches it; and Galgoria hits harder for each.
 * Its passive, Persistent Life Force: nothing slows its attacks (and life steal would take nothing from it,
 * were there a hero with any), and it gives itself back its health all the while (less while something
 * on it cuts healing).
 * From stage 4 on it heals itself faster, and less healing reaches the heroes and their shields are weaker,
 * the more so at each stage.
 * What is drawn for them is ./fx.ts.
 */
export const IMPRISONMENT = { hits: 150, lasts: 8 };
const DESTROYER = { share: 0.3, down: 1.5 };
export const SWAMP = { lasts: 12, mana: 0.5, deals: 1.3 };
const EXPLOSION = { lasts: 10, deals: 0.75, crit: -0.15 };
const FATAL = { heals: 0.1, most: 5, deals: 0.05, mostOnIt: 10 };
/** What it gives itself back a second, of its health (little enough that heroes with no gear still wear it down). */
const LIFE_FORCE = 0.0005;
/** From this stage on, each stage over it: how much faster it heals, and how much less healing reaches the heroes and how much weaker their shields are (never under `least`). */
const STAGES = { from: 4, mends: 0.25, heals: 0.1, shields: 0.1, least: 0.3 };

const IMPRISONED: Buff = { name: 'Swamp Imprisonment', about: 'Shut away in the swamp: it can do nothing, and the boss can’t reach it.', icon: '🪤', harmful: true };
const POISONED: Buff = { name: 'Poisonous Swamp', about: 'Mana fills half as fast, and the boss hits 30% harder.', icon: '🫧', harmful: true };
const WEAKENED: Buff = { name: 'Poisonous Explosion', about: 'Hits 25% softer, and is 15% less likely to land a critical blow.', icon: '💥', harmful: true };
const FATAL_VENOM: Buff = { name: 'Fatal Venom', about: 'Less healing reaches it for each (the rest of the fight), and the boss hits harder.', icon: '☠️', harmful: true };

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

  /** How far past stage 4 the fight is (0 before it). */
  const past = (): number => Math.max(0, fight.stage - STAGES.from + 1);
  /** The heroes the boss can reach. */
  const reachable = (): Fighter[] => fight.field.filter((fighter) => fighter.hp > 0 && !fighter.statuses.some((status) => status.away));

  /** The hero that has dealt the most since the last is shut away in the swamp. */
  function imprison(): void {
    const [top] = reachable().sort((a, b) => (dealt.get(b) ?? 0) - (dealt.get(a) ?? 0));
    dealt.clear();
    if (!top) return;
    fight.stagger(top);
    top.reserved = null;
    put(top.statuses, { name: IMPRISONED.name, left: IMPRISONMENT.lasts, away: true, shown: IMPRISONED });
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
      // Each head's venom; then all three down into the swamp, over the whole field.
      destroyer(part, amount) {
        if (part < 3) return venom(amount);
        if (part > 3) return;
        const heroes = reachable();
        fight.cue(null, 'destroyer', heroes);
        for (const fighter of heroes) {
          fighter.shield = 0;
          fighter.shieldLeft = 0;
          fight.hurt(fighter, fighter.stats.hp * DESTROYER.share, false);
          fight.knock(fighter, DESTROYER.down);
        }
      },
      // The swamp, under every hero on the field: it hurts them all, and stays a while.
      swamp(part, amount) {
        if (part > 0) return;
        const heroes = reachable();
        if (heroes.length === 0) return;
        fight.cue(null, 'swamp', heroes);
        for (const fighter of heroes) fight.hurt(fighter, amount);
        put(fight.party, { name: POISONED.name, left: SWAMP.lasts, mana: SWAMP.mana, shown: POISONED });
        put(foe.statuses, { name: POISONED.name, left: SWAMP.lasts, deals: SWAMP.deals, shown: 'venom' });
      },
      explosion(_part, amount) {
        venom(amount, (target) => {
          put(target.statuses, { name: WEAKENED.name, left: EXPLOSION.lasts, deals: EXPLOSION.deals, crit: EXPLOSION.crit, shown: WEAKENED });
          fight.cue(null, 'explosion', [target]);
        });
      },
      fatal(_part, amount) {
        venom(amount, (target) => {
          stack(target.statuses, FATAL_VENOM.name, FATAL.most, (count) => ({ heals: 1 - FATAL.heals * count, shown: FATAL_VENOM }));
          stack(foe.statuses, FATAL_VENOM.name, FATAL.mostOnIt, (count) => ({ deals: 1 + FATAL.deals * count, shown: 'venom' }));
          fight.cue(null, 'fatal', [target]);
        });
      },
    },
    // Every blow counts toward the next imprisonment, and what it dealt toward who is shut away.
    struck(by, amount) {
      dealt.set(by, (dealt.get(by) ?? 0) + amount);
      if (++hits < IMPRISONMENT.hits) return;
      hits = 0;
      imprison();
    },
    // Beaten: whole again, it starts over (nothing is at stake here). Its venom goes with it.
    beaten() {
      hits = 0;
      dealt.clear();
      for (const on of [foe.statuses, ...fight.fighters.map((fighter) => fighter.statuses)]) {
        const at = on.findIndex((status) => status.name === FATAL_VENOM.name);
        if (at >= 0) on.splice(at, 1);
      }
    },
    tick(dt) {
      fight.mend(foe.maxHp * LIFE_FORCE * (1 + STAGES.mends * past()) * dt);
      // A hero shut away comes back out of the swamp.
      for (const fighter of shut) {
        if (fighter.statuses.some((status) => status.name === IMPRISONED.name)) continue;
        shut.delete(fighter);
        fight.cue(null, 'free', [fighter]);
      }
    },
    healing: () => Math.max(STAGES.least, 1 - STAGES.heals * past()),
    shielding: () => Math.max(STAGES.least, 1 - STAGES.shields * past()),
    steady: true,
    marks(): Mark[] {
      return [
        { text: 'Life Force', tone: 'venom' },
        { text: `Imprisonment ${hits}/${IMPRISONMENT.hits}`, tone: 'venom' },
      ];
    },
  };
}
