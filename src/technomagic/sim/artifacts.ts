import { put, type Status } from './combat/status';
import { KR_ARTIFACTS } from './gear/kr-data';
import { MAX_MANA } from './rules';
import type { Buff, Tone } from './shown';
import type { Fighter, Foe, GearBonus, GearStat } from './types';

/*
 * The artifacts, as King's Raid's CBT2 playtest has them (./gear/kr-data.ts: SkillTable's numbers at each of its stars, 0★
 * to 5★): a hero wears one, in its artifact slot (the bot says which, and its stars, as the fight begins). Those
 * that do something in a raid against one boss: not those that count enemies past one, kills, Heroes (the Arena's) or
 * other races than the dragons' (KR's masks: no boss here is of theirs), nor those on enemies' mana or skills, which no
 * boss here has. ./fight.ts calls on an artifact's hooks (artifactHooks) as the fight goes.
 */

/** A number at each of its stars, 0★ to 5★ (the index is the stars). */
type Tiers = readonly [number, number, number, number, number, number];

/** What lands on whom: itself, every ally, the ally with the highest ATK (and itself too). */
type Whom = 'self' | 'allies' | 'top' | 'self-top';

/**
 * What an artifact does (shares: 0.1 is 10%; points: 1000 is 100%; seconds; mana as King's Raid's):
 * - `own`: its own stats from the start (as its gear's); `drain`: its mana each second (less: negative);
 * - `dmg`: its DMG dealt; `foes`: to any enemy (King's Raid's non-Heroes), `boss`: to a boss, `dragon`: to a dragon, more again;
 *   `taken`: what it takes from any enemy (less: negative), and from a dragon (`dragonTaken`);
 * - `allies`: every ally's stats, the highest of every wearer's (King's Raid's: these don't stack between allies);
 * - `start`: at the start, for `lasts` seconds, on `on`: ATK, ATK Spd, DEF, Tough, crit resist, mana recovery, guarded (no CC);
 *   its DMG to any enemy or a boss, what it takes, its own DEF none (`noDef`), and mana each second; `opening`: at the start
 *   at once, healed a share of its max HP, mana a share of the most, and its skills' cooldowns so many seconds shorter;
 * - `boss`/`bossAtk`: the boss's ATK less for a while at the start; `bossHeal`: the boss healed less;
 * - `timer`: every `every` seconds (first after that long): ATK Spd for `lasts` (on itself and `random` allies), crit resist
 *   for `lasts`, cooldowns shorter, healed a share of its ATK and its healing more (`most` times), its M.DEF a share of its
 *   ATK more (`most` times), healed a share of its max HP each second for `lasts`, Tough for every ally for `lasts` (and
 *   cleansed), or a magical blow on the boss, which then takes more for `lasts` (more again each time, `most` times);
 * - `later`: after `after` seconds, the ally with the highest ATK (other than itself: `others`) for good;
 * - `onBasic`: as its attack lands, by `chance` (once in `wait` seconds at most): mana, or ATK and ATK Spd for `lasts`, or a blow;
 * - `onHurt`: as the boss's blow lands on it, by `chance` (once in `wait`): the boss takes more for `lasts`, or it nothing;
 * - `onKnock`: as it is knocked down (once in `wait`; or every `count`th time): not at all (`immune`: CC immune for so
 *   long), mana (or a share of the most), ATK Spd for `lasts`, cooldowns shorter, mana each second for 3 seconds, the
 *   boss taking more for 10 seconds;
 * - `low`: while its health is `below` or less, ATK, ATK Spd and Tough; `rescue`: the first time its health falls below
 *   `below`, healed a share of its max HP, and cleansed; `undying`: its health won't fall below `floor` at first;
 * - `onDodge`: each dodge, ATK more, `most` times; `blows`: every `count` blows, ATK and crit for `lasts`; `fullMana`: with its
 *   mana full (once in `wait`), crit and ACC for `lasts`.
 */
