import { POINTS } from "../combat/damage";
import { away, put } from "../combat/status";
import { said, t5Light } from "../perks";
import { MANA_PER_HP_LOST, MAX_MANA } from "../rules";
import { fromTreasure, treasure, wearsTreasure } from "../treasures";
import { fine, num, pct, skillArt, type Buff } from "../shown";
import type { Fighter } from "../types";
import { atTier, LEIFENDE, LEIFENDE_UP } from "../unique";
import {
  attackStarts,
  bookDmg,
  CLASS_STATS,
  dmg,
  type HeroDef,
  type Passive,
  played,
} from "./kit";

/*
 * Shakmeh's skills, as King's Raid's playtest has them (stats/shakmeh.md: how hard each hits at its level 90, and every
 * number here, are its; its words are live King's Raid's, krinfo's legacy, the same kit). He is a knight whose blows are
 * physical, the Shadow of the Sun.
 * - Wind of Hatred: five blows in a line, each gaining him mana.
 * - Gate of Grudges: a gate before him for 7 seconds, a blow every second (its [Grudge] stacking on the boss: healed less).
 * - Advent of Despair: what is on him cleared and his [Dark Spirit] all spent: every ally's ATK higher for a while, and a blow
 *   on every enemy that stuns it, which then takes more physical damage; the more of each, and the harder the blow, for
 *   every stack spent.
 * His passive, Vessel of Dark Spirit: his max HP higher; each blow of his skills a blow more (a share of his max HP), every
 *   ally healed a little and its M.DEF higher for a while (up to 30 times), and a stack of [Dark Spirit] on him (up to 30).
 * His unique weapon (../unique.ts) is worked here too: each part of his attack heals him a little and gives a stack of
 * [Demon Beast]; at 10, every enemy takes more physical damage for a while, and he is [Demon Beast of Darkness]: quicker
 * and healed more (every other ally half as much), stacking none meanwhile.
 * What is drawn for each, and what his body does, are King's Raid's own (../../assets/heroes/shakmeh.ts).
 *
 * His own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Gate of
 * Grudges' 7 blows are its gate's (the playtest's SkillProjectileTable: 6.3 s, a blow every second, the first as it is
 * made). Wind of Hatred's Dark, as every dispel here, takes off what has the boss deal more. Vessel of Dark Spirit's Dark
 * holds while only one enemy stands (the boss alone, not a Dragon Raid's waves). Transcend 5's Dark: his share of the
 * ally's blows is worked out from what the blow did to it (its own DEF standing in for his), given back to it and taken
 * from his shield and health (never below 1 HP).
 */
/** Wind of Hatred: each of its five blows, and the mana each gains him. */
const WIND = { blow: played("knight", 700, 38_628), hits: 5, mana: 100 };
/** Gate of Grudges: each of its blows, how many (a second apart, the first as it is made); [Grudge]'s seconds, most stacks, and less healing for each (Non-Hero enemies: `boss` times that). */
const GATE = {
  blow: played("knight", 450, 26_821),
  hits: 7,
  every: 1,
  lasts: 7,
  grudge: { lasts: 15, most: 5, heals: 0.04, boss: 2 },
};
/**
 * Advent of Despair: its blow, and its stun; every ally's ATK (and more for each [Dark Spirit] spent), the boss's more P.DMG
 * taken (and more for each), for how long; and its DMG more for each stack (Non-Hero enemies: `boss` times that).
 */
const ADVENT = {
  blow: played("knight", 900, 38_628),
  stun: 3,
  atk: 0.1,
  atkEach: 0.005,
  takes: 0.2,
  takesEach: 0.01,
  lasts: 15,
  dmgEach: 0.1,
  boss: 2,
};
/**
 * Vessel of Dark Spirit: his max HP more (and his books' more again); each blow of his skills a blow more and every ally's
 * heal (shares of his max HP), and their M.DEF more (flat) for how long, up to how many times; [Dark Spirit]'s seconds and most.
 */
