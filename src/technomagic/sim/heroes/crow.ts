import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure } from '../treasures';
import { MAX_MANA } from '../rules';
import { num, pct, skillArt, type Buff } from '../shown';
import { AKISTRA, AKISTRA_UP, atTier } from '../unique';
import { bookDmg, CLASS_STATS, dmg, type HeroDef, indexed, type Passive } from './kit';
import { CODED } from './moves';

/*
 * Crow's skills, as the game has them (what each costs, how long before it can be used again, how long what it does
 * lasts, the chances, and his passive's ATK, crit DMG and mana are the game's; how hard each hits is not said there).
 * His Hunting Dog's Fang Marks are on the boss: up to 100 stacked, all of them lasting 40 seconds from the last.
 * - Target will be Eliminated.: fifteen shots, then two Fang Marks.
 * - Struggle is Meaningless.: ten shots, then a Frost Bullet that freezes the boss (a stun), leaving a freezing area
 *   under it for 6 seconds that strikes it every 2 seconds, now and then freezing it again.
 * - Even Gods shall Die.: he focuses, then a laser, harder for each Fang Mark on the boss (all of them spent), and
 *   twice as hard for his focus (the game's grows with it: he always focuses in full here). Its knocking the boss back
 *   does nothing: it doesn't move.
 * His passive, Hunting Preparation: nothing quickens or slows him, his ATK and crit DMG are higher, he recovers mana
 * every second besides, and his attack leaves a Fang Mark.
 * His unique weapon (../unique.ts) is worked here too: his attack shoots a bullet more, and a skill of his raises his
 * ATK and crit damage for a while (no sooner than that while after the last).
 * What is drawn for each is ../../heroes/crow/fx.ts; what his body does for each, and for his attack, ../../heroes/crow/moves.ts.
 *
 * His own perks (../perks.ts) are King's Raid's: Hunting Preparation's Light leaves the boss taking more from every
 * hero, from his first blow on. His passive's mana is the game's 300 a second (of its 1000 to a section), besides what
 * he recovers as every hero does (all that Hunting Preparation's Dark, and his gear, raise).
 */
// (How hard each of his skills hits is the King's Raid Index's, at his class's ATK: ./kit.ts's indexed.)
// (As many shots as its move has.)
const ELIMINATE = { shots: CODED.eliminate.lands.length, blow: indexed('mechanic', 164_145) / CODED.eliminate.lands.length, marks: 2 };
// (Its shots: its move's blows but the last, the Frost Bullet.)
const STRUGGLE = { shots: CODED.struggle.lands.length - 1, blow: indexed('mechanic', 195_630) / (CODED.struggle.lands.length - 1), frost: indexed('mechanic', 109_497), freeze: 4, area: 6, every: 2, chill: indexed('mechanic', 52_409), chance: 0.5, chilled: 2 };
const GODS = { blow: indexed('mechanic', 165_718), each: indexed('mechanic', 5299), focus: 2 };
/** Hunting Dog's Fang Marks: how long they last, and the most there can be. */
const FANG = { lasts: 40, most: 100 };
/** Hunting Preparation: his ATK (added to his class's, as the game has it), crit DMG more, and mana a second. */
const HUNTING = { atk: 25_288, critDamage: 0.8, mana: 300 };
/** His own perks' numbers: Target will be Eliminated.'s mana for each blow, and the freezing area's more chance. */
const PERKS = { mana: 30, chance: 0.3 };

/**
 * His unique treasures' numbers (1★ to 5★: ../treasures.ts): Target will be Eliminated.'s shorter cooldown and the mana it
 * would take (the boss has none); Struggle is Meaningless.'s cheaper and its chance to freeze the boss with each shot;
 * Even Gods shall Die.'s DMG; and Hunting Preparation's more ATK.
 */
const UT = {
  bullet: { cooldown: -3, mana: [20, 24, 29, 35, 42, 50] },
  barrage: { cost: -1, chance: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], freeze: 3 },
  pendant: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
  box: { atk: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
};

