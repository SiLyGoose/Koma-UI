import { share } from '../combat/damage';
import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { BLOW } from '../rules';
import { num, pct, skillArt, type Buff } from '../shown';
import { atTier, NOTOS, NOTOS_UP } from '../unique';
import { CLASS_STATS, dmg, indexed, type HeroDef, type Passive } from './kit';
import { CODED } from './moves';

/*
 * Selene's skills, as the game has them (what each costs, how long before it can be used again, and her passive's ATK
 * and crit chance are the game's; how hard each hits, and how long Moonlight Flash knocks the boss down, are not said
 * there). She is the first archer.
 * - Arrow Rain: twelve arrows at the boss.
 * - Rush: five arrows that launch at the boss.
 * - Moonlight Flash: an arrow the harder the more of the boss's health is left, that knocks it down; and against a
 *   boss, a blow more through its defense.
 * Her passive, Moonlight Arrow: each attack of hers raises her ATK and crit chance for 10 seconds (up to 3 times over).
 * (kingsraid.shodyra.com's page for her says 1 second, its hero list 10: 10 here, for it to stack at all.)
 * Her unique weapon (../unique.ts) is worked here too: a critical blow quickens her for a while, and meanwhile her
 * attack shoots an arrow more.
 * What is drawn for each is ../../heroes/selene/fx.ts; what her body does for each, and for her attack, ../../heroes/selene/moves.ts.
 *
 * Her own perks (../perks.ts) are King's Raid's. Rush's Light always holds (there is only the boss). Moonlight Flash's
 * Dark does nothing here (the boss doesn't block), nor Moonlight Arrow's (there is nowhere further to reach).
 */
// (How hard each of her skills hits is the King's Raid Index's, at her class's ATK: ./kit.ts's indexed.)
const ARROW = { blow: BLOW * 1.3 };
/** Her arrow when she draws it as her attack's animation has it (quicker than as written in code): her attack about as hard over time. */
const DRAWN = { blow: BLOW * 1.06 };
// (As many arrows as its move has.)
const RAIN = { arrows: CODED.rain.lands.length, blow: indexed('archer', 617_748) / CODED.rain.lands.length };
const RUSH = { arrows: CODED.rush.lands.length, blow: indexed('archer', 112_278) };
/** Its arrow at most (with the boss's health whole), knocking it down, and its blow more against a boss, through its defense. */
const FLASH = { most: indexed('archer', 657_142), down: 3, boss: indexed('archer', 657_142) / 2 };
/** Moonlight Arrow: her ATK and crit chance (points) more for each stack, for `lasts` seconds, up to `most`. */
const MOON = { atk: 5056, crit: 100, lasts: 10, most: 3 };
/** Her own perks' numbers: Arrow Rain's stun (its chance), Rush's flinch, and Moonlight Arrow's most stacks. */
const PERKS = { stun: { chance: 0.2, lasts: 2 }, flinch: 0.5, most: 5 };

const art = skillArt('selene');

const MOONLIGHT_ARROW: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Moonlight Arrow',
    about: `Passive. Each attack of hers gives her +${num(MOON.atk)} ATK and +${MOON.crit} crit chance for ${MOON.lasts} seconds (up to ${MOON.most} times).`,
    icon: '🌙',
    art: art(3),
  },
  words: `Upon attacking, increases ATK by ${num(MOON.atk)} and Crit Chance by ${MOON.crit} for ${MOON.lasts} sec. This effect stacks up to ${MOON.most} times.`,
};
/** Moonlight Arrow's stacks: shown on her card. */
const MOONLIT: Buff = { name: 'Moonlight Arrow', about: 'ATK and crit chance higher for each.', icon: '🌙', art: art(3) };

