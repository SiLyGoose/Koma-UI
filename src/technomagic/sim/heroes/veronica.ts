import { away, put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA, SECTION } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { fine, num, pct, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { ACCORDIO, atTier } from '../unique';
import { bookDmg, CLASS_STATS, dmg, type HeroDef, type Passive, played } from './kit';

/*
 * Veronica's skills, as King's Raid's playtest has them (stats/veronica.md: how hard each hits at its level 90, and every
 * number here, are its; its words are the game's, krinfo's legacy). She is a wizard, the Eye of Discernment.
 * - This will hurt a little!: a blow that stuns the boss.
 * - Let me help you.: a Rune on every ally for a while, their ATK higher (a flat amount, its books' half again) and their
 *   DMG to bosses higher.
 * - Get out of my sight!: two blows that knock the boss down; it then takes more magic damage for a while.
 * Her passive, Top Financier's Knowledge: every ally's ATK higher (flat, while she is on the field), and each skill she
 * uses an Experience; at 3, Top Financier's Knowledge (for good, up to 5): her crit DMG higher, and each of her skills'
 * effects 10% more (This will hurt a little!'s blow and stun, the Rune's ATK and DMG to bosses, Get out of my sight!'s
 * blows, how long it holds the boss down and the magic damage it takes).
 * Her unique weapon (../unique.ts) is worked here too: more Knowledge at most, and an Experience every so often.
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/veronica.ts).
 *
 * Her own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). This will
 * hurt a little!'s Light (one enemy) always holds against a boss alone; its Dark (two targets) changes nothing against
 * one. Get out of my sight!'s Dark: the boss takes more of both kinds of damage, not magic alone. Seal of Guild Manager's
 * cooldown: 10% off for the boss it hits (one enemy).
 */
/** This will hurt a little!: its blow, how long it stuns; each Knowledge's stun longer. */
const HURT = { blow: played('wizard', 3211, 109_446), stun: 2, longer: 0.2 };
/** Let me help you.: the Rune's ATK more (flat, its books' half again), DMG to bosses more, for how long. */
const RUNE = { atk: 51_504, books: 1.5, boss: 0.15, lasts: 12 };
/** Get out of my sight!: each of its two blows, how long it knocks the boss down, the magic damage it then takes more, for how long; each Knowledge's down longer. */
const SIGHT = { blow: played('wizard', 3135, 94_424), down: 5, takes: 0.3, marked: 10, longer: 0.5 };
/** Top Financier's Knowledge: every ally's ATK more (flat, its books' half again); the Experience to a Knowledge, its most; each one's crit DMG and skills' effects more. */
const KNOWLEDGE = { atk: 5_144, books: 1.5, experience: 3, most: 5, critDamage: 0.3, effects: 0.1 };
/** Her own perks' numbers: This will hurt a little!'s Light's DMG; the Rune's Light's DMG to bosses for so many uses; Get out of my sight!'s Light's DMG; Knowledge's Light's mana and Dark's ATK, for how long; Transcend 5's Dark's cooldowns less, every how many seconds. */
const PERKS = { one: 2, rune: { boss: 0.25, uses: 3 }, sight: 2, mana: 2 * SECTION, atk: 0.5, atkLasts: 10, dark: { sooner: 0.15, every: 20 } };

/**
 * Her unique treasures' numbers (0★ to 5★: ../treasures.ts; King's Raid's own): This will hurt a little!'s DMG, and each
 * critical blow's DMG to bosses more, for how long, up to how many; the Rune's mana less and seconds more; Get out of my
 * sight!'s DMG more and cooldown less; Knowledge's ATK more (added to its books'), and as she gains one, every ally's crit
 * DMG more, for how long.
 */
const UT = {
  conduct: { dmg: 1.5, boss: [0.02, 0.024, 0.029, 0.035, 0.042, 0.05], lasts: 30, most: 10 },
  pen: { lasts: [1.6, 1.9, 2.3, 2.7, 3.3, 4] },
  seal: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], sooner: 0.1 },
  report: { atk: 0.5, critDamage: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], lasts: 10 },
};

const art = skillArt('veronica');

