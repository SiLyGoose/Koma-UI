import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA, SECTION } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { num, pct, skillArt, stateArt, type Buff, type Mark } from '../shown';
import { atTier, REDEAL } from '../unique';
import { attackStarts, bookDmg, CLASS_STATS, dmg, type HeroDef, indexed, type Passive } from './kit';

/*
 * Roi's skills, as the King's Raid Index (kingsraid.netlify.app) has them: the live game's Roi before he was reworked (how
 * hard each hits, at his class's ATK, his perks and his unique weapon are the Index's; what each costs and how long before it
 * can be used again, the live game's, shodyra's). The playtest's Roi (stats/roi.md) is reworked again ([Grievous Wound],
 * Slaughter, Curtain of Darkness on every ally), so nothing here is its but the pace of Hack's six blows. He is an assassin,
 * the Swift Assassin.
 * - Merciless: three blows, and a stack of Bleed on the boss (up to 3: a blow every second for 16 seconds).
 * - Curtain of Darkness: for a while, his ATK far higher (its books' half again), and every physical blow dodged.
 * - Blade Claw: a great blow, the harder for each stack of Bleed on the boss, which it takes off; a critical one gains him
 *   2 orbs of mana and has the skill ready again.
 * His passive, Hack: a critical blow of his attack, six blows more (none begun while those go on).
 * His unique weapon (../unique.ts) is worked here too: each part of his attack may deal a blow more and leave a stack of Bleed.
 * What is drawn for each, and what his body does, are King's Raid's own (../../assets/heroes/roi.ts; Curtain of Darkness's
 * move has the playtest's Hack clip after it, its blows nothing here).
 *
 * His own perks (../perks.ts) are the Index's; his unique treasures live King's Raid's, the Index's where it has them (Soma's
 * Hood, Cracked Mask), else krinfo's legacy (Shadow Blade, Specter's Ring). Merciless' "random enemy" and Blade Claw's
 * "lowest HP" are the boss here. Hack's Light gains him its mana once for each Hack. Curtain of Darkness' dodge does nothing
 * against a boss whose blows are magic (Galgoria's).
 */
/** Merciless: each of its three blows (its move's 2nd, 4th and 6th parts: the others are its run and turns). */
const MERCILESS = { blow: indexed('assassin', 327_996) / 3, blows: [1, 3, 5] };
/** A stack of Bleed: what it takes of the boss every second (the Index's 52,678 over its while), for how long, up to how many. */
const BLEED = { each: indexed('assassin', 52_678 / 16), lasts: 16, most: 3 };
/** Curtain of Darkness: how long; his ATK more (flat, its books' half again). */
const CURTAIN = { lasts: 10, atk: 36_035, books: 1.5 };
/** Blade Claw: its blow, how much more for each stack of Bleed, and the mana sections a critical one gains him. */
const CLAW = { blow: indexed('assassin', 269_430), bleed: 0.5, mana: 2 };
/** Hack: each of its six blows, and when each lands after it begins (the playtest's Hack's timeline). */
const HACK = { blow: indexed('assassin', 193_830) / 6, at: [0.1, 0.2, 0.3, 0.4, 0.6, 1] };
/**
 * His own perks' numbers: Merciless' Dark (the boss's more physical damage taken, for how long); Curtain of Darkness' Light (its
 * ATK boost more) and Dark (his attack's DMG meanwhile); Hack's Light (mana) and Dark (the chance of a stack of Bleed); and
 * Transcend 5's Dark (its chance on a critical blow, ATK Spd, crit DMG and how long).
 */
const PERKS = { takes: 1.25, lasts: 10, atk: 0.4, basic: 2, mana: 300, bleed: 0.5, dark: { chance: 0.1, speed: 300, critDamage: 0.6, lasts: 5 } };

/**
 * His unique treasures' numbers (0★ to 5★: ../treasures.ts; King's Raid's own): Merciless' mana on a critical blow; Curtain of
 * Darkness' ATK boost more and CC resist; Blade Claw's DMG and mana on a critical blow; Hack's DMG and his ATK Spd after a
 * critical blow of it.
 */
