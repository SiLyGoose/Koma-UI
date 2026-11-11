import { NONE, type BossStats } from '../../combat/damage';
import { put } from '../../combat/status';
import { stateArt, type Buff } from '../../shown';
import type { Fight, Fighter } from '../../types';
import type { BossDef, BossPart } from '../boss';
import { addStacks, lift, reachable, stacksOf } from '../dragon/common';
import { kitOf, kitPart, timer, type Skill } from './kit';
import { infiniteStages } from './levels';

/*
 * The Solenis group's boss dungeons (King's Raid's chapter 70001): its two mid-bosses, Luciteron, Incinerating Eye of Fire
 * (60007, Raid 1006, 120 seconds) and Altigma, Deflecting Stonewall (60008, Raid 1007, 150 seconds), and Solenis, Holy Guardian
 * of Goddess (60009, Raid 1008, 300 seconds). Divine Golems, all three dealing P.DMG, with King's Raid's own numbers at Infinite
 * level 1 (KR-extracted/briefs/divine-punishment.md §3.2; grown by the level: ./levels.ts), their star-grade lookup 442's 400
 * penetration, their blows always hitting, and no CC holding them. Their kits are stand-ins (./kit.ts), of their main skills by
 * King's Raid's names (§3.3); what each leaves out is said by it.
 */

const LUCITERON_ATK = 54_666_657;
const ALTIGMA_ATK = 68;
const SOLENIS_ATK = 55_678_000;
/** The three: physical, 400 penetration, every blow a hit (2000 ACC). */
const GOLEM: Omit<BossStats, 'hp' | 'physical' | 'magical'> = { deals: 'physical', block: NONE, dodge: NONE, crit: 0, resist: 0, pen: 400, acc: 2000 };

/** Takes a hero's shield and invincibility (Flame Circle). */
const bare = (on: Fighter): void => {
  on.shield = 0;
  on.shieldLeft = 0;
  on.immune = 0;
};

const STIGMA: Buff = { name: 'Stigma', about: '80% less healing received.', icon: '✴️', art: stateArt('RecoverDown'), harmful: true };
const SEARING: Buff = { name: 'Searing', about: 'P.DMG every second.', icon: '🔥', art: stateArt('Burn'), harmful: true };
const CONFLAGRATION: Buff = { name: 'Conflagration', about: '1% less healing received a stack; at 10 stacks, DEF much lower.', icon: '🔥', art: stateArt('RecoverDown'), harmful: true };
const STONE: Buff = { name: 'Guardian Stone', about: '15% less ATK Spd a stone; at 5, every hero dies.', icon: '🪨', art: stateArt('SpeedDown'), harmful: true };
const WEIGHT: Buff = { name: 'Bombardment of Retribution', about: '5% less ATK and 3% less ATK Spd a stack.', icon: '🎯', art: stateArt('AttackDown'), harmful: true };

/**
 * Eternal Conflagration (Luciteron's, every second; Operate Luciteron's on Solenis): `share` of its ATK on every hero, nothing
 * blocking it, and a stack of [Conflagration] (1% less healing received; at 10 stacks, DEF `def` lower). Its 19 stacks'
 * irremovability and its enhanced Singular Retribution are not here.
 */
function conflagration(fight: Fight, atk: number, share: number, def: number): () => void {
  return () => {
    for (const on of reachable(fight)) {
      fight.hurt(on, atk * share, false);
      if (on.hp > 0) addStacks(on, CONFLAGRATION.name, 1, 99, Infinity, (n) => ({ heals: Math.max(0, 1 - 0.01 * n), ...(n >= 10 && { defends: 1 - def }), shown: CONFLAGRATION }));
    }
  };
}

