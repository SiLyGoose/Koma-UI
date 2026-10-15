import { KEPT } from '../technomagic/assets';
import { heroSkills } from './skills';

/*
 * The heroes page's Transcend tab: each hero's transcendence perks in King's Raid's own words, as
 * kingsraid.shodyra.com has them, with their pictures (public/technomagic/transcend/: each hero's own in its
 * folder, the rest in perks/). Which ones a hero has is the bot's (its data/transcend.ts: the same ids, what
 * each costs, and the TP a hero has); a hero of a class has its class's Transcend 2 perks.
 */

/** The TP each hero has to spend (the bot's TRANSCEND_POINTS). */
export const TRANSCEND_POINTS = 80;

export type TranscendTier = 1 | 2 | 3 | 5;

export interface Perk {
  /** The bot's id. */
  id: string;
  tier: TranscendTier;
  /** What it costs in TP. */
  cost: number;
  /** Its name: a Transcend 3 perk's is its skill's. */
  name: string;
  /** A Transcend 3 or 5 perk's side. */
  side: 'light' | 'dark' | null;
  text: string;
  picture: string;
}

const FOLDER = `${KEPT}/transcend`;

/** Transcend 1: everyone's, 10 TP each (the bot's ids, and the name of each one's picture). */
const COMMON: readonly (readonly [id: string, name: string, text: string])[] = [
  ['atk-up', 'ATK Up', 'ATK is increased by 30%'],
  ['hp-up', 'HP Up', 'HP is increased by 30%'],
  ['def-up', 'DEF Up', 'DEF is increased by 35%'],
  ['crit-resist-up', 'Crit Resist Up', 'Crit Resistance is increased by 250'],
  ['monster-hunting', 'Monster Hunting', 'Increases DMG to Non-Hero enemies by 10% and takes 10% reduced DMG'],
];

