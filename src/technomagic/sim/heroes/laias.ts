import { ATK, share } from '../combat/damage';
import { away, put } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, treasureTier } from '../treasures';
import { BLOW, MAX_MANA, SECTION } from '../rules';
import { pct, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { atTier, ELTOIRRE, ELTOIRRE_UP } from '../unique';
import { CLASS_STATS, dmg, healed, indexed, indexedHeal, type HeroDef, type Passive } from './kit';

/*
 * Laias's skills, as the game has them (what each costs, how long before it can be used again, how long what it
 * does lasts, and the shares are the game's; how hard each hits, how much it heals and how strong her shield is
 * are not said there):
 * - Healing Droplets: heals every ally, and healing reaches them the more for a while; the more again for one at
 *   half its health or less.
 * - Bubble Shield: a shield on the ally with the lowest health. While it holds, that ally can't be knocked down,
 *   hits harder and is healed every second; and for the whole while it takes less from the boss and deals more to it.
 * - Festival of the Flow: knocks the boss down, heals every ally a share of their max HP and gives every other
 *   ally two crystals of mana; then for a while a whirlpool every few seconds, each striking the boss and knocking
 *   it down again.
 * Her passive, Blessing of the Water Dragon: she stands being knocked down far better; every ally has more M.DEF
 * and the boss's magic is less likely to land a critical blow on them; and each skill she uses has every ally take
 * less magical damage for a while.
 * Her unique weapon (../unique.ts) is worked here too: healing reaches every ally the more, and every so
 * often the ally with the lowest health is healed.
 * What is drawn for each is ../../heroes/laias/fx.ts; what her body does for each, and for her attack, ../../heroes/laias/moves.ts.
 *
 * Her own perks (../perks.ts) are King's Raid's. Healing Droplets' Light makes its heal 40% more; its Dark's M.Crit
 * Resistance lasts as its Heal Rate does. Festival of the Flow's Dark heals every ally another 15% of its max HP.
 * Transcend 5's Dark's mana is the game's 350 of its 1000 to a section.
 */
// (How hard each of her skills hits, and how much each heals and shields, is the King's Raid Index's, at her class's ATK: ./kit.ts's indexed and indexedHeal.)
const SPLASH = { blow: BLOW * 1.5 };
// (Its 25% Heal Rate, 1.5 times for an ally at half its health or less, as the game has it.)
const DROPLETS = { heal: indexedHeal('priest', 338_882), lasts: 10, heals: 0.25, low: 0.5, lowTimes: 1.5 };
const BUBBLE = { shield: indexedHeal('priest', 879_673), lasts: 15, taken: 0.7, dmg: 0.15, atk: 0.2, heal: indexedHeal('priest', 35_192) };
const FESTIVAL = { blow: indexed('priest', 210_084), down: 3, heal: 0.15, mana: 2 * SECTION, lasts: 12, every: 4, whirl: indexed('priest', 140_066), whirlDown: 2 };
// (Her 500 CC Resist and every ally's 250 M.Crit Resistance, as the game has them: points.)
const WATER_DRAGON = { resist: 500, defense: 1.1, critResist: 250, taken: 0.75, lasts: 5 };
/**
 * Her own perks' numbers: Healing Droplets' more healing and its M.Crit Resistance (points), the whirlpools' quicker
 * coming, Festival of the Flow's more heal, her passive's more M.DEF (a share more of it) and M.Crit Resistance, her more
 * CC Resist, and Transcend 5's Dark's mana for every ally (how often).
 */
const PERKS = { heals: 1.4, critResist: 250, whirl: 3, festival: 0.15, defense: 1.2, critResistMore: 150, resist: 400, mana: { each: 0.35 * SECTION, every: 3 } };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts): Healing Droplets' more healing and every ally's M.Block
 * (points); Bubble Shield's shorter cooldown; Festival of the Flow's more mana for every ally; her passive's more M.DEF,
 * and every ally's mana every second.
 */
const UT = {
  scale: { heals: 0.5, block: [240, 290, 350, 420, 500], lasts: 10 },
  crystal: { cooldown: [0.14, 0.17, 0.21, 0.25, 0.3] },
  papyrus: { mana: [600, 720, 860, 1040, 1250] },
  tear: { defense: 0.5, mana: [48, 58, 70, 84, 100] },
};