/*
 * Luciteron: no blow takes more than 1 of it (its Eye of Incineration's SetDamage): it is lasted out, the raid won as its 120
 * seconds run out with a hero standing (the inference of its tactic text: its wave has no WinDecider). 600 CC resist besides
 * its CC immunity; nothing slows it. Its plain attack (300%); Flame Circle (four blows of 60% on every hero, their shields and
 * invincibility gone, 20% harder each use); Stigmatize (80% less healing received for 40 seconds: its lifting by three skills
 * used is not here); Searing Shackle (300% on two heroes at random, a first guess of how many, and Searing: 50% every second for
 * 10 seconds, a first guess; its 1000% on the still Searing is not here); every second, Eternal Conflagration (80% on every
 * hero and a stack of [Conflagration], 50% less DEF at 10); and Fiery Gravitation, its core, 5% more ATK every second (stood
 * for by as much more DMG: a hero's dispel takes it away, as King's Raid's Pull takes its core).
 */
function luciteronSkills(): Skill[] {
  return [
    { name: 'attack', label: 'Attack', length: 3.6, blows: [1.2], share: 3, on: 'target' },
    { name: 'circle', label: 'Flame Circle', cooldown: 20, first: 15, length: 4.5, blows: [1, 2, 3, 4], share: 0.6, on: 'all', grows: 0.2, then: bare },
    { name: 'stigmatize', label: 'Stigmatize', cooldown: 32, first: 15, length: 5, blows: [1], share: 0, on: 'all', then: (on) => put(on.statuses, { name: STIGMA.name, left: 40, heals: 0.2, shown: STIGMA }) },
    {
      name: 'shackle',
      label: 'Searing Shackle',
      cooldown: 18,
      first: 15,
      length: 3.4,
      blows: [1],
      share: 3,
      on: 2,
      then: (on) => put(on.statuses, { name: SEARING.name, left: 10, shown: SEARING }),
    },
  ];
}

function luciteronPart(fight: Fight): BossPart {
  const { foe } = fight;
  const burning = conflagration(fight, LUCITERON_ATK, 0.8, 0.5);
  const each = timer(1, () => {
    burning();
    // (Searing: 50% of its ATK on each hero still bearing it.)
    for (const on of reachable(fight)) if (on.statuses.some((status) => status.name === SEARING.name)) fight.hurt(on, LUCITERON_ATK * 0.5, false);
    // (Fiery Gravitation: 5% more every second while it holds its core.)
    const held = foe.statuses.find((status) => status.name === 'Fiery Gravitation');
    put(foe.statuses, { name: 'Fiery Gravitation', art: stateArt('AttackUp'), left: Infinity, count: (held?.count ?? 0) + 1, deals: 1 + 0.05 * ((held?.count ?? 0) + 1), shown: 'rage' });
  });
  return kitPart(fight, luciteronSkills(), { cap: 1, steady: true, controlled: () => null, tick: each });
}

export const LUCITERON: BossDef = {
  id: 'luciteron',
  name: 'Luciteron',
  stats: { ...GOLEM, hp: 234_492_153_462, physical: 34, magical: 34, resist: 600 },
  stages: infiniteStages(),
  ...kitOf(luciteronSkills(), LUCITERON_ATK),
  rest: 0.3,
  time: 120,
  outlast: true,
  join: luciteronPart,
};

/*
 * Altigma: its blows next to nothing (68 ATK); it kills with its Guardian Stones. Its plain attack; Curtain of Isolation (its
 * health given back 1% of its max a second for 10 seconds, a first guess of how much, 50% the more for its Heal Rate);
 * Absorb Earthen Power (8.5 seconds of mana recovered: it has no mana here, so it only stands); Earthen Core (6.1 seconds of
 * its core bare: every hero takes 1% of its max HP and loses 500 mana every 0.5 seconds, and it has 30% less DEF and takes 30%
 * more meanwhile); then its Guardian Spell, a Guardian Stone: every hero 15% slower for good, and at the fifth, every hero dies.
 * Its Absolute Defense (block and Tough by its mana) and [Rift] are not here.
 */
