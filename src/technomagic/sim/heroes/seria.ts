import { share } from '../combat/damage';
import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { MAX_MANA, SECTION } from '../rules';
import { fine, pct, seconds, skillArt, type Buff } from '../shown';
import { atTier, ELSION, ELSION_UP } from '../unique';
import { type Ability, bookDmg, CLASS_STATS, dmg, type HeroDef, indexed, type Passive } from './kit';
import { CODED } from './moves';

/*
 * Seria's skills, as the game has them (what each costs, how long before it can be used again, how long what it
 * does lasts, and the shares are the game's; how hard each hits, and how often the moon ripens, are not said there):
 * - Mysterious Sword - Falling Petals: a cut across the boss; for 5 seconds after, its slot holds Mysterious Sword -
 *   Blossom (a cut down on it), once. Falling Petals' own cooldown runs meanwhile, and is what is left of it after.
 * - Blood Scattering Blade: a rush in with a cut that leaves Original Sin of Blood on the boss (its attacks slower
 *   for 3 seconds); then two more cuts, each with a blow more that goes through its defense.
 * - Red Moon Blade: a great cut, and more on a boss. Every so often the moon ripens and she has Moonlight for a
 *   second: used then, it cuts again, and leaves the boss healed not at all for a while.
 * Her passive, Cold-Blooded Witch: her ATK higher, and each critical blow of her skills makes her critical blows
 * harder (up to 30 times over, for the rest of the fight).
 * Her unique weapon (../unique.ts) is worked here too: a critical blow of her skills deals more, leaves the
 * boss healed less for a while, and heals her the more (up to 5 times over).
 * What is drawn for each is ../../heroes/seria/fx.ts; what her body does for each, ../../heroes/seria/moves.ts (her attack is her slash's animation: ../../assets/heroes/seria.ts).
 *
 * Her own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Red Moon
 * Blade's Light does nothing here: there is nothing on the boss to dispel. Blood Scattering Blade's Dark's mana is the
 * game's 200 of its 1000 to a section, for each of its blows. Transcend 5's Dark's more DMG taken is from Heroes: none here.
 */
// (How hard each of her skills hits is the King's Raid Index's, at her class's ATK: ./kit.ts's indexed.)
const PETALS = { blow: indexed('warrior', 161_315), window: 5 };
const BLOSSOM = { blow: PETALS.blow };
// (Its slow, as the game has it: an ATK Spd reduction, in points. Its cuts after the rush: its move's blows but the first.)
const SCATTER = { rush: indexed('warrior', 29_043), cuts: CODED.scatter.lands.length - 1, cut: indexed('warrior', 96_136) / (CODED.scatter.lands.length - 1), through: indexed('warrior', 94_128) / (CODED.scatter.lands.length - 1), pierce: 1000, speed: 300, lasts: 3 };
// (In Moonlight, the boss is healed `heals` as much for `unhealed` seconds.)
const MOON = { blow: indexed('warrior', 376_079), boss: indexed('warrior', 186_384), ripe: indexed('warrior', 415_888), ripeBoss: indexed('warrior', 195_815), every: 6, light: 1, unhealed: 10, heals: 0 };
// (Its ATK as the game has it, added to her class's.)
const WITCH = { atk: 38_567, critDamage: 0.05, most: 30 };
/**
 * Her own perks' numbers: Blossom's less healing for the boss, Blood Scattering Blade's mana for each blow, Red Moon
 * Blade's more DMG for each time it has been used (most), her less taken for each stack of Cold-Blooded Witch, her
 * opening's more DMG, and Transcend 5's Dark's more taken from Heroes.
 */
