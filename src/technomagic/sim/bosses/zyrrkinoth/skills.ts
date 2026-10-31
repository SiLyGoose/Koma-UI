import { put } from '../../combat/status';
import { stateArt, type Buff, type Mark } from '../../shown';
import type { Fight, Fighter } from '../../types';
import type { BossPart } from '../boss';
import { addStacks, all, cooldowns, dot, fraction, lift, opened, reachable, single, stacksOf, withDragonGauge, HARD, type DragonMode } from '../dragon/common';
import { NORMAL_SLIMES } from '../dragon/normal';
import { SLIMES } from '../dragon/waves';
import { INHALE } from '../dragon/moves';

/*
 * What Zyrrkinoth's skills do, as King's Raid's Poison Dragon has them (the game's tip: "Zyrrkinoth has very high Crit
 * Resistance and DMG Reduction. But each time he takes Crit DMG, he takes increased DMG from enemies. Zyrrkinoth is not
 * affected by changes in ATK Spd."; its skill's words: "Deals P.DMG to enemies within range 3 times and adds 5 stacks of
 * Poison per hit. Knocks back enemies. Enemies with 30 or more stacks of Poison are Petrified for 5 sec."; the rest are
 * first guesses):
 * - Toxic Scales: its Crit Resistance (SCALES.critResist points off every hero's crit chance on it), and its DMG
 *   Reduction: the playtest's 900 Tough against both kinds (./index.ts); each critical blow it takes has it take
 *   SCALES.per more for the rest of the fight (up to SCALES.most times).
 * - Poison: every blow of its leaves Poison on whoever it lands on (POISON.lasts, begun again with each), every stack of
 *   it eating at them every second; at POISON.petrifyAt they are Petrified for POISON.petrify seconds, the poison gone.
 * - Tail Lash: three lashes of its tail on the heroes, each leaving LASH.stacks Poison and knocking them back.
 * - Venomous Breath: four blows of venom over the field, each leaving BREATH.stacks Poison.
 * - Poison Cloud (the playtest's 441330): seven Slimes called up about it (CLOUD.slimes, within CLOUD.within: each bursts
 *   10 seconds on unless it is beaten first, ../dragon/minions.ts), and two blows of venom on whoever it is going for, each
 *   leaving CLOUD.stacks Poison. In its Normal mode, only once its ultimate is open.
 * - Poisoned Lands, its ultimate (441340 to 441343: open at its mode's share of its health): up on its wings, their blast
 *   knocking every hero back (LANDS.knock) and taking LANDS.blast of what health each has left; unseen in the air a moment,
 *   what the heroes left on it gone; five blows of venom over the field, each taking LANDS.pour of each hero's health left
 *   and leaving LANDS.stacks Poison; and down again, its landing taking LANDS.slam and knocking them back again
 *   (LANDS.down). From LANDS.from seconds in until it is down, nothing touches it (Untargetable, Immortal, IgnoreDamage):
 *   no blow, nor CC.
 * Its claws and bite are on whoever it is going for, its tail across the field. And its CC Gauge (../dragon/common.ts).
 */
export const SCALES = { critResist: 400, per: 0.03, most: 30 };
const POISON = { petrifyAt: 30, lasts: 12, petrify: 5, hurts: 4_000, blow: 2 };
const LASH = { stacks: 5, knock: 0.6 };
const BREATH = { stacks: 3 };
/** Poison Cloud: how many Slimes, how far about it (its size, 5 m: SpawnCreature's own spread), and the Poison each of its two blows leaves. */
const CLOUD = { slimes: 7, within: 5, stacks: 15 };
/**
 * Poisoned Lands: its wings' blast (a share of each hero's health left: $ByMEHp4(150)) and how long it knocks them back;
 * each blow of its venom (250% of its ATK, MOVES.pour, and $ByMEHp4(800)) and the Poison it leaves; its landing
 * ($ByMEHp4(250)) and how long it knocks them back; and when in it it is out of reach, until it is over (seconds).
 */
const LANDS = { blast: 0.15, knock: 1.5, pour: 0.8, stacks: 10, slam: 0.25, down: 3, from: 5, until: 9.8 };

const POISONED: Buff = { name: 'Poison', about: `Eats at it every second, the more for every stack; at ${POISON.petrifyAt}, Petrified.`, icon: '🧪', art: stateArt('CriticalPoison'), harmful: true };
const PETRIFIED: Buff = { name: 'Petrified', about: 'Turned to stone: it can do nothing.', icon: '🗿', art: stateArt('Stone'), harmful: true };

