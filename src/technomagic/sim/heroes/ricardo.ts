import { ATK, POINTS } from "../combat/damage";
import { away, bolstering, put } from "../combat/status";
import { said, t5Light } from "../perks";
import { MANA_PER_HP_LOST, MAX_MANA } from "../rules";
import { fromTreasure, treasure, wearsTreasure } from "../treasures";
import { fine, num, pct, skillArt, type Buff } from "../shown";
import type { Fighter } from "../types";
import { atTier, THEORIA, THEORIA_UP } from "../unique";
import {
  bookDmg,
  CLASS_STATS,
  dmg,
  type HeroDef,
  type Passive,
  played,
} from "./kit";

/*
 * Ricardo's skills, as King's Raid's playtest has them (stats/ricardo.md: how hard each hits at its level 90, and every
 * number here, are its; its words are live King's Raid's, krinfo's legacy, the same kit). He is a knight whose blows are
 * physical, Lua's Judgment.
 * - Destruction: a blow that knocks the boss down (he can't be knocked down meanwhile).
 * - Divine Protection: a blow that stuns the boss a moment; for 10 seconds his M.DEF higher, he is healed every second, and
 *   he takes most of the magic damage dealt to every other ally instead.
 * - Divine Judgment: three blows in a line, each stunning the boss and maybe taking what helps it off it (untouched
 *   meanwhile).
 * His passive, Divine Blessing: another ally hurt by magic, its M.DEF higher for a while (up to 5 times over).
 * His unique weapon (../unique.ts) is worked here too: another ally hurt, now and then a shield on it (it can't be knocked
 * down meanwhile), no sooner than 5 seconds after the last.
 * What is drawn for each, and what his body does, are King's Raid's own (../../assets/heroes/ricardo.ts).
 *
 * His own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Divine
 * Protection's books are its M.DEF's, not its DMG's (./kr.ts counts them as DMG: its blow has them taken off again). What
 * he takes of another ally's magic damage is worked out from what the blow did to it (its own DEF standing in for his: his
 * M.DEF doesn't lessen it here), given back to it and taken from his shield and health (never below 1 HP). Divine
 * Protection's Dark (irremovable) does nothing here: nothing removes it. Divine Judgment's dispel, as every dispel here,
 * takes off what has the boss deal more. Divine Blessing and Divine Protection go by the kind of damage its enemy deals
 * (the boss's, a minion's): physical bosses don't set them off. Transcend 5's Dark waits 60 seconds between times, as its words
 * say (the playtest's own cooldown is 40).
 */
/** Destruction: its blow, and how long the boss is down. */
const DESTRUCTION = { blow: played("knight", 2839, 96_136), down: 3 };
/**
 * Divine Protection: its blow and its stun; his M.DEF more (flat, its books' more), for how long; his heal every second
 * meanwhile (a share of his max HP: its fourth book's); and the share of every other ally's magic damage he takes.
 */
const PROTECTION = {
  blow: played("knight", 3997, 135_407),
  stun: 1,
  defense: 6_864,
  books: 1.25,
  lasts: 10,
  mend: 0.01,
  share: 0.8,
};
/** Divine Judgment: each of its first two blows, its last, how long each stuns the boss, and each one's chance to take what helps it off it. */
const JUDGMENT = {
  blow: played("knight", 1957, 54_293),
  last: played("knight", 2348, 65_023),
  stun: 4,
  dispel: 0.5,
};
/** Divine Blessing: each stack's M.DEF (flat, its books' more), for how long (its fourth book's longer), and how many at most. */
const BLESSING = { defense: 6_004, books: 1.25, lasts: 5, longer: 2, most: 5 };
/**
 * His own perks' numbers: Destruction's Light's more P.DMG taken, for how long, and its Dark's blow (a share of his M.DEF);
 * Divine Protection's Light's share of the covered damage he still takes; Divine Judgment's Light's longer stun; Divine
 * Blessing's Light's more M.DEF (added to its books') and its Dark's most stacks; and Transcend 5's Dark (below what of his
 * HP, held at what, for how long, every ally's ATK more by a share of his M.DEF, and how often at most).
 */
