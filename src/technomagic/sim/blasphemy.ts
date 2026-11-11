import { ATK } from './combat/damage';
import { put } from './combat/status';
import { stateArt, type Buff } from './shown';
import type { Fighter, Foe } from './types';

/*
 * Runes of Blasphemy's extra skills in the fight (King's Raid's 193701001 to 193710003: KR-extracted/briefs/divine-punishment.md
 * §8; their words: ./gear/blasphemy.ts). The bot sends, for each Rune of Blasphemy a hero wears, the skill of the hero's class
 * and its rolled value (its skill level: a percent, or seconds, as its words have it). Each is a stand-in, as simple as the fight
 * has it; every number but the rolled value is King's Raid's DescParam:
 * - Doh (Apocalypsion's): each part of a hero's attack, a chance of {v}% to knock the boss down for 4 seconds (Warrior and
 *   Knight's), or to stun it 4 seconds (Petrification: Archer, Assassin and Mechanic's), or a 5% chance of a meteor of {v}% of
 *   ATK on every enemy (Wizard and Priest's).
 *   Doh (Solenis'): a {v}% chance to heal itself 1000% of ATK, or to shield itself 100% of ATK for 5 seconds, or a 5% chance to
 *   heal the ally with the least of its health {v}% of ATK.
 * - Laz: a single blow taking 35%, 60% or 40% of its max HP (by class) or more: {v}% less DMG taken for 3 seconds (Apocalypsion's),
 *   or a shield of {v}% of ATK for 3 seconds (Solenis'); 60 seconds before it comes again.
 * - Geb: {v}% of all DMG it takes over 30, 50 or 40 seconds, reflected on every enemy at its end as a blow of its own (a set
 *   amount, nothing taking from it but what nothing gets past: Luciteron's 1 a blow); and (Solenis') a dispel of what helps the
 *   boss and a knock down of 4 seconds with it. Its cooldown (60, 120 or 80 seconds) runs from the start of each.
 * - Oth (Apocalypsion's): {v}% of the healing it is given (only what makes up what it has lost) added to its next attack, as a
 *   set amount on whoever it lands on. (Solenis'): taking DMG, {v}% of its max HP back every second for 5, 4 or 3 seconds, once
 *   every 10 seconds.
 * - Ans (Apocalypsion's): as it falls, every ally's DEF {v}% higher (Warrior and Knight's) or ATK (Archer, Assassin and
 *   Mechanic's) for 20 seconds; or (Wizard and Priest's: HP {v}% higher) a shield of {v}% of each one's max HP for 20 seconds,
 *   a stand-in for its max HP raised. (Solenis'): as it falls, the ally with the least of its health invincible for {v} seconds
 *   (nothing it is dealt reaches it).
 */

/** What a hero's runes need of the fight. */
export interface BlasphemyFight {
  roll(): number;
  /** Its allies on the field, standing and in the fight (it among them, if it is). */
  allies(): readonly Fighter[];
  /** The enemies standing; the one it is fighting. */
  foes(): readonly Foe[];
  aim(by: Fighter): Foe | null;
  /** `run` with `foe` the enemy in question. */
  on(foe: Foe, run: () => void): void;
  /** A blow of `by`'s on the enemy in question, `amount` thousandths of its ATK (not counted: one of its own). */
  hit(by: Fighter, amount: number): void;
  /** So much off an enemy as it is, whatever its defense: `by`'s. */
  harm(foe: Foe, by: Fighter, amount: number): void;
  /** The enemy in question stunned (knocked `down`) by `by`. */
  stun(by: Fighter, seconds: number, down: boolean): void;
  /** As Fight.heal and Fight.shield: by `by`'s ATK, or (none) as it is, counted as `from`'s. */
  heal(on: Fighter, amount: number, by?: Fighter, from?: Fighter): void;
  shield(on: Fighter, amount: number, seconds: number, by?: Fighter): void;
  /** What helps the enemy in question is gone. */
  dispel(): void;
}

/** What a hero's runes do as the fight goes. */
export interface BlasphemyHooks {
  /** A part of its attack begins landing (its first blow), on `foe`. */
  basic(foe: Foe | null): void;
  /** A blow has taken `dealt` of it (before its shield: all of it). */
  hurt(dealt: number): void;
  /** It has been given `amount` of health that made up what it had lost. */
  healed(amount: number): void;
  tick(dt: number): void;
  /** It has fallen. */
  died(): void;
}

/** A line the bot sends: a skill (./gear/blasphemy.ts lines' ids) and its rolled value. */
export interface BlasphemyUse {
  skill: string;
  value: number;
}

const SHOWN: Buff = { name: 'Rune of Blasphemy', about: 'A Rune of Blasphemy.', icon: '🔺', art: stateArt('AttackUp') };
/** By class group (1: Warrior, Knight; 2: Archer, Assassin, Mechanic; 3: Wizard, Priest): Laz's share of max HP, Geb's seconds and cooldown, Solenis' Oth's seconds. */
const LAZ = [0.35, 0.6, 0.4] as const;
const GEB = [
  [30, 60],
  [50, 120],
  [40, 80],
] as const;
const OTH = [5, 4, 3] as const;

