import { away, put } from '../combat/status';
import { said, t5Light } from '../perks';
import { MAX_MANA, SECTION } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { fine, num, pct, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { atTier, NEMECIA, NEMECIA_UP } from '../unique';
import { type Ability, bookDmg, bookHeal, CLASS_STATS, dmg, healed, type HeroDef, type Passive, played, playedHeal } from './kit';

/*
 * Lavril's skills, as King's Raid's playtest has them (stats/lavril.md: how hard each hits and heals at its level 90, and
 * every number here, are its; its words are its own). She is a priest whose blows are magical, the Lovely Evil Spirit.
 * - G-go Away!: a blow; the boss takes more magic damage and is likelier critically hit for a while, and [Lavril's
 *   Ectoplasm] on it, a blow every half second; each of their blows heals every ally a share of it.
 * - Bear Up...!: the ally with the highest ATK healed, then healed every second for a while, its ATK and crit DMG higher
 *   meanwhile. For a while after, You Scare Me...! in its place: a great blow, the boss slowed and taking more magic damage.
 * - Leave Me Alone...!: a blow and a spectral tornado for a while, its blows each leaving the boss hitting less hard and
 *   taking more magic damage (stacked up).
 * Her passive, Together Forever...: as the fight begins, a [Soul Link] with the ally with the highest ATK: both their ATK
 * (its books' half again) and penetration higher, mana every second, and more to Non-Hero enemies.
 * Her unique weapon (../unique.ts) is worked here too: each skill she uses, untouched for a moment (no more often than every
 * 10 seconds); and her linked ally's crit DMG higher.
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/lavril.ts).
 *
 * Her own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). G-go Away!'s Dark
 * (only 1 enemy) holds while the boss stands alone (not while a Dragon Raid's minions stand with it). You Scare Me...!'s
 * Light takes what helps the boss off it (what has it deal more); its Dark's second target is none here. A heal "of DMG
 * dealt" is of the blow as her ATK has it (before the boss's defense).
 */
/** G-go Away!: its blow; the boss's more magic damage taken and lower Crit Resistance, for how long; [Lavril's Ectoplasm]'s blow every so often, for how long; the share of each blow healed to every ally. */
const AWAY = { blow: played('priest', 2494, 124_894), takes: 1.25, critTaken: 300, lasts: 10, ecto: played('priest', 565, 19_523), every: 0.5, ectoLasts: 5, drain: 0.05 };
/** Bear Up...!: its heal, its heal every second (for how long), and its ally's ATK and crit DMG more (and a share of hers); how long You Scare Me...! is hers after. */
const BEAR = { heal: playedHeal('priest', 5290, 176_824), each: playedHeal('priest', 542, 19_523), lasts: 15, atk: 0.2, critDamage: 0.5, share: 0.15, after: 5 };
/** You Scare Me...!: its blow; the boss's attack speed less (points) and more magic damage taken, for how long. */
const SCARE = { blow: played('priest', 4968, 163_739), slow: 250, takes: 1.25, lasts: 15 };
/** Leave Me Alone...!: its blow; the tornado for how long, a blow every so often, each stack's less ATK and more magic damage taken (up to so many, for how long). */
const ALONE = { blow: played('priest', 1355, 38_194), lasts: 6, every: 0.5, tick: played('priest', 555, 31_756), share: 0.045, most: 10, marked: 5 };
/** Together Forever...: her and her linked ally's ATK more (flat, its books' half again), penetration, mana every second, and more to Non-Hero enemies. */
const LINK = { atk: 28_967, books: 1.5, pen: 300, mana: 150, boss: 0.08 };
/** Her own perks' numbers: G-go Away!'s Light's Crit Resistance and Dark's healing; Bear Up's Light's least HP, Dark's allies; Leave Me Alone's Light's shorter cooldown (a share); Together's Light's more to Non-Hero enemies and Dark's less taken; Transcend 5's Dark's ATK for her linked ally, up to how many. */
const PERKS = { critTaken: 500, heals: 2, floor: 0.05, allies: 2, sooner: 0.3, boss: 0.12, taken: 0.2, dark: { atk: 0.03, most: 20 } };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): G-go Away!'s more DMG and the boss healed
 * less; Bear Up's more healing and crit DMG, and You Scare Me's more DMG and M.DEF less; Leave Me Alone's more stacks and
 * more magic damage taken for each blow; Together's more ATK and healing for her linked ally.
 */
const UT = {
  tarot: { dmg: 0.5, heals: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], lasts: 10 },
  scent: { heals: 0.5, critDamage: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5], dmg: 0.5, defense: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25] },
  protection: { most: 2, takes: [0.01, 0.012, 0.014, 0.017, 0.021, 0.025] },
  tear: { atk: 0.5, heals: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25] },
};