/** Transcend 2: each class's five, 15 TP each (the bot's class-1 to class-5): the name of each one's picture, its name and its words. */
const CLASS: Readonly<Record<string, readonly (readonly [file: string, name: string, text: string])[]>> = {
  warrior: [
    ['opportune-strike', 'Opportune Strike', 'Crit Chance is increased by 150 and Crit DMG is increased by 30%.'],
    ['warlike', 'Warlike', 'Per each enemy, ATK is increased by 7% and CC Resistance is increased by 30. Can be stacked up to max 10 times.'],
    ['offensive-guard', 'Offensive Guard', 'ATK rises equal to half of P.DEF and received P.DMG decreases by 15%.'],
    ['tactical-foresight', 'Tactical Foresight', 'Dodge rate is increased by 200 and takes 10% reduced DMG.'],
    ['blood-wrath', 'Blood Wrath', 'Increases Lifesteal by 200 and ATK Spd by 200.'],
  ],
  priest: [
    ['vengeful-curse', 'Vengeful Curse', "When hit by an enemy, attacker's DMG is reduced by 70% for 3 sec. This effect only activates once in 40 sec, and cannot be dispelled."],
    ['goddess-blessing', 'Goddess Blessing', "All allies' Crit Chance is increased by 150. When overlapped with the same perk, only gains 50."],
    [
      'inner-peace',
      'Inner Peace',
      "Per every sec, all allies' HP is healed by 1%, and CC resistance is increased by 75. When overlapped with the same perk, only 0.3% HP per sec is healed, and CC resistance is increased by 25.",
    ],
    ['blessing-of-mana', 'Blessing of Mana', 'Mana recovery per second rises by 250%.'],
    ['swiftness', 'Swiftness', "All allies' ATK Spd is increased by 150. When overlapped with the same perk, only gains 50."],
  ],
  wizard: [
    ['deception', 'Deception', 'When receiving DMG, becomes immune to the next 3 hits of DMG. This effect is activated every 40 sec.'],
    ['moral-rise', 'Moral Rise', "All allies' ATK is increased by 15%. When overlapped with the same perk, only 3% applies."],
    ['blessing-of-mana', 'Blessing of Mana', 'Mana recovery per second rises by 250%.'],
    ['circuit-burst', 'Circuit Burst', 'Receives 20% more DMG but gains 40% ATK. ACC is increased by 200.'],
    ['destruction', 'Destruction', 'Increases Crit Chance by 200 and DEF Penetration by 200.'],
  ],
  assassin: [
    ['target-weakness', 'Target Weakness', 'ATK rises by 20% and DEF Penetration rises by 200.'],
    ['swift-and-nimble', 'Swift and Nimble', 'Per every sec, Dodge rate is increased by 100. This effect can be stacked up to max 5 times, and resets upon dodging an attack.'],
    ['tactical-foresight', 'Tactical Foresight', 'Dodge rate is increased by 200 and takes 10% reduced DMG.'],
    ['opportune-strike', 'Opportune Strike', 'Crit Chance is increased by 150 and Crit DMG is increased by 30%.'],
    ['vital-detection', 'Vital Detection', 'Upon Attack, causes the target to take 10% increased All DMG and have their ATK Spd reduced by 100 for 10 sec. This effect activates once every 3 sec.'],
  ],
  archer: [
    ['precision-shot', 'Precision Shot', 'ATK rises by 20% and ACC rises by 400.'],
    ['eagle-eye', 'Eagle Eye', "All allies' Penetration is increased by 150, and ACC is increased by 75. When overlapped with the same perk, gains only 50 Penetration and 25 ACC."],
    ['mortal-wound', 'Mortal Wound', 'Successful Crit Attack reduces enemy recovery rate by 50% and deals Physical continuous DMG every second equal to 20% of ATK. Does not stack.'],
    ['opportune-strike', 'Opportune Strike', 'Crit Chance is increased by 150 and Crit DMG is increased by 30%.'],
    ['concentration', 'Concentration', 'Every 6 sec, increases own Crit DMG by 4%. This effect can be stacked up to a max of 20 times and cannot be dispelled.'],
  ],
  knight: [
    ['experienced-fighter', 'Experienced Fighter', 'Attacked targets take 20% more DMG. Does not stack.'],
    ['excellent-strategy', 'Excellent Strategy', "All allies' CC ACC is increased by 150. When overlapped with the same perk, only 50 applies."],
    ['battle-cry', 'Battle Cry', "All allies' Max HP is increased by 15%. When overlapped with the same perk, only 5% of effect applies."],
    ['shield-of-protection', 'Shield of Protection', 'Block Rate is increased by 200 and CC resistance is increased by 300.'],
    ['swift-move', 'Swift Move', 'Increases ATK Spd by 400 and ACC by 200.'],
  ],
  mechanic: [
    ['target-weakness', 'Target Weakness', 'ATK rises by 20% and DEF Penetration rises by 200.'],
    ['ready-cannons', 'Ready Cannons', 'Mana recovery per second rises by 62.5% per every enemy.'],
    ['pressure-point', 'Pressure Point', 'Crit Chance is increased by 400.'],
    ['special-bullet', 'Special Bullet', 'Attacked target loses 15% of ATK and 150 of Crit Chance. Does not stack.'],
    ['amplified-gunpowder', 'Amplified Gunpowder', "Increases Crit DMG of all allies by 30%. When overlapped with the same perk, only 10% of effect applies."],
  ],
};