export interface ArtifactDef {
  own?: Partial<Record<GearStat, Tiers>>;
  drain?: Tiers;
  dmg?: Tiers;
  foes?: Tiers;
  boss?: Tiers;
  dragon?: Tiers;
  taken?: Tiers;
  dragonTaken?: Tiers;
  allies?: { atk?: Tiers; hp?: Tiers; defense?: Tiers; critDamage?: Tiers };
  start?: {
    on: Whom;
    lasts: Tiers;
    atk?: Tiers;
    speed?: Tiers;
    defense?: Tiers;
    tough?: Tiers;
    critResist?: Tiers;
    mana?: Tiers;
    guards?: true;
    foes?: Tiers;
    boss?: Tiers;
    taken?: Tiers;
    noDef?: true;
    manaEach?: Tiers;
  };
  opening?: { heal?: Tiers; mana?: Tiers; cooldown?: Tiers };
  bossAtk?: { atk: Tiers; lasts: Tiers };
  bossHeal?: Tiers;
  timer?: {
    every: number;
    lasts?: number;
    speed?: Tiers;
    random?: number;
    critResist?: Tiers;
    cooldown?: Tiers;
    heal?: Tiers;
    recovery?: Tiers;
    mdef?: Tiers;
    most?: number;
    hot?: Tiers;
    tough?: Tiers;
    hit?: Tiers;
    weakness?: Tiers;
    grows?: Tiers;
  };
  later?: { after: number; others?: true; atk?: Tiers; critDamage?: Tiers };
  onBasic?: { chance: Tiers; wait: number; mana?: number; atk?: Tiers; speed?: Tiers; lasts?: number; hit?: Tiers };
  onHurt?: { chance: number; wait: Tiers; lasts: Tiers; weakness?: Tiers; invulnerable?: true };
  onKnock?: { wait: Tiers; count?: number; immune?: Tiers; mana?: Tiers; manaShare?: Tiers; speed?: Tiers; lasts?: Tiers; cooldown?: Tiers; manaEach?: Tiers; weakness?: Tiers };
  low?: { below: number; atk: Tiers; speed: Tiers; tough: Tiers };
  rescue?: { below: number; heal: Tiers };
  undying?: { floor: number; lasts: Tiers };
  onDodge?: { atk: Tiers; most: number };
  blows?: { count: number; atk: Tiers; crit: Tiers; lasts: number };
  fullMana?: { wait: number; crit: Tiers; acc: Tiers; lasts: number };
}

/** The same at every refinement. */
const all = (n: number): Tiers => [n, n, n, n, n, n];
/** King's Raid's thousandths, at each of its stars, as shares (or points: 1000 is 1). */
const k = (...t: Tiers): Tiers => t.map((n) => n / 1000) as unknown as Tiers;