export const SELENE: HeroDef = {
  id: 'selene',
  name: 'Selene',
  class: 'archer',
  skins: ['Selene'],
  // An archer (her blows physical): as her class stands.
  stats: { ...CLASS_STATS.archer, deals: 'physical' },
  abilities: [
    {
      name: 'Arrow Rain',
      about: `${RAIN.arrows} arrows at the boss.`,
      words: `Shoots ${RAIN.arrows} arrows to random enemies and deals a total of ${dmg('archer', RAIN.blow * RAIN.arrows)} P.DMG.`,
      icon: '🏹',
      art: art(0),
      move: 'rain',
      cooldown: 8,
      cost: 3,
    },
    {
      name: 'Rush',
      about: `${RUSH.arrows} arrows that launch at the boss.`,
      words: `Upon attacking, summons ${RUSH.arrows} arrows that launch towards the enemy. Each arrow deals ${dmg('archer', RUSH.blow)} P.DMG.`,
      icon: '💨',
      art: art(1),
      move: 'rush',
      cooldown: 6,
      cost: 1,
    },
    {
      name: 'Moonlight Flash',
      about: `An arrow the harder the more of the boss’s health is left, knocking it down for ${FLASH.down} seconds, and a blow more through its defense.`,
      words: `Fires an arrow in a straight line, dealing P.DMG to all enemies in range based on the target's remaining HP. Deals a maximum of ${dmg('archer', FLASH.most)} P.DMG and knocks down the target. Against Bosses, deals additional ${dmg('archer', FLASH.boss)} P.DMG that ignores DEF.`,
      icon: '🌕',
      art: art(2),
      move: 'flash',
      cooldown: 20,
      cost: 4,
    },
  ],
  passive: MOONLIGHT_ARROW,
  perks: {
    's1-light': said({ skill: { index: 0, dmg: 1.4 } }, ({ skill }) => `DMG is increased by ${pct(skill.dmg - 1)}.`),
    's1-dark': { words: `There is a ${pct(PERKS.stun.chance)} chance to inflict Stun for ${PERKS.stun.lasts} sec.` },
    's2-light': said({ skill: { index: 1, whole: true } }, () => 'Ignores DEF when there is only 1 enemy.'),
    's2-dark': { words: `Makes the enemy flinch for ${PERKS.flinch} sec.` },
    's3-light': said({ skill: { index: 2, cooldown: -3 } }, ({ skill }) => `Reduces cooldown by ${-skill.cooldown} sec.`),
    's3-dark': { words: 'Ignores enemy Block.' },
    's4-light': { words: `Max stack number is changed to ${PERKS.most}.` },
    's4-dark': { words: 'Auto attack range is boosted by 20%.' },
    't5-light': t5Light({ critDamage: 0.2 }, ({ critDamage }) => `Crit DMG +${pct(critDamage)}`),
    't5-dark': said({ bonus: { crit: -300, critDamage: 1.5 } }, ({ bonus }) => `Reduces own Crit Chance by ${-bonus.crit} and increases Crit DMG by ${pct(bonus.critDamage)}.`),
  },
  attack: 'arrow',
  // Her animations: an arrow drawn and aimed, loosed as it ends; and for her skills a bow overdrawn, loosed as each
  // lands its first (Arrow Rain's arrows falling after hers, shot up into the sky; Rush's launching after hers).
  timing: {
    attack: [{ lands: [0.98], until: 1.03 }],
    skills: {
      rain: { lands: Array.from({ length: RAIN.arrows }, (_, i) => 1 + i * 0.08), until: 2.1 },
      rush: { lands: Array.from({ length: RUSH.arrows }, (_, i) => 1 + i * 0.1), until: 1.6 },
      flash: { lands: [1.45], until: 1.6 },
    },
  },
  join(fight, self) {
    /** Moonlight Arrow's stacks (its Light: more of them), and how long they last yet; how long her unique weapon quickens her yet. */
    const most = self.perks.has('s4-light') ? PERKS.most : MOON.most;
    let moon = 0;
    let moonLeft = 0;
    let notos = 0;
    const tier = self.unique?.tier ?? null;

    /** A blow of hers: a critical one, with her unique weapon, quickens her for a while. */
    const shoot = (amount: number, whole = false): boolean => {
      const critical = fight.hit(self, amount, true, 0, whole);
      if (critical && tier !== null) notos = NOTOS.lasts;
      return critical;
    };
    /** Her ATK and crit chance for her Moonlight Arrow's stacks. */
    const moonlit = (): void => {
      put(self.statuses, { name: MOONLIT.name, left: MOON.lasts, count: moon, deals: 1 + (MOON.atk * moon) / self.stats.atk, crit: share(MOON.crit * moon), shown: MOONLIT });
    };

    /** Her attack: an arrow, a stack of Moonlight Arrow (all of them begun again); with her unique weapon quickening her, an arrow more. */
    const loose = (amount: number): void => {
      shoot(amount);
      moon = Math.min(most, moon + 1);
      moonLeft = MOON.lasts;
      moonlit();
      if (notos > 0 && tier !== null) fight.hit(self, atTier(NOTOS.arrow, tier), false);
    };

    return {
      lands: {
        // Her attack: an arrow, as written in code; or as her animation for it has it.
        arrow: () => loose(ARROW.blow),
        attack: () => loose(DRAWN.blow),
        // Each arrow (its Dark: now and then the boss stunned).
        rain() {
          shoot(RAIN.blow);
          if (self.perks.has('s1-dark') && fight.roll() < PERKS.stun.chance) fight.stun(PERKS.stun.lasts, { by: self });
        },
        // Each arrow (its Dark: the boss flinching).
        rush() {
          shoot(RUSH.blow);
          if (self.perks.has('s2-dark')) fight.stun(PERKS.flinch, { by: self });
        },
        // The harder the more of the boss's health is left; it is knocked down; and a blow more through its defense.
        flash() {
          shoot(FLASH.most * (fight.foe.hp / fight.foe.maxHp));
          fight.stun(FLASH.down, { down: true, by: self });
          shoot(FLASH.boss, true);
        },
      },
      tick(dt) {
        notos = Math.max(0, notos - dt);
        if (moonLeft > 0) {
          moonLeft -= dt;
          if (moonLeft <= 0) moon = 0;
        }
      },
      speed: () => (notos > 0 && tier !== null ? atTier(NOTOS.speed, tier) : 0),
      lit: () => moon >= most,
      buffs: () => (notos > 0 ? [{ ...NOTOS_UP, left: notos }] : []),
    };
  },
};