const PERKS = {
  takes: 1.25,
  lasts: 10,
  defense: 2,
  cover: 0.7,
  stun: 2,
  more: 0.4,
  most: 8,
  dark: { below: 0.4, floor: 0.1, lasts: 6, atk: 0.5, every: 60 },
};

/**
 * His unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Destruction's weaker boss and more P.DMG
 * and M.DMG taken; Divine Protection's less magic damage taken while it lasts; Divine Judgment's surer dispel and slower
 * boss (points); and Divine Blessing's longer stacks and less magic damage taken for each.
 */
const UT = {
  stole: {
    weaker: 0.2,
    takes: [0.05, 0.06, 0.07, 0.085, 0.105, 0.125],
    lasts: 10,
  },
  pride: { taken: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25] },
  vow: { dispel: 0.75, speed: [100, 120, 140, 170, 210, 250], lasts: 10 },
  pendant: { longer: 5, taken: [0.01, 0.012, 0.014, 0.017, 0.021, 0.025] },
};

const art = skillArt("ricardo");

const DIVINE_BLESSING: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: "Divine Blessing",
    about: `Passive. Another ally hurt by magic: its M.DEF ${num(Math.round(BLESSING.defense * BLESSING.books))} higher for ${BLESSING.lasts + BLESSING.longer} seconds (up to ${BLESSING.most} times).`,
    icon: "✝️",
    art: art(3),
  },
  // (Its M.DEF with its books' 25% more, and its fourth book's 2 seconds longer.)
  words: `When allies excluding self take M.DMG, increases their M.DEF by ${num(Math.round(BLESSING.defense * BLESSING.books))} for ${BLESSING.lasts + BLESSING.longer} sec. Can be stacked up to ${BLESSING.most} times max.`,
};
/** Divine Protection on him, and on the allies he covers; Divine Blessing's stacks; Pride of Holy Warrior; Transcend 5's Dark's ATK. */
const PROTECTED: Buff = {
  name: "Divine Protection",
  about:
    "M.DEF higher, healed every second, and taking the magic damage dealt to his allies.",
  icon: "🛡️",
  art: art(1),
};
const COVERED: Buff = {
  name: "Divine Protection (covered)",
  about: "Ricardo takes most of the magic damage dealt to it.",
  icon: "🛡️",
  art: art(1),
};
const BLESSED: Buff = {
  name: "Divine Blessing",
  about: "M.DEF higher for each.",
  icon: "✝️",
  art: art(3),
};
const PRIDE: Buff = {
  name: "Pride of Holy Warrior",
  about: "Takes less magic damage.",
  icon: "🛡️",
  art: art(1),
};
const STAND: Buff = {
  name: "Lua’s Judgment",
  about: "ATK higher by a share of Ricardo’s M.DEF.",
  icon: "⚔️",
  art: art(3),
};

