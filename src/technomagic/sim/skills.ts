import type { Buff } from './shown';

/*
 * TechnoMagic gear's additional skills, as the fight has them: every piece of TechnoMagic gear comes with one,
 * rolled at random from this list when it drops (the same list whatever its set), and a hero has the skills of
 * the pieces it wears (the bot says which as the fight begins). Two pieces with the same skill have it twice
 * over: so much more, though what has a wait between times still waits as long. ./fight.ts applies them.
 *
 * They are King's Raid's additional gear skills (Trilobite's TM gear tier list, by its tiers), the ones this
 * raid has a use for: none that count enemies, kills or battles past the first, raise skill levels or a soul
 * weapon's uses, or touch kinds of damage the fight hasn't got. "When there is 1 enemy" is always so here:
 * there is only the boss. A "skill" is a hero's first, second or third, and "mana at 100%" is a full bar.
 */

export type SkillId =
  // S tier
  | 'vigor'
  | 'persistence'
  | 'war-cry'
  | 'whetstone'
  | 'champion'
  | 'berserk'
  | 'fortress'
  | 'aegis'
  | 'mirage'
  | 'fundamentals'
  | 'vitality'
  // A tier
  | 'overflow'
  | 'momentum'
  | 'overdrive'
  | 'regeneration'
  | 'steadfast'
  | 'swiftness'
  | 'focus-2'
  | 'focus-3'
  // B tier
  | 'warm-up'
  | 'might'
  | 'focus-1'
  | 'physical-ward'
  | 'magical-ward'
  | 'bastion'
  | 'ruthless'
  | 'piercing'
  | 'precision'
  | 'guard'
  | 'parry'
  // C tier
  | 'lone-foe'
  | 'lone-guard'
  | 'armor'
  | 'mana-spring'
  // F tier
  | 'surge'
  | 'desperation'
  | 'mending'
  | 'iron-wall'
  | 'tenacity';

/** Each skill's numbers (shares: 0.25 is 25%; points: 1000 is 100%; seconds). */
export const SKILL = {
  vigor: { dmg: 0.25, above: 0.75 },
  persistence: { dmg: 0.03, every: 15, most: 12 },
  'war-cry': { atk: 0.05 },
  whetstone: { critDamage: 0.1 },
  champion: { dmg: 0.025, lasts: 200 },
  berserk: { defense: -0.25, atk: 0.5 },
  fortress: { atk: -0.2, defense: 0.5 },
  aegis: { shield: 0.25 },
  mirage: { dodge: 200, heal: 0.03, wait: 3 },
  fundamentals: { dmg: 0.25 },
  vitality: { hp: 0.25 },
  overflow: { cooldown: 0.03, wait: 10 },
  momentum: { atk: 0.02, most: 20 },
  overdrive: { speed: 1000, atk: 0.4 },
  regeneration: { heal: 0.01, every: 1 },
  steadfast: { taken: 0.03, most: 8 },
  swiftness: { speed: 250 },
  'focus-1': { skill: 0, cooldown: 0.1, every: 10 },
  'focus-2': { skill: 1, cooldown: 0.1, every: 10 },
  'focus-3': { skill: 2, cooldown: 0.1, every: 10 },
  'warm-up': { atk: 0.05 },
  might: { atk: 0.25 },
  'physical-ward': { type: 'physical', taken: 0.2, most: 0.3, over: 10 },
  'magical-ward': { type: 'magical', taken: 0.2, most: 0.3, over: 10 },
  bastion: { defense: 0.09 },
  ruthless: { critDamage: 0.5 },
  piercing: { pen: 250 },
  precision: { crit: 250 },
  guard: { block: 250 },
  parry: { mana: 200, wait: 1 },
  'lone-foe': { atk: 0.35 },
  'lone-guard': { defense: 0.35 },
  armor: { defense: 0.25 },
  'mana-spring': { mana: 500, every: 5 },
  surge: { dmg: 0.15, lasts: 10, wait: 15 },
  desperation: { atk: 0.5, below: 0.3, lasts: 10, wait: 10 },
  mending: { heal: 0.25, lasts: 5, wait: 10 },
  'iron-wall': { block: 150, more: 200, lasts: 10 },
  tenacity: { control: 0.15 },
} as const satisfies Record<SkillId, Record<string, number | string>>;

