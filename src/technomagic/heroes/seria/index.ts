import { SERIA_ASSETS, skillPicture } from '../../assets';
import { put } from '../../combat/status';
import type { Buff } from '../../hud/buff';
import { atTier, ELSION, ELSION_UP } from '../../sim/unique';
import { CLASS_STATS, type Ability, type HeroDef, type Passive } from '../kit';

/*
 * Seria's skills, as the game has them (what each costs, how long before it can be used again, how long what it
 * does lasts, and the shares are the game's; how hard each hits, and how often the moon ripens, are not said there):
 * - Mysterious Sword - Falling Petals: a cut across the boss; for 5 seconds after, its slot holds Mysterious Sword -
 *   Blossom (a cut down on it), once. Falling Petals' own cooldown runs meanwhile, and is what is left of it after.
 * - Blood Scattering Blade: a rush in with a cut that leaves Original Sin of Blood on the boss (its attacks slower
 *   for 3 seconds); then two more cuts, each with a blow more that goes through its defense.
 * - Red Moon Blade: a great cut, and more on a boss. Every so often the moon ripens and she has Moonlight for a
 *   second: used then, it cuts again, and leaves the boss healed not at all for a while.
 * Her passive, Cold-Blooded Witch: her ATK higher, and each critical blow of her skills makes her critical blows
 * harder (up to 30 times over, for the rest of the fight).
 * Her unique weapon (../../sim/unique.ts) is worked here too: a critical blow of her skills deals more, leaves the
 * boss healed less for a while, and heals her the more (up to 5 times over).
 * What is drawn for each is ./fx.ts; what her body does for each, ./moves.ts (her attack is her slash's animation: ../../assets/heroes/seria.ts).
 */
const PETALS = { blow: 2500, window: 5 };
const BLOSSOM = { blow: 2500 };
// (Its ATK Spd down 300, as the game has it: the boss's attacks at 70% of their speed.)
const SCATTER = { rush: 2000, cut: 1200, through: 800, pierce: 1000, slow: 0.7, lasts: 3 };
const MOON = { blow: 6000, boss: 3000, ripe: 4000, every: 6, light: 1, unhealed: 10 };
// (Its ATK as the game has it, at this raid's scale.)
const WITCH = { atk: 38_567, critDamage: 0.05, most: 30 };

const art = (index: number): string => skillPicture(SERIA_ASSETS, index);

/** What Falling Petals' slot holds for a while after it is used (its picture is Falling Petals'). */
const BLOSSOM_SKILL: Ability = { name: 'Mysterious Sword - Blossom', about: 'A cut down on the boss: once, within 5 seconds of [Falling Petals].', icon: '🌸', image: art(0), move: 'blossom', cooldown: 0, cost: 1 };

const COLD_BLOODED: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Cold-Blooded Witch', about: 'Passive. Her ATK is higher, and each critical blow of her skills gives her 5% more crit damage (up to 30 times).', icon: '🩸', image: art(3) },
};
/** Her Cold-Blooded Witch's stacks: shown on her card, with how many she has. */
const WITCHED: Buff = { name: 'Cold-Blooded Witch', about: '5% more crit damage for each.', icon: '🩸', image: art(3) };
/** Moonlight: shown on her card for the second it lasts. */
const MOONLIGHT: Buff = { name: 'Moonlight', about: '[Red Moon Blade] used now cuts again, and leaves the boss healed not at all for 10 seconds.', icon: '🌕', image: art(2) };
/** What her skills leave on the boss. */
const SIN = 'Original Sin of Blood';
const UNHEALED = 'Red Moon';