const UT = {
  blade: { mana: [200, 240, 290, 350, 420, 500] },
  hood: { atk: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], resist: 400 },
  mask: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], mana: 300 },
  ring: { dmg: 0.5, speed: [200, 240, 290, 350, 420, 500], lasts: 5 },
};

const art = skillArt('roi');

const HACK_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Hack', about: 'Passive. A critical blow of his attack: six blows more.', icon: '🔪', art: art(3) },
  words: `If a normal attack is landed as a Critical Hit, attacks the target 6 times to deal a total of ${dmg('assassin', HACK.blow * 6, bookDmg('roi', 3))} additional P.DMG.`,
};
/** Curtain of Darkness on him; Specter's Ring's ATK Spd; Transcend 5's Dark. */
const CURTAINED: Buff = { name: 'Curtain of Darkness', about: 'ATK far higher, and every physical blow dodged.', icon: '🌑', art: art(1) };
const RING: Buff = { name: 'Specter’s Ring', about: 'ATK Spd higher.', icon: '💍', art: art(3) };
const FRENZY: Buff = { name: 'Roi', about: 'ATK Spd and crit DMG higher.', icon: '🗡️', art: art(3) };

export const ROI: HeroDef = {
  id: 'roi',
  name: 'Roi',
  class: 'assassin',
  skins: ['Roi', 'Roi_School', 'Roi_Summer', 'Roi_Idol', 'Roi_Christmas', 'Roi_Wedding', 'Roi_NewYear', 'Roi_Summer19', 'Roi_Halloween', 'Roi_Story', 'Roi_Story2'],
  // An assassin (his blows physical): as his class stands.
  stats: { ...CLASS_STATS.assassin, deals: 'physical' },
  abilities: [
    {
      name: 'Merciless',
      about: `Three blows, and a stack of Bleed on the boss (up to ${BLEED.most}): a blow every second for ${BLEED.lasts} seconds.`,
      words: `Attacks a random enemy 3 times, dealing a total of ${dmg('assassin', MERCILESS.blow * 3, bookDmg('roi', 0))} P.DMG and inflicting 1 stack of Bleed on them that deals ${dmg('assassin', BLEED.each * BLEED.lasts, bookDmg('roi', 0))} P.DMG over ${BLEED.lasts} sec. Bleed can be stacked up to max ${BLEED.most} times.`,
      icon: '🩸',
      art: art(0),
      move: 'merciless',
      cooldown: 8,
      cost: 2,
    },
    {
      name: 'Curtain of Darkness',
      about: `For ${CURTAIN.lasts} seconds, his ATK far higher, and every physical blow dodged.`,
      words: `For ${CURTAIN.lasts} sec, ATK is increased by ${num(Math.round(CURTAIN.atk * CURTAIN.books))} and Dodges all P.DMG attacks.`,
      icon: '🌑',
      art: art(1),
      move: 'curtain',
      cooldown: 15,
      cost: 2,
    },
    {
      name: 'Blade Claw',
      about: `A great blow, ${pct(CLAW.bleed)} harder for each stack of Bleed on the boss, which it takes off; a critical one gains him ${CLAW.mana} orbs of mana and has it ready again.`,
      words: `Moves behind the enemy with the lowest HP and deals ${dmg('assassin', CLAW.blow, bookDmg('roi', 2))} P.DMG. Per every stacked Bleed, DMG is increased by ${pct(CLAW.bleed)} and all stacks of Bleed are removed after the attack. Upon Crit Hit, recovers ${CLAW.mana} MP and skill cooldown is reset.`,
      icon: '🐾',
      art: art(2),
      move: 'bladeclaw',
      cooldown: 20,
      cost: 3,
    },
  ],
  passive: HACK_SHOWN,
  treasures: [
    treasure('Shadow Blade', (k) => ({
      words: `[Merciless] Dispels all negative effects from self, and recovers Mana by ${k(UT.blade.mana)} upon Critical Hit.`,
      skill: { index: 0, cleanse: 'self', critMana: k(UT.blade.mana) },
    })),
    treasure('Soma’s Hood', (k) => ({
      words: `[Curtain of Darkness] Increases ATK Boost by ${pct(k(UT.hood.atk))} and gains CC resist by ${UT.hood.resist} for the skill's duration.`,
    })),
    treasure('Cracked Mask', (k) => ({
      words: `[Blade Claw] DMG is increased by ${pct(k(UT.mask.dmg))}, and Upon Crit Hit, mana is recovered by ${UT.mask.mana}.`,
      skill: { index: 2, dmg: 1 + k(UT.mask.dmg), critMana: UT.mask.mana },
    })),
    treasure('Specter’s Ring', (k) => ({
      words: `[Hack] Increases DMG by ${pct(UT.ring.dmg)}. Upon a Critical Hit, increases own ATK Spd by ${k(UT.ring.speed)} for ${UT.ring.lasts} sec.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, cost: -1 } }, ({ skill }) => `Mana cost is reduced by ${-skill.cost}.`),
    's1-dark': said(
      { skill: { index: 0, mark: { name: 'Merciless', lasts: PERKS.lasts, takes: { physical: PERKS.takes } } } },
      ({ skill }) => `Target takes ${pct(PERKS.takes - 1)} increased P.DMG for ${skill.mark.lasts} sec.`,
    ),
    's2-light': { words: `ATK boost is increased by ${pct(PERKS.atk)}.` },
    's2-dark': { words: `Auto attack DMG is boosted by ${pct(PERKS.basic - 1)} for the duration.` },
    's3-light': said({ skill: { index: 2, cost: 1, dmg: 2 } }, ({ skill }) => `In exchange for ${skill.cost} additional Mana Cost, DMG dealt is increased by ${pct(skill.dmg - 1)}.`),
    's3-dark': said({ skill: { index: 2, cooldown: -20 } }, () => 'Cooldown is removed.'),
    's4-light': { words: `Each attack recovers ${PERKS.mana} mana.` },
    's4-dark': { words: `Has a ${pct(PERKS.bleed)} chance to stack 1 stack of Bleed.` },
    't5-light': t5Light({ critDamage: 0.2 }, ({ critDamage }) => `Crit DMG +${pct(critDamage)}`),
    't5-dark': {
      words: `Upon a Crit Hit, there is a ${pct(PERKS.dark.chance)} chance of ATK Spd increasing by ${PERKS.dark.speed} and Crit DMG increasing by ${pct(PERKS.dark.critDamage)} for ${PERKS.dark.lasts} sec. Does not activate again during activation.`,
    },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    const starts = attackStarts('roi');
    /** How long Curtain of Darkness lasts yet; Bleed's stacks on the boss (how long each lasts yet), and toward their next bite; Hack's blows to come (how long till each). */
    let curtain = 0;
    const bleeds: number[] = [];
    let bleeding = 0;
    const hacks: number[] = [];
    // (Curtain of Darkness' ATK: a share of his own, as the fight begins; its Light's and Soma's Hood's ATK Boost added to its books', as King's Raid adds them.)
    const curtainAtk = (CURTAIN.atk * (CURTAIN.books + (self.perks.has('s2-light') ? PERKS.atk : 0) + fromTreasure(self, 1, UT.hood.atk))) / self.stats.atk;

    /** A stack of Bleed more on the boss (at the most, the one with the least left begun again). */
    const bleed = (): void => {
      if (bleeds.length < BLEED.most) bleeds.push(BLEED.lasts);
      else bleeds[bleeds.indexOf(Math.min(...bleeds))] = BLEED.lasts;
    };
    /** A blow of his: a critical one, Transcend 5's Dark now and then (not while it is on). */
    const strike = (amount: number, counted = true): boolean => {
      const critical = fight.hit(self, amount, counted);
      if (critical && self.perks.has('t5-dark') && !self.statuses.some((status) => status.name === FRENZY.name) && fight.roll() < PERKS.dark.chance)
        put(self.statuses, { name: FRENZY.name, left: PERKS.dark.lasts, speed: PERKS.dark.speed, critDamage: PERKS.dark.critDamage, shown: FRENZY });
      return critical;
    };
    /** A blow of Hack (Specter's Ring: harder, and a critical one quickens him a while); its Dark: now and then a stack of Bleed. */
    const hack = (): void => {
      const ring = wearsTreasure(self, 3);
      const critical = strike(HACK.blow * (ring ? 1 + UT.ring.dmg : 1), false);
      if (critical && ring) put(self.statuses, { name: RING.name, left: UT.ring.lasts, speed: fromTreasure(self, 3, UT.ring.speed), shown: RING });
      if (self.perks.has('s4-dark') && fight.roll() < PERKS.bleed) bleed();
    };

    return {
      lands: {
        // His attack: a blow (Curtain of Darkness' Dark: harder meanwhile); a critical one, Hack (unless one goes on; its Light:
        // mana). With his unique weapon, each part of it may deal a blow more and leave a stack of Bleed.
        attack(part) {
          const critical = strike(fight.basic * (curtain > 0 && self.perks.has('s2-dark') ? PERKS.basic : 1));
          if (critical && hacks.length === 0) {
            hacks.push(...HACK.at);
            if (self.perks.has('s4-light')) self.mana = Math.min(MAX_MANA, self.mana + PERKS.mana);
          }
          if (tier === null || !starts.has(part) || fight.roll() >= atTier(REDEAL.chance, tier)) return;
          strike(atTier(REDEAL.blow, tier), false);
          bleed();
        },
        // Three blows; the last, a stack of Bleed.
        merciless(part) {
          if (!MERCILESS.blows.includes(part)) return;
          strike(MERCILESS.blow);
          if (part === MERCILESS.blows.at(-1)) bleed();
        },
        // (Its move's first part only: what follows is the playtest's Hack clip.)
        curtain() {},
        // A great blow, the harder for each stack of Bleed, which it takes off; a critical one, mana and the skill ready again.
        bladeclaw() {
          const critical = strike(CLAW.blow * (1 + CLAW.bleed * bleeds.length));
          bleeds.length = 0;
          if (!critical) return;
          self.mana = Math.min(MAX_MANA, self.mana + CLAW.mana * SECTION);
          self.cooldowns[2] = 0;
        },
      },
      // Curtain of Darkness: his ATK far higher for a while (Soma's Hood: and his CC resist).
      used(index) {
        if (index !== 1) return;
        curtain = CURTAIN.lasts;
        put(self.statuses, { name: CURTAINED.name, left: CURTAIN.lasts, atk: curtainAtk, ...(wearsTreasure(self, 1) && { resist: UT.hood.resist }), shown: CURTAINED });
      },
      // Under Curtain of Darkness, a physical blow dodged.
      untouched: () => curtain > 0 && fight.foe.def.stats.deals === 'physical',
      tick(dt) {
        curtain = Math.max(0, curtain - dt);
        // Hack's blows, each as its while is up.
        for (let i = hacks.length - 1; i >= 0; i--) hacks[i] = (hacks[i] as number) - dt;
        while (hacks.length > 0 && (hacks[0] as number) <= 0) {
          hacks.shift();
          hack();
        }
        // Bleed: every second, what each stack takes of the boss.
        for (let i = bleeds.length - 1; i >= 0; i--) {
          bleeds[i] = (bleeds[i] as number) - dt;
          if ((bleeds[i] as number) <= 0) bleeds.splice(i, 1);
        }
        if (bleeds.length === 0) {
          bleeding = 0;
          return;
        }
        bleeding += dt;
        if (bleeding < 1) return;
        bleeding -= 1;
        fight.continuous(self, BLEED.each * bleeds.length);
      },
      lit: () => curtain > 0,
      marks: (): Mark[] => (bleeds.length > 0 ? [{ text: `Bleed ×${bleeds.length}`, tone: 'curse', art: stateArt('Bleeding'), count: String(bleeds.length) }] : []),
    };
  },
};
