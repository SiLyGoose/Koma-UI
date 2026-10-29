import { away, put, type Status } from '../combat/status';
import { said, t5Light } from '../perks';
import { fromTreasure, treasure, wearsTreasure } from '../treasures';
import { MAX_MANA, SECTION } from '../rules';
import { fine, pct, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { atTier, CORBEAU, CORBEAU_UP } from '../unique';
import { bookDmg, bookHeal, CLASS_STATS, dmg, healed, type HeroDef, type Passive } from './kit';
import { CODED } from './moves';

/*
 * Valance's skills, as the game has them (what each costs, how long before it can be used again, how long what it
 * does lasts, and the shares are the game's; how hard each hits, how much it heals and how much it raises are not
 * said there):
 * - Prototype – VA: clears what the boss has left on the ally with the highest ATK, and gives it a Hologram for a
 *   while: its ATK and crit chance higher, healed every second, its skills ready the sooner, and nothing the boss
 *   does holds it (it can't be knocked down, and what the boss leaves on it is cleared as it comes).
 * - Absolute Protection Field – LA: a field round her for a few seconds: every ally in it (the field reaches them
 *   all) stands the boss's blows better, can't be knocked down, and is healed and given mana every second.
 * - Ultimate Laser Cannon – NCE: a laser into the boss that stuns it, then nine more, each stunning it a moment;
 *   each leaves it Manipulated (up to seven times over): taking more and healed less.
 * Her passive, Technomagic Awakening: her defense higher and her mana filling faster, and every ally's ATK higher;
 * and in the Technomagic Kingdom (this raid's) every ally deals more to the boss.
 * Her unique weapon (../unique.ts) is worked here too: every ally gains by the TechnoMagic gear it wears.
 * What is drawn for each is ../../heroes/valance/fx.ts; what her body does for each, and for her attack, ../../heroes/valance/moves.ts.
 *
 * Her own perks (../perks.ts) and unique treasures are live King's Raid's, as krinfo has them (its legacy). Ultimate
 * Laser Cannon's Light dispels what helps the boss as the cannon is used. What her passive's give, and Transcend 5's
 * Dark, last while she is on the field, as it does; Transcend 5's Dark stacks once for each piece of TechnoMagic gear
 * she wears, and its less taken adds up with her passive's Light's, as King's Raid's DMG Reduction does.
 */
// (How hard each of his skills hits: the King's Raid Index hasn't him, so ×2.91 what it was, as the other mechanics' went to theirs from it; how much each heals, ×0.69, likewise.)
const HOLOGRAM = { lasts: 15, atk: 0.2, crit: 0.2, heal: 13_840, cooldown: 0.2 };
// (Its DEF Boost the playtest's 15%, and its books' 15% more.)
const FIELD = { lasts: 5, defense: 1.3, heal: 27_670, mana: 0.3 * SECTION };
// (Its lasers after the first: its move's blows but the first.)
const CANNON = { blow: 11_640, stun: 3, lasers: CODED.cannon.lands.length - 1, laser: 2040, laserStun: 1.5, lasts: 15, takes: 0.07, heals: 0.05, most: 7 };
const AWAKENING = { defense: 1.2, mana: 1.3, atk: 0.1, boss: 0.15 };
/**
 * Her own perks' numbers: how many allies her Hologram is on, and its crit DMG; the field's less taken and attack speed
 * (points); her passive's less taken (a share off) and more to the boss; and Transcend 5's Dark's for each piece of
 * TechnoMagic gear.
 */
const PERKS = { holograms: 2, critDamage: 0.5, fieldTaken: 0.75, fieldSpeed: 300, taken: 0.3, boss: 0.15, piece: 0.025 };

/**
 * Her unique treasures' numbers (1★ to 5★: ../treasures.ts): the Hologram's more DMG to the boss and its more cooldown
 * off; the field's block (points); the cannon's shorter cooldown and more Manipulated at most; and every ally's more
 * healing, with her passive's own DEF and mana for every ally.
 */
const UT = {
  device: { dmg: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25], cooldown: 0.5 },
  tea: { block: [200, 240, 290, 350, 420, 500] },
  sincerity: { cooldown: [2, 3, 4, 5, 6, 7], most: 10 },
  failure: { heals: [0.1, 0.12, 0.14, 0.17, 0.21, 0.25] },
};