const KNOWLEDGE_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Top Financier’s Knowledge',
    about: `Passive. Every ally's ATK higher; each skill she uses an Experience, and at ${KNOWLEDGE.experience}, Top Financier's Knowledge (up to ${KNOWLEDGE.most}): her crit DMG ${pct(KNOWLEDGE.critDamage)} higher and her skills' effects ${pct(KNOWLEDGE.effects)} more for each.`,
    icon: '📒',
    art: art(3),
  },
  words: `Increases ATK of all allies by ${num(Math.round(KNOWLEDGE.atk * KNOWLEDGE.books))} and gains Experience stack upon using a Skill. When ${KNOWLEDGE.experience} Experiences are stacked, gains Top Financier's Knowledge that increases own Crit DMG by ${pct(KNOWLEDGE.critDamage)} and the effects of all active Skills by ${pct(KNOWLEDGE.effects)}. The Top Financier's Knowledge effect is irremovable and stacks up to ${KNOWLEDGE.most} times.`,
};
/** The Rune; Top Financier's Knowledge, stacked; her Experience toward the next; its ATK to every ally; Knowledge's Dark's ATK; Guild Code of Conduct's DMG to bosses; Guild Accounts Report's crit DMG. */
const RUNED: Buff = { name: 'Let me help you.', about: 'ATK higher, and DMG to bosses higher.', icon: '📜', art: art(1) };
const KNOWING: Buff = { name: 'Top Financier’s Knowledge', about: 'Crit DMG higher, and her skills’ effects more, for each.', icon: '📒', art: art(3) };
const EXPERIENCE: Buff = { name: 'Experience', about: `At ${KNOWLEDGE.experience}: Top Financier’s Knowledge.`, icon: '📒', art: art(3) };
const FINANCED: Buff = { name: 'Top Financier’s Knowledge (ATK)', about: 'ATK higher while Veronica is on the field.', icon: '📒', art: art(3) };
const KEEN: Buff = { name: 'Top Financier’s Knowledge (Dark)', about: 'ATK higher.', icon: '📒', art: art(3) };
const CONDUCT: Buff = { name: 'Guild Code of Conduct', about: 'DMG to bosses higher for each.', icon: '📕', art: art(0) };
const REPORT: Buff = { name: 'Guild Accounts Report', about: 'Crit DMG higher.', icon: '📊', art: art(3) };

