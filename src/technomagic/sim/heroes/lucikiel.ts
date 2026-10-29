import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { pct, skillArt, type Buff } from '../shown';
import { atTier, GIGANTE, GIGANTE_UP } from '../unique';
import { type Ability, bookDmg, bookHeal, CLASS_STATS, dmg, healed, type HeroDef, type Passive } from './kit';
import { CODED } from './moves';

/*
 * Lucikiel's skills, as the game has them (what each costs, how long before it can be used again, how long what it
 * does lasts, and the shares are the game's; how hard each hits, and how big his shield is, are not said there). He is
 * newer than kingsraid.shodyra.com's own pages for its heroes: his skills' words are its hero list's.
 * - Death Storm: three blows that leave Shadow of Death on the boss: it eats at the boss every second, and leaves it
 *   healed less, for 10 seconds.
 * - Annihilation Wave: a blow that stuns the boss, and a blow that draws it in (there is only it: nothing more). Used,
 *   its slot holds Annihilation Surge (a wider wave, its stun longer), and that used, the Wave again.
 * - Doomsday: nine blows, the last knocking the boss down and leaving Pain of Doom on it for 10 seconds: each blow of
 *   his on it meanwhile, his attack's or a skill's, deals more.
 * His passive, Armor of the Demon God: he takes less, and what knocks him down holds him half as long; each skill he
 * uses gives him Authority of the Demon God for 6 seconds, a shield, and he can't be knocked down while it lasts.
 * His unique weapon (../unique.ts) is worked here too: every 10 of his blows a stack of Incarnation of Doom (up to 10),
 * each his ATK and attack speed higher; at 10, each blow of his deals more through the boss's defense.
 * What is drawn for each is ../../heroes/lucikiel/fx.ts; what his body does for each, and for his attack, ../../heroes/lucikiel/moves.ts.
 *
 * His own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Death
 * Storm's Light does nothing here (nothing takes what is on the boss off it), nor Doomsday's Dark (the boss has no mana
 * to take). Annihilation Wave's Light makes the Surge cheaper too: it is the same slot. Shadow of Death's more M.DMG
 * taken, its Dark's and Emblem of Destruction's, adds up, as King's Raid's does.
 */
// (How hard each of his skills hits: the King's Raid Index hasn't him, so ×2.61 what it was, as the other wizards' went to theirs from it; his shield, ×1.61, as the shields it has went, no wizard's among them.)
// (As many blows as its move has.)
const STORM = { hits: CODED.storm.lands.length, blow: 5220 };
/** Shadow of Death: how long it lasts, how hard it eats at the boss every second, and what it leaves of the boss's heals. */
const SHADOW = { lasts: 10, each: 520, every: 1, heals: 0.7 };
const WAVE = { blow: 7830, stun: 3 };
const SURGE = { blow: 9140, stun: 5 };
const DOOMSDAY = { hits: CODED.doomsday.lands.length, blow: 2090, last: 10_440, down: 5 };
/** Pain of Doom: how long it lasts, and the blow more each of his blows on it deals. */
const PAIN = { lasts: 10, blow: 1040 };
/** His passive: what he takes, how long what knocks him down holds him, and his shield's size and how long it lasts. */
const ARMOR = { taken: 0.75, held: 0.5, shield: 322_000, lasts: 6 };
/** His own perks' numbers: Shadow of Death's more M.DMG taken (a share), Armor of the Demon God's Dark's less taken besides, and Transcend 5's Dark (more DMG every so often, up to so many times). */
const PERKS = { shadow: 0.25, taken: 0.15, doom: { dmg: 0.05, every: 6, most: 10 } };

/**
 * His unique treasures' numbers (1★ to 5★: ../treasures.ts): Death Storm's shorter cooldown and Shadow of Death's more
 * M.DMG taken; the Wave's and the Surge's CC ACC (points, a moment: as long as their blows take to land); Pain of Doom's
 * more DMG; and Authority of the Demon God's bigger shield.
 */