const PERKS = { unhealed: { heals: 0.5, lasts: 5 }, blossomCost: 1, mana: 0.2 * SECTION, moon: { dmg: 0.15, most: 10 }, taken: 0.015, opening: { deals: 1.25, lasts: 200 }, reckless: 1.15 };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts): Falling Petals' and Blossom's DMG, Falling Petals' mana on a
 * critical blow and Blossom's seconds off Falling Petals' cooldown on one; Blood Scattering Blade's DMG and less M.Block
 * on the boss (points, for as long as its Magic Weakness would last); Red Moon Blade's more DMG for her first so many blows of
 * the fight; and Cold-Blooded Witch's ATK Boost higher and more DMG to the boss for each stack.
 */
const UT = {
  whetstone: { dmg: 0.5, mana: [200, 240, 290, 350, 420, 500], seconds: [0.8, 1, 1.2, 1.4, 1.7, 2] },
  abyss: { dmg: 0.5, block: [200, 240, 290, 350, 420, 500], lasts: 10 },
  candle: { dmg: 0.7, times: [5, 7, 9, 11, 13, 15] },
  trigrams: { atk: 0.5, dmg: [0.006, 0.007, 0.008, 0.01, 0.012, 0.015] },
};

const art = skillArt('seria');

/** What Falling Petals' slot holds for a while after it is used (its picture is Falling Petals'). */
const BLOSSOM_SKILL: Ability = { name: 'Mysterious Sword - Blossom', about: `A cut down on the boss: once, within ${PETALS.window} seconds of [Falling Petals].`, icon: '🌸', art: art(0), move: 'blossom', cooldown: 0, cost: 1 };

const COLD_BLOODED: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Cold-Blooded Witch', about: `Passive. Her ATK is higher, and each critical blow of her skills gives her ${pct(WITCH.critDamage)} more crit damage (up to ${WITCH.most} times).`, icon: '🩸', art: art(3) },
  words: `ATK is increased by ${WITCH.atk}. Upon a critical skill hit, own Crit DMG is increased by ${pct(WITCH.critDamage)}. This effect can be stacked up to ${WITCH.most} times.`,
};
/** Her Cold-Blooded Witch's stacks: shown on her card, with how many she has. */
const WITCHED: Buff = { name: 'Cold-Blooded Witch', about: `${pct(WITCH.critDamage)} more crit damage for each.`, icon: '🩸', art: art(3) };
/** Moonlight: shown on her card for the second it lasts. */
const MOONLIGHT: Buff = { name: 'Moonlight', about: `[Red Moon Blade] used now cuts again, and leaves the boss healed ${pct(1 - MOON.heals)} less for ${MOON.unhealed} seconds.`, icon: '🌕', art: art(2) };
/** What her skills leave on the boss. */
const SIN = 'Original Sin of Blood';
const WILTED = 'Mysterious Sword - Blossom';
/** What her perks give her: her opening's more DMG (Cold-Blooded Witch's Dark), and Transcend 5's Dark. */
const OPENING: Buff = { name: 'Cold-Blooded Witch (opening)', about: `Deals ${pct(PERKS.opening.deals - 1)} more to the boss.`, icon: '🩸', art: art(3) };
const RECKLESS: Buff = { name: 'Bloodthirst', about: 'Every blow of hers critical; but she can’t block.', icon: '🩸', art: art(3) };
/** Red Moon Blade's Dark: its more DMG, with how many times she has used it. */
const WAXED: Buff = { name: 'Red Moon Blade', about: `[Red Moon Blade] deals ${pct(PERKS.moon.dmg)} more for each.`, icon: '🌙', art: art(2) };
/** Demonic Eight Trigrams: Cold-Blooded Witch's ATK higher. */
const TRIGRAMS: Buff = { name: 'Demonic Eight Trigrams', about: `[Cold-Blooded Witch]'s ATK ${pct(UT.trigrams.atk)} higher.`, icon: '🩸', art: art(3) };
const UNHEALED = 'Red Moon';