/** A hero's Runes of Blasphemy's hooks (none: it has none the fight knows). */
export function blasphemyHooks(self: Fighter, uses: readonly BlasphemyUse[], fight: BlasphemyFight): BlasphemyHooks | null {
  /** Its lines, by skill: the values of two of the same added up. */
  const lines = new Map<string, number>();
  for (const { skill, value } of uses) if (Number.isFinite(value) && value > 0) lines.set(skill, (lines.get(skill) ?? 0) + value);
  if (lines.size === 0) return null;
  const group = (skill: string): number => Number(skill.slice(-1)) - 1;
  const pick = (prefix: string): [string, number] | null => {
    for (const [skill, value] of lines) if (skill.startsWith(prefix)) return [skill, value];
    return null;
  };
  const doh = pick('apocalypsion-doh-') ?? pick('solenis-doh-');
  const laz = pick('apocalypsion-laz-') ?? pick('solenis-laz-');
  const geb = pick('apocalypsion-geb-') ?? pick('solenis-geb-');
  const othA = pick('apocalypsion-oth-');
  const othS = pick('solenis-oth-');
  const ans = pick('apocalypsion-ans-') ?? pick('solenis-ans-');
  let lazWait = 0;
  // Geb: what it has taken this time, how long of it is left, how long until the next.
  let reflected = 0;
  let reflecting = geb ? (GEB[group(geb[0])]?.[0] ?? 30) : 0;
  let gebWait = geb ? (GEB[group(geb[0])]?.[1] ?? 60) : 0;
  let stored = 0;
  let othWait = 0;
  let mending = 0;
  let mendTick = 0;
  const chance = (percent: number): boolean => fight.roll() < percent / 100;

  return {
    basic(foe) {
      if (stored > 0 && foe) {
        fight.harm(foe, self, stored);
        stored = 0;
      }
      if (!doh) return;
      const [skill, v] = doh;
      const n = group(skill);
      if (skill.startsWith('apocalypsion')) {
        if (n === 2) {
          if (chance(5)) for (const one of fight.foes()) fight.on(one, () => fight.hit(self, v * 10));
        } else if (foe && chance(v)) fight.on(foe, () => fight.stun(self, 4, n === 0));
        return;
      }
      if (n === 0 && chance(v)) fight.heal(self, 10 * ATK, self);
      else if (n === 1 && chance(v)) fight.shield(self, ATK, 5, self);
      else if (n === 2 && chance(5)) {
        const ally = fight.allies().reduce<Fighter | null>((low, on) => (!low || on.hp / on.stats.hp < low.hp / low.stats.hp ? on : low), null);
        if (ally) fight.heal(ally, (v / 100) * ATK, self);
      }
    },
    hurt(dealt) {
      if (geb && reflecting > 0) reflected += dealt;
      if (laz && lazWait <= 0 && dealt >= self.stats.hp * (LAZ[group(laz[0])] ?? 0.35)) {
        lazWait = 60;
        if (laz[0].startsWith('apocalypsion')) put(self.statuses, { name: 'Blasphemy: Laz', left: 3, takes: Math.max(0, 1 - laz[1] / 100), shown: SHOWN });
        else fight.shield(self, (laz[1] / 100) * ATK, 3, self);
      }
      if (othS && othWait <= 0 && dealt > 0) {
        othWait = 10;
        mending = OTH[group(othS[0])] ?? 5;
        mendTick = 0;
      }
    },
    healed(amount) {
      if (othA) stored += (amount * othA[1]) / 100;
    },
    tick(dt) {
      lazWait = Math.max(0, lazWait - dt);
      othWait = Math.max(0, othWait - dt);
      if (mending > 0 && othS) {
        mending -= dt;
        mendTick += dt;
        if (mendTick >= 1) {
          mendTick -= 1;
          fight.heal(self, (self.stats.hp * othS[1]) / 100, undefined, self);
        }
      }
      if (!geb) return;
      gebWait -= dt;
      if (reflecting > 0) {
        reflecting -= dt;
        if (reflecting <= 0) {
          const amount = (reflected * geb[1]) / 100;
          reflected = 0;
          for (const one of fight.foes()) {
            fight.harm(one, self, amount);
            if (geb[0].startsWith('solenis'))
              fight.on(one, () => {
                fight.dispel();
                fight.stun(self, 4, true);
              });
          }
        }
      }
      if (gebWait <= 0) {
        const [over, wait] = GEB[group(geb[0])] ?? [30, 60];
        gebWait = wait;
        reflecting = over;
        reflected = 0;
      }
    },
    died() {
      if (!ans) return;
      const [skill, v] = ans;
      const allies = fight.allies().filter((on) => on !== self);
      if (skill.startsWith('solenis')) {
        const low = allies.reduce<Fighter | null>((best, on) => (!best || on.hp / on.stats.hp < best.hp / best.stats.hp ? on : best), null);
        if (low) put(low.statuses, { name: 'Blasphemy: Ans', left: v, takes: 0, shown: SHOWN });
        return;
      }
      const n = group(skill);
      for (const on of allies) {
        if (n === 0) put(on.statuses, { name: `Blasphemy: Ans ${self.index}`, left: 20, defends: 1 + v / 100, shown: SHOWN });
        else if (n === 1) put(on.statuses, { name: `Blasphemy: Ans ${self.index}`, left: 20, atk: v / 100, shown: SHOWN });
        else fight.shield(on, (on.stats.hp * v) / 100, 20);
      }
    },
  };
}
