import { put } from '../../combat/status';
import { KR_HEROES } from '../../heroes/kr';
import { MAX_MANA } from '../../rules';
import { num, pct, stateArt, type Buff, type Mark, type Tone } from '../../shown';
import type { Fight, Fighter, Foe } from '../../types';
import type { BossPart } from '../boss';
import { KR_ATK } from './attacks';
import { beast } from './waves';

/*
 * What Ascalon's skills do, as King's Raid has them (his raid's skills, 3592000 to 3592043, and the 3400098 and 3400099 of his
 * waves' EnvironmentProjectile 63 and 64, in its CBT2 playtest; the {n} of their words, and where the two differ, King's Raid's
 * live (legacy) numbers, faberuser's kingsraid-data: the words are the game's):
 * - His attack: two sweeps before him toward the hero furthest off (130% each, 6 m and 90° about where he faces), then a blow on
 *   that hero (110%) and those within 1.5 m of it, each losing 500 mana.
 * - Multi-Dimension Barrage: four bolts on the hero that has dealt the most (85% each, never dodged). Each takes 1,000 of its
 *   mana; one left with none (King's Raid's MpRatio 1, LessOrEqual) has all its skills sealed for 7 seconds; each gives it a
 *   stack of [Dimension Interference] and of the Barrage's own: 3% less DMG dealt each (up to 20), irremovable.
 * - Dimension Warp: his dimension distorted for 20 seconds, taking 90% less of every kind of DMG (ModDefensePower 900), and four
 *   Synthetic Demon Beasts called up before him (two Experimented, two Ceased: ./minions.ts). All of them beaten within 19.5
 *   seconds: his HP 20% lower (3592022's ReqHpRatio 200, King's Raid's ConsumeHpRatio: of what he has), his warp gone, and he
 *   is neutralized: stunned 7 seconds, taking 50% more DMG (ModDefensePower -500, state Ascalon_Stun). Not: those left are gone
 *   (3592023's Die) and his ATK 5% higher for good (ModPowerR 50, stacking up to 50 times). (The playtest leaves 3592022 to
 *   nothing: its 3592021 only stuns him while the warp lasts. Its words, and King's Raid's live ones, are 3592022's: so here.)
 * - Land of Destruction: his roar stuns every hero a second, four times over, breaking their shields each time; then two quakes
 *   of 140% on all of them (never dodged), each knocking them down 5 seconds.
 * - Dimension Barrage: every 7 seconds, of itself (whatever he is doing, stunned or not), dimension gates on 2 heroes at random
 *   (4 from stage STAGE_UP), 120% each half a second on (never dodged), taking 1,000 mana; none left, its skills sealed 7 seconds;
 *   and [Dimension Interference].
 * - [Dimension Interference]: 1.5% less mana recovery (all of it: King's Raid's MpRegenRatioM), stacking up to 30, irremovable;
 *   from stage STAGE_UP, 1.5% more DMG taken for each too (the playtest's Disabled ModWeakness ops, its 3592041 Eye of Ascalon
 *   enabling them from dungeon 1204: ModSkillEnabled sets an op's Enabled, SkillController's GetModifiedBool).
 * - Eye of Ascalon: in the four waves before him (./waves.ts), every 7 seconds of a wave (the projectile's TickIntervalMs), every
 *   hero takes 7% of its max HP (GetDamageByMaxHpR 70: NoCritical, Unavoidable, IgnoreDefence, IgnoreToughness) half a second on,
 *   500 mana; none left, its skills sealed 4 seconds; and [Dimension Interference]. (From stage STAGE_UP its DMG-taken part, as
 *   King's Raid's live words say; the playtest's projectile 64, which has it, only from dungeon 1205.)
 * - Might of Ascalon: nothing changes his ATK Spd (OverrideStat AttackSpeed), nothing raises the DMG he takes (OverrideStat of
 *   his Weakness to 0: what the heroes leave on him to have him take more does nothing), his ATK 20% higher (ModPowerR 200); and
 *   every 10 seconds 2% higher again (3592043, up to 30 times). His beasts are as his Might has them (./minions.ts).
 * No CC holds him (his IgnoreCc) but his own neutralizing. His blows see past 500 points of a hero's defense (his PiercePower).
 * He has no weakness of his own (his star grade's lookup 424 has no DefensePower). What is drawn for them is the page's.
 */

