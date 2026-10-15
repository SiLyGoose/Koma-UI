import { HERO_ASSETS, skillPicture } from '../technomagic/assets';

/*
 * The heroes page's Skills tab: each hero's three skills and its passive in King's Raid's own words, as
 * kingsraid.shodyra.com has them (where the raid's skill pictures come from, ../technomagic/assets/heroes/),
 * with what each costs and how long before it can be used again. Where that site doesn't say a number
 * ("???"), the TechnoMagic Raid's own is put in (its heroes/: Kirze's FLOWER and EVIL_DEEDS; damage as
 * at its base ATK, combat/damage.ts). Changing one of those there means changing it here too.
 */

export interface HeroSkill {
  name: string;
  /** Its mana cost and cooldown (seconds); a passive has neither. */
  cost: number | null;
  cooldown: number | null;
  text: string;
  /** Its picture (under public/kr/, so only where those are served). */
  picture: string | null;
  /** What its tag says, where that isn't its cost and cooldown (or Passive). */
  tag: string | null;
}

interface SkillText {
  name: string;
  text: string;
  tag?: string;
}

/** By hero id: its three skills, then its passive. */
const SKILLS: Record<string, { costs: [number, number, number]; cooldowns: [number, number, number]; skills: [SkillText, SkillText, SkillText, SkillText] }> = {
  clause: {
    costs: [2, 1, 2],
    cooldowns: [9, 8, 12],
    skills: [
      { name: 'Cut Ground', text: 'Leaps into the air and deals P.DMG to enemies in range, stunning them for 5 sec.' },
      {
        name: 'Shield Strike',
        text: "Deals P.DMG proportional to P.DEF to enemies in range and knocks them back. Hit enemies' All DEF and ATK Spd is reduced by 30% and 500 for 20 sec, respectively. Upon blocking an attack, skill cooldown is reduced by 0.5 sec.",
      },
      { name: 'Guardian Shield', text: "All allies' P.DEF is increased for 20 sec and P.Crit Resistance is increased by 300, and reduces P.DMG they take by 25%.." },
      {
        name: 'Vow of Knights',
        text: "Upon blocking, deals P.DMG to frontal enemies and decreases ATK of affected targets by 20% for 8 sec. Recovers 300 MP after hitting the target. When an ally excluding self takes DMG increases all allies' P.DEF by 20% and P.Crit Resistance by 200 for 5 sec. This effect only activates once every 10 sec.",
      },
    ],
  },
  kirze: {
    costs: [2, 3, 4],
    cooldowns: [9, 17, 20],
    skills: [
      {
        name: 'Slash, Blade of Judgment!',
        text: 'Deals M.DMG over 7 attacks to nearby enemies in a circular range of self. Then, attacks frontal enemies in range, dealing M.DMG and knocking them down for 3 sec.',
      },
      {
        name: 'Disperse, Crystal Haze!',
        text: 'Unleashes the power of Arcane Crystals within to deal M.DMG to all enemies and stun them for 2 sec. Upon casting, activates [Arcane Crystal Awakening] for 15 sec, which increases ATK Spd of all allies by 300 and releases a shockwave every 2 sec to enemies in range of self, dealing M.DMG and stunning them for 1 sec.',
      },
      {
        name: 'Bloom, Crimson Flower!',
        text: 'Summons Arcane Crystals and deals M.DMG to frontal enemies in a straight line. Shortly afterward, causes an explosion that deals 12,000 additional M.DMG and inflicts [Arcane Crystal Curse] upon enemies for 5 sec, reducing their ATK Spd by 200. Attacking enemies under [Arcane Crystal Curse] inflicts a stack of [Arcane Crystal Energy]. [Arcane Crystal Curse] explodes after 10 sec, dealing M.DMG equal to 6,000 + 800 per stack of Arcane Crystal Energy.',
      },
      { name: 'End to Evil Deeds!', text: 'Increases own ATK by 20% and Crit Chance by 200, while increasing the duration of CCs that all allies inflict to Bosses by 30%' },
    ],
  },
  'fallen-frey': {
    costs: [2, 3, 5],
    cooldowns: [9, 17, 22],
    skills: [
      {
        name: 'Light of Doom',
        text: 'Heals HP of the ally with the lowest HP and nearby allies and increases Heal Rate by 20% for 10 sec. Afterward, explodes the area around the target and deals M.DMG to enemies in range, reducing their Heal Rate by 20% for 10 sec. If this Skill is used with 1 or more stacks of [Darkened Power], consumes 1 stack and dispels positive effects of all enemies within range.',
      },
      {
        name: 'Blessing of Doom',
        text: 'Grants [Blessing of Doom] to 4 allies with the lowest HP, absorbing DMG for 10 sec. The shield grants immunity to CC and increases ATK Spd by 500 for the duration. If this Skill is used with 1 or more stacks of [Darkened Power], consumes 1 stack to dispel negative effects from self and additionally dispels negative effects from targets.',
      },
      {
        name: 'Heaven’s Vengeance',
        text: "Brings Heaven's Vengeance upon a random enemy and nearby enemies over 20 hits, dealing M.DMG each hit and increasing All DMG the target takes by 10% for 20 sec. 500 additional DEF Penetration applies to this Skill. If this Skill is used with 1 or more stacks of [Darkened Power], consumes 1 stack and inflicts Stun on the hit enemies for 0.5 sec each hit. The DMG Boost effect can be stacked up to max 5 times.",
      },
      {
        name: 'Tainted Angel',
        text: 'As Fallen Frey has been corrupted by the darkness, she takes 15% increased DMG, but she recovers 400 Mana every sec, and when her Mana is at 100%, she gains [Darkened Power] every sec. [Darkened Power] can be stacked up to max 2 times and is irremovable.',
      },
    ],
  },
  // No cooldowns: each skill is sealed once used, and once all three are, each turns into the fourth.
  gremory: {
    costs: [3, 3, 4],
    cooldowns: [0, 0, 0],
    skills: [
      {
        name: 'Pochi, bite them!',
        tag: '3 Mana · Sealed after use',
        text: "Attacks an enemy 5 times, dealing M.DMG and inflicting [Pochi's Mark] each hit. The M.DMG of each hit increases by 15% per every stack of [Mana Charge]. [Pochi's Mark] reduces target's ATK by 6% for 15 sec, and it can be stacked up to max 5 times. If the target is a Boss, each hit deals additional M.DMG. The additional M.DMG increases by 30% per every stack of [Mana Charge]. This skill is sealed after use.",
      },
      {
        name: 'Puchi, knock them away!',
        tag: '3 Mana · Sealed after use',
        text: "Attacks the farthest enemy from behind, dealing M.DMG. Afterward, inflicts Stun for 5 sec and [Puchi's Mark] on the target. This skill is sealed after use.",
      },
      {
        name: 'Pippi, wrap them!',
        tag: '4 Mana · Sealed after use',
        text: "Deals a total of M.DMG over 10 times to the target and enemies within a large area around the target, inflicting [Pippi's Mark] on hit targets each hit. If this skill deals DMG to a target inflicted with 10 stacks of [Pippi's Mark], each hit deals additional M.DMG that ignores DEF. [Pippi's Mark] increases M.DMG the target takes by 5% for 12 sec, and it can be stacked up to max 10 times. This skill is sealed after use.",
      },
      {
        name: 'Eh, whatever. I’m gonna sleep.',
        tag: 'Once all are sealed',
        text: "Available once all Skills are sealed. Upon use, dispels CC effects from self. While in use, Gremory gains immunity to CC, takes 40% reduced All DMG, and unlocks all of her sealed Skills. Every time she uses [Eh, whatever. I'm gonna sleep.], she gains a [Mana Charge] stack. Each [Mana Charge] stack increases Gremory's DMG dealt to enemies by 2% and her ATK by 10%. [Mana Charge] can be stacked up to max 5 times and is irremovable.",
      },
    ],
  },
  annette: {
    costs: [2, 2, 3],
    cooldowns: [11, 13, 25],
    skills: [
      {
        name: 'Blasting Ray',
        text: 'Attacks enemies in a straight line, dealing M.DMG, reducing their ATK by 15% and hit enemies take 25% increased M.DMG for 10 sec. If the skill is used when in Overcharge state, deals extra M.DMG, additionally reduces their ATK by 15%, and hit enemies take 25% increased M.DMG.',
      },
      {
        name: 'Emergency Treatment',
        text: "Dispels negative effects of all allies and heals HP for 10 sec while increasing CC Resistance by 250. While Overcharged, all allies' Crit Chance is increased by 250 and DMG dealt to Non-Hero enemies by 10% and gains immunity to CC.",
      },
      {
        name: 'Process of Elimination',
        text: 'Fires an exploding energy ball to a random target and nearby enemies in range, dealing M.DMG. When in Overcharge state, deals M.DMG, increases M.DMG enemies take by 25% for 10 sec, and inflicts Stun for 5 sec upon explosion.',
      },
      {
        name: 'Charge',
        text: 'Gains 1 stack of Charge every 0.5 sec, and gains 10 stacks of Charge per every orb of mana used. Upon the 100th Charge stacked, enters Overcharge state. When in Overcharge, ATK is increased by 30% for 15 sec, and each auto attack reduces skill cooldown by 10%. All effects cannot be dispelled, and Charge will not stack during Overcharge state.',
      },
    ],
  },
};

/** A hero's skills, its passive last; none for a hero this page has no words for. */
export function heroSkills(id: string): HeroSkill[] {
  const hero = SKILLS[id];
  if (!hero) return [];
  const assets = HERO_ASSETS.find((one) => one.folder === `heroes/${id}`);
  return hero.skills.map(({ tag, ...skill }, i) => ({
    ...skill,
    tag: tag ?? null,
    cost: hero.costs[i] ?? null,
    cooldown: hero.cooldowns[i] ?? null,
    picture: assets ? skillPicture(assets, i) : null,
  }));
}