/** Every artifact the fight has a use for, by id (KR_ARTIFACTS'). */
export const ARTIFACTS: Readonly<Record<string, ArtifactDef>> = {
  // Apocalypsion's Tear: with one enemy, every ally's ATK and crit DMG.
  'artifact-1001': { allies: { atk: k(120, 140, 170, 210, 250, 300), critDamage: k(240, 280, 340, 420, 500, 600) } },
  // Earth Protection: at first, CC immune and DEF up.
  'artifact-24': { start: { on: 'self', lasts: [8, 10, 12, 14, 17, 20], defense: all(0.5), guards: true } },
  // Infernal Whip: every 8 seconds a magical blow, and the boss takes more for a while (the more each time).
  'artifact-44': { timer: { every: 8, lasts: 5, hit: [200, 240, 290, 350, 420, 500], weakness: k(100, 120, 140, 170, 210, 250), grows: k(4, 5, 6, 7, 8, 10), most: 25 } },
  // Golem's Fuel: more DMG to any enemy, less taken.
  'artifact-1002': { foes: k(100, 120, 140, 170, 210, 250), taken: k(-50, -60, -70, -85, -105, -125) },
  // Madame's Bronze Mirrors.
  'artifact-11': { own: { blockMagical: [300, 330, 360, 400, 440, 500], toughMagical: [100, 110, 120, 140, 160, 200] } },
  // Judgment of Light Bracelet: ACC and CC ACC.
  'artifact-21': { own: { acc: [300, 360, 430, 520, 630, 750], accuracy: [300, 360, 430, 520, 630, 750] } },
  // Spellbound Ring of the Deep: the boss's ATK less at first.
  'artifact-41': { bossAtk: { atk: k(-200, -240, -290, -350, -420, -500), lasts: [8, 10, 12, 14, 17, 20] } },
  // Happy Pumpkin Head: every 7 seconds, healed by its ATK, and healing more each time.
  'artifact-61': { timer: { every: 7, heal: k(1000, 1200, 1400, 1700, 2100, 2500), recovery: k(20, 24, 28, 34, 42, 50), most: 15 } },
  // Orbs of Contract: every 7 seconds, M.DEF by a share of its ATK.
  'artifact-32': { timer: { every: 7, mdef: k(10, 12, 14, 17, 20, 25), most: 6 } },
  // Guardian Crystal of the Deep: with one enemy, DEF.
  'artifact-42': { own: { defense: k(500, 600, 720, 860, 1030, 1250) } },
  // Angry Pumpkin Head.
  'artifact-52': { own: { tough: [100, 120, 140, 170, 200, 250] }, dmg: k(100, 120, 140, 170, 200, 250) },
  // Surprised Pumpkin Head: knocked down, mana and ATK Spd.
  'artifact-62': { onKnock: { wait: all(30), manaShare: k(120, 140, 170, 210, 250, 300), speed: [200, 240, 290, 350, 420, 500], lasts: all(5) } },
  // Christmas Tree of Holy Night.
  'artifact-505': { own: { critDamage: k(500, 600, 720, 870, 1050, 1250) } },
  // Warm Turkey Dish.
  'artifact-504': { own: { hp: k(100, 120, 140, 170, 210, 250), block: [100, 120, 140, 170, 210, 250] } },
  // Academic Achievement Award: every ally's ATK, its own DEF.
  'artifact-507': { allies: { atk: k(80, 100, 120, 140, 170, 200) }, own: { defense: k(100, 120, 140, 170, 210, 250) } },
  // New Year's Fanfare: every ally's ATK at first.
  'artifact-506': { start: { on: 'allies', lasts: all(20), atk: k(50, 60, 72, 86, 104, 125) } },
  // Abyssal Crown: after 30 seconds, the ally with the highest ATK.
  'artifact-502': { later: { after: 30, atk: k(300, 360, 430, 520, 630, 750) } },
  // Ancient God King's Coin.
  'artifact-509': { own: { atk: k(200, 240, 290, 350, 420, 500), critDamage: k(200, 240, 290, 350, 420, 500) } },
  // Heart Cotton Candy: itself and the ally with the highest ATK, at first.
  'artifact-508': { start: { on: 'self-top', lasts: all(20), atk: k(100, 120, 140, 170, 210, 250) } },
  // Honorary Medal: every ally's ATK, HP and DEF.
  'artifact-901': { allies: { atk: k(75, 90, 105, 120, 135, 150), hp: k(75, 90, 105, 120, 135, 150), defense: k(75, 90, 105, 120, 135, 150) } },
  // Honorary Trophy.
  'artifact-900': { own: { atk: k(250, 300, 350, 400, 450, 500), crit: [250, 300, 350, 400, 450, 500] } },
  // Hero's Plaque of Appreciation: its HP; after 30 seconds, another ally's crit DMG.
  'artifact-902': { own: { hp: k(250, 300, 350, 400, 450, 500) }, later: { after: 30.5, others: true, critDamage: k(500, 600, 700, 800, 900, 1000) } },
  // Burning Brazier of Elf: its attack, now and then, mana.
  'artifact-1': { onBasic: { chance: k(100, 120, 140, 170, 200, 250), wait: 1, mana: 1000 } },
  // Drinking Horn of Ancient Cow.
  'artifact-2': { onBasic: { chance: all(0.1), wait: 10, atk: k(100, 120, 140, 170, 200, 250), speed: [100, 120, 140, 170, 200, 250], lasts: 10 } },
  // Dice of Magical Letters: its attack, now and then, a great magical blow.
  'artifact-3': { onBasic: { chance: all(0.03), wait: 1, hit: [4000, 4800, 5750, 6900, 8300, 10000] } },
  // Golden Cat Statue.
  'artifact-4': { start: { on: 'self', lasts: all(15), speed: [400, 480, 570, 690, 830, 1000] } },
  // Pocket Watch of Ancient Civilization: every 10 seconds, cooldowns shorter and ATK Spd.
  'artifact-5': { timer: { every: 10, cooldown: [1, 1.2, 1.4, 1.7, 2, 2.5], speed: [80, 96, 115, 138, 165, 200], lasts: 5 } },
  // Primer for the Heroes: low on health.
  'artifact-6': { low: { below: 0.2, atk: k(300, 360, 430, 510, 620, 750), speed: [300, 360, 430, 510, 620, 750], tough: [300, 360, 430, 510, 620, 750] } },
  // The Ancient Scope: mana full, crit and ACC.
  'artifact-7': { fullMana: { wait: 20, crit: [400, 480, 570, 690, 830, 1000], acc: [400, 480, 570, 690, 830, 1000], lasts: 10 } },
  // Golden Apple of a Goddess.
  'artifact-9': { rescue: { below: 0.25, heal: k(300, 360, 430, 510, 620, 750) } },
  // Assassin's Veil: P.Dodge, and ATK for each dodge.
  'artifact-38': { own: { dodgePhysical: [100, 120, 140, 170, 210, 250] }, onDodge: { atk: k(10, 12, 14, 17, 21, 25), most: 20 } },
  // Magical Flute: every 8 seconds, ATK Spd for itself and two allies.
  'artifact-48': { timer: { every: 8, lasts: 4, speed: [100, 120, 140, 170, 210, 250], random: 2 } },
  // Kiddy Chick.
  'artifact-58': { own: { speed: [80, 96, 115, 138, 165, 200] } },
  // Fragment of an Ancient Kingdom.
  'artifact-68': { own: { resist: [200, 240, 290, 350, 420, 500], accuracy: [200, 240, 290, 350, 420, 500] } },
  // Forge Hammer MK-II.
  'artifact-515': { onBasic: { chance: all(0.05), wait: 0, speed: [400, 480, 580, 700, 840, 1000], lasts: 5 } },
  // Pumpkin-Stuck Evil Spirit: its HP; with one enemy, every ally's ATK.
  'artifact-514': { own: { hp: k(200, 240, 290, 350, 420, 500) }, allies: { atk: k(200, 240, 290, 350, 420, 500) } },
  // New-Type Thruster: knocked down, cooldowns shorter and mana.
  'artifact-516': { onKnock: { wait: all(20), cooldown: [5, 6, 7, 8, 9, 10], manaEach: [500, 600, 700, 800, 900, 1000] } },
  // Master Chef's Recipe Book.
  'artifact-511': { own: { defense: k(100, 120, 140, 170, 210, 250), recovery: k(100, 120, 140, 170, 210, 250) } },
  // Pendulum of Fantasy.
  'artifact-510': { own: { atk: k(100, 120, 140, 170, 210, 250) } },
  // Juno's Special Dessert: hit, now and then, the boss takes more.
  'artifact-513': { onHurt: { chance: 0.2, wait: all(0), lasts: all(5), weakness: k(100, 120, 140, 170, 210, 250) } },
  // Blessing of Earth: with one enemy, ATK.
  'artifact-25': { own: { atk: k(400, 480, 580, 690, 830, 1000) } },
  // Ring of Spirit Morph: at first, its health won't fall below 10%.
  'artifact-35': { undying: { floor: 0.1, lasts: [4, 5, 6, 7, 8, 9] } },
  // Christmas Star Ornament: at first, mana recovery and crit resist.
  'artifact-55': { start: { on: 'self', lasts: all(5), mana: k(2600, 3100, 3700, 4500, 5400, 6500), critResist: [100, 120, 140, 170, 210, 250] } },
  // Treasure Hunt Capsule: at first, cooldowns shorter; more DMG to any enemy.
  'artifact-521': { opening: { cooldown: [1, 1.2, 1.4, 1.7, 2.1, 2.5] }, foes: k(10, 12, 14, 17, 21, 25) },
  // Heart of the Abyss: at first, the ally with the highest ATK.
  'artifact-520': { start: { on: 'top', lasts: all(100), atk: k(80, 100, 120, 140, 170, 200) } },
  // Belt Ornament of the Deep: at first and every 30 seconds, every ally's Tough for a while, and cleansed.
  'artifact-523': { start: { on: 'allies', lasts: all(3), tough: [200, 240, 290, 350, 420, 500] }, timer: { every: 30, lasts: 3, tough: [200, 240, 290, 350, 420, 500] } },
  // Earth Fortress: with one enemy, the boss healed less, and more DMG to a boss.
  'artifact-522': { bossHeal: k(-100, -120, -140, -170, -210, -250), boss: k(100, 120, 140, 170, 210, 250) },
  // Earth Core.
  'artifact-26': { own: { atk: k(100, 120, 140, 170, 200, 250), hp: k(100, 120, 140, 170, 200, 250), defense: k(100, 120, 140, 170, 200, 250) } },
  // Feather of Sacrifice: for 120 seconds, the boss takes more.
  'artifact-36': { start: { on: 'self', lasts: all(120), boss: k(100, 120, 140, 170, 210, 250) } },
  // Infernal Gate.
  'artifact-46': { own: { defense: k(100, 120, 140, 170, 210, 250) }, dmg: k(60, 72, 86, 105, 125, 150), foes: k(60, 72, 86, 105, 125, 150) },
  // New Year's Fireworks.
  'artifact-56': { start: { on: 'self', lasts: all(60), atk: k(50, 60, 72, 86, 104, 125) } },
  // Amethyst Pendulum: every 10 seconds, crit resist for a while.
  'artifact-66': { timer: { every: 10, lasts: 7, critResist: [200, 240, 290, 350, 420, 500] } },
  // Earth Storm: knocked down, mana, and the boss takes more for a while.
  'artifact-23': { onKnock: { wait: all(20), mana: [600, 700, 800, 1000, 1200, 1500], weakness: k(120, 140, 170, 210, 250, 300) } },
  // Infernal Greatsword.
  'artifact-43': { own: { recovery: all(-0.3), pen: [300, 360, 430, 520, 630, 750], critDamage: k(300, 360, 430, 520, 630, 750) } },
  // Well-Done Turkey Roast: every 15 seconds, healed a share of its max HP each second for 3.
  'artifact-53': { timer: { every: 15, lasts: 3, hot: k(10, 12, 14, 17, 20, 25) } },
  // Fantastic Hybrid Animals: for 200 seconds, more DMG to any enemy, less taken.
  'artifact-63': { start: { on: 'self', lasts: all(200), foes: k(120, 140, 170, 210, 250, 300), taken: k(-120, -140, -170, -210, -250, -300) } },
  // Soul Spring Water: at first, healed and mana.
  'artifact-19': { opening: { heal: k(240, 280, 340, 420, 500, 600), mana: k(120, 140, 170, 210, 250, 300) } },
  // Nail Ornament of the Deep: for 200 seconds, no DEF, and more DMG to a boss.
  'artifact-39': { start: { on: 'self', lasts: all(200), noDef: true, boss: k(200, 240, 290, 350, 420, 500) } },
  // Lion of Protection.
  'artifact-49': { own: { defPhysical: k(200, 240, 290, 350, 420, 500), blockPhysical: [100, 120, 140, 170, 210, 250] } },
  // Cooling Delicacy in the Summer: for 30 seconds, less taken, and mana.
  'artifact-59': { start: { on: 'self', lasts: all(30), taken: k(-200, -240, -280, -340, -420, -500), manaEach: [100, 120, 140, 170, 210, 250] } },
  // Dragon's Doomstone: more DMG to any enemy, less taken; the more against a dragon.
  'artifact-1000': {
    foes: k(100, 120, 140, 170, 210, 250),
    taken: k(-50, -60, -70, -85, -105, -125),
    dragon: k(182, 215, 246, 291, 348, 400),
    dragonTaken: k(-105, -128, -150, -186, -235, -289),
  },
  // Mask of Evil King.
  'artifact-17': { boss: k(100, 120, 140, 170, 200, 250) },
  // Book of the Mad: mana drained, more DMG.
  'artifact-47': { drain: [-100, -120, -140, -170, -210, -250], dmg: k(140, 170, 210, 250, 300, 350) },
  // Fancy Traditional Pendant.
  'artifact-57': { own: { crit: [100, 120, 140, 170, 210, 250], critDamage: k(200, 240, 290, 350, 420, 500) } },
  // Goddess of Glory: every ally's ATK Spd at first.
  'artifact-67': { start: { on: 'allies', lasts: all(20), speed: [100, 120, 140, 170, 210, 250] } },
  // Golden Mask of Ancient King: hit, now and then, it takes nothing for a while.
  'artifact-10': { onHurt: { chance: 0.05, wait: [8, 8.5, 9, 10, 11, 12.5], lasts: [3, 3.5, 4, 5, 6, 7.5], invulnerable: true } },
  // Talismans of Resistance: knocked down, it isn't, and is CC immune for a while.
  'artifact-20': { onKnock: { wait: [20, 19, 18, 17, 16, 15], immune: [1, 1.5, 2, 2.5, 3, 3.5] } },
  // Tarot Card of Loss.
  'artifact-30': { own: { crit: [-150, -180, -210, -260, -310, -375], atk: k(300, 360, 430, 520, 630, 750) } },
  // Trident of the Deep: every 100 blows, ATK and crit for a while.
  'artifact-40': { blows: { count: 100, atk: k(300, 360, 440, 530, 630, 750), crit: [200, 240, 290, 350, 420, 500], lasts: 15 } },
  // LuLu's Necklace: for 30 seconds, more DMG to any enemy, and mana.
  'artifact-60': { start: { on: 'self', lasts: all(30), foes: k(200, 240, 280, 340, 420, 500), manaEach: [200, 240, 280, 340, 420, 500] } },
  // Perfume of the Queen: every third time it is knocked down, ATK Spd for a while.
  'artifact-64': { onKnock: { wait: all(0), count: 3, speed: all(500), lasts: [4, 4.8, 5.8, 7, 8.4, 10] } },
};

