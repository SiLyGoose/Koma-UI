import { stateArt } from '../../shown';
import type { MinionDef } from '../dragon/minions';

/*
 * Ascalon's Synthetic Demon Beasts, as King's Raid's playtest has them (its creatures 35921 to 35925, their skills 3592100 to
 * 3592530, and the 3400095 to 3400097 its waves give them: KR-extracted/scripts/dump-minions.mjs): those of the four waves
 * before him (./waves.ts) and those his Dimension Warp calls up (./skills.ts). Each fights by itself as the Dragon Raid's
 * minions do (../../fight.ts minionsAdvance), its blows shares of its ATK (King's Raid's GetPhysicalDamageR, thousandths).
 * Every one of them is as Ascalon's Might has it (3400095): nothing slows it, nothing has it take more (its Weakness held at
 * 0); and nothing holds it (its IgnoreCc). Their numbers are King's Raid's, unscaled (./waves.ts); all but the Discarded
 * melee one take twice the DMG (their star grades' DefensePower -1000: ./waves.ts TAKEN).
 * Where King's Raid's moves don't map onto the fight's, as near as it goes, said at each: a dash and the half second it is
 * untargetable are part of its move's time; a cone is round its target; a knock back is a knock down of as long.
 */

/** Ascalon's beasts, by their playtest names: the Discarded (35921, and 35925 from afar), the Failed (35922), the Experimented (35923) and the Ceased (35924). */
export type AscalonKind = 'beast-discarded' | 'beast-discarded-ranged' | 'beast-failed' | 'beast-experimented' | 'beast-ceased';

/** How every one of them is (Ascalon's Might on them, and their IgnoreCc). */
const MIGHT = { deals: 'physical', steady: true, unweakened: true, rest: 0 } as const;

export const ASCALON_MINIONS: Readonly<Record<AscalonKind, MinionDef>> = {
  // The Discarded, up close (35921, a wave's first): two claws of 200% (3592100, at 0.8 and 1.5 s of 3), going for a knight
  // while there is one (the EC_Target the first wave's puts on every knight, 3400096, and its 3400097); every 10 seconds (5 the
  // first) two blows of 250% (3592110, at 1.7 and 2 s of 2.9).
  'beast-discarded': {
    name: 'Synthetic Demon Beast Discarded',
    size: 1.8,
    ...MIGHT,
    attack: { length: 3, lands: [0.8, 1.5], share: 2, reach: 0, range: 1.5, knights: true },
    skill: { cooldown: 10, first: 5, length: 2.9, lands: [1.7, 2], share: 2.5, reach: 0, range: 2 },
  },
  // The Discarded, from afar (35925, two a wave): 250% on whom it goes for and 50% on those within 4 m of it, all of them
  // attacking 20% slower for 5 seconds (3592500, at 2 s of 3.4; its ModAttackSpeedR -200); a knight while there is one (3400097).
  'beast-discarded-ranged': {
    name: 'Synthetic Demon Beast Discarded',
    size: 1.8,
    ...MIGHT,
    attack: {
      length: 3.4,
      lands: [2],
      share: 2.5,
      splash: 0.5,
      reach: 4,
      range: 10,
      knights: true,
      leaves: { slow: { name: 'Synthetic Demon Beast Discarded', about: 'ATK Spd down.', icon: '🐌', art: stateArt('SpeedDown'), harmful: true, pace: 0.8, lasts: 5 } },
    },
  },
  // The Failed (35922, two a wave): two blows of 25% (3592200, at 1 and 2.4 s of 3.8). Its skills: every 20 seconds (1 the
  // first) it leaps on any hero (3592210 to 3592212, 3.8 s with its dash) and strikes twice, 50% each (3592230, at 2.5 and
  // 3.5 s of 4.2); every 20 (12 the first) 35% on all within 4 m and its blows 30% harder for 10 seconds (3592220, at 1.8 s of 4.2).
  'beast-failed': {
    name: 'Synthetic Demon Beast Failed',
    size: 1.4,
    ...MIGHT,
    attack: { length: 3.8, lands: [1, 2.4], share: 0.25, reach: 0, range: 1.5 },
    skills: [
      { cooldown: 20, first: 1, length: 8, lands: [6.3, 7.3], share: 0.5, reach: 0, random: true },
      { cooldown: 20, first: 12, length: 4.2, lands: [1.8], share: 0.35, reach: 4, rouses: { deals: 1.3, lasts: 10 } },
    ],
  },
  // The Experimented (35923, two of Dimension Warp's): two blows of 50% (3592300, at 0.5 and 0.8 s of 1.7). Its skills: every
  // 15 seconds (1 the first) it dashes at the hero furthest off (3592310 to 3592312, 2.7 s) and lands nine blows of 30% on all
  // within 4 m (3592330, from 1.3 to 2.9 s of 3.2), its last leaving them taking 30% more DMG for 10 seconds (here each blow
  // does, the last's lasting as long); every 15 (12 the first) its blows 35% harder for 10 seconds (3592320, as it begins: King's
  // Raid's at 2.5 s of 3.5).
  'beast-experimented': {
    name: 'Synthetic Demon Beast Experimented',
    size: 1.5,
    ...MIGHT,
    attack: { length: 1.7, lands: [0.5, 0.8], share: 0.5, reach: 0, range: 3 },
    skills: [
      {
        cooldown: 15,
        first: 1,
        length: 5.9,
        lands: [4, 4.2, 4.4, 4.6, 4.8, 5, 5.2, 5.4, 5.6],
        share: 0.3,
        reach: 4,
        far: true,
        leaves: { expose: { name: 'Synthetic Demon Beast Experimented', about: 'Takes 30% more DMG.', icon: '🎯', art: stateArt('DefenseDown'), harmful: true, takes: 1.3, lasts: 10 } },
      },
      { cooldown: 15, first: 12, length: 3.5, lands: [], share: 0, reach: 0, rouses: { deals: 1.35, lasts: 10 } },
    ],
  },
  // The Ceased (35924, two of Dimension Warp's): three blows of 100% (3592400, at 0.6, 0.8 and 1 s of 3.3). Its skills, in its
  // slots' order: every 15 seconds (10 the first) 300% on all within 3 m, knocking them down 3 seconds (3592410, at 1.8 s of
  // 3.8); every 25 (at once the first) a ward that holds the next 20 blows on it to 1 each (3592420's SetDamage, as it begins:
  // King's Raid's at 2 s of 3); every 20 (5 the first) 120% before it (4 m, 90°: here round whom it goes for), knocking them back
  // a second (3592430, at 1.8 s of 3).
  'beast-ceased': {
    name: 'Synthetic Demon Beast Ceased',
    size: 1.3,
    ...MIGHT,
    attack: { length: 3.3, lands: [0.6, 0.8, 1], share: 1, reach: 0, range: 3 },
    skills: [
      { cooldown: 15, first: 10, length: 3.8, lands: [1.8], share: 3, reach: 3, range: 3, leaves: { freeze: 3 } },
      { cooldown: 25, first: 0, length: 3, lands: [], share: 0, reach: 0, ward: 20 },
      { cooldown: 20, first: 5, length: 3, lands: [1.8], share: 1.2, reach: 4, range: 3, leaves: { freeze: 1 } },
    ],
  },
};
