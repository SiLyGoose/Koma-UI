import { CLAUSE_ASSETS, skillPicture } from '../../assets';
import { put } from '../../combat/status';
import type { Buff } from '../../hud/buff';
import { BLOW, MAX_MANA } from '../../sim/rules';
import { CLASS_STATS, type HeroDef, type Passive } from '../kit';

/*
 * Clause's skills, as the game has them (what each costs, how long before it can be used again, and how
 * long what it does lasts are the game's; how hard each hits is not said there):
 * - Cut Ground: a leap and a blow down on the boss that stuns it.
 * - Shield Strike: a blow with the shield that leaves the boss slower to attack and easier to hurt.
 * - Guardian Shield: for a while every hero takes less from the boss.
 * His passive, Vow of Knights: when he blocks he strikes back, the boss hits less hard for a while, and
 * he gains mana. (How often he blocks is not the game's: there it comes of his gear.)
 * What is drawn for each is ./fx.ts; what his body does for each, and for his attack, ./moves.ts.
 */
const CUT_GROUND = { blow: 7000, stun: 5 };
const SHIELD_STRIKE = { blow: 4000, lasts: 20, slow: 0.67, exposed: 1.3 };
const GUARDIAN = { lasts: 20, taken: 0.75 };
const VOW = { weak: 0.8, lasts: 8, mana: 300 };

const art = (index: number): string => skillPicture(CLAUSE_ASSETS, index);

const VOW_OF_KNIGHTS: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: { name: 'Vow of Knights', about: 'Passive. When he blocks he strikes back: the boss hits 20% less hard for 8 seconds, and he gains 300 mana.', icon: '🛡️', image: art(3) },
};
/** What Guardian Shield gives every hero for a while: shown on each card, with how long it has left. */
const GUARDED: Buff = { name: 'Guardian Shield', about: 'Takes 25% less from the boss.', icon: '✨', image: art(2) };

export const CLAUSE: HeroDef = {
  id: 'clause',
  name: 'Clause',
  class: 'knight',
  assets: CLAUSE_ASSETS,
  // A knight whose blows are physical: as his class stands, otherwise (he blocks a good third of the blows that come at him).
  stats: { ...CLASS_STATS.knight, deals: 'physical' },
  abilities: [
    { name: 'Cut Ground', icon: '⚔️', image: art(0), move: 'slam', cooldown: 9, cost: 2 },
    { name: 'Shield Strike', icon: '🛡️', image: art(1), move: 'bash', cooldown: 8, cost: 1 },
    { name: 'Guardian Shield', icon: '✨', image: art(2), move: 'guard', cooldown: 12, cost: 2 },
  ],
  passive: VOW_OF_KNIGHTS,
  // Without an animation for his attack: his sword from side to side.
  attack: 'swing',
  join(fight, self) {
    return {
      lands: {
        // His attack written in code: a cut across the boss one way, then the other.
        swing() {
          fight.hit(self, BLOW);
        },
        // Down out of the air on the boss: the boss is stunned.
        slam() {
          fight.hit(self, CUT_GROUND.blow);
          fight.stun(CUT_GROUND.stun, { by: self });
        },
        // The shield into the boss: it is slower to attack, and easier to hurt, for a long while.
        bash() {
          fight.hit(self, SHIELD_STRIKE.blow);
          put(fight.foe.statuses, { name: 'Exposed', left: SHIELD_STRIKE.lasts, takes: SHIELD_STRIKE.exposed, shown: 'curse' });
          fight.slow(SHIELD_STRIKE.slow, SHIELD_STRIKE.lasts);
        },
        // The shield raised: every hero is guarded.
        guard() {
          put(fight.party, { name: GUARDED.name, left: GUARDIAN.lasts, takes: GUARDIAN.taken, shown: GUARDED });
        },
      },
      // Blocked: a blow back, the boss hits less hard for a while, and mana gained.
      blocked() {
        fight.cue(self, 'vow');
        fight.hit(self, BLOW);
        put(fight.foe.statuses, { name: 'Weakened', left: VOW.lasts, deals: VOW.weak, shown: 'slow' });
        self.mana = Math.min(MAX_MANA, self.mana + VOW.mana);
      },
    };
  },
};