export const SERIA: HeroDef = {
  id: 'seria',
  name: 'Seria',
  class: 'warrior',
  skins: ['Seria', 'Seria_Christmas', 'Seria_NewYear', 'Seria_Wedding', 'Seria_Summer', 'Seria_School', 'Seria_Glory', 'Seria_Glory2', 'Seria_Fallen', 'Seria_Halloween'],
  // A warrior whose blows are magical, her ATK higher for her passive: as her class stands, otherwise.
  stats: { ...CLASS_STATS.warrior, atk: CLASS_STATS.warrior.atk + WITCH.atk, deals: 'magical' },
  abilities: [
    {
      name: 'Mysterious Sword - Falling Petals',
      about: `A cut across the boss. For ${PETALS.window} seconds after, this slot holds [Mysterious Sword - Blossom], once.`,
      words: `Performs a horizontal slash to the front and deals ${dmg('warrior', PETALS.blow, bookDmg('seria', 0))} M.DMG to the target and enemies in a narrow range. Can activate [Mysterious Sword - Blossom] (${BLOSSOM_SKILL.cost} Mana: a vertical slash to the front, dealing ${dmg('warrior', BLOSSOM.blow, bookDmg('seria', 0))} M.DMG to the target and enemies in a narrow range) once within ${PETALS.window} sec after use.`,
      icon: '🌸',
      art: art(0),
      move: 'petals',
      cooldown: 7,
      cost: 1,
    },
    {
      name: 'Blood Scattering Blade',
      about: `A rush in with a cut that leaves [Original Sin of Blood] (the boss’s attacks ${pct(share(SCATTER.speed))} slower for ${SCATTER.lasts} seconds); then ${SCATTER.cuts} more cuts, each with a blow more through its defense.`,
      words: `Rapidly charges forward to deal ${dmg('warrior', SCATTER.rush, bookDmg('seria', 1))} M.DMG and inflicts irremovable Original Sin of Blood on enemies for ${SCATTER.lasts} sec. Enemies under Original Sin of Blood have their ATK Spd reduced by ${SCATTER.speed}. Shortly afterward, attacks enemies under Original Sin of Blood ${SCATTER.cuts} times, and deals additional ${dmg('warrior', SCATTER.cut * SCATTER.cuts, bookDmg('seria', 1))} M.DMG, and if the target is not a hero, deals additional ${dmg('warrior', SCATTER.through * SCATTER.cuts, bookDmg('seria', 1))} DEF Ignoring M.DMG.`,
      icon: '🩸',
      art: art(1),
      move: 'scatter',
      cooldown: 13,
      cost: 2,
    },
    {
      name: 'Red Moon Blade',
      about: `A great cut, harder on a boss. Used in [Moonlight] (${seconds(MOON.light)} of it every ${MOON.every} seconds): it cuts again, and the boss is healed ${pct(1 - MOON.heals)} less for ${MOON.unhealed} seconds.`,
      words: `Brandishes a moon-bloodying sword, dealing ${dmg('warrior', MOON.blow, bookDmg('seria', 2))} M.DMG to enemies in a wide range, and additional ${dmg('warrior', MOON.boss, bookDmg('seria', 2))} M.DMG on non-Hero enemies. When the moon is ripe, gains Moonlight for ${MOON.light} sec, and when cast at this state, deals ${dmg('warrior', MOON.ripe, bookDmg('seria', 2))} M.DMG to enemies and reduces their Heal Rate by ${pct(1 - MOON.heals)}. If the target is not a hero, deals additional ${dmg('warrior', MOON.ripeBoss, bookDmg('seria', 2))} M.DMG.`,
      icon: '🌙',
      art: art(2),
      move: 'moon',
      cooldown: 20,
      cost: 4,
    },
  ],
  passive: COLD_BLOODED,
  treasures: [
    // (Falling Petals' more DMG is the fight's; Blossom is Falling Petals' slot's for a while, and the mana and seconds on a critical blow: her part's.)
    treasure('Whetstone of Demon', (k) => ({
      words: `[Mysterious Sword - Falling Petals] Increases DMG by ${pct(UT.whetstone.dmg)}, and upon Critical Hit, recovers Mana by ${k(UT.whetstone.mana)}. [Mysterious Sword - Blossom] Increases DMG by ${pct(UT.whetstone.dmg)}, and upon Critical Hit, reduces Cooldown of [Mysterious Sword - Falling Petals] by ${k(UT.whetstone.seconds)} sec.`,
      skill: { index: 0, dmg: 1 + UT.whetstone.dmg },
    })),
    treasure('Ring of Abyss', (k) => ({
      words: `[Blood Scattering Blade] Increases DMG by ${pct(UT.abyss.dmg)} and reduces M.Block of affected enemies by ${k(UT.abyss.block)}.`,
      skill: { index: 1, dmg: 1 + UT.abyss.dmg, mark: { name: 'Ring of Abyss', blocks: { magical: -k(UT.abyss.block) }, lasts: UT.abyss.lasts } },
    })),
    // (Its more DMG is for her blows, the first so many of the fight: her part's.)
    treasure('Enlightening Candlelight', (k) => ({
      words: `[Red Moon Blade] Gains immunity to CC for the duration of the Skill. At the beginning of battle, increases DMG by ${pct(UT.candle.dmg)} for ${k(UT.candle.times)} times.`,
      skill: { index: 2, steady: true },
    })),
    // (Its ATK and its more DMG for each stack are her passive's: her part's.)
    treasure('Demonic Eight Trigrams', (k) => ({
      words: `[Cold-Blooded Witch] Increases ATK Boost by ${pct(UT.trigrams.atk)} and DMG Boost against Non-Hero enemies by an additional ${fine(k(UT.trigrams.dmg))} per stack.`,
    })),
  ],
  perks: {
    's1-light': said(
      { skill: { index: 0, cost: -1 } },
      ({ skill }) =>
        `[Mysterious Sword - Falling Petals] - Mana cost is reduced by ${-skill.cost}. [Mysterious Sword - Blossom] - Hit enemies' heal rate is reduced by ${pct(1 - PERKS.unhealed.heals)} for ${PERKS.unhealed.lasts} sec.`,
    ),
    's1-dark': said(
      { skill: { index: 0, mark: { name: 'Magic Weakness', takes: { magical: 1.25 }, lasts: 10 } } },
      ({ skill: { mark } }) =>
        `[Mysterious Sword - Falling Petals] - Target takes ${pct(mark.takes.magical - 1)} increased M.DMG for ${mark.lasts} sec. [Mysterious Sword - Blossom] - Mana cost is increased by ${PERKS.blossomCost}, and ignores enemy's DEF.`,
    ),
    's2-light': said({ skill: { index: 1, cooldownShare: 0.95 } }, ({ skill }) => `Reduces Cooldown by ${pct(1 - skill.cooldownShare)} for every 1 hit enemy.`),
    's2-dark': { words: `Upon each DMG dealt, recovers ${PERKS.mana} Mana.` },
    's3-light': { words: 'Dispels positive effects of all enemies in range.' },
    's3-dark': { words: `Using [Red Moon Blade] increases DMG of [Red Moon Blade] by ${pct(PERKS.moon.dmg)}. This effect can be stacked up to max ${PERKS.moon.most} times.` },
    's4-light': { words: `Each stack reduces DMG taken by an additional ${fine(PERKS.taken)}.` },
    's4-dark': { words: `At the beginning of each battle, increases DMG dealt to Non-Hero enemies by ${pct(PERKS.opening.deals - 1)} for ${PERKS.opening.lasts} sec.` },
    't5-light': t5Light({ critDamage: 0.2 }, ({ critDamage }) => `Crit DMG +${pct(critDamage)}`),
    't5-dark': { words: `Seria's all attacks will be a Crit Hit, but her All Block will be disabled and she takes ${pct(PERKS.reckless - 1)} increased DMG from Heroes.` },
  },
  // Her animations: one slash where she stands.
  timing: { attack: [{ lands: [0.86], until: 1.1 }] },
  join(fight, self) {
    /** How long Blossom can be used for yet, and Falling Petals' own cooldown meanwhile. */
    let blossom = 0;
    let petals = 0;
    /** Toward the moon's ripening, and how long her Moonlight lasts yet; whether Red Moon Blade was used in it (as it began). */
    let waxing = 0;
    let moonlight = 0;
    let ripe = false;
    /** Her Cold-Blooded Witch's stacks, and her unique weapon's. */
    let witch = 0;
    let elsion = 0;
    /** How many times she has used Red Moon Blade (its Dark's stacks). */
    let moons = 0;
    const tier = self.unique?.tier ?? null;
    // Her perks: Blossom costs more and cuts through the boss's defense (Falling Petals' Dark); as the fight begins, her opening, and Transcend 5's Dark (a block that can't be; what it takes more of is from Heroes, none here).
    const blossomSkill = self.perks.has('s1-dark') ? { ...BLOSSOM_SKILL, cost: BLOSSOM_SKILL.cost + PERKS.blossomCost } : BLOSSOM_SKILL;
    if (self.perks.has('s4-dark')) put(self.statuses, { name: OPENING.name, left: PERKS.opening.lasts, deals: PERKS.opening.deals, shown: OPENING });
    if (self.perks.has('t5-dark')) put(self.statuses, { name: RECKLESS.name, left: Infinity, crit: 1, blocks: { physical: -Infinity, magical: -Infinity }, shown: RECKLESS });

    /** A blow of a skill of hers: a critical one makes her critical blows harder, and (with her unique weapon) deals more, and leaves the boss healed less and her healed more. */
    const cut = (amount: number, pierce = 0, whole = false): boolean => {
      if (!fight.hit(self, amount, true, pierce, whole)) return false;
      witch = Math.min(WITCH.most, witch + 1);
      // (Its Light: less taken for each.)
      put(self.statuses, { name: WITCHED.name, left: Infinity, count: witch, critDamage: WITCH.critDamage * witch, ...(self.perks.has('s4-light') && { takes: 1 - PERKS.taken * witch }), shown: WITCHED });
      if (tier === null) return true;
      fight.hit(self, atTier(ELSION.blow, tier), false);
      put(fight.foe.statuses, { name: ELSION.name, left: ELSION.lasts, heals: 1 - atTier(ELSION.unhealed, tier), shown: 'curse' });
      elsion = Math.min(ELSION.most, elsion + 1);
      put(self.statuses, { name: ELSION_UP.name, left: ELSION.healed, count: elsion, heals: 1 + atTier(ELSION.heals, tier) * elsion, shown: ELSION_UP });
      return true;
    };
    /**
     * How many times as much a blow of her skill in slot `index` (its move `move`) lands for `more` of its DMG: King's Raid's
     * skill power is its books and its perks added up (../fight.ts), so what a perk here adds is added to them, not multiplied by them.
     */
    const added = (index: number, move: 'blossom' | 'moon', more: number): number => 1 + more / (bookDmg('seria', index) + (self.moveDmg[move] ?? 1) - 1);
    // Her unique treasures: Whetstone of Demon's more DMG for Blossom (Falling Petals' is its own: the fight's); Enlightening Candlelight's blows left; Demonic Eight Trigrams' DMG for each stack.
    const whetstone = wearsTreasure(self, 0);
    const honed = whetstone ? added(0, 'blossom', UT.whetstone.dmg) : 1;
    let candle = fromTreasure(self, 2, UT.candle.times);
    const trigrams = fromTreasure(self, 3, UT.trigrams.dmg);
    // (Demonic Eight Trigrams: her passive's ATK half again, as a share of her ATK, as statuses have it.)
    if (wearsTreasure(self, 3)) put(self.statuses, { name: TRIGRAMS.name, left: Infinity, atk: (WITCH.atk * UT.trigrams.atk) / self.stats.atk, shown: TRIGRAMS });

    return {
      lands: {
        // (Whetstone of Demon: a critical blow gains her mana.)
        petals() {
          if (cut(PETALS.blow) && whetstone) self.mana = Math.min(MAX_MANA, self.mana + fromTreasure(self, 0, UT.whetstone.mana));
        },
        // (Whetstone of Demon: more, and a critical blow takes seconds off Falling Petals' cooldown.)
        blossom() {
          if (cut(BLOSSOM.blow * honed, 0, self.perks.has('s1-dark')) && whetstone) petals = Math.max(0, petals - fromTreasure(self, 0, UT.whetstone.seconds));
          // (Falling Petals' Light: the boss healed less for a while.)
          if (self.perks.has('s1-light')) put(fight.foe.statuses, { name: WILTED, left: PERKS.unhealed.lasts, heals: PERKS.unhealed.heals, shown: 'curse' });
        },
        // The rush in leaves Original Sin of Blood on the boss (its attacks slower); each cut after it, a blow more through its defense.
        scatter(part) {
          // (Its Dark: mana for each of its blows.)
          const blows = part === 0 ? 1 : 2;
          if (self.perks.has('s2-dark')) self.mana = Math.min(MAX_MANA, self.mana + PERKS.mana * blows);
          if (part === 0) {
            cut(SCATTER.rush);
            put(fight.foe.statuses, { name: SIN, left: SCATTER.lasts, shown: 'curse' });
            fight.slow(SCATTER.speed, SCATTER.lasts);
            return;
          }
          cut(SCATTER.cut);
          cut(SCATTER.through, SCATTER.pierce);
        },
        // A great cut, and more on a boss; in Moonlight, again, and the boss is healed not at all for a while.
        moon() {
          // (Its Dark: the more for each time she has used it, this time with them, added to its power.)
          const waxed = added(2, 'moon', PERKS.moon.dmg * moons);
          cut((MOON.blow + MOON.boss) * waxed);
          if (!ripe) return;
          cut((MOON.ripe + MOON.ripeBoss) * waxed);
          put(fight.foe.statuses, { name: UNHEALED, left: MOON.unhealed, heals: MOON.heals, shown: 'curse' });
        },
      },
      // For a while after Falling Petals, its slot holds Blossom.
      slot: (index) => (index === 0 && blossom > 0 ? blossomSkill : (self.abilities[index] ?? null)),
      used(index, ability) {
        if (index === 0 && ability === blossomSkill) {
          // Blossom used: Falling Petals again, with what is left of its cooldown.
          blossom = 0;
          self.cooldowns[0] = petals;
        } else if (index === 0) {
          // Falling Petals: Blossom ready for a while, its own cooldown kept here meanwhile.
          blossom = PETALS.window;
          petals = ability.cooldown;
          self.cooldowns[0] = 0;
        } else if (ability.move === 'moon') {
          ripe = moonlight > 0;
          if (self.perks.has('s3-dark')) moons = Math.min(PERKS.moon.most, moons + 1);
        }
      },
      tick(dt) {
        if (blossom > 0) {
          blossom -= dt;
          petals = Math.max(0, petals - dt);
          self.cooldowns[0] = blossom > 0 ? 0 : petals;
        }
        // The moon ripens every so often, and she has Moonlight a moment.
        if (moonlight > 0) moonlight = Math.max(0, moonlight - dt);
        waxing += dt;
        if (waxing >= MOON.every) {
          waxing -= MOON.every;
          moonlight = MOON.light;
        }
      },
      deals: () => (candle > 0 ? 1 + UT.candle.dmg : 1) * (1 + trigrams * witch),
      blow() {
        if (candle > 0) candle--;
      },
      lit: () => moonlight > 0,
      // Auto goes for Red Moon Blade in Moonlight.
      now: (index) => index === 2 && moonlight > 0,
      buffs: () => [...(moonlight > 0 ? [{ ...MOONLIGHT, left: moonlight }] : []), ...(moons > 0 ? [{ ...WAXED, count: moons }] : [])],
    };
  },
};