export const RICARDO: HeroDef = {
  id: "ricardo",
  name: "Ricardo",
  class: "knight",
  skins: ['Ricardo', 'Ricardo_Halloween', 'Ricardo_School', 'Ricardo_Summer', 'Ricardo_Christmas', 'Ricardo_Casual', 'Ricardo_Glory', 'Ricardo_Fallen', 'Ricardo_Glory2'],
  // A knight (his blows physical): as his class stands.
  stats: { ...CLASS_STATS.knight, deals: "physical" },
  abilities: [
    {
      name: "Destruction",
      about: `A blow that knocks the boss down for ${DESTRUCTION.down} seconds.`,
      words: `Deals ${dmg("knight", DESTRUCTION.blow, bookDmg("ricardo", 0))} P.DMG to frontal enemies in range and knocks them down for ${DESTRUCTION.down} sec.`,
      icon: "🔨",
      art: art(0),
      move: "destruction",
      cooldown: 8,
      cost: 2,
    },
    {
      name: "Divine Protection",
      about: `A blow that stuns the boss for ${PROTECTION.stun} second; for ${PROTECTION.lasts} seconds his M.DEF higher, he is healed every second, and he takes ${pct(PROTECTION.share)} of the magic damage dealt to every other ally.`,
      // (Its M.DEF with its books' 25% more.)
      words: `Deals ${dmg("knight", PROTECTION.blow)} P.DMG to enemies in range and inflicts Stun for ${PROTECTION.stun} sec. Additionally, own M.DEF is increased by ${num(Math.round(PROTECTION.defense * PROTECTION.books))} for ${PROTECTION.lasts} sec, and takes ${pct(PROTECTION.share)} of M.DMG instead of allies.`,
      icon: "🛡️",
      art: art(1),
      move: "protection",
      cooldown: 30,
      cost: 1,
    },
    {
      name: "Divine Judgment",
      about: `Three blows in a line, each stunning the boss for ${JUDGMENT.stun} seconds, with a ${pct(JUDGMENT.dispel)} chance to take what helps it off it; nothing touches him meanwhile.`,
      words: `Attacks frontal enemies in a straight line 3 times. The first 2 attacks deal ${dmg("knight", JUDGMENT.blow * 2, bookDmg("ricardo", 2))} P.DMG to enemies and stun them for ${JUDGMENT.stun} sec, and the last attack deals ${dmg("knight", JUDGMENT.last, bookDmg("ricardo", 2))} P.DMG to enemies in a 20% wider range, while stunning them for ${JUDGMENT.stun} sec. Each attack has a ${pct(JUDGMENT.dispel)} chance of dispelling positive effects from the enemy.`,
      icon: "⚖️",
      art: art(2),
      move: "divine",
      cooldown: 23,
      cost: 4,
    },
  ],
  passive: DIVINE_BLESSING,
  treasures: [
    treasure("Stole of Templar", (k) => ({
      words: `[Destruction] For ${UT.stole.lasts} sec, reduces the target's ATK by ${pct(UT.stole.weaker)} and increases P.DMG and M.DMG target receives by ${fine(k(UT.stole.takes))}.`,
      skill: {
        index: 0,
        mark: {
          name: "Stole of Templar",
          deals: 1 - UT.stole.weaker,
          takes: {
            physical: 1 + k(UT.stole.takes),
            magical: 1 + k(UT.stole.takes),
          },
          lasts: UT.stole.lasts,
        },
      },
    })),
    treasure("Pride of Holy Warrior", (k) => ({
      words: `[Divine Protection] Gains Immunity to CC and increases M.Resistance by ${pct(k(UT.pride.taken))} for the skill's duration.`,
      skill: { index: 1, steady: true },
    })),
    treasure("Templar Vow", (k) => ({
      words: `[Divine Judgment] Dispels positive effects from enemies with a ${pct(UT.vow.dispel)} chance, and reduces target's ATK Spd by ${k(UT.vow.speed)} for ${UT.vow.lasts} sec.`,
    })),
    treasure("Pendant of Benevolence", (k) => ({
      words: `[Divine Blessing] Increases duration by ${UT.pendant.longer} sec. Reduces M.DMG dealt to self by ${fine(k(UT.pendant.taken))} per stack.`,
    })),
  ],
  perks: {
    "s1-light": said(
      {
        skill: {
          index: 0,
          mark: {
            name: "Destruction",
            takes: { physical: PERKS.takes },
            lasts: PERKS.lasts,
          },
        },
      },
      ({ skill }) =>
        `Target receives ${pct(PERKS.takes - 1)} increased P.DMG for ${skill.mark.lasts} sec.`,
    ),
    "s1-dark": {
      words: `Deals extra P.DMG equal to ${pct(PERKS.defense)} of M.DEF.`,
    },
    "s2-light": said(
      { skill: { index: 1, cost: 1 } },
      ({ skill }) =>
        `In exchange for ${skill.cost} additional Mana Cost, Ricardo gains ${pct(1 - PERKS.cover)} DMG resistance to DMG taken due to covering for allies.`,
    ),
    "s2-dark": { words: "This skill's effect cannot be dispelled." },
    "s3-light": { words: `Stun duration is increased by ${PERKS.stun} sec.` },
    "s3-dark": said(
      { skill: { index: 2, cost: -1 } },
      ({ skill }) => `Mana cost is reduced by ${-skill.cost}.`,
    ),
    "s4-light": {
      words: `M.DEF increase rate is boosted by ${pct(PERKS.more)}.`,
    },
    "s4-dark": { words: `Max stack count is boosted to ${PERKS.most}.` },
    "t5-light": t5Light(
      { blockPhysical: 200 },
      ({ blockPhysical }) => `P. Block +${blockPhysical}`,
    ),
    "t5-dark": {
      words: `When own HP goes below ${pct(PERKS.dark.below)}, HP does not go under ${pct(PERKS.dark.floor)} for ${PERKS.dark.lasts} sec, and all allies' ATK is increased by ${pct(PERKS.dark.atk)} of own M.DEF. This effect is activated once every ${PERKS.dark.every} sec.`,
    },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /** How long Divine Protection lasts yet, and toward its next heal; Transcend 5's Dark's hold and its wait; his unique weapon's wait. */
    let covering = 0;
    let mending = 0;
    let holding = 0;
    let standWait = 0;
    let theoria = 0;
    /** What each ally had taken when last looked at (what Divine Protection covers is what it has taken since). */
    const seen = new Map<Fighter, number>();
    /** His allies on the field, standing and in the fight (him too). */
    const allies = (): Fighter[] =>
      fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** Divine Blessing's most stacks (its Dark: more), and its M.DEF for each (its Light: more, added to its books'), for how long (Pendant of Benevolence: longer). */
    const most = self.perks.has("s4-dark") ? PERKS.most : BLESSING.most;
    const blessing =
      BLESSING.defense *
      (BLESSING.books + (self.perks.has("s4-light") ? PERKS.more : 0));
    const blessed =
      BLESSING.lasts +
      BLESSING.longer +
      (wearsTreasure(self, 3) ? UT.pendant.longer : 0);
    /** His M.DEF as it is now (what is on him adds). */
    const magicDefense = (): number =>
      self.stats.magical + bolstering(self.statuses, "magical");
    /** What helps the boss taken off it (what has it deal more, as every dispel here). */
    const dispel = (): void => {
      const on = fight.foe.statuses;
      for (let i = on.length - 1; i >= 0; i--)
        if ((on[i]?.deals ?? 1) > 1) on.splice(i, 1);
    };
    /** Transcend 5's Dark: his HP below its share, held up a while, and every ally's ATK higher by a share of his M.DEF (no sooner than so long after the last). */
    const stand = (): void => {
      if (
        !self.perks.has("t5-dark") ||
        standWait > 0 ||
        self.hp <= 0 ||
        self.hp >= self.stats.hp * PERKS.dark.below
      )
        return;
      standWait = PERKS.dark.every;
      holding = PERKS.dark.lasts;
      const atk = PERKS.dark.atk * magicDefense();
      for (const ally of allies())
        put(ally.statuses, {
          name: STAND.name,
          left: PERKS.dark.lasts,
          atk: atk / ally.stats.atk,
          shown: STAND,
        });
    };
    /** Transcend 5's Dark's hold: his HP not below its share. */
    const held = (): void => {
      if (
        holding > 0 &&
        self.hp > 0 &&
        self.hp < self.stats.hp * PERKS.dark.floor
      )
        self.hp = self.stats.hp * PERKS.dark.floor;
    };
    /** Divine Protection: what he takes of an ally's magic damage, on his shield first, then his health (never below 1). */
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
      held();
      stand();
    };

    return {
      lands: {
        // A blow, the boss knocked down (its Dark: a blow more, of his M.DEF).
        destruction() {
          fight.hit(self, DESTRUCTION.blow);
          fight.stun(DESTRUCTION.down, { down: true, by: self });
          if (self.perks.has("s1-dark"))
            fight.hit(
              self,
              (PERKS.defense * magicDefense() * POINTS) / self.stats.atk,
              false,
            );
        },
        // A blow that stuns the boss a moment (its books taken off again: they are its M.DEF's); his M.DEF higher, healed
        // every second, and every other ally covered, for a while (Pride of Holy Warrior: and less magic damage taken).
        protection() {
          fight.hit(self, PROTECTION.blow / bookDmg("ricardo", 1));
          fight.stun(PROTECTION.stun, { by: self });
          covering = PROTECTION.lasts;
          mending = 0;
          put(self.statuses, {
            name: PROTECTED.name,
            left: PROTECTION.lasts,
            bolsters: { magical: PROTECTION.defense * PROTECTION.books },
            shown: PROTECTED,
          });
          if (wearsTreasure(self, 1))
            put(self.statuses, {
              name: PRIDE.name,
              left: PROTECTION.lasts,
              takes: { magical: 1 - fromTreasure(self, 1, UT.pride.taken) },
              shown: PRIDE,
            });
          const on = allies().filter((ally) => ally !== self);
          for (const ally of on) {
            seen.set(ally, ally.taken);
            put(ally.statuses, {
              name: COVERED.name,
              left: PROTECTION.lasts,
              shown: COVERED,
            });
          }
          fight.cue(self, "protection", on);
        },
        // Three blows, each stunning the boss (its Light: longer) and maybe dispelling it (Templar Vow: likelier, and the boss slower).
        divine(part) {
          fight.hit(self, part < 2 ? JUDGMENT.blow : JUDGMENT.last);
          fight.stun(
            JUDGMENT.stun + (self.perks.has("s3-light") ? PERKS.stun : 0),
            { by: self },
          );
          if (
            fight.roll() <
            (wearsTreasure(self, 2) ? UT.vow.dispel : JUDGMENT.dispel)
          )
            dispel();
          if (wearsTreasure(self, 2))
            fight.slow(fromTreasure(self, 2, UT.vow.speed), UT.vow.lasts);
        },
      },
      // (Destruction's fourth book: not to be knocked down while he uses it; Divine Judgment's: nothing touches him meanwhile.)
      guards: () => self.doing?.move === "destruction",
      untouched: () => self.doing?.move === "divine",
      // (Transcend 5's Dark: left on 1 HP, not brought down, while it holds.)
      spared: () => holding > 0,
      hurt(who) {
        if (who === self) {
          held();
          stand();
          return;
        }
        if (self.hp <= 0 || away(self.statuses)) return;
        const last = seen.get(who);
        seen.set(who, who.taken);
        // (By the kind of damage its enemy deals.)
        if (fight.foe.def.stats.deals === "magical") {
          // Divine Protection: most of the blow his instead (its Light: less of it), given back to the ally.
          const dealt = last === undefined ? 0 : who.taken - last;
          if (covering > 0 && dealt > 0) {
            const back = dealt * PROTECTION.share;
            if (who.hp > 0) {
              if (who.shield > 0) who.shield += back;
              else who.hp = Math.min(who.stats.hp, who.hp + back);
              who.taken -= back;
              seen.set(who, who.taken);
            }
            bear(back * (self.perks.has("s2-light") ? PERKS.cover : 1));
          }
          // Divine Blessing: its M.DEF higher, a stack more (Pendant of Benevolence: and less magic damage taken for each).
          if (who.hp > 0) {
            const stacks = Math.min(
              most,
              (who.statuses.find((status) => status.name === BLESSED.name)
                ?.count ?? 0) + 1,
            );
            const pendant = wearsTreasure(self, 3)
              ? {
                  takes: {
                    magical: Math.max(
                      0,
                      1 - fromTreasure(self, 3, UT.pendant.taken) * stacks,
                    ),
                  },
                }
              : {};
            put(who.statuses, {
              name: BLESSED.name,
              left: blessed,
              count: stacks,
              bolsters: { magical: blessing * stacks },
              ...pendant,
              shown: BLESSED,
            });
          }
        }
        // His unique weapon: now and then a shield on it (none knocks it down meanwhile), no sooner than so long after the last.
        if (
          tier === null ||
          theoria > 0 ||
          who.hp <= 0 ||
          fight.roll() >= atTier(THEORIA.chance, tier)
        )
          return;
        theoria = THEORIA.every;
        fight.shield(
          who,
          atTier(THEORIA.shield, tier) * ATK,
          THEORIA.lasts,
          self,
        );
        put(who.statuses, {
          name: THEORIA_UP.name,
          left: THEORIA.lasts,
          guards: true,
          shown: THEORIA_UP,
        });
      },
      tick(dt) {
        theoria = Math.max(0, theoria - dt);
        standWait = Math.max(0, standWait - dt);
        if (holding > 0) {
          holding -= dt;
          held();
        }
        for (const ally of fight.field) seen.set(ally, ally.taken);
        if (covering <= 0) return;
        covering -= dt;
        // Divine Protection's fourth book: a share of his max HP healed every second while it lasts.
        mending += dt;
        if (mending >= 1 && self.hp > 0) {
          mending -= 1;
          fight.heal(self, PROTECTION.mend * self.stats.hp, undefined, self);
        }
      },
      lit: () => covering > 0,
    };
  },
};