/** Its name, and what it does at each of its stars (0★ to 5★), in King's Raid's words. */
const DATA = new Map(KR_ARTIFACTS.map((one) => [one.id, one]));

/** An artifact as a hero wears it: which, and its tier (its stars, 0★ to 5★); null: none, or one the fight has no use for. */
export function artifactOf(worn: { id: string; tier: number } | null | undefined): { id: string; def: ArtifactDef; tier: number } | null {
  const def = worn && ARTIFACTS[worn.id];
  return worn && def ? { id: worn.id, def, tier: Math.min(5, Math.max(0, Math.floor(worn.tier) || 0)) } : null;
}

/** A number at its tier. */
export const at = (tiers: Tiers | undefined, tier: number): number => tiers?.[tier] ?? 0;

/** What its own stats gain from the start (as its gear's). */
export function artifactStats(worn: ReturnType<typeof artifactOf>): GearBonus {
  if (!worn) return {};
  return Object.fromEntries(Object.entries(worn.def.own ?? {}).map(([stat, tiers]) => [stat, at(tiers, worn.tier)]));
}

/** An artifact as a square on its wearer's card. */
export const artifactBuff = (worn: NonNullable<ReturnType<typeof artifactOf>>): Buff => {
  const data = DATA.get(worn.id);
  return { name: data?.name ?? 'Artifact', about: data?.text?.[worn.tier] ?? '', icon: '🏺', ...(data && { art: { item: data.icon } }) };
};

