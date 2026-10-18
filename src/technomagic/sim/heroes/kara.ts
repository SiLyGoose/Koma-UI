import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { num, pct, skillArt, type Buff } from '../shown';
import { atTier, SHATTERER, SHATTERER_UP } from '../unique';
import { type Ability, bookDmg, CLASS_STATS, dmg, type HeroDef, type Passive, played } from './kit';

/*
 * Kara's skills, as King's Raid's playtest has them (stats/kara.md: how hard each hits at its level 90, and every number
 * here, are its; its words are its own). She is a mechanic whose blows are magical, the Epitome of Ancient Technomagic, in
 * one of two modes:
 * - [Anti-personnel Weapon], as she begins: Anti-personnel Laser (four blows, and a last that knocks the boss down) and
 *   Wide-area Cannon (four blows that stun it); her DEF higher (its books' half again).
 * - Release Siege Weapon turns her into the [Siege Weapon] (and back, used again): her attack the siege gun's blows;
 *   Siege Laser (a great blow, its crits the harder) and Focused Fire (fifteen blows, each a stack of Focused Fire on the boss,
 *   each stack every blow of it harder) in place of the others; more to the boss, more taken, and immune to CC.
 * Her passive, Essence of Technomagic: each of her blows gains her mana; and her two modes' own.
 * Her unique weapon (../unique.ts) is worked here too: her ATK higher every second (up to so many times).
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/kara.ts).
 *
 * Her own perks (../perks.ts) are King's Raid's. Release Siege Weapon's Light and Essence's Light (one enemy) always hold.
 * Anti-personnel Laser's Dark (the boss's mana) and Optical Lens's Siege Laser blocks ignored do nothing here. Her perks of
 * Anti-personnel Laser and Wide-area Cannon are Siege Laser's and Focused Fire's too, as their words say.
 */
/** Anti-personnel Laser: each of its four blows, how long each knocks the boss back; its last blow and how long it knocks the boss down. */
const LASER = { blow: played('mechanic', 1205, 40_774), back: 0.5, last: played('mechanic', 2410, 81_548), down: 3 };
/** Wide-area Cannon: each of its four blows, and how long they stun. */
const CANNON = { blow: played('mechanic', 1378, 46_352), stun: 4 };
/** Siege Laser: its blow, and its crit DMG more. */
const SIEGE_LASER = { blow: played('mechanic', 7693, 260_092), critDamage: 2 };
/** Focused Fire: each of its fifteen blows (three on each of its parts), how long Focused Fire lasts, its most, and each stack's blow more. */
const FOCUSED = { blow: played('mechanic', 357, 11_799), each: 3, lasts: 20, most: 30, stack: played('mechanic', 29) };
/** The Siege Weapon's gun: each of its blows (two for each blow of her attack while she is one); and the mode's more to the boss and more taken. */
const SIEGE = { blow: played('mechanic', 538, 19_740), boss: 0.25, taken: 1.3 };
/** Essence of Technomagic: her DEF more in [Anti-personnel Weapon] (flat, its books' half again), and the mana each blow gains her. */
const ESSENCE = { defense: 25_961, books: 1.5, mana: 70 };
/** Her own perks' numbers: Anti-personnel Laser's Light's mana on a crit, and Siege Laser's DMG; Wide-area Cannon's Light's longer stun, and Focused Fire's stacks; Focused Fire's Dark's most; Release's Dark's share off her cooldowns on a crit; Essence's Light's mana and Dark's; Transcend 5's Dark's ACC. */
const PERKS = { mana: 200, laser: 2, stun: 1, stacks: 2, most: 60, sooner: 0.03, essence: 210, dark: { atk: 0.2, regen: 2, defense: 0.4, critDamage: 1.4 }, acc: 400 };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Anti-personnel Laser's (and Siege Laser's)
 * more DMG and the boss's more magical damage taken; Wide-area Cannon's slowing and Focused Fire's share off its cooldown and
 * mana on a crit; the Siege Weapon's more DMG and the most its crits lower the boss's M.DEF; Essence's more DEF, and her crit DMG.
 */
