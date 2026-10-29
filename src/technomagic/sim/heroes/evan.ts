import { away, put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { pct, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { atTier, NAAV, NAAV_UP } from '../unique';
import { type Ability, bookDmg, bookHeal, CLASS_STATS, dmg, healed, type HeroDef, type Passive, played, playedHeal } from './kit';

/*
 * Evan's skills, as King's Raid's playtest has them (stats/evan.md: how hard each hits and heals at its level 90, and every
 * number here, are its; its words are its own). He is a priest whose blows are physical, of the Forest of Knowledge, an
 * alchemist of two forms, each skill he uses turning him into the other:
 * - [Alchemist of the Green Evan]: Purification of Life (every ally healed, and healing reaches them more for a while),
 *   Magic Circle of Life (a circle for a while: every ally healed and quicker every second) and Origin of Life (a shield on
 *   every ally, and mana every second while it holds; immune to CC).
 * - [Alchemist of the Dark Evan]: Uproar of Naav Gehen (a blow, the boss taking more physical damage for a while), Naav
 *   Gehen of Gluttony (a blow and a circle for a while: a blow every second, the boss hitting less hard) and Rampage of
 *   Naav Gehen (six blows that stun the boss, and a last that stuns it longer).
 * His passive, Alchemy of Green: as each battle begins, every ally healed and taking less physical damage for a while.
 * His unique weapon (../unique.ts) is worked here too: each skill he uses gains him mana, and for a moment every ally takes
 * less physical damage and the boss more.
 * What is drawn for each, and what his body does, are King's Raid's own (../../assets/heroes/evan.ts).
 *
 * His own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Rampage's Dark
 * (the boss's mana) does nothing here. Each form's skills have cooldowns of their own (King's Raid's are skills apart); the
 * forms share his slots, so what a treasure does as one of its skills is used is done here, by the skill.
 */
/** Purification of Life: its heal, and healing more for its allies (a share), for how long. */
const PURIFY = { heal: playedHeal('priest', 4326, 148_074), heals: 0.25, lasts: 15 };
/** Magic Circle of Life: how long; its heal every second, and the attack speed it gives a moment. */
const CIRCLE = { lasts: 15, heal: playedHeal('priest', 610, 25_961), speed: 500 };
/** Origin of Life: its shield (its Light: half), and the mana every second while it holds, for how long. */
const ORIGIN = { shield: playedHeal('priest', 5197, 178_327), half: playedHeal('priest', 2598, 89_055), mana: 100, lasts: 15 };
/** Uproar: its blow; the boss's more physical damage taken, for how long. */
const UPROAR = { blow: played('priest', 2120, 48_924), takes: 1.25, lasts: 10 };
/** Gluttony: its blow; its circle for how long, a blow every second, and the boss's ATK less. */
const GLUTTONY = { blow: played('priest', 685, 32_601), lasts: 15, tick: played('priest', 685, 29_393), weaker: 0.8 };
/** Rampage: each of its six blows and stun; its last blow and stun. */
const RAMPAGE = { blow: played('priest', 788, 33_685), stun: 2, last: played('priest', 2365, 101_288), lastStun: 5 };
/** Alchemy of Green: its heal; every ally's physical damage taken less, for how long. */
const ALCHEMY = { heal: playedHeal('priest', 3048, 130_472), taken: 0.15, lasts: 20 };
/** His own perks' numbers: Uproar's Dark's longer; Circle's Light's CC resist; Alchemy's Light's less taken, and Dark's immunity at the start; Transcend 5's Dark's ATK and attack speed for every ally, up to how many. */
const PERKS = { longer: 20, resist: 500, taken: 0.25, immune: 5, dark: { atk: 0.01, speed: 10, most: 30 } };

/**
 * His unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Purification's more healing and less physical
 * damage, and Uproar's more DMG and the boss healed less; Circle's ATK for its allies, and Gluttony's shorter cooldown and the
 * boss slowed; Origin's more shield, and Rampage's lower boss block; Alchemy's longer, and the boss's more physical damage
 * taken as each skill is used.
 */
const UT = {
  stone: { heals: 0.5, taken: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], dmg: 0.5, unhealed: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 15 },
  bag: { atk: [0.12, 0.14, 0.17, 0.21, 0.25, 0.3], cooldown: 7, slow: [120, 140, 170, 210, 250, 300] },
  pendulum: { shield: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], block: [200, 240, 290, 350, 420, 500], lasts: 10 },
  flask: { lasts: 40, takes: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], marked: 7 },
};

