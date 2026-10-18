import { away, put } from '../combat/status';
import { t5Light } from '../perks';
import { MAX_MANA, SECTION } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { pct, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { atTier, STOSMOS, STOSMOS_UP } from '../unique';
import { type Ability, attackStarts, bookDmg, bookHeal, CLASS_STATS, dmg, healed, type HeroDef, lineOf, type Passive, played, playedHeal } from './kit';

/*
 * Estelle's skills, as King's Raid's playtest has them (stats/estelle.md: how hard each hits and heals at its level 90, and
 * every number here, are its; its words are its own). She is an archer, the Adventure Guide. Each of her skills' effects
 * lasts longer while she is in [Adventure Guide].
 * - Blow, Tailwind!!: what the boss left on every ally cleared, every ally healed, and [Tailwind] on them for a while (immune
 *   to CC). It turns into Blow, Headwind!!: a blow, and [Headwind] on the boss (more physical damage taken). And back.
 * - Here's a Wake-Up Call!!: [Cheer] on the ally with the highest ATK (crit DMG higher); then a blow on the boss and
 *   [Discouragement] on it (ATK lower).
 * - It's Cheering Time!!: for a while every ally quicker and taking less physical damage, healed every second.
 * Her passive, I'm the Adventure Guide!!: her attack speed higher (its books' more); each part of her attack a stack of
 * [Accompany], each skill five; at 30, every ally's mana, and [Adventure Guide] for a while.
 * Her unique weapon (../unique.ts) is worked here too: [Adventure Guide] the longer, and every ally's ATK higher meanwhile.
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/estelle.ts).
 *
 * Her own perks (../perks.ts) are King's Raid's. Wake-Up Call's Dark (what helps the boss gone), Smile Badge's Silence and
 * Second Homeland's mana off the boss do nothing here. Transcend 5's Dark's mana for each attack is every ally's mana filling
 * faster here. Blow, Tailwind!! and Blow, Headwind!! have cooldowns of their own (King's Raid's are skills apart).
 */
/** Blow, Tailwind!!: its heal; [Tailwind] for how long. */
const TAILWIND = { heal: playedHeal('archer', 2433, 86_483), lasts: 10 };
/** Blow, Headwind!!: its blow; [Headwind]'s more physical damage taken, for how long. */
const HEADWIND = { blow: played('archer', 1945, 67_595), takes: 1.25, lasts: 10 };
/** Here's a Wake-Up Call!!: [Cheer]'s crit DMG; its blow, and [Discouragement]'s ATK less; both for how long. */
const WAKE = { critDamage: 0.5, blow: played('archer', 2572, 91_844), weaker: 0.7, lasts: 10 };
/** It's Cheering Time!!: for how long; attack speed, physical damage less, and its heal every second. */
const CHEER = { lasts: 10, speed: 200, taken: 0.8, heal: playedHeal('archer', 598, 21_026) };
/** I'm the Adventure Guide!!: her attack speed (its books' more); [Accompany] for each part of her attack and each skill, how many it takes; the mana it gives every ally; [Adventure Guide] for how long, and how much longer each effect lasts meanwhile. */
const GUIDE = { speed: 350, attack: 1, skill: 5, needs: 30, mana: SECTION, lasts: 15, longer: 5 };
/** Her own perks' numbers: Tailwind's Light's P.Block, Headwind's Dark's P.DEF less; Wake-Up's Light's allies; Cheering's Light's and Dark's more to Non-Hero enemies; Guide's Light's mana and Dark's more taken, for how long; Transcend 5's Dark's mana. */
const PERKS = { block: 300, defense: 0.7, allies: 2, boss: 0.15, mana: 2 * SECTION, takes: 1.2, takesLasts: 10, dark: 1.3 };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Tailwind's lower cost and every ally's dodge,
 * and Headwind's less DMG from the boss; Wake-Up's shorter cooldown and [Cheer]'s more to bosses; Cheering's more healing;
 * Guide's (nothing the fight has).
 */
const UT = {
  badge: { dodge: [100, 120, 140, 170, 210, 250], weaker: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25] },
  memoir: { cooldown: 6, boss: [0.06, 0.072, 0.086, 0.104, 0.125, 0.15] },
  whistle: { heals: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
  homeland: { chance: [0.2, 0.24, 0.29, 0.35, 0.42, 0.5] },
};

const art = skillArt('estelle');

const GUIDE_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'I’m the Adventure Guide!!', about: `Passive. +${GUIDE.speed} attack speed. Each part of her attack a stack of [Accompany], each skill ${GUIDE.skill}; at ${GUIDE.needs}, every ally ${GUIDE.mana / SECTION} section of mana, and [Adventure Guide] for ${GUIDE.lasts} seconds: her skills' effects last ${GUIDE.longer} seconds longer.`, icon: '🧭', art: art(3) },
  words: `Increases own ATK Spd by ${GUIDE.speed}. Normal attacks grant ${GUIDE.attack} stack of [Accompany], and Skill attacks grant ${GUIDE.skill} stacks. Upon gaining ${GUIDE.needs} stacks of [Accompany], Estelle consumes all stacks to recover ${GUIDE.mana / SECTION} orb of Mana of all allies and enter into [Adventure Guide] state for ${GUIDE.lasts} sec.`,
};
const TAILED: Buff = { name: 'Tailwind', about: 'Immune to CC.', icon: '🍃', art: art(0) };
const CHEERED: Buff = { name: 'Cheer', about: 'Crit DMG higher.', icon: '📣', art: art(1) };
const CHEERING: Buff = { name: 'It’s Cheering Time!!', about: 'Quicker, taking less physical damage, and healed every second.', icon: '🎉', art: art(2) };
const ACCOMPANY: Buff = { name: 'Accompany', about: `At ${GUIDE.needs}: [Adventure Guide].`, icon: '🧭', art: art(3) };
const GUIDING: Buff = { name: 'Adventure Guide', about: 'Her skills’ effects last longer.', icon: '🧭', art: art(3) };
const FILLED: Buff = { name: 'Adventurer’s Spirit', about: 'Mana fills faster.', icon: '🧭', art: art(3) };