/** What the fight gives an artifact's hooks: its time, the heroes on the field, the boss, and what it does. */
export interface ArtifactFight {
  elapsed(): number;
  field(): readonly Fighter[];
  boss(): Foe;
  /** Whether the boss is a dragon (King's Raid's Dragon race). */
  dragon: boolean;
  roll(): number;
  hit(by: Fighter, amount: number): void;
  heal(fighter: Fighter, amount: number): void;
  /** Whether a wait of a hero's by its name is over: then it waits again, `again` seconds. */
  due(fighter: Fighter, name: string, again: number): boolean;
}

/**
 * What an artifact does as the fight goes, for the hero wearing it: its DMG (to `foe`) and what it takes, as the fight
 * works them out; and what comes of the fight beginning, a step's time passing, its attack landing, any blow of its
 * landing, being hit, being knocked down (false: it isn't), dodging; and its health not falling below some at first.
 */
export interface ArtifactHooks {
  deals(foe: Foe): number;
  taken(): number;
  begin(): void;
  tick(dt: number): void;
  basic(): void;
  blow(): void;
  hurt(): void;
  knocked(): boolean;
  dodged(): void;
  /** Whether its DEF is none for now (Nail Ornament of the Deep's, at first). */
  noDef(): boolean;
  /** The least its health may fall to (0: none). */
  floor(): number;
}