function altigmaSkills(): Skill[] {
  return [
    { name: 'attack', label: 'Attack', length: 3.6, blows: [1.2], share: 3, on: 'target' },
    { name: 'curtain', label: 'Curtain of Isolation', cooldown: 24, first: 15, length: 4, blows: [], share: 0, on: 'all' },
    { name: 'absorb', label: 'Absorb Earthen Power', cooldown: 26, first: 15, length: 8.5, blows: [], share: 0, on: 'all' },
    { name: 'core', label: 'Earthen Core', cooldown: 15, first: 15, length: 6.1, blows: [], share: 0, on: 'all' },
  ];
}

function altigmaPart(fight: Fight): BossPart {
  const { foe } = fight;
  let curtain = 0;
  let core = 0;
  let coreTick = 0;
  let stones = 0;
  const part = kitPart(fight, altigmaSkills(), {
    steady: true,
    controlled: () => null,
    used(attack) {
      if (attack === 'curtain') curtain = 10;
      if (attack === 'core') {
        core = 6.1;
        coreTick = 0;
        put(foe.statuses, { name: 'Earthen Core', art: stateArt('DefenseDown'), left: 6.1, defends: 0.7, takes: 1.3, shown: 'curse' });
      }
    },
    tick(dt) {
      if (curtain > 0) {
        curtain = Math.max(0, curtain - dt);
        fight.mend(foe.maxHp * 0.01 * dt, 1.5);
      }
      if (core <= 0) return;
      core -= dt;
      coreTick += dt;
      while (coreTick >= 0.5) {
        coreTick -= 0.5;
        for (const on of reachable(fight)) {
          fight.hurt(on, on.stats.hp * 0.01, false);
          on.mana = Math.max(0, on.mana - 500);
        }
      }
      if (core > 0) return;
      // Its Guardian Spell: a stone more.
      stones++;
      put(fight.party, { name: STONE.name, left: Infinity, count: stones, pace: Math.max(0.1, 1 - 0.15 * stones), shown: STONE });
      if (stones >= 5) for (const on of reachable(fight)) fight.hurt(on, on.stats.hp * 1000, false);
    },
    marks: () => (stones > 0 ? [{ text: `Guardian Stone ×${stones}`, tone: 'curse', count: String(stones) }] : []),
  });
  return part;
}

export const ALTIGMA: BossDef = {
  id: 'altigma',
  name: 'Altigma',
  stats: { ...GOLEM, hp: 117_246_076_731, physical: 6_790, magical: 6_790 },
  stages: infiniteStages(),
  ...kitOf(altigmaSkills(), ALTIGMA_ATK),
  rest: 0.3,
  time: 150,
  join: altigmaPart,
};

/*
 * Solenis: 50% more crit resistance, its DEF and ATK Spd its own whatever is put on it (Guardian of Goddess), no CC holding it
 * (The Last Mission). Its plain attack (50% and 1% of max HP); Singular Retribution (180% and then 360% on every hero, each with
 * 1% of max HP, a first guess for its 0.8% and 1.2%, and a stun of 2 seconds, a first guess; its cooldowns delayed by its
 * Engineered Power is not here); Bombardment of Retribution (five missiles of 10% and 5% of max HP on every hero, each taking
 * 500 mana and leaving 5% less ATK and 3% less ATK Spd, stacking); Endless Retribution (150%, 210% and 240% on every hero, each
 * with 5% of max HP: its [Hellflame] and [Perseverance], and the stun clearing both brings, are not here); its [Fanaticism] from
 * 49.9% of its health (40% more DMG, irremovable); and every 60 hits it takes, Lightning of Retribution (200% on every hero; 600%
 * with both mid-bosses cleared). Its Engineered Power (DMG reduction by its mana) is not here.
 * Each mid-boss cleared this opening operates (King's Raid's PunishmentRaidTriggerTable 5 and 6): Luciteron, every second 30% on
 * every hero and a stack of [Conflagration] (80% less DEF at 10); Altigma, every 25 seconds its Curtain of Isolation, 1% of its
 * max HP a second for 10 seconds, 50% the more.
 */
