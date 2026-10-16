import { share } from '../combat/damage';
import { put } from '../combat/status';
import { SKILL_SPEED } from '../motion';
import { said, t5Light } from '../perks';
import { BLOW, MAX_MANA, SECTION } from '../rules';
import { pct, skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { CLASS_STATS, type HeroDef, type Passive } from './kit';
import { CODED } from './moves';

/*
 * Fallen Frey's skills, as the game has them (what each costs, how long before it can be used again,
 * how long what it does lasts, and the shares are the game's; how hard each hits, how much it heals and
 * how strong her shield is are not said there):
 * - Light of Doom: heals the ally with the lowest health and those near it, then the light bursts on the
 *   boss.
 * - Blessing of Doom: a shield for the four allies with the lowest health, for a while, and their attacks
 *   quickened while it lasts.
 * - Heaven's Vengeance: twenty blows of light on the boss, through some of its defense, each leaving it
 *   easier to hurt (up to five times over).
 * Her passive, Tainted Angel: she takes more from the boss, but her mana fills far faster; and while it is
 * full she gains Darkened Power every second (two at most). A skill used with some spends one: Heaven's
 * Vengeance then stuns the boss with every blow. (Light of Doom and Blessing of Doom spend it to dispel
 * what is on the boss, or on her allies, and there is nothing in this fight that can be dispelled yet.)
 * What is drawn for each is ../../heroes/fallen-frey/fx.ts; what her body does for each, and for her attack, ../../heroes/fallen-frey/moves.ts.
 *
 * Her own perks (../perks.ts) are King's Raid's. Heaven's Vengeance's Dark does nothing here (the boss has no mana to
 * take). What hers give in attack speed is a pace, as Blessing of Doom's is; and what they give at the beginning of a
 * battle, she gives as the fight begins (its only battle).
 */
const SMITE = { blow: BLOW * 1.5 };
const LIGHT = { heal: 250_000, near: 3.6, blast: 5000 };
// (Its 500 ATK Spd, as the game has it: points.)
const BLESSING = { shield: 300_000, lasts: 10, allies: 4, speed: 500 };
const VENGEANCE = { hits: CODED.vengeance.lands.length, blow: 1000, pierce: 500, exposed: 0.1, most: 5, lasts: 20, stun: 0.5 };
// The game's 400 mana a second, of its 1000 to a section.
const TAINTED = { taken: 1.15, mana: 0.4 * SECTION, every: 1, most: 2 };
/**
 * Her own perks' numbers: what Light of Doom leaves on the boss and its more healing, Blessing of Doom's block, the
 * Blessing of the Fallen Angel's and the Bond's (attack speed in points, ATK a share of hers), and Transcend 5's Dark's.
 */
const PERKS = {
  light: { takes: 1.2, lasts: 10, heals: 2 },
  block: 400,
  blessing: { takes: 0.9, defends: 1.2 },
  bond: { speed: 200, atk: 0.07 },
  favour: { speed: 150, deals: 1.15, lasts: 30 },
};

const art = skillArt('fallen-frey');

const TAINTED_ANGEL: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  taken: TAINTED.taken,
  shown: {
    name: 'Tainted Angel',
    about: `Passive. She takes ${pct(TAINTED.taken - 1)} more from the boss, but her mana fills far faster; at full mana she gains [Darkened Power] every second (${TAINTED.most} at most).`,
    icon: '🌑',
    art: art(3),
  },
  words: `As Fallen Frey has been corrupted by the darkness, she takes ${pct(TAINTED.taken - 1)} increased DMG, but she recovers ${TAINTED.mana} Mana every sec, and when her Mana is at 100%, she gains [Darkened Power] every sec. [Darkened Power] can be stacked up to max ${TAINTED.most} times and is irremovable.`,
};
/** What her full mana gives her: shown beside her passive, with how many she has. */
const DARKENED: Buff = { name: 'Darkened Power', about: 'Her next skill spends one: [Heaven’s Vengeance] then stuns the boss with every blow.', icon: '🖤' };
/** What Blessing of Doom gives each ally it shields: shown on its card, with how long it has left. */
const BLESSED: Buff = { name: 'Blessing of Doom', about: 'A shield takes the boss’s blows first, and its attacks are quickened.', icon: '🔮', art: art(1) };
/** What Heaven's Vengeance leaves on the boss. */
const EXPOSED = 'Heaven’s Vengeance';
/** What her perks give her allies as the fight begins: Light of Doom's Light's mark on the boss, and the rest each ally's square. */
const PURIFIED = 'Light of Doom';
const FALLEN_BLESSING: Buff = { name: 'Blessing of the Fallen Angel', about: `Takes ${pct(1 - PERKS.blessing.takes)} less, and its DEF is ${pct(PERKS.blessing.defends - 1)} higher.`, icon: '🪽', art: art(3) };
const FALLEN_BOND: Buff = { name: 'Bond of the Fallen Angel', about: `Quicker, and its ATK higher by ${pct(PERKS.bond.atk)} of Fallen Frey’s.`, icon: '🔗', art: art(3) };
const FALLEN_FAVOUR: Buff = { name: 'Fallen Angel’s Favour', about: `Quicker, and deals ${pct(PERKS.favour.deals - 1)} more to the boss.`, icon: '🌒', art: art(3) };