/** Transcend 3 and 5: by hero id, each of its skills' Light then Dark (its passive's last), then its own Light and Dark; 15 TP each. */
const OWN: Readonly<Record<string, readonly string[]>> = {
  kirze: [
    'Reduces Cooldown by 3% per each enemy hit.',
    'If there is only 1 enemy, DMG is increased by 100%.',
    'The duration of stun from the shockwave increases by 0.5 sec against Non-Hero enemies.',
    'While under [Arcane Crystal Awakening], self deals 20% increased DMG to Non-Hero enemies.',
    'Increases ATK Spd reduction by 300.',
    'If there is only 1 enemy, inflicts 2 stacks of [Arcane Crystal Energy].',
    'At the beginning of each battle, self deals 25% increased DMG to Non-Hero enemies for 20 sec.',
    'Deals 15% increased DMG to Bosses.',
    'ATK, DEF, HP +15% / ATK Spd +100',
    'Every normal and Skill attack increases ATK Spd by 5. This effect can be stacked up to max 100 times.',
  ],
  clause: [
    'Cooldown is reduced by 2 sec.',
    'In exchange for 1 additional Mana Cost, the skill has a 100% chance to draw the target in.',
    'Target takes 25% increased P.DMG for 10 sec.',
    'Stuns the enemy for 1 sec.',
    'DEF boost is increased by 40%.',
    'Receives 25% reduced P.DMG for the duration.',
    'Casting time is greatly boosted.',
    'Reduces an additional 10% of ATK.',
    'ATK, DEF, HP +15% / P.Block +200',
    "When an ally other than this hero is hit by an attack, increases all allies' P.DEF by 20% and P.Crit Resist by 20% (10 sec Cooldown).",
  ],
  'fallen-frey': [
    'Increases All DMG the hit enemies take by 20% for 10 sec.',
    'Increases Mana Cost by 1 and Heal Rate by 100%.',
    'Changes the target of shield to all allies.',
    'Increases All Block Chance of shielded allies by 400.',
    'Increases DMG by 40%.',
    'Each hit reduces Mana by 200.',
    'At the beginning of the first battle, grants [Blessing of the Fallen Angel] to all allies excluding self, reducing All DMG the targets take by 10% and increasing All DEF by 20%. The [Blessing of the Fallen Angel] effect is irremovable.',
    "At the beginning of the first battle, grants [Bond of the Fallen Angel] to 1 ally with the highest ATK excluding self, increasing the target's ATK Spd by 200 and ATK equal to 7% of Fallen Frey's ATK. The [Bond of the Fallen Angel] effect is irremovable.",
    'ATK, DEF, HP +15% / Crit Chance +100',
    'At the beginning of each battle, increases ATK Spd of the ally with the highest ATK excluding self by 150 and its DMG dealt to Non-Hero enemies by 15% for 30 sec. This effect is irremovable.',
  ],
  gremory: [
    'When there is 1 enemy, additional M.DMG dealt to bosses ignores DEF.',
    "[Pochi's Mark] additionally reduces M.DEF by 6%.",
    "The M.Block Chance Reduction effect of [Puchi's Mark] will fix the M.Block Chance to 0 instead.",
    'Knocks the target away instead of inflicting Stun.',
    'Reduces Mana Cost by 1.',
    'Increases Mana Cost by 1 and DMG by 100%.',
    'Increases All DMG Reduction effect by 20% while in use.',
    "At the beginning of each battle, [Eh, whatever. I'm gonna sleep.] becomes activated.",
    'ATK, DEF, HP +15% / Crit Chance +100',
    'Increases DMG dealt to Non-Hero enemies by 50% when there is 1 enemy.',
  ],
  annette: [
    'Target takes 25% increased M.DMG for 10 sec.',
    'Charge amount is boosted by 40% upon use.',
    'Cooldown is reduced by 3 sec.',
    'Charge amount is boosted by 40% upon use.',
    'DMG is increased by 40%.',
    'Target takes 25% increased M.DMG.',
    'ATK boost is increased by 40%.',
    'Overcharge duration is increased by 3 sec.',
    'ATK, DEF, HP +15% / ATK Spd +100',
    "When Overcharge activates, increases all allies' ATK Spd by 200, and increases the ATK of all allies by 5% of Annette's ATK.",
  ],
  morrah: [
    'ATK Spd is increased by 200 for 15 sec.',
    'Reduces cooldown by 6% per each enemy hit.',
    'M.Block rate is boosted by 20%.',
    'While Hellfire is active, deals DMG based on own M.DEF to nearby enemies.',
    'DMG is increased by 40%.',
    'Heals HP equal to 40% of DMG dealt.',
    'Increases own M.DEF by 5% per each block. Max stack is 10.',
    'Target with over 100 stacks of Flame takes 40% increased M.DMG.',
    'ATK, DEF, HP +15% / M.Block +200',
    'Flame stack DMG is increased by 100%, and max stack number is changed to 120.',
  ],
  laias: [
    'Heal rate is increased by 40%.',
    'Upon healing, M.Crit Resistance rises by 25%.',
    'Changes the target to the ally with the highest ATK.',
    'Mana cost is reduced by 1.',
    'DMG effect occurs every 3 sec.',
    'Heals all allies by 15% of their max HP.',
    'M.DEF increase rate increases by 20%, and M.Crit Resistance increases by 150.',
    'Increases self CC Resist by 400.',
    'ATK, DEF, HP +15% / M.Block +200',
    'Recovers 350 Mana of all allies every 3 sec.',
  ],
  seria: [
    "[Mysterious Sword - Falling Petals] - Mana cost is reduced by 1. [Mysterious Sword - Blossom] - Hit enemies' heal rate is reduced by 50% for 5 sec.",
    "[Mysterious Sword - Falling Petals] - Target takes 25% increased M.DMG for 10 sec. [Mysterious Sword - Blossom] - Mana cost is increased by 1, and ignores enemy's DEF.",
    'Reduces Mana Cost by 1.',
    'Upon each DMG dealt, recovers 200 Mana.',
    'Dispels positive effects of all enemies in range.',
    'Increases Mana Cost by 1 and ignores DEF when attacking Non-Hero enemies.',
    'Takes 0.7% reduced DMG per stack.',
    'When the battle starts, increases DMG to Non-Hero enemies by 25% for 200 sec.',
    'ATK, DEF, HP +15% / Crit DMG +20%',
    "All of caster's attacks will be critical hits, but the caster becomes unable to block while taking 25% increased damage.",
  ],
  ezekiel: [
    'DMG is increased by 40%.',
    'After activation, ATK is increased by 40% for 5 sec.',
    'Mana cost is reduced by 1.',
    'When activated during Fury state, ignores target DEF.',
    'Becomes immune to CC during activation.',
    'If there is 1 enemy, DMG is increased by 100%.',
    'When in Fury state, heal rate is increased by 50%.',
    "Per every stacked 'Cursed Blood', takes 12% reduced DMG.",
    'ATK, DEF, HP +15% / ATK Spd +100',
    'When in Fury state, auto attack deals DMG that ignores DEF.',
  ],
  lorraine: [
    'Hit count is increased by 1.',
    'Enemies with 5 or more stacks of Poison are shackled for 3 sec upon hit.',
    'DMG is increased by 40%.',
    'Enemies hit by the final explosion effect are stunned for 2 sec.',
    'Mana cost is increased by 1 orb but DMG is boosted by 100%.',
    'Enemies with 5 or more stacks of Poison lose their positive effects.',
    'Poison stack maximum is changed to 6.',
    'There is a 20% chance that hit enemies are shackled for 2 sec.',
    'ATK, DEF, HP +15% / Crit Chance +100',
    "Every 5 sec, targets all enemies and attacks with 'Thornbush Forest' with 30% chance on each enemy.",
  ],
  valance: [
    '[Hologram] applies to 2 allies with the highest ATK.',
    '[Hologram] additionally increases Crit DMG by 50%.',
    '[Violet Force Field] additionally reduces DMG taken by 25%.',
    '[Violet Force Field] additionally increases ATK Spd by 300.',
    'Dispels positive effects from the hit target.',
    'Reduces Mana Cost by 1.',
    'Reduces DMG all allies take by 30% in Technomagic Kingdom.',
    "Additionally increases all allies' DMG dealt to Bosses by 15% in Technomagic Kingdom.",
    'ATK, DEF, HP +15% / ATK Spd +10%',
    'Reduces all DMG all allies take by 2.5% and increases All DMG all enemies take by 2.5%. This effect can be stacked up to the number of Technomagic Gear equipped to self.',
  ],
};