const art = skillArt('evan');

const ALCHEMY_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Alchemy of Green', about: `Passive. As each battle begins, every ally healed and taking ${pct(ALCHEMY.taken)} less physical damage for ${ALCHEMY.lasts} seconds. Each skill he uses turns him into his other form.`, icon: '⚗️', art: art(3) },
  words: `At the beginning of each battle, heals HP of all allies by ${healed('priest', ALCHEMY.heal, bookHeal('evan', 3))} and reduces P.DMG they take by ${pct(ALCHEMY.taken)} for ${ALCHEMY.lasts} sec.\n[Alchemist of the Green Evan] Purification of Life, Magic Circle of Life, and Origin of Life become available for use. After Skill use, Evan turns into 'Alchemist of the Dark Evan.'\n[Alchemist of the Dark Evan] Uproar of Naav Gehen, Naav Gehen of Gluttony, and Rampage of Naav Gehen become available for use. After Skill use, Evan turns into 'Alchemist of the Green Evan.'`,
};
const PURIFIED: Buff = { name: 'Purification of Life', about: 'Healing reaches it more.', icon: '⚗️', art: art(0) };
const CIRCLED: Buff = { name: 'Magic Circle of Life', about: 'Quicker.', icon: '⚗️', art: art(1) };
const ORIGINAL: Buff = { name: 'Origin of Life', about: 'Shielded: mana every second, and immune to CC.', icon: '⚗️', art: art(2) };
const ALCHEMIZED: Buff = { name: 'Alchemy of Green', about: 'Takes less physical damage.', icon: '⚗️', art: art(3) };
const FORMED: Buff = { name: 'Alchemist', about: 'ATK and attack speed higher for each.', icon: '⚗️', art: art(3) };
const DARK: Buff = { name: 'Alchemist of the Dark Evan', about: 'Uproar, Gluttony and Rampage of Naav Gehen his.', icon: '🌑', art: art(3) };

/** His skills as the Alchemist of the Dark Evan, in his skills' places. */
const DARK_SKILLS: readonly Ability[] = [
  {
    name: 'Uproar of Naav Gehen',
    about: `A blow; the boss takes ${pct(UPROAR.takes - 1)} more physical damage for ${UPROAR.lasts} seconds.`,
    words: `Deals ${dmg('priest', UPROAR.blow, bookDmg('evan', 0))} P.DMG to all enemies and increases P.DMG the hit enemies take by ${pct(UPROAR.takes - 1)} for ${UPROAR.lasts} sec.`,
    icon: '🌑',
    art: art(0),
    move: 'uproar',
    cooldown: 12,
    cost: 2,
  },
  {
    name: 'Naav Gehen of Gluttony',
    about: `A blow and a circle for ${GLUTTONY.lasts} seconds: a blow every second, the boss hitting ${pct(1 - GLUTTONY.weaker)} less hard.`,
    words: `Deals ${dmg('priest', GLUTTONY.blow, bookDmg('evan', 1))} P.DMG to the enemy and enemies within a wide range of the target, dispelling positive effects from hit enemies and places a magic circle for ${GLUTTONY.lasts} sec. The magic circle deals ${dmg('priest', GLUTTONY.tick, bookDmg('evan', 1))} P.DMG to enemies within range and reduces ATK by ${pct(1 - GLUTTONY.weaker)} every sec.`,
    icon: '🌑',
    art: art(1),
    move: 'gluttony',
    cooldown: 19,
    cost: 3,
  },
  {
    name: 'Rampage of Naav Gehen',
    about: `Six blows that stun the boss for ${RAMPAGE.stun} seconds, and a last that stuns it for ${RAMPAGE.lastStun}.`,
    words: `Deals a total of ${dmg('priest', RAMPAGE.blow * 6, bookDmg('evan', 2))} P.DMG over 6 times to enemies within a wide range of the target and inflicts Stun for ${RAMPAGE.stun} sec. The last hit deals ${dmg('priest', RAMPAGE.last, bookDmg('evan', 2))} P.DMG and inflicts Stun for ${RAMPAGE.lastStun} sec.`,
    icon: '🌑',
    art: art(2),
    move: 'rampage',
    cooldown: 25,
    cost: 3,
  },
];

