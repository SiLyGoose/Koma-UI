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
}

interface SkillText {
  name: string;
  text: string;
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
};

/** A hero's skills, its passive last; none for a hero this page has no words for. */
export function heroSkills(id: string): HeroSkill[] {
  const hero = SKILLS[id];
  if (!hero) return [];
  const assets = HERO_ASSETS.find((one) => one.folder === `heroes/${id}`);
  return hero.skills.map((skill, i) => ({
    ...skill,
    cost: hero.costs[i] ?? null,
    cooldown: hero.cooldowns[i] ?? null,
    picture: assets ? skillPicture(assets, i) : null,
  }));
}