const art = skillArt('laias');

const BLESSING: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Blessing of the Water Dragon',
    about: `Passive. +${WATER_DRAGON.resist} CC Resist for her; every ally has ${pct(WATER_DRAGON.defense - 1)} more M.DEF and ${WATER_DRAGON.critResist} M.Crit Resistance, and each skill she uses has every ally take ${pct(1 - WATER_DRAGON.taken)} less magical damage for ${WATER_DRAGON.lasts} seconds.`,
    icon: '🐉',
    art: art(3),
  },
  words: `Increases Laias' CC Resist by ${WATER_DRAGON.resist}, and increases all allies' M.DEF by ${pct(WATER_DRAGON.defense - 1)} and M.Crit Resistance by ${WATER_DRAGON.critResist}. Whenever Laias casts an active Skill, reduces M.DMG all allies take by ${pct(1 - WATER_DRAGON.taken)} for ${WATER_DRAGON.lasts} sec.`,
};
/** What her passive gives every ally while she is on the field, and each skill she uses for a while. */
const BLESSED: Buff = { name: 'Blessing of the Water Dragon', about: 'More M.DEF, and the boss’s magic is less likely to land a critical blow.', icon: '🐉', art: art(3) };
const WARDED: Buff = { name: 'Water Dragon’s Ward', about: `Takes ${pct(1 - WATER_DRAGON.taken)} less magical damage.`, icon: '💧', art: art(3) };
/** What Healing Droplets gives each ally, shown on its card with how long it has left. */
const DROPLETS_UP: Buff = { name: 'Healing Droplets', about: 'Healing reaches it the more.', icon: '💧', art: art(0) };
/** What Bubble Shield gives its ally: for its whole while, and more while the shield holds. */
const BUBBLED: Buff = { name: 'Bubble Shield', about: `Takes ${pct(1 - BUBBLE.taken)} less from the boss and deals ${pct(BUBBLE.dmg)} more to it.`, icon: '🫧', art: art(1) };
const BUBBLE_HOLDS: Buff = { name: 'Bubble', about: 'While the shield holds: can’t be knocked down, hits harder, and is healed every second.', icon: '🫧', art: art(1) };

