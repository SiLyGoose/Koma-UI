import { away, put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA, SECTION } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { num, pct, skillArt, type Buff } from '../shown';
import type { Fighter, Foe } from '../types';
import { atTier, RIVENTINA, RIVENTINA_UP } from '../unique';
import { bookDmg, bookHeal, CLASS_STATS, dmg, healed, type HeroDef, type Passive, played, playedHeal } from './kit';

/*
 * Mirianne's skills, as King's Raid's playtest has them (stats/mirianne.md: how hard each hits and shields at its level 90,
 * and every number here, are its; its words are its own). She is an assassin whose blows are magical, the Servant of Blue.
 * - Target Lock On: three blows that stun the boss a moment, each harder on one under [Target Lock On]; the last puts it on
 *   for a while (more magic damage taken).
 * - Restrain and Protect: a blow that stuns the boss; then a shield on her and the ally that has dealt the most (its books'
 *   half again), and their CC resist higher.
 * - Assassination: a great blow, and a blow more on a Non-Hero enemy; on a boss, then [Check & Guard]: Restrain and
 *   Protect's blow and stun again.
 * Her passive, Target Eliminated: while an enemy is under [Target Lock On], her ATK higher (its books' half again).
 * Her unique weapon (../unique.ts) is worked here too: she is quicker, and her blows on an enemy under [Target Lock On] deal
 * a blow more now and then.
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/mirianne.ts; the playtest has
 * no effects of hers).
 *
 * Her own perks (../perks.ts) are King's Raid's. Target Lock On's Light (one enemy) always holds. Transcend 5's Dark
 * comes as a blow of hers beats a minion of the raid's waves.
 */
/** Target Lock On: each of its three blows, its stun, and its blow more on one under [Target Lock On]; [Target Lock On]'s more magic damage taken, for how long. */
const LOCK = { blow: played('assassin', 1148, 39_054), stun: 0.6, more: played('assassin', 689, 65_023), takes: 1.2, lasts: 10 };
/** Restrain and Protect (and [Check & Guard]): its blow, its stun; its shield (its books', the fight's: ../fight.ts), for how long, and the CC resist it gives. */
const RESTRAIN = { blow: played('assassin', 3572, 122_105), stun: 1.2, shield: playedHeal('assassin', 4516, 597_014), lasts: 6, resist: 600 };
/** Assassination: its blow, and its blow more on a Non-Hero enemy. */
const ASSASSIN = { blow: played('assassin', 5703, 195_069), boss: played('assassin', 8554, 292_499) };
/** Target Eliminated: her ATK more (flat, its books' half again) while an enemy is under [Target Lock On]. */
const ELIMINATED = { atk: 52_573, books: 1.5 };
/** Her own perks' numbers: Target Lock On's Dark's longer stun; Restrain's Dark's longer stuns; Assassination's Light's stun; Target Eliminated's Light's crit chance and Dark's less taken; Transcend 5's Dark's share off her cooldowns. */
const PERKS = { lock: 0.6, restrain: 1.2, guard: 2, stun: 1, crit: 300, taken: 0.12, sooner: 0.5 };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Target Lock On's more DMG and lower M.Crit
 * Resistance on the boss; Restrain and Protect's mana on a critical blow; Assassination's more DMG and ATK on a critical
 * blow; Target Eliminated's more ATK and its stun every so often on an enemy under [Target Lock On].
 */
const UT = {
  endeavor: { dmg: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], critTaken: 500, lasts: 10 },
  gemini: { mana: [160, 190, 230, 270, 330, 400] },
  powder: { dmg: 0.5, atk: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], lasts: 10 },
  miracle: { atk: 0.5, every: 5, stun: [1, 1.2, 1.4, 1.7, 2.1, 2.5] },
};

const art = skillArt('mirianne');