/** From this stage on (King's Raid's "In battles of Stage 4 or above"): Dimension Barrage on more heroes, and [Dimension Interference] has them take more. */
export const STAGE_UP = 4;
/** His attack: its sweeps' reach (m, about his middle) and width (degrees), the blow's on those about its target, and the mana it takes. */
export const ATTACK = { reach: 6, angle: 90, around: 1.5, drain: 500 };
/**
 * How much further the field stands its frontline from him than King's Raid would (./rules.ts: 7.5 m from a boss's middle, as
 * Galgoria's; King's Raid's heroes up close about 5 m from his, his body 3 m and their reach): his sweeps reach as much further.
 */
const FIELD = 2.5;
/** Multi-Dimension Barrage: the mana each bolt takes, how long a hero left with none is sealed, its DMG cut (each), its most stacks; its cooldown, and its first. */
export const BARRAGE = { drain: 1_000, seal: 7, weaken: 0.03, most: 20, cooldown: 13, first: 10 };
/**
 * Dimension Warp: how long his warp lasts and what he takes meanwhile; how long the beasts have to be beaten in; neutralized,
 * the HP he loses (of what he has), how long he is stunned and what he takes meanwhile; not, how much higher his ATK each time,
 * at most so many times; its cooldown and its first.
 */
export const WARP = { lasts: 20, taken: 0.1, within: 19.5, cost: 0.2, neutral: 7, neutralTaken: 1.5, atk: 0.05, most: 50, cooldown: 33, first: 5 };
/** Where the Warp's beasts come (metres from him, along the field toward the heroes and across it: SpawnCreature FixMyself -4000, ±2000 and ±4000). */
const BEASTS = [
  ['beast-experimented', -4, 2],
  ['beast-experimented', -4, -2],
  ['beast-ceased', -4, 4],
  ['beast-ceased', -4, -4],
] as const;
/** Land of Destruction: how long each roar stuns, how long each quake knocks down; its cooldown and its first. */
export const DESTRUCTION = { stun: 1, down: 5, cooldown: 22, first: 10 };
/** Dimension Barrage: how often, on how many heroes (to stage STAGE_UP, and from it), how hard (of his ATK), the mana it takes, how long a hero with none is sealed, and how long after the gate it lands. */
export const GATE = { every: 7, targets: [2, 4] as const, share: 1.2, drain: 1_000, seal: 7, delay: 0.5 };
/** [Dimension Interference]: how much less mana recovery for each, its most stacks, and (from stage STAGE_UP) how much more DMG taken for each. */
export const INTERFERENCE = { mana: 0.015, most: 30, taken: 0.015 };
/** Eye of Ascalon: how often, the share of each hero's max HP it takes, the mana it takes, how long a hero with none is sealed, and how long after its gate it lands. */
export const EYE = { every: 7, share: 0.07, drain: 500, seal: 4, delay: 0.5 };
/** Might of Ascalon: his ATK higher; and every so often higher again, at most so many times (3592043). */
export const MIGHT = { atk: 0.2 };
export const POWER_UP = { every: 10, atk: 0.02, most: 30 };
/** A hero left with no more mana than this has its skills sealed (King's Raid's MpRatio 1, LessOrEqual: thousandths of its max). */
const EMPTY = MAX_MANA * 0.001;

const INTERFERED: Buff = { name: 'Dimension Interference', about: 'Less mana recovery, the less for every stack (and, from stage 4, more DMG taken). Irremovable.', icon: '🌀', art: stateArt('3592041') };
const WEAKENED: Buff = { name: 'Multi-Dimension Barrage', about: 'Deals less DMG, the less for every stack. Irremovable.', icon: '🔻', art: stateArt('3592010') };
const SEALED: Buff = { name: 'Dimension Seal', about: 'Its skills are sealed: it can only attack.', icon: '🔒', art: stateArt('3592040'), harmful: true };
const RAGE: Tone = 'rage';