function solenisSkills(): Skill[] {
  return [
    { name: 'attack', label: 'Attack', length: 4.7, blows: [1.5], share: 0.5, on: 'target', hp: 0.01 },
    { name: 'singular', label: 'Singular Retribution', cooldown: 29, first: 17, length: 11.6, blows: [2, 7], share: [1.8, 3.6], on: 'all', hp: 0.01, stun: 2, stunEvery: true },
    {
      name: 'bombardment',
      label: 'Bombardment of Retribution',
      cooldown: 33,
      first: 23,
      length: 7.6,
      blows: [2, 3, 4, 5, 6],
      share: 0.1,
      on: 'all',
      hp: 0.05,
      then: (on) => {
        on.mana = Math.max(0, on.mana - 500);
        addStacks(on, WEIGHT.name, 1, 20, Infinity, (n) => ({ atk: -0.05 * n, pace: Math.max(0.1, 1 - 0.03 * n), shown: WEIGHT }));
      },
    },
    { name: 'endless', label: 'Endless Retribution', cooldown: 45, first: 35, length: 9.5, blows: [2.3, 5.5, 9.5], share: [1.5, 2.1, 2.4], on: 'all', hp: 0.05 },
  ];
}

/** Solenis' part, with the mid-bosses `cleared` this opening operating. */
function solenisPart(fight: Fight, cleared: readonly string[]): BossPart {
  const { foe } = fight;
  const luciteron = cleared.includes('luciteron');
  const altigma = cleared.includes('altigma');
  let hits = 0;
  let curtain = 0;
  const operateLuciteron = luciteron ? timer(1, conflagration(fight, SOLENIS_ATK, 0.3, 0.8)) : null;
  const operateAltigma = altigma ? timer(25, () => void (curtain = 10)) : null;
  return kitPart(fight, solenisSkills(), {
    fixedDefense: true,
    steady: true,
    critResist: 500,
    controlled: () => null,
    struck() {
      if (++hits < 60) return;
      hits = 0;
      for (const on of reachable(fight)) fight.hurt(on, SOLENIS_ATK * (luciteron && altigma ? 6 : 2), false);
    },
    tick(dt) {
      operateLuciteron?.(dt);
      operateAltigma?.(dt);
      if (curtain > 0) {
        curtain = Math.max(0, curtain - dt);
        fight.mend(foe.maxHp * 0.01 * dt, 1.5);
      }
      if (foe.hp <= foe.maxHp * 0.499 && !foe.statuses.some((status) => status.name === 'Fanaticism')) put(foe.statuses, { name: 'Fanaticism', art: stateArt('AttackUp'), left: Infinity, deals: 1.4, shown: 'rage' });
    },
    beaten() {
      for (const on of fight.fighters) {
        lift(on, CONFLAGRATION.name);
        if (stacksOf(on, WEIGHT.name) > 0) lift(on, WEIGHT.name);
      }
    },
  });
}

/** Solenis, with the mid-bosses `cleared` this opening (Luciteron's and Altigma's ids). */
export function solenisFight(cleared: readonly string[] = []): BossDef {
  return {
    id: 'solenis',
    name: 'Solenis',
    stats: { ...GOLEM, hp: 2_386_339_400_000, physical: 78_085, magical: 78_085 },
    stages: infiniteStages(),
    ...kitOf(solenisSkills(), SOLENIS_ATK),
    rest: 0.3,
    time: 300,
    join: (fight) => solenisPart(fight, cleared),
  };
}

/** As it is with neither mid-boss cleared. */
export const SOLENIS: BossDef = solenisFight();
/** The mid-bosses, in King's Raid's order. */
export const SOLENIS_SIDES: readonly string[] = ['luciteron', 'altigma'];