const VESSEL = {
  hp: 0.2,
  books: 0.15,
  blow: 0.01,
  heal: 0.001,
  defense: 643,
  lasts: 15,
  most: 30,
  spirit: { lasts: 30, most: 30 },
};
/**
 * His own perks' numbers: Wind of Hatred's Light's more P.DMG taken, for how long; Gate of Grudges' Dark's stun; Vessel of
 * Dark Spirit's Light's blow and Dark's heal (shares of his max HP); and Transcend 5's Dark's ATK (a share of his max HP),
 * the share of the ally's blows he takes, and how much less of it.
 */
const PERKS = {
  takes: 1.25,
  lasts: 10,
  stun: 1,
  blow: 0.015,
  heal: 0.01,
  dark: { atk: 0.001, share: 0.2, less: 0.5 },
};

/**
 * His unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Wind of Hatred's cheaper and the boss's
 * less block (points, of both kinds); Gate of Grudges' most [Grudge] and more P.DMG taken for each; Advent of Despair's
 * more DMG (through the boss's DEF); and Vessel of Dark Spirit's CC resist (points), its M.DEF all DEF.
 */
const UT = {
  gift: { cost: -1, block: [200, 240, 290, 350, 420, 500], lasts: 10 },
  fragment: { most: [6, 7, 8, 9, 10, 12], takes: 0.03 },
  scroll: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
  seal: { resist: [300, 360, 430, 520, 630, 750] },
};

const art = skillArt("shakmeh");

const VESSEL_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: "Vessel of Dark Spirit",
    about: `Passive. Max HP ${pct(VESSEL.hp + VESSEL.books)} higher. Each blow of his skills deals a blow more of ${fine(VESSEL.blow)} of his max HP, heals every ally a little, raises their M.DEF for ${VESSEL.lasts} seconds, and gives him a stack of [Dark Spirit] (up to ${VESSEL.spirit.most}).`,
    icon: "🌑",
    art: art(3),
  },
  // (Its Max HP is with its books' 15% more.)
  words: `Increases Max HP by ${pct(VESSEL.hp + VESSEL.books)}. Dealing DMG to an enemy with a Skill deals additional P.DMG equal to ${fine(VESSEL.blow)} of self's Max HP, heals HP of all allies equal to ${fine(VESSEL.heal)} of self's Max HP, increases their M.DEF by ${num(VESSEL.defense)} for ${VESSEL.lasts} sec, and stacks [Dark Spirit] that lasts for ${VESSEL.spirit.lasts} sec upon self. [Dark Spirit] can be stacked up to max ${VESSEL.spirit.most} times, and is irremovable. The M.DEF Boost effect can be stacked up to max ${VESSEL.most} times.`,
};
/** [Dark Spirit] on him; Vessel of Dark Spirit's M.DEF on every ally; Advent of Despair's ATK; Transcend 5's Dark on its ally; [Demon Beast]'s stacks. */
const SPIRIT: Buff = {
  name: "Dark Spirit",
  about: "Spent by Advent of Despair: more of all it does for each.",
  icon: "🌑",
  art: art(3),
};
const VESSELED: Buff = {
  name: "Vessel of Dark Spirit",
  about: "M.DEF higher for each.",
  icon: "🛡️",
  art: art(3),
};
const DESPAIR: Buff = {
  name: "Advent of Despair",
  about: "ATK higher.",
  icon: "😈",
  art: art(2),
};
const SHADOWED: Buff = {
  name: "Shadow of the Sun",
  about:
    "ATK higher by a share of Shakmeh’s max HP; he takes a share of its blows.",
  icon: "🌘",
  art: art(3),
};
const BEAST: Buff = {
  name: "Demon Beast",
  about: `At ${LEIFENDE.stacks}: [Demon Beast of Darkness].`,
  icon: "🐺",
  art: { uw: "shakmeh" },
};
/** What his skills leave on the boss. */
const GRUDGE = "Grudge";

