import { away, put } from '../combat/status';
import { t5Light } from '../perks';
import { MAX_MANA } from '../rules';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { fine, pct, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { atTier, EZAIAS, EZAIAS_UP } from '../unique';
import { type Ability, bookDmg, bookHeal, CLASS_STATS, dmg, healed, type HeroDef, type Passive, played, playedHeal } from './kit';

/*
 * Isaiah's skills, as King's Raid's playtest has them (stats/isaiah.md: how hard each hits and heals at its level 90, and
 * every number here, are its; its words are its own). She is a priest whose blows are magical, the Shepherd of Chaos; each
 * of her skills costs her a share of her current HP.
 * - Light of Salvation: what the boss left on every ally cleared, a shield on each (a share of her max HP) and every other
 *   healed; while the shield holds, healed every second and immune to CC. A blow on the boss (its silence nothing here).
 * - Touch of the Goddess - Mercy: a blow from behind the boss, and [Touch of Mercy] on it a while: hitting less hard, and
 *   slowed. Used, its slot holds Touch of the Goddess - Embrace: [Touch of Embrace] on the ally with the highest ATK a
 *   while, healed every 1.5 seconds and its ATK higher by a share of her max HP; used, Mercy again.
 * - Offering of Atonement: sealed till she has 4 [Sin]. Every ally untouched a moment, and the boss given nothing that
 *   helps it; then the [Field of Atonement] a while: every 2 seconds every ally healed (a share of her max HP and more) and
 *   cleared, the boss struck and taking more. Used, her [Sin] are gone and it is sealed again.
 * Her passive, Baptism of the Goddess: as the fight begins, she deals half and takes more; every other ally deals more and
 *   takes less; the ally with the highest ATK's ATK and DEF higher (its books' 15% more). Light of Salvation and either Touch
 *   gain her a [Sin] (up to 4: then [Path of Salvation], Offering of Atonement hers).
 * Her unique weapon (../unique.ts) is worked here too: each skill she uses heals her a share of her max HP over 4 seconds,
 * and each of her blows leaves the boss taking more for a while.
 * What is drawn for each, and what her body does, are King's Raid's own (../../assets/heroes/isaiah.ts).
 *
 * Her own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Light of
 * Salvation's silence (and Heretical Rosary's longer one) and Sculpture of Chaos's mana off the boss do nothing here (the
 * boss casts what it casts; it has no mana). Every ally is within her skills' reach and her field, and the boss too: the
 * field is small. Offering of Atonement's timing is her own (timing): the moves' has its last part unread.
 */
/** Light of Salvation: its blow; the shield (a share of her max HP) for how long; every other ally's heal (a share of her max HP, and more), and while the shield holds, its heal every second for how long; the share of her current HP it costs. */
const SALVATION = { blow: played('priest', 1945, 67_595), shield: 0.07, lasts: 6, hp: 0.05, heal: playedHeal('priest', 2163, 75_110), each: playedHeal('priest', 900, 38_628), healing: 5, cost: 0.2 };
/** Touch of the Goddess - Mercy: its blow; [Touch of Mercy] for how long: the boss's ATK less, and its attack speed (points); the share of her current HP it costs. */
const MERCY = { blow: played('priest', 2780, 103_860), lasts: 15, weaker: 0.7, slow: 300, cost: 0.15 };
/** Touch of the Goddess - Embrace: [Touch of Embrace] for how long, its heal every so often; its ATK (a share of her max HP); the share of her current HP it costs. */
const EMBRACE = { lasts: 15, heal: playedHeal('priest', 640, 25_752), every: 1.5, atk: 0.001, cost: 0.15 };
/** Offering of Atonement: how long every ally is untouched and the boss given nothing that helps it; the field for how long, every so often: its heal (a share of her max HP, and more) and its blow, the boss's more taken for how long; the share of her current HP it costs. */
const ATONEMENT = { untouched: 3, lasts: 12, every: 2, hp: 0.01, heal: playedHeal('priest', 1000, 42_920), blow: played('priest', 1000, 40_774), takes: 1.2, marked: 8, cost: 0.5 };
/** Baptism of the Goddess: her own DMG and DMG taken; every other ally's DMG and DMG taken; [Baptism of the Goddess]'s ATK and DEF more (10%, and its books' 15%); the [Sin] that open Offering of Atonement. */
const BAPTISM = { deals: 0.5, taken: 1.25, allies: { deals: 1.1, taken: 0.9 }, atk: 0.25, defense: 0.25, sins: 4 };
/** Her own perks' numbers: Salvation's Light's healing more, and Dark's more taken, for how long; the field's Light's more to bosses, for how long, and Dark's healing and DMG more; Baptism's Light's crit DMG; Transcend 5's Dark's Tough and healing more. */
const PERKS = { heals: 0.4, takes: 1.2, takesLasts: 12, boss: 0.1, bossLasts: 8, field: 1.3, critDamage: 0.5, dark: { tough: 150, heals: 0.15 } };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts; King's Raid's own): Salvation's longer shield; Mercy's more
 * taken, and Embrace's attack speed; Atonement's longer untouched and the field's mana every 2 seconds; Baptism's allies
 * more and their more to Non-Hero enemies.
 */
