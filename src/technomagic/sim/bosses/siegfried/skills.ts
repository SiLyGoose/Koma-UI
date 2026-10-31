import { put, type Status } from '../../combat/status';
import { KR_HEROES } from '../../heroes/kr';
import { MAX_MANA } from '../../rules';
import { num, pct, stateArt, type Buff, type Mark, type Tone } from '../../shown';
import type { Fight, Fighter } from '../../types';
import type { BossPart } from '../boss';
import { MOVES } from './attacks';

/*
 * What Siegfried's skills do, as King's Raid's playtest has them (his raid's skills, 3591000 to 3591057, and his skill
 * script Raid/Tech/SiegFried; the words are the game's):
 * - His sword (his attack): three blows of 120% on every hero about where he would stand in King's Raid, 2.5 m before
 *   whoever he is going for: within 3 m of it in his first life, 6.5 m in his second and 12 m in his third (his divine
 *   sword's aura grown each time he rises), so that at the last it reaches past the frontline.
 * - Divine Strike: his sword charged and swung down the line before him (10 m long, 4 m wide) twice, 200% each; the
 *   second knocks those it lands on down for 3 seconds and lowers their DEF for good (DEF_CUT at each stage, stacking up
 *   to 20 times).
 * - Divine Storm of Blades: twenty small swords of light on every hero (30% each), each giving whoever it lands on 400
 *   mana; then the divine sword of light on them all (300%): a hero with its mana full has all its skills sealed for 8.4
 *   seconds. Then he loses power and falls for 7 seconds, taking 30% more damage meanwhile.
 * - Divine Power: as a blow would beat him, he rises again instead (twice in the fight): left on 1 HP, he rises for 2.2
 *   seconds, nothing hurting him meanwhile (every blow on him immune), and 1.2 seconds in he is whole: what is on him from
 *   the heroes gone, his health 30% higher for each time, and his ATK 30% higher; his sword's aura wider (above). Nothing
 *   that cuts healing touches it. The second time he grows (GROW). Each time, his pattern alarm says so (./attacks.ts).
 * - Divine Rampage: nothing changes his ATK Spd, nor lowers his DEF; he blocks every kind of blow (BLOCK), and his mana
 *   fills (MANA_RATE a second at each stage). With it full, his blows see past 500 more points of a hero's defense, for 10
 *   seconds at a time, as long as it stays full.
 * - Distorted Dawn: each blow of his that lands gives him mana (MANA_HIT at each stage), but one blocked takes 100 from
 *   him, and every blow of his breaks the shield of whoever it lands on. From stage DAWN.from on, he blocks more again
 *   (DAWN.block), his attack's blows are 50% harder, and so are the heroes' attacks' on him (their skills' as ever); his
 *   ATK is 30% lower for the fight's first 10 seconds.
 * He takes 30% more magic damage (his stats', the playtest's MagicalDefensePower -300). What is drawn for them is the page's
 * (../../../bosses/siegfried/).
 */
/** Where he would stand in King's Raid: so far before whoever he is going for (his attack's reach, 2.5 m). */
const STEP = 2.5;
/** How far about there his sword's blows reach in each of his lives (metres, to a hero's edge). */
export const SWORD = [3, 6.5, 12] as const;
/** Divine Strike: its line (long, wide), how long it knocks down for, and how many times its DEF cut stacks. */
export const STRIKE = { long: 10, wide: 4, down: 3, most: 20, cooldown: 17, first: 5 };
/** His DEF cut on a hero, at each stage (the playtest's 3591050 to 3591057, by its waves). */
export const DEF_CUT = [2_000, 2_000, 2_400, 2_800, 3_200, 3_600, 4_200, 5_000, 5_600];
/** Divine Storm of Blades: the mana each small sword gives, how long a full hero's skills are sealed, how long he falls after it and how much more he takes meanwhile. */
export const STORM = { mana: 400, seal: 8.4, fall: 7, taken: 0.3, cooldown: 21, first: 10 };
/** Divine Power: how many times he rises, how much higher his health and ATK are each time. */
export const RISE = { times: 2, hp: 0.3, atk: 0.3 };
/** Rising the second time: how much bigger he grows, from how far into his rise, over how long (his script's CreatureScale, linear). */
export const GROW = { life: 2, times: 1.2, from: 1, blend: 0.5 };
/** His block (points), of every kind: his Divine Rampage's. */
export const BLOCK = { base: 1_000 };
/** His mana: what fills a second at each stage, and what a blow of his that lands gives him (one blocked takes MANA_BLOCKED). */
export const MANA_RATE = [150, 150, 180, 210, 240, 255, 270, 300, 330];
export const MANA_HIT = [50, 50, 60, 70, 80, 85, 90, 100, 110];
export const MANA_BLOCKED = 100;
/** Full, his blows see past so much more of a hero's defense (points), for so long at a time. */
export const RAMPAGE = { pen: 500, lasts: 10 };
/** Distorted Dawn's from stage 4 (the playtest's 3591044): more block, his attack's blows and the heroes' attacks' on him harder, his ATK lower at first. */
export const DAWN = { from: 4, block: 1_000, attack: 0.5, taken: 0.5, weak: 0.3, weakFor: 10 };
/** The magic damage he takes more of (his stats'). */
export const MAGIC_TAKEN = 0.3;