export const SERIA: HeroDef = {
  id: 'seria',
  name: 'Seria',
  class: 'warrior',
  assets: SERIA_ASSETS,
  // A warrior whose blows are magical, her ATK higher for her passive: as her class stands, otherwise.
  stats: { ...CLASS_STATS.warrior, atk: CLASS_STATS.warrior.atk + WITCH.atk, deals: 'magical' },
  abilities: [
    { name: 'Mysterious Sword - Falling Petals', about: 'A cut across the boss. For 5 seconds after, this slot holds [Mysterious Sword - Blossom], once.', icon: '🌸', image: art(0), move: 'petals', cooldown: 7, cost: 1 },
    { name: 'Blood Scattering Blade', about: 'A rush in with a cut that leaves [Original Sin of Blood] (the boss’s attacks 30% slower for 3 seconds); then two more cuts, each with a blow more through its defense.', icon: '🩸', image: art(1), move: 'scatter', cooldown: 13, cost: 2 },
    { name: 'Red Moon Blade', about: 'A great cut, harder on a boss. Used in [Moonlight] (a second of it every 6 seconds): it cuts again, and the boss is healed not at all for 10 seconds.', icon: '🌙', image: art(2), move: 'moon', cooldown: 20, cost: 4 },
  ],
  passive: COLD_BLOODED,
  join(fight, self) {
    /** How long Blossom can be used for yet, and Falling Petals' own cooldown meanwhile. */
    let blossom = 0;
    let petals = 0;
    /** Toward the moon's ripening, and how long her Moonlight lasts yet; whether Red Moon Blade was used in it (as it began). */
    let waxing = 0;
    let moonlight = 0;
    let ripe = false;
    /** Her Cold-Blooded Witch's stacks, and her unique weapon's. */
    let witch = 0;
    let elsion = 0;
    const tier = self.unique?.tier ?? null;

    /** A blow of a skill of hers: a critical one makes her critical blows harder, and (with her unique weapon) deals more, and leaves the boss healed less and her healed more. */
    const cut = (amount: number, pierce = 0): void => {
      if (!fight.hit(self, amount, true, pierce)) return;
      witch = Math.min(WITCH.most, witch + 1);
      put(self.statuses, { name: WITCHED.name, left: Infinity, count: witch, critDamage: WITCH.critDamage * witch, shown: WITCHED });
      if (tier === null) return;
      fight.hit(self, atTier(ELSION.blow, tier), false);
      put(fight.foe.statuses, { name: ELSION.name, left: ELSION.lasts, heals: 1 - atTier(ELSION.unhealed, tier), shown: 'curse' });
      elsion = Math.min(ELSION.most, elsion + 1);
      put(self.statuses, { name: ELSION_UP.name, left: ELSION.healed, count: elsion, heals: 1 + atTier(ELSION.heals, tier) * elsion, shown: ELSION_UP });
    };

    return {
      lands: {
        petals() {
          cut(PETALS.blow);
        },
        blossom() {
          cut(BLOSSOM.blow);
        },
        // The rush in leaves Original Sin of Blood on the boss (its attacks slower); each cut after it, a blow more through its defense.
        scatter(part) {
          if (part === 0) {
            cut(SCATTER.rush);
            put(fight.foe.statuses, { name: SIN, left: SCATTER.lasts, shown: 'curse' });
            fight.slow(SCATTER.slow, SCATTER.lasts);
            return;
          }
          cut(SCATTER.cut);
          cut(SCATTER.through, SCATTER.pierce);
        },
        // A great cut, and more on a boss; in Moonlight, again, and the boss is healed not at all for a while.
        moon() {
          cut(MOON.blow + MOON.boss);
          if (!ripe) return;
          cut(MOON.ripe);
          put(fight.foe.statuses, { name: UNHEALED, left: MOON.unhealed, heals: 0, shown: 'curse' });
        },
      },
      // For a while after Falling Petals, its slot holds Blossom.
      slot: (index) => (index === 0 && blossom > 0 ? BLOSSOM_SKILL : (self.def.abilities[index] ?? null)),
      used(index, ability) {
        if (index === 0 && ability === BLOSSOM_SKILL) {
          // Blossom used: Falling Petals again, with what is left of its cooldown.
          blossom = 0;
          self.cooldowns[0] = petals;
        } else if (index === 0) {
          // Falling Petals: Blossom ready for a while, its own cooldown kept here meanwhile.
          blossom = PETALS.window;
          petals = ability.cooldown;
          self.cooldowns[0] = 0;
        } else if (ability.move === 'moon') ripe = moonlight > 0;
      },
      tick(dt) {
        if (blossom > 0) {
          blossom -= dt;
          petals = Math.max(0, petals - dt);
          self.cooldowns[0] = blossom > 0 ? 0 : petals;
        }
        // The moon ripens every so often, and she has Moonlight a moment.
        if (moonlight > 0) moonlight = Math.max(0, moonlight - dt);
        waxing += dt;
        if (waxing >= MOON.every) {
          waxing -= MOON.every;
          moonlight = MOON.light;
        }
      },
      lit: () => moonlight > 0,
      buffs: () => (moonlight > 0 ? [{ ...MOONLIGHT, left: moonlight }] : []),
    };
  },
};
