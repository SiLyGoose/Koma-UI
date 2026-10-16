import { share } from '../combat/damage';
import { put } from '../combat/status';
import { said, t5Light } from '../perks';
import { BLOW, MAX_MANA } from '../rules';
import { pct, skillArt, type Buff } from '../shown';
import { atTier, TEMPODIANA, TEMPODIANA_UP } from '../unique';
import { CLASS_STATS, type Ability, type HeroDef, type Passive } from './kit';
import { CODED } from './moves';

/*
 * Oddy's skills, as the game has them (what each costs, how long before it can be used again, how long what it does
 * lasts, and the shares and chances are the game's; how hard each hits is not said there):
 * - Time Fracture: a blow that petrifies the boss (a stun).
 * - Time Fragments: six blows; half the time, it is ready again at once, and costs nothing the next time.
 * - Time Distortion: a blow; every ally quicker for 15 seconds, and what is left of every ally's cooldowns halved (not
 *   its own: it isn't cut short by anything).
 * Her passive, Clock Magic: each skill she uses has her next 2 attacks deal more, each with a chance to petrify the boss
 * (no sooner than a second after the last).
 * Her unique weapon (../unique.ts) is worked here too: her Time Distortion takes more off every ally's cooldowns, and
 * raises their ATK for a while.
 * What is drawn for each is ../../heroes/oddy/fx.ts; what her body does for each, and for her attack, ../../heroes/oddy/moves.ts.
 *
 * Her own perks (../perks.ts) are King's Raid's. Time Fragments' Light does nothing here (there is only the boss to
 * hit), nor Time Distortion's Dark (there are never 5 enemies). Its Light fills every ally's mana.
 */
const CHIME = { blow: BLOW * 1.3 };
const FRACTURE = { blow: 3500, petrify: 3 };
// (As many blows as its move has.)
const FRAGMENTS = { hits: CODED.fragments.lands.length, blow: 500, chance: 0.5 };
/** Its blow, every ally's ATK Spd more (points) for `lasts` seconds, and what is left of their cooldowns. */
const DISTORTION = { blow: 3000, speed: 250, lasts: 15, cooldowns: 0.5 };
/** Clock Magic: how many of her attacks after a skill deal more, how much (at ATK), their chance to petrify the boss (for `petrify` seconds), and how often at most. */
const CLOCK = { attacks: 2, blow: 1500, chance: 0.3, petrify: 3, every: 1 };
/** Her own perks' numbers: Time Fragments' Dark (its cooldown less for each attack), Clock Magic's more attacks and chance, and Transcend 5's Dark (every so often, so many allies' cooldowns less). */
const PERKS = { fragments: 1, attacks: 3, chance: 0.4, ticking: { every: 10, allies: 4, less: 1 } };

const art = skillArt('oddy');

const CLOCK_MAGIC: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Clock Magic',
    about: `Passive. Each skill she uses has her next ${CLOCK.attacks} attacks deal more, each with a ${pct(CLOCK.chance)} chance to petrify the boss for ${CLOCK.petrify} seconds.`,
    icon: '🕰️',
    art: art(3),
  },
  words: `Upon using the skill, next ${CLOCK.attacks} attacks deal additional M.DMG with a ${pct(CLOCK.chance)} chance to petrify the target for ${CLOCK.petrify} sec. This effect activates every ${CLOCK.every} sec.`,
};
/** Clock Magic's attacks to come: shown on her card. */
const TICKING: Buff = { name: 'Clock Magic', about: 'Her next attacks deal more, and may petrify the boss.', icon: '🕰️', art: art(3) };
/** What Time Distortion gives every ally. */
const DISTORTED: Buff = { name: 'Time Distortion', about: `+${DISTORTION.speed} attack speed.`, icon: '⏳', art: art(2) };

