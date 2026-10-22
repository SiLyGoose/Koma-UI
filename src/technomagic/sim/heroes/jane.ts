import { away, put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { num, pct, skillArt, type Buff, type Mark } from '../shown';
import type { Fighter, Foe } from '../types';
import { atTier, EREKURA, EREKURA_UP } from '../unique';
import { bookDmg, bookHeal, CLASS_STATS, dmg, healed, type HeroDef, type Passive, played, playedHeal } from './kit';

/*
 * Jane's skills, as King's Raid's playtest has them (stats/jane.md: how hard each hits and heals at its level 90, and every
 * number here, are its; its words are the live game's, with the playtest's numbers). She is a knight whose blows are
 * magical, the Alabaster Corpse.
 * - Funeral Rites: a blow on the enemies about her target that stuns them.
 * - Mark of Death: [Mark of Death] on every enemy for a while: a blow every second, and their M.DEF lower; cast again while
 *   it is on, lower again (up to twice).
 * - Day of Ruin: for a while, a blow every second on every enemy (the harder on one with [Mark of Death]), half of what it
 *   deals healing her; and the 4 allies with the lowest M.DEF take less magic damage meanwhile.
 * Her passive, Rest in Peace: the 4 allies with the lowest M.DEF have it higher; and a blow that would bring her down puts
 * her in a [Coffin] instead (once a fight: its cooldown is longer than a raid): for 5 seconds nothing touches her, she
 * does nothing, and she is healed six times.
 * Her unique weapon (../unique.ts) is worked here too: every second a blow on the enemies near her, hitting less hard a
 * moment; the ally with the highest ATK (not her) deals more to Non-Hero enemies; and the [Coffin] fills a share of her mana.
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/jane.ts).
 *
 * Her own perks (../perks.ts) are the playtest's, which aren't the live game's (it reworked her since): their words are the
 * playtest's. Funeral Rites' Dark's pull does nothing here (bosses aren't moved), nor Mark of Death's Dark (nothing removes
 * what is on the boss). The [Coffin]'s blows every second are turned off in the playtest, so it deals none.
 */
const MARK = 'Mark of Death';
/** Funeral Rites: its blow, how far about its target, and how long it stuns; its Light's share of what it deals healing her. */
const RITES = { blow: played('knight', 2776, 77_465), reach: 3, stun: 2, drinks: 0.5 };
/** Mark of Death: how long, a blow every second; the enemies' M.DEF less, and less again for each cast while it is on (up to twice, for as long as it). */
const DEATH = { lasts: 15, tick: played('knight', 69, 1_929), defense: 0.1, deeper: 0.05, most: 2 };
/** Day of Ruin: how long, a blow every second, the more on an enemy with [Mark of Death], the share of what it deals healing her, her Recovery meanwhile (its third book's); how many allies take less magic damage, how much less. */
const RUIN = { lasts: 22, tick: played('knight', 814, 22_746), marked: played('knight', 814), drinks: 0.5, recovery: 0.2, allies: 4, taken: 0.11 };
/** Rest in Peace: the 4 allies with the lowest M.DEF, their M.DEF more (flat); the [Coffin], how long, its heals (when, each its ATK's and a share of her max HP, its books' half again on the share). */
const REST = { allies: 4, defense: 21_669, lasts: 5, heals: [1, 1.5, 2, 2.5, 3, 3.5], heal: playedHeal('knight', 1537, 42_269), hp: 0.01, books: 1.5 };
/** Her own perks' numbers: Mark of Death's Light's while and DMG; Day of Ruin's Light's DMG and Dark's less physical damage; Rest in Peace's Dark's stun; Transcend 5's Dark's ATK and healing for each blow, up to how many, for how long. */
const PERKS = { markLasts: 10, markDmg: 6, ruinDmg: 1.5, physical: 0.1, stun: 1, dark: { each: 0.01, most: 35, lasts: 20 } };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Funeral Rites' CC resist and M.Block less on
 * its target; Mark of Death's ATK and crit DMG for each marked enemy killed (up to 8); Day of Ruin's DMG and its targets' M.DEF
 * less for each of its blows (up to 10); Rest in Peace's less damage taken after the [Coffin].
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
    about: `Passive. The ${REST.allies} allies with the lowest M.DEF have it ${num(REST.defense)} higher. A blow that would bring her down puts her in a [Coffin] instead, once a fight: for ${REST.lasts} seconds nothing touches her, she does nothing, and she is healed ${REST.heals.length} times.`,
    icon: '⚰️',
    art: art(3),
  },
  words: `Increases M.DEF of ${REST.allies} allies with the lowest M.DEF by ${num(REST.defense)}. Upon taking a deathblow, enters a [Coffin] for ${REST.lasts} sec and heals ${healed('knight', REST.heal * REST.heals.length, bookHeal('jane', 3))} + ${pct(REST.hp * REST.heals.length * REST.books)} of Max HP over its duration. While inside the [Coffin], Jane is not affected by ATK Spd effects and ignores All DMG.`,
};
const COFFIN: Buff = { name: 'Coffin', about: 'Nothing touches her, she does nothing, and she is healed.', icon: '⚰️', art: art(3) };
const RESTING: Buff = { name: 'Rest in Peace', about: 'M.DEF higher.', icon: '⚰️', art: art(3) };
const RUINED: Buff = { name: 'Day of Ruin', about: 'Takes less magic damage.', icon: '🌸', art: art(2) };
const RUIN_DARK: Buff = { name: 'Day of Ruin (Dark)', about: 'Takes less physical damage.', icon: '🌸', art: art(2) };
const RECOVERING: Buff = { name: 'Day of Ruin (Recovery)', about: 'Healed the more.', icon: '🌸', art: art(2) };
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
      cost: 1,
    },
    {
      name: 'Mark of Death',
      about: `[Mark of Death] on every enemy for ${DEATH.lasts} seconds: a blow every second, and their M.DEF ${pct(DEATH.defense)} lower (${pct(DEATH.deeper)} lower again for each cast while it is on, up to ${DEATH.most} times).`,
      words: `Engraves [Mark of Death] on all enemies for ${DEATH.lasts} sec, dealing ${dmg('knight', DEATH.tick, bookDmg('jane', 1))} M.DMG every 1 sec and reducing M.DEF by ${pct(DEATH.defense)}. If recast within ${DEATH.lasts} sec, the M.DEF reduction increases by ${pct(DEATH.deeper)} and stacks up to ${DEATH.most} times. The M.DEF reduction increase effect cannot be dispelled.`,
      icon: '💀',
      art: art(1),
      move: 'mark',
      cooldown: 6,
      cost: 2,
    },
    {
      name: 'Day of Ruin',
      about: `For ${RUIN.lasts} seconds, a blow every second on every enemy (harder on one with [Mark of Death]), ${pct(RUIN.drinks)} of it healing her; the ${RUIN.allies} allies with the lowest M.DEF take ${pct(RUIN.taken)} less magic damage meanwhile.`,
      words: `For ${RUIN.lasts} sec, deals ${dmg('knight', RUIN.tick, bookDmg('jane', 2))} M.DMG every 1 sec to all enemies and recovers ${pct(RUIN.drinks)} of DMG as own HP, with ${pct(RUIN.recovery)} more Recovery. Reduces M.DMG taken by ${pct(RUIN.taken)} for ${RUIN.allies} allies with the lowest M.DEF. Enemies with [Mark of Death] take additional ${dmg('knight', RUIN.marked, bookDmg('jane', 2))} M.DMG.`,
      icon: '🌸',
      art: art(2),
      move: 'ruinday',
      cooldown: 20,
      cost: 4,
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
      words: `[Day of Ruin] DMG is increased by ${pct(k(UT.flowers.dmg))} and with every DMG dealt, target's M.DEF is reduced by ${pct(UT.flowers.defense)} for ${UT.flowers.lasts} sec. This effect can be stacked max ${UT.flowers.most} times.`,
      skill: { index: 2, dmg: 1 + k(UT.flowers.dmg) },
    })),
    treasure('First Friend Doll', (k) => ({
      words: `[Rest in Peace] Upon activation, dispels all negative effects from all allies and reduces All DMG dealt on self by ${pct(k(UT.friend.taken))} for ${UT.friend.lasts} sec.`,
    })),
  ],
  perks: {
    's1-light': { words: `Recovers HP equal to ${pct(RITES.drinks)} of damage dealt.` },
    's1-dark': said({ skill: { index: 0, cost: 2 } }, ({ skill }) => `Mana cost increases by ${skill.cost}, but pulls the target toward you.`),
    's2-light': said({ skill: { index: 1, dmg: PERKS.markDmg } }, ({ skill }) => `Debuff duration is reduced to ${PERKS.markLasts} sec, but damage is increased by ${pct(skill.dmg - 1)}.`),
    's2-dark': { words: '[Mark of Death] cannot be removed by cleansing harmful effects.' },
    's3-light': said({ skill: { index: 2, dmg: PERKS.ruinDmg } }, ({ skill }) => `Damage increases by ${pct(skill.dmg - 1)}.`),
    's3-dark': { words: `All allies additionally take ${pct(PERKS.physical)} less Physical DMG.` },
    's4-light': { words: 'When the effect triggers, removes all harmful effects from all allies.' },
    's4-dark': { words: `When the effect triggers, stuns all enemies for ${PERKS.stun} sec.` },
    't5-light': t5Light({ blockMagical: 200 }, ({ blockMagical }) => `M. Block +${blockMagical}`),
    't5-dark': { words: `On hit, Attack and Healing increase by ${pct(PERKS.dark.each)}. This effect stacks up to ${PERKS.dark.most} times.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /** [Mark of Death] on each enemy: how long it has yet, and toward its next blow; its casts while it is on (up to its most), and how long they count yet. */
    const marked = new Map<Foe, { left: number; tick: number }>();
    let deeper = 0;
    let deeperLeft = 0;
    /** Day of Ruin: how long it has yet, and toward its next blow; Flowers of a Forgotten Dukedom's stacks on each enemy. */
    let ruin = 0;
    let ruining = 0;
    const flowers = new Map<Foe, number>();
    /** The [Coffin]: how long it has yet (0: not in it), how long since it began, its heals given; whether it has been used. */
    let coffin = 0;
    let inCoffin = 0;
    let mended = 0;
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
    /** Her allies on the field, standing and in the fight (her too), the lowest M.DEF first. */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    const softest = (): Fighter[] => allies().sort((a, b) => a.stats.magical - b.stats.magical);
    /** A blow of hers on an enemy: what it dealt, and (`drinks`) that share of it healing her. */
    const strike = (foe: Foe, amount: number, drinks = 0): number => {
      const before = self.dealt;
      fight.on(foe, () => fight.hit(self, amount));
      const dealt = self.dealt - before;
      if (drinks > 0 && dealt > 0) fight.heal(self, dealt * drinks, undefined, self);
      return dealt;
    };
    /** Rest in Peace's [Coffin]: nothing touches her and she does nothing for a while; her allies cleansed (its Light, First Friend Doll), the enemies stunned (its Dark); her unique weapon's mana. */
    const bury = (): void => {
      buried = true;
      coffin = REST.lasts;
      inCoffin = 0;
      mended = 0;
      put(self.statuses, { name: COFFIN.name, left: REST.lasts, binds: true, guards: true, shown: COFFIN });
      if (self.perks.has('s4-light') || wearsTreasure(self, 3))
        for (const ally of allies()) ally.statuses = ally.statuses.filter((status) => status.shown.harmful !== true || status.binds === true || status.name === COFFIN.name);
      if (self.perks.has('s4-dark')) for (const foe of standing()) fight.on(foe, () => fight.stun(PERKS.stun, { by: self }));
      if (tier !== null) self.mana = Math.min(MAX_MANA, self.mana + MAX_MANA * EREKURA.mana);
      fight.cue(self, 'coffin');
    };

    return {
      lands: {
        // A blow on the enemies about her target that stuns them (its Light: healing her).
        rites() {
          for (const foe of near(fight.foe, RITES.reach)) {
            strike(foe, RITES.blow, self.perks.has('s1-light') ? RITES.drinks : 0);
            fight.on(foe, () => fight.stun(RITES.stun, { by: self }));
          }
        },
        // [Mark of Death] on every enemy (its Light: shorter, harder), the lower the M.DEF for each cast while it is on.
        mark(part) {
          if (part === 1) {
            const defense = DEATH.defense + DEATH.deeper * deeper;
            for (const foe of standing()) {
              marked.set(foe, { left: markLasts, tick: 0 });
              put(foe.statuses, { name: MARK, left: markLasts, defends: { magical: 1 - defense }, shown: 'curse' });
            }
            fight.cue(self, 'mark');
          } else if (part === 2) {
            deeper = Math.min(DEATH.most, deeper + 1);
            deeperLeft = DEATH.lasts;
          }
        },
        // Day of Ruin begun (its blows come every second, of themselves); the allies with the lowest M.DEF take less magic damage (its Dark: every ally less physical).
        ruinday() {
          ruin = RUIN.lasts;
          ruining = 0;
          put(self.statuses, { name: RECOVERING.name, left: RUIN.lasts, heals: 1 + RUIN.recovery, shown: RECOVERING });
          const on = softest().slice(0, RUIN.allies);
          for (const ally of on) put(ally.statuses, { name: RUINED.name, left: RUIN.lasts, takes: { magical: 1 - RUIN.taken }, shown: RUINED });
          if (self.perks.has('s3-dark')) for (const ally of allies()) put(ally.statuses, { name: RUIN_DARK.name, left: RUIN.lasts, takes: { physical: 1 - PERKS.physical }, shown: RUIN_DARK });
          fight.cue(self, 'ruinday', on);
        },
      },
      // Transcend 5's Dark: each blow of hers, her ATK and healing higher for a while (up to its most).
      blow() {
        if (!self.perks.has('t5-dark')) return;
        devoted = Math.min(PERKS.dark.most, devoted + 1);
        put(self.statuses, { name: DEVOTED.name, left: PERKS.dark.lasts, count: devoted, atk: PERKS.dark.each * devoted, heals: 1 + PERKS.dark.each * devoted, shown: DEVOTED });
      },
      // Rest in Peace: a blow that would bring her down, once a fight, the [Coffin] instead; in it, nothing touches her.
      spared() {
        if (coffin > 0) return true;
        if (buried) return false;
        bury();
        return true;
      },
      untouched: () => coffin > 0,
      tick(dt) {
        // As the fight begins: Rest in Peace's M.DEF on the allies with the lowest; her unique weapon's ally (the highest ATK, not her) more to Non-Hero enemies.
        if (!begun && fight.field.includes(self)) {
          begun = true;
          for (const ally of softest().slice(0, REST.allies)) put(ally.statuses, { name: RESTING.name, left: Infinity, bolsters: { magical: REST.defense }, shown: RESTING });
          const top = allies()
            .filter((ally) => ally !== self)
            .sort((a, b) => b.stats.atk - a.stats.atk)[0];
          if (top && tier !== null) put(top.statuses, { name: EREKURA_UP.name, left: Infinity, deals: 1 + atTier(EREKURA.boss, tier), shown: EREKURA_UP });
        }
        // The [Coffin]: healed at its times (its ATK's, and a share of her max HP); then out of it.
        if (coffin > 0) {
          coffin -= dt;
          inCoffin += dt;
          while (mended < REST.heals.length && inCoffin >= (REST.heals[mended] ?? Infinity)) {
            mended++;
            fight.heal(self, REST.heal, self);
            fight.heal(self, REST.hp * self.stats.hp * REST.books, undefined, self);
          }
          if (coffin <= 0 && wearsTreasure(self, 3)) put(self.statuses, { name: FRIEND.name, left: UT.friend.lasts, takes: 1 - fromTreasure(self, 3, UT.friend.taken), shown: FRIEND });
        }
        if (self.hp <= 0) return;
        if (deeperLeft > 0) {
          deeperLeft -= dt;
          if (deeperLeft <= 0) deeper = 0;
        }
        // [Mark of Death]: a blow every second on each enemy it is on; a marked enemy beaten, Death-imbued Cushion's stack.
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
        // Day of Ruin: a blow every second on every enemy (the more on a marked one), healing her; Flowers of a Forgotten Dukedom: each its M.DEF lower.
        if (ruin > 0) {
          ruin -= dt;
          ruining += dt;
          if (ruining >= 1) {
            ruining -= 1;
            for (const foe of standing()) {
              strike(foe, (RUIN.tick + (marked.has(foe) ? RUIN.marked : 0)) * (self.moveDmg.ruinday ?? 1), RUIN.drinks);
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
        return on ? [{ text: `Mark of Death ${Math.ceil(on.left)}s`, tone: 'curse', art: art(1) }] : [];
      },
    };
  },
};