export const VERONICA: HeroDef = {
  id: 'veronica',
  name: 'Veronica',
  class: 'wizard',
  skins: ['Veronica', 'Veronica_Summer', 'Veronica_Summer2', 'Veronica_Halloween', 'Veronica_Halloween2', 'Veronica_Maid', 'Veronica_Maid2', 'Veronica_Job', 'Veronica_Job2', 'Veronica_Wedding', 'Veronica_Wedding2'],
  stats: { ...CLASS_STATS.wizard, deals: 'magical' },
  abilities: [
    {
      name: 'This will hurt a little!',
      about: `A blow that stuns the boss for ${HURT.stun} seconds.`,
      words: `Deals ${dmg('wizard', HURT.blow, bookDmg('veronica', 0))} M.DMG to enemy and surrounding enemies within range, and inflicts Stun for ${HURT.stun} sec.`,
      icon: '💢',
      art: art(0),
      move: 'hurt',
      cooldown: 9,
      cost: 2,
    },
    {
      name: 'Let me help you.',
      about: `A Rune on every ally for ${RUNE.lasts} seconds: ATK +${num(Math.round(RUNE.atk * RUNE.books))}, and DMG to bosses ${pct(RUNE.boss)} higher.`,
      words: `Grants a Rune to all allies to increase their ATK by ${num(Math.round(RUNE.atk * RUNE.books))} and DMG dealt to Bosses by ${pct(RUNE.boss)} for ${RUNE.lasts} sec.`,
      auto: { keeps: RUNED.name },
      icon: '📜',
      art: art(1),
      move: 'rune',
      cooldown: 25,
      cost: 4,
    },
    {
      name: 'Get out of my sight!',
      about: `Two blows that knock the boss down for ${SIGHT.down} seconds; it takes ${pct(SIGHT.takes)} more magic damage for ${SIGHT.marked}.`,
      words: `Attacks target and enemies in a wide surrounding area 2 times to deal ${dmg('wizard', SIGHT.blow * 2, bookDmg('veronica', 2))} M.DMG, and knocks them down for ${SIGHT.down} sec. Hit enemies take ${pct(SIGHT.takes)} increased M.DMG for ${SIGHT.marked} sec.`,
      icon: '📕',
      art: art(2),
      move: 'sight',
      cooldown: 25,
      cost: 4,
    },
  ],
  passive: KNOWLEDGE_SHOWN,
  treasures: [
    treasure('Guild Code of Conduct', (k) => ({
      words: `[This Will Hurt A Little!] increases DMG by ${pct(UT.conduct.dmg - 1)}, and increases DMG to Bosses by ${fine(k(UT.conduct.boss))} for ${UT.conduct.lasts} sec upon Critical Hit. This effect stacks up to max ${UT.conduct.most} times.`,
      skill: { index: 0, dmg: UT.conduct.dmg },
    })),
    treasure('Pen Point of Firm Will', (k) => ({
      words: `[Let Me Help You] Reduces Mana Cost by 1 and increases skill duration by ${k(UT.pen.lasts)} sec.`,
      skill: { index: 1, cost: -1 },
    })),
    treasure('Seal of Guild Manager', (k) => ({
      words: `[Get out of my sight!] DMG is increased by ${fine(k(UT.seal.dmg))} and per each enemy hit, cooldown is reduced by ${pct(UT.seal.sooner)}.`,
      skill: { index: 2, dmg: 1 + k(UT.seal.dmg) },
    })),
    treasure('Guild Accounts Report', (k) => ({
      words: `[Top Financier's Knowledge] Increases ATK boost by ${pct(UT.report.atk)}. Upon gaining Top Financier's Knowledge, increases Crit DMG of all allies by ${fine(k(UT.report.critDamage))} for ${UT.report.lasts} sec.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, dmg: PERKS.one } }, ({ skill }) => `DMG is increased by ${pct(skill.dmg - 1)} when there is 1 enemy.`),
    's1-dark': { words: 'Number of targets changes to 2.' },
    's2-light': { words: `After the beginning of the first battle, changes the DMG Boost effect against Bosses to ${pct(PERKS.rune.boss)} for ${PERKS.rune.uses} Skill uses.` },
    's2-dark': said({ skill: { index: 1, cooldown: -5 } }, ({ skill }) => `Reduces cooldown by ${-skill.cooldown} sec.`),
    's3-light': said({ skill: { index: 2, cost: 1, dmg: PERKS.sight } }, ({ skill }) => `Increases Mana Cost by ${skill.cost} and DMG by ${pct(skill.dmg - 1)}.`),
    's3-dark': { words: 'Target takes increased M.DMG and P.DMG.' },
    's4-light': { words: `Recovers the caster's MP by ${PERKS.mana / SECTION} orbs when activated.` },
    's4-dark': { words: `When activated, increases the caster's ATK by ${pct(PERKS.atk)} for ${PERKS.atkLasts} sec.` },
    't5-light': t5Light({ crit: 100 }, ({ crit }) => `Crit Chance +${crit}`),
    't5-dark': { words: `Reduces self's Cooldown all active Skills by ${pct(PERKS.dark.sooner)} every ${PERKS.dark.every} sec.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /** Her Experience and Knowledge, and their most (her unique weapon: more); its Experience's wait; the Rune's Light's uses left; Guild Code of Conduct's stacks, and how long they last yet; Transcend 5's Dark's wait. */
    let experience = 0;
    let knowledge = 0;
    const most = tier !== null ? atTier(ACCORDIO.most, tier) : KNOWLEDGE.most;
    let accordio = 0;
    let lightUses = self.perks.has('s2-light') ? PERKS.rune.uses : 0;
    let conduct = 0;
    let conductLeft = 0;
    let dark = 0;
    /** Her allies on the field, standing and in the fight (her too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** Each Knowledge's skills' effects more, for now. */
    const effects = (): number => 1 + KNOWLEDGE.effects * knowledge;
    // (Knowledge's ATK to every ally: its books', and Guild Accounts Report's added to them, as King's Raid adds them.)
    const passiveAtk = KNOWLEDGE.atk * (KNOWLEDGE.books + (wearsTreasure(self, 3) ? UT.report.atk : 0));

    /** An Experience: at 3, a Knowledge (for good, up to its most), and what comes as she gains one. */
    const experienced = (): void => {
      if (++experience < KNOWLEDGE.experience) return;
      experience = 0;
      knowledge = Math.min(most, knowledge + 1);
      put(self.statuses, { name: KNOWING.name, left: Infinity, count: knowledge, critDamage: KNOWLEDGE.critDamage * knowledge, shown: KNOWING });
      // Its Light: her mana; its Dark: her ATK a while; Guild Accounts Report: every ally's crit DMG a while.
      if (self.perks.has('s4-light')) self.mana = Math.min(MAX_MANA, self.mana + PERKS.mana);
      if (self.perks.has('s4-dark')) put(self.statuses, { name: KEEN.name, left: PERKS.atkLasts, atk: PERKS.atk, shown: KEEN });
      if (wearsTreasure(self, 3)) for (const ally of allies()) put(ally.statuses, { name: REPORT.name, left: UT.report.lasts, critDamage: fromTreasure(self, 3, UT.report.critDamage), shown: REPORT });
    };

    return {
      lands: {
        attack() {
          fight.hit(self, fight.basic);
        },
        // A blow that stuns the boss (each Knowledge: harder, and longer); Guild Code of Conduct: a critical one, more to bosses a while.
        hurt() {
          const critical = fight.hit(self, HURT.blow * effects());
          fight.stun(HURT.stun + HURT.longer * knowledge, { by: self });
          if (critical && wearsTreasure(self, 0)) {
            conduct = Math.min(UT.conduct.most, conduct + 1);
            conductLeft = UT.conduct.lasts;
            put(self.statuses, { name: CONDUCT.name, left: UT.conduct.lasts, count: conduct, deals: 1 + fromTreasure(self, 0, UT.conduct.boss) * conduct, shown: CONDUCT });
          }
        },
        // The Rune on every ally (each Knowledge: more of both; its Light: more to bosses its first uses; Pen Point of Firm Will: longer).
        rune(part) {
          // (Its first part is its cast, as the game's timeline begins it: the Rune is put on at its second, 2.1 seconds in.)
          if (part < 1) return;
          const on = allies();
          fight.cue(self, 'rune', on);
          const lasts = RUNE.lasts + fromTreasure(self, 1, UT.pen.lasts);
          const boss = (lightUses > 0 ? PERKS.rune.boss : RUNE.boss) * effects();
          if (lightUses > 0) lightUses--;
          const atk = RUNE.atk * RUNE.books * effects();
          for (const ally of on) put(ally.statuses, { name: RUNED.name, left: lasts, atk: atk / ally.stats.atk, deals: 1 + boss, shown: RUNED });
        },
        // Two blows that knock the boss down, and it takes more magic damage a while (its Dark: of both kinds; each Knowledge:
        // harder, longer down and more taken); Seal of Guild Manager: its cooldown less for the boss hit.
        sight(part) {
          fight.hit(self, SIGHT.blow * effects());
          if (part !== 0) return;
          fight.stun(SIGHT.down + SIGHT.longer * knowledge, { down: true, by: self });
          const takes = 1 + SIGHT.takes * effects();
          put(fight.foe.statuses, { name: 'Get out of my sight!', left: SIGHT.marked, takes: self.perks.has('s3-dark') ? takes : { magical: takes }, shown: 'curse' });
          if (wearsTreasure(self, 2)) self.cooldowns[2] = Math.max(0, (self.cooldowns[2] ?? 0) - (self.abilities[2]?.cooldown ?? 0) * UT.seal.sooner);
        },
      },
      // Each skill she uses: an Experience (as it begins, so a Knowledge it brings is in it).
      used() {
        experienced();
      },
      tick(dt) {
        if (conductLeft > 0) {
          conductLeft -= dt;
          if (conductLeft <= 0) conduct = 0;
        }
        // Knowledge's ATK: every ally's, while she is on the field and standing.
        const there = fight.field.includes(self) && self.hp > 0 && !away(self.statuses);
        for (const ally of fight.fighters) {
          if (!there) ally.statuses = ally.statuses.filter((status) => status.name !== FINANCED.name);
          else put(ally.statuses, { name: FINANCED.name, left: Infinity, atk: passiveAtk / ally.stats.atk, shown: FINANCED });
        }
        if (!there) return;
        // Her unique weapon: an Experience every so often.
        if (tier !== null) {
          accordio += dt;
          if (accordio >= atTier(ACCORDIO.every, tier)) {
            accordio = 0;
            experienced();
          }
        }
        // Transcend 5's Dark: every so often, her cooldowns shorter.
        if (self.perks.has('t5-dark')) {
          dark += dt;
          if (dark >= PERKS.dark.every) {
            dark -= PERKS.dark.every;
            self.cooldowns = self.cooldowns.map((left, i) => Math.max(0, left - (self.abilities[i]?.cooldown ?? 0) * PERKS.dark.sooner));
          }
        }
      },
      lit: () => allies().some((ally) => ally.statuses.some((status) => status.name === RUNED.name)),
      buffs: () => [{ ...EXPERIENCE, count: experience }],
    };
  },
};
