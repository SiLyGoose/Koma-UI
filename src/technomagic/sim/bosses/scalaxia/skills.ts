import { MAX_MANA } from '../../rules';
import { put } from '../../combat/status';
import { stateArt, type Buff } from '../../shown';
import type { Fight, Fighter } from '../../types';
import type { BossPart } from '../boss';
import { addStacks, all, cooldowns, fraction, lift, opened, single, withDragonGauge, HARD, type DragonMode } from '../dragon/common';
import { INHALE } from '../dragon/moves';

/*
 * What Scalaxia's skills do, as King's Raid's Frost Dragon has them (its skills' words: "3 consecutive tail smashes deal
 * M.DMG upon frontal enemies and inflict Frost. When Frost stacks up to 10 on an enemy, inflict Freeze. Enemies inflicted
 * by Freeze take more DMG." and "Flies upward, casting a powerful Ice magic. Enemies inflicted with Freeze take increased
 * DMG and have their Mana reduced greatly."; how hard each hits, and for how long, are first guesses):
 * - Frost: every blow of its leaves Frost on whoever it lands on (FROST.lasts, begun again with each); ten of it and they
 *   are Frozen: they can do nothing for FROST.freeze seconds, and take FROST.takes times as much meanwhile.
 * - Tail Smash: three smashes of its tail on the heroes, each leaving SMASH.frost Frost.
 * - Frost Breath: four blows of ice over the field, each leaving BREATH.frost Frost.
 * - Glacial Storm: up on its wings, two blows of ice on every hero, and down on them: every hero Frozen, and STORM.mana
 *   of its mana gone.
 * Its claws and bite are on whoever it is going for, its tail across the field. And its CC Gauge (../dragon/common.ts).
 */
const FROST = { freezeAt: 10, lasts: 10, freeze: 3, takes: 1.3 };
const SMASH = { frost: 2, health: 1 / 3 };
const BREATH = { frost: 2 };
export const STORM = { mana: 1500, health: 0.42 };

const FROSTED: Buff = { name: 'Frost', about: `At ${FROST.freezeAt} of it, Frozen.`, icon: '❄️', art: stateArt('1940'), harmful: true };
const FROZEN: Buff = { name: 'Freeze', about: `Frozen: it can do nothing, and takes ${Math.round((FROST.takes - 1) * 100)}% more damage.`, icon: '🧊', art: stateArt('Frozen'), harmful: true };

export function scalaxiaPart(fight: Fight, mode: DragonMode = HARD): BossPart {
  // (Each skill's cooldown, and first wait, the playtest's: its Frost Hell's for its tail sweep.)
  const waits = cooldowns({ claw: [5, 3], sweep: [20, 18], smashes: [13, 8], breath: [25, 15], storm: [45, 30] });

  /** A hero frozen: it can do nothing for a while, and takes more meanwhile (its Frost gone). */
  function freeze(fighter: Fighter): void {
    lift(fighter, FROSTED.name);
    fight.stagger(fighter);
    fighter.reserved = null;
    put(fighter.statuses, { name: FROZEN.name, left: FROST.freeze, binds: true, takes: FROST.takes, shown: FROZEN });
  }
  /** So much more Frost on a hero (none while it is frozen): at FROST.freezeAt, frozen. */
  function frost(fighter: Fighter, by: number): void {
    if (fighter.statuses.some((status) => status.name === FROZEN.name)) return;
    if (addStacks(fighter, FROSTED.name, by, FROST.freezeAt, FROST.lasts, () => ({ shown: FROSTED })) >= FROST.freezeAt) freeze(fighter);
  }

  return withDragonGauge(fight, {
    // (Its 600 M.DMG cut: the playtest's M.DefensePower.)
    taken: { magical: 0.4 },
    lands: {
      // (The first, its Frost Smash's share of what health the one it goes for has left.)
      smashes(part, amount) {
        all(fight, amount, (fighter) => frost(fighter, SMASH.frost), 'smash');
        if (part === 0) fraction(fight, [fight.target()], SMASH.health);
      },
      breath(part, amount) {
        if (part >= INHALE) all(fight, amount, (fighter) => frost(fighter, BREATH.frost), 'frost');
      },
      // Up in the air, its ice twice on every hero (each the playtest's Absolute Zero's share of what health each has left); then
      // down on them, freezing them all and taking their mana. (Open once it is down to ULTIMATE of its health.)
      storm(part, amount) {
        if (part === 0) return;
        if (part < 3) return void fraction(fight, all(fight, amount, (fighter) => frost(fighter, 1), 'storm'), STORM.health);
        all(
          fight,
          amount,
          (fighter) => {
            freeze(fighter);
            fighter.mana = Math.max(0, Math.min(MAX_MANA, fighter.mana - STORM.mana));
          },
          'glacial',
        );
      },
      bite: (_part, amount) => single(fight, amount, (fighter) => frost(fighter, 1)),
      claw: (_part, amount) => single(fight, amount, (fighter) => frost(fighter, 1)),
      sweep: (_part, amount) => void all(fight, amount, (fighter) => frost(fighter, 1), 'sweep'),
    },
    used(attack) {
      waits.used(attack);
      // Its storm calls up its pillars of ice.
      if (attack === 'storm') fight.cue(null, 'pillars');
    },
    ready: (attack) => waits.ready(attack) && (attack !== 'storm' || opened(fight, mode.ultimate)),
    tick: waits.tick,
    delay: waits.delay,
    beaten() {
      for (const fighter of fight.fighters) {
        lift(fighter, FROSTED.name);
        lift(fighter, FROZEN.name);
      }
    },
  }, mode.gauge);
}
