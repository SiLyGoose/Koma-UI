/*
 * The raid bosses' skills as the site tells them (the databank's enemies, ../databank/bosses.ts, and a raid's Raid Info):
 * each with King's Raid's own icon for it (its NguiAtlas_Icon_Skill11 and 15 atlases, by the game's skill id: cut to
 * public/kr/bosses/<boss>/skills/<id>.webp by KR-extracted/scripts/kr-icons.py) and what it does, in King's Raid's words
 * with the raid's numbers. What each does in a fight is the sim's (../technomagic/sim/bosses/<boss>/skills.ts): its numbers
 * here are those it exports, the rest written as it has them. Its plain attacks (a dragon's bite and claws, Galgoria's
 * heads) have no icon in the game: they are told apart, under the kind of damage they deal.
 */
import type { DamageType } from '../technomagic/sim/combat/damage';
import { ECLIPSE } from '../technomagic/sim/bosses/armarta/skills';
import { IMPRISONMENT, SWAMP } from '../technomagic/sim/bosses/galgoria/skills';
import { STORM } from '../technomagic/sim/bosses/scalaxia/skills';
import { DAWN, DEF_CUT, MAGIC_TAKEN, MANA_BLOCKED, MANA_HIT, MANA_RATE, RAMPAGE, RISE, STORM as BLADES, STRIKE, SWORD } from '../technomagic/sim/bosses/siegfried/skills';
import { BLESSING } from '../technomagic/sim/bosses/temeraire/skills';
import { SCALES } from '../technomagic/sim/bosses/zyrrkinoth/skills';
import { ULTIMATE } from '../technomagic/sim/bosses/dragon/common';

export interface BossSkill {
  name: string;
  /** Its icon (a URL), King's Raid's. */
  icon: string;
  /** What it does. */
  about: string;
  /** The sim's attacks it is (none: always on it, a passive). */
  attacks: readonly string[];
}

export interface BossSkills {
  /** Its skills, then its passives. */
  skills: readonly BossSkill[];
  /** Its plain attacks: the sim's attacks, and what they do. */
  basic: { attacks: readonly string[]; about: string };
  /**
   * How many times as much of each kind of damage it takes for good, past its defenses (its part's `taken` in the sim:
   * Scalaxia's): none said, as much.
   */
  takes?: Partial<Record<DamageType, number>>;
}

const pct = (share: number): string => `${Math.round(share * 1000) / 10}%`;
/** A skill's icon, by its id in King's Raid. */
const icon = (boss: string, id: number): string => `/kr/bosses/${boss}/skills/${id}.webp`;
/** When a dragon's ultimate opens, in its Hard mode and its Normal one (sim/bosses/<boss>/index.ts normalDragon's `leaves`). */
const opens = (normal: number): string => `Used once it is down to ${pct(ULTIMATE)} HP (${pct(normal)} in Normal mode).`;
/** A dragon's plain attacks. */
const DRAGON_BASIC = ['bite', 'claw'];

