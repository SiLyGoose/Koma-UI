import type { HeroClass } from '../../heroes/kit';
import type { KarmaCard } from '../boss';

/*
 * The karma dungeons' cards, King's Raid's 49 (its KarmaCardTable: KR-extracted/briefs/divine-punishment/gen/karma-cards.md),
 * by their numbers. 42 Normal ones, two groups for each class (GroupChance 571 each): its ATK 10%, 20% or 30% higher (a
 * Knight's 20%, 40% or 60%), or its HP 20%, 40% or 60% (Rare, Epic, Ancient: UniqueChance 500, 350, 150), as many times as
 * they are taken. And 7 Legend ones (GroupChance 90), each taken once at most. What a Legend card does to threat (the bosses'
 * HighestThreatener) is not here: no threat is kept, so card 51 does nothing, and 43 and 46 only the rest of what they say.
 */

/** A class's two Normal groups' cards: its ATK (`atk`: the three shares) and its HP, from card `id` on, in groups `group` and `group` + 1. */
function normal(cls: HeroClass, name: string, id: number, group: number, atk: readonly [number, number, number]): KarmaCard[] {
  const chances = [500, 350, 150] as const;
  const hp = [0.2, 0.4, 0.6] as const;
  return [
    ...atk.map((share, i) => ({ id: id + i, group, groupChance: 571, chance: chances[i] as number, classes: [cls], text: `Increases ATK of ${name} by ${Math.round(share * 100)}%.`, does: { atk: share } })),
    ...hp.map((share, i) => ({ id: id + 3 + i, group: group + 1, groupChance: 571, chance: chances[i] as number, classes: [cls], text: `Increases HP of ${name} by ${Math.round(share * 100)}%.`, does: { hp: share } })),
  ];
}

const LOW = [0.1, 0.2, 0.3] as const;
const ALL: readonly HeroClass[] = ['warrior', 'knight', 'assassin', 'archer', 'mechanic', 'wizard', 'priest'];

export const KARMA_CARDS: readonly KarmaCard[] = [
  ...normal('warrior', 'Warrior', 1, 0, LOW),
  ...normal('knight', 'Knight', 7, 2, [0.2, 0.4, 0.6]),
  ...normal('assassin', 'Assassin', 13, 4, LOW),
  ...normal('mechanic', 'Mechanic', 19, 6, LOW),
  ...normal('archer', 'Archer', 25, 8, LOW),
  ...normal('wizard', 'Wizard', 31, 10, LOW),
  ...normal('priest', 'Priest', 37, 12, LOW),
  {
    id: 43,
    group: 14,
    groupChance: 90,
    chance: 1000,
    most: 1,
    classes: ['warrior', 'knight'],
    text: '[Knight·Warrior] Increases Cooldown of all skills by 3 sec. Upon using a skill, brings 30% Threat Value from the hero with the highest Threat Value.',
    does: { cooldown: 3 },
  },
  { id: 45, group: 16, groupChance: 90, chance: 1000, most: 1, classes: ['warrior', 'knight'], text: '[Knight·Warrior] Increases ATK and HP by 150%. Reduces Mana Recovery Rate by 40%.', does: { atk: 1.5, hp: 1.5, mana: -0.4 } },
  { id: 46, group: 17, groupChance: 90, chance: 1000, most: 1, classes: ['assassin', 'archer', 'mechanic'], text: '[Assassin·Archer·Mechanic] Reduces DMG dealt to enemies by 20%. Reduces Threat Value Gains by 35%.', does: { dmg: -0.2 } },
  { id: 48, group: 19, groupChance: 90, chance: 1000, most: 1, classes: ALL, text: 'Reduces DMG all allies deal by 40%. Increases Max HP of all allies by 400%.', does: { dmg: -0.4, hp: 4 } },
  { id: 49, group: 20, groupChance: 90, chance: 1000, most: 1, classes: ALL, text: 'Increases DMG all allies deal by 200%. Reduces Max HP of all allies by 50%.', does: { dmg: 2, hp: -0.5 } },
  { id: 51, group: 22, groupChance: 90, chance: 1000, most: 1, classes: ['assassin'], text: '[Assassin] Reduces Threat Value Gains to 40%.', does: {} },
  { id: 52, group: 23, groupChance: 90, chance: 1000, most: 1, classes: ['archer', 'mechanic', 'wizard'], text: '[Archer·Mechanic·Wizard] Increases ATK by 200%. Increases HP by 150%.', does: { atk: 2, hp: 1.5 } },
];