const UT = {
  emblem: { cooldown: -3, takes: [0.12, 0.14, 0.17, 0.21, 0.25, 0.3] },
  strap: { wave: [300, 360, 430, 520, 630, 750], surge: [400, 480, 580, 700, 840, 1000], lasts: 2 },
  horns: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
  earrings: { shield: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
};

const art = skillArt('lucikiel');

const ARMOR_OF_THE_DEMON_GOD: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  taken: ARMOR.taken,
  held: ARMOR.held,
  shown: {
    name: 'Armor of the Demon God',
    about: `Passive. He takes ${pct(1 - ARMOR.taken)} less, and is knocked down ${pct(1 - ARMOR.held)} shorter. Each skill he uses gives him [Authority of the Demon God] for ${ARMOR.lasts} seconds: a shield, and he can’t be knocked down while it lasts.`,
    icon: '🛡️',
    art: art(3),
  },
  words: `Reduces All DMG taken by ${pct(1 - ARMOR.taken)} and the duration of CC by ${pct(1 - ARMOR.held)}. Upon every Skill use, creates [Authority of the Demon God] that absorbs ${healed('wizard', ARMOR.shield, bookHeal('lucikiel', 3))} DMG for ${ARMOR.lasts} sec. Gains immunity to CC for the duration of [Authority of the Demon God].`,
};
/** What Annihilation Wave's slot holds once it is used (its picture is the game's for it, past his passive's). */
const SURGE_SKILL: Ability = {
  name: 'Annihilation Surge',
  about: `A wider wave: a blow that stuns the boss for ${SURGE.stun} seconds, and a blow more. Used, this slot holds [Annihilation Wave] again.`,
  words: `Attacks frontal enemies within a wide range 2 times. The first attack deals ${dmg('wizard', SURGE.blow)} M.DMG and inflicts stun for ${SURGE.stun} sec. The second attack deals ${dmg('wizard', SURGE.blow)} M.DMG and draws in hit targets in front of self. After use, the Skill changes to [Annihilation Wave].`,
  icon: '🌊',
  art: art(4),
  move: 'surge',
  cooldown: 13,
  cost: 3,
};
/** Authority of the Demon God: shown on his card, with how long it has left. */
const AUTHORITY: Buff = { name: 'Authority of the Demon God', about: 'A shield; he can’t be knocked down.', icon: '🛡️', art: art(3) };
/** Transcend 5's Dark: shown on his card, with its stacks. */
const RUIN: Buff = { name: 'Destruction', about: `${pct(PERKS.doom.dmg)} more DMG for each.`, icon: '💢', art: art(3) };
/** What his skills leave on the boss. */
const SHADOW_OF_DEATH = 'Shadow of Death';
const PAIN_OF_DOOM = 'Pain of Doom';