export const FALLEN_FREY: HeroDef = {
  id: 'fallen-frey',
  name: 'Fallen Frey',
  class: 'priest',
  skins: ['Fallen Frey'],
  // A priestess whose blows are magical: as her class stands, otherwise (her heals and shields go by her attack).
  stats: { ...CLASS_STATS.priest, deals: 'magical' },
  abilities: [
    {
      name: 'Light of Doom',
      auto: { heals: true },
      about: 'Heals the ally with the lowest health and those near it, then the light bursts on the boss.',
      words:
        'Heals HP of the ally with the lowest HP and nearby allies and increases Heal Rate by 20% for 10 sec. Afterward, explodes the area around the target and deals M.DMG to enemies in range, reducing their Heal Rate by 20% for 10 sec. If this Skill is used with 1 or more stacks of [Darkened Power], consumes 1 stack and dispels positive effects of all enemies within range.',
      icon: '✴️',
      art: art(0),
      move: 'light',
      cooldown: 9,
      cost: 2,
    },
    {
      name: 'Blessing of Doom',
      about: `A shield on the ${BLESSING.allies} allies with the lowest health for ${BLESSING.lasts} seconds, their attacks ${pct(share(BLESSING.speed))} quicker meanwhile.`,
      words: `Grants [Blessing of Doom] to ${BLESSING.allies} allies with the lowest HP, absorbing DMG for ${BLESSING.lasts} sec. The shield grants immunity to CC and increases ATK Spd by ${BLESSING.speed} for the duration. If this Skill is used with 1 or more stacks of [Darkened Power], consumes 1 stack to dispel negative effects from self and additionally dispels negative effects from targets.`,
      icon: '🔮',
      art: art(1),
      move: 'blessing',
      cooldown: 17,
      cost: 3,
    },
    {
      name: 'Heaven’s Vengeance',
      about: `${VENGEANCE.hits} blows of light on the boss, through some of its defense, each leaving it ${pct(VENGEANCE.exposed)} easier to hurt for ${VENGEANCE.lasts} seconds (up to ${VENGEANCE.most} times over). With [Darkened Power], every blow stuns it for ${VENGEANCE.stun} seconds.`,
      words: `Brings Heaven's Vengeance upon a random enemy and nearby enemies over ${VENGEANCE.hits} hits, dealing M.DMG each hit and increasing All DMG the target takes by ${pct(VENGEANCE.exposed)} for ${VENGEANCE.lasts} sec. ${VENGEANCE.pierce} additional DEF Penetration applies to this Skill. If this Skill is used with 1 or more stacks of [Darkened Power], consumes 1 stack and inflicts Stun on the hit enemies for ${VENGEANCE.stun} sec each hit. The DMG Boost effect can be stacked up to max ${VENGEANCE.most} times.`,
      icon: '☄️',
      art: art(2),
      move: 'vengeance',
      cooldown: 22,
      cost: 5,
    },
  ],
  passive: TAINTED_ANGEL,
  perks: {
    's1-light': { words: `Increases All DMG the hit enemies take by ${pct(PERKS.light.takes - 1)} for ${PERKS.light.lasts} sec.` },
    's1-dark': said({ skill: { index: 0, cost: 1 } }, ({ skill }) => `Increases Mana Cost by ${skill.cost} and Heal Rate by ${pct(PERKS.light.heals - 1)}.`),
    's2-light': { words: 'Changes the target of shield to all allies.' },
    's2-dark': { words: `Increases All Block Chance of shielded allies by ${PERKS.block}.` },
    's3-light': said({ skill: { index: 2, dmg: 1.4 } }, ({ skill }) => `Increases DMG by ${pct(skill.dmg - 1)}.`),
    's3-dark': { words: 'Each hit reduces Mana by 200.' },
    's4-light': {
      words: `At the beginning of the first battle, grants [Blessing of the Fallen Angel] to all allies excluding self, reducing All DMG the targets take by ${pct(1 - PERKS.blessing.takes)} and increasing All DEF by ${pct(PERKS.blessing.defends - 1)}. The [Blessing of the Fallen Angel] effect is irremovable.`,
    },
    's4-dark': {
      words: `At the beginning of the first battle, grants [Bond of the Fallen Angel] to 1 ally with the highest ATK excluding self, increasing the target's ATK Spd by ${PERKS.bond.speed} and ATK equal to ${pct(PERKS.bond.atk)} of Fallen Frey's ATK. The [Bond of the Fallen Angel] effect is irremovable.`,
    },
    't5-light': t5Light({ crit: 100 }, ({ crit }) => `Crit Chance +${crit}`),
    't5-dark': {
      words: `At the beginning of each battle, increases ATK Spd of the ally with the highest ATK excluding self by ${PERKS.favour.speed} and its DMG dealt to Non-Hero enemies by ${pct(PERKS.favour.deals - 1)} for ${PERKS.favour.lasts} sec. This effect is irremovable.`,
    },
  },
  attack: 'smite',
  // Her animations: Light of Purification; and Vengeance, a span of a cutscene of the game’s drawn out to last as long as
  // the move written in code does (its blows as they land there, SKILL_SPEED as fast).
  timing: {
    skills: {
      light: { lands: [0.95, 1.45], until: 2.35 },
      vengeance: { lands: Array.from({ length: VENGEANCE.hits }, (_, i) => (0.7 + i * 0.12) * SKILL_SPEED), until: 3.85 * SKILL_SPEED },
    },
  },
  join(fight, self) {
    /** Her Darkened Power, and how long her mana has been full toward the next. */
    let stacks = 0;
    let darkening = 0;
    /** This Heaven's Vengeance was used with Darkened Power; and how many times over it has left the boss easier to hurt. */
    let empowered = false;
    let exposed = 0;

    /** A skill is used: one Darkened Power is spent, if she has any (true if she did). */
    const spend = (): boolean => {
      if (stacks <= 0) return false;
      stacks--;
      return true;
    };
    /** The heroes on the field standing, the lowest health (for what it is out of) first. */
    const weakest = (): Fighter[] => fight.field.filter((ally) => ally.hp > 0).sort((a, b) => a.hp / a.stats.hp - b.hp / b.stats.hp);

    // As the fight begins, her perks for her allies: every other's Blessing of the Fallen Angel, and the strongest other's Bond and Favour.
    const others = fight.fighters.filter((ally) => ally !== self);
    const strongest = others.reduce<Fighter | null>((best, ally) => (!best || ally.stats.atk > best.stats.atk ? ally : best), null);
    if (self.perks.has('s4-light')) for (const ally of others) put(ally.statuses, { name: FALLEN_BLESSING.name, left: Infinity, takes: PERKS.blessing.takes, defends: PERKS.blessing.defends, shown: FALLEN_BLESSING });
    if (strongest && self.perks.has('s4-dark')) {
      strongest.stats.atk += PERKS.bond.atk * self.stats.atk;
      put(strongest.statuses, { name: FALLEN_BOND.name, left: Infinity, pace: 1 + share(PERKS.bond.speed), shown: FALLEN_BOND });
    }
    if (strongest && self.perks.has('t5-dark')) put(strongest.statuses, { name: FALLEN_FAVOUR.name, left: PERKS.favour.lasts, pace: 1 + share(PERKS.favour.speed), deals: PERKS.favour.deals, shown: FALLEN_FAVOUR });

    return {
      lands: {
        // Her attack: a bolt of dark light into the boss.
        smite() {
          fight.hit(self, SMITE.blow);
        },
        // The light comes down on the ally with the lowest health and those near it; then it bursts on the boss.
        light(part) {
          if (part === 0) {
            spend();
            const allies = weakest();
            const [lowest] = allies;
            if (!lowest) return;
            const near = allies.filter((ally) => {
              const x = ally.x - lowest.x;
              const z = ally.z - lowest.z;
              return Math.sqrt(x * x + z * z) <= LIGHT.near;
            });
            fight.cue(self, 'light', near);
            for (const ally of near) fight.heal(ally, LIGHT.heal * (self.perks.has('s1-dark') ? PERKS.light.heals : 1), self);
            return;
          }
          fight.hit(self, LIGHT.blast);
          if (self.perks.has('s1-light')) put(fight.foe.statuses, { name: PURIFIED, left: PERKS.light.lasts, takes: PERKS.light.takes, shown: 'curse' });
        },
        // A shield on each of the four with the lowest health, and their attacks quickened while it lasts.
        blessing() {
          spend();
          // (Its Light: every ally; its Dark: their block higher.)
          const allies = self.perks.has('s2-light') ? weakest() : weakest().slice(0, BLESSING.allies);
          const block = self.perks.has('s2-dark') ? { blocks: { physical: PERKS.block, magical: PERKS.block } } : {};
          fight.cue(self, 'blessing', allies);
          for (const ally of allies) {
            fight.shield(ally, BLESSING.shield, BLESSING.lasts, self);
            put(ally.statuses, { name: BLESSED.name, left: BLESSING.lasts, pace: 1 + share(BLESSING.speed), ...block, shown: BLESSED });
          }
        },
        // A blow of light down on the boss, through some of its defense; each leaves it easier to hurt (and, with Darkened Power, stuns it).
        vengeance(part) {
          if (part === 0) empowered = spend();
          fight.hit(self, VENGEANCE.blow, true, VENGEANCE.pierce);
          exposed = fight.foe.statuses.some((status) => status.name === EXPOSED) ? Math.min(VENGEANCE.most, exposed + 1) : 1;
          put(fight.foe.statuses, { name: EXPOSED, left: VENGEANCE.lasts, takes: 1 + VENGEANCE.exposed * exposed, shown: 'curse' });
          if (empowered) fight.stun(VENGEANCE.stun, { by: self });
        },
      },
      // Her mana fills far faster; and while it is full, Darkened Power every second.
      tick(dt) {
        self.mana = Math.min(MAX_MANA, self.mana + TAINTED.mana * dt);
        if (self.mana >= MAX_MANA && stacks < TAINTED.most) {
          darkening += dt;
          if (darkening >= TAINTED.every) {
            darkening -= TAINTED.every;
            stacks++;
          }
        } else darkening = 0;
      },
      lit: () => stacks > 0,
      // Auto saves Heaven's Vengeance for Darkened Power (it comes once her mana is full).
      ripe: (index) => index !== 2 || stacks > 0,
      buffs: () => (stacks > 0 ? [{ ...DARKENED, count: stacks }] : []),
    };
  },
};
