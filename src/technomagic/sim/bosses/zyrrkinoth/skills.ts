import { put } from '../../combat/status';
import type { Buff, Mark } from '../../shown';
import type { Fight, Fighter } from '../../types';
import type { BossPart } from '../boss';
import { addStacks, all, cooldowns, dot, lift, single, stacksOf, withGauge } from '../dragon/common';
import { INHALE } from '../dragon/moves';

/*
 * What Zyrrkinoth's skills do, as King's Raid's Poison Dragon has them (the game's tip: "Zyrrkinoth has very high Crit
 * Resistance and DMG Reduction. But each time he takes Crit DMG, he takes increased DMG from enemies. Zyrrkinoth is not
 * affected by changes in ATK Spd."; its skill's words: "Deals P.DMG to enemies within range 3 times and adds 5 stacks of
 * Poison per hit. Knocks back enemies. Enemies with 30 or more stacks of Poison are Petrified for 5 sec."; the rest are
 * first guesses):
 * - Toxic Scales: its Crit Resistance (SCALES.critResist points off every hero's crit chance on it), and it takes only
 *   SCALES.taken of what is dealt it; each critical blow it takes has it take SCALES.per more for the rest of the fight
 *   (up to SCALES.most times).
 * - Poison: every blow of its leaves Poison on whoever it lands on (POISON.lasts, begun again with each), every stack of
 *   it eating at them every second; at POISON.petrifyAt they are Petrified for POISON.petrify seconds, the poison gone.
 * - Tail Lash: three lashes of its tail on the heroes, each leaving LASH.stacks Poison and knocking them back.
 * - Venomous Breath: four blows of venom over the field, each leaving BREATH.stacks Poison.
 * Its claws and bite are on whoever it is going for, its tail across the field. And its CC Gauge (../dragon/common.ts).
 */
export const SCALES = { critResist: 400, taken: 0.7, per: 0.03, most: 30 };
const POISON = { petrifyAt: 30, lasts: 12, petrify: 5, hurts: 4_000, blow: 2 };
const LASH = { stacks: 5, knock: 0.6, cooldown: 11 };
const BREATH = { stacks: 3, cooldown: 16 };

const POISONED: Buff = { name: 'Poison', about: `Eats at it every second, the more for every stack; at ${POISON.petrifyAt}, Petrified.`, icon: '🧪', harmful: true };
const PETRIFIED: Buff = { name: 'Petrified', about: 'Turned to stone: it can do nothing.', icon: '🗿', harmful: true };

export function zyrrkinothPart(fight: Fight): BossPart {
  const waits = cooldowns({ smashes: LASH.cooldown, breath: BREATH.cooldown });
  /** The critical blows it has taken (up to SCALES.most): each has it take more. */
  let cracks = 0;
  const taken = { physical: SCALES.taken, magical: SCALES.taken };
  const eating = dot(fight, POISONED.name, (fighter) => stacksOf(fighter, POISONED.name) * POISON.hurts);

  /** So much more Poison on a hero (none while it is stone): at POISON.petrifyAt, Petrified. */
  function poison(fighter: Fighter, by: number): void {
    if (fighter.statuses.some((status) => status.name === PETRIFIED.name)) return;
    if (addStacks(fighter, POISONED.name, by, POISON.petrifyAt, POISON.lasts, () => ({ shown: POISONED })) < POISON.petrifyAt) return;
    lift(fighter, POISONED.name);
    fight.stagger(fighter);
    fighter.reserved = null;
    put(fighter.statuses, { name: PETRIFIED.name, left: POISON.petrify, binds: true, shown: PETRIFIED });
    fight.cue(null, 'petrify', [fighter]);
  }

  return withGauge(fight, {
    lands: {
      smashes: (_part, amount) =>
        void all(
          fight,
          amount,
          (fighter) => {
            poison(fighter, LASH.stacks);
            if (fighter.hp > 0) fight.knock(fighter, LASH.knock);
          },
          'lash',
        ),
      breath(part, amount) {
        if (part >= INHALE) all(fight, amount, (fighter) => poison(fighter, BREATH.stacks), 'venom');
      },
      bite: (_part, amount) => single(fight, amount, (fighter) => poison(fighter, POISON.blow)),
      claw: (_part, amount) => single(fight, amount, (fighter) => poison(fighter, POISON.blow)),
      sweep: (_part, amount) => void all(fight, amount, (fighter) => poison(fighter, POISON.blow), 'sweep'),
    },
    // A critical blow cracks its scales: it takes more from then on.
    struck(_by, _dealt, critical) {
      if (!critical || cracks >= SCALES.most) return;
      cracks++;
      taken.physical = taken.magical = SCALES.taken * (1 + SCALES.per * cracks);
    },
    critResist: SCALES.critResist,
    taken,
    steady: true,
    used: waits.used,
    ready: waits.ready,
    tick(dt) {
      waits.tick(dt);
      eating(dt);
    },
    beaten() {
      for (const fighter of fight.fighters) {
        lift(fighter, POISONED.name);
        lift(fighter, PETRIFIED.name);
      }
    },
    marks: (): Mark[] => [{ text: `Toxic Scales ${Math.round(taken.physical * 100)}%`, tone: 'venom' }],
  });
}