export function zyrrkinothPart(fight: Fight, mode: DragonMode = HARD): BossPart {
  // (Each skill's cooldown, and first wait, the playtest's: its Toxic Mist's for its tail lash.)
  const waits = cooldowns({ claw: [5, 2.5], smashes: [15, 8], breath: [25, 12], cloud: [20, 10], lands: [50, 25] });
  /** Its Slimes at this stage, in its mode. */
  const slimes = mode === HARD ? SLIMES : NORMAL_SLIMES;
  const slime = slimes[Math.min(slimes.length, Math.max(1, fight.stage)) - 1];
  /** How far into its Poisoned Lands it is (seconds; null: it isn't), as long as nothing cut it short. */
  let landing: number | null = null;
  const aloft = (): boolean => landing !== null && landing >= LANDS.from && landing < LANDS.until;
  /** The critical blows it has taken (up to SCALES.most): each has it take more. */
  let cracks = 0;
  const taken = { physical: 1, magical: 1 };
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

  const part = withDragonGauge(fight, {
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
      // Poison Cloud: its Slimes first, then its two blows on one hero.
      cloud(part, amount) {
        if (part === 0) {
          if (slime) fight.summon(slime, CLOUD.slimes, CLOUD.within);
        } else single(fight, amount, (fighter) => poison(fighter, CLOUD.stacks));
      },
      // Poisoned Lands, by its moves (../dragon/moves.ts PLANS.lands): its wings' blast, aloft, its five blows, its landing.
      lands(part, amount) {
        if (part === 0) {
          const heroes = reachable(fight);
          fraction(fight, heroes, LANDS.blast);
          for (const fighter of heroes) if (fighter.hp > 0) fight.knock(fighter, LANDS.knock);
          fight.cue(null, 'wings', heroes);
        } else if (part === 1) {
          // (Unseen in the air: what the heroes left on it gone, its CC gauge's Down aside.)
          fight.boss.statuses = fight.boss.statuses.filter((status) => status.name === 'Down');
        } else if (part === 9) {
          const heroes = reachable(fight);
          fraction(fight, heroes, LANDS.slam);
          for (const fighter of heroes) if (fighter.hp > 0) fight.knock(fighter, LANDS.down);
          fight.cue(null, 'landing', heroes);
        } else fraction(fight, all(fight, amount, (fighter) => poison(fighter, LANDS.stacks), 'venom'), LANDS.pour);
      },
    },
    // In the air in its Poisoned Lands, nothing touches it.
    untouched: aloft,
    // A critical blow cracks its scales: it takes more from then on.
    struck(_by, _dealt, critical) {
      if (!critical || cracks >= SCALES.most) return;
      cracks++;
      taken.physical = taken.magical = 1 + SCALES.per * cracks;
    },
    critResist: SCALES.critResist,
    taken,
    steady: true,
    used(attack) {
      waits.used(attack);
      landing = attack === 'lands' ? 0 : null;
    },
    delay: waits.delay,
    // (Its Poison Cloud in its Normal mode, and its Poisoned Lands, only once its ultimate is open.)
    ready: (attack) => waits.ready(attack) && (attack === 'lands' || (attack === 'cloud' && mode !== HARD) ? opened(fight, mode.ultimate) : true),
    tick(dt) {
      waits.tick(dt);
      eating(dt);
      // (Its Poisoned Lands goes on, unless it was cut short: stunned, or down as its CC gauge broke.)
      if (landing !== null) landing = fight.boss.stunned > 0 && !aloft() ? null : landing + dt;
      if (landing !== null && landing >= LANDS.until) landing = null;
    },
    beaten() {
      for (const fighter of fight.fighters) {
        lift(fighter, POISONED.name);
        lift(fighter, PETRIFIED.name);
      }
    },
    marks: (): Mark[] => [{ text: `Toxic Scales ${Math.round(taken.physical * 100)}%`, tone: 'venom', art: stateArt('440396'), count: `${Math.round(taken.physical * 100)}%` }],
  }, mode.gauge);
  // (Nor does any CC reach it up there: its CC gauge untouched.)
  const held = part.controlled;
  return { ...part, controlled: (seconds, down) => (aloft() ? null : held ? held(seconds, down) : { seconds, down }) };
}