const ELIMINATED_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Target Eliminated', about: `Passive. While an enemy is under [Target Lock On], ATK +${num(Math.round(ELIMINATED.atk * ELIMINATED.books))}.`, icon: '🎯', art: art(3) },
  words: `If there is an enemy under [Target Lock On], increases ATK by ${num(Math.round(ELIMINATED.atk * ELIMINATED.books))}, and all skills prioritize enemies under [Target Lock On]. When a [Target Lock On] enemy dies, inflicts another enemy with the lowest M.DEF with [Target Lock On] for ${LOCK.lasts}sec.\n[Target Lock On]: Increases M.DMG taken by ${pct(LOCK.takes - 1)}. This effect cannot be dispelled.`,
};
const LOCKED = 'Target Lock On';
const HUNTING: Buff = { name: 'Target Eliminated', about: 'ATK higher while an enemy is under [Target Lock On].', icon: '🎯', art: art(3) };
const GUARD: Buff = { name: 'Restrain and Protect', about: 'CC resist higher.', icon: '🛡️', art: art(1) };
const POWDER: Buff = { name: 'Magic Powder of Lightning', about: 'ATK higher.', icon: '⚡', art: art(2) };

export const MIRIANNE: HeroDef = {
  id: 'mirianne',
  name: 'Mirianne',
  class: 'assassin',
  skins: ['Mirianne'],
  // An assassin whose blows are magical: as her class stands, otherwise.
  stats: { ...CLASS_STATS.assassin, deals: 'magical' },
  abilities: [
    {
      name: 'Target Lock On',
      about: `Three blows that stun the boss for ${LOCK.stun} seconds, each harder on one under [Target Lock On]; the last puts it on for ${LOCK.lasts} seconds (${pct(LOCK.takes - 1)} more magic damage taken).`,
      words: `Attacks the enemy with the lowest M.DEF 3 times, dealing ${dmg('assassin', LOCK.blow, bookDmg('mirianne', 0))} M.DMG and stunning them for ${LOCK.stun}sec. If the target is under [Target Lock On], deals additional ${dmg('assassin', LOCK.more, bookDmg('mirianne', 0))} M.DMG. The final hit inflicts [Target Lock On] on the enemy for ${LOCK.lasts}sec.`,
      icon: '🎯',
      art: art(0),
      move: 'lockon',
      cooldown: 6,
      cost: 2,
    },
    {
      name: 'Restrain and Protect',
      about: `A blow that stuns the boss for ${RESTRAIN.stun} seconds; then a shield on her and the ally that has dealt the most for ${RESTRAIN.lasts} seconds, their CC resist higher.`,
      words: `Deals ${dmg('assassin', RESTRAIN.blow, bookDmg('mirianne', 1))} M.DMG to enemies in range and stuns them for ${RESTRAIN.stun}sec. Then moves to the ally with the highest DMG dealt, creating a [Shield] on the target and self that absorbs ${healed('assassin', RESTRAIN.shield, bookHeal('mirianne', 1))} DMG for ${RESTRAIN.lasts}sec, and increases Status Resistance by ${pct(RESTRAIN.resist / 1000)}. This effect does not activate if there are no allies.`,
      icon: '🛡️',
      art: art(1),
      move: 'restrain',
      cooldown: 12,
      cost: 2,
    },
    {
      name: 'Assassination',
      about: 'A great blow, and a blow more on a Non-Hero enemy; on a boss, then [Check & Guard] (Restrain and Protect’s blow and stun again).',
      words: `Moves to the enemy with the lowest current HP, dealing ${dmg('assassin', ASSASSIN.blow, bookDmg('mirianne', 2))} M.DMG, then returns to the farthest ally. If the target is not a Hero, deals additional ${dmg('assassin', ASSASSIN.boss, bookDmg('mirianne', 2))} M.DMG. If the target is killed by this skill or is a Boss, uses [Check & Guard].`,
      icon: '🗡️',
      art: art(2),
      move: 'assassinate',
      cooldown: 14,
      cost: 4,
    },
  ],
  passive: ELIMINATED_SHOWN,
  treasures: [
    treasure('Proof of Endeavor', (k) => ({
      words: `[Target Lock On] Increases DMG by ${pct(k(UT.endeavor.dmg))}, and reduces the target's M.Crit Resistance by ${UT.endeavor.critTaken} for ${UT.endeavor.lasts} sec.`,
      skill: { index: 0, dmg: 1 + k(UT.endeavor.dmg), mark: { name: 'Proof of Endeavor', lasts: UT.endeavor.lasts, critTaken: { magical: UT.endeavor.critTaken } } },
    })),
    treasure('Gemini Ring of Instant Teleportation', (k) => ({
      words: `[Restrain and Protect] Reduces Mana Cost by 1 and upon Crit hit recovers ${k(UT.gemini.mana)} Mana.`,
      skill: { index: 1, cost: -1, critMana: k(UT.gemini.mana) },
    })),
    treasure('Magic Powder of Lightning', (k) => ({
      words: `[Assassination] DMG is increased by ${pct(UT.powder.dmg)} and upon Crit Hit increases own ATK by ${pct(k(UT.powder.atk))} for ${UT.powder.lasts} sec.`,
      skill: { index: 2, dmg: 1 + UT.powder.dmg },
    })),
    treasure('Birth of Miracle', (k) => ({
      words: `[Target Eliminated] Increases ATK boost by ${pct(UT.miracle.atk)}. Every ${UT.miracle.every} sec, stuns enemies under Target Lock On for ${k(UT.miracle.stun)} sec.`,
    })),
  ],
  perks: {
    's1-light': said({ skill: { index: 0, dmg: 2 } }, ({ skill }) => `When there is 1 enemy, DMG is boosted by ${pct(skill.dmg - 1)}.`),
    's1-dark': { words: `Stun duration is increased by ${PERKS.lock} sec.` },
    's2-light': said({ skill: { index: 1, steady: true } }, () => 'Gain CC immunity while using said skill.'),
    's2-dark': { words: `Stun duration is increased by ${PERKS.restrain} sec ([Check & Guard]: ${PERKS.guard} sec).` },
    's3-light': { words: `Dispels target's positive effects and inflicts Stun for ${PERKS.stun} sec.` },
    's3-dark': said({ skill: { index: 2, dmg: 1.4 } }, ({ skill }) => `DMG is increased by ${pct(skill.dmg - 1)}.`),
    's4-light': { words: `When there is an enemy affected by 'Target Lock On', Crit Chance is increased by ${PERKS.crit}.` },
    's4-dark': { words: `When there is an enemy affected by 'Target Lock On', DMG taken is reduced by ${pct(PERKS.taken)}.` },
    't5-light': t5Light({ critDamage: 0.2 }, ({ critDamage }) => `Crit DMG +${pct(critDamage)}`),
    't5-dark': { words: `Upon killing an enemy, all skill cooldown is reduced by ${pct(PERKS.sooner)}, and recovers 1 orb of mana.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /** Her unique weapon's wait; Birth of Miracle's toward its next stun. */
    let riventina = 0;
    let miracle = 0;
    /** Target Eliminated's ATK: a share of her own, as the fight begins (Birth of Miracle: more). */
    const eliminated = (ELIMINATED.atk * ELIMINATED.books * (wearsTreasure(self, 3) ? 1 + UT.miracle.atk : 1)) / self.stats.atk;
    // Her unique weapon: quicker, for good.
    if (tier !== null) put(self.statuses, { name: RIVENTINA_UP.name, left: Infinity, speed: atTier(RIVENTINA.speed, tier), shown: RIVENTINA_UP });
    /** Whether an enemy is under [Target Lock On] (this one: the one in question). */
    const locked = (foe: Foe = fight.foe): boolean => foe.statuses.some((status) => status.name === LOCKED);
    const anyLocked = (): boolean => fight.foes.some((foe) => foe.hp > 0 && locked(foe));
    /** A blow of hers: with her unique weapon, on one under [Target Lock On] now and then a blow more; Transcend 5's Dark: beating an enemy, her cooldowns shorter and mana. */
    const strike = (amount: number): boolean => {
      const foe = fight.foe;
      const alive = foe.hp > 0;
      const critical = fight.hit(self, amount);
      if (tier !== null && riventina <= 0 && locked(foe)) {
        riventina = RIVENTINA.every;
        fight.hit(self, atTier(RIVENTINA.blow, tier) * 1000, false);
      }
      if (alive && foe.hp <= 0 && self.perks.has('t5-dark')) {
        self.cooldowns = self.cooldowns.map((left) => left * (1 - PERKS.sooner));
        self.mana = Math.min(MAX_MANA, self.mana + SECTION);
      }
      return critical;
    };
    /** Restrain and Protect's (and [Check & Guard]'s) blow and stun (its Dark: longer). */
    const restrain = (longer: number): void => {
      strike(RESTRAIN.blow);
      fight.stun(RESTRAIN.stun + (self.perks.has('s2-dark') ? longer : 0), { by: self });
    };
    /** Her allies on the field, standing and in the fight (her too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));

    return {
      lands: {
        attack() {
          strike(fight.basic);
        },
        // Three blows that stun the boss (its Dark: longer), each harder on one under [Target Lock On]; the last puts it on.
        lockon(part) {
          strike(LOCK.blow);
          if (locked()) strike(LOCK.more);
          fight.stun(LOCK.stun + (self.perks.has('s1-dark') ? PERKS.lock : 0), { by: self });
          if (part === 2) put(fight.foe.statuses, { name: LOCKED, left: LOCK.lasts, takes: { magical: LOCK.takes }, shown: 'curse' });
        },
        // A blow that stuns the boss; a shield on her and the ally that has dealt the most, their CC resist higher.
        restrain() {
          restrain(PERKS.restrain);
          const top = allies().filter((ally) => ally !== self).sort((a, b) => b.dealt - a.dealt)[0];
          const on = top ? [self, top] : [self];
          fight.cue(self, 'restrain', on);
          for (const ally of on) {
            fight.shield(ally, RESTRAIN.shield, RESTRAIN.lasts, self);
            put(ally.statuses, { name: GUARD.name, left: RESTRAIN.lasts, resist: RESTRAIN.resist, shown: GUARD });
          }
        },
        // A great blow, and a blow more on a Non-Hero enemy (its Light: a stun; Magic Powder of Lightning: a critical one, ATK); on a boss, [Check & Guard].
        assassinate(part) {
          if (part > 0) {
            if (fight.foe === fight.boss) restrain(PERKS.guard);
            return;
          }
          const critical = strike(ASSASSIN.blow);
          strike(ASSASSIN.boss);
          if (self.perks.has('s3-light')) fight.stun(PERKS.stun, { by: self });
          if (critical && wearsTreasure(self, 2)) put(self.statuses, { name: POWDER.name, left: UT.powder.lasts, atk: fromTreasure(self, 2, UT.powder.atk), shown: POWDER });
        },
      },
      tick(dt) {
        if (riventina > 0) riventina -= dt;
        // Target Eliminated: while an enemy is under [Target Lock On], her ATK higher (its Light: crit chance; its Dark: less taken).
        if (anyLocked()) {
          put(self.statuses, {
            name: HUNTING.name,
            left: Infinity,
            atk: eliminated,
            ...(self.perks.has('s4-light') && { critPoints: PERKS.crit }),
            ...(self.perks.has('s4-dark') && { takes: 1 - PERKS.taken }),
            shown: HUNTING,
          });
          // Birth of Miracle: every so often, the boss under it stunned.
          if (wearsTreasure(self, 3)) {
            miracle += dt;
            if (miracle >= UT.miracle.every) {
              miracle -= UT.miracle.every;
              if (locked(fight.boss)) fight.stun(fromTreasure(self, 3, UT.miracle.stun), { by: self });
            }
          }
        } else self.statuses = self.statuses.filter((status) => status.name !== HUNTING.name);
      },
      lit: () => anyLocked(),
    };
  },
};