/** What every ally gains of an artifact's `allies`, from every hero on the field wearing one: the highest of each. */
export function alliesFrom(field: readonly Fighter[], key: 'atk' | 'hp' | 'defense' | 'critDamage'): number {
  let most = 0;
  for (const on of field) {
    const worn = on.artifact;
    if (on.hp > 0 && worn) most = Math.max(most, at(worn.def.allies?.[key], worn.tier));
  }
  return most;
}

const SHOWN = (worn: NonNullable<ReturnType<typeof artifactOf>>): Buff => ({ ...artifactBuff(worn), about: 'Its artifact.' });

/** An artifact's hooks for the hero wearing it (`self`). */
export function artifactHooks(self: Fighter, fight: ArtifactFight): ArtifactHooks | null {
  const worn = self.artifact;
  if (!worn) return null;
  const { def, tier } = worn;
  const t = (tiers: Tiers | undefined): number => at(tiers, tier);
  const shown = SHOWN(worn);
  const name = `artifact ${self.index}`;
  let stacks = 0;
  let knocks = 0;
  let dodges = 0;
  let struck = 0;
  let rescued = false;
  let manaEach = 0;
  let manaFor = 0;
  /** A status of its artifact's on `on`, for `lasts` seconds. */
  const give = (on: Status<Buff>[], lasts: number, does: Omit<Status<Buff>, 'name' | 'left' | 'shown'>, as = name): void => put(on, { name: as, left: lasts, ...does, shown });
  /**
   * A status of its artifact's on the boss, for `lasts` seconds (shown under its health as a curse): one for the artifact,
   * whoever wears it (King's Raid's: the same artifact's on the boss don't stack between allies).
   */
  const curse = (lasts: number, does: Omit<Status<Tone>, 'name' | 'left' | 'shown'>, as = `${worn.id} on the boss`): void => put(fight.boss().statuses, { name: as, left: lasts, ...does, shown: 'curse' });
  const standing = (): Fighter[] => fight.field().filter((on) => on.hp > 0);
  const top = (others: boolean): Fighter | null =>
    standing().reduce<Fighter | null>((best, on) => (others && on === self ? best : !best || on.stats.atk > best.stats.atk ? on : best), null);
  const whom = (on: Whom): Fighter[] => {
    if (on === 'self') return [self];
    if (on === 'allies') return standing();
    const best = top(false);
    return on === 'top' ? (best ? [best] : []) : [...new Set([self, ...(best ? [best] : [])])];
  };
  const earlyOn = (): boolean => def.start !== undefined && fight.elapsed() < t(def.start.lasts);
  /** `n` of `from` at random, each once (by the fight's chances, so the bot's and every page's fight pick the same). */
  const picked = (from: Fighter[], n: number): Fighter[] => {
    const left = [...from];
    const out: Fighter[] = [];
    while (out.length < n && left.length > 0) out.push(...left.splice(Math.floor(fight.roll() * left.length), 1));
    return out;
  };
  return {
    deals(foe) {
      const early = earlyOn() ? def.start : undefined;
      const boss = foe === fight.boss();
      return 1 + t(def.dmg) + t(def.foes) + t(early?.foes) + (boss ? t(def.boss) + t(early?.boss) : 0) + (fight.dragon ? t(def.dragon) : 0);
    },
    taken() {
      const early = earlyOn() ? def.start : undefined;
      return 1 + t(def.taken) + t(early?.taken) + (fight.dragon ? t(def.dragonTaken) : 0);
    },
    begin() {
      const start = def.start;
      if (start) {
        for (const on of whom(start.on)) {
          give(on.statuses, t(start.lasts), {
            ...(start.atk && { atk: t(start.atk) }),
            ...(start.speed && { speed: t(start.speed) }),
            ...(start.defense && { defends: 1 + t(start.defense) }),
            ...(start.tough && { tough: t(start.tough) }),
            ...(start.critResist && { critResist: t(start.critResist) }),
            ...(start.mana && { mana: 1 + t(start.mana) }),
            ...(start.guards && { guards: true }),
          });
          if (start.tough) on.statuses = on.statuses.filter((status) => status.shown.harmful !== true || status.binds === true);
        }
        if (start.manaEach) {
          manaEach = t(start.manaEach);
          manaFor = t(start.lasts);
        }
      }
      const opening = def.opening;
      if (opening) {
        if (opening.heal) fight.heal(self, t(opening.heal) * self.stats.hp);
        if (opening.mana) self.mana = Math.min(MAX_MANA, self.mana + t(opening.mana) * MAX_MANA);
        if (opening.cooldown) self.cooldowns = self.cooldowns.map((left) => Math.max(0, left - t(opening.cooldown)));
      }
      if (def.bossAtk) curse(t(def.bossAtk.lasts), { deals: 1 + t(def.bossAtk.atk) });
      if (def.bossHeal) curse(Infinity, { heals: 1 + t(def.bossHeal) }, `${worn.id} heals`);
      if (def.timer) self.perkWaits[name] = def.timer.every;
    },
    tick(dt) {
      const timer = def.timer;
      const up = self.hp > 0 && fight.field().includes(self);
      // (Its mana each second: drained, or given for a while.)
      if (def.drain && up) self.mana = Math.max(0, self.mana + t(def.drain) * dt);
      if (manaFor > 0 && up) {
        self.mana = Math.min(MAX_MANA, self.mana + manaEach * Math.min(dt, manaFor));
        manaFor -= dt;
      }
      if (timer && up && fight.due(self, name, timer.every)) {
        const lasts = timer.lasts ?? 0;
        if (timer.speed) for (const on of [self, ...picked(standing().filter((on) => on !== self), timer.random ?? 0)]) give(on.statuses, lasts, { speed: t(timer.speed) });
        if (timer.critResist) give(self.statuses, lasts, { critResist: t(timer.critResist) });
        if (timer.cooldown) self.cooldowns = self.cooldowns.map((left) => Math.max(0, left - t(timer.cooldown)));
        // (A share of its ATK.)
        if (timer.heal) fight.heal(self, t(timer.heal) * self.stats.atk);
        if (timer.recovery || timer.mdef) {
          stacks = Math.min(timer.most ?? 1, stacks + 1);
          give(self.statuses, Infinity, {
            ...(timer.recovery && { heals: 1 + t(timer.recovery) * stacks }),
            ...(timer.mdef && { bolsters: { magical: t(timer.mdef) * stacks * self.stats.atk } }),
            count: stacks,
          });
        }
        if (timer.hot) give(self.statuses, lasts, {}, `${name} heals`);
        if (timer.tough) for (const on of standing()) {
          give(on.statuses, lasts, { tough: t(timer.tough) }, `${name} tough`);
          on.statuses = on.statuses.filter((status) => status.shown.harmful !== true || status.binds === true);
        }
        if (timer.hit) {
          fight.hit(self, t(timer.hit));
          curse(lasts, { takes: 1 + t(timer.weakness) + t(timer.grows) * stacks });
          stacks = Math.min(timer.most ?? 0, stacks + 1);
        }
      }
      // (Healed a share of its max HP each second while its heal over time lasts.)
      if (timer?.hot && up && self.statuses.some((status) => status.name === `${name} heals`)) fight.heal(self, t(timer.hot) * self.stats.hp * dt);
      const later = def.later;
      if (later && fight.elapsed() >= later.after && fight.elapsed() - dt < later.after) {
        const best = top(later.others === true);
        if (best) give(best.statuses, Infinity, { ...(later.atk && { atk: t(later.atk) }), ...(later.critDamage && { critDamage: t(later.critDamage) }) }, `${name} later`);
      }
      const low = def.low;
      if (low && up) {
        const under = self.hp <= self.stats.hp * low.below;
        const on = self.statuses.some((status) => status.name === `${name} low`);
        if (under && !on) give(self.statuses, Infinity, { atk: t(low.atk), speed: t(low.speed), tough: t(low.tough) }, `${name} low`);
        if (!under && on) self.statuses = self.statuses.filter((status) => status.name !== `${name} low`);
      }
      if (def.rescue && up && !rescued && self.hp < self.stats.hp * def.rescue.below) {
        rescued = true;
        self.statuses = self.statuses.filter((status) => status.shown.harmful !== true || status.binds === true);
        fight.heal(self, t(def.rescue.heal) * self.stats.hp);
      }
      const full = def.fullMana;
      if (full && up && self.mana >= MAX_MANA && fight.due(self, `${name} full`, full.wait)) give(self.statuses, full.lasts, { critPoints: t(full.crit), acc: t(full.acc) });
    },
    basic() {
      const on = def.onBasic;
      if (!on || fight.roll() >= t(on.chance) || !fight.due(self, `${name} attack`, on.wait)) return;
      if (on.mana) self.mana = Math.min(MAX_MANA, self.mana + on.mana);
      if (on.atk || on.speed) give(self.statuses, on.lasts ?? 0, { ...(on.atk && { atk: t(on.atk) }), ...(on.speed && { speed: t(on.speed) }) });
      if (on.hit) fight.hit(self, t(on.hit));
    },
    blow() {
      const blows = def.blows;
      if (!blows) return;
      struck++;
      if (struck >= blows.count) {
        struck = 0;
        give(self.statuses, blows.lasts, { atk: t(blows.atk), critPoints: t(blows.crit) }, `${name} blows`);
      }
    },
    hurt() {
      const on = def.onHurt;
      if (!on || self.hp <= 0 || fight.roll() >= on.chance || !fight.due(self, `${name} hurt`, t(on.wait))) return;
      if (on.invulnerable) give(self.statuses, t(on.lasts), { takes: 0 });
      if (on.weakness) curse(t(on.lasts), { takes: 1 + t(on.weakness) });
    },
    knocked() {
      const on = def.onKnock;
      if (!on) return true;
      if (on.count) {
        knocks++;
        if (knocks < on.count) return true;
        knocks = 0;
      } else if (!fight.due(self, `${name} knocked`, t(on.wait))) return true;
      if (on.mana) self.mana = Math.min(MAX_MANA, self.mana + t(on.mana));
      if (on.manaShare) self.mana = Math.min(MAX_MANA, self.mana + t(on.manaShare) * MAX_MANA);
      if (on.speed) give(self.statuses, t(on.lasts), { speed: t(on.speed) });
      if (on.cooldown) self.cooldowns = self.cooldowns.map((left) => Math.max(0, left - t(on.cooldown)));
      if (on.manaEach) {
        manaEach = t(on.manaEach);
        manaFor = 3;
      }
      if (on.weakness) curse(10, { takes: 1 + t(on.weakness) });
      if (on.immune) {
        give(self.statuses, t(on.immune), { guards: true });
        return false;
      }
      return true;
    },
    dodged() {
      const on = def.onDodge;
      if (!on) return;
      dodges = Math.min(on.most, dodges + 1);
      give(self.statuses, Infinity, { atk: t(on.atk) * dodges, count: dodges });
    },
    noDef() {
      return def.start?.noDef === true && earlyOn();
    },
    floor() {
      return def.undying && fight.elapsed() < t(def.undying.lasts) ? def.undying.floor * self.stats.hp : 0;
    },
  };
}
