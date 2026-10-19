import type { DamageType } from '../../combat/damage';
import { stateArt, type Buff } from '../../shown';

/*
 * The minions of the Hard Dragon Raid's waves past its first (./waves.ts), as King's Raid's playtest has them (its
 * SkillTable: KR-extracted/stats/minions/): each fights by itself, going for the hero nearest it, with its plain attack
 * and, as often as it may, its skill. How hard each blow is, a share of its ATK; how far about its target it lands
 * (metres: 0 its target alone, Infinity every hero); and what it leaves on whoever it lands on.
 */

export type MinionKind = 'hatchling-fire' | 'hatchling-ice' | 'hatchling-poison' | 'hatchling-black' | 'ice-pillar' | 'wyrm' | 'wyrmling';

/** What a blow leaves on a hero: frozen (can do nothing, as knocked down), its attacks slowed, its damage lowered (stacking, for the rest of the fight). */
export type Leaves = { freeze: number } | { slow: Buff & { pace: number; lasts: number } } | { weaken: Buff & { each: number; most: number } };

/** A move of a minion's: how long it takes, when its blows land (seconds in), each as hard as `share` of its ATK, how far about its target, the kind of damage it deals, and what it leaves. */
export interface MinionMove {
  length: number;
  lands: readonly number[];
  share: number;
  reach: number;
  deals?: DamageType;
  /** Its target: the hero nearest it, or (`random`) any. */
  random?: boolean;
  leaves?: Leaves;
}

export interface MinionDef {
  name: string;
  /** The kind of damage its blows deal (a move may say otherwise), and how big it is (metres across). */
  deals: DamageType;
  size: number;
  /** Nothing stuns it (nor knocks it down, nor slows it). */
  steady?: boolean;
  /** Its plain attack, and how long it rests after each move. */
  attack: MinionMove;
  rest: number;
  /** Its skill: used as soon as it is ready, `cooldown` seconds after it last was (the first, `first` seconds in). */
  skill?: MinionMove & { cooldown: number; first: number };
  /** Left standing this long (seconds), it lays the heroes low: every one of them takes `share` of its health, nothing blocks it. */
  fuse?: { after: number; share: number };
}

/** A hatchling: its bite, and every 8 seconds its four blows in front of it (the ice one's slowing whoever they land on). */
const hatchling = (name: string, leaves?: Leaves): MinionDef => ({
  name,
  deals: 'magical',
  size: 0.5,
  attack: { length: 1.8, lands: [0.7], share: 1, reach: 0 },
  rest: 0.2,
  skill: { cooldown: 8, first: 8, length: 3.4, lands: [2, 2.3, 2.6, 2.9], share: 0.8, reach: 1.5, ...(leaves && { leaves }) },
});

/** The ice hatchling's frost: its attacks 2% slower, for 15 seconds (the playtest's DragonSnow). */
const SNOW = { slow: { name: 'Dragon Snow', about: 'Attack speed down.', icon: '❄️', art: stateArt('1940'), harmful: true, pace: 0.98, lasts: 15 } } as const;
/** The poison wyrm's venom: 1% less damage for every blow of it, up to 100, for the rest of the fight (the playtest's DragonAttackDown). */
const VENOM = { weaken: { name: 'Wyrm Venom', about: 'Deals less damage for the rest of the fight.', icon: '🐍', art: stateArt('AttackDown'), harmful: true, each: 0.01, most: 100 } } as const;

export const MINIONS: Readonly<Record<MinionKind, MinionDef>> = {
  'hatchling-fire': hatchling('Fire Hatchling'),
  'hatchling-ice': hatchling('Ice Hatchling', SNOW),
  'hatchling-poison': hatchling('Poison Hatchling'),
  'hatchling-black': hatchling('Black Hatchling'),
  // Every 4 seconds it freezes a hero, any (1.5 seconds); standing 20 seconds, it shatters, and every hero with it.
  'ice-pillar': {
    name: 'Ice Pillar',
    deals: 'magical',
    size: 1,
    steady: true,
    attack: { length: 4, lands: [4], share: 0.1, reach: 0, random: true, leaves: { freeze: 1.5 } },
    rest: 0,
    fuse: { after: 20, share: 10 },
  },
  // From afar: its spit, then its venom on every hero, by turns.
  wyrm: {
    name: 'Poison Wyrm',
    deals: 'physical',
    size: 0.6,
    steady: true,
    attack: { length: 1.3, lands: [0.8], share: 0.5, reach: 0 },
    rest: 0,
    skill: { cooldown: 3.5, first: 1.3, length: 3.5, lands: [0.9, 1.3, 1.8, 2.2], share: 0.1, reach: Infinity, leaves: VENOM },
  },
  // Up close: its bite, and every 12 seconds its five blows in front of it.
  wyrmling: {
    name: 'Poison Wyrm',
    deals: 'physical',
    size: 0.6,
    steady: true,
    attack: { length: 1.3, lands: [0.8], share: 0.5, reach: 0 },
    rest: 1,
    skill: { cooldown: 12, first: 8, length: 3.5, lands: [0.9, 1.3, 1.8, 2.2, 2.6], share: 0.5, reach: 2, deals: 'magical' },
  },
};