const SIDES = ['light', 'dark'] as const;

/** A hero's perks, in the bot's order (Transcend 1, 2, 3, then 5); only the ones it has words for. */
export function heroPerks(id: string, heroClass: string): Perk[] {
  const perks: Perk[] = COMMON.map(([perk, name, text]) => ({ id: perk, tier: 1, cost: 10, name, side: null, text, picture: `${FOLDER}/perks/${perk}.png` }));
  (CLASS[heroClass] ?? []).forEach(([file, name, text], i) => perks.push({ id: `class-${i + 1}`, tier: 2, cost: 15, name, side: null, text, picture: `${FOLDER}/perks/${file}.png` }));
  const own = OWN[id];
  if (!own) return perks;
  const skills = heroSkills(id);
  for (let i = 0; i < 4; i++) {
    for (const [j, side] of SIDES.entries()) {
      const perk = `s${i + 1}-${side}`;
      perks.push({ id: perk, tier: 3, cost: 15, name: skills[i]?.name ?? `Skill ${i + 1}`, side, text: own[i * 2 + j] ?? '', picture: `${FOLDER}/${id}/${perk}.png` });
    }
  }
  for (const [j, side] of SIDES.entries()) {
    const perk = `t5-${side}`;
    perks.push({ id: perk, tier: 5, cost: 15, name: side === 'light' ? 'Light' : 'Dark', side, text: own[8 + j] ?? '', picture: `${FOLDER}/${id}/${perk}.png` });
  }
  return perks;
}

/** The TP a hero's picked perks cost all told. */
export const spent = (perks: readonly Perk[], picked: readonly string[]): number => perks.filter((perk) => picked.includes(perk.id)).reduce((sum, perk) => sum + perk.cost, 0);
