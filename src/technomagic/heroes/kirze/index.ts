import { KIRZE_ASSETS, skillPicture } from '../../assets';
import type { Buff } from '../../hud/buff';
import { CLASS_STATS, type HeroDef, type Passive } from '../kit';

/*
 * Kirze's skills, as the game has them (what each costs and how long before it can be used again are
 * the game's too):
 * - Slash, Blade of Judgment!: seven cuts round itself, then a blow in front of it that knocks the boss down.
 * - Disperse, Crystal Haze!: a burst that stuns; then, for a while, it is quickened, and a shockwave goes
 *   out from it every so often that stuns again.
 * - Bloom, Crimson Flower!: crystals in a line that then burst, and curse the boss: its attacks are slowed,
 *   every blow on it while cursed is counted, and when the curse ends it bursts, the harder for each one.
 * What is drawn for each is ./fx.ts; what her body does, ./moves.ts.
 */
const JUDGMENT = { cut: 1500, blow: 6000, down: 3 };
const HAZE = { burst: 9000, stun: 2, lasts: 15, quicker: 1.5, every: 2, wave: 2500, waveStun: 1 };
const FLOWER = { line: 8000, burst: 12000, slow: 0.5, slowed: 5, curse: 10, end: 6000, each: 800 };

const art = (index: number): string => skillPicture(KIRZE_ASSETS, index);

/**
 * Her passive, the game's End to Evil Deeds!: the game says how much longer the stuns last and how much
 * likelier a critical blow is, and leaves how much harder she hits unsaid.
 */
const EVIL_DEEDS: Passive = {
  attack: 1.2,
  crit: 0.2,
  control: 1.3,
  shown: { name: 'End to Evil Deeds!', about: 'Passive. Her blows are harder and more often critical, and her stuns on a boss last 30% longer.', icon: '⚜️', image: art(3) },
};
/** What Crystal Haze gives her for a while: shown beside her passive, with how long it has left. */
const AWAKENING: Buff = { name: 'Arcane Crystal Awakening', about: 'Quickened, and a shockwave goes out from her every 2 seconds.', icon: '💠', image: art(1) };

export const KIRZE: HeroDef = {
  id: 'kirze',
  name: 'Kirze',
  class: 'warrior',
  assets: KIRZE_ASSETS,
  // A warrior whose blows are magical: as her class stands, otherwise.
  stats: { ...CLASS_STATS.warrior, deals: 'magical' },
  abilities: [
    { name: 'Slash, Blade of Judgment!', about: 'Seven cuts as she spins, then a blow that knocks the boss down for 3 seconds.', icon: '🌀', image: art(0), move: 'judgment', cooldown: 9, cost: 2 },
    { name: 'Disperse, Crystal Haze!', about: 'A burst that stuns the boss for 2 seconds. Then for 15 seconds she is 50% quicker, and a shockwave goes out from her every 2 seconds that stuns it for 1.', icon: '💠', image: art(1), move: 'haze', cooldown: 17, cost: 3 },
    { name: 'Bloom, Crimson Flower!', about: 'Crystals in a line to the boss, then they burst: its attacks are 50% slower for 5 seconds, and it is cursed for 10. When the curse ends it bursts, the harder for every blow landed on the boss meanwhile.', icon: '🌺', image: art(2), move: 'flower', cooldown: 20, cost: 4 },
  ],
  passive: EVIL_DEEDS,
  join(fight, self) {
    /** How long she is quickened for yet (Crystal Haze), and until her next shockwave. */
    let awake = 0;
    let wave = 0;
    /** Her curse on the boss: how long it has left, and the blows counted against it. */
    let curse: { left: number; blows: number } | null = null;

    return {
      lands: {
        // Seven cuts as she spins, then the blow that knocks the boss down.
        judgment(part) {
          if (part < 7) return fight.hit(self, JUDGMENT.cut);
          fight.hit(self, JUDGMENT.blow);
          fight.stun(JUDGMENT.down, { down: true, by: self });
        },
        // The burst over the whole field: the boss stunned, and she is quickened.
        haze() {
          fight.hit(self, HAZE.burst);
          fight.stun(HAZE.stun, { by: self });
          awake = HAZE.lasts;
          wave = HAZE.every;
        },
        // Crystals up in a line to the boss; then they burst, and the boss is cursed.
        flower(part) {
          if (part === 0) return fight.hit(self, FLOWER.line);
          fight.hit(self, FLOWER.burst);
          curse = { left: FLOWER.curse, blows: 0 };
          fight.slow(FLOWER.slow, FLOWER.slowed);
        },
      },
      // A blow on the boss while it is cursed is counted.
      struck() {
        if (curse) curse.blows++;
      },
      tick(dt) {
        // Quickened: a shockwave out from her every so often, while she is on the field, that hurts the boss and stuns it.
        if (awake > 0) {
          awake = Math.max(0, awake - dt);
          wave -= dt;
          if (wave <= 0 && fight.field.includes(self)) {
            wave += HAZE.every;
            fight.cue(self, 'wave');
            fight.hit(self, HAZE.wave);
            fight.stun(HAZE.waveStun, { by: self });
          }
        }
        // Her curse runs out and bursts, the harder for each blow counted (what the burst does isn't one of them).
        if (curse) {
          curse.left -= dt;
          if (curse.left <= 0) {
            const { blows } = curse;
            curse = null;
            fight.cue(self, 'curse');
            fight.hit(self, FLOWER.end + FLOWER.each * blows, false);
          }
        }
      },
      pace: () => (awake > 0 ? HAZE.quicker : 1),
      lit: () => awake > 0,
      buffs: () => (awake > 0 ? [{ ...AWAKENING, left: awake }] : []),
      marks: () => (curse ? [{ text: `Curse ${Math.ceil(curse.left)} · ${curse.blows} blows`, tone: 'curse' }] : []),
    };
  },
};