export function ascalonPart(fight: Fight): BossPart {
  const boss = fight.boss;
  const stage = Math.min(KR_ATK.length, Math.max(1, fight.stage));
  const up = stage >= STAGE_UP;
  /** He has come onto the field (the waves before him over), and how long since; and whether he was last step. */
  let here = false;
  /** Seconds until his next Dimension Barrage, his next 2% (3592043), and his waves' next Eye; the wave that Eye is of. */
  let gateIn = GATE.every;
  let powerIn = POWER_UP.every;
  let eyeIn = EYE.every;
  let eyeWave = fight.wave;
  /** His ATK's higher stacks: every 10 seconds', and each Dimension Warp's left unbroken. */
  let powerUps = 0;
  let empowered = 0;
  /** His warp: how long it lasts yet, how long the beasts have yet, and the beasts; how long he is neutralized for yet. */
  let warpLeft = 0;
  let within = 0;
  let beasts: Foe[] = [];
  let neutral = 0;
  /** Only his own neutralizing holds him. */
  let own = false;
  /** Whom his attack and his Barrage go for, as each began. */
  let far: Fighter | null = null;
  let top: Fighter | null = null;
  /** Gates opened, landing half a second on: on whom, how hard, the mana it takes, how long it seals. */
  let landing: { left: number; heroes: Fighter[]; eye: boolean }[] = [];
  const cooldowns = new Map<string, number>([
    ['barrage', BARRAGE.first],
    ['warp', WARP.first],
    ['destruction', DESTRUCTION.first],
  ]);
  const taken = { physical: 1, magical: 1 };

  /** The heroes he can reach. */
  const reachable = (): Fighter[] => fight.field.filter((fighter) => fighter.hp > 0 && !fighter.statuses.some((status) => status.away));
  const size = (on: Fighter): number => KR_HEROES[on.id]?.stand.size ?? 0.5;
  /** How far a hero's edge is from his middle. */
  const away = (on: Fighter): number => Math.hypot(on.x - boss.x, on.z - boss.z) - size(on);
  /** The hero furthest from him (King's Raid's FarEnemy), and the one that has dealt the most (HighestTotalDamageEnemy). */
  const furthest = (): Fighter | null => reachable().reduce<Fighter | null>((best, on) => (!best || away(on) > away(best) + 1e-9 ? on : best), null);
  const highest = (): Fighter | null => reachable().reduce<Fighter | null>((best, on) => (!best || on.dealt > best.dealt ? on : best), null);
  /** How many times as hard his blows are, for his Might and what has raised his ATK since (all King's Raid's ModPowerR: added up). */
  const power = (): number => 1 + MIGHT.atk + POWER_UP.atk * powerUps + WARP.atk * empowered;

  /** A hero's skills sealed for so long (King's Raid's DisableSkillSlotToTarget 1|2|3|10). */
  function seal(on: Fighter, seconds: number): void {
    on.reserved = null;
    put(on.statuses, { name: SEALED.name, left: seconds, seals: true, shown: SEALED });
  }
  /** One more stack of [Dimension Interference] on a hero. */
  function interfere(on: Fighter): void {
    const count = Math.min(INTERFERENCE.most, (on.statuses.find((status) => status.name === INTERFERED.name)?.count ?? 0) + 1);
    const less = 1 - INTERFERENCE.mana * count;
    // (Not one a hero's cleansing takes off: King's Raid's irremovable. Its square unedged.)
    put(on.statuses, { name: INTERFERED.name, left: Infinity, count, mana: less, manaGain: less, ...(up && { takes: 1 + INTERFERENCE.taken * count }), shown: INTERFERED });
  }
  /** A blow of a gate's, or a bolt's: its mana taken, its skills sealed if it has none left, and [Dimension Interference]. Whether it landed. */
  function dimension(on: Fighter, amount: number, drain: number, sealFor: number, how: { unavoidable?: boolean; whole?: boolean }): boolean {
    const took = fight.hurt(on, amount, true, undefined, how);
    if (took <= 0 || on.hp <= 0) return false;
    on.mana = Math.max(0, on.mana - drain);
    if (on.mana <= EMPTY) {
      seal(on, sealFor);
      fight.cue(null, 'seal', [on]);
    }
    interfere(on);
    return true;
  }

  /** The beasts of his warp all beaten in time: his HP lower, his warp gone, and he is neutralized. */
  function neutralize(): void {
    within = 0;
    warpLeft = 0;
    beasts = [];
    boss.hp = Math.max(1, boss.hp - boss.hp * WARP.cost);
    neutral = WARP.neutral;
    own = true;
    fight.stun(WARP.neutral);
    own = false;
    fight.cue(null, 'neutralized');
  }
  /** His warp's time up with beasts standing: they are gone, and his ATK higher for good. */
  function empower(): void {
    within = 0;
    for (const one of beasts) fight.banish(one);
    beasts = [];
    empowered = Math.min(WARP.most, empowered + 1);
    fight.cue(null, 'empowered');
  }
  /** What he takes now: far less as his warp lasts, more as he is neutralized. */
  function settle(): void {
    const times = warpLeft > 0 ? WARP.taken : neutral > 0 ? WARP.neutralTaken : 1;
    taken.physical = times;
    taken.magical = times;
  }
  /** Gates on these heroes now, their blows half a second on (Dimension Barrage's, or the Eye's). */
  function open(heroes: Fighter[], eye: boolean): void {
    if (heroes.length === 0) return;
    landing.push({ left: eye ? EYE.delay : GATE.delay, heroes, eye });
    fight.cue(null, eye ? 'eye' : 'gate', heroes);
  }
  /** `count` heroes at random, none twice (King's Raid's RandomEnemy). */
  function anyOf(count: number): Fighter[] {
    const from = reachable();
    const out: Fighter[] = [];
    while (out.length < count && from.length > 0) out.push(from.splice(Math.floor(fight.roll() * from.length), 1)[0] as Fighter);
    return out;
  }

  return {
    lands: {
      // His sweeps before him, toward the hero furthest off; then his blow on that one and those about it, taking mana.
      attack(part, amount) {
        if (!far || far.hp <= 0 || !reachable().includes(far)) far = furthest();
        const target = far;
        if (!target) return;
        const blow = amount * power();
        if (part < 2) {
          const toward = Math.atan2(target.z - boss.z, target.x - boss.x);
          const heroes = reachable().filter((on) => {
            if (away(on) > ATTACK.reach + FIELD) return false;
            const turn = Math.abs(((Math.atan2(on.z - boss.z, on.x - boss.x) - toward + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
            return turn <= (ATTACK.angle / 2) * (Math.PI / 180);
          });
          for (const on of heroes) fight.hurt(on, blow);
          fight.cue(null, 'sweep', heroes);
          return;
        }
        const heroes = [target, ...reachable().filter((on) => on !== target && Math.hypot(on.x - target.x, on.z - target.z) - size(on) <= ATTACK.around)];
        for (const on of heroes) if (fight.hurt(on, blow) > 0 && on.hp > 0) on.mana = Math.max(0, on.mana - ATTACK.drain);
        fight.cue(null, 'smite', heroes);
      },
      // Its bolts on the hero that has dealt the most (another, should that one be down): mana, seals, and its stacks.
      barrage(_part, amount) {
        if (!top || top.hp <= 0 || !reachable().includes(top)) top = highest();
        const on = top;
        if (!on) return;
        if (!dimension(on, amount * power(), BARRAGE.drain, BARRAGE.seal, { unavoidable: true })) return;
        const count = Math.min(BARRAGE.most, (on.statuses.find((status) => status.name === WEAKENED.name)?.count ?? 0) + 1);
        put(on.statuses, { name: WEAKENED.name, left: Infinity, count, deals: 1 - BARRAGE.weaken * count, shown: WEAKENED });
      },
      // His warp, and the beasts called up before him.
      warp() {
        warpLeft = WARP.lasts;
        within = WARP.within;
        neutral = 0;
        const before = fight.foes.length;
        for (const [kind, x, z] of BEASTS) fight.summon(beast(kind, stage), 1, 0, [x, z]);
        beasts = fight.foes.slice(before);
        settle();
        fight.cue(null, 'warp', []);
      },
      // His roar (its stun and every shield broken), then his quakes, each knocking every hero down.
      destruction(part, amount) {
        const heroes = reachable();
        if (part < 4) {
          const broken = heroes.filter((on) => on.shield > 0);
          for (const on of heroes) {
            on.shield = 0;
            fight.knock(on, DESTRUCTION.stun);
          }
          if (part === 0) fight.cue(null, 'roar', heroes);
          if (broken.length > 0) fight.cue(null, 'shatter', broken);
          return;
        }
        for (const on of heroes) if (fight.hurt(on, amount * power(), true, undefined, { unavoidable: true }) > 0 && on.hp > 0) fight.knock(on, DESTRUCTION.down);
        fight.cue(null, 'quake', heroes);
      },
    },
    used(attack) {
      if (attack === 'attack') far = furthest();
      else if (attack === 'barrage') {
        cooldowns.set(attack, BARRAGE.cooldown);
        top = highest();
        if (top) fight.cue(null, 'barrage', [top]);
      } else if (attack === 'warp') cooldowns.set(attack, WARP.cooldown);
      else if (attack === 'destruction') cooldowns.set(attack, DESTRUCTION.cooldown);
    },
    ready: (attack) => attack === 'attack' || (cooldowns.get(attack) ?? 0) <= 0,
    delay(seconds) {
      for (const attack of cooldowns.keys()) cooldowns.set(attack, (cooldowns.get(attack) ?? 0) + seconds);
    },
    // Only his own neutralizing holds him: no hero's stun or knock down does.
    controlled: (seconds) => (own ? { seconds, down: false } : null),
    tick(dt) {
      // The gates opened land.
      for (const gate of landing) gate.left -= dt;
      const due = landing.filter((gate) => gate.left <= 0);
      landing = landing.filter((gate) => gate.left > 0);
      for (const gate of due)
        for (const on of gate.heroes) {
          if (on.hp <= 0 || !reachable().includes(on)) continue;
          if (gate.eye) dimension(on, on.stats.hp * EYE.share, EYE.drain, EYE.seal, { whole: true });
          else dimension(on, GATE.share * (KR_ATK[0] as number) * power(), GATE.drain, GATE.seal, { unavoidable: true });
        }
      // The waves before him: his Eye on every hero, every 7 seconds of each (none while the heroes run on, nor what was coming as a wave ended).
      if (boss.away) {
        if (fight.moving > 0 || fight.wave !== eyeWave) {
          eyeWave = fight.wave;
          eyeIn = EYE.every;
          landing = landing.filter((gate) => !gate.eye);
          return;
        }
        eyeIn -= dt;
        if (eyeIn <= 0) {
          eyeIn += EYE.every;
          open(reachable(), true);
        }
        return;
      }
      // He is here: his Might on him, his timers from now.
      if (!here) {
        here = true;
        landing = landing.filter((gate) => !gate.eye);
      }
      for (const [attack, left] of cooldowns) cooldowns.set(attack, Math.max(0, left - dt));
      // Dimension Barrage, of itself; his ATK higher every 10 seconds.
      gateIn -= dt;
      if (gateIn <= 0) {
        gateIn += GATE.every;
        open(anyOf(GATE.targets[up ? 1 : 0]), false);
      }
      powerIn -= dt;
      if (powerIn <= 0) {
        powerIn += POWER_UP.every;
        powerUps = Math.min(POWER_UP.most, powerUps + 1);
      }
      // His warp: the beasts beaten in time, or not.
      warpLeft = Math.max(0, warpLeft - dt);
      neutral = Math.max(0, neutral - dt);
      if (within > 0) {
        within = Math.max(0, within - dt);
        if (beasts.every((one) => one.hp <= 0 || one.away)) neutralize();
        else if (within <= 0) empower();
      }
      settle();
    },
    taken,
    steady: true,
    unweakened: true,
    marks(): Mark[] {
      if (!here) return [];
      const marks: Mark[] = [{ text: `Might of Ascalon: ATK +${pct(power() - 1)}`, tone: RAGE, art: stateArt('3592042'), count: pct(power() - 1) }];
      if (warpLeft > 0) {
        const standing = beasts.filter((one) => one.hp > 0 && !one.away).length;
        marks.push({ text: `Dimension Warp: ${pct(1 - WARP.taken)} less DMG taken${within > 0 ? `; ${num(standing)} beast${standing === 1 ? '' : 's'} to beat in ${Math.ceil(within)}` : ''}`, tone: RAGE, art: stateArt('3592020'), left: warpLeft });
      }
      if (neutral > 0) marks.push({ text: `Neutralized: ${pct(WARP.neutralTaken - 1)} more DMG taken`, tone: 'stun', art: stateArt('Stun'), left: neutral });
      return marks;
    },
  };
}