const BROKEN: Buff = { name: 'Divine Strike', about: 'DEF lower for the rest of the fight, the more for every stack.', icon: '🗡️', art: stateArt('3591010'), harmful: true };
const SEALED: Buff = { name: 'Divine Storm of Blades', about: 'Its skills are sealed: it can only attack.', icon: '🔒', art: stateArt('3591020'), harmful: true };

/** What is on him that is his own, not the heroes' (what Divine Power keeps as he rises). */
const RISEN = 'Divine Power';
const RAMPAGING = 'Divine Rampage';
const DAWNING = 'Distorted Dawn';
const WEAKENED = 'Distorted Dawn (ATK)';
const OWN = new Set([RISEN, RAMPAGING, DAWNING, WEAKENED]);
const RAGE: Tone = 'rage';

export function siegfriedPart(fight: Fight): BossPart {
  const boss = fight.boss;
  const at = Math.min(DEF_CUT.length, Math.max(1, fight.stage)) - 1;
  const dawn = fight.stage >= DAWN.from;
  /** His health whole in his first life. */
  const whole = boss.maxHp;
  /** How many times he has risen; how long he is rising for yet (nothing hurts him), how long until he falls after his storm and how long he is fallen for yet. */
  let lives = 0;
  let rising = 0;
  let fallIn = 0;
  let falling = 0;
  /** Only his own fall knocks him down (he has no CC gauge to break). */
  let fall = false;
  let mana = 0;
  let rampage = 0;
  const cooldowns = new Map<string, number>([
    ['strike', STRIKE.first],
    ['storm', STORM.first],
  ]);
  const taken = { physical: 1, magical: 1 + MAGIC_TAKEN };

  if (dawn) {
    put(boss.statuses, { name: DAWNING, left: Infinity, blocks: { physical: DAWN.block, magical: DAWN.block }, art: stateArt('3591042'), shown: RAGE });
    put(boss.statuses, { name: WEAKENED, left: DAWN.weakFor, deals: 1 - DAWN.weak, art: stateArt('AttackDown'), shown: 'curse' });
  }

  /** The heroes he can reach. */
  const reachable = (): Fighter[] => fight.field.filter((fighter) => fighter.hp > 0 && !fighter.statuses.some((status) => status.away));
  const size = (on: Fighter): number => KR_HEROES[on.id]?.stand.size ?? 0.5;
  /** Where he would stand in King's Raid as he goes for `target` (STEP before it, toward him), and the way he faces from there. */
  function stance(target: Fighter): { x: number; z: number; dx: number; dz: number } {
    const away = Math.hypot(boss.x - target.x, boss.z - target.z) || 1;
    const dx = (target.x - boss.x) / away;
    const dz = (target.z - boss.z) / away;
    return { x: target.x - dx * STEP, z: target.z - dz * STEP, dx, dz };
  }
  /** The heroes within `reach` of where he would stand going for whoever he is going for (that one first). */
  function about(reach: number): Fighter[] {
    const target = fight.target();
    if (!target || target.hp <= 0) return [];
    const { x, z } = stance(target);
    return [target, ...reachable().filter((on) => on !== target && Math.hypot(on.x - x, on.z - z) - size(on) <= reach)];
  }
  /** The heroes down the line before him (Divine Strike's), toward whoever he is going for (that one first). */
  function line(): Fighter[] {
    const target = fight.target();
    if (!target || target.hp <= 0) return [];
    const { x, z, dx, dz } = stance(target);
    const inLine = (on: Fighter): boolean => {
      const along = (on.x - x) * dx + (on.z - z) * dz;
      const across = Math.abs((on.x - x) * dz - (on.z - z) * dx);
      return along >= -size(on) && along <= STRIKE.long + size(on) && across <= STRIKE.wide / 2 + size(on);
    };
    return [target, ...reachable().filter((on) => on !== target && inLine(on))];
  }
  /** His sword's blow on those it reaches in the life he is in (harder from stage 4 on). */
  function sword(amount: number): void {
    const heroes = about(SWORD[Math.min(lives, SWORD.length - 1)] as number);
    for (const fighter of heroes) fight.hurt(fighter, amount * (dawn ? 1 + DAWN.attack : 1));
  }
  /** His DEF cut on a hero: one more stack. */
  function cut(fighter: Fighter): void {
    const count = Math.min(STRIKE.most, (fighter.statuses.find((status) => status.name === BROKEN.name)?.count ?? 0) + 1);
    const cutBy = -(DEF_CUT[at] as number) * count;
    put(fighter.statuses, { name: BROKEN.name, left: Infinity, count, bolsters: { physical: cutBy, magical: cutBy }, shown: BROKEN });
  }
  /** He loses power and falls (after his storm): down for STORM.fall seconds, taking more. */
  function fallDown(): void {
    falling = STORM.fall;
    fall = true;
    fight.stun(STORM.fall, { down: true });
    fall = false;
    fight.cue(null, 'fall');
  }
  /** What he takes of each kind now: more as he lies fallen. (Nothing as he rises: untouched.) */
  function settle(): void {
    const more = falling > 0 ? STORM.taken : 0;
    taken.physical = 1 + more;
    taken.magical = 1 + MAGIC_TAKEN + more;
  }

  return {
    lands: {
      slash: (_part, amount) => sword(amount),
      slash2: (_part, amount) => sword(amount),
      slash3: (_part, amount) => sword(amount),
      strike(part, amount) {
        const heroes = line();
        for (const fighter of heroes) {
          fight.hurt(fighter, amount);
          if (part === 0 || fighter.hp <= 0) continue;
          fight.knock(fighter, STRIKE.down);
          cut(fighter);
        }
        if (part > 0) fight.cue(null, 'strike', heroes);
      },
      storm(part, amount) {
        const heroes = reachable();
        // The small swords: a blow and mana for every hero.
        if (part <= 20) {
          for (const fighter of heroes) {
            fight.hurt(fighter, amount);
            if (fighter.hp > 0) fighter.mana = Math.min(MAX_MANA, fighter.mana + STORM.mana);
          }
          return;
        }
        // The divine sword of light: every hero with its mana full has its skills sealed. Then, once it is over, he falls.
        const sealed: Fighter[] = [];
        for (const fighter of heroes) {
          const full = fighter.mana >= MAX_MANA * 0.999;
          fight.hurt(fighter, amount);
          if (!full || fighter.hp <= 0) continue;
          fighter.reserved = null;
          put(fighter.statuses, { name: SEALED.name, left: STORM.seal, seals: true, shown: SEALED });
          sealed.push(fighter);
        }
        if (sealed.length > 0) fight.cue(null, 'seal', sealed);
        fallIn = (MOVES.judgement?.length ?? 0) - (MOVES.judgement?.hit ?? 0);
      },
      // Up again, whole: what the heroes left on him gone, his health and ATK higher, his sword's aura wider.
      rise() {
        boss.statuses = boss.statuses.filter((status) => OWN.has(status.name));
        boss.maxHp = whole * (1 + RISE.hp * lives);
        boss.hp = boss.maxHp;
        put(boss.statuses, { name: RISEN, left: Infinity, count: lives, deals: 1 + RISE.atk * lives, art: stateArt('3591030'), shown: RAGE });
        fight.cue(null, `rise${lives}`);
      },
    },
    // As a blow would beat him: he rises again (twice), what he was doing cut short, his fall over.
    spared() {
      if (rising > 0) return true;
      if (lives >= RISE.times) return false;
      lives++;
      rising = MOVES.rise?.length ?? 0;
      fallIn = 0;
      falling = 0;
      settle();
      fight.force('rise');
      return true;
    },
    // As he rises, King's Raid's SiegImmune1/2 on him: no kind of blow hurts him (Physical Immune, Magic Immune).
    untouched: () => rising > 0,
    // Rising the second time he grows (his script's CreatureScale: 1.2 times, over GROW.blend seconds from GROW.from in), and stays so.
    size() {
      if (lives < GROW.life) return 1;
      const into = rising > 0 ? (MOVES.rise?.length ?? 0) - rising : Infinity;
      return 1 + (GROW.times - 1) * Math.min(1, Math.max(0, (into - GROW.from) / GROW.blend));
    },
    // Each blow of his that lands: mana (less for one blocked), and the shield it lands on broken.
    landed(on, blocked) {
      mana = Math.max(0, Math.min(MAX_MANA, mana + (blocked ? -MANA_BLOCKED : (MANA_HIT[at] as number))));
      if (on.shield <= 0) return;
      on.shield = 0;
      fight.cue(null, 'shatter', [on]);
    },
    // Only his own fall holds him: no hero's stun or knock down does.
    controlled: (seconds) => (fall ? { seconds, down: true } : null),
    used(attack) {
      if (attack === 'strike') cooldowns.set(attack, STRIKE.cooldown);
      else if (attack === 'storm') cooldowns.set(attack, STORM.cooldown);
    },
    // Boss auto: his sword as it is in the life he is in; a skill once its cooldown is over; Divine Power only of itself.
    ready(attack) {
      if (attack === 'slash') return lives === 0;
      if (attack === 'slash2') return lives === 1;
      if (attack === 'slash3') return lives === 2;
      if (attack === 'rise') return false;
      return (cooldowns.get(attack) ?? 0) <= 0;
    },
    delay(seconds) {
      for (const attack of cooldowns.keys()) cooldowns.set(attack, (cooldowns.get(attack) ?? 0) + seconds);
    },
    tick(dt) {
      for (const [attack, left] of cooldowns) cooldowns.set(attack, Math.max(0, left - dt));
      rising = Math.max(0, rising - dt);
      falling = Math.max(0, falling - dt);
      if (fallIn > 0) {
        fallIn -= dt;
        if (fallIn <= 0) fallDown();
      }
      settle();
      // His mana fills; full, his blows see past more of a hero's defense, ten seconds at a time.
      mana = Math.min(MAX_MANA, mana + (MANA_RATE[at] as number) * dt);
      rampage = Math.max(0, rampage - dt);
      if (mana >= MAX_MANA && rampage <= 0) {
        rampage = RAMPAGE.lasts;
        put(boss.statuses, { name: RAMPAGING, left: RAMPAGE.lasts, pen: RAMPAGE.pen, art: stateArt('3591040'), shown: RAGE } satisfies Status<Tone>);
      }
    },
    taken,
    attackTaken: dawn ? 1 + DAWN.taken : 1,
    fixedDefense: true,
    steady: true,
    // (The bar under his health: his mana, as King's Raid's shows it for him.)
    gauge: () => mana / MAX_MANA,
    drain: (amount) => {
      mana = Math.max(0, mana - amount);
    },
    marks(): Mark[] {
      return [
        { text: `Divine Power: rises ${RISE.times - lives} more time${RISE.times - lives === 1 ? '' : 's'}`, tone: RAGE, art: stateArt('3591030'), count: String(RISE.times - lives) },
        { text: `Mana ${num(Math.floor(mana))}/${num(MAX_MANA)}`, tone: RAGE, art: stateArt('3591040'), count: pct(mana / MAX_MANA) },
      ];
    },
  };
}