const UT = {
  rosary: { longer: [1.2, 1.4, 1.7, 2.1, 2.5, 3] },
  flame: { takes: [0.08, 0.096, 0.112, 0.136, 0.168, 0.2], speed: 300 },
  sculpture: { longer: 1, mana: [160, 190, 230, 280, 340, 400] },
  book: { allies: 2, boss: [0.03, 0.04, 0.05, 0.06, 0.07, 0.08] },
};

const art = skillArt('isaiah');

const BAPTISM_SHOWN: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Baptism of the Goddess',
    about: `Passive. As the fight begins: she deals ${pct(1 - BAPTISM.deals)} less and takes ${pct(BAPTISM.taken - 1)} more; every other ally deals ${pct(BAPTISM.allies.deals - 1)} more and takes ${pct(1 - BAPTISM.allies.taken)} less; the ally with the highest ATK +${pct(BAPTISM.atk)} ATK and DEF. Each of her other skills a [Sin]: at ${BAPTISM.sins}, Offering of Atonement hers.`,
    icon: '⛪',
    art: art(3),
  },
  words: `At the beginning of the first battle, reduces own DMG dealt to enemies by ${pct(1 - BAPTISM.deals)} and increases DMG taken from enemies by ${pct(BAPTISM.taken - 1)}. Increases DMG dealt to enemies of allies excluding self by ${pct(BAPTISM.allies.deals - 1)} and reduces DMG the allies take from enemies by ${pct(1 - BAPTISM.allies.taken)}. Additionally, grants [Baptism of the Goddess] effect to an ally with the highest ATK, increasing its ATK by ${pct(BAPTISM.atk)} and DEF by ${pct(BAPTISM.defense)}.\nAt ${BAPTISM.sins} stacks of *[Sin]*, enters into the irremovable state of [Path of Salvation]. During [Path of Salvation], Isaiah does not gain any *[Sin]* stacks and [Offering of Atonement] becomes available.`,
};
const SALVATION_SHIELD: Buff = { name: 'Light of Salvation', about: 'Shielded: healed every second, and immune to CC.', icon: '✨', art: art(0) };
const EMBRACED: Buff = { name: 'Touch of Embrace', about: 'Healed every 1.5 seconds, and ATK higher.', icon: '🤍', art: art(1) };
const ATONED: Buff = { name: 'Offering of Atonement', about: 'Untouched by the boss’s blows.', icon: '🕯️', art: art(2) };
const FIELD_BOSS: Buff = { name: 'Field of Atonement', about: 'Deals more to bosses.', icon: '🕯️', art: art(2) };
const BAPTIZED: Buff = { name: 'Baptism of the Goddess', about: 'ATK and DEF higher.', icon: '⛪', art: art(3) };
const BLESSED: Buff = { name: 'Baptism of the Goddess (allies)', about: 'Deals more, and takes less.', icon: '⛪', art: art(3) };
const PICTURED: Buff = { name: 'Picture Book About Laws of Chaos', about: 'Deals more to Non-Hero enemies.', icon: '📖', art: art(3) };
const HUMBLED: Buff = { name: 'Shepherd of Chaos', about: 'Deals less, and takes more.', icon: '⛪', art: art(3) };
const TOUGHENED: Buff = { name: 'Isaiah', about: 'Takes less.', icon: '⛪', art: art(3) };
const SIN: Buff = { name: 'Sin', about: `Her skills’ [Sin]: at ${BAPTISM.sins}, [Path of Salvation] (Offering of Atonement hers).`, icon: '⛓️', art: art(3) };

