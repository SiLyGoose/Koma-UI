import { put, type Status } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, treasureTier } from '../treasures';
import { BLOW } from '../rules';
import { pct, skillArt, type Buff } from '../shown';
import { AEA, AEA_UP, atTier } from '../unique';
import { CLASS_STATS, dmg, type Ability, type HeroDef, type Passive } from './kit';

/*
 * Dark Lord Kasel's skills, as the game has them (how long before each can be used again, the [Dark Energy] each needs,
 * and how long what it does lasts are the game's; how hard each hits, and how much One Fallen to Darkness raises his
 * ATK, are not said there). He is a warrior, the Corrupted Warrior of the Holy Sword.
 * His passive, One Fallen to Darkness: he has no mana (his bar stays empty); his skills cost none, but each can be used
 * only with so many stacks of [Dark Energy] on him (up to 40), which each blow of his attack gives him. His ATK is
 * higher. (The game's has his blows always hit: Galgoria dodges nothing.)
 * - Judgment Blade: two blows (the game's also stop the boss recovering mana: it has none).
 * - Doom: three blows that knock the boss down.
 * - Advent of the Dark Lord: what the boss has left on him cleared, a blow, and the [Dark Lord] state for a while: all
 *   his [Dark Energy] spent for ATK and penetration, each skill a blow more (Judgment Blade's knocking the boss down),
 *   nothing knocks him down, and each blow of his attack a blow more.
 * His unique weapon (../unique.ts) is worked here too: each blow of his leaves the boss healed less for a while (up to so
 * many times over), and may deal a blow more.
 * What is drawn for each is ../../heroes/dark-lord-kasel/fx.ts; what his body does for each, and for his attack, ../../heroes/dark-lord-kasel/moves.ts.
 *
 * His own perks (../perks.ts) are King's Raid's. Judgment Blade's Dark (the boss kept from mana the longer) does nothing
 * here: it has none. Doom's Dark stuns rather than knocking the boss down: it is stunned as long. Advent of the Dark
 * Lord's Light's P.Block does nothing: Galgoria deals only magic. One Fallen to Darkness's Dark (2 stacks more with one
 * enemy) always holds.
 */
// (How hard each of his skills hits: the King's Raid Index hasn't him, so ×3.34 what it was, as the other warriors' went to theirs from it.)
const CORRUPT = { blow: BLOW * 0.6 };
/** Judgment Blade: its two blows, and in the [Dark Lord] state its blow more and how long that knocks the boss down. */
const JUDGE = { blow: 6010, lord: 8350, down: 3 };
/** Doom: its three blows, how long they knock the boss down, and in the [Dark Lord] state its blow more. */
const RUIN = { blow: 5010, down: 3, lord: 10_020 };
/** Advent of the Dark Lord: its blow; the state's seconds, its attack's blow more, and the ATK (a share) and penetration (points) each stack spent gives. */
const ADVENT = { blow: 10_020, lasts: 20, blowMore: 2000, atk: 0.01, pen: 10 };
/** One Fallen to Darkness: his ATK more (a share), the stacks each skill needs, the most, and what each blow of his attack gives. */
const FALLEN = { atk: 0.25, needs: [5, 15, 25], most: 40, each: 1 };
/** His own perks' numbers: Judgment Blade's Light, Doom's Light, Advent's Dark, One Fallen to Darkness's Light and Dark, and Transcend 5's Dark. */
const PERKS = { judge: { needs: 10, dmg: 1.8 }, doom: { takes: 1.3, lasts: 10 }, attack: 1.5, start: 10, more: 2, dark: { atk: 0.01, dmg: 0.01, lasts: 20, most: 30 } };

/**
 * His unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own, its 3★ 34% among them): Judgment Blade's
 * DMG; Doom's DMG; the [Dark Lord] state's more DMG to the boss and crit DMG; and One Fallen to Darkness's more [Dark
 * Energy] at most, and the chance of a stack more for each blow of his attack.
 */
const UT = {
  authority: { dmg: [0.24, 0.29, 0.34, 0.42, 0.5] },
  lifeforce: { dmg: [0.24, 0.29, 0.35, 0.42, 0.5], pulled: 2 },
  portrait: { dmg: [0.14, 0.17, 0.21, 0.25, 0.3], critDamage: 0.8 },
  tear: { most: [64, 69, 75, 82, 90], chance: 0.35 },
};