const art = skillArt('lavril');

const TOGETHER: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Together Forever...', about: `Passive. As the fight begins, a [Soul Link] with the ally with the highest ATK: both ATK +${num(Math.round(LINK.atk * LINK.books))}, +${LINK.pen} penetration, ${LINK.mana} mana every second, and ${pct(LINK.boss)} more to Non-Hero enemies.`, icon: '🧸', art: art(3) },
  words: `At the start of battle, forms a 'Soul Link' with the ally with the highest ATK.\nThis effect cannot be dispelled.\nSelf and the ally linked by 'Soul Link' gain ${num(Math.round(LINK.atk * LINK.books))} ATK and ${LINK.pen} DEF Penetration, deal ${pct(LINK.boss)} increased DMG to non-Hero enemies, and recover ${LINK.mana} Mana for 1 sec.`,
};
const LINKED: Buff = { name: 'Soul Link', about: 'ATK and penetration higher, mana every second, and more to Non-Hero enemies.', icon: '🧸', art: art(3) };
const BORNE: Buff = { name: 'Bear Up...!', about: 'Healed every second; ATK and crit DMG higher.', icon: '🧸', art: art(1) };
const DEVOTED: Buff = { name: 'Lovely Evil Spirit', about: 'ATK higher for each.', icon: '🧸', art: art(3) };
const VOID: Buff = { name: 'Void Soul', about: 'Untouched by the boss’s blows.', icon: '👻', art: { uw: 'lavril' } };

/** You Scare Me...!: in Bear Up...!'s place for a while after it. */
const YOU_SCARE_ME: Ability = {
  name: 'You Scare Me...!',
  about: `A great blow; the boss's attack speed ${SCARE.slow} lower and ${pct(SCARE.takes - 1)} more magic damage taken for ${SCARE.lasts} seconds.`,
  words: `Deals ${dmg('priest', SCARE.blow, bookDmg('lavril', 1))} M.DMG to the enemy and reduces its ATK Spd by ${SCARE.slow} for ${SCARE.lasts} sec while increasing M.DMG it takes by ${pct(SCARE.takes - 1)}.`,
  icon: '😱',
  art: art(1),
  move: 'scare',
  cooldown: 0,
  cost: 1,
};