const art = skillArt('valance');

const AWAKENED: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Technomagic Awakening',
    about: `Passive. Her defense ${pct(AWAKENING.defense - 1)} higher and her mana filling ${pct(AWAKENING.mana - 1)} faster; every ally’s ATK ${pct(AWAKENING.atk)} higher, and (in the Technomagic Kingdom) every ally deals ${pct(AWAKENING.boss)} more to the boss.`,
    icon: '⚙️',
    art: art(3),
  },
  words: `Increases self’s All DEF, Mana Recovery/Attack, and ATK of all allies. In Technomagic Kingdom, increases all allies’ DMG dealt to Bosses by ${pct(AWAKENING.boss)}.`,
};
/** What her passive gives every ally while she is on the field, and her alone. */
const AWAKENING_UP: Buff = { name: 'Technomagic Awakening', about: `ATK ${pct(AWAKENING.atk)} higher, and ${pct(AWAKENING.boss)} more to the boss.`, icon: '⚙️', art: art(3) };
const AWAKENING_SELF: Buff = { name: 'Technomagic Awakening (Valance)', about: `Defense ${pct(AWAKENING.defense - 1)} higher, and mana filling ${pct(AWAKENING.mana - 1)} faster.`, icon: '⚙️', art: art(3) };
/** Hologram: on its ally's card, with how long it has left. */
const HOLOGRAPHED: Buff = { name: 'Hologram', about: 'ATK and crit chance higher, healed every second, skills ready sooner; nothing the boss does holds it.', icon: '💠', art: art(0) };
/** The Violet Force Field: on every ally's card while it lasts. */
const FIELDED: Buff = { name: 'Violet Force Field', about: `Defense ${pct(FIELD.defense - 1)} higher, can’t be knocked down, healed and given mana every second.`, icon: '🟣', art: art(1) };
/** What Ultimate Laser Cannon leaves on the boss. */
const MANIPULATED = 'Manipulated';
/** What her Transcend 5's Dark leaves on the boss while she is on the field. */
const EXPOSED = 'Technomagic Awakening';

/** Something the boss has left on a hero that can be cleared (not what holds it down, or shuts it away). */
const harmful = (status: Status<Buff>): boolean => status.shown.harmful === true && !status.binds && !status.away;