const art = skillArt('dark-lord-kasel');

const ONE_FALLEN: Passive = {
  attack: 1 + FALLEN.atk,
  crit: 0,
  control: 1,
  shown: {
    name: 'One Fallen to Darkness',
    about: `Passive. No mana: each skill needs stacks of [Dark Energy] instead (up to ${FALLEN.most}), which each blow of his attack gives him. ATK +${pct(FALLEN.atk)}.`,
    icon: '🌑',
    art: art(3),
  },
  words: `Although Dark Lord Kasel cannot recover Mana since he is granted the power of Darkness, his ATK increases, deals attacks that always hit, and requires [Dark Energy] stacks to use Skills. Normal attacks grant [Dark Energy] stacks. [Dark Energy] can be stacked up to max ${FALLEN.most} times and is irremovable.`,
};
/** His [Dark Energy]; the [Dark Lord] state; Transcend 5's Dark's stacks. */
const ENERGY: Buff = { name: 'Dark Energy', about: 'What his skills need.', icon: '🌑', art: art(3) };
const LORD: Buff = { name: 'Dark Lord', about: 'ATK and penetration higher, skills enhanced, immune to CC, and his attack deals more.', icon: '😈', art: art(2) };
const DARKENED: Buff = { name: 'Darkness', about: 'ATK and DMG on the boss higher for each.', icon: '🖤', art: art(3) };