export const LUCIKIEL: HeroDef = {
  id: 'lucikiel',
  name: 'Lucikiel',
  class: 'wizard',
  skins: ['Lucikiel', 'Lucikiel_Advance', 'Lucikiel_Legend'],
  // A wizard (his blows magical, as a wizard's are): as his class stands.
  stats: { ...CLASS_STATS.wizard, deals: 'magical' },
  abilities: [
    {
      name: 'Death Storm',
      about: `${STORM.hits} blows that leave [Shadow of Death] on the boss for ${SHADOW.lasts} seconds: it eats at the boss every second and leaves it healed ${pct(1 - SHADOW.heals)} less.`,
      words: `Attacks the target and nearby enemies ${STORM.hits} times, dealing a total of ${dmg('wizard', STORM.blow * STORM.hits, bookDmg('lucikiel', 0))} M.DMG and leaving a [Shadow of Death]. [Shadow of Death] deals ${dmg('wizard', SHADOW.each * SHADOW.lasts, bookDmg('lucikiel', 0))} M.DMG and reduces the target's Heal Rate by ${pct(1 - SHADOW.heals)} over ${SHADOW.lasts} sec.`,
      icon: '🌪️',
      art: art(0),
      move: 'storm',
      cooldown: 13,
      cost: 2,
    },
    {
      name: 'Annihilation Wave',
      about: `A blow that stuns the boss for ${WAVE.stun} seconds, and a blow more. Used, this slot holds [Annihilation Surge].`,
      words: `Attacks frontal enemies within range 2 times. The first attack deals ${dmg('wizard', WAVE.blow, bookDmg('lucikiel', 1))} M.DMG and inflicts Stun for ${WAVE.stun} sec. The second attack deals ${dmg('wizard', WAVE.blow, bookDmg('lucikiel', 1))} M.DMG and draws in hit targets in front of self. After use, the Skill changes to [Annihilation Surge].`,
      icon: '🌊',
      art: art(1),
      move: 'wave',
      cooldown: 13,
      cost: 3,
    },
    {
      name: 'Doomsday',
      about: `${DOOMSDAY.hits} blows, the last knocking the boss down for ${DOOMSDAY.down} seconds and leaving [Pain of Doom] on it for ${PAIN.lasts}: each blow of his on it meanwhile deals more.`,
      words: `Attacks nearby enemies ${DOOMSDAY.hits} times, dealing ${dmg('wizard', DOOMSDAY.blow, bookDmg('lucikiel', 2))} M.DMG each, and draws them in front of self. The last hit deals ${dmg('wizard', DOOMSDAY.last, bookDmg('lucikiel', 2))} more M.DMG, knocks down hit targets for ${DOOMSDAY.down} sec, and leaves [Pain of Doom] that lasts for ${PAIN.lasts} sec. Each time Lucikiel attacks targets inflicted with [Pain of Doom] with a normal or Skill attack, he deals additional ${dmg('wizard', PAIN.blow, bookDmg('lucikiel', 2))} M.DMG.`,
      icon: '☄️',
      art: art(2),
      move: 'doomsday',
      cooldown: 23,
      cost: 4,
    },
  ],
  passive: ARMOR_OF_THE_DEMON_GOD,
  treasures: [
    treasure('Emblem of Destruction', (k) => ({
      words: `[Death Storm] Reduces Cooldown by ${-UT.emblem.cooldown} sec and [Shadow of Death] additionally increases M.DMG taken by ${pct(k(UT.emblem.takes))}.`,
      skill: { index: 0, cooldown: UT.emblem.cooldown },
    })),
    // (The Wave and the Surge are one slot: what it dispels is both's.)
    treasure('Dark Blue Leather Strap', (k) => ({
      words: `[Annihilation Wave] Dispels positive effects from the target, and increases CC ACC by ${k(UT.strap.wave)} for the duration of Skill. [Annihilation Surge] Dispels positive effects from the target, and increases CC ACC by ${k(UT.strap.surge)} for the duration of Skill.`,
      skill: { index: 1, dispel: true },
    })),
    treasure('Horns of a Random Demon', (k) => ({
      words: `[Doomsday] Changes DMG dealt with [Pain of Doom] to DMG that ignores DEF and increases DMG dealt with [Pain of Doom] by ${pct(k(UT.horns.dmg))}.`,
    })),
    treasure('Blue Blood Earrings', (k) => ({
      words: `[Armor of the Demon God] [Authority of the Demon God] becomes irremovable and shield increases by ${pct(k(UT.earrings.shield))}.`,
    })),
  ],
  perks: {
    's1-light': { words: '[Shadow of Death] becomes irremovable.' },
    's1-dark': { words: `[Shadow of Death] additionally increases M.DMG taken by ${pct(PERKS.shadow)}.` },
    's2-light': said({ skill: { index: 1, cost: -1 } }, ({ skill }) => `Reduces Mana Cost by ${-skill.cost}.`),
    's2-dark': { words: 'At the beginning of the first battle, changes the Skill to [Annihilation Surge].' },
    's3-light': said({ skill: { index: 2, cooldown: -7 } }, ({ skill }) => `Reduces Cooldown by ${-skill.cooldown} sec.`),
    's3-dark': { words: "Each hit reduces the hit target's Mana by 200." },
    's4-light': { words: 'At the beginning of each battle, creates [Authority of the Demon God].' },
    's4-dark': { words: `Reduces All DMG taken by an additional ${pct(PERKS.taken)}.` },
    't5-light': t5Light({ crit: 100 }, ({ crit }) => `Crit Chance +${crit}`),
    't5-dark': { words: `Increases DMG dealt to enemies by ${pct(PERKS.doom.dmg)} every ${PERKS.doom.every} sec. This effect can be stacked up to max ${PERKS.doom.most} times and is irremovable.` },
  },
  attack: 'havoc',
  // His animations: four blows, fist and foot (Ezekiel's fist fight).
  timing: { attack: [{ lands: [0.92, 1.52, 2.78, 3.62], until: 4.3 }] },
  join(fight, self) {
    /** Whether his second slot holds the Surge (its Dark: from the start); how long his Authority lasts yet; his unique weapon's blows toward a stack, and its stacks. */
    let surging = self.perks.has('s2-dark');
    let authority = 0;
    let blows = 0;
    let incarnation = 0;
    /** Seconds he has been in the fight (Transcend 5's Dark), and toward Shadow of Death's next bite. */
    let time = 0;
    let bitten = 0;
    const tier = self.unique?.tier ?? null;
    // (The Wave's Light makes the Surge cheaper too.)
    const surgeSkill: Ability = { ...SURGE_SKILL, cost: Math.max(0, SURGE_SKILL.cost + (self.abilities[1] as Ability).cost - (LUCIKIEL.abilities[1] as Ability).cost) };

    /** His shield, and for as long as it lasts he can't be knocked down. */
    const armor = (): void => {
      // (Blue Blood Earrings: a bigger one.)
      fight.shield(self, ARMOR.shield * (1 + fromTreasure(self, 3, UT.earrings.shield)), ARMOR.lasts, self);
      authority = ARMOR.lasts;
    };
    // Armor of the Demon God's Light: his shield as the fight begins.
    if (self.perks.has('s4-light')) armor();

    const bears = (name: string): boolean => fight.foe.statuses.some((status) => status.name === name);
    /** How many stacks of Transcend 5's Dark he has. */
    const ruin = (): number => (self.perks.has('t5-dark') ? Math.min(PERKS.doom.most, Math.floor(time / PERKS.doom.every)) : 0);

    return {
      lands: {
        // His attack: a blow of havoc, as written in code; or each blow of his fist fight, as his animation for it has it.
        havoc() {
          fight.hit(self, fight.basic);
        },
        attack() {
          fight.hit(self, fight.basic);
        },
        // Each blow leaves Shadow of Death (begun again): its Dark, the boss taking more magic damage besides.
        storm() {
          fight.hit(self, STORM.blow);
          // (Emblem of Destruction: more M.DMG taken again.)
          const shadow = 1 + (self.perks.has('s1-dark') ? PERKS.shadow : 0) + fromTreasure(self, 0, UT.emblem.takes);
          put(fight.foe.statuses, { name: SHADOW_OF_DEATH, left: SHADOW.lasts, heals: SHADOW.heals, ...(shadow > 1 && { takes: { magical: shadow } }), shown: 'curse' });
        },
        wave(part) {
          fight.hit(self, WAVE.blow);
          if (part === 0) fight.stun(WAVE.stun, { by: self });
        },
        surge(part) {
          fight.hit(self, SURGE.blow);
          if (part === 0) fight.stun(SURGE.stun, { by: self });
        },
        // Nine blows, the last knocking the boss down and leaving Pain of Doom.
        doomsday(part) {
          if (part < DOOMSDAY.hits - 1) {
            fight.hit(self, DOOMSDAY.blow);
            return;
          }
          fight.hit(self, DOOMSDAY.blow + DOOMSDAY.last);
          fight.stun(DOOMSDAY.down, { down: true, by: self });
          put(fight.foe.statuses, { name: PAIN_OF_DOOM, left: PAIN.lasts, shown: 'curse' });
        },
      },
      // His second slot holds the Wave or the Surge, each turning into the other as it is used.
      slot: (index) => (index === 1 && surging ? surgeSkill : (self.abilities[index] ?? null)),
      used(index, ability) {
        if (index === 1) {
          surging = ability !== surgeSkill;
          // (Dark Blue Leather Strap: CC ACC while its blows land.)
          const accuracy = fromTreasure(self, 1, ability === surgeSkill ? UT.strap.surge : UT.strap.wave);
          if (accuracy > 0) put(self.statuses, { name: 'Dark Blue Leather Strap', left: UT.strap.lasts, accuracy, shown: { name: 'Dark Blue Leather Strap', about: `CC ACC +${accuracy}.`, icon: '🌊', art: art(1) } });
        }
        armor();
      },
      // Each blow of his own: Pain of Doom's blow more, and his unique weapon's stacks (at the most, its blow more).
      blow() {
        // (Horns of a Random Demon: harder, through the boss's defense.)
        if (bears(PAIN_OF_DOOM)) fight.hit(self, PAIN.blow * (1 + fromTreasure(self, 2, UT.horns.dmg)), false, 0, wearsTreasure(self, 2));
        if (tier === null) return;
        if (incarnation >= GIGANTE.most) fight.hit(self, atTier(GIGANTE.blow, tier), false, 0, true);
        blows++;
        if (blows >= GIGANTE.blows) {
          blows = 0;
          incarnation = Math.min(GIGANTE.most, incarnation + 1);
        }
      },
      tick(dt) {
        authority = Math.max(0, authority - dt);
        if (fight.field.includes(self) && self.hp > 0) time += dt;
        // Shadow of Death eats at the boss every second while it is on it.
        if (!bears(SHADOW_OF_DEATH)) {
          bitten = 0;
          return;
        }
        bitten += dt;
        if (bitten >= SHADOW.every) {
          bitten -= SHADOW.every;
          fight.hit(self, SHADOW.each, false);
        }
      },
      // (Armor of the Demon God's Dark: less taken besides, of what it already takes off.)
      takes: () => (self.perks.has('s4-dark') ? (ARMOR.taken - PERKS.taken) / ARMOR.taken : 1),
      guards: () => authority > 0,
      deals: () => (1 + (tier === null ? 0 : atTier(GIGANTE.atk, tier) * incarnation)) * (1 + PERKS.doom.dmg * ruin()),
      speed: () => (tier === null ? 0 : atTier(GIGANTE.speed, tier) * incarnation),
      lit: () => surging,
      buffs: () => [
        ...(authority > 0 ? [{ ...AUTHORITY, left: authority }] : []),
        ...(incarnation > 0 ? [{ ...GIGANTE_UP, count: incarnation }] : []),
        ...(ruin() > 0 ? [{ ...RUIN, count: ruin() }] : []),
      ],
    };
  },
};