export const SHAKMEH: HeroDef = {
  id: "shakmeh",
  name: "Shakmeh",
  class: "knight",
  skins: ['Shakmeh', 'Shakmeh_Advance', 'Shakmeh_Summer'],
  // A knight (his blows physical), his max HP the higher for Vessel of Dark Spirit (and its books).
  stats: {
    ...CLASS_STATS.knight,
    deals: "physical",
    hp: CLASS_STATS.knight.hp * (1 + VESSEL.hp + VESSEL.books),
  },
  abilities: [
    {
      name: "Wind of Hatred",
      about: `${WIND.hits} blows in a line, each gaining him ${WIND.mana} mana.`,
      words: `Attacks frontal enemies in a straight line, dealing a total of ${dmg("knight", WIND.blow * WIND.hits, bookDmg("shakmeh", 0))} P.DMG over ${WIND.hits} times. Each hit recovers self's Mana by ${WIND.mana}.`,
      icon: "🌪️",
      art: art(0),
      move: "hatred",
      cooldown: 13,
      cost: 2,
    },
    {
      name: "Gate of Grudges",
      about: `A gate before him for ${GATE.lasts} seconds: a blow every second, each a stack of [Grudge] on the boss (healed less, up to ${GATE.grudge.most}).`,
      words: `Creates [Gate of Grudges] in front of self for ${GATE.lasts} sec, dealing a total of ${dmg("knight", GATE.blow * GATE.hits, bookDmg("shakmeh", 1))} P.DMG to enemies in range. Each hit inflicts a stack of [Grudge] that lasts for ${GATE.grudge.lasts} sec on enemies. [Grudge] can be stacked up to max ${GATE.grudge.most} times, and each stack reduces the target's Heal Rate by ${pct(GATE.grudge.heals)}. If the target is not a Hero, Heal Rate Reduction is increased by ${GATE.grudge.boss} times.`,
      icon: "⛩️",
      art: art(1),
      move: "grudge",
      cooldown: 20,
      cost: 3,
    },
    {
      name: "Advent of Despair",
      about: `His [Dark Spirit] all spent: every ally's ATK higher for ${ADVENT.lasts} seconds, and a blow on every enemy that stuns it for ${ADVENT.stun} seconds and leaves it taking more physical damage; all of it more for each stack.`,
      words: `Dispels negative effects from self and consumes all [Dark Spirit] stacks to increase all allies' ATK by ${pct(ADVENT.atk)} + ${fine(ADVENT.atkEach)} per [Dark Spirit] stack for ${ADVENT.lasts} sec, deal ${dmg("knight", ADVENT.blow, bookDmg("shakmeh", 2))} additional P.DMG to all enemies, inflict Stun for ${ADVENT.stun} sec, and increase P.DMG the targets take by ${pct(ADVENT.takes)} + ${pct(ADVENT.takesEach)} per [Dark Spirit] stack for ${ADVENT.lasts} sec. DMG of this Skill increases by ${pct(ADVENT.dmgEach)} per [Dark Spirit] stack. If the target is not a Hero, DMG Boost per stack increases by ${ADVENT.boss} times.`,
      icon: "😈",
      art: art(2),
      move: "dread",
      cooldown: 20,
      cost: 3,
    },
  ],
  passive: VESSEL_SHOWN,
  treasures: [
    treasure("The Herald’s Gift", (k) => ({
      words: `[Wind of Hatred] Reduces Mana Cost by ${-UT.gift.cost} and All Block Chance of the target by ${k(UT.gift.block)} for ${UT.gift.lasts} sec.`,
      skill: {
        index: 0,
        cost: UT.gift.cost,
        mark: {
          name: "The Herald’s Gift",
          blocks: { physical: -k(UT.gift.block), magical: -k(UT.gift.block) },
          lasts: UT.gift.lasts,
        },
      },
    })),
    treasure("Fragment of Darkness", (k) => ({
      words: `[Gate of Grudges] Changes the max number of stacks for [Grudge] to ${k(UT.fragment.most)} times, and [Grudge] stacks additionally increase P.DMG taken by ${pct(UT.fragment.takes)}.`,
    })),
    treasure("Scroll of Royalty", (k) => ({
      words: `[Advent of Despair] Increases DMG by ${pct(k(UT.scroll.dmg))} and ignores the target's DEF.`,
      skill: { index: 2, dmg: 1 + k(UT.scroll.dmg), whole: true },
    })),
    treasure("Broken Seal", (k) => ({
      words: `[Vessel of Dark Spirit] Increases CC Resist by ${k(UT.seal.resist)} and changes M.DEF Boost effect to All DEF Boost.`,
      bonus: { resist: k(UT.seal.resist) },
    })),
  ],
  perks: {
    "s1-light": said(
      {
        skill: {
          index: 0,
          mark: {
            name: "Wind of Hatred",
            takes: { physical: PERKS.takes },
            lasts: PERKS.lasts,
          },
        },
      },
      ({ skill }) =>
        `Increases P.DMG the hit target takes by ${pct(PERKS.takes - 1)} for ${skill.mark.lasts} sec.`,
    ),
    "s1-dark": { words: "Dispel positive effects from the target." },
    "s2-light": said(
      { skill: { index: 1, cooldown: -6 } },
      ({ skill }) => `Reduces Cooldown by ${-skill.cooldown} sec.`,
    ),
    "s2-dark": {
      words: `For the duration of [Gate of Grudges], each hit inflicts Stun on the target for ${PERKS.stun} sec.`,
    },
    "s3-light": said(
      { skill: { index: 2, dmg: 1.4 } },
      ({ skill }) => `Increases DMG by ${pct(skill.dmg - 1)}.`,
    ),
    "s3-dark": said(
      { skill: { index: 2, cleanse: "allies" } },
      () => "Dispels negative effects from all allies.",
    ),
    "s4-light": {
      words: `Changes additional DMG proportional to Max HP percentage to ${fine(PERKS.blow)}.`,
    },
    "s4-dark": {
      words: `When there is 1 enemy, changes Heal Rate proportional to Max HP to ${fine(PERKS.heal)}.`,
    },
    // (Transcend 5's Light's HP: its own 15% and this one's 10% more.)
    "t5-light": t5Light({ hp: 0.1 }, ({ hp }) => `HP +${pct(hp)}`),
    "t5-dark": {
      words: `Increases ATK of 1 ally with the highest ATK by ${fine(PERKS.dark.atk)} of own Max HP and takes ${pct(PERKS.dark.share)} of All DMG dealt to the target instead. This effect is irremovable, and when Shakmeh takes DMG of the ally instead, that DMG is reduced by ${pct(PERKS.dark.less)}. The ATK Boost rate is reduced to half in the Arena.`,
    },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    const starts = attackStarts("shakmeh");
    /** [Dark Spirit]'s stacks and how long they last yet; Vessel of Dark Spirit's M.DEF stacks on every ally, and how long yet; [Grudge]'s on the boss, and how long yet. */
    let spirit = 0;
    let spiritLeft = 0;
    let vesseled = 0;
    let vesseledLeft = 0;
    let grudge = 0;
    let grudgeLeft = 0;
    /** The gate's blows yet, and until its next. */
    let gate = 0;
    let gateWait = 0;
    /** His unique weapon's [Demon Beast], and how long [Demon Beast of Darkness] lasts yet. */
    let beast = 0;
    let awake = 0;
    /** Transcend 5's Dark: its ally (null: none yet), and what that ally had taken when last looked at. */
    let shadowed: Fighter | null = null;
    let seen = 0;
    let shadowing = false;
    /** Its allies on the field, standing and in the fight (him too). */
    const allies = (): Fighter[] =>
      fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** A blow of so much of his max HP (as thousandths of his ATK, as a blow's numbers are). */
    const ofHp = (share: number): number =>
      (share * self.stats.hp * POINTS) / self.stats.atk;
    /** The most [Grudge] stacks (Fragment of Darkness: more). */
    const grudgeMost = wearsTreasure(self, 1)
      ? fromTreasure(self, 1, UT.fragment.most)
      : GATE.grudge.most;

    /** Vessel of Dark Spirit: a blow of his skills has landed: a blow more, every ally healed and its M.DEF higher (Broken Seal: all DEF), and a stack of [Dark Spirit]. */
    const vessel = (): void => {
      if (self.hp <= 0) return;
      fight.hit(
        self,
        ofHp(self.perks.has("s4-light") ? PERKS.blow : VESSEL.blow),
        false,
      );
      // (Its Dark: healed more while only one enemy stands.)
      const alone =
        fight.foes.filter((foe) => foe.hp > 0 && !foe.away).length <= 1;
      const heal =
        (self.perks.has("s4-dark") && alone ? PERKS.heal : VESSEL.heal) *
        self.stats.hp;
      vesseled = Math.min(VESSEL.most, vesseled + 1);
      vesseledLeft = VESSEL.lasts;
      const defense = VESSEL.defense * vesseled;
      const bolsters = wearsTreasure(self, 3)
        ? { physical: defense, magical: defense }
        : { magical: defense };
      for (const ally of allies()) {
        fight.heal(ally, heal, undefined, self);
        put(ally.statuses, {
          name: VESSELED.name,
          left: VESSEL.lasts,
          count: vesseled,
          bolsters,
          shown: VESSELED,
        });
      }
      spirit = Math.min(VESSEL.spirit.most, spirit + 1);
      spiritLeft = VESSEL.spirit.lasts;
    };
    /** A blow of his skills: and Vessel of Dark Spirit's. */
    const skillHit = (amount: number): void => {
      fight.hit(self, amount);
      vessel();
    };
    /** Wind of Hatred's Dark: what helps the boss taken off it (what has it deal more, as every dispel here). */
    const dispel = (): void => {
      const on = fight.foe.statuses;
      for (let i = on.length - 1; i >= 0; i--)
        if ((on[i]?.deals ?? 1) > 1) on.splice(i, 1);
    };
    /** One of the gate's blows: a stack of [Grudge] (healed less; Fragment of Darkness: and more P.DMG taken); its Dark, a stun. */
    const gateHit = (): void => {
      skillHit(GATE.blow);
      grudge = Math.min(grudgeMost, grudge + 1);
      grudgeLeft = GATE.grudge.lasts;
      // (The boss is no Hero: twice the less healing.)
      const heals = Math.max(
        0,
        1 - GATE.grudge.heals * GATE.grudge.boss * grudge,
      );
      const fragment = wearsTreasure(self, 1)
        ? { takes: { physical: 1 + UT.fragment.takes * grudge } }
        : {};
      put(fight.foe.statuses, {
        name: GRUDGE,
        left: GATE.grudge.lasts,
        count: grudge,
        heals,
        ...fragment,
        shown: "curse",
      });
      if (self.perks.has("s2-dark")) fight.stun(PERKS.stun, { by: self });
    };
    /** Transcend 5's Dark: what he takes of its ally's blow, on his shield first, then his health (never below 1). */
    const bear = (amount: number): void => {
      const soaked = Math.min(self.shield, amount);
      self.shield -= soaked;
      const lost = Math.min(Math.max(0, self.hp - 1), amount - soaked);
      self.hp -= lost;
      self.taken += amount;
      self.mana = Math.min(
        MAX_MANA,
        self.mana +
          (MANA_PER_HP_LOST * (1 + self.manaDamage) * lost) / self.stats.hp,
      );
    };

    return {
      lands: {
        // His attack; with his unique weapon, each part of it heals him and stacks [Demon Beast] (none while he is
        // [Demon Beast of Darkness]); at its most, every enemy taking more physical damage, and he (every ally half) quicker and healed more.
        attack(part) {
          fight.hit(self, fight.basic);
          if (tier === null || !starts.has(part) || self.hp <= 0) return;
          fight.heal(self, LEIFENDE.heal * self.stats.hp, undefined, self);
          if (awake > 0 || ++beast < LEIFENDE.stacks) return;
          beast = 0;
          awake = LEIFENDE.lasts;
          for (const foe of fight.foes)
            if (foe.hp > 0 && !foe.away)
              put(foe.statuses, {
                name: LEIFENDE.name,
                left: LEIFENDE.lasts,
                takes: { physical: 1 + atTier(LEIFENDE.takes, tier) },
                shown: "curse",
              });
          for (const ally of allies()) {
            const share = ally === self ? 1 : LEIFENDE.allies;
            put(ally.statuses, {
              name: LEIFENDE_UP.name,
              left: LEIFENDE.lasts,
              speed: atTier(LEIFENDE.speed, tier) * share,
              heals: 1 + atTier(LEIFENDE.heals, tier) * share,
              shown: LEIFENDE_UP,
            });
          }
        },
        // Five blows in a line, each gaining him mana (its Dark: what helps the boss taken off it).
        hatred() {
          skillHit(WIND.blow);
          self.mana = Math.min(MAX_MANA, self.mana + WIND.mana);
          if (self.perks.has("s1-dark")) dispel();
        },
        // The gate made: its first blow now, the rest a second apart (tick).
        grudge() {
          gate = GATE.hits - 1;
          gateWait = GATE.every;
          gateHit();
        },
        // What is on him cleared, his [Dark Spirit] spent: every ally's ATK higher, and a blow (the harder for each, added
        // to its skill's power as King's Raid's are) that stuns every enemy and leaves it taking more physical damage.
        dread() {
          self.statuses = self.statuses.filter(
            (status) => status.shown.harmful !== true || status.binds === true,
          );
          const spent = spirit;
          spirit = 0;
          const atk = ADVENT.atk + ADVENT.atkEach * spent;
          for (const ally of allies())
            put(ally.statuses, {
              name: DESPAIR.name,
              left: ADVENT.lasts,
              atk,
              shown: DESPAIR,
            });
          for (const foe of fight.foes)
            if (foe.hp > 0 && !foe.away)
              put(foe.statuses, {
                name: DESPAIR.name,
                left: ADVENT.lasts,
                takes: {
                  physical: 1 + ADVENT.takes + ADVENT.takesEach * spent,
                },
                shown: "curse",
              });
          // (Its power as the fight has it: its books and its perks', ./kit.ts; the stacks' more added to it. The boss is no Hero: twice as much.)
          const power = bookDmg("shakmeh", 2) + (self.moveDmg.dread ?? 1) - 1;
          skillHit(
            (ADVENT.blow * (power + ADVENT.dmgEach * ADVENT.boss * spent)) /
              power,
          );
          fight.stun(ADVENT.stun, { by: self });
        },
      },
      // (Advent of Despair: what knocks him down doesn't while he uses it.)
      guards: () => self.doing?.move === "dread",
      // Transcend 5's Dark: its ally hurt, a share of that blow is his instead (and that much less), given back to it.
      hurt(who) {
        if (who !== shadowed || self.hp <= 0 || away(self.statuses)) return;
        const dealt = who.taken - seen;
        seen = who.taken;
        if (dealt <= 0) return;
        const back = dealt * PERKS.dark.share;
        if (who.hp > 0) {
          if (who.shield > 0) who.shield += back;
          else who.hp = Math.min(who.stats.hp, who.hp + back);
          who.taken -= back;
          seen = who.taken;
        }
        bear(back * (1 - PERKS.dark.less));
      },
      tick(dt) {
        if (spiritLeft > 0) {
          spiritLeft -= dt;
          if (spiritLeft <= 0) spirit = 0;
        }
        if (vesseledLeft > 0) {
          vesseledLeft -= dt;
          if (vesseledLeft <= 0) vesseled = 0;
        }
        if (grudgeLeft > 0) {
          grudgeLeft -= dt;
          if (grudgeLeft <= 0) grudge = 0;
        }
        if (awake > 0) awake -= dt;
        // The gate: a blow every second while it stands.
        if (gate > 0 && self.hp > 0) {
          gateWait -= dt;
          if (gateWait <= 0) {
            gateWait += GATE.every;
            gate--;
            gateHit();
          }
        }
        // Transcend 5's Dark: as the fight begins, the ally with the highest ATK (not he) has its ATK higher by a share of his max HP, for good.
        if (shadowed) seen = shadowed.taken;
        if (
          !shadowing &&
          self.perks.has("t5-dark") &&
          fight.field.includes(self)
        ) {
          shadowing = true;
          const top = allies()
            .filter((ally) => ally !== self)
            .sort((a, b) => b.stats.atk - a.stats.atk)[0];
          if (top) {
            shadowed = top;
            seen = top.taken;
            put(top.statuses, {
              name: SHADOWED.name,
              left: Infinity,
              atk: (PERKS.dark.atk * self.stats.hp) / top.stats.atk,
              shown: SHADOWED,
            });
          }
        }
      },
      lit: () => awake > 0 || spirit >= VESSEL.spirit.most,
      buffs: (): Buff[] => [
        ...(spirit > 0 ? [{ ...SPIRIT, count: spirit }] : []),
        ...(tier !== null && awake <= 0 && beast > 0
          ? [{ ...BEAST, count: beast }]
          : []),
      ],
    };
  },
};
