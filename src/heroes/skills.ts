import { HERO_ASSETS, skillPicture } from '../technomagic/assets';
import { HEROES } from '../technomagic/sim/heroes';

/*
 * The heroes page's Skills tab: each hero's three skills and its passive in King's Raid's own words, as
 * kingsraid.shodyra.com has them (where the raid's skill pictures come from, ../technomagic/assets/heroes/),
 * with what each costs and how long before it can be used again (the fight's: ../technomagic/sim/heroes/; Gremory's
 * none, each skill sealed once used, and once all three are, each turns into the fourth). Where that site doesn't
 * say a number ("???"), the TechnoMagic Raid's own is put in (its heroes/: Kirze's FLOWER and EVIL_DEEDS; damage as
 * at its base ATK, technomagic/sim/combat/damage.ts). Changing one of those there means changing it here too.
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
const SKILLS: Record<string, { skills: [SkillText, SkillText, SkillText, SkillText] }> = {
  clause: {
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
  gremory: {
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
  morrah: {
    skills: [
      {
        name: 'Burning Power',
        text: 'Deals M.DMG to enemies in range and knocks them down, inflicting 3 stacks of Flame. Then for 15 sec, each auto attack deals M.DMG and inflicts 1 stack of Flame on enemy. Per each stacked Flame, DMG is increased by 2%. Each Flame stack deals separate M.DMG and reduces Heal rate by 1%.',
      },
      {
        name: 'Hellfire',
        text: "For 20 sec, all allies' M.DEF is increased by 30% and M.Block Chance is increased by 250. Additionally, every 1 sec, inflicts 1 stack of Flame on nearby enemies.",
      },
      { name: 'Lava Eruption', text: 'Deals M.DMG to enemies in range and inflict knock down. Per every stacked Flame, DMG is increased by 2%.' },
      { name: 'Fire Smash', text: 'Upon Block, deals M.DMG to enemies in range, and inflicts 3 stack of Flame.' },
    ],
  },
  laias: {
    skills: [
      {
        name: 'Healing Droplets',
        text: "Heals HP of all allies and increases Heal Rate by 25% for 10 sec. If the target's HP is 50% or below, Heal Rate increases by 1.5 times.",
      },
      {
        name: 'Bubble Shield',
        text: 'For 15 sec, casts a Shield that blocks DMG on the ally with the lowest HP. While the Shield is active, gains immunity to CC, increases ATK and heals HP every sec. For 15 sec, the ally takes 30% reduced DMG from Non-Hero targets and increases DMG dealt to Non-Hero enemies by 15%. The DMG Reduction effect from and the DMG Boost effect to Non-Hero enemies is irremovable.',
      },
      {
        name: 'Festival of the Flow',
        text: 'Deals M.DMG to nearby enemies and knocks them down for 3 sec. Upon casting, heals HP of all allies by 15% of their Max HP and recovers 2 orbs of Mana of allies excluding self. Afterward, for 12 sec, creates a whirlpool every 4 sec that deals M.DMG to random enemies and knocks them down for 2 sec.',
      },
      {
        name: 'Blessing of the Water Dragon',
        text: "Increases Laias' CC Resist by 500, and increases all allies' M.DEF by 10% and M.Crit Resistance by 250. Whenever Laias casts an active Skill, reduces M.DMG all allies take by 25% for 5 sec.",
      },
    ],
  },
  seria: {
    skills: [
      {
        name: 'Mysterious Sword - Falling Petals',
        text: 'Performs a horizontal slash to the front and deals M.DMG to the target and enemies in a narrow range. Can activate [Mysterious Sword - Blossom] (1 Mana: a vertical slash to the front, dealing M.DMG to the target and enemies in a narrow range) once within 5 sec after use.',
      },
      {
        name: 'Blood Scattering Blade',
        text: 'Rapidly charges forward to deal M.DMG and inflicts irremovable Original Sin of Blood on enemies for 3 sec. Enemies under Original Sin of Blood have their ATK Spd reduced by 300. Shortly afterward, attacks enemies under Original Sin of Blood 2 times, and deals additional M.DMG, and if the target is not a hero, deals additional DEF Ignoring M.DMG.',
      },
      {
        name: 'Red Moon Blade',
        text: 'Brandishes a moon-bloodying sword, dealing M.DMG to enemies in a wide range, and additional M.DMG on non-Hero enemies. When the moon is ripe, gains Moonlight for 1 sec, and when cast at this state, deals M.DMG to enemies and reduces their Heal Rate by 100%. If the target is not a hero, deals additional M.DMG.',
      },
      { name: 'Cold-Blooded Witch', text: 'ATK is increased by 38567. Upon a critical skill hit, own Crit DMG is increased by 5%. This effect can be stacked up to 30 times.' },
    ],
  },
  ezekiel: {
    skills: [
      {
        name: 'Destructive Instinct',
        text: 'Swipes nearby enemies in a circular range and deals M.DMG. Then strikes the ground, dealing M.DMG and knocking down enemies for 3 sec. [Fury] - Consumes 15% of current HP to activate. Effect range increases and swipe attack draws in enemies.',
      },
      {
        name: 'Dawning Despair',
        text: 'Dashes to an enemy with the highest ATK and deals M.DMG to enemies in range, reducing their ATK Spd by 300. [Fury] - Consumes 10% of current HP to activate. Effect range increases, Stuns target for 3 sec, and increases own ATK Spd by 300 for 10 sec.',
      },
      {
        name: 'Strike of Doom',
        text: "Charges energy and attacks target enemy, dealing M.DMG and inflicting Stun for 3 sec. Ignores target's DMG Reduction effects. [Fury] - Consumes 20% of current HP to activate. Attacks enemies in range of target and DMG is tripled.",
      },
      {
        name: 'Cursed Blood',
        text: "Ezekiel gains 1 stack of 'Cursed Blood' at the end of skill. Upon the 3rd stack, consumes Cursed Blood to reset all skill cooldown, dealing M.DMG to nearby enemies and knocking them down for 3 sec, while activating Fury for 10 sec, that cannot be dispelled. While in Fury state, goes into an auto-battle mode that cannot be controlled, and ATK is increased by 30%, auto attack DMG is doubled, and all Skill effect are reinforced. Cannot gain Cursed Blood during Fury state, except for when killing an enemy.",
      },
    ],
  },
  lorraine: {
    skills: [
      { name: 'Thornbush Forest', text: 'Attacks 3 times at random, dealing M.DMG to enemies in range and inflicting 1 stack of Poison with each attack.' },
      { name: 'Tangled Vine', text: 'Deals M.DMG to enemies in a straight line, stacking 2 Poison and shackling them for 4 sec. After some time, deals a large amount of DMG based on the number of Poison stacks.' },
      { name: 'Wrath of the Forest', text: 'Deals M.DMG to enemies in range and knocks them down for 3 sec. Enemies inflicted by Poison takes 20% more DMG per every stack.' },
      {
        name: 'Blade Leaf',
        text: 'When dealing a normal attack, attacks a random enemy 3 times with a 30% chance of inflicting M.DMG and 1 stack of Poison for 20 seconds. Poison inflicts a total of M.DMG over 20 seconds, reduces Heal Rate, and can be stacked up to max 5 times. If Lorraine dies, Poison effects on enemies will disappear.',
      },
    ],
  },
  valance: {
    skills: [
      {
        name: 'Prototype – VA',
        text: 'Dispels negative effects from the ally with the highest ATK and grants [Hologram] for 15 sec. [Hologram] increases the target’s ATK, Crit Chance, heals HP every sec, and reduces its Cooldown of all active Skills by 0.2 sec. While [Hologram] is active, the target gains immunity to negative effects.',
      },
      {
        name: 'Absolute Protection Field – LA',
        text: 'Creates an [Violet Force Field] that lasts for 5 sec within a wide range of self. Allies within the range of [Violet Force Field] have their All DEF increased by 15%, gain immunity to CC, and have their HP healed and Mana recovered every sec.',
      },
      {
        name: 'Ultimate Laser Cannon – NCE',
        text: 'Summons laser cannons behind self that fire laser beams, dealing P.DMG to the enemy. The hit target is inflicted with Stun for 3 sec and becomes [Manipulated] for 15 sec. Afterward, the cannons additionally fire a total of 9 laser beams to random enemies. Each laser beam deals P.DMG, inflicts Stun on the hit target for 1.5 sec, and inflicts [Manipulated] for 15 sec. Enemies who are [Manipulated] have their Heal Rate reduced by 5% and take 7% increased All DMG. [Manipulated] can be stacked up to max 7 times.',
      },
      {
        name: 'Technomagic Awakening',
        text: 'Increases self’s All DEF, Mana Recovery/Attack, and ATK of all allies. In Technomagic Kingdom, increases all allies’ DMG dealt to Bosses by 15%.',
      },
    ],
  },
};

/** A hero's skills, its passive last; none for a hero this page has no words for. */
export function heroSkills(id: string): HeroSkill[] {
  const hero = SKILLS[id];
  if (!hero) return [];
  const assets = HERO_ASSETS.find((one) => one.folder === `heroes/${id}`);
  const abilities = HEROES.find((one) => one.id === id)?.abilities ?? [];
  return hero.skills.map(({ tag, ...skill }, i) => ({
    ...skill,
    tag: tag ?? null,
    cost: abilities[i]?.cost ?? null,
    cooldown: abilities[i]?.cooldown ?? null,
    picture: assets ? skillPicture(assets, i) : null,
  }));
}