const UT = {
  lens: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], takes: 1.25, lasts: 10 },
  recorder: { dmg: 0.5, slow: [100, 120, 140, 170, 210, 250], lasts: 10, sooner: [0.02, 0.024, 0.029, 0.035, 0.042, 0.05], mana: 150 },
  power: { dmg: 0.5, defense: 0.01, most: [20, 24, 29, 35, 42, 50] },
  drawing: { more: 0.5, critDamage: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
};

const art = skillArt('kara');

const ESSENCE_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Essence of Technomagic', about: `Passive. Each of her blows gains her ${ESSENCE.mana} mana. [Anti-personnel Weapon]: DEF +${num(Math.round(ESSENCE.defense * ESSENCE.books))}. [Siege Weapon]: ${pct(SIEGE.boss)} more to the boss, ${pct(SIEGE.taken - 1)} more taken, immune to CC.`, icon: '⚙️', art: art(3) },
  words: `While in [Anti-personnel Weapon] mode, increases All DEF by ${num(Math.round(ESSENCE.defense * ESSENCE.books))}, and while in [Siege Weapon] mode, increases DMG against bosses by ${pct(SIEGE.boss)}, takes ${pct(SIEGE.taken - 1)} increased DMG from enemies, and gains Immunity to CC. Dealing DMG to an enemy recovers ${ESSENCE.mana} Mana each hit.`,
};
const ANTI: Buff = { name: 'Anti-personnel Weapon', about: 'DEF higher.', icon: '🛡️', art: art(3) };
const SIEGED: Buff = { name: 'Siege Weapon', about: 'Deals more to the boss and takes more; immune to CC; her attack the siege gun.', icon: '🎯', art: art(2) };

/** Her skills in the [Siege Weapon]: in Anti-personnel Laser's and Wide-area Cannon's places, and Release Siege Weapon's (turning back). */
const SIEGE_SKILLS: readonly Ability[] = [
  {
    name: 'Siege Laser',
    about: `A great blow, its crit DMG ${pct(SIEGE_LASER.critDamage)} higher.`,
    words: `Attacks the target inflicting ${dmg('mechanic', SIEGE_LASER.blow, bookDmg('kara', 0))} M.DMG. Crit DMG is applied ${pct(SIEGE_LASER.critDamage)} higher.`,
    icon: '🔆',
    art: art(0),
    move: 'sieglaser',
    cooldown: 11,
    cost: 3,
  },
  {
    name: 'Focused Fire',
    about: `Fifteen blows, each a stack of Focused Fire on the boss for ${FOCUSED.lasts} seconds (up to ${FOCUSED.most}); each stack every blow of it the harder.`,
    words: `Attacks a random target 15 times, inflicting a total of ${dmg('mechanic', FOCUSED.blow * 15, bookDmg('kara', 1))} M.DMG, and inflicts Focused Fire for ${FOCUSED.lasts} seconds. Inflicts ${dmg('mechanic', FOCUSED.stack, bookDmg('kara', 1))} extra M.DMG with each stack of Focused Fire on the enemy. Focused Fire can be stacked up to ${FOCUSED.most} times.`,
    icon: '🎯',
    art: art(1),
    move: 'focused',
    cooldown: 22,
    cost: 4,
  },
  {
    name: 'Release Siege Weapon',
    about: 'Back to the [Anti-personnel Weapon].',
    words: 'Returns to Anti-personnel Weapon mode.',
    icon: '🛡️',
    art: art(2),
    move: 'unsiege',
    cooldown: 0,
    cost: 0,
  },
];