/** Blow, Headwind!!: in Blow, Tailwind!!'s place after it, and back. */
const BLOW_HEADWIND: Ability = {
  name: 'Blow, Headwind!!',
  about: `A blow; [Headwind] on the boss for ${HEADWIND.lasts} seconds (${pct(HEADWIND.takes - 1)} more physical damage taken). Turns back into Blow, Tailwind!!.`,
  words: `Deals ${dmg('archer', HEADWIND.blow, bookDmg('estelle', 0))} P.DMG to all enemies and inflicts [Headwind] that lasts for ${HEADWIND.lasts} sec. For the duration of [Headwind], increases P.DMG the targets take by ${pct(HEADWIND.takes - 1)}. After use, changes the Skill to [Blow, Tailwind!!].\nWhen used during [Adventure Guide] state, the duration of [Headwind] increases by ${GUIDE.longer} sec.`,
  icon: '🌬️',
  art: art(0),
  move: 'headwind',
  cooldown: 14,
  cost: 2,
};

export const ESTELLE: HeroDef = {
  id: 'estelle',
  name: 'Estelle',
  class: 'archer',
  skins: ['Estelle'],
  // An archer: her passive's attack speed.
  stats: { ...CLASS_STATS.archer, deals: 'physical', speed: CLASS_STATS.archer.speed + GUIDE.speed },
  abilities: [
    {
      name: 'Blow, Tailwind!!',
      auto: { heals: true },
      about: `What the boss left on every ally cleared, every ally healed, and [Tailwind] for ${TAILWIND.lasts} seconds (immune to CC). Turns into Blow, Headwind!!.`,
      words: `Dispels negative effects from all allies, heals their HP by ${healed('archer', TAILWIND.heal, bookHeal('estelle', 0))}, and grants [Tailwind] that lasts for ${TAILWIND.lasts} sec. For the duration of [Tailwind], the affected ally gains immunity to CC. After use, changes the Skill to [Blow, Headwind!!].\nWhen used during [Adventure Guide] state, the duration of [Tailwind] increases by ${GUIDE.longer} sec.`,
      icon: '🍃',
      art: art(0),
      move: 'tailwind',
      cooldown: 14,
      cost: 3,
    },
    {
      name: 'Here’s a Wake-Up Call!!',
      about: `[Cheer] on the ally with the highest ATK (crit DMG ${pct(WAKE.critDamage)} higher); a blow on the boss, and [Discouragement] (its ATK ${pct(1 - WAKE.weaker)} lower); both for ${WAKE.lasts} seconds.`,
      words: `Grants [Cheer] that lasts for ${WAKE.lasts} sec to 1 ally with the highest ATK, deals ${dmg('archer', WAKE.blow, bookDmg('estelle', 1))} P.DMG to 1 enemy with the highest ATK, and inflicts [Discouragement] that lasts for ${WAKE.lasts} sec. For the duration of [Cheer], increases the target's Crit DMG by ${pct(WAKE.critDamage)}. For the duration of [Discouragement], reduces the target's ATK by ${pct(1 - WAKE.weaker)}.\nWhen used during [Adventure Guide] state, the duration of [Cheer] and [Discouragement] increases by ${GUIDE.longer} sec.`,
      icon: '📣',
      art: art(1),
      move: 'wakeup',
      cooldown: 20,
      cost: 3,
    },
    {
      name: 'It’s Cheering Time!!',
      auto: { keeps: CHEERING.name },
      about: `For ${CHEER.lasts} seconds every ally +${CHEER.speed} attack speed, ${pct(1 - CHEER.taken)} less physical damage taken, and healed every second.`,
      words: `For ${CHEER.lasts} sec, increases ATK Spd of all allies by ${CHEER.speed}, reduces P.DMG they take by ${pct(1 - CHEER.taken)}, and heals their HP by ${healed('archer', CHEER.heal, bookHeal('estelle', 2))} every sec.\nWhen used in [Adventure Guide] state, the duration of the effect increases by ${GUIDE.longer} sec.`,
      icon: '🎉',
      art: art(2),
      move: 'cheer',
      cooldown: 18,
      cost: 3,
    },
  ],
  passive: GUIDE_SHOWN,
  treasures: [
    treasure('Smile Badge', (k) => ({
      words: `[Blow, Tailwind!!] Reduces Mana Cost by 1, and [Tailwind] additionally increases All Dodge Chance of all allies by ${k(UT.badge.dodge)}. [Blow, Headwind!!] Silences the hit targets for 3 sec, and [Headwind] additionally reduces the target's DMG dealt to heroes by ${pct(k(UT.badge.weaker))}.`,
      skill: { index: 0, cost: -1 },
    })),
    treasure('Estelle’s Trip Memoir VI', (k) => ({
      words: `[Here's a Wake-Up Call!!] Reduces Cooldown by ${UT.memoir.cooldown} sec, and [Cheer] additionally increases DMG dealt to Bosses by ${pct(k(UT.memoir.boss))}.`,
      skill: { index: 1, cooldown: -UT.memoir.cooldown },
    })),
    treasure('Whistle of Hundred Tones', (k) => ({
      words: `[It's Cheering Time!!] Increases Heal Rate by ${pct(k(UT.whistle.heals))}, and all effects become irremovable.`,
      skill: { index: 2, heals: 1 + k(UT.whistle.heals) },
    })),
    treasure('Second Homeland', (k) => ({
      words: `[I'm the Adventure Guide!!] [Adventure Guide] becomes irremovable. Normal attacks have a ${pct(k(UT.homeland.chance))} chance of reducing the target's Mana by 400 for the duration of Skill. This effect is activated only once every 3 sec.`,
    })),
  ],
  perks: {
    's1-light': { words: `Increases the target's P.Block Chance by ${PERKS.block} for the duration of [Tailwind].` },
    's1-dark': { words: `Reduces the target's P.DEF by ${pct(1 - PERKS.defense)} for the duration of [Headwind].` },
    's2-light': { words: `Increases the number of targets for [Cheer] by ${PERKS.allies - 1}.` },
    's2-dark': { words: 'Upon activation of [Discouragement], dispels positive effects from the target.' },
    's3-light': { words: `Increases melee Heroes' DMG dealt to Non-Hero enemies by ${pct(PERKS.boss)} for the duration of Skill.` },
    's3-dark': { words: `Increases ranged Heroes' DMG dealt to Non-Hero enemies by ${pct(PERKS.boss)} for the duration of Skill.` },
    's4-light': { words: `Increases Mana Recovery by ${pct(PERKS.mana / GUIDE.mana - 1)}.` },
    's4-dark': { words: `Dealing normal attacks during [Adventure Guide] state increases P.DMG the target takes by ${pct(PERKS.takes - 1)} for ${PERKS.takesLasts} sec.` },
    't5-light': t5Light({ speed: 100 }, ({ speed }) => `ATK.Spd +${speed}`),
    't5-dark': { words: `Increases Mana Recovery per attack of all allies by ${pct(PERKS.dark - 1)}. This effect is irremovable.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    const starts = attackStarts('estelle');
    /** Her first skill turned into Blow, Headwind!!, and whether it turns as the next moment comes; each's own cooldown; [Accompany]'s stacks; [Adventure Guide]: how long yet; It's Cheering Time!!: how long yet, toward its next heal. */
    let headwind = false;
    let turning = false;
    let tailCooldown = 0;
    let headCooldown = 0;
    let accompany = 0;
    let guide = 0;
    let cheering = 0;
    let cheerTick = 0;
    let filled = false;
    /** Her allies on the field, standing and in the fight (her too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** How long an effect of hers lasts: the longer in [Adventure Guide]. */
    const lasting = (base: number): number => base + (guide > 0 ? GUIDE.longer : 0);
    /** [Accompany] (each skill, each part of her attack); at its most, every ally's mana (its Light: more), and [Adventure Guide] (her unique weapon: longer, and every ally's ATK meanwhile). */
    const accompanied = (by: number): void => {
      accompany += by;
      if (accompany < GUIDE.needs) {
        put(self.statuses, { name: ACCOMPANY.name, left: Infinity, count: accompany, shown: ACCOMPANY });
        return;
      }
      accompany = 0;
      self.statuses = self.statuses.filter((status) => status.name !== ACCOMPANY.name);
      const mana = self.perks.has('s4-light') ? PERKS.mana : GUIDE.mana;
      for (const ally of allies()) ally.mana = Math.min(MAX_MANA, ally.mana + mana);
      guide = GUIDE.lasts + (tier !== null ? atTier(STOSMOS.longer, tier) : 0);
      put(self.statuses, { name: GUIDING.name, left: guide, shown: GUIDING });
      if (tier !== null) put(fight.party, { name: STOSMOS_UP.name, left: guide, atk: atTier(STOSMOS.atk, tier), shown: STOSMOS_UP });
    };

    return {
      lands: {
        // Her attack; each part of it a stack of [Accompany] (Guide's Dark: in [Adventure Guide], the boss taking more physical damage).
        attack(part) {
          fight.hit(self, fight.basic);
          if (!starts.has(part)) return;
          accompanied(GUIDE.attack);
          if (guide > 0 && self.perks.has('s4-dark')) put(fight.foe.statuses, { name: 'Adventure Guide', left: PERKS.takesLasts, takes: { physical: PERKS.takes }, shown: 'curse' });
        },
        // What the boss left on every ally cleared, every ally healed, and [Tailwind] (its Light: P.Block; Smile Badge: dodge).
        tailwind() {
          const on = allies();
          fight.cue(self, 'tailwind', on);
          for (const ally of on) {
            ally.statuses = ally.statuses.filter((status) => status.shown.harmful !== true || status.binds === true);
            fight.heal(ally, TAILWIND.heal, self);
            const dodge = fromTreasure(self, 0, UT.badge.dodge);
            put(ally.statuses, {
              name: TAILED.name,
              left: lasting(TAILWIND.lasts),
              guards: true,
              ...(self.perks.has('s1-light') && { blocks: { physical: PERKS.block } }),
              ...(dodge > 0 && { dodges: { physical: dodge, magical: dodge } }),
              shown: TAILED,
            });
          }
        },
        // A blow, and [Headwind] (its Dark: the boss's P.DEF lower; Smile Badge: the boss hitting less hard).
        headwind() {
          fight.hit(self, HEADWIND.blow);
          put(fight.foe.statuses, {
            name: 'Headwind',
            left: lasting(HEADWIND.lasts),
            takes: { physical: HEADWIND.takes },
            ...(self.perks.has('s1-dark') && { defends: { physical: PERKS.defense } }),
            ...(wearsTreasure(self, 0) && { deals: 1 - fromTreasure(self, 0, UT.badge.weaker) }),
            shown: 'curse',
          });
        },
        // [Cheer] on the ally (its Light: 2) with the highest ATK (Trip Memoir: more to bosses); then a blow and [Discouragement].
        wakeup(part) {
          if (part === 0) {
            const others = allies().filter((ally) => ally !== self);
            const on = (others.length > 0 ? others : [self]).sort((a, b) => b.stats.atk - a.stats.atk).slice(0, self.perks.has('s2-light') ? PERKS.allies : 1);
            fight.cue(self, 'wakeup', on);
            for (const ally of on) put(ally.statuses, { name: CHEERED.name, left: lasting(WAKE.lasts), critDamage: WAKE.critDamage, ...(wearsTreasure(self, 1) && { deals: 1 + fromTreasure(self, 1, UT.memoir.boss) }), shown: CHEERED });
            return;
          }
          fight.hit(self, WAKE.blow);
          put(fight.foe.statuses, { name: 'Discouragement', left: lasting(WAKE.lasts), deals: WAKE.weaker, shown: 'curse' });
        },
        // Every ally quicker and taking less (its Light: the melee more to Non-Hero enemies; its Dark: the ranged); healed every second (tick).
        cheer() {
          cheering = lasting(CHEER.lasts);
          cheerTick = 0;
          const on = allies();
          fight.cue(self, 'cheer', on);
          for (const ally of on) {
            const melee = lineOf(ally.def) === 'front';
            const boss = (melee && self.perks.has('s3-light')) || (!melee && self.perks.has('s3-dark'));
            put(ally.statuses, { name: CHEERING.name, left: cheering, speed: CHEER.speed, takes: { physical: CHEER.taken }, ...(boss && { deals: 1 + PERKS.boss }), shown: CHEERING });
          }
        },
      },
      // Blow, Headwind!! in Blow, Tailwind!!'s place while it is turned.
      slot: (index) => (index === 0 && headwind ? BLOW_HEADWIND : (self.abilities[index] ?? null)),
      used(index) {
        accompanied(GUIDE.skill);
        if (index === 0) turning = true;
      },
      tick(dt) {
        // Transcend 5's Dark: every ally's mana the faster, for good.
        if (!filled && self.perks.has('t5-dark') && fight.field.includes(self)) {
          filled = true;
          for (const ally of fight.fighters) put(ally.statuses, { name: FILLED.name, left: Infinity, mana: PERKS.dark, shown: FILLED });
        }
        // Her first skill turned (as the next moment comes, its cooldown begun): each form's cooldown its own.
        if (turning) {
          turning = false;
          if (headwind) headCooldown = self.cooldowns[0] ?? 0;
          else tailCooldown = self.cooldowns[0] ?? 0;
          headwind = !headwind;
          self.cooldowns[0] = headwind ? headCooldown : tailCooldown;
        }
        if (headwind) tailCooldown = Math.max(0, tailCooldown - dt);
        else headCooldown = Math.max(0, headCooldown - dt);
        if (guide > 0) guide -= dt;
        // It's Cheering Time!!: every ally healed every second.
        if (cheering > 0) {
          cheering -= dt;
          cheerTick += dt;
          if (cheerTick >= 1) {
            cheerTick -= 1;
            for (const ally of allies()) fight.heal(ally, CHEER.heal, self);
          }
        }
      },
      lit: () => guide > 0,
    };
  },
};