export interface SkillDef {
  id: SkillId;
  name: string;
  /** The tier list's own word for it: S (sought after) down to F. */
  tier: 'S' | 'A' | 'B' | 'C' | 'F';
  about: string;
}

/** Every additional skill, in the tier list's order. */
export const SKILLS: readonly SkillDef[] = [
  { id: 'vigor', name: 'Vigor', tier: 'S', about: 'Increases DMG dealt by 25% while HP is above 75%.' },
  { id: 'persistence', name: 'Persistence', tier: 'S', about: 'Increases DMG dealt by 3% every 15 seconds (up to 12 times).' },
  { id: 'war-cry', name: 'War Cry', tier: 'S', about: 'Increases ATK of all allies by 5%.' },
  { id: 'whetstone', name: 'Whetstone', tier: 'S', about: 'Increases crit DMG of all allies by 10%.' },
  { id: 'champion', name: 'Champion', tier: 'S', about: 'At the start of the battle, increases DMG of the ally with the highest ATK by 2.5% for 200 seconds.' },
  { id: 'berserk', name: 'Berserk', tier: 'S', about: 'Reduces DEF by 25% and increases ATK by 50%.' },
  { id: 'fortress', name: 'Fortress', tier: 'S', about: 'Reduces ATK by 20% and increases DEF by 50%.' },
  { id: 'aegis', name: 'Aegis', tier: 'S', about: 'Increases the shields it gives by 25%.' },
  { id: 'mirage', name: 'Mirage', tier: 'S', about: 'Increases dodge by 20%. On dodging, recovers 3% of max HP (once every 3 seconds).' },
  { id: 'fundamentals', name: 'Fundamentals', tier: 'S', about: 'Increases DMG of normal attacks by 25%.' },
  { id: 'vitality', name: 'Vitality', tier: 'S', about: 'Increases max HP by 25%.' },
  { id: 'overflow', name: 'Overflow', tier: 'A', about: 'With mana at 100%, reduces every ally’s cooldowns by 3% (once every 10 seconds).' },
  { id: 'momentum', name: 'Momentum', tier: 'A', about: 'Each skill used increases ATK by 2% (up to 20 times).' },
  { id: 'overdrive', name: 'Overdrive', tier: 'A', about: 'Fixes attack speed at 100% and increases ATK by 40%.' },
  { id: 'regeneration', name: 'Regeneration', tier: 'A', about: 'Recovers 1% of max HP every second.' },
  { id: 'steadfast', name: 'Steadfast', tier: 'A', about: 'Each skill used reduces DMG taken by 3% (up to 8 times).' },
  { id: 'swiftness', name: 'Swiftness', tier: 'A', about: 'Increases attack speed by 25%.' },
  { id: 'focus-2', name: 'Second Focus', tier: 'A', about: 'Reduces the second skill’s cooldown by 10% every 10 seconds.' },
  { id: 'focus-3', name: 'Third Focus', tier: 'A', about: 'Reduces the third skill’s cooldown by 10% every 10 seconds.' },
  { id: 'warm-up', name: 'Warm-Up', tier: 'B', about: 'At the start of the battle, increases ATK by 5%.' },
  { id: 'might', name: 'Might', tier: 'B', about: 'Increases ATK by 25%.' },
  { id: 'focus-1', name: 'First Focus', tier: 'B', about: 'Reduces the first skill’s cooldown by 10% every 10 seconds.' },
  { id: 'physical-ward', name: 'Physical Ward', tier: 'B', about: 'Reduces physical DMG taken by 20%, rising to 30% over the first 10 seconds.' },
  { id: 'magical-ward', name: 'Magical Ward', tier: 'B', about: 'Reduces magical DMG taken by 20%, rising to 30% over the first 10 seconds.' },
  { id: 'bastion', name: 'Bastion', tier: 'B', about: 'Increases DEF of all allies by 9%.' },
  { id: 'ruthless', name: 'Ruthless', tier: 'B', about: 'Increases crit DMG by 50%.' },
  { id: 'piercing', name: 'Piercing', tier: 'B', about: 'Increases penetration by 25%.' },
  { id: 'precision', name: 'Precision', tier: 'B', about: 'Increases crit chance by 25%.' },
  { id: 'guard', name: 'Guard', tier: 'B', about: 'Increases block by 25%.' },
  { id: 'parry', name: 'Parry', tier: 'B', about: 'On blocking, recovers 200 mana (once every second).' },
  { id: 'lone-foe', name: 'Lone Foe', tier: 'C', about: 'With one enemy, increases ATK by 35%.' },
  { id: 'lone-guard', name: 'Lone Guard', tier: 'C', about: 'With one enemy, increases DEF by 35%.' },
  { id: 'armor', name: 'Armor', tier: 'C', about: 'Increases DEF by 25%.' },
  { id: 'mana-spring', name: 'Mana Spring', tier: 'C', about: 'Recovers 500 mana every 5 seconds.' },
  { id: 'surge', name: 'Surge', tier: 'F', about: 'With mana at 100%, increases DMG dealt by 15% for 10 seconds (once every 15 seconds).' },
  { id: 'desperation', name: 'Desperation', tier: 'F', about: 'With HP below 30%, increases ATK by 50% for 10 seconds (once every 10 seconds).' },
  { id: 'mending', name: 'Mending', tier: 'F', about: 'Using a skill increases the heals and shields it gives by 25% for 5 seconds (once every 10 seconds).' },
  { id: 'iron-wall', name: 'Iron Wall', tier: 'F', about: 'Increases block by 15%, and by 20% more for the first 10 seconds.' },
  { id: 'tenacity', name: 'Tenacity', tier: 'F', about: 'Reduces how long it is knocked down by 15%.' },
];