export const KARA: HeroDef = {
  id: 'kara',
  name: 'Kara',
  class: 'mechanic',
  skins: ['Kara'],
  // A mechanic whose blows are magical: as her class stands, otherwise.
  stats: { ...CLASS_STATS.mechanic, deals: 'magical' },
  abilities: [
    {
      name: 'Anti-personnel Laser',
      about: `Four blows that knock the boss back a moment, and a last that knocks it down for ${LASER.down} seconds.`,
      words: `Attacks the target 4 times, dealing a total of ${dmg('mechanic', LASER.blow * 4, bookDmg('kara', 0))} M.DMG and inflicting Knockback. Attacks all enemies with the last blow, dealing ${dmg('mechanic', LASER.last, bookDmg('kara', 0))} M.DMG and blowing them away for ${LASER.down} seconds.`,
      icon: '🔫',
      art: art(0),
      move: 'laser',
      cooldown: 8,
      cost: 2,
    },
    {
      name: 'Wide-area Cannon',
      about: `Four blows that stun the boss for ${CANNON.stun} seconds.`,
      words: `Attacks a random target and nearby enemies in range 4 times, inflicting a total of ${dmg('mechanic', CANNON.blow * 4, bookDmg('kara', 1))} M.DMG and stunning them for ${CANNON.stun} seconds.`,
      icon: '💥',
      art: art(1),
      move: 'barrage',
      cooldown: 14,
      cost: 4,
    },
    {
      name: 'Release Siege Weapon',
      about: 'Into the [Siege Weapon]: her attack the siege gun’s blows, and Siege Laser and Focused Fire in place of her others. Used again, back.',
      words: `Kara turns into Siege Weapon mode and attacks the enemy, inflicting ${dmg('mechanic', SIEGE.blow, bookDmg('kara', 2))} M.DMG with each hit. When in Siege Weapon mode, changes Anti-personnel Laser and Wide-area Cannon skills to Siege Laser and Focused Fire skills. When the skill is used again, returns to Anti-personnel Weapon mode.`,
      icon: '🎯',
      art: art(2),
      move: 'siege',
      cooldown: 0,
      cost: 2,
    },
  ],
  passive: ESSENCE_SHOWN,
  treasures: [
    treasure('Optical Lens - MF002', (k) => ({
      words: `[Anti-personnel Laser] Increases DMG by ${pct(k(UT.lens.dmg))} and for ${UT.lens.lasts} sec, increases M.DMG target receives by ${pct(UT.lens.takes - 1)}. [Siege Laser] Increases DMG by ${pct(k(UT.lens.dmg))} and ignores target's P.Block and M.Block.`,
      skill: { index: 0, dmg: 1 + k(UT.lens.dmg), mark: { name: 'Optical Lens - MF002', lasts: UT.lens.lasts, takes: { magical: UT.lens.takes } } },
    })),
    treasure('Recording Device KARA-00XX', (k) => ({
      words: `[Wide-area Cannon] Increases DMG by ${pct(UT.recorder.dmg)} and reduces ATK Spd of the target by ${k(UT.recorder.slow)} for ${UT.recorder.lasts} sec. [Focused Fire] Reduces Cooldown by ${pct(k(UT.recorder.sooner))} upon a Crit Hit and recovers ${UT.recorder.mana} Mana.`,
      skill: { index: 1, dmg: 1 + UT.recorder.dmg, slow: { points: k(UT.recorder.slow), lasts: UT.recorder.lasts } },
    })),
    treasure('Ancient Power Source', (k) => ({
      words: `[Release Siege Weapon] Increases DMG by ${pct(UT.power.dmg)} and decreases the target's M.DEF by ${pct(UT.power.defense)} upon a Crit Hit. M.DEF Reduction Effect can be stacked up to ${k(UT.power.most)} times.`,
    })),
    treasure('Drawing of Ancient Research', (k) => ({
      words: `[Essence of Technomagic] Increases ATK and DEF boost by ${pct(UT.drawing.more)}. Crit DMG of self is increased by ${pct(k(UT.drawing.critDamage))}.`,
      bonus: { critDamage: k(UT.drawing.critDamage) },
    })),
  ],
  perks: {
    's1-light': { words: `[Anti-personnel Laser] - Recovers ${PERKS.mana} MP upon a Crit Hit.\n[Siege Laser] - Increases Mana Cost by 1 and DMG by ${pct(PERKS.laser - 1)}.` },
    's1-dark': { words: "[Anti-personnel Laser] - Reduces 300 MP of the enemy that took the DMG.\n[Siege Laser] - Reduces Mana Cost by 1." },
    's2-light': { words: `[Wide-area Cannon] - Increases the Stun duration by ${PERKS.stun} second.\n[Focused Fire] - Stacks 1 additional Focused Fire.` },
    's2-dark': said({ skill: { index: 1, cost: -1 } }, ({ skill }) => `[Wide-area Cannon] - Reduces Mana Cost by ${-skill.cost}.\n[Focused Fire] - Increases the Max Stack of Focused Fire to ${PERKS.most}.`),
    's3-light': { words: 'Increases DMG by 100% when there is only 1 enemy.' },
    's3-dark': { words: `Reduces all skill cooldown by ${pct(PERKS.sooner)} upon a Crit Hit.` },
    's4-light': { words: 'Mana Recovery triples when there is only 1 enemy.' },
    's4-dark': { words: `[Anti-personnel Weapon] - Decreases ATK by ${pct(PERKS.dark.atk)}, but increases Mana Recovery/Sec by ${pct(PERKS.dark.regen - 1)}.\n[Siege Weapon] - Decreases all DEF by ${pct(1 - PERKS.dark.defense)}, but increases Crit DMG by ${pct(PERKS.dark.critDamage)}.` },
    't5-light': t5Light({ critDamage: 0.2 }, ({ critDamage }) => `Crit DMG +${pct(critDamage)}`),
    't5-dark': { words: `[Anti-personnel Weapon] - Increases CC ACC by ${PERKS.acc}.\n[Siege Weapon] - Increases ACC by ${PERKS.acc}.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /** In the [Siege Weapon]; Focused Fire's stacks on the boss, and how long they last yet; Ancient Power Source's stacks; her unique weapon's stacks, and toward the next. */
    let siege = false;
    let focused = 0;
    let focusLeft = 0;
    let lowered = 0;
    let shattered = 0;
    let next = 0;
    /** Her skills in the [Siege Weapon], as her perks change them (Siege Laser's costs: its Light more, its Dark less). */
    const siegeSkills: Ability[] = SIEGE_SKILLS.map((one, i) => (i === 0 ? { ...one, cost: one.cost + (self.perks.has('s1-light') ? 1 : 0) - (self.perks.has('s1-dark') ? 1 : 0) } : one));
    const most = self.perks.has('s2-dark') ? PERKS.most : FOCUSED.most;
    const drawing = wearsTreasure(self, 3) ? 1 + UT.drawing.more : 1;
    const powered = wearsTreasure(self, 2) ? 1 + UT.power.dmg : 1;

    /** Her mode's own, on her for good: its DEF, or its more to the boss and taken (and her perks' with each). */
    const mode = (): void => {
      self.statuses = self.statuses.filter((status) => status.name !== ANTI.name && status.name !== SIEGED.name);
      const dark = self.perks.has('s4-dark');
      const acc = self.perks.has('t5-dark') ? PERKS.acc : 0;
      if (!siege) {
        const defense = ESSENCE.defense * ESSENCE.books * drawing;
        put(self.statuses, { name: ANTI.name, left: Infinity, bolsters: { physical: defense, magical: defense }, ...(dark && { atk: -PERKS.dark.atk, mana: PERKS.dark.regen }), ...(acc && { accuracy: acc }), shown: ANTI });
      } else
        put(self.statuses, {
          name: SIEGED.name,
          left: Infinity,
          deals: 1 + SIEGE.boss,
          takes: SIEGE.taken,
          guards: true,
          ...(dark && { defends: PERKS.dark.defense, critDamage: PERKS.dark.critDamage }),
          ...(acc && { acc }),
          shown: SIEGED,
        });
    };
    mode();
    /** A blow of hers: Essence of Technomagic's mana (its Light: more). */
    const strike = (amount: number, counted = true): boolean => {
      const critical = fight.hit(self, amount, counted);
      self.mana = Math.min(MAX_MANA, self.mana + (self.perks.has('s4-light') ? PERKS.essence : ESSENCE.mana));
      return critical;
    };

    return {
      lands: {
        // Her attack; in the [Siege Weapon], the siege gun's two blows in its place (its Light: harder; its Dark: a critical one, her cooldowns shorter; Ancient Power Source: harder, and a critical one, the boss's M.DEF lower).
        attack() {
          if (!siege) {
            strike(fight.basic);
            return;
          }
          for (let i = 0; i < 2; i++) {
            const critical = strike(SIEGE.blow * powered * (self.perks.has('s3-light') ? 2 : 1));
            if (!critical) continue;
            if (self.perks.has('s3-dark')) self.cooldowns = self.cooldowns.map((left, j) => Math.max(0, left - (self.abilities[j]?.cooldown ?? 0) * PERKS.sooner));
            if (wearsTreasure(self, 2) && lowered < fromTreasure(self, 2, UT.power.most)) {
              lowered++;
              put(fight.foe.statuses, { name: 'Ancient Power Source', left: Infinity, count: lowered, defends: { magical: 1 - UT.power.defense * lowered }, shown: 'curse' });
            }
          }
        },
        // Four blows that knock the boss back, and a last that knocks it down (its Light: a critical one, mana).
        laser(part) {
          const critical = strike(part < 4 ? LASER.blow : LASER.last);
          fight.stun(part < 4 ? LASER.back : LASER.down, { down: true, by: self });
          if (critical && self.perks.has('s1-light')) self.mana = Math.min(MAX_MANA, self.mana + PERKS.mana);
        },
        // Four blows that stun the boss (its Light: longer).
        barrage() {
          strike(CANNON.blow);
          fight.stun(CANNON.stun + (self.perks.has('s2-light') ? PERKS.stun : 0), { by: self });
        },
        // A great blow, its crits harder (Anti-personnel Laser's Light: harder still; Optical Lens: harder).
        sieglaser() {
          put(self.statuses, { name: 'Siege Laser', left: 0.01, critDamage: SIEGE_LASER.critDamage, shown: SIEGED });
          strike(SIEGE_LASER.blow * (self.perks.has('s1-light') ? PERKS.laser : 1) * (1 + fromTreasure(self, 0, UT.lens.dmg)));
          self.statuses = self.statuses.filter((status) => status.name !== 'Siege Laser');
        },
        // Three blows, each a stack of Focused Fire (its Light: two), each stack every blow harder (Recording Device: a critical one, its cooldown shorter and mana).
        focused() {
          for (let i = 0; i < FOCUSED.each; i++) {
            const critical = strike(FOCUSED.blow + FOCUSED.stack * focused);
            focused = Math.min(most, focused + (self.perks.has('s2-light') ? PERKS.stacks : 1));
            focusLeft = FOCUSED.lasts;
            put(fight.foe.statuses, { name: 'Focused Fire', left: FOCUSED.lasts, count: focused, shown: 'curse' });
            if (critical && wearsTreasure(self, 1)) {
              self.cooldowns[1] = (self.cooldowns[1] ?? 0) * (1 - fromTreasure(self, 1, UT.recorder.sooner));
              self.mana = Math.min(MAX_MANA, self.mana + UT.recorder.mana);
            }
          }
        },
      },
      // In the [Siege Weapon], her other skills in her skills' places.
      slot: (index) => (siege ? (siegeSkills[index] ?? null) : (self.abilities[index] ?? null)),
      used(index) {
        if (index !== 2) return;
        siege = !siege;
        mode();
      },
      // (Auto keeps her in the [Siege Weapon] once she is one.)
      ripe: (index) => !(siege && index === 2),
      tick(dt) {
        if (focusLeft > 0) {
          focusLeft -= dt;
          if (focusLeft <= 0) focused = 0;
        }
        // Her unique weapon: her ATK higher every second, up to its most.
        if (tier !== null && shattered < atTier(SHATTERER.most, tier)) {
          next += dt;
          if (next >= 1) {
            next -= 1;
            shattered++;
            put(self.statuses, { name: SHATTERER_UP.name, left: Infinity, count: shattered, atk: SHATTERER.atk * shattered, shown: SHATTERER_UP });
          }
        }
      },
      guards: () => siege,
      lit: () => siege,
    };
  },
};
