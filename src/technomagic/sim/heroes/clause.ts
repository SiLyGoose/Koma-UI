import { share } from '../combat/damage';
import { put } from '../combat/status';
import { BLOW, MAX_MANA } from '../rules';
import { t5Light } from '../perks';
import { pct, skillArt, type Buff } from '../shown';
import { CLASS_STATS, type HeroDef, type Passive } from './kit';

/*
 * Clause's skills, as the game has them (what each costs, how long before it can be used again, and how
 * long what it does lasts are the game's; how hard each hits is not said there):
 * - Cut Ground: a leap and a blow down on the boss that stuns it.
 * - Shield Strike: a blow with the shield that leaves the boss slower to attack and easier to hurt.
 * - Guardian Shield: for a while every hero takes less from the boss.
 * His passive, Vow of Knights: when he blocks he strikes back, the boss hits less hard for a while, and
 * he gains mana. (How often he blocks is not the game's: there it comes of his gear.)
 * What is drawn for each is ../../heroes/clause/fx.ts; what his body does for each, and for his attack, ../../heroes/clause/moves.ts.
 *
 * His own perks (../perks.ts) are King's Raid's. Two do nothing here: Cut Ground's Dark (the boss isn't drawn in, so it
 * costs no more), and Vow of Knights' Light (its blow back is at once here already). Guardian Shield guards with less
 * taken rather than more DEF: its Light's 40% more makes that 35% less. Transcend 5's Dark doesn't say how long its
 * DEF lasts: as long as it waits (10 seconds).
 */
const CUT_GROUND = { blow: 7000, stun: 5 };
// (Its slow, as the game has it: an ATK Spd reduction, in points.)
const SHIELD_STRIKE = { blow: 4000, lasts: 20, speed: 500, exposed: 1.3 };
const GUARDIAN = { lasts: 20, taken: 0.75 };
const VOW = { weak: 0.8, lasts: 8, mana: 300 };
/** His own perks' numbers: Shield Strike's stun, Guardian Shield's more (and its P.DMG taken), Vow of Knights' less ATK, and Transcend 5's Dark's guard for every ally (how long, and how long it waits). */
const PERKS = { bashStun: 1, guardMore: 1.4, guardPhysical: 0.75, weaker: 0.1, ward: { lasts: 10, every: 10, defends: 1.2, critResist: 200 } };

const art = skillArt('clause');

const VOW_OF_KNIGHTS: Passive = {
  attack: 1,
  crit: 0,
  control: 1,
  shown: {
    name: 'Vow of Knights',
    about: `Passive. When he blocks he strikes back: the boss hits ${pct(1 - VOW.weak)} less hard for ${VOW.lasts} seconds, and he gains ${VOW.mana} mana.`,
    icon: '🛡️',
    art: art(3),
  },
  words: `Upon blocking, deals P.DMG to frontal enemies and decreases ATK of affected targets by ${pct(1 - VOW.weak)} for ${VOW.lasts} sec. Recovers ${VOW.mana} MP after hitting the target. When an ally excluding self takes DMG increases all allies' P.DEF by 20% and P.Crit Resistance by 200 for 5 sec. This effect only activates once every 10 sec.`,
};
/** What Guardian Shield gives every hero for a while: shown on each card, with how long it has left. */
const GUARDED: Buff = { name: 'Guardian Shield', about: `Takes ${pct(1 - GUARDIAN.taken)} less from the boss.`, icon: '✨', art: art(2) };
/** What his Transcend 5's Dark gives every ally when another is hit. */
const WARDED: Buff = { name: 'Knight’s Guard', about: `P.DEF +${pct(PERKS.ward.defends - 1)} and P.Crit Resist +${pct(share(PERKS.ward.critResist))}.`, icon: '🛡️', art: art(3) };