export const BOSS_SKILLS: Readonly<Record<string, BossSkills>> = {
  galgoria: {
    skills: [
      { name: 'Swamp Destroyer', icon: icon('galgoria', 3590010), attacks: ['destroyer'], about: 'Attacks the enemy in front of Galgoria 3 times, dealing M.DMG. Afterward, all three heads strike the swamp, dealing M.DMG to every enemy of 91% of their current HP and knocking them down for 3 sec.' },
      { name: 'Poisonous Swamp', icon: icon('galgoria', 3590020), attacks: ['swamp'], about: `Creates [Poisonous Swamp] under the enemies for ${SWAMP.lasts} sec. Enemies in it take M.DMG every ${SWAMP.every} sec and have their Mana Recovery reduced by ${pct(1 - SWAMP.mana)}, but their ATK is increased by ${pct(SWAMP.deals - 1)}.` },
      { name: 'Poisonous Explosion', icon: icon('galgoria', 3590030), attacks: ['explosion'], about: 'Attacks all enemies 2 times, dealing M.DMG. The first attack reduces their ATK by 50% for 10 sec, the second their Crit Chance by 500 for 10 sec.' },
      { name: 'Fatal Venom', icon: icon('galgoria', 3590040), attacks: ['fatal'], about: 'After using a skill 3 times, attacks all enemies, dealing M.DMG. Hit enemies’ Heal Rate is permanently reduced by 20% (up to 5 times), and Galgoria’s ATK is permanently increased.' },
      { name: 'Swamp Imprisonment', icon: icon('galgoria', 3590043), attacks: [], about: `Each time the heroes land ${IMPRISONMENT.hits} hits, the one that has dealt the most is held in the swamp for ${IMPRISONMENT.lasts} sec: it can’t act or be knocked down (but is still hit), and every other hero’s ATK is ${pct(IMPRISONMENT.atk)} higher meanwhile.` },
      { name: 'Persistent Life Force', icon: icon('galgoria', 3590041), attacks: [], about: 'Immune to Attack Speed reduction and Lifesteal. Recovers 1% of its HP every sec, with its Heal Rate increased by 70% (120% from stage 4): 1.7% a sec (2.2%) before Heal Rate reductions. From stage 4, heroes’ healing is reduced by 40% and their shields by 60%.' },
    ],
    basic: { attacks: ['left', 'centre', 'right'], about: 'Each head spits venom at the enemy it is after, dealing M.DMG.' },
  },
  siegfried: {
    skills: [
      { name: 'Divine Strike', icon: icon('siegfried', 3591010), attacks: ['strike'], about: `Charges energy and swings his sword, dealing P.DMG to frontal enemies in a straight line. Afterward, attacks them again and knocks them down for ${STRIKE.down} sec. Targets hit have their DEF reduced by ${DEF_CUT[0]?.toLocaleString('en-US')} permanently (up to ${STRIKE.most} times); the reduction grows with the stage, to ${DEF_CUT[DEF_CUT.length - 1]?.toLocaleString('en-US')} at stage ${DEF_CUT.length}.` },
      { name: 'Divine Storm of Blades', icon: icon('siegfried', 3591020), attacks: ['storm'], about: `Summons small swords of light, dealing P.DMG to all enemies 20 times; each hit recovers ${BLADES.mana} of the target’s Mana. Afterward, deals P.DMG to all enemies with the divine sword of light: a target whose Mana is full has all its Skills sealed for ${BLADES.seal} sec. Afterward, Siegfried loses power and falls for ${BLADES.fall} sec, taking ${pct(BLADES.taken)} more DMG meanwhile.` },
      { name: 'Divine Power', icon: icon('siegfried', 3591030), attacks: ['rise'], about: `Upon taking fatal DMG, Siegfried is granted Divine Power: negative effects on him are dispelled, his HP is fully recovered and his ATK permanently increased by ${pct(RISE.atk)}. Activated only ${RISE.times} times in the battle; each time, his Max HP increases by ${pct(RISE.hp)} and his divine sword grows, widening his normal attacks (${SWORD.join(' m, ')} m about him). The HP Recovery is not affected by Heal Rate Reduction effects.` },
      { name: 'Divine Rampage', icon: icon('siegfried', 3591040), attacks: [], about: `Not affected by changes in DEF and ATK Spd. His Divine Power increases All Block Chance by ${pct(1)}, and his Mana recovers ${MANA_RATE[0]} every sec (${MANA_RATE[MANA_RATE.length - 1]} at stage ${MANA_RATE.length}). If his Mana is fully charged, his DEF Penetration is greatly increased (+${RAMPAGE.pen}) for ${RAMPAGE.lasts} sec, again as long as it stays full. Takes ${pct(MAGIC_TAKEN)} more M.DMG.` },
      { name: 'Distorted Dawn', icon: icon('siegfried', 3591042), attacks: [], about: `Siegfried recovers ${MANA_HIT[0]} Mana each hit (${MANA_HIT[MANA_HIT.length - 1]} at stage ${MANA_HIT.length}), but if his attack is blocked, his Mana is reduced by ${MANA_BLOCKED}, and all of his attacks destroy the target’s Shield. From stage ${DAWN.from}, All Block Chance is increased by a further ${pct(DAWN.block / 1000)}, his normal attacks deal ${pct(DAWN.attack)} more DMG, but he also takes ${pct(DAWN.taken)} more DMG from normal attacks, and his ATK is ${pct(DAWN.weak)} lower for the first ${DAWN.weakFor} sec.` },
    ],
    basic: { attacks: ['slash', 'slash2', 'slash3'], about: 'Swings his sword 3 times at the enemy he is after, dealing P.DMG to it and to those about it (wider with each Divine Power).' },
    takes: { magical: 1 + MAGIC_TAKEN },
  },
  temeraire: {
    skills: [
      { name: 'Blessing of the Flame', icon: '/kr/states/RedFire3.webp', attacks: ['blessing'], about: `Attacks all enemies, dealing M.DMG, and gains [Blessing of the Flame]: its DMG is increased by ${pct(BLESSING.deals - 1)} and it takes ${pct(1 - BLESSING.physical)} less P.DMG, until the heroes land ${BLESSING.charges} hits on it. It begins the fight with it, and casts it again once it is gone.` },
      { name: 'Flame Breath', icon: icon('temeraire', 440120), attacks: ['breath'], about: 'Breathes fire over the field 4 times, dealing M.DMG and inflicting Burn for 6 sec, which deals 12% of the hit’s DMG every sec.' },
      { name: 'Tail Strike', icon: icon('temeraire', 440110), attacks: ['sweep'], about: 'Sweeps its tail across the field, dealing M.DMG to all enemies; the enemy it is after loses 2/3 of its remaining HP.' },
      { name: 'Rage of Dragon', icon: icon('temeraire', 440140), attacks: ['eruption'], about: `Flies up high and crashes down on the whole field, dealing M.DMG to all enemies and taking 73% of their remaining HP. ${opens(0.5)}` },
    ],
    basic: { attacks: DRAGON_BASIC, about: 'Bites and claws at the enemy it is after, dealing M.DMG.' },
  },
  scalaxia: {
    skills: [
      { name: 'Frost Smash', icon: icon('scalaxia', 440210), attacks: ['smashes'], about: 'Lands 3 consecutive smashes with its tail, dealing M.DMG to all enemies and inflicting 2 Frost each; the first takes 1/3 of the remaining HP of the enemy it is after. Enemies with 10 Frost are frozen for 3 sec and take 30% more DMG meanwhile.' },
      { name: 'Ice Breath', icon: icon('scalaxia', 440220), attacks: ['breath'], about: 'Exhales a Frost Breath over the field 4 times, dealing M.DMG and inflicting 2 Frost each.' },
      { name: 'Absolute Zero', icon: icon('scalaxia', 440240), attacks: ['storm'], about: `Flies up into the air and casts a powerful frost spell twice, each dealing M.DMG to all enemies and taking ${pct(STORM.health)} of their remaining HP; then freezes the whole field: every enemy is frozen and loses ${STORM.mana} Mana. ${opens(0.6)}` },
      { name: 'Frost', icon: '/kr/states/1940.webp', attacks: [], about: 'Its every hit inflicts Frost for 10 sec. It takes 60% less M.DMG, and blocks most M.DMG.' },
    ],
    basic: { attacks: [...DRAGON_BASIC, 'sweep'], about: 'Bites and claws at the enemy it is after, and sweeps its tail across the field, dealing M.DMG and inflicting 1 Frost.' },
    takes: { magical: 0.4 },
  },
  zyrrkinoth: {
    skills: [
      { name: 'Toxic Mist', icon: icon('zyrrkinoth', 440310), attacks: ['smashes'], about: 'Lashes its tail 3 times, dealing P.DMG to all enemies and knocking them back, inflicting 5 stacks of Poison per hit.' },
      { name: 'Venomous Breath', icon: icon('zyrrkinoth', 440320), attacks: ['breath'], about: 'Exhales a powerful poison over the field 4 times, dealing P.DMG and adding 3 stacks of Poison per hit.' },
      { name: 'Poison', icon: icon('zyrrkinoth', 440390), attacks: [], about: 'Its every hit inflicts Poison for 12 sec, dealing DMG every sec for each stack. Enemies with 30 stacks of Poison are petrified for 5 sec.' },
      { name: 'Toxic Scales', icon: '/kr/states/440396.webp', attacks: [], about: `Reduces the heroes’ Crit Chance on it by ${SCALES.critResist}, and greatly reduces all DMG it takes. Each Crit it takes increases the DMG it takes by ${pct(SCALES.per)} (up to ${SCALES.most} times). Not affected by Attack Speed reduction.` },
    ],
    basic: { attacks: [...DRAGON_BASIC, 'sweep'], about: 'Bites and claws at the enemy it is after, and sweeps its tail across the field, dealing P.DMG and adding 2 stacks of Poison.' },
  },
  armarta: {
    skills: [
      { name: 'Black Flame Breath', icon: icon('armarta', 440420), attacks: ['breath'], about: 'Breathes black fire over the field 4 times, dealing P.DMG and inflicting Dark Flame for 10 sec: 15% of the hit’s DMG every sec, and 50% less healing received.' },
      { name: 'Dark Whip', icon: icon('armarta', 440410), attacks: ['sweep'], about: 'Whips its tail across the field, dealing P.DMG to all enemies; the enemy it is after loses 2/3 of its remaining HP.' },
      { name: 'Stone Gaze', icon: '/kr/states/Stone.webp', attacks: ['gaze'], about: 'Petrifies the hero that has dealt the most DMG since its last gaze for 4 sec.' },
      { name: 'Dragon Fury', icon: icon('armarta', 440440), attacks: ['eclipse'], about: `Flies up into the air and burns the entire area, dealing P.DMG to all enemies (${pct(ECLIPSE.burning - 1)} more to those in Dark Flame) and taking ${pct(ECLIPSE.health)} of their remaining HP. Its DMG is then permanently increased by ${pct(ECLIPSE.deals)} (up to ${ECLIPSE.most} times). ${opens(0.5)}` },
    ],
    basic: { attacks: DRAGON_BASIC, about: 'Bites and claws at the enemy it is after, dealing P.DMG.' },
  },
};

/** A boss's skills (its Normal mode's are its Hard one's). */
export const bossSkills = (id: string): BossSkills | null => BOSS_SKILLS[id] ?? null;