export const ODDY: HeroDef = {
  id: 'oddy',
  name: 'Oddy',
  class: 'mechanic',
  skins: ['Oddy'],
  // A mechanic whose blows are magical (her clock's): as her class stands, otherwise.
  stats: { ...CLASS_STATS.mechanic, deals: 'magical' },
  abilities: [
    {
      name: 'Time Fracture',
      about: `A blow that petrifies the boss for ${FRACTURE.petrify} seconds.`,
      words: `Deals M.DMG to enemies in a straight line, and inflicts Petrify for ${FRACTURE.petrify} sec.`,
      icon: '⌛',
      art: art(0),
      move: 'fracture',
      cooldown: 7,
      cost: 2,
    },
    {
      name: 'Time Fragments',
      about: `${FRAGMENTS.hits} blows. ${pct(FRAGMENTS.chance)} of the time, it is ready again at once and costs nothing the next time.`,
      words: `Attacks random enemies ${FRAGMENTS.hits} times, dealing a total of M.DMG. With ${pct(FRAGMENTS.chance)} chance, 'Time Fragments' cooldown resets and consumes no mana for the next single activation.`,
      icon: '🧩',
      art: art(1),
      move: 'fragments',
      cooldown: 12,
      cost: 3,
    },
    {
      name: 'Time Distortion',
      about: `A blow; every ally +${DISTORTION.speed} attack speed for ${DISTORTION.lasts} seconds, and what is left of every ally’s cooldowns halved.`,
      words: `Deals M.DMG to all enemies and increases all allies' ATK Spd by ${DISTORTION.speed} for ${DISTORTION.lasts} sec. All allies' skill cooldown is reduced by ${pct(DISTORTION.cooldowns)}. 'Time Distortion' is not affected by skill cooldown reduction.`,
      icon: '⏳',
      art: art(2),
      move: 'distortion',
      cooldown: 35,
      cost: 4,
    },
  ],
  passive: CLOCK_MAGIC,
  perks: {
    's1-light': said({ skill: { index: 0, dmg: 1.4 } }, ({ skill }) => `DMG is increased by ${pct(skill.dmg - 1)}.`),
    's1-dark': said({ skill: { index: 0, cooldown: -1.5 } }, ({ skill }) => `Cooldown is reduced by ${-skill.cooldown} sec.`),
    's2-light': { words: 'Target changes to 2 random enemies.' },
    's2-dark': { words: `While in cooldown, auto-attacks will reduce the cooldown of 'Time Fragments' by ${PERKS.fragments} sec.` },
    's3-light': said({ skill: { index: 2, cost: 2 } }, ({ skill }) => `Increases Mana Cost by ${skill.cost} and fully recovers Mana for all allies.`),
    's3-dark': { words: 'When there are 5 or more enemies, increases DMG by 100%. Hit Enemies take extra 50% DMG for 10 sec.' },
    's4-light': { words: `Changes the instances of gaining extra DMG from using the skill to ${PERKS.attacks} times.` },
    's4-dark': { words: `Changes the chance to Petrify to ${pct(PERKS.chance)}.` },
    't5-light': t5Light({ speed: 100 }, ({ speed }) => `ATK.Spd +${speed}`),
    't5-dark': { words: `Every ${PERKS.ticking.every} sec, any skills on cooldown for ${PERKS.ticking.allies} random allies have their cooldowns reduced by ${PERKS.ticking.less} sec.` },
  },
  attack: 'chime',
  join(fight, self) {
    /** Whether Time Fragments costs nothing the next time; Clock Magic's attacks to come, and its wait; toward Transcend 5's Dark's next time. */
    let free = false;
    let clock = 0;
    let clockWait = 0;
    let ticking = 0;
    const tier = self.unique?.tier ?? null;
    const freeFragments: Ability = { ...(self.abilities[1] as Ability), cost: 0 };
    const attacks = self.perks.has('s4-light') ? PERKS.attacks : CLOCK.attacks;
    const chance = self.perks.has('s4-dark') ? PERKS.chance : CLOCK.chance;

    /** The heroes on the field and standing. */
    const allies = () => fight.field.filter((ally) => ally.hp > 0);

    return {
      lands: {
        // Her attack (its Dark: Time Fragments' cooldown less); with Clock Magic, more, and now and then the boss petrified.
        chime() {
          fight.hit(self, CHIME.blow);
          if (self.perks.has('s2-dark')) self.cooldowns[1] = Math.max(0, (self.cooldowns[1] as number) - PERKS.fragments);
          if (clock <= 0) return;
          clock--;
          fight.hit(self, CLOCK.blow, false);
          if (clockWait <= 0 && fight.roll() < chance) {
            clockWait = CLOCK.every;
            fight.stun(CLOCK.petrify, { by: self });
          }
        },
        fracture() {
          fight.hit(self, FRACTURE.blow);
          fight.stun(FRACTURE.petrify, { by: self });
        },
        fragments() {
          fight.hit(self, FRAGMENTS.blow);
        },
        // A blow; every ally quicker, and what is left of their cooldowns halved (not hers for it); with her unique weapon, less again, and their ATK higher.
        distortion() {
          fight.hit(self, DISTORTION.blow);
          const less = tier === null ? 0 : atTier(TEMPODIANA.cooldown, tier);
          for (const ally of allies()) {
            put(ally.statuses, { name: DISTORTED.name, left: DISTORTION.lasts, pace: 1 + share(DISTORTION.speed), shown: DISTORTED });
            ally.cooldowns = ally.cooldowns.map((left, i) => (ally === self && i === 2 ? left : Math.max(0, left * DISTORTION.cooldowns - less)));
            if (tier !== null) put(ally.statuses, { name: TEMPODIANA_UP.name, left: TEMPODIANA.lasts, deals: 1 + atTier(TEMPODIANA.atk, tier), shown: TEMPODIANA_UP });
            // (Its Light: every ally's mana filled.)
            if (self.perks.has('s3-light')) ally.mana = MAX_MANA;
          }
          fight.cue(self, 'distortion', allies());
        },
      },
      // Time Fragments costs nothing, once, after it was ready again at once.
      slot: (index) => (index === 1 && free ? freeFragments : (self.abilities[index] ?? null)),
      // A skill has her next attacks deal more; Time Fragments, half the time, is ready again at once and free the next time.
      used(index) {
        clock = attacks;
        if (index !== 1) return;
        free = fight.roll() < FRAGMENTS.chance;
        if (free) self.cooldowns[1] = 0;
      },
      tick(dt) {
        clockWait = Math.max(0, clockWait - dt);
        // Transcend 5's Dark: every so often, so many allies' cooldowns less.
        if (!self.perks.has('t5-dark') || self.hp <= 0 || !fight.field.includes(self)) return;
        ticking += dt;
        if (ticking < PERKS.ticking.every) return;
        ticking -= PERKS.ticking.every;
        const pool = allies();
        for (let i = 0; i < PERKS.ticking.allies && pool.length > 0; i++) {
          const ally = pool.splice(Math.floor(fight.roll() * pool.length), 1)[0];
          if (ally) ally.cooldowns = ally.cooldowns.map((left) => Math.max(0, left - PERKS.ticking.less));
        }
      },
      lit: () => free,
      buffs: () => (clock > 0 ? [{ ...TICKING, count: clock }] : []),
    };
  },
};