export const DARK_LORD_KASEL: HeroDef = {
  id: 'dark-lord-kasel',
  name: 'Dark Lord Kasel',
  class: 'warrior',
  skins: ['Dark Lord Kasel'],
  // A warrior (his blows physical): as his class stands.
  stats: { ...CLASS_STATS.warrior, deals: 'physical' },
  abilities: [
    {
      name: 'Judgment Blade',
      about: `Two blows. [Dark Lord]: a blow more that knocks the boss down for ${JUDGE.down} seconds. Needs ${FALLEN.needs[0]} [Dark Energy].`,
      words: `Attacks frontal enemies in a straight line 2 times, dealing ${dmg('warrior', JUDGE.blow)} P.DMG each and preventing enemies from recovering Mana for 2 seconds. [Dark Lord] Additionally attacks enemies in a wide range 1 time, dealing ${dmg('warrior', JUDGE.lord)} P.DMG and knocking them down for ${JUDGE.down} seconds. Requires ${FALLEN.needs[0]} or more stacks of [Dark Energy] for use.`,
      tag: `${FALLEN.needs[0]} Dark Energy`,
      icon: '⚔️',
      art: art(0),
      move: 'judge',
      cooldown: 11,
      cost: 0,
    },
    {
      name: 'Doom',
      about: `Three blows that knock the boss down for ${RUIN.down} seconds. [Dark Lord]: a blow more. Needs ${FALLEN.needs[1]} [Dark Energy].`,
      words: `Explodes darkness and attacks frontal enemies in a straight line 3 times, dealing ${dmg('warrior', RUIN.blow)} P.DMG each and knocking them away for ${RUIN.down} seconds. [Dark Lord] Deals ${dmg('warrior', RUIN.lord)} P.DMG to 1 enemy furthest away and pulls them in front of self, exploding darkness afterward. Can be used with ${FALLEN.needs[1]} or more stacks of [Dark Energy].`,
      tag: `${FALLEN.needs[1]} Dark Energy`,
      icon: '💥',
      art: art(1),
      move: 'ruin',
      cooldown: 15,
      cost: 0,
    },
    {
      name: 'Advent of the Dark Lord',
      about: `What the boss has left on him cleared, a blow, and [Dark Lord] for ${ADVENT.lasts} seconds: all his [Dark Energy] spent, each +${pct(ADVENT.atk)} ATK and +${ADVENT.pen} penetration; his skills enhanced, immune to CC, and his attack deals more. Needs ${FALLEN.needs[2]} [Dark Energy].`,
      words: `Dispels negative effects from self and enters into an irremovable [Dark Lord] state for ${ADVENT.lasts} sec, dealing ${dmg('warrior', ADVENT.blow)} P.DMG to nearby enemies in a circular range of self. During [Dark Lord] state, all Skills are enhanced, gains immunity to CC, and normal attacks deal additional ${dmg('warrior', ADVENT.blowMore)} P.DMG each hit. Requires ${FALLEN.needs[2]} or more stacks of [Dark Energy] for use. Upon use, consumes all stacks to increase own ATK, and DEF Penetration by ${ADVENT.pen} per stack.`,
      tag: `${FALLEN.needs[2]} Dark Energy`,
      icon: '😈',
      art: art(2),
      move: 'advent',
      cooldown: 25,
      cost: 0,
    },
  ],
  passive: ONE_FALLEN,
  treasures: [
    treasure('Authority of Corruption', (k) => ({
      words: `[Judgment Blade] Increases DMG by ${pct(k(UT.authority.dmg))} and dispels positive effects from the target.`,
      skill: { index: 0, dmg: 1 + k(UT.authority.dmg), dispel: true },
    })),
    treasure('Faint Lifeforce', (k) => ({
      words: `[Doom] Increases DMG by ${pct(k(UT.lifeforce.dmg))} and changes the number of pulled enemies to ${UT.lifeforce.pulled} during [Dark Lord] state.`,
      skill: { index: 1, dmg: 1 + k(UT.lifeforce.dmg) },
    })),
    treasure('Traveler’s Portrait', (k) => ({
      words: `[Advent of the Dark Lord] Increases DMG dealt to Non-Hero enemies by ${pct(k(UT.portrait.dmg))} and Crit DMG by ${pct(UT.portrait.critDamage)} during [Dark Lord] state.`,
    })),
    treasure('Twisted Tear', (k) => ({
      words: `[One Fallen to Darkness] Changes the max number of stacks to ${k(UT.tear.most)}, and normal attacks have a ${pct(UT.tear.chance)} chance of stacking 1 additional stack of [Dark Energy].`,
    })),
  ],
  attack: 'corrupt',
  perks: {
    's1-light': said({ skill: { index: 0, dmg: PERKS.judge.dmg } }, ({ skill }) => `Increases number of Dark Energy stacks required for use by ${PERKS.judge.needs} and increases DMG by ${pct(skill.dmg - 1)}.`),
    's1-dark': { words: 'Increases the duration of disabling Mana recovery by 2 sec.' },
    's2-light': said(
      { skill: { index: 1, mark: { name: 'Doom', takes: { physical: PERKS.doom.takes }, lasts: PERKS.doom.lasts } } },
      ({ skill }) => `Increases P.DMG the hit targets take by ${pct(PERKS.doom.takes - 1)} for ${skill.mark.lasts} sec.`,
    ),
    's2-dark': { words: 'Inflicts Stun on enemies instead of knocking them away.' },
    's3-light': { words: 'Increases P.Block Chance by 400 for the duration of Skill.' },
    's3-dark': { words: `Increases DMG of normal attacks by ${pct(PERKS.attack - 1)} for the duration of Skill.` },
    's4-light': { words: `At the beginning of each battle, gains ${PERKS.start} stacks of [Dark Energy].` },
    's4-dark': { words: `When there is 1 enemy, gains ${PERKS.more} additional stacks of [Dark Energy].` },
    't5-light': t5Light({ critDamage: 0.2 }, ({ critDamage }) => `Crit DMG +${pct(critDamage)}`),
    't5-dark': { words: `Normal attacks increase own ATK by ${pct(PERKS.dark.atk)} and DMG dealt to bosses by ${pct(PERKS.dark.dmg)} for ${PERKS.dark.lasts} sec. This effect can be stacked up to max ${PERKS.dark.most} times and is irremovable.` },
  },
  join(fight, self) {
    /** His [Dark Energy]; how long the [Dark Lord] state lasts yet, and the stacks it spent; Transcend 5's Dark's stacks, and how long they last yet; the boss's healing lowered by his unique weapon. */
    let energy = self.perks.has('s4-light') ? PERKS.start : 0;
    let lord = 0;
    let spent = 0;
    let dark = 0;
    let darkLeft = 0;
    let unhealed = 0;
    const tier = self.unique?.tier ?? null;
    // (Twisted Tear: more [Dark Energy] at most.)
    const most = fromTreasure(self, 3, UT.tear.most, FALLEN.most);
    const needs = (index: number): number => (FALLEN.needs[index] ?? 0) + (index === 0 && self.perks.has('s1-light') ? PERKS.judge.needs : 0);

    /** His [Dark Energy] on his card (it can't be dispelled). */
    const shown = (): void => put(self.statuses, { name: ENERGY.name, left: Infinity, count: energy, shown: ENERGY });
    shown();
    /** A blow of his: in the [Dark Lord] state, through the penetration its stacks gave; with his unique weapon, the boss healed less for a while, and now and then a blow more. */
    const strike = (amount: number): void => {
      fight.hit(self, amount, true, lord > 0 ? ADVENT.pen * spent : 0);
      if (tier === null) return;
      unhealed = Math.min(AEA.most, unhealed + 1);
      put(fight.foe.statuses, { name: AEA.name, left: AEA.lasts, count: unhealed, heals: 1 - atTier(AEA.heals, tier) * unhealed, shown: 'curse' });
      if (fight.roll() < AEA.chance) fight.hit(self, atTier(AEA.blow, tier), false);
    };

    return {
      lands: {
        // A blow of his attack: [Dark Energy] (its Dark: more); in the [Dark Lord] state a blow more (its Dark: harder). Transcend 5's Dark: a stack more of it.
        corrupt() {
          const harder = lord > 0 && self.perks.has('s3-dark') ? PERKS.attack : 1;
          strike(CORRUPT.blow * harder);
          if (lord > 0) strike(ADVENT.blowMore * harder);
          // (Twisted Tear: now and then a stack more.)
          const tear = treasureTier(self, 3) > 0 && fight.roll() < UT.tear.chance ? 1 : 0;
          energy = Math.min(most, energy + FALLEN.each + (self.perks.has('s4-dark') ? PERKS.more : 0) + tear);
          shown();
          if (self.perks.has('t5-dark')) {
            dark = Math.min(PERKS.dark.most, dark + 1);
            darkLeft = PERKS.dark.lasts;
            put(self.statuses, { name: DARKENED.name, left: PERKS.dark.lasts, count: dark, deals: (1 + PERKS.dark.atk * dark) * (1 + PERKS.dark.dmg * dark), shown: DARKENED });
          }
        },
        // Two blows; in the [Dark Lord] state a third, that knocks the boss down.
        judge(part) {
          if (part < 2) strike(JUDGE.blow);
          else if (lord > 0) {
            strike(JUDGE.lord);
            fight.stun(JUDGE.down, { down: true, by: self });
          }
        },
        // Three blows, the first knocking the boss down (its Dark: stunning it); in the [Dark Lord] state a fourth.
        ruin(part) {
          if (part < 3) {
            strike(RUIN.blow);
            if (part === 0) fight.stun(RUIN.down, { down: !self.perks.has('s2-dark'), by: self });
          } else if (lord > 0) strike(RUIN.lord);
        },
        advent: () => strike(ADVENT.blow),
      },
      // Each skill only with the [Dark Energy] it needs.
      slot: (index) => (energy >= needs(index) ? (self.abilities[index] ?? null) : null),
      used(index: number, _ability: Ability) {
        if (index !== 2) return;
        // Advent of the Dark Lord: what the boss has left on him cleared, and all his [Dark Energy] spent on the [Dark Lord] state.
        const harmful = (status: Status<Buff>): boolean => status.shown.harmful === true && !status.binds && !status.away;
        self.statuses = self.statuses.filter((status) => !harmful(status));
        spent = energy;
        energy = 0;
        shown();
        lord = ADVENT.lasts;
        // (Traveler's Portrait: more to the boss, and crit DMG, meanwhile.)
        const portrait = treasureTier(self, 2) > 0;
        put(self.statuses, { name: LORD.name, left: ADVENT.lasts, deals: (1 + ADVENT.atk * spent) * (1 + fromTreasure(self, 2, UT.portrait.dmg)), ...(portrait && { critDamage: UT.portrait.critDamage }), shown: LORD });
      },
      tick(dt) {
        // No mana: his bar stays empty.
        self.mana = 0;
        if (lord > 0) lord -= dt;
        if (darkLeft > 0) {
          darkLeft -= dt;
          if (darkLeft <= 0) dark = 0;
        }
        if (!fight.foe.statuses.some((status) => status.name === AEA.name)) unhealed = 0;
      },
      // The [Dark Lord] state: immune to CC.
      guards: () => lord > 0,
      lit: () => lord > 0,
      buffs: () => (tier !== null ? [AEA_UP] : []),
    };
  },
};
