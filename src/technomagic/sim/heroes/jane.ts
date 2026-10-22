import { away, put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { num, pct, skillArt, type Buff, type Mark } from '../shown';
import type { Fighter, Foe } from '../types';
import { atTier, EREKURA, EREKURA_UP } from '../unique';
import { bookDmg, bookHeal, CLASS_STATS, dmg, healed, type HeroDef, indexed, indexedHeal, type Passive, played } from './kit';

/*
 * Jane's skills, as the live game had them before the playtest reworked her (krinfo.net's legacy Jane: what each costs, how
 * long before it can be used again, how long what it does lasts, her perks and her unique gear; how hard each hits and heals
 * is the King's Raid Index's, at her class's ATK). She is a knight whose blows are magical, the Alabaster Corpse.
 * - Funeral Rites: a blow on the enemies about her target that stuns them.
 * - Mark of Death: a Mark on every enemy for 30 seconds: a blow every second, and 25% more magic damage taken, 20% more
 *   again for each use while it is on (up to 5 times; nothing removes it).
 * - Day of Ruin: for 15 seconds, a blow every second on every enemy (the harder on a marked one), now and then stunning,
 *   all it deals healing her; nothing knocks her down meanwhile.
 * Her passive, Rest in Peace: every ally's M.DEF higher; and a blow that would bring her down puts her in a coffin instead
 * (once a fight): healed, for 5 seconds nothing touches her and she does nothing, and every second a blow on the enemies
 * near her (a share of her max HP).
 * Her unique weapon (../unique.ts) is worked here too: every second a blow on the enemies near her, hitting less hard a
 * moment; the ally with the highest ATK (not her) deals more to Non-Hero enemies; and the coffin fills a share of her mana.
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/jane.ts).
 *
 * Her own perks (../perks.ts) are the live game's. Funeral Rites' Dark's pull does nothing here (bosses aren't moved), nor
 * Mark of Death's Dark (nothing removes what is on the boss). The Index doesn't say how much Day of Ruin's blow is the more
 * on a marked enemy (here: as the playtest has it, its share of ATK again), nor Rest in Peace's M.DEF (here: the playtest's).
 */
const MARK = 'Mark of Death';
/** Funeral Rites: its blow, how far about its target, and how long it stuns. */
const RITES = { blow: indexed('knight', 125_027), reach: 3, stun: 5 };
/** Mark of Death: how long, a blow every second (the Index's 93,150 over its while); the more magic damage taken, and more again for each use while it is on, up to how many. */
const DEATH = { lasts: 30, tick: indexed('knight', 93_150 / 30), takes: 0.25, more: 0.2, most: 5 };
/** Day of Ruin: how long, a blow every second (the more on a marked enemy: the playtest's share of ATK again), the share of what it deals healing her, its chance to stun, for how long; its fourth book's mana for each blow (a share). */
const RUIN = { lasts: 15, tick: indexed('knight', 36_690), marked: played('knight', 814) / played('knight', 814, 22_746), drinks: 1, chance: 0.1, stun: 1, mana: 0.01 };
/** Rest in Peace: every ally's M.DEF more (flat); the coffin, how long, its heal (and a share of her max HP, its books' half again), and its blow every second (a share of her max HP). */
const REST = { defense: 21_669, lasts: 5, heal: indexedHeal('knight', 411_702), hp: 0.06, books: 1.5, blow: 0.05 };
/** Her own perks' numbers: Funeral Rites' Light's more magic damage taken, for how long; Mark of Death's Light's while; Rest in Peace's Dark's stun; Transcend 5's Dark's ATK and healing for each blow, up to how many, for how long. */
const PERKS = { takes: 1.25, lasts: 10, markLasts: 10, stun: 2, dark: { each: 0.01, most: 50, lasts: 20 } };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Funeral Rites' CC resist and M.Block less on
 * its target; Mark of Death's ATK and crit DMG for each marked enemy killed (up to 8); Day of Ruin's DMG and its targets' M.DEF
 * less for each of its blows (up to 10); Rest in Peace's less damage taken after the coffin.
 */
const UT = {
  doll: { resist: 250, block: [200, 240, 290, 350, 420, 500], lasts: 10 },
  cushion: { atk: 0.05, critDamage: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], most: 8, lasts: 20 },
  flowers: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], defense: 0.05, most: 10, lasts: 5 },
  friend: { taken: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 },
};