export const VALANCE: HeroDef = {
  id: 'valance',
  name: 'Valance',
  class: 'mechanic',
  skins: ['Valance', 'Valance_Christmas'],
  // A mechanic whose blows are physical (her lasers'): as her class stands.
  stats: { ...CLASS_STATS.mechanic, deals: 'physical' },
  abilities: [
    {
      name: 'Prototype – VA',
      about: `Clears what the boss has left on the ally with the highest ATK, and gives it a [Hologram] for ${HOLOGRAM.lasts} seconds: ${pct(HOLOGRAM.atk)} more ATK and ${pct(HOLOGRAM.crit)} more crit chance, healed every second, its skills ready ${pct(HOLOGRAM.cooldown)} sooner, and nothing the boss does holds it.`,
      words: `Dispels negative effects from the ally with the highest ATK and grants [Hologram] for ${HOLOGRAM.lasts} sec. [Hologram] increases the target’s ATK, Crit Chance, heals ${healed('mechanic', HOLOGRAM.heal, bookHeal('valance', 0))} HP every sec, and reduces its Cooldown of all active Skills by ${HOLOGRAM.cooldown} sec. While [Hologram] is active, the target gains immunity to negative effects.`,
      icon: '💠',
      art: art(0),
      move: 'prototype',
      cooldown: 15,
      cost: 3,
    },
    {
      name: 'Absolute Protection Field – LA',
      about: `A field for ${FIELD.lasts} seconds that reaches every ally: ${pct(FIELD.defense - 1)} more defense, can’t be knocked down, and healed and given mana every second.`,
      words: `Creates an [Violet Force Field] that lasts for ${FIELD.lasts} sec within a wide range of self. Allies within the range of [Violet Force Field] have their All DEF increased by ${pct(FIELD.defense - 1)}, gain immunity to CC, and have ${healed('mechanic', FIELD.heal, bookHeal('valance', 1))} HP healed and Mana recovered every sec.`,
      icon: '🟣',
      art: art(1),
      move: 'field',
      cooldown: 20,
      cost: 5,
    },
    {
      name: 'Ultimate Laser Cannon – NCE',
      about: `A laser that stuns the boss for ${CANNON.stun} seconds, then ${CANNON.lasers} more, each stunning it for ${CANNON.laserStun}; each leaves it [Manipulated] for ${CANNON.lasts} seconds (up to ${CANNON.most} times over): taking ${pct(CANNON.takes)} more and healed ${pct(CANNON.heals)} less.`,
      words: `Summons laser cannons behind self that fire laser beams, dealing ${dmg('mechanic', CANNON.blow, bookDmg('valance', 2))} P.DMG to the enemy. The hit target is inflicted with Stun for ${CANNON.stun} sec and becomes [Manipulated] for ${CANNON.lasts} sec. Afterward, the cannons additionally fire a total of ${CANNON.lasers} laser beams to random enemies. Each laser beam deals ${dmg('mechanic', CANNON.laser, bookDmg('valance', 2))} P.DMG, inflicts Stun on the hit target for ${CANNON.laserStun} sec, and inflicts [Manipulated] for ${CANNON.lasts} sec. Enemies who are [Manipulated] have their Heal Rate reduced by ${pct(CANNON.heals)} and take ${pct(CANNON.takes)} increased All DMG. [Manipulated] can be stacked up to max ${CANNON.most} times.`,
      icon: '🔫',
      art: art(2),
      move: 'cannon',
      cooldown: 20,
      cost: 4,
    },
  ],
  passive: AWAKENED,
  treasures: [
    treasure('Formula Input Device', (k) => ({
      words: `[Prototype - VA] [Hologram] The effect additionally increases DMG dealt to Non-Hero enemies by ${pct(k(UT.device.dmg))} and the target's Cooldown Reduction by ${pct(UT.device.cooldown)}.`,
    })),
    treasure('A Moment of Tea', (k) => ({
      words: `[Absolute Protection Field - LA] Dispels negative effects from self upon use. For the duration of [Violet Force Field], increases the target's All Block Chance by ${k(UT.tea.block)}.`,
      skill: { index: 1, cleanse: 'self' },
    })),
    treasure('Sloppy Sincerity', (k) => ({
      words: `[Ultimate Laser Cannon - NCE] Reduces Cooldown by ${k(UT.sincerity.cooldown)} sec and changes the max number of [Manipulated] stacks to ${UT.sincerity.most}.`,
      skill: { index: 2, cooldown: -k(UT.sincerity.cooldown) },
    })),
    treasure('First Failure', (k) => ({
      words: `[Technomagic Awakening] All DEF Boost and Mana Recovery/Attack Boost effects now apply to all allies. Increases Heal Rate of all allies by ${pct(k(UT.failure.heals))}.`,
    })),
  ],
  perks: {
    's1-light': { words: `[Hologram] applies to ${PERKS.holograms} allies with the highest ATK.` },
    's1-dark': { words: `[Hologram] additionally increases Crit DMG by ${pct(PERKS.critDamage)}.` },
    's2-light': { words: `[Violet Force Field] additionally reduces DMG taken by ${pct(1 - PERKS.fieldTaken)}.` },
    's2-dark': { words: `[Violet Force Field] additionally increases ATK Spd by ${PERKS.fieldSpeed}.` },
    's3-light': said({ skill: { index: 2, dispel: true } }, () => 'Dispels positive effects from the hit target.'),
    's3-dark': said({ skill: { index: 2, cost: -1 } }, ({ skill }) => `Reduces Mana Cost by ${-skill.cost}.`),
    's4-light': { words: `Reduces DMG all allies take by ${pct(PERKS.taken)} in Technomagic Kingdom.` },
    's4-dark': { words: `Additionally increases all allies' DMG dealt to Bosses by ${pct(PERKS.boss)} in Technomagic Kingdom.` },
    't5-light': t5Light({ speed: 100 }, ({ speed }) => `ATK Spd +${speed}`),
    't5-dark': {
      words: `Reduces All DMG all allies take by ${fine(PERKS.piece)} and increases All DMG all enemies take by ${fine(PERKS.piece)}. This effect can be stacked up to the number of Technomagic Gear equipped to self.`,
    },
  },
  attack: 'bolt',
  join(fight, self) {
    /** Whom her Hologram is on (two, with its Light), and for how long yet; and toward its next heal (once a second). */
    let holos: Fighter[] = [];
    let holoLeft = 0;
    let holoHeal = 0;
    /** How long her field lasts yet, and toward its next heal and mana (once a second). */
    let field = 0;
    let fieldTick = 0;

    /** She is on the field, standing and in the fight. */
    const there = (): boolean => fight.field.includes(self) && self.hp > 0 && !away(self.statuses);
    /** Her allies on the field, standing and in the fight (her too). */
    const allies = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0 && !away(ally.statuses));
    /** Takes a status of hers off every fighter (she has left the field). */
    const lift = (name: string): void => {
      for (const one of fight.fighters) one.statuses = one.statuses.filter((status) => status.name !== name);
    };
    /** One more stack of Manipulated on the boss (up to seven), begun again. */
    const manipulate = (): void => {
      // (Sloppy Sincerity: more of it at most.)
      const stacks = Math.min(wearsTreasure(self, 2) ? UT.sincerity.most : CANNON.most, (fight.foe.statuses.find((status) => status.name === MANIPULATED)?.count ?? 0) + 1);
      put(fight.foe.statuses, { name: MANIPULATED, left: CANNON.lasts, count: stacks, takes: 1 + CANNON.takes * stacks, heals: Math.max(0, 1 - CANNON.heals * stacks), shown: 'curse' });
    };
    /** How many pieces of TechnoMagic gear an ally wears: each comes with one additional skill (../skills.ts). */
    const tmPieces = (ally: Fighter): number => Object.values(ally.skills).reduce((sum: number, n) => sum + (n ?? 0), 0);
    /** What her passive gives every ally, with her perks: less taken (its Light, and Transcend 5's Dark), and more to the boss (its Dark). */
    const pieces = self.perks.has('t5-dark') ? tmPieces(self) : 0;
    const taken = 1 - (self.perks.has('s4-light') ? PERKS.taken : 0) - PERKS.piece * pieces;
    const boss = AWAKENING.boss + (self.perks.has('s4-dark') ? PERKS.boss : 0);

    return {
      lands: {
        // Her attack: a bolt out of her crossbow.
        bolt() {
          fight.hit(self, fight.basic);
        },
        // The Hologram, on the ally with the highest ATK (the two, with its Light): what the boss left on it cleared.
        prototype() {
          const top = allies()
            .sort((a, b) => b.stats.atk - a.stats.atk)
            .slice(0, self.perks.has('s1-light') ? PERKS.holograms : 1);
          if (top.length === 0) return;
          fight.cue(self, 'prototype', top);
          for (const was of holos) if (!top.includes(was)) was.statuses = was.statuses.filter((status) => status.name !== HOLOGRAPHED.name);
          // (Its Dark: crit DMG higher too.)
          const harder = self.perks.has('s1-dark') ? { critDamage: PERKS.critDamage } : {};
          // (Formula Input Device: more to the boss again.)
          const device = 1 + fromTreasure(self, 0, UT.device.dmg);
          for (const ally of top) {
            ally.statuses = ally.statuses.filter((status) => !harmful(status));
            put(ally.statuses, { name: HOLOGRAPHED.name, left: HOLOGRAM.lasts, deals: (1 + HOLOGRAM.atk) * device, crit: HOLOGRAM.crit, ...harder, guards: true, shown: HOLOGRAPHED });
          }
          holos = top;
          holoLeft = HOLOGRAM.lasts;
          holoHeal = 0;
        },
        // The field goes up round every ally.
        field() {
          const on = allies();
          fight.cue(self, 'field', on);
          // (Its Light: less taken; its Dark: quicker.)
          // (A Moment of Tea: their block higher.)
          const tea = fromTreasure(self, 1, UT.tea.block);
          const more = { ...(self.perks.has('s2-light') && { takes: PERKS.fieldTaken }), ...(self.perks.has('s2-dark') && { speed: PERKS.fieldSpeed }), ...(tea > 0 && { blocks: { physical: tea, magical: tea } }) };
          for (const ally of on) put(ally.statuses, { name: FIELDED.name, left: FIELD.lasts, defends: FIELD.defense, ...more, guards: true, shown: FIELDED });
          field = FIELD.lasts;
          fieldTick = 0;
        },
        // The first laser stuns the boss; each of the nine after stuns it a moment. Each leaves it Manipulated.
        cannon(part) {
          fight.hit(self, part === 0 ? CANNON.blow : CANNON.laser);
          fight.stun(part === 0 ? CANNON.stun : CANNON.laserStun, { by: self });
          manipulate();
        },
      },
      tick(dt) {
        // The Hologram: its ally healed every second, its skills ready the sooner, and what the boss leaves on it cleared as it comes.
        if (holos.length > 0) {
          holoLeft -= dt;
          holos = holoLeft <= 0 ? [] : holos.filter((on) => on.hp > 0);
          if (holos.length > 0) holoHeal += dt;
          const healing = holoHeal >= 1;
          if (healing) holoHeal -= 1;
          for (const on of holos) {
            on.statuses = on.statuses.filter((status) => !harmful(status));
            // (Formula Input Device: more off.)
            on.cooldowns = on.cooldowns.map((left) => Math.max(0, left - HOLOGRAM.cooldown * (wearsTreasure(self, 0) ? 1 + UT.device.cooldown : 1) * dt));
            if (healing) fight.heal(on, HOLOGRAM.heal, self);
          }
        }
        // The field: every ally in it healed and given mana every second.
        if (field > 0) {
          field -= dt;
          fieldTick += dt;
          if (fieldTick >= 1) {
            fieldTick -= 1;
            for (const ally of allies()) {
              if (!ally.statuses.some((status) => status.name === FIELDED.name)) continue;
              fight.heal(ally, FIELD.heal, self);
              ally.mana = Math.min(MAX_MANA, ally.mana + FIELD.mana);
            }
          }
        }
        if (!there()) {
          // Off the field, or down: what she gives every ally while she is there goes.
          lift(AWAKENING_UP.name);
          lift(AWAKENING_SELF.name);
          lift(CORBEAU_UP.name);
          fight.foe.statuses = fight.foe.statuses.filter((status) => status.name !== EXPOSED);
          return;
        }
        // Her passive on every ally (and her own part of it on her); her unique weapon's by the TechnoMagic gear each wears. (And Transcend 5's Dark, on the boss.)
        if (pieces > 0) put(fight.foe.statuses, { name: EXPOSED, left: Infinity, count: pieces, takes: 1 + PERKS.piece * pieces, shown: 'curse' });
        // (First Failure: her own DEF and mana for every ally, and more healing for each.)
        const failure = fromTreasure(self, 3, UT.failure.heals);
        put(self.statuses, { name: AWAKENING_SELF.name, left: Infinity, defends: AWAKENING.defense, mana: AWAKENING.mana, shown: AWAKENING_SELF });
        for (const ally of allies()) {
          if (failure > 0 && ally !== self) put(ally.statuses, { name: AWAKENING_SELF.name, left: Infinity, defends: AWAKENING.defense, mana: AWAKENING.mana, shown: AWAKENING_SELF });
          put(ally.statuses, { name: AWAKENING_UP.name, left: Infinity, deals: (1 + AWAKENING.atk) * (1 + boss), ...(taken < 1 && { takes: taken }), ...(failure > 0 && { heals: 1 + failure }), shown: AWAKENING_UP });
          if (!self.unique) continue;
          const pieces = Math.min(4, tmPieces(ally));
          if (pieces === 0) {
            ally.statuses = ally.statuses.filter((status) => status.name !== CORBEAU_UP.name);
            continue;
          }
          put(ally.statuses, {
            name: CORBEAU_UP.name,
            left: Infinity,
            count: pieces,
            deals: (1 + atTier(CORBEAU.atk, self.unique.tier)) * (pieces >= 4 ? 1 + atTier(CORBEAU.dmg, self.unique.tier) : 1),
            ...(pieces >= 2 ? { defends: 1 + atTier(CORBEAU.defense, self.unique.tier) } : {}),
            ...(pieces >= 3 ? { takes: 1 / (1 + atTier(CORBEAU.hp, self.unique.tier)) } : {}),
            shown: CORBEAU_UP,
          });
        }
      },
      lit: () => field > 0,
    };
  },
};