/** Touch of the Goddess - Embrace, in Mercy's slot once Mercy is used (and Mercy again once it is). */
const EMBRACE_SKILL: Ability = {
  name: 'Touch of the Goddess - Embrace',
  about: `[Touch of Embrace] on the ally with the highest ATK for ${EMBRACE.lasts} seconds: healed every ${EMBRACE.every} seconds, and its ATK higher by ${fine(EMBRACE.atk)} of her max HP. Costs ${pct(EMBRACE.cost)} of her current HP and gains her a [Sin]; then Mercy again.`,
  words: `Moves to the back of the ally with the highest ATK to leave [Touch of Embrace] for ${EMBRACE.lasts} sec. [Touch of Embrace] heals the target's HP by a total of ${healed('priest', EMBRACE.heal * (EMBRACE.lasts / EMBRACE.every), bookHeal('isaiah', 1))} and increases the target's ATK equal to ${fine(EMBRACE.atk)} of Isaiah's Max HP.\nUpon use, Isaiah consumes ${pct(EMBRACE.cost)} of self's current HP and gains an irremovable stack of *[Sin]*.`,
  icon: '🤍',
  art: art(1),
  move: 'embrace',
  cooldown: 12,
  cost: 3,
};

export const ISAIAH: HeroDef = {
  id: 'isaiah',
  name: 'Isaiah',
  class: 'priest',
  skins: ['Isaiah', 'Isaiah_Advance', 'Isaiah_Fallen', 'Isaiah_Summer'],
  stats: { ...CLASS_STATS.priest, deals: 'magical' },
  abilities: [
    {
      name: 'Light of Salvation',
      about: `What the boss left on every ally cleared, a shield of ${pct(SALVATION.shield)} of her max HP on each for ${SALVATION.lasts} seconds, and every other healed; while it holds, healed every second and immune to CC. A blow on the boss. Costs ${pct(SALVATION.cost)} of her current HP and gains her a [Sin].`,
      words: `Dispels negative effects from self upon use. Dispels negative effects from allies within a wide range of self, granting them a Shield that absorbs DMG equal to ${pct(SALVATION.shield)} of Isaiah's Max HP for ${SALVATION.lasts} sec and healing HP of allies excluding self equal to ${fine(SALVATION.hp * bookHeal('isaiah', 0))} of Isaiah's Max HP + ${healed('priest', SALVATION.heal, bookHeal('isaiah', 0))}. While the Shield is active, heals ${healed('priest', SALVATION.each, bookHeal('isaiah', 0))} HP every sec and gains immunity to CC. To enemies, deals ${dmg('priest', SALVATION.blow, bookDmg('isaiah', 0))} M.DMG and silences the hit target for 3 sec.\nUpon use, Isaiah consumes ${pct(SALVATION.cost)} of self's current HP and gains an irremovable stack of *[Sin]*.`,
      icon: '✨',
      art: art(0),
      move: 'salvation',
      cooldown: 15,
      cost: 3,
    },
    {
      name: 'Touch of the Goddess - Mercy',
      about: `A blow from behind the boss, and [Touch of Mercy] on it for ${MERCY.lasts} seconds: hitting ${pct(1 - MERCY.weaker)} less hard, its attack speed ${MERCY.slow} lower. Costs ${pct(MERCY.cost)} of her current HP and gains her a [Sin]; then Embrace in its place.`,
      words: `Moves to the back of the enemy with the highest ATK to deal ${dmg('priest', MERCY.blow, bookDmg('isaiah', 1))} M.DMG and leave [Touch of Mercy] for ${MERCY.lasts} sec. [Touch of Mercy] reduces the target's ATK by ${pct(1 - MERCY.weaker)} and ATK Spd by ${MERCY.slow}.\nUpon use, Isaiah consumes ${pct(MERCY.cost)} of self's current HP and gains an irremovable stack of *[Sin]*.`,
      icon: '🖤',
      art: art(1),
      move: 'mercy',
      cooldown: 12,
      cost: 2,
    },
    {
      name: 'Offering of Atonement',
      about: `Once she has ${BAPTISM.sins} [Sin]: every ally untouched for ${ATONEMENT.untouched} seconds and the boss given nothing that helps it; then a field for ${ATONEMENT.lasts} seconds: every ${ATONEMENT.every} seconds every ally healed and cleared, the boss struck and taking ${pct(ATONEMENT.takes - 1)} more for ${ATONEMENT.marked}. Costs ${pct(ATONEMENT.cost)} of her current HP; her [Sin] gone.`,
      words: `Dispels all negative effects from self upon use. Grants Invincibility to allies within a wide range of self for ${ATONEMENT.untouched} sec and prevents enemies from receiving positive effects for ${ATONEMENT.untouched} sec. Afterward, creates [Field of Atonement] that lasts for ${ATONEMENT.lasts} sec at self's location. Every ${ATONEMENT.every} sec, heals HP of allies within [Field of Atonement] equal to ${fine(ATONEMENT.hp * bookHeal('isaiah', 2))} of Isaiah's Max HP + ${healed('priest', ATONEMENT.heal, bookHeal('isaiah', 2))} and dispels negative effects. Enemies within the area take ${dmg('priest', ATONEMENT.blow, bookDmg('isaiah', 2))} M.DMG every ${ATONEMENT.every} sec and the hit target takes ${pct(ATONEMENT.takes - 1)} increased All DMG for ${ATONEMENT.marked} sec.\nUpon use, Isaiah consumes ${pct(ATONEMENT.cost)} of self's current HP.`,
      tag: `${BAPTISM.sins} [Sin]`,
      icon: '🕯️',
      art: art(2),
      move: 'atonement',
      cooldown: 0,
      cost: 0,
    },
  ],
  passive: BAPTISM_SHOWN,
  treasures: [
    treasure('Heretical Rosary', (k) => ({
      words: `[Light of Salvation] Increases the duration of Shield by ${k(UT.rosary.longer)} sec and Silence by 1 sec.`,
    })),
    treasure('Flame of Benevolence', (k) => ({
      words: `[Touch of the Goddess - Mercy] The target hit by [Touch of Mercy] takes ${fine(k(UT.flame.takes))} increased All DMG for ${MERCY.lasts} sec. [Touch of the Goddess - Embrace] [Touch of Embrace] additionally increases the target's ATK Spd by ${UT.flame.speed}.`,
    })),
    treasure('Sculpture of Chaos', (k) => ({
      words: `[Offering of Atonement] Increases the duration of Invincibility by ${UT.sculpture.longer} sec and the effect of preventing enemies from receiving positive effects by ${UT.sculpture.longer} sec. [Field of Atonement] additionally recovers allies' Mana by ${k(UT.sculpture.mana)} and reduces enemies' Mana by ${k(UT.sculpture.mana)} every ${ATONEMENT.every} sec.`,
    })),
    treasure('Picture Book About Laws of Chaos', (k) => ({
      words: `[Baptism of the Goddess] Increases the number of the ally with the highest ATK by 1 and [Baptism of the Goddess] effect additionally increases DMG dealt to Non-Hero enemies of the ally with the highest ATK by ${pct(k(UT.book.boss))}.`,
    })),
  ],
  perks: {
    's1-light': { words: `Increases Heal Rate by ${pct(PERKS.heals)}.` },
    's1-dark': { words: `Increases All DMG the hit target takes by ${pct(PERKS.takes - 1)} for ${PERKS.takesLasts} sec.` },
    's2-light': { words: '[Touch of the Goddess – Embrace] Reduces Mana Cost by 1.' },
    's2-dark': { words: "[Touch of the Goddess – Mercy] Additionally dispels the target's positive effects." },
    's3-light': { words: `For every ${ATONEMENT.every} sec, [Field of Atonement] additionally increases DMG dealt to bosses of allies within range by ${pct(PERKS.boss)} for ${PERKS.bossLasts} sec.` },
    's3-dark': { words: `Increases Heal Rate and DMG of [Field of Atonement] by ${pct(PERKS.field - 1)} and ${pct(PERKS.field - 1)} respectively.` },
    's4-light': { words: `[Baptism of the Goddess] effect granted to the ally with the highest ATK additionally increases Crit DMG by ${pct(PERKS.critDamage)}.` },
    's4-dark': { words: 'At the beginning of the first battle, gains 1 stack of *[Sin]*.' },
    't5-light': t5Light({ hp: 0.1 }, ({ hp }) => `HP + ${pct(hp)}`),
    't5-dark': { words: `Increases Toughness by ${PERKS.dark.tough} and Heal Rate by ${pct(PERKS.dark.heals)}.` },
  },
  join(fight, self) {
    const tier = self.unique?.tier ?? null;
    /**
     * Whether Embrace is in Mercy's slot, and the other's cooldown (kept apart, wearing down); her [Sin]; whether the fight's
     * beginning has come; Salvation's shielded allies, how long they are healed yet, toward the next second; Embrace's ally,
     * how long yet, toward its next heal; Atonement's boss given nothing for how long yet, and the field for how long yet,
     * toward its next; her unique weapon's heal for how long yet, toward its next second.
     */
    let embracing = false;
    let other = 0;
    let sins = self.perks.has('s4-dark') ? 1 : 0;
    let begun = false;
    let shielded: Fighter[] = [];
    let healing = 0;
    let healTick = 0;
    let embraced: Fighter | null = null;
    let embraceLeft = 0;
    let embraceTick = 0;
    let denied = 0;
    let field = 0;
    let fieldTick = 0;
    let ezaias = 0;
    let ezaiasTick = 0;
    /** Embrace as her perks change it (Mercy's Light: cheaper). */
    const embrace: Ability = { ...EMBRACE_SKILL, cost: EMBRACE_SKILL.cost - (self.perks.has('s2-light') ? 1 : 0) };
    /** Her healing more (Transcend 5's Dark), and with Salvation's Light. */
    const rate = 1 + (self.perks.has('t5-dark') ? PERKS.dark.heals : 0);
    const salvationRate = rate + (self.perks.has('s1-light') ? PERKS.heals : 0);
    const fieldRate = rate * (self.perks.has('s3-dark') ? PERKS.field : 1);
    /** Her allies on the field, standing and in the fight (her too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** The ally with the highest ATK (another, if there is one). */
    const strongest = (count: number): Fighter[] => {
      const on = allies();
      const others = on.filter((ally) => ally !== self);
      return (others.length > 0 ? others : on).sort((a, b) => b.stats.atk - a.stats.atk).slice(0, count);
    };
    /** What the boss left on an ally cleared. */
    const cleanse = (ally: Fighter): void => {
      ally.statuses = ally.statuses.filter((status) => status.shown.harmful !== true || status.binds === true);
    };
    /** What helps the boss (makes it deal more) is gone. */
    const dispel = (): void => {
      const helps = fight.foe.statuses;
      for (let i = helps.length - 1; i >= 0; i--) if ((helps[i]?.deals ?? 1) > 1) helps.splice(i, 1);
    };
    /** A blow of hers: and her unique weapon's, the boss taking more for a while. */
    const strike = (amount: number): void => {
      fight.hit(self, amount);
      if (tier !== null) put(fight.foe.statuses, { name: EZAIAS_UP.name, left: EZAIAS.lasts, takes: 1 + atTier(EZAIAS.takes, tier), shown: 'curse' });
    };

    return {
      lands: {
        attack() {
          strike(fight.basic);
        },
        // Every ally cleared and shielded (Heretical Rosary: longer), every other healed (its Light: more); a blow (its Dark: the boss taking more). While the shield holds: tick.
        salvation() {
          const on = allies();
          fight.cue(self, 'salvation', on);
          const lasts = SALVATION.lasts + fromTreasure(self, 0, UT.rosary.longer);
          for (const ally of on) {
            cleanse(ally);
            fight.shield(ally, SALVATION.shield * self.stats.hp, lasts);
            put(ally.statuses, { name: SALVATION_SHIELD.name, left: lasts, guards: true, shown: SALVATION_SHIELD });
            if (ally === self) continue;
            // (Its share of her max HP is HP as it is, not by her attack: its books by hand.)
            fight.heal(ally, SALVATION.hp * self.stats.hp * bookHeal('isaiah', 0) * salvationRate, undefined, self);
            fight.heal(ally, SALVATION.heal * salvationRate, self);
          }
          shielded = on;
          healing = SALVATION.healing;
          healTick = 0;
          strike(SALVATION.blow);
          if (self.perks.has('s1-dark')) put(fight.foe.statuses, { name: 'Light of Salvation', left: PERKS.takesLasts, takes: PERKS.takes, shown: 'curse' });
        },
        // A blow from behind the boss, and [Touch of Mercy] on it (its Dark: what helps it gone; Flame of Benevolence: it takes more).
        mercy(part) {
          if (part < 1) return;
          if (self.perks.has('s2-dark')) dispel();
          strike(MERCY.blow);
          put(fight.foe.statuses, { name: 'Touch of Mercy', left: MERCY.lasts, deals: MERCY.weaker, ...(wearsTreasure(self, 1) && { takes: 1 + fromTreasure(self, 1, UT.flame.takes) }), shown: 'curse' });
          fight.slow(MERCY.slow, MERCY.lasts);
        },
        // [Touch of Embrace] on the ally with the highest ATK: its ATK higher by a share of her max HP (Flame of Benevolence: quicker); its heals: tick.
        embrace(part) {
          if (part < 1) return;
          const [ally] = strongest(1);
          if (!ally) return;
          fight.cue(self, 'embrace', [ally]);
          put(ally.statuses, { name: EMBRACED.name, left: EMBRACE.lasts, atk: (EMBRACE.atk * self.stats.hp) / ally.stats.atk, ...(wearsTreasure(self, 1) && { speed: UT.flame.speed }), shown: EMBRACED });
          embraced = ally;
          embraceLeft = EMBRACE.lasts;
          embraceTick = 0;
        },
        // Herself cleared; then every ally untouched, and the boss given nothing that helps it (Sculpture of Chaos: longer); then the field (tick).
        atonement(part) {
          if (part === 0) {
            cleanse(self);
            return;
          }
          if (part === 1) {
            const on = allies();
            fight.cue(self, 'atonement', on);
            const lasts = ATONEMENT.untouched + (wearsTreasure(self, 2) ? UT.sculpture.longer : 0);
            for (const ally of on) put(ally.statuses, { name: ATONED.name, left: lasts, takes: 0, shown: ATONED });
            dispel();
            denied = lasts;
            return;
          }
          field = ATONEMENT.lasts;
          fieldTick = ATONEMENT.every;
        },
      },
      // Mercy's slot holds Embrace once Mercy is used; Offering of Atonement is sealed till her [Sin] open it.
      slot(index) {
        if (index === 1 && embracing) return embrace;
        if (index === 2 && sins < BAPTISM.sins) return null;
        return self.abilities[index] ?? null;
      },
      used(index) {
        // Each costs her a share of her current HP.
        const cost = index === 0 ? SALVATION.cost : index === 1 ? MERCY.cost : ATONEMENT.cost;
        self.hp = Math.max(1, self.hp * (1 - cost));
        // Salvation and either Touch: a [Sin] (none past 4: [Path of Salvation]). Atonement: her [Sin] gone, and it sealed again.
        if (index < 2) sins = Math.min(BAPTISM.sins, sins + 1);
        else sins = 0;
        // Mercy and Embrace share her slot: each its own cooldown, the other's wearing down apart.
        if (index === 1) {
          const left = self.cooldowns[1] ?? 0;
          self.cooldowns[1] = other;
          other = left;
          embracing = !embracing;
        }
        // Her unique weapon: healed a share of her max HP over its seconds.
        if (tier !== null) {
          ezaias = EZAIAS.over;
          ezaiasTick = 0;
          put(self.statuses, { name: EZAIAS_UP.name, left: EZAIAS.over, shown: EZAIAS_UP });
        }
      },
      tick(dt) {
        other = Math.max(0, other - dt);
        // As the fight begins: she deals less and takes more (Transcend 5's Dark: less, as Tough); every other ally deals more and takes less; the ally (Picture Book: 2) with the highest ATK, ATK and DEF higher (its Light: crit DMG; Picture Book: more to Non-Hero enemies).
        if (!begun && fight.field.includes(self) && self.hp > 0) {
          begun = true;
          put(self.statuses, { name: HUMBLED.name, left: Infinity, deals: BAPTISM.deals, takes: BAPTISM.taken, shown: HUMBLED });
          if (self.perks.has('t5-dark')) put(self.statuses, { name: TOUGHENED.name, left: Infinity, tough: PERKS.dark.tough, shown: TOUGHENED });
          for (const ally of fight.fighters) if (ally !== self) put(ally.statuses, { name: BLESSED.name, left: Infinity, deals: BAPTISM.allies.deals, takes: BAPTISM.allies.taken, shown: BLESSED });
          const on = strongest(wearsTreasure(self, 3) ? UT.book.allies : 1);
          fight.cue(self, 'baptism', on);
          for (const ally of on) {
            put(ally.statuses, { name: BAPTIZED.name, left: Infinity, atk: BAPTISM.atk, defends: 1 + BAPTISM.defense, ...(self.perks.has('s4-light') && { critDamage: PERKS.critDamage }), shown: BAPTIZED });
            if (wearsTreasure(self, 3)) put(ally.statuses, { name: PICTURED.name, left: Infinity, deals: 1 + fromTreasure(self, 3, UT.book.boss), shown: PICTURED });
          }
        }
        // Light of Salvation: while each ally's shield holds, healed every second (its Light: more).
        shielded = shielded.filter((ally) => ally.shield > 0 && ally.hp > 0);
        if (healing > 0) {
          healing -= dt;
          healTick += dt;
          if (healTick >= 1) {
            healTick -= 1;
            for (const ally of shielded) fight.heal(ally, SALVATION.each * salvationRate, self);
          }
        }
        for (const ally of fight.fighters) {
          if (shielded.includes(ally) || !ally.statuses.some((status) => status.name === SALVATION_SHIELD.name)) continue;
          ally.statuses = ally.statuses.filter((status) => status.name !== SALVATION_SHIELD.name);
        }
        // Touch of Embrace: its ally healed every so often.
        if (embraced && embraceLeft > 0) {
          embraceLeft -= dt;
          embraceTick += dt;
          if (embraceTick >= EMBRACE.every) {
            embraceTick -= EMBRACE.every;
            fight.heal(embraced, EMBRACE.heal * rate, self);
          }
          if (embraceLeft <= 0 || embraced.hp <= 0) embraced = null;
        }
        // Offering of Atonement: the boss given nothing that helps it, a while.
        if (denied > 0) {
          denied -= dt;
          dispel();
        }
        // The field: every 2 seconds every ally healed and cleared (its Light: more to bosses; its Dark: more; Sculpture of Chaos: mana), the boss struck and taking more (its Dark: harder).
        if (field > 0) {
          field -= dt;
          fieldTick += dt;
          if (fieldTick >= ATONEMENT.every) {
            fieldTick -= ATONEMENT.every;
            const on = allies();
            fight.cue(self, 'field', on);
            for (const ally of on) {
              fight.heal(ally, ATONEMENT.hp * self.stats.hp * bookHeal('isaiah', 2) * fieldRate, undefined, self);
              fight.heal(ally, ATONEMENT.heal * fieldRate, self);
              cleanse(ally);
              if (self.perks.has('s3-light')) put(ally.statuses, { name: FIELD_BOSS.name, left: PERKS.bossLasts, deals: 1 + PERKS.boss, shown: FIELD_BOSS });
              if (wearsTreasure(self, 2)) ally.mana = Math.min(MAX_MANA, ally.mana + fromTreasure(self, 2, UT.sculpture.mana));
            }
            strike(ATONEMENT.blow * (self.perks.has('s3-dark') ? PERKS.field : 1));
            put(fight.foe.statuses, { name: 'Field of Atonement', left: ATONEMENT.marked, takes: ATONEMENT.takes, shown: 'curse' });
          }
        }
        // Her unique weapon: healed every second, for its while.
        if (ezaias > 0 && tier !== null) {
          ezaias -= dt;
          ezaiasTick += dt;
          if (ezaiasTick >= 1) {
            ezaiasTick -= 1;
            fight.heal(self, (atTier(EZAIAS.heal, tier) / EZAIAS.over) * self.stats.hp, undefined, self);
          }
        }
      },
      // Untouched while she moves behind the boss or her ally.
      untouched: () => self.doing?.move === 'mercy' || self.doing?.move === 'embrace',
      // Nothing knocks her down while she uses Light of Salvation or Offering of Atonement.
      guards: () => self.doing?.move === 'salvation' || self.doing?.move === 'atonement',
      lit: () => sins >= BAPTISM.sins || field > 0,
      buffs: () => (sins > 0 ? [{ ...SIN, count: sins }] : []),
    };
  },
};