export const LAIAS: HeroDef = {
  id: 'laias',
  name: 'Laias',
  class: 'priest',
  skins: ['Laias'],
  // A priestess whose blows are magical, who stands being knocked down far better (her passive): as her class stands, otherwise.
  stats: { ...CLASS_STATS.priest, deals: 'magical', resist: CLASS_STATS.priest.resist + WATER_DRAGON.resist },
  abilities: [
    {
      name: 'Healing Droplets',
      auto: { heals: true },
      about: `Heals every ally, and for ${DROPLETS.lasts} seconds healing reaches them ${pct(DROPLETS.heals)} more (${DROPLETS.lowTimes} times that for one at ${pct(DROPLETS.low)} of its health or less).`,
      words: `Heals ${healed('priest', DROPLETS.heal)} HP of all allies and increases Heal Rate by ${pct(DROPLETS.heals)} for ${DROPLETS.lasts} sec. If the target's HP is ${pct(DROPLETS.low)} or below, Heal Rate increases by ${DROPLETS.lowTimes} times.`,
      icon: '💧',
      art: art(0),
      move: 'droplets',
      cooldown: 8,
      cost: 2,
    },
    {
      name: 'Bubble Shield',
      about: `A shield on the ally with the lowest health: for ${BUBBLE.lasts} seconds it takes ${pct(1 - BUBBLE.taken)} less from the boss and deals ${pct(BUBBLE.dmg)} more. While the shield holds it can’t be knocked down, hits ${pct(BUBBLE.atk)} harder and is healed every second.`,
      words: `For ${BUBBLE.lasts} sec, casts a Shield that blocks ${healed('priest', BUBBLE.shield)} DMG on the ally with the lowest HP. While the Shield is active, gains immunity to CC, increases ATK and heals ${healed('priest', BUBBLE.heal)} HP every sec. For ${BUBBLE.lasts} sec, the ally takes ${pct(1 - BUBBLE.taken)} reduced DMG from Non-Hero targets and increases DMG dealt to Non-Hero enemies by ${pct(BUBBLE.dmg)}. The DMG Reduction effect from and the DMG Boost effect to Non-Hero enemies is irremovable.`,
      icon: '🫧',
      art: art(1),
      move: 'bubble',
      cooldown: 15,
      cost: 3,
    },
    {
      name: 'Festival of the Flow',
      about: `Knocks the boss down for ${FESTIVAL.down} seconds, heals every ally ${pct(FESTIVAL.heal)} of its max HP and gives every other ally ${FESTIVAL.mana / SECTION} mana. Then for ${FESTIVAL.lasts} seconds a whirlpool every ${FESTIVAL.every} seconds strikes the boss and knocks it down for ${FESTIVAL.whirlDown}.`,
      words: `Deals ${dmg('priest', FESTIVAL.blow)} M.DMG to nearby enemies and knocks them down for ${FESTIVAL.down} sec. Upon casting, heals HP of all allies by ${pct(FESTIVAL.heal)} of their Max HP and recovers ${FESTIVAL.mana / SECTION} orbs of Mana of allies excluding self. Afterward, for ${FESTIVAL.lasts} sec, creates a whirlpool every ${FESTIVAL.every} sec that deals ${dmg('priest', FESTIVAL.whirl)} M.DMG to random enemies and knocks them down for ${FESTIVAL.whirlDown} sec.`,
      icon: '🌊',
      art: art(2),
      move: 'festival',
      cooldown: 20,
      cost: 4,
    },
  ],
  passive: BLESSING,
  treasures: [
    treasure('Water Dragon Scale', (k) => ({
      words: `[Healing Droplets] Increases Heal Rate by ${pct(UT.scale.heals)}, and for ${UT.scale.lasts} sec, increases the target's M.Block by ${k(UT.scale.block)}.`,
      skill: { index: 0, heals: 1 + UT.scale.heals, party: { name: 'Water Dragon Scale', lasts: UT.scale.lasts, blocks: { magical: k(UT.scale.block) } } },
    })),
    treasure('Oasis Crystal', (k) => ({
      words: `[Bubble Shield] Reduces Cooldown by ${pct(k(UT.crystal.cooldown))} and dispels Negative Effects from the target.`,
      skill: { index: 1, cooldownShare: 1 - k(UT.crystal.cooldown) },
    })),
    // (One enemy: its whirlpools have only the boss to target.)
    treasure('Papyrus of the Flow', (k) => ({
      words: `[Festival of the Flow] Whirlpool effect targets 2 enemies and all allies recover additional ${k(UT.papyrus.mana)} mana.`,
      skill: { index: 2, allyMana: k(UT.papyrus.mana) },
    })),
    treasure('Tear of God Dragon', (k) => ({
      words: `[Blessing of the Water Dragon] Increases DEF boost by ${pct(UT.tear.defense)}. All allies recover Mana by ${k(UT.tear.mana)} every sec.`,
    })),
  ],
  perks: {
    's1-light': { words: `Heal rate is increased by ${pct(PERKS.heals - 1)}.` },
    's1-dark': { words: `Upon healing, M.Crit Resistance rises by ${pct(share(PERKS.critResist))}.` },
    's2-light': { words: 'Changes the target to the ally with the highest ATK.' },
    's2-dark': said({ skill: { index: 1, cost: -1 } }, ({ skill }) => `Mana cost is reduced by ${-skill.cost}.`),
    's3-light': { words: `DMG effect occurs every ${PERKS.whirl} sec.` },
    's3-dark': { words: `Heals all allies by ${pct(PERKS.festival)} of their max HP.` },
    's4-light': { words: `M.DEF increase rate increases by ${pct(PERKS.defense - 1)}, and M.Crit Resistance increases by ${PERKS.critResistMore}.` },
    's4-dark': said({ bonus: { resist: PERKS.resist } }, ({ bonus }) => `Increases self CC Resist by ${bonus.resist}.`),
    't5-light': t5Light({ blockMagical: 200 }, ({ blockMagical }) => `M.Block +${blockMagical}`),
    't5-dark': { words: `Recovers ${PERKS.mana.each} Mana of all allies every ${PERKS.mana.every} sec.` },
  },
  attack: 'splash',
  join(fight, self) {
    /** Whom her Bubble Shield is on, and for how long yet; and toward its next heal (once a second). */
    let bubbled: Fighter | null = null;
    let bubbleLeft = 0;
    let bubbleHeal = 0;
    /** How long her Festival of the Flow's whirlpools go on for yet, and toward the next. */
    let flowing = 0;
    let whirl = 0;
    /** Toward her unique weapon's next heal. */
    let mending = 0;
    const tier = self.unique?.tier ?? null;
    /** Her perks: how often the whirlpools come; her passive's M.DEF and M.Crit Resistance for every ally; and toward Transcend 5's Dark's next mana. */
    const whirlEvery = self.perks.has('s3-light') ? PERKS.whirl : FESTIVAL.every;
    // (Tear of God Dragon: more again.)
    const defense = 1 + (WATER_DRAGON.defense - 1) * (self.perks.has('s4-light') ? PERKS.defense : 1) * (treasureTier(self, 3) > 0 ? 1 + UT.tear.defense : 1);
    const tear = fromTreasure(self, 3, UT.tear.mana);
    const critResist = WATER_DRAGON.critResist + (self.perks.has('s4-light') ? PERKS.critResistMore : 0);
    let filling = 0;

    /** She is on the field, standing and in the fight. */
    const there = (): boolean => fight.field.includes(self) && self.hp > 0 && !away(self.statuses);
    /** Her allies on the field, standing and in the fight (her too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** The ally with the lowest health, for what it is out of. */
    const weakest = (): Fighter | undefined => allies().sort((a, b) => a.hp / a.stats.hp - b.hp / b.stats.hp)[0];
    /** Takes a status of hers off every fighter (she has left the field, or what gave it is over). */
    const lift = (name: string, from: readonly Fighter[] = fight.fighters): void => {
      for (const one of from) one.statuses = one.statuses.filter((status) => status.name !== name);
    };

    return {
      lands: {
        // Her attack: a bolt of water into the boss.
        splash() {
          fight.hit(self, SPLASH.blow);
        },
        // Every ally is healed (the more at half its health or less), and healing reaches it the more for a while.
        droplets() {
          const on = allies();
          fight.cue(self, 'droplets', on);
          for (const ally of on) {
            const low = ally.hp <= ally.stats.hp * DROPLETS.low;
            fight.heal(ally, DROPLETS.heal * (low ? DROPLETS.lowTimes : 1) * (self.perks.has('s1-light') ? PERKS.heals : 1), self);
            // (Its Dark: M.Crit Resistance as long.)
            const resisting = self.perks.has('s1-dark') ? { critResist: { magical: PERKS.critResist } } : {};
            put(ally.statuses, { name: DROPLETS_UP.name, left: DROPLETS.lasts, heals: 1 + DROPLETS.heals * (low ? DROPLETS.lowTimes : 1), ...resisting, shown: DROPLETS_UP });
          }
        },
        // A shield on the ally with the lowest health; it takes less and deals more for the whole while (more again while the shield holds: tick).
        bubble() {
          // (Its Light: the ally with the highest ATK.)
          const ally = self.perks.has('s2-light') ? allies().reduce<Fighter | undefined>((best, one) => (!best || one.stats.atk > best.stats.atk ? one : best), undefined) : weakest();
          if (!ally) return;
          fight.cue(self, 'bubble', [ally]);
          if (bubbled && bubbled !== ally) lift(BUBBLE_HOLDS.name, [bubbled]);
          // (Oasis Crystal: what the boss has left on it is gone.)
          if (treasureTier(self, 1) > 0) ally.statuses = ally.statuses.filter((status) => status.shown.harmful !== true || status.binds === true);
          fight.shield(ally, BUBBLE.shield, BUBBLE.lasts, self);
          put(ally.statuses, { name: BUBBLED.name, left: BUBBLE.lasts, takes: BUBBLE.taken, deals: 1 + BUBBLE.dmg, shown: BUBBLED });
          bubbled = ally;
          bubbleLeft = BUBBLE.lasts;
          bubbleHeal = 0;
        },
        // The boss is struck and knocked down; every ally is healed, and every other ally given mana; then the whirlpools begin (tick).
        festival() {
          const on = allies();
          fight.cue(self, 'festival', on);
          fight.hit(self, FESTIVAL.blow);
          fight.stun(FESTIVAL.down, { down: true, by: self });
          for (const ally of on) {
            fight.heal(ally, ally.stats.hp * (FESTIVAL.heal + (self.perks.has('s3-dark') ? PERKS.festival : 0)));
            if (ally !== self) ally.mana = Math.min(MAX_MANA, ally.mana + FESTIVAL.mana);
          }
          flowing = FESTIVAL.lasts;
          whirl = 0;
        },
      },
      // Each skill she uses: every ally takes less magical damage for a while.
      used() {
        put(fight.party, { name: WARDED.name, left: WATER_DRAGON.lasts, takes: { magical: WATER_DRAGON.taken }, shown: WARDED });
      },
      tick(dt) {
        // Her Bubble Shield: while it holds, its ally can't be knocked down, hits harder and is healed every second.
        if (bubbled) {
          bubbleLeft -= dt;
          const holds = bubbleLeft > 0 && bubbled.hp > 0 && bubbled.shield > 0;
          if (holds) {
            put(bubbled.statuses, { name: BUBBLE_HOLDS.name, left: bubbleLeft, guards: true, deals: 1 + BUBBLE.atk, shown: BUBBLE_HOLDS });
            bubbleHeal += dt;
            if (bubbleHeal >= 1) {
              bubbleHeal -= 1;
              fight.heal(bubbled, BUBBLE.heal, self);
            }
          } else {
            lift(BUBBLE_HOLDS.name, [bubbled]);
            bubbled = null;
          }
        }
        if (!there()) {
          // Off the field, or down: what she gives every ally while she is there goes, and her whirlpools stop.
          lift(BLESSED.name);
          lift(ELTOIRRE_UP.name);
          flowing = 0;
          return;
        }
        // Her passive, and her unique weapon's heal rate, on every ally while she is there.
        const on = allies();
        for (const ally of on) {
          put(ally.statuses, { name: BLESSED.name, left: Infinity, defends: { magical: defense }, critResist: { magical: critResist }, shown: BLESSED });
          if (tier !== null) put(ally.statuses, { name: ELTOIRRE_UP.name, left: Infinity, heals: 1 + atTier(ELTOIRRE.heals, tier), shown: ELTOIRRE_UP });
        }
        // Tear of God Dragon: every ally's mana, every second.
        if (tear > 0) for (const ally of on) ally.mana = Math.min(MAX_MANA, ally.mana + tear * dt);
        // Festival of the Flow's whirlpools: each strikes the boss and knocks it down again.
        if (flowing > 0) {
          flowing -= dt;
          whirl += dt;
          if (whirl >= whirlEvery) {
            whirl -= whirlEvery;
            fight.cue(self, 'whirlpool');
            fight.hit(self, FESTIVAL.whirl);
            fight.stun(FESTIVAL.whirlDown, { down: true, by: self });
          }
        }
        // Transcend 5's Dark: every ally's mana, every so often.
        if (self.perks.has('t5-dark')) {
          filling += dt;
          if (filling >= PERKS.mana.every) {
            filling -= PERKS.mana.every;
            for (const ally of on) ally.mana = Math.min(MAX_MANA, ally.mana + PERKS.mana.each);
          }
        }
        // Her unique weapon: every so often the ally with the lowest health is healed.
        if (tier !== null) {
          mending += dt;
          if (mending >= ELTOIRRE.every) {
            mending -= ELTOIRRE.every;
            const ally = weakest();
            if (ally) {
              fight.cue(self, 'eltoirre', [ally]);
              // (A share of her ATK: a heal's numbers are at ATK.)
              fight.heal(ally, atTier(ELTOIRRE.mend, tier) * ATK, self);
            }
          }
        }
      },
      lit: () => flowing > 0,
    };
  },
};