export const SKILL_IDS: readonly SkillId[] = SKILLS.map((skill) => skill.id);
const BY_ID: ReadonlyMap<string, SkillDef> = new Map(SKILLS.map((skill) => [skill.id, skill]));

/** What a skill does (null: there is no such skill). */
export const skillAbout = (id: string): string | null => BY_ID.get(id)?.about ?? null;
export const skillName = (id: string): string | null => BY_ID.get(id)?.name ?? null;

/** The most pieces of TechnoMagic gear a hero wears (both weapons, both armors, its treasure). */
export const MOST_SKILLS = 5;

/** How many of each skill a hero has, from those of the pieces it wears (ones this fight doesn't know of are none). */
export function skillsOf(list: readonly unknown[] | null | undefined): Partial<Record<SkillId, number>> {
  const counts: Partial<Record<SkillId, number>> = {};
  for (const id of (list ?? []).slice(0, MOST_SKILLS)) if (typeof id === 'string' && BY_ID.has(id)) counts[id as SkillId] = (counts[id as SkillId] ?? 0) + 1;
  return counts;
}

/** A hero's skills, as squares on its card (one for each skill, its count in the corner when it has it more than once). */
export const skillBuffs = (counts: Partial<Record<SkillId, number>>): Buff[] =>
  Object.entries(counts).map(([id, count]) => ({ name: BY_ID.get(id)?.name ?? id, about: BY_ID.get(id)?.about, icon: '✴️', ...(count && count > 1 ? { count } : {}) }));

/** What some skills leave on a hero for a while (Champion, Surge, Desperation, Mending). */
export const CHAMPION_UP: Buff = { name: 'Champion', about: 'DMG dealt higher.', icon: '👑' };
export const SURGE_UP: Buff = { name: 'Surge', about: 'DMG dealt higher.', icon: '⚡' };
export const DESPERATION_UP: Buff = { name: 'Desperation', about: 'ATK higher.', icon: '🔥' };
export const MENDING_UP: Buff = { name: 'Mending', about: 'Heals and shields stronger.', icon: '💚' };