const art = skillArt('jane');

const REST_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Rest in Peace',
    about: `Passive. Every ally's M.DEF is ${num(REST.defense)} higher. A blow that would bring her down puts her in a coffin instead, once a fight: healed, for ${REST.lasts} seconds nothing touches her and she does nothing, and every second a blow on the enemies near her.`,
    icon: '⚰️',
    art: art(3),
  },
  words: `Increases M.DEF of all allies by ${num(REST.defense)}. Upon taking fatal DMG, enters a coffin for ${REST.lasts} sec and heals HP equal to ${healed('knight', REST.heal, bookHeal('jane', 3))} + ${pct(REST.hp * REST.books)} of Max HP. While inside the coffin, Jane is not affected by ATK Spd effects, ignores All DMG, and deals M.DMG equal to ${pct(REST.blow)} of Max HP to nearby enemies every sec.`,
};
const COFFIN: Buff = { name: 'Coffin', about: 'Nothing touches her and she does nothing; every second, a blow on the enemies near her.', icon: '⚰️', art: art(3) };
const RESTING: Buff = { name: 'Rest in Peace', about: 'M.DEF higher.', icon: '⚰️', art: art(3) };
const RUINED: Buff = { name: 'Day of Ruin', about: 'Immune to CC; all she deals heals her.', icon: '🌸', art: art(2) };
const CUSHION: Buff = { name: 'Death-imbued Cushion', about: 'ATK and crit DMG higher for each.', icon: '💀', art: art(1) };
const FRIEND: Buff = { name: 'First Friend Doll', about: 'Takes less.', icon: '🧸', art: art(3) };
const DEVOTED: Buff = { name: 'Jane', about: 'ATK and healing higher for each.', icon: '⚰️', art: art(3) };