export const EVAN: HeroDef = {
  id: 'evan',
  name: 'Evan',
  class: 'priest',
  skins: ['Evan', 'Evan_Wedding', 'Evan_Summer', 'Evan_Christmas', 'Evan_DailyLook', 'Evan_DailyLook2', 'Evan_Glory', 'Evan_Glory2'],
  stats: { ...CLASS_STATS.priest, deals: 'physical' },
  abilities: [
    {
      name: 'Purification of Life',
      about: `Every ally healed; for ${PURIFY.lasts} seconds healing reaches them ${pct(PURIFY.heals)} more.`,
      words: `Heals HP of all allies by ${healed('priest', PURIFY.heal, bookHeal('evan', 0))} and increases Heal Rate of healed allies by ${pct(PURIFY.heals)} for ${PURIFY.lasts} sec.`,
      icon: '⚗️',
      art: art(0),
      move: 'purify',
      cooldown: 12,
      cost: 2,
    },
    {
      name: 'Magic Circle of Life',
      about: `A circle for ${CIRCLE.lasts} seconds: every ally healed every second, and +${CIRCLE.speed} attack speed.`,
      words: `Places a magic circle in a wide range of self for ${CIRCLE.lasts} sec, healing HP of allies within range by ${healed('priest', CIRCLE.heal, bookHeal('evan', 1))} every sec and increasing their ATK Spd by ${CIRCLE.speed}.`,
      icon: '⚗️',
      art: art(1),
      move: 'circle',
      cooldown: 19,
      cost: 3,
    },
    {
      name: 'Origin of Life',
      about: `A shield on every ally for ${ORIGIN.lasts} seconds; while it holds, ${ORIGIN.mana} mana every second and immune to CC.`,
      words: `Creates a shield that absorbs ${healed('priest', ORIGIN.shield, bookHeal('evan', 2))} DMG and recovers ${ORIGIN.mana} Mana every sec for ${ORIGIN.lasts} sec on all allies. For the duration of the shield, gains immunity to CC.`,
      icon: '⚗️',
      art: art(2),
      move: 'origin',
      cooldown: 25,
      cost: 4,
    },
  ],
  passive: ALCHEMY_SHOWN,
  treasures: [
    treasure('Rough Edged Rune Stone', (k) => ({
      words: `[Purification of Life] Increases Heal Rate by ${pct(UT.stone.heals)} and reduces P.DMG healed allies take by ${pct(k(UT.stone.taken))} for ${UT.stone.lasts} sec.\n[Uproar of Naav Gehen] Increases DMG by ${pct(UT.stone.dmg)} and reduces enemy's Heal Rate by ${pct(k(UT.stone.unhealed))} for ${UT.stone.lasts} sec.`,
      skill: { index: 0, heals: 1 + UT.stone.heals },
    })),
    treasure('Evan’s All-Purpose Bag', (k) => ({
      words: `[Magic Circle of Life] Reduces Mana Cost by 1 and increases ATK of allies within the range of the magic circle by ${pct(k(UT.bag.atk))}.\n[Naav Gehen of Gluttony] Reduces Cooldown by ${UT.bag.cooldown} sec and reduces ATK Spd of enemies within the range of the magic circle by ${k(UT.bag.slow)}.`,
      skill: { index: 1, cost: -1 },
    })),
    treasure('Navigating Dowsing Pendulum', (k) => ({
      words: `[Origin of Life] Upon use, dispels negative effects from self and increases shield by ${pct(k(UT.pendulum.shield))}.\n[Rampage of Naav Gehen] While using the Skill, Evan gains immunity to CC, and the last hit reduces enemy's All Block Chance by ${k(UT.pendulum.block)} for ${UT.pendulum.lasts} sec.`,
      skill: { index: 2, heals: 1 + k(UT.pendulum.shield) },
    })),
    treasure('Naav’s First Flask', (k) => ({
      words: `[Alchemy of Green] Changes the duration of the P.DMG Reduction effect to ${UT.flask.lasts} sec, and whenever Evan uses a Skill, increases P.DMG all enemies take by ${pct(k(UT.flask.takes))} for ${UT.flask.marked} sec.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, cooldown: -5 } }, ({ skill }) => `[Purification of Life] Reduces Cooldown of the Skill by ${-skill.cooldown} sec.`),
    's1-dark': { words: `[Uproar of Naav Gehen] Changes the duration of the P.DMG Boost effect to ${PERKS.longer} sec.` },
    's2-light': { words: `[Magic Circle of Life] Increases CC Resist by ${PERKS.resist} for the duration of the magic circle.` },
    's2-dark': { words: '[Naav Gehen of Gluttony] Reduces Mana Cost by 1.' },
    's3-light': { words: '[Origin of Life] The shield becomes irremovable, but reduces the shield to 50%.' },
    's3-dark': { words: "[Rampage of Naav Gehen] Each hit reduces the target's Mana by 300." },
    's4-light': { words: `Changes P.DMG Reduction to ${pct(PERKS.taken)}.` },
    's4-dark': { words: `At the beginning of the first battle, Evan starts as 'Alchemist of the Dark Evan' and gains immunity to CC for ${PERKS.immune} sec.` },
    't5-light': t5Light({ hp: 0.1 }, ({ hp }) => `HP +${pct(hp)}`),
    't5-dark': { words: `Whenever Evan changes his alchemist form, increases ATK of all allies by ${pct(PERKS.dark.atk)} and ATK Spd by ${PERKS.dark.speed}. This effect can be stacked up to max ${PERKS.dark.most} times and is irremovable.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /** His form (dark or green), and whether it turns as the next moment comes; each form's own cooldowns; the circles: how long each lasts yet, toward its next second; Origin's shielded; the wave last begun; Transcend 5's Dark's stacks. */
    let dark = false;
    let turning = false;
    let started = false;
    let green = self.cooldowns.map(() => 0);
    let darks = self.cooldowns.map(() => 0);
    let circle = 0;
    let circleTick = 0;
    let gluttony = 0;
    let gluttonyTick = 0;
    let shielded: Fighter[] = [];
    let wave = 0;
    let formed = 0;
    /** His dark skills as his perks and treasures change them (Gluttony's Dark: cheaper; All-Purpose Bag: shorter). */
    const darkSkills: Ability[] = DARK_SKILLS.map((one, i) =>
      i === 1 ? { ...one, cost: one.cost - (self.perks.has('s2-dark') ? 1 : 0), cooldown: one.cooldown - (wearsTreasure(self, 1) ? UT.bag.cooldown : 0) } : one,
    );
    /** His allies on the field, standing and in the fight (him too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** His form shown on him, and its skills' cooldowns in his slots (the other's kept apart, wearing down). */
    const turn = (): void => {
      if (dark) darks = self.cooldowns.slice();
      else green = self.cooldowns.slice();
      dark = !dark;
      self.cooldowns = (dark ? darks : green).slice();
      if (dark) put(self.statuses, { name: DARK.name, left: Infinity, shown: DARK });
      else self.statuses = self.statuses.filter((status) => status.name !== DARK.name);
      // Transcend 5's Dark: every ally's ATK and attack speed higher (up to its most).
      if (self.perks.has('t5-dark') && formed < PERKS.dark.most) {
        formed++;
        for (const ally of fight.fighters) put(ally.statuses, { name: FORMED.name, left: Infinity, count: formed, atk: PERKS.dark.atk * formed, speed: PERKS.dark.speed * formed, shown: FORMED });
      }
    };

    return {
      lands: {
        attack() {
          fight.hit(self, fight.basic);
        },
        // Every ally healed, healing reaching them more (Rune Stone: less physical damage taken).
        purify() {
          const on = allies();
          fight.cue(self, 'purify', on);
          for (const ally of on) {
            fight.heal(ally, PURIFY.heal, self);
            put(ally.statuses, { name: PURIFIED.name, left: PURIFY.lasts, heals: 1 + PURIFY.heals, ...(wearsTreasure(self, 0) && { takes: { physical: 1 - fromTreasure(self, 0, UT.stone.taken) } }), shown: PURIFIED });
          }
        },
        // The circle (tick).
        circle() {
          circle = CIRCLE.lasts;
          circleTick = 1;
        },
        // A shield on every ally (its Light: half; Dowsing Pendulum: more, its perk's heals), immune to CC and mana while it holds (tick).
        origin() {
          const on = allies();
          fight.cue(self, 'origin', on);
          for (const ally of on) fight.shield(ally, self.perks.has('s3-light') ? ORIGIN.half : ORIGIN.shield, ORIGIN.lasts, self);
          shielded = on;
        },
        // A blow; the boss taking more physical damage (its Dark: longer; Rune Stone: harder, and the boss healed less for a while of its own).
        uproar() {
          fight.hit(self, UPROAR.blow * (wearsTreasure(self, 0) ? 1 + UT.stone.dmg : 1));
          put(fight.foe.statuses, { name: 'Uproar of Naav Gehen', left: self.perks.has('s1-dark') ? PERKS.longer : UPROAR.lasts, takes: { physical: UPROAR.takes }, shown: 'curse' });
          if (wearsTreasure(self, 0)) put(fight.foe.statuses, { name: 'Rough Edged Rune Stone', left: UT.stone.lasts, heals: 1 - fromTreasure(self, 0, UT.stone.unhealed), shown: 'curse' });
        },
        // A blow and the circle (tick).
        gluttony() {
          fight.hit(self, GLUTTONY.blow);
          gluttony = GLUTTONY.lasts;
          gluttonyTick = 0;
        },
        // Six blows that stun the boss, and a last that stuns it longer (Dowsing Pendulum: its block lower).
        rampage(part) {
          const last = part >= 6;
          fight.hit(self, last ? RAMPAGE.last : RAMPAGE.blow);
          fight.stun(last ? RAMPAGE.lastStun : RAMPAGE.stun, { by: self });
          if (last && wearsTreasure(self, 2)) put(fight.foe.statuses, { name: 'Navigating Dowsing Pendulum', left: UT.pendulum.lasts, blocks: { physical: -fromTreasure(self, 2, UT.pendulum.block), magical: -fromTreasure(self, 2, UT.pendulum.block) }, shown: 'curse' });
        },
      },
      // His dark form's skills in his skills' places.
      slot: (index) => (dark ? (darkSkills[index] ?? null) : (self.abilities[index] ?? null)),
      used(_index, ability) {
        // Turned as the next moment comes (once the fight has its cooldown begun).
        turning = true;
        // Dowsing Pendulum: Origin of Life used, what the boss left on him cleared.
        if (ability.move === 'origin' && wearsTreasure(self, 2)) self.statuses = self.statuses.filter((status) => status.shown.harmful !== true || status.binds === true);
        // His unique weapon: mana, and for a moment every ally takes less physical damage and the boss more (Naav's First Flask: the boss more again).
        if (tier !== null) {
          self.mana = Math.min(MAX_MANA, self.mana + atTier(NAAV.mana, tier));
          put(fight.party, { name: NAAV_UP.name, left: NAAV.lasts, takes: { physical: 1 - atTier(NAAV.taken, tier) }, shown: NAAV_UP });
          put(fight.boss.statuses, { name: NAAV_UP.name, left: NAAV.lasts, takes: { physical: 1 + atTier(NAAV.takes, tier) }, shown: 'curse' });
        }
        if (wearsTreasure(self, 3)) for (const foe of fight.foes) if (foe.hp > 0 && !foe.away) put(foe.statuses, { name: 'Naav’s First Flask', left: UT.flask.marked, takes: { physical: 1 + fromTreasure(self, 3, UT.flask.takes) }, shown: 'curse' });
      },
      tick(dt) {
        if (turning) {
          turning = false;
          turn();
        }
        // The other form's cooldowns wear down too.
        const other = dark ? green : darks;
        for (let i = 0; i < other.length; i++) other[i] = Math.max(0, (other[i] ?? 0) - dt);
        // As each battle begins: every ally healed and taking less physical damage (its Light: less again; Naav's First Flask: longer); its Dark, the first: his dark form, and immune to CC a while.
        if (fight.wave !== wave && fight.field.includes(self) && self.hp > 0) {
          wave = fight.wave;
          const on = allies();
          fight.cue(self, 'alchemy', on);
          for (const ally of on) fight.heal(ally, ALCHEMY.heal, self);
          put(fight.party, { name: ALCHEMIZED.name, left: wearsTreasure(self, 3) ? UT.flask.lasts : ALCHEMY.lasts, takes: { physical: 1 - (self.perks.has('s4-light') ? PERKS.taken : ALCHEMY.taken) }, shown: ALCHEMIZED });
          if (!started && self.perks.has('s4-dark')) {
            turn();
            put(self.statuses, { name: 'Alchemist’s Guard', left: PERKS.immune, guards: true, shown: DARK });
          }
          started = true;
        }
        // Magic Circle of Life: every ally healed and quicker every second (its Light: CC resist; All-Purpose Bag: ATK).
        if (circle > 0) {
          circle -= dt;
          circleTick += dt;
          if (circleTick >= 1) {
            circleTick -= 1;
            for (const ally of allies()) {
              fight.heal(ally, CIRCLE.heal, self);
              put(ally.statuses, { name: CIRCLED.name, left: 1.2, speed: CIRCLE.speed, ...(self.perks.has('s2-light') && { resist: PERKS.resist }), ...(wearsTreasure(self, 1) && { atk: fromTreasure(self, 1, UT.bag.atk) }), shown: CIRCLED });
            }
          }
        }
        // Gluttony's circle: a blow every second, the boss hitting less hard (All-Purpose Bag: slowed).
        if (gluttony > 0) {
          gluttony -= dt;
          gluttonyTick += dt;
          if (gluttonyTick >= 1) {
            gluttonyTick -= 1;
            fight.hit(self, GLUTTONY.tick);
            put(fight.foe.statuses, { name: 'Naav Gehen of Gluttony', left: 1.2, deals: GLUTTONY.weaker, shown: 'curse' });
            if (wearsTreasure(self, 1)) fight.slow(fromTreasure(self, 1, UT.bag.slow), 1.2);
          }
        }
        // Origin of Life: while its shield holds, mana every second and immune to CC.
        shielded = shielded.filter((ally) => ally.shield > 0 && ally.hp > 0);
        for (const ally of shielded) {
          ally.mana = Math.min(MAX_MANA, ally.mana + ORIGIN.mana * dt);
          put(ally.statuses, { name: ORIGINAL.name, left: 0.2, guards: true, shown: ORIGINAL });
        }
      },
      // Dowsing Pendulum: nothing knocks him down while he uses Rampage of Naav Gehen.
      guards: () => wearsTreasure(self, 2) && self.doing?.move === 'rampage',
      lit: () => dark,
    };
  },
};
