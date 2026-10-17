import { MAX_MANA } from '../../rules';
import { put } from '../../combat/status';
import type { Buff } from '../../shown';
import type { Fight, Fighter } from '../../types';
import type { BossPart } from '../boss';
import { addStacks, all, cooldowns, lift, single, withGauge } from '../dragon/common';
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
const SMASH = { frost: 2, cooldown: 10 };
const BREATH = { frost: 2, cooldown: 16 };
export const STORM = { mana: 1500, cooldown: 26 };

const FROSTED: Buff = { name: 'Frost', about: `At ${FROST.freezeAt} of it, Frozen.`, icon: '❄️', harmful: true };
const FROZEN: Buff = { name: 'Freeze', about: `Frozen: it can do nothing, and takes ${Math.round((FROST.takes - 1) * 100)}% more damage.`, icon: '🧊', harmful: true };

export function scalaxiaPart(fight: Fight): BossPart {
  const waits = cooldowns({ smashes: SMASH.cooldown, breath: BREATH.cooldown, storm: STORM.cooldown });

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

  return withGauge(fight, {
    lands: {
      smashes: (_part, amount) => void all(fight, amount, (fighter) => frost(fighter, SMASH.frost), 'smash'),
      breath(part, amount) {
        if (part >= INHALE) all(fight, amount, (fighter) => frost(fighter, BREATH.frost), 'frost');
      },
      // Up in the air, its ice twice on every hero; then down on them, freezing them all and taking their mana.
      storm(part, amount) {
        if (part === 0) return;
        if (part < 3) return void all(fight, amount, (fighter) => frost(fighter, 1), 'storm');
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
    ready: waits.ready,
    tick: waits.tick,
    beaten() {
      for (const fighter of fight.fighters) {
        lift(fighter, FROSTED.name);
        lift(fighter, FROZEN.name);
      }
    },
  });
}
