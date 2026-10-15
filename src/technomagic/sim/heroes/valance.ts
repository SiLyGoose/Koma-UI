import { share } from '../combat/damage';
import { away, put, type Status } from '../combat/status';
import { t5Light } from '../perks';
import { BLOW, MAX_MANA, SECTION } from '../rules';
import { skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { CORBEAU, CORBEAU_UP } from '../unique';
import { CLASS_STATS, type HeroDef, type Passive } from './kit';

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
 * Her own perks (../perks.ts) are King's Raid's. Ultimate Laser Cannon's Light does nothing here: there is nothing on
 * the boss to dispel. What her passive's give, and Transcend 5's Dark, last while she is on the field, as it does;
 * Transcend 5's Dark stacks once for each piece of TechnoMagic gear she wears. Transcend 5's Light's ATK Spd +10% is
 * 100 points (1000: 100%).
 */
const BOLT = { blow: BLOW * 1.4 };
const HOLOGRAM = { lasts: 15, atk: 0.2, crit: 0.2, heal: 2_000, cooldown: 0.2 };
const FIELD = { lasts: 5, defense: 1.15, heal: 4_000, mana: 0.3 * SECTION };
const CANNON = { blow: 4000, stun: 3, lasers: 9, laser: 700, laserStun: 1.5, lasts: 15, takes: 0.07, heals: 0.05, most: 7 };
const AWAKENING = { defense: 1.2, mana: 1.3, atk: 0.1, boss: 0.15 };
/**
 * Her own perks' numbers: how many allies her Hologram is on, and its crit DMG; the field's less taken and attack speed
 * (points); her passive's less taken and more to the boss; and Transcend 5's Dark's for each piece of TechnoMagic gear.
 */
const PERKS = { holograms: 2, critDamage: 0.5, fieldTaken: 0.75, fieldSpeed: 300, taken: 0.7, boss: 0.15, piece: 0.025 };

const art = skillArt('valance');

const AWAKENED: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Technomagic Awakening',
    about: 'Passive. Her defense 20% higher and her mana filling 30% faster; every ally’s ATK 10% higher, and (in the Technomagic Kingdom) every ally deals 15% more to the boss.',
    icon: '⚙️',
    art: art(3),
  },
};
/** What her passive gives every ally while she is on the field, and her alone. */
const AWAKENING_UP: Buff = { name: 'Technomagic Awakening', about: 'ATK 10% higher, and 15% more to the boss.', icon: '⚙️', art: art(3) };
const AWAKENING_SELF: Buff = { name: 'Technomagic Awakening (Valance)', about: 'Defense 20% higher, and mana filling 30% faster.', icon: '⚙️', art: art(3) };
/** Hologram: on its ally's card, with how long it has left. */
const HOLOGRAPHED: Buff = { name: 'Hologram', about: 'ATK and crit chance higher, healed every second, skills ready sooner; nothing the boss does holds it.', icon: '💠', art: art(0) };
/** The Violet Force Field: on every ally's card while it lasts. */
const FIELDED: Buff = { name: 'Violet Force Field', about: 'Defense 15% higher, can’t be knocked down, healed and given mana every second.', icon: '🟣', art: art(1) };
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
  skins: ['Valance'],
  // A mechanic whose blows are physical (her lasers'): as her class stands.
  stats: { ...CLASS_STATS.mechanic, deals: 'physical' },
  abilities: [
    { name: 'Prototype – VA', about: 'Clears what the boss has left on the ally with the highest ATK, and gives it a [Hologram] for 15 seconds: 20% more ATK and crit chance, healed every second, its skills ready 20% sooner, and nothing the boss does holds it.', icon: '💠', art: art(0), move: 'prototype', cooldown: 15, cost: 3 },
    { name: 'Absolute Protection Field – LA', about: 'A field for 5 seconds that reaches every ally: 15% more defense, can’t be knocked down, and healed and given mana every second.', icon: '🟣', art: art(1), move: 'field', cooldown: 20, cost: 5 },
    { name: 'Ultimate Laser Cannon – NCE', about: 'A laser that stuns the boss for 3 seconds, then 9 more, each stunning it for 1.5; each leaves it [Manipulated] for 15 seconds (up to 7 times over): taking 7% more and healed 5% less.', icon: '🔫', art: art(2), move: 'cannon', cooldown: 20, cost: 4 },
  ],
  passive: AWAKENED,
  perks: {
    's1-light': { words: '[Hologram] applies to 2 allies with the highest ATK.' },
    's1-dark': { words: '[Hologram] additionally increases Crit DMG by 50%.' },
    's2-light': { words: '[Violet Force Field] additionally reduces DMG taken by 25%.' },
    's2-dark': { words: '[Violet Force Field] additionally increases ATK Spd by 300.' },
    's3-light': { words: 'Dispels positive effects from the hit target.' },
    's3-dark': { words: 'Reduces Mana Cost by 1.', skill: { index: 2, cost: -1 } },
    's4-light': { words: 'Reduces DMG all allies take by 30% in Technomagic Kingdom.' },
    's4-dark': { words: "Additionally increases all allies' DMG dealt to Bosses by 15% in Technomagic Kingdom." },
    't5-light': t5Light('ATK, DEF, HP +15% / ATK Spd +10%', { speed: 100 }),
    't5-dark': {
      words: 'Reduces all DMG all allies take by 2.5% and increases All DMG all enemies take by 2.5%. This effect can be stacked up to the number of Technomagic Gear equipped to self.',
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
      const stacks = Math.min(CANNON.most, (fight.foe.statuses.find((status) => status.name === MANIPULATED)?.count ?? 0) + 1);
      put(fight.foe.statuses, { name: MANIPULATED, left: CANNON.lasts, count: stacks, takes: 1 + CANNON.takes * stacks, heals: Math.max(0, 1 - CANNON.heals * stacks), shown: 'curse' });
    };
    /** How many pieces of TechnoMagic gear an ally wears: each comes with one additional skill (../skills.ts). */
    const tmPieces = (ally: Fighter): number => Object.values(ally.skills).reduce((sum: number, n) => sum + (n ?? 0), 0);
    /** What her passive gives every ally, with her perks: less taken (its Light, and Transcend 5's Dark), and more to the boss (its Dark). */
    const pieces = self.perks.has('t5-dark') ? tmPieces(self) : 0;
    const taken = (self.perks.has('s4-light') ? PERKS.taken : 1) * (1 - PERKS.piece * pieces);
    const boss = AWAKENING.boss + (self.perks.has('s4-dark') ? PERKS.boss : 0);

    return {
      lands: {
        // Her attack: a bolt out of her crossbow.
        bolt() {
          fight.hit(self, BOLT.blow);
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
          for (const ally of top) {
            ally.statuses = ally.statuses.filter((status) => !harmful(status));
            put(ally.statuses, { name: HOLOGRAPHED.name, left: HOLOGRAM.lasts, deals: 1 + HOLOGRAM.atk, crit: HOLOGRAM.crit, ...harder, guards: true, shown: HOLOGRAPHED });
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
          const more = { ...(self.perks.has('s2-light') && { takes: PERKS.fieldTaken }), ...(self.perks.has('s2-dark') && { pace: 1 + share(PERKS.fieldSpeed) }) };
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
            on.cooldowns = on.cooldowns.map((left) => Math.max(0, left - HOLOGRAM.cooldown * dt));
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
        put(self.statuses, { name: AWAKENING_SELF.name, left: Infinity, defends: AWAKENING.defense, mana: AWAKENING.mana, shown: AWAKENING_SELF });
        for (const ally of allies()) {
          put(ally.statuses, { name: AWAKENING_UP.name, left: Infinity, deals: (1 + AWAKENING.atk) * (1 + boss), ...(taken < 1 && { takes: taken }), shown: AWAKENING_UP });
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
            deals: (1 + CORBEAU.atk) * (pieces >= 4 ? 1 + CORBEAU.dmg : 1),
            ...(pieces >= 2 ? { defends: 1 + CORBEAU.defense } : {}),
            ...(pieces >= 3 ? { takes: 1 / (1 + CORBEAU.hp) } : {}),
            shown: CORBEAU_UP,
          });
        }
      },
      lit: () => field > 0,
    };
  },
};