export const JANE: HeroDef = {
  id: 'jane',
  name: 'Jane',
  class: 'knight',
  skins: ['Jane'],
  // A knight whose blows are magical: as her class stands, otherwise.
  stats: { ...CLASS_STATS.knight, deals: 'magical' },
  abilities: [
    {
      name: 'Funeral Rites',
      about: `A blow on the enemies about her target that stuns them for ${RITES.stun} seconds.`,
      words: `Deals ${dmg('knight', RITES.blow, bookDmg('jane', 0))} M.DMG to enemies in range, stunning them for ${RITES.stun} sec.`,
      icon: '⚰️',
      art: art(0),
      move: 'rites',
      cooldown: 8,
      cost: 2,
    },
    {
      name: 'Mark of Death',
      about: `A Mark on every enemy for ${DEATH.lasts} seconds: a blow every second, and ${pct(DEATH.takes)} more magic damage taken, ${pct(DEATH.more)} more again for each use while it is on (up to ${DEATH.most} times).`,
      words: `Engraves a Mark on all enemies for ${DEATH.lasts} sec and deals ${dmg('knight', DEATH.tick * DEATH.lasts, bookDmg('jane', 1))} continuous M.DMG. Enemies engraved with the Mark take ${pct(DEATH.takes)} increased M.DMG. This effect increases by ${pct(DEATH.more)} upon every use. This effect can be stacked up to max ${DEATH.most} times and is irremovable.`,
      icon: '💀',
      art: art(1),
      move: 'mark',
      cooldown: 6,
      cost: 1,
    },
    {
      name: 'Day of Ruin',
      about: `For ${RUIN.lasts} seconds, a blow every second on every enemy (harder on a marked one), now and then stunning, all it deals healing her; nothing knocks her down meanwhile.`,
      words: `Deals ${dmg('knight', RUIN.tick, bookDmg('jane', 2))} M.DMG to all enemies every sec for ${RUIN.lasts} sec, heals own HP equal to ${pct(RUIN.drinks)} of DMG dealt, and inflicts Stun on the hit target for ${RUIN.stun} sec with a ${pct(RUIN.chance)} chance. For the duration of the Skill, gains immunity to CC. Against Marked targets, deals ${dmg('knight', RUIN.tick * RUIN.marked, bookDmg('jane', 2))} increased M.DMG.`,
      icon: '🌸',
      art: art(2),
      move: 'ruinday',
      cooldown: 12,
      cost: 3,
    },
  ],
  passive: REST_SHOWN,
  treasures: [
    treasure('Funeral Doll', (k) => ({
      words: `[Funeral Rites] For ${UT.doll.lasts} sec, reduces the target's CC Resist by ${UT.doll.resist} and M.Block by ${k(UT.doll.block)}.`,
      skill: { index: 0, mark: { name: 'Funeral Doll', lasts: UT.doll.lasts, resist: -UT.doll.resist, blocks: { magical: -k(UT.doll.block) } } },
    })),
    treasure('Death-imbued Cushion', (k) => ({
      words: `[Mark of Death] Increases ATK by ${pct(UT.cushion.atk)} and Crit DMG by ${pct(k(UT.cushion.critDamage))} for ${UT.cushion.lasts} sec when the marked enemy dies. This effect stacks up to ${UT.cushion.most} times.`,
    })),
    treasure('Flowers of a Forgotten Dukedom', (k) => ({
      words: `[Day of Ruin] Increases DMG by ${pct(k(UT.flowers.dmg))}. Dealing DMG reduces target's M.DEF by ${pct(UT.flowers.defense)} for ${UT.flowers.lasts} sec. This effect can be stacked up to max ${UT.flowers.most} times.`,
      skill: { index: 2, dmg: 1 + k(UT.flowers.dmg) },
    })),
    treasure('First Friend Doll', (k) => ({
      words: `[Rest in Peace] Upon activation, dispels all negative effects from all allies and reduces All DMG dealt on self by ${pct(k(UT.friend.taken))} for ${UT.friend.lasts} sec.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, mark: { name: 'Funeral Rites', lasts: PERKS.lasts, takes: { magical: PERKS.takes } } } }, ({ skill }) => `Target takes ${pct(PERKS.takes - 1)} increased M.DMG for ${skill.mark.lasts} sec.`),
    's1-dark': said({ skill: { index: 0, cost: 1 } }, ({ skill }) => `In exchange for ${skill.cost} additional Mana Cost, the skill has a 100% chance to draw the target in.`),
    's2-light': said({ skill: { index: 1, dmg: 3.5 } }, ({ skill }) => `Duration is reduced to ${PERKS.markLasts} sec and DMG is boosted by ${pct(skill.dmg - 1)}.`),
    's2-dark': { words: 'Engraved Mark is not dispelled when negative effects are dispelled.' },
    's3-light': said({ skill: { index: 2, dmg: 1.4 } }, ({ skill }) => `DMG is increased by ${pct(skill.dmg - 1)}.`),
    's3-dark': said({ skill: { index: 2, cleanse: 'allies' } }, () => 'Upon use, dispels negative effects of all allies.'),
    's4-light': { words: 'Upon activation, dispels positive effects of all enemies.' },
    's4-dark': { words: `Upon activation, stun all enemies for ${PERKS.stun} sec.` },
    't5-light': t5Light({ blockMagical: 200 }, ({ blockMagical }) => `M. Block +${blockMagical}`),
    't5-dark': { words: `Each hit of Jane's attacks increase her ATK and Recovery Rate by ${pct(PERKS.dark.each)} each. (Maximum stack number is ${PERKS.dark.most})` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /** The Mark on each enemy: how long it has yet, and toward its next blow; the uses stacked in it. */
    const marked = new Map<Foe, { left: number; tick: number; uses: number }>();
    /** Day of Ruin: how long it has yet, and toward its next blow; Flowers of a Forgotten Dukedom's stacks on each enemy. */
    let ruin = 0;
    let ruining = 0;
    const flowers = new Map<Foe, number>();
    /** The coffin: how long it has yet (0: not in it), toward its next blow; whether it has been used. */
    let coffin = 0;
    let burning = 0;
    let buried = false;
    /** Death-imbued Cushion's stacks; Transcend 5's Dark's; toward her unique weapon's next blow; whether Rest in Peace's M.DEF and her unique weapon's ally are given. */
    let cushion = 0;
    let devoted = 0;
    let pulsing = 0;
    let begun = false;

    const markLasts = self.perks.has('s2-light') ? PERKS.markLasts : DEATH.lasts;
    /** The enemies standing; and those within so far of one. */
    const standing = (): Foe[] => fight.foes.filter((foe) => foe.hp > 0 && !foe.away);
    const near = (to: Foe, reach: number): Foe[] => standing().filter((foe) => foe === to || (foe.x - to.x) ** 2 + (foe.z - to.z) ** 2 <= reach * reach);
    /** Her allies on the field, standing and in the fight (her too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** A blow of hers on an enemy (`drinks`: that share of what it deals healing her). */
    const strike = (foe: Foe, amount: number, drinks = 0): void => {
      const before = self.dealt;
      fight.on(foe, () => fight.hit(self, amount));
      const dealt = self.dealt - before;
      if (drinks > 0 && dealt > 0) fight.heal(self, dealt * drinks, undefined, self);
    };
    /** Rest in Peace's coffin: healed; nothing touches her and she does nothing for a while; her allies cleansed (First Friend Doll), what helps the enemies gone (its Light), the enemies stunned (its Dark); her unique weapon's mana. */
    const bury = (): void => {
      buried = true;
      coffin = REST.lasts;
      burning = 0;
      put(self.statuses, { name: COFFIN.name, left: REST.lasts, binds: true, guards: true, shown: COFFIN });
      fight.heal(self, REST.heal, self);
      fight.heal(self, REST.hp * self.stats.hp * REST.books, undefined, self);
      if (wearsTreasure(self, 3)) for (const ally of allies()) ally.statuses = ally.statuses.filter((status) => status.shown.harmful !== true || status.binds === true);
      for (const foe of standing()) {
        if (self.perks.has('s4-light')) foe.statuses = foe.statuses.filter((status) => (status.deals ?? 1) <= 1);
        if (self.perks.has('s4-dark')) fight.on(foe, () => fight.stun(PERKS.stun, { by: self }));
      }
      if (tier !== null) self.mana = Math.min(MAX_MANA, self.mana + MAX_MANA * EREKURA.mana);
      fight.cue(self, 'coffin');
    };

    return {
      lands: {
        // A blow on the enemies about her target that stuns them.
        rites() {
          for (const foe of near(fight.foe, RITES.reach)) {
            strike(foe, RITES.blow);
            fight.on(foe, () => fight.stun(RITES.stun, { by: self }));
          }
        },
        // The Mark on every enemy (its Light: shorter, harder), the more magic damage taken for each use while it is on.
        mark(part) {
          if (part !== 1) return;
          for (const foe of standing()) {
            const uses = Math.min(DEATH.most, (marked.get(foe)?.uses ?? 0) + 1);
            marked.set(foe, { left: markLasts, tick: marked.get(foe)?.tick ?? 0, uses });
            put(foe.statuses, { name: MARK, left: markLasts, count: uses, takes: { magical: 1 + DEATH.takes + DEATH.more * (uses - 1) }, shown: 'curse' });
          }
          fight.cue(self, 'mark');
        },
        // Day of Ruin begun (its blows come every second, of themselves).
        ruinday() {
          ruin = RUIN.lasts;
          ruining = 0;
          put(self.statuses, { name: RUINED.name, left: RUIN.lasts, guards: true, shown: RUINED });
          fight.cue(self, 'ruinday');
        },
      },
      // Transcend 5's Dark: each blow of hers, her ATK and healing higher for a while (up to its most).
      blow() {
        if (!self.perks.has('t5-dark')) return;
        devoted = Math.min(PERKS.dark.most, devoted + 1);
        put(self.statuses, { name: DEVOTED.name, left: PERKS.dark.lasts, count: devoted, atk: PERKS.dark.each * devoted, heals: 1 + PERKS.dark.each * devoted, shown: DEVOTED });
      },
      // Rest in Peace: a blow that would bring her down, once a fight, the coffin instead; in it, nothing touches her.
      spared() {
        if (coffin > 0) return true;
        if (buried) return false;
        bury();
        return true;
      },
      untouched: () => coffin > 0,
      guards: () => ruin > 0,
      tick(dt) {
        // As the fight begins: Rest in Peace's M.DEF on every ally; her unique weapon's ally (the highest ATK, not her) more to Non-Hero enemies.
        if (!begun && fight.field.includes(self)) {
          begun = true;
          for (const ally of allies()) put(ally.statuses, { name: RESTING.name, left: Infinity, bolsters: { magical: REST.defense }, shown: RESTING });
          const top = allies()
            .filter((ally) => ally !== self)
            .sort((a, b) => b.stats.atk - a.stats.atk)[0];
          if (top && tier !== null) put(top.statuses, { name: EREKURA_UP.name, left: Infinity, deals: 1 + atTier(EREKURA.boss, tier), shown: EREKURA_UP });
        }
        // The coffin: every second a blow on the enemies near her (a share of her max HP, as thousandths of her ATK); then First Friend Doll's less taken.
        if (coffin > 0) {
          coffin -= dt;
          burning += dt;
          if (burning >= 1) {
            burning -= 1;
            for (const foe of near(fight.foe, EREKURA.reach)) strike(foe, (1000 * REST.blow * self.stats.hp) / self.stats.atk);
          }
          if (coffin <= 0 && wearsTreasure(self, 3)) put(self.statuses, { name: FRIEND.name, left: UT.friend.lasts, takes: 1 - fromTreasure(self, 3, UT.friend.taken), shown: FRIEND });
        }
        if (self.hp <= 0) return;
        // The Mark: a blow every second on each enemy it is on; a marked enemy beaten, Death-imbued Cushion's stack.
        for (const [foe, mark] of marked) {
          if (foe.hp <= 0 || foe.away) {
            marked.delete(foe);
            if (foe.hp <= 0 && wearsTreasure(self, 1)) {
              cushion = Math.min(UT.cushion.most, cushion + 1);
              put(self.statuses, { name: CUSHION.name, left: UT.cushion.lasts, count: cushion, atk: UT.cushion.atk * cushion, critDamage: fromTreasure(self, 1, UT.cushion.critDamage) * cushion, shown: CUSHION });
            }
            continue;
          }
          mark.left -= dt;
          mark.tick += dt;
          if (mark.tick >= 1) {
            mark.tick -= 1;
            strike(foe, DEATH.tick * (self.moveDmg.mark ?? 1));
          }
          if (mark.left <= 0) marked.delete(foe);
        }
        if (cushion > 0 && !self.statuses.some((status) => status.name === CUSHION.name)) cushion = 0;
        if (devoted > 0 && !self.statuses.some((status) => status.name === DEVOTED.name)) devoted = 0;
        // Day of Ruin: a blow every second on every enemy (the more on a marked one), healing her, now and then a stun, and its book's mana; Flowers of a Forgotten Dukedom: each its M.DEF lower.
        if (ruin > 0) {
          ruin -= dt;
          ruining += dt;
          if (ruining >= 1) {
            ruining -= 1;
            for (const foe of standing()) {
              strike(foe, RUIN.tick * (marked.has(foe) ? 1 + RUIN.marked : 1) * (self.moveDmg.ruinday ?? 1), RUIN.drinks);
              self.mana = Math.min(MAX_MANA, self.mana + MAX_MANA * RUIN.mana);
              if (fight.roll() < RUIN.chance) fight.on(foe, () => fight.stun(RUIN.stun, { by: self }));
              if (!wearsTreasure(self, 2)) continue;
              const count = Math.min(UT.flowers.most, (flowers.get(foe) ?? 0) + 1);
              flowers.set(foe, count);
              put(foe.statuses, { name: 'Flowers of a Forgotten Dukedom', left: UT.flowers.lasts, count, defends: { magical: 1 - UT.flowers.defense * count }, shown: 'curse' });
            }
          }
        }
        for (const [foe] of flowers) if (!foe.statuses.some((status) => status.name === 'Flowers of a Forgotten Dukedom')) flowers.delete(foe);
        // Her unique weapon: every second a blow on the enemies near her, hitting less hard a moment.
        if (tier !== null && coffin <= 0) {
          pulsing += dt;
          if (pulsing >= 1) {
            pulsing -= 1;
            for (const foe of near(fight.foe, EREKURA.reach)) {
              strike(foe, atTier(EREKURA.blow, tier) * 1000);
              put(foe.statuses, { name: EREKURA.name, left: 1.1, deals: 1 - atTier(EREKURA.weaker, tier), shown: 'curse' });
            }
          }
        }
      },
      lit: () => ruin > 0,
      marks: (): Mark[] => {
        const on = marked.get(fight.foe);
        return on ? [{ text: `Mark of Death ×${on.uses} ${Math.ceil(on.left)}s`, tone: 'curse', art: art(1), count: `×${on.uses}` }] : [];
      },
    };
  },
};