const art = skillArt('crow');

const HUNTING_PREPARATION: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  steady: true,
  shown: {
    name: 'Hunting Preparation',
    about: `Passive. Nothing quickens or slows him; his ATK is higher and his crit damage ${pct(HUNTING.critDamage)} higher; he recovers mana every second besides; his attack leaves a [Hunting Dog’s Fang Mark].`,
    icon: '🐺',
    art: art(3),
  },
  words: `Crow is not affected by changes in ATK Spd. ATK increases by ${num(HUNTING.atk)} and Crit DMG by ${pct(HUNTING.critDamage)}. Recovers ${HUNTING.mana} Mana every second. It also leaves a 'Hunting Dog's Fang Mark' to target for ${FANG.lasts} sec when dealing a normal attack.`,
};
/** The freezing area: shown on his card while it lasts. */
const FREEZING: Buff = { name: 'Freezing Area', about: `Strikes the boss every ${STRUGGLE.every} seconds, now and then freezing it.`, icon: '❄️', art: art(1) };
/** What his skills leave on the boss. */
const FANG_MARK = 'Hunting Dog’s Fang Mark';

export const CROW: HeroDef = {
  id: 'crow',
  name: 'Crow',
  class: 'mechanic',
  skins: ['Crow'],
  // A mechanic (his blows physical), his ATK and crit DMG higher for his passive: as his class stands, otherwise.
  stats: { ...CLASS_STATS.mechanic, atk: CLASS_STATS.mechanic.atk + HUNTING.atk, critDamage: CLASS_STATS.mechanic.critDamage + HUNTING.critDamage, deals: 'physical' },
  abilities: [
    {
      name: 'Target will be Eliminated.',
      about: `${ELIMINATE.shots} shots, then ${ELIMINATE.marks} [Hunting Dog’s Fang Marks] on the boss (up to ${FANG.most}, for ${FANG.lasts} seconds).`,
      words: `Deals a total of ${dmg('mechanic', ELIMINATE.blow * ELIMINATE.shots, bookDmg('crow', 0))} P.DMG to enemies in front over ${ELIMINATE.shots} times and leaves ${ELIMINATE.marks} 'Hunting Dog's Fang Marks' for ${FANG.lasts} sec. Hunting Dog's Fang Mark stacks up to max ${FANG.most} times.`,
      icon: '🔫',
      art: art(0),
      move: 'eliminate',
      cooldown: 10,
      cost: 2,
    },
    {
      name: 'Struggle is Meaningless.',
      about: `${STRUGGLE.shots} shots, then a Frost Bullet that freezes the boss for ${STRUGGLE.freeze} seconds and leaves a freezing area under it for ${STRUGGLE.area}: every ${STRUGGLE.every} seconds it strikes, with a ${pct(STRUGGLE.chance)} chance to freeze the boss for ${STRUGGLE.chilled}.`,
      words: `Attacks a random enemy ${STRUGGLE.shots} times and deals a total of ${dmg('mechanic', STRUGGLE.blow * STRUGGLE.shots, bookDmg('crow', 1))} P.DMG. Shoots a Frost Bullet that deals ${dmg('mechanic', STRUGGLE.frost, bookDmg('crow', 1))} P.DMG to target and surrounding enemies, freezing them for ${STRUGGLE.freeze} sec. The special Frost Bullet creates a freezing area for ${STRUGGLE.area} seconds that deals ${dmg('mechanic', STRUGGLE.chill, bookDmg('crow', 1))} P.DMG every ${STRUGGLE.every} sec, with a ${pct(STRUGGLE.chance)} chance to freeze for ${STRUGGLE.chilled} sec.`,
      icon: '❄️',
      art: art(1),
      move: 'struggle',
      cooldown: 15,
      cost: 3,
    },
    {
      name: 'Even Gods shall Die.',
      about: `He focuses, then a laser, harder for each [Hunting Dog’s Fang Mark] on the boss (all of them spent), and ${pct(GODS.focus - 1)} harder for his focus.`,
      words: `Takes position and focuses to shoot a laser, dealing ${dmg('mechanic', GODS.blow, bookDmg('crow', 2))} P.DMG to frontal enemies within range, and consumes target's stack of Hunting Dog's Fang Mark to deal additional ${dmg('mechanic', GODS.each, bookDmg('crow', 2))} P.DMG per each stack. Depending on the focusing time, the effect's range increases, and DMG is increased up to max ${pct(GODS.focus - 1)}. Once the focus is completed, knocks back the enemy far away.`,
      icon: '💥',
      art: art(2),
      move: 'gods',
      cooldown: 20,
      cost: 4,
    },
  ],
  passive: HUNTING_PREPARATION,
  treasures: [
    treasure('Teeth-mark Bullet', (k) => ({
      words: `[Target will be Eliminated.] Reduces Cooldown by ${-UT.bullet.cooldown} sec, and upon every hit, reduces the target's Mana by ${k(UT.bullet.mana)}.`,
      skill: { index: 0, cooldown: UT.bullet.cooldown },
    })),
    treasure('Cold Barrage', (k) => ({
      words: `[Struggle is Meaningless] Reduces Mana Cost by ${-UT.barrage.cost} and has a ${pct(k(UT.barrage.chance))} chance to freeze target for ${UT.barrage.freeze} sec upon every strike.`,
      skill: { index: 1, cost: UT.barrage.cost },
    })),
    treasure('Pendant of Memories', (k) => ({
      words: `[Even Gods shall Die] Gains immunity to CC during skill activation and DMG is increased by ${pct(k(UT.pendant.dmg))}.`,
      skill: { index: 2, dmg: 1 + k(UT.pendant.dmg), steady: true },
    })),
    // (His passive's ATK is added to his class's: the more of it, added as it is.)
    treasure('Carousel Music Box', (k) => ({
      words: `[Hunting Preparation] Increases ATK boost by ${pct(k(UT.box.atk))}. Hunting Dog's Fang Mark becomes irremovable.`,
    })),
  ],
  perks: {
    's1-light': { words: `Upon each DMG dealt, recovers ${PERKS.mana} Mana.` },
    's1-dark': { words: 'Gains immunity to CC while in use.' },
    's2-light': said({ skill: { index: 1, cooldown: -3 } }, ({ skill }) => `Cooldown is reduced by ${-skill.cooldown} sec.`),
    's2-dark': { words: `Freezing chance of the Freezing Area increases by ${pct(PERKS.chance)}.` },
    's3-light': said({ skill: { index: 2, cooldown: 10, dmg: 2 } }, ({ skill }) => `Increases Cooldown by ${skill.cooldown} sec and DMG by ${pct(skill.dmg - 1)}.`),
    's3-dark': said({ skill: { index: 2, cost: -1 } }, ({ skill }) => `Reduces Mana Cost by ${-skill.cost}.`),
    's4-light': said({ mark: { name: 'Hunting Preparation', takes: 1.15, lasts: Infinity } }, ({ mark }) => `Boss monster takes ${pct(mark.takes - 1)} increased DMG.`),
    's4-dark': said({ bonus: { manaRegen: 0.4 } }, ({ bonus }) => `Mana recovery increases by ${pct(bonus.manaRegen)}.`),
    't5-light': t5Light({ critDamage: 0.2 }, ({ critDamage }) => `Crit DMG +${pct(critDamage)}`),
    't5-dark': said({ allSkills: { cost: 1, dmg: 1.75 } }, ({ allSkills }) => `Increases Mana Cost of all skills by ${allSkills.cost} and DMG by ${pct(allSkills.dmg - 1)}.`),
  },
  attack: 'snipe',
  join(fight, self) {
    /** How long his freezing area lasts yet, and toward its next strike; toward his passive's next mana; his unique weapon's wait. */
    let area = 0;
    let chill = 0;
    let akistra = 0;
    const tier = self.unique?.tier ?? null;
    // Carousel Music Box: his passive's ATK the more.
    self.stats.atk += HUNTING.atk * fromTreasure(self, 3, UT.box.atk);
    /** Cold Barrage: each shot's chance to freeze the boss. */
    const barrage = fromTreasure(self, 1, UT.barrage.chance);

    /** How many Fang Marks are on the boss. */
    const fangs = (): number => fight.foe.statuses.find((status) => status.name === FANG_MARK)?.count ?? 0;
    /** So many more Fang Marks (up to the most), all of them begun again. */
    const mark = (count: number): void => {
      put(fight.foe.statuses, { name: FANG_MARK, left: FANG.lasts, count: Math.min(FANG.most, fangs() + count), shown: 'curse' });
    };
    /** The boss is frozen (as a stun). */
    const freeze = (seconds: number): void => fight.stun(seconds, { by: self });

    return {
      lands: {
        // His attack: a shot that leaves a Fang Mark (and with his unique weapon, a bullet more).
        snipe() {
          fight.hit(self, fight.basic);
          mark(1);
          if (tier !== null) fight.hit(self, atTier(AKISTRA.bullet, tier), false);
        },
        // Each shot (its Light: mana for each); the last leaves two Fang Marks.
        eliminate(part) {
          fight.hit(self, ELIMINATE.blow);
          if (self.perks.has('s1-light')) self.mana = Math.min(MAX_MANA, self.mana + PERKS.mana);
          if (part === ELIMINATE.shots - 1) mark(ELIMINATE.marks);
        },
        // Each shot; then the Frost Bullet freezes the boss, and leaves the freezing area under it.
        struggle(part) {
          if (part < STRUGGLE.shots) {
            fight.hit(self, STRUGGLE.blow);
            if (barrage > 0 && fight.roll() < barrage) freeze(UT.barrage.freeze);
            return;
          }
          fight.hit(self, STRUGGLE.frost);
          if (barrage > 0 && fight.roll() < barrage) freeze(UT.barrage.freeze);
          freeze(STRUGGLE.freeze);
          area = STRUGGLE.area;
          chill = 0;
        },
        // The laser: harder for each Fang Mark (all spent), and for his focus.
        gods() {
          fight.hit(self, (GODS.blow + GODS.each * fangs()) * GODS.focus);
          const at = fight.foe.statuses.findIndex((status) => status.name === FANG_MARK);
          if (at >= 0) fight.foe.statuses.splice(at, 1);
        },
      },
      // His unique weapon: a skill raises his ATK and crit damage for a while, no sooner than that while after the last.
      used() {
        if (tier === null || akistra > 0) return;
        akistra = AKISTRA.every;
        const boost = atTier(AKISTRA.boost, tier);
        put(self.statuses, { name: AKISTRA_UP.name, left: AKISTRA.lasts, deals: 1 + boost, critDamage: boost, shown: AKISTRA_UP });
      },
      tick(dt) {
        akistra = Math.max(0, akistra - dt);
        const standing = fight.field.includes(self) && self.hp > 0;
        // His passive's mana every second (besides what he recovers as every hero does).
        if (standing) self.mana = Math.min(MAX_MANA, self.mana + HUNTING.mana * dt);
        // The freezing area strikes the boss every so often, now and then freezing it again (its Dark: the more often).
        if (area <= 0) return;
        area -= dt;
        chill += dt;
        if (chill >= STRUGGLE.every) {
          chill -= STRUGGLE.every;
          fight.hit(self, STRUGGLE.chill, false);
          if (fight.roll() < STRUGGLE.chance + (self.perks.has('s2-dark') ? PERKS.chance : 0)) freeze(STRUGGLE.chilled);
        }
      },
      guards: () => self.doing?.move === 'eliminate' && self.perks.has('s1-dark'),
      lit: () => fangs() >= FANG.most,
      buffs: () => (area > 0 ? [{ ...FREEZING, left: area }] : []),
    };
  },
};