export const CLAUSE: HeroDef = {
  id: 'clause',
  name: 'Clause',
  class: 'knight',
  skins: ['Clause'],
  // A knight whose blows are physical: as his class stands, otherwise (he blocks a good third of the blows that come at him).
  stats: { ...CLASS_STATS.knight, deals: 'physical' },
  abilities: [
    {
      name: 'Cut Ground',
      about: `A leap and a blow down on the boss that stuns it for ${CUT_GROUND.stun} seconds.`,
      words: `Leaps into the air and deals P.DMG to enemies in range, stunning them for ${CUT_GROUND.stun} sec.`,
      icon: '⚔️',
      art: art(0),
      move: 'slam',
      cooldown: 9,
      cost: 2,
    },
    {
      name: 'Shield Strike',
      about: `A blow with his shield: for ${SHIELD_STRIKE.lasts} seconds the boss attacks ${pct(share(SHIELD_STRIKE.speed))} slower and takes ${pct(SHIELD_STRIKE.exposed - 1)} more.`,
      words: `Deals P.DMG proportional to P.DEF to enemies in range and knocks them back. Hit enemies' All DEF and ATK Spd is reduced by ${pct(SHIELD_STRIKE.exposed - 1)} and ${SHIELD_STRIKE.speed} for ${SHIELD_STRIKE.lasts} sec, respectively. Upon blocking an attack, skill cooldown is reduced by 0.5 sec.`,
      icon: '🛡️',
      art: art(1),
      move: 'bash',
      cooldown: 8,
      cost: 1,
    },
    {
      name: 'Guardian Shield',
      auto: { keeps: GUARDED.name },
      about: `For ${GUARDIAN.lasts} seconds every hero takes ${pct(1 - GUARDIAN.taken)} less from the boss.`,
      words: `All allies' P.DEF is increased for ${GUARDIAN.lasts} sec and P.Crit Resistance is increased by 300, and reduces P.DMG they take by ${pct(1 - GUARDIAN.taken)}..`,
      icon: '✨',
      art: art(2),
      move: 'guard',
      cooldown: 12,
      cost: 2,
    },
  ],
  passive: VOW_OF_KNIGHTS,
  perks: {
    's1-light': { words: 'Cooldown is reduced by 2 sec.', skill: { index: 0, cooldown: -2 } },
    's1-dark': { words: 'In exchange for 1 additional Mana Cost, the skill has a 100% chance to draw the target in.' },
    's2-light': { words: 'Target takes 25% increased P.DMG for 10 sec.', skill: { index: 1, mark: { name: 'Physical Weakness', takes: { physical: 1.25 }, lasts: 10 } } },
    's2-dark': { words: 'Stuns the enemy for 1 sec.' },
    's3-light': { words: 'DEF boost is increased by 40%.' },
    's3-dark': { words: 'Receives 25% reduced P.DMG for the duration.' },
    's4-light': { words: 'Casting time is greatly boosted.' },
    's4-dark': { words: 'Reduces an additional 10% of ATK.' },
    't5-light': t5Light('ATK, DEF, HP +15% / P.Block +200', { blockPhysical: 200 }),
    't5-dark': { words: "When an ally other than this hero is hit by an attack, increases all allies' P.DEF by 20% and P.Crit Resist by 20% (10 sec Cooldown)." },
  },
  // Without an animation for his attack: his sword from side to side.
  attack: 'swing',
  // His animations: one slash where he stands; Guardian Shield, his shield brought down to the ground.
  timing: { attack: [{ lands: [0.68], until: 0.8 }], skills: { guard: { lands: [1.75], until: 2.6 } } },
  join(fight, self) {
    /** Until his Transcend 5's Dark may guard every ally again. */
    let warding = 0;
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
          fight.slow(SHIELD_STRIKE.speed, SHIELD_STRIKE.lasts);
          if (self.perks.has('s2-dark')) fight.stun(PERKS.bashStun, { by: self });
        },
        // The shield raised: every hero is guarded.
        guard() {
          // (Its Light: more less taken; its Dark: less again of physical blows.)
          const taken = self.perks.has('s3-light') ? 1 - (1 - GUARDIAN.taken) * PERKS.guardMore : GUARDIAN.taken;
          put(fight.party, { name: GUARDED.name, left: GUARDIAN.lasts, takes: self.perks.has('s3-dark') ? { physical: taken * PERKS.guardPhysical, magical: taken } : taken, shown: GUARDED });
        },
      },
      // Blocked: a blow back, the boss hits less hard for a while, and mana gained.
      blocked() {
        fight.cue(self, 'vow');
        fight.hit(self, BLOW);
        put(fight.foe.statuses, { name: 'Weakened', left: VOW.lasts, deals: VOW.weak - (self.perks.has('s4-dark') ? PERKS.weaker : 0), shown: 'slow' });
        self.mana = Math.min(MAX_MANA, self.mana + VOW.mana);
      },
      tick(dt) {
        warding = Math.max(0, warding - dt);
      },
      // Another hero hit: every ally guarded better (his Transcend 5's Dark), now and then.
      hurt(who) {
        if (!self.perks.has('t5-dark') || who === self || warding > 0 || self.hp <= 0) return;
        warding = PERKS.ward.every;
        put(fight.party, { name: WARDED.name, left: PERKS.ward.lasts, defends: { physical: PERKS.ward.defends }, critResist: { physical: PERKS.ward.critResist }, shown: WARDED });
      },
    };
  },
};