export const LAVRIL: HeroDef = {
  id: 'lavril',
  name: 'Lavril',
  class: 'priest',
  skins: ['Lavril'],
  stats: { ...CLASS_STATS.priest, deals: 'magical' },
  abilities: [
    {
      name: 'G-go Away!',
      about: `A blow; for ${AWAY.lasts} seconds the boss takes ${pct(AWAY.takes - 1)} more magic damage and is likelier critically hit, and [Lavril's Ectoplasm] on it for ${AWAY.ectoLasts}: a blow every ${AWAY.every} seconds. Each heals every ally ${pct(AWAY.drain)} of it.`,
      words: `Deals ${dmg('priest', AWAY.blow, bookDmg('lavril', 0))} M.DMG to the target, increasing M.DMG it takes by ${pct(AWAY.takes - 1)} and reduces its All Crit Resistance by ${AWAY.critTaken} for ${AWAY.lasts} sec. The hit target becomes affected by 'Lavril's Ectoplasm' for ${AWAY.ectoLasts} sec, taking ${dmg('priest', AWAY.ecto, bookDmg('lavril', 0))} M.DMG every ${AWAY.every} sec. Dealing DMG with this Skill heals HP of all allies by ${pct(AWAY.drain)} of DMG dealt. When the target is killed, resets this Skill's Cooldown and recovers self's Mana by 1 orb.`,
      icon: '👻',
      art: art(0),
      move: 'shoo',
      cooldown: 10,
      cost: 2,
    },
    {
      name: 'Bear Up...!',
      about: `The ally with the highest ATK healed, then healed every second for ${BEAR.lasts} seconds, its ATK ${pct(BEAR.atk)} and crit DMG ${pct(BEAR.critDamage)} higher meanwhile. For ${BEAR.after} seconds after, You Scare Me...! in its place.`,
      words: `Heals HP of an ally with the highest ATK by ${healed('priest', BEAR.heal, bookHeal('lavril', 1))}, heals HP by ${healed('priest', BEAR.each, bookHeal('lavril', 1))} every 1 sec for ${BEAR.lasts} sec, and increases ATK and Crit DMG of the ally by ${pct(BEAR.atk)} and ${pct(BEAR.critDamage)} + ${pct(BEAR.share)} of Lavril's Crit DMG respectively for ${BEAR.lasts} sec. After Skill use, [You Scare Me...!] can be used within ${BEAR.after} sec.`,
      icon: '🧸',
      art: art(1),
      move: 'bear',
      cooldown: 24,
      cost: 4,
    },
    {
      name: 'Leave Me Alone...!',
      about: `A blow and a spectral tornado for ${ALONE.lasts} seconds; each of its blows leaves the boss hitting ${pct(ALONE.share)} less hard and taking ${pct(ALONE.share)} more magic damage (up to ${ALONE.most} times).`,
      words: `Swirls a Spectral Tornado within a wide frontal range of self, dealing ${dmg('priest', ALONE.tick, bookDmg('lavril', 2))} M.DMG every ${ALONE.every} sec over ${ALONE.lasts} sec. Each hit reduces ATK of the target by ${pct(ALONE.share)} for ${ALONE.marked} sec, and increases M.DMG it takes by ${pct(ALONE.share)}. This effect can be stacked up to max ${ALONE.most} times.`,
      icon: '🌪️',
      art: art(2),
      move: 'alone',
      cooldown: 25,
      cost: 4,
    },
  ],
  passive: TOGETHER,
  treasures: [
    treasure('Tarot Card of the Moon', (k) => ({
      words: `[G-go Away!] Increase DMG by ${pct(UT.tarot.dmg)} and reduces hit enemies' Heal Rate by ${pct(k(UT.tarot.heals))}.`,
      skill: { index: 0, dmg: 1 + UT.tarot.dmg, mark: { name: 'Tarot Card of the Moon', lasts: UT.tarot.lasts, heals: 1 - k(UT.tarot.heals) } },
    })),
    treasure('Fairy’s Scent', (k) => ({
      words: `[Bear Up...!] Increases Heal Rate by ${pct(UT.scent.heals)} and Crit DMG by ${pct(k(UT.scent.critDamage))}.\n[You Scare Me...!] Increases DMG by ${pct(UT.scent.dmg)} and reduces target's M.DEF by ${pct(k(UT.scent.defense))}.`,
      skill: { index: 1, heals: 1 + UT.scent.heals },
    })),
    treasure('Blessed Protection', (k) => ({
      words: `[Leave Me Alone...!] Increases the max stack of the effect by ${UT.protection.most} and each hit increases M.DMG the target takes by ${fine(k(UT.protection.takes))}.`,
    })),
    treasure('Tear of Soul', (k) => ({
      words: `[Together Forever…] Increases ATK boost by ${pct(UT.tear.atk)}. Allies under Soul Link have their Heal Rate increased by ${pct(k(UT.tear.heals))}.`,
    })),
  ],
  perks: {
    's1-light': { words: `Changes All Crit Resistance Reduction to ${PERKS.critTaken}.` },
    's1-dark': { words: `Increases Heal Rate by ${pct(PERKS.heals - 1)} when there is only 1 enemy.` },
    's2-light': { words: `[Bear Up...!] Keeps target's HP from going below ${pct(PERKS.floor)} for the duration of skill.\n[You Scare Me...!] Dispels positive effects from the target.` },
    's2-dark': { words: '[Bear Up...!] - Increases the number of targets by 1.\n[You Scare Me...!] - Increases the number of targets by 1.' },
    's3-light': said({ skill: { index: 2, cooldownShare: 1 - PERKS.sooner } }, ({ skill }) => `Reduces Cooldown by ${pct(1 - skill.cooldownShare)}.`),
    's3-dark': said({ skill: { index: 2, cost: -1 } }, ({ skill }) => `Reduces Mana Cost by ${-skill.cost}.`),
    's4-light': { words: `Changes the DMG Boost effect against Non-Hero enemies of Lavril and the ally bound to 'Soul Link' to ${pct(PERKS.boss)}.` },
    's4-dark': { words: `Reduces DMG taken of self and the ally bound to Soul Link by ${pct(PERKS.taken)}.` },
    't5-light': t5Light({ critDamage: 0.2 }, ({ critDamage }) => `Crit DMG +${pct(critDamage)}`),
    't5-dark': { words: `Upon taking a hit, increases ATK of the ally bound by Soul Link by ${pct(PERKS.dark.atk)}. This effect can be stacked up to max ${PERKS.dark.most} times.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /** Her [Soul Link]'s ally (null: not yet); [Lavril's Ectoplasm]: how long yet, toward its next blow; Bear Up's allies, how long yet, toward its next heal, and its while to have You Scare Me...! after; the tornado: how long yet, toward its next blow, and its stacks; Bear Up's own cooldown, kept apart; her unique weapon's wait; Transcend 5's Dark's stacks. */
    let linked: Fighter | null = null;
    let ecto = 0;
    let ectoTick = 0;
    let borne: Fighter[] = [];
    let bearLeft = 0;
    let bearTick = 0;
    let scaring = 0;
    let bearCooldown = 0;
    let tornado = 0;
    let tornadoTick = 0;
    let alone = 0;
    let voidWait = 0;
    let voidLeft = 0;
    let devoted = 0;
    /** Her allies on the field, standing and in the fight (her too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    const most = ALONE.most + (wearsTreasure(self, 2) ? UT.protection.most : 0);
    /** A blow of G-go Away!'s (or its Ectoplasm's): every ally healed a share of it (its Dark: twice, while only 1 enemy stands). */
    const drain = (amount: number): void => {
      const alive = fight.foe.hp > 0;
      fight.hit(self, amount);
      const single = self.perks.has('s1-dark') && fight.foes.filter((foe) => foe.hp > 0 && !foe.away).length === 1;
      for (const ally of allies()) fight.heal(ally, (amount / 1000) * self.stats.atk * AWAY.drain * (single ? PERKS.heals : 1), undefined, self);
      // (Beaten: its cooldown begun again, and a section of mana.)
      if (alive && fight.foe.hp <= 0) {
        self.cooldowns[0] = 0;
        self.mana = Math.min(MAX_MANA, self.mana + SECTION);
      }
    };

    return {
      lands: {
        attack() {
          fight.hit(self, fight.basic);
        },
        // A blow; the boss taking more magic damage and likelier critically hit (its Light: likelier); [Lavril's Ectoplasm] (tick).
        shoo() {
          drain(AWAY.blow);
          put(fight.foe.statuses, { name: 'G-go Away!', left: AWAY.lasts, takes: { magical: AWAY.takes }, critTaken: self.perks.has('s1-light') ? PERKS.critTaken : AWAY.critTaken, shown: 'curse' });
          ecto = AWAY.ectoLasts;
          ectoTick = 0;
        },
        // The ally (its Dark: 2) with the highest ATK healed, then every second, its ATK and crit DMG higher (its Light: its HP held up; Fairy's Scent: crit DMG); You Scare Me...! hers for a while.
        bear() {
          const others = allies().filter((ally) => ally !== self);
          const on = (others.length > 0 ? others : [self]).sort((a, b) => b.stats.atk - a.stats.atk).slice(0, self.perks.has('s2-dark') ? PERKS.allies : 1);
          fight.cue(self, 'bear', on);
          const critDamage = BEAR.critDamage + BEAR.share * self.stats.critDamage + fromTreasure(self, 1, UT.scent.critDamage);
          for (const ally of on) {
            fight.heal(ally, BEAR.heal, self);
            put(ally.statuses, { name: BORNE.name, left: BEAR.lasts, atk: BEAR.atk, critDamage, shown: BORNE });
          }
          borne = on;
          bearLeft = BEAR.lasts;
          bearTick = 0;
          scaring = BEAR.after;
        },
        // A great blow; the boss slowed and taking more magic damage (Fairy's Scent: harder, and its M.DEF lower; its Light: what helps the boss gone).
        scare() {
          fight.hit(self, SCARE.blow * (wearsTreasure(self, 1) ? 1 + UT.scent.dmg : 1));
          if (self.perks.has('s2-light')) {
            // (What helps the boss is dispelled: what has it deal more.)
            const on = fight.foe.statuses;
            for (let i = on.length - 1; i >= 0; i--) if ((on[i]?.deals ?? 1) > 1) on.splice(i, 1);
          }
          fight.slow(SCARE.slow, SCARE.lasts);
          put(fight.foe.statuses, { name: YOU_SCARE_ME.name, left: SCARE.lasts, takes: { magical: SCARE.takes }, ...(wearsTreasure(self, 1) && { defends: { magical: 1 - fromTreasure(self, 1, UT.scent.defense) } }), shown: 'curse' });
        },
        // A blow, and the tornado (tick).
        alone() {
          fight.hit(self, ALONE.blow);
          tornado = ALONE.lasts;
          tornadoTick = 0;
        },
      },
      // You Scare Me...! in Bear Up...!'s place while it is hers.
      slot: (index) => (index === 1 && scaring > 0 ? YOU_SCARE_ME : (self.abilities[index] ?? null)),
      used(index, ability) {
        if (ability.move === 'bear') bearCooldown = ability.cooldown;
        if (ability.move === 'scare') scaring = 0;
        // Her unique weapon: [Void Soul] a moment, no more often than every so often.
        if (tier !== null && voidWait <= 0) {
          voidWait = NEMECIA.every;
          voidLeft = atTier(NEMECIA.untouched, tier);
          put(self.statuses, { name: VOID.name, left: voidLeft, shown: VOID });
        }
        void index;
      },
      // Transcend 5's Dark: hurt, her linked ally's ATK higher (up to its most).
      hurt(who) {
        if (who !== self || !linked || !self.perks.has('t5-dark') || devoted >= PERKS.dark.most) return;
        devoted++;
        put(linked.statuses, { name: DEVOTED.name, left: Infinity, count: devoted, atk: PERKS.dark.atk * devoted, shown: DEVOTED });
      },
      tick(dt) {
        if (voidWait > 0) voidWait -= dt;
        if (voidLeft > 0) voidLeft -= dt;
        if (scaring > 0) scaring -= dt;
        // Bear Up...!'s own cooldown: its slot free while You Scare Me...! is in it, then what is left of its own.
        bearCooldown = Math.max(0, bearCooldown - dt);
        if (scaring > 0) self.cooldowns[1] = 0;
        else self.cooldowns[1] = Math.max(self.cooldowns[1] ?? 0, bearCooldown);
        // As the fight begins: the [Soul Link] (Tear of Soul: more ATK, and healing; its Light: more to Non-Hero enemies; its Dark: less taken; her unique weapon: her ally's crit DMG).
        if (!linked && fight.field.includes(self) && self.hp > 0) {
          const others = allies().filter((ally) => ally !== self);
          linked = others.sort((a, b) => b.stats.atk - a.stats.atk)[0] ?? self;
          const atk = LINK.atk * LINK.books * (wearsTreasure(self, 3) ? 1 + UT.tear.atk : 1);
          for (const one of linked === self ? [self] : [self, linked])
            put(one.statuses, {
              name: LINKED.name,
              left: Infinity,
              atk: atk / one.stats.atk,
              pen: LINK.pen,
              deals: 1 + (self.perks.has('s4-light') ? PERKS.boss : LINK.boss),
              ...(self.perks.has('s4-dark') && { takes: 1 - PERKS.taken }),
              ...(wearsTreasure(self, 3) && { heals: 1 + fromTreasure(self, 3, UT.tear.heals) }),
              ...(tier !== null && one !== self && { critDamage: atTier(NEMECIA.critDamage, tier) }),
              shown: LINKED,
            });
        }
        if (linked) for (const one of [self, linked]) if (one.hp > 0) one.mana = Math.min(MAX_MANA, one.mana + LINK.mana * dt);
        // [Lavril's Ectoplasm]: a blow every so often.
        if (ecto > 0) {
          ecto -= dt;
          ectoTick += dt;
          if (ectoTick >= AWAY.every) {
            ectoTick -= AWAY.every;
            drain(AWAY.ecto);
          }
        }
        // Bear Up...!: its allies healed every second (Fairy's Scent: its Heal Rate higher for these too; its Light: their HP held up meanwhile).
        if (bearLeft > 0) {
          bearLeft -= dt;
          bearTick += dt;
          if (bearTick >= 1) {
            bearTick -= 1;
            for (const ally of borne) fight.heal(ally, BEAR.each * (wearsTreasure(self, 1) ? 1 + UT.scent.heals : 1), self);
          }
          if (self.perks.has('s2-light')) for (const ally of borne) if (ally.hp > 0 && ally.hp < ally.stats.hp * PERKS.floor) ally.hp = ally.stats.hp * PERKS.floor;
        }
        // The tornado: a blow every so often, each the boss hitting less hard and taking more magic damage (Blessed Protection: more stacks, and more).
        if (tornado > 0) {
          tornado -= dt;
          tornadoTick += dt;
          if (tornadoTick >= ALONE.every) {
            tornadoTick -= ALONE.every;
            fight.hit(self, ALONE.tick);
            alone = Math.min(most, alone + 1);
            const more = fromTreasure(self, 2, UT.protection.takes);
            put(fight.foe.statuses, { name: 'Leave Me Alone...!', left: ALONE.marked, count: alone, deals: 1 - ALONE.share * alone, takes: { magical: 1 + (ALONE.share + more) * alone }, shown: 'curse' });
          }
        } else if (!fight.foe.statuses.some((status) => status.name === 'Leave Me Alone...!')) alone = 0;
      },
      // [Void Soul]: the boss's blows don't touch her.
      untouched: () => voidLeft > 0,
      buffs: () => (tier !== null ? [NEMECIA_UP] : []),
      lit: () => scaring > 0 || tornado > 0,
    };
  },
};
