import { share } from '../combat/damage';
import { put } from '../combat/status';
import { SKILL_SPEED } from '../motion';
import { BLOW, MAX_MANA, SECTION } from '../rules';
import { skillArt, type Buff } from '../shown';
import type { Fighter } from '../types';
import { CLASS_STATS, type HeroDef, type Passive } from './kit';

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
 */
const SMITE = { blow: BLOW * 1.5 };
const LIGHT = { heal: 25_000, near: 3.6, blast: 5000 };
// (Its 500 ATK Spd, as the game has it: points.)
const BLESSING = { shield: 30_000, lasts: 10, allies: 4, speed: 500 };
const VENGEANCE = { blow: 1000, pierce: 500, exposed: 0.1, most: 5, lasts: 20, stun: 0.5 };
// The game's 400 mana a second, of its 1000 to a section.
const TAINTED = { taken: 1.15, mana: 0.4 * SECTION, every: 1, most: 2 };

const art = skillArt('fallen-frey');

const TAINTED_ANGEL: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  taken: TAINTED.taken,
  shown: {
    name: 'Tainted Angel',
    about: 'Passive. She takes 15% more from the boss, but her mana fills far faster; at full mana she gains [Darkened Power] every second (2 at most).',
    icon: '🌑',
    art: art(3),
  },
};
/** What her full mana gives her: shown beside her passive, with how many she has. */
const DARKENED: Buff = { name: 'Darkened Power', about: 'Her next skill spends one: [Heaven’s Vengeance] then stuns the boss with every blow.', icon: '🖤' };
/** What Blessing of Doom gives each ally it shields: shown on its card, with how long it has left. */
const BLESSED: Buff = { name: 'Blessing of Doom', about: 'A shield takes the boss’s blows first, and its attacks are quickened.', icon: '🔮', art: art(1) };
/** What Heaven's Vengeance leaves on the boss. */
const EXPOSED = 'Heaven’s Vengeance';

export const FALLEN_FREY: HeroDef = {
  id: 'fallen-frey',
  name: 'Fallen Frey',
  class: 'priest',
  skins: ['Fallen Frey'],
  // A priestess whose blows are magical: as her class stands, otherwise (her heals and shields go by her attack).
  stats: { ...CLASS_STATS.priest, deals: 'magical' },
  abilities: [
    { name: 'Light of Doom', about: 'Heals the ally with the lowest health and those near it, then the light bursts on the boss.', icon: '✴️', art: art(0), move: 'light', cooldown: 9, cost: 2 },
    { name: 'Blessing of Doom', about: 'A shield on the 4 allies with the lowest health for 10 seconds, their attacks 50% quicker meanwhile.', icon: '🔮', art: art(1), move: 'blessing', cooldown: 17, cost: 3 },
    { name: 'Heaven’s Vengeance', about: '20 blows of light on the boss, through some of its defense, each leaving it 10% easier to hurt for 20 seconds (up to 5 times over). With [Darkened Power], every blow stuns it for half a second.', icon: '☄️', art: art(2), move: 'vengeance', cooldown: 22, cost: 5 },
  ],
  passive: TAINTED_ANGEL,
  attack: 'smite',
  // Her animations: Light of Purification; and Vengeance, a span of a cutscene of the game’s drawn out to last as long as
  // the move written in code does (its blows as they land there, SKILL_SPEED as fast).
  timing: {
    skills: {
      light: { lands: [0.95, 1.45], until: 2.35 },
      vengeance: { lands: Array.from({ length: 20 }, (_, i) => (0.7 + i * 0.12) * SKILL_SPEED), until: 3.85 * SKILL_SPEED },
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
            for (const ally of near) fight.heal(ally, LIGHT.heal, self);
            return;
          }
          fight.hit(self, LIGHT.blast);
        },
        // A shield on each of the four with the lowest health, and their attacks quickened while it lasts.
        blessing() {
          spend();
          const allies = weakest().slice(0, BLESSING.allies);
          fight.cue(self, 'blessing', allies);
          for (const ally of allies) {
            fight.shield(ally, BLESSING.shield, BLESSING.lasts, self);
            put(ally.statuses, { name: BLESSED.name, left: BLESSING.lasts, pace: 1 + share(BLESSING.speed), shown: BLESSED });
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
      buffs: () => (stacks > 0 ? [{ ...DARKENED, count: stacks }] : []),
    };
  },
};
