import { built } from '../shared/built';
import { HERO_ASSETS, skillPicture } from '../technomagic/assets';
import type { HeroSkillView } from '../protocol/heroes';

/*
 * The heroes page's Skills tab (and the databank's Heroes): each hero's three skills and its passive as the bot sends
 * them (King's Raid's words, as kingsraid.shodyra.com has them, with the TechnoMagic Raid's numbers: its
 * ../technomagic/sim/heroes/), each with its picture (../technomagic/assets/heroes/, where the raid's skill pictures
 * come from).
 */

export interface HeroSkill extends HeroSkillView {
  /** Its picture (under public/kr/). */
  picture: string | null;
}

/** A hero's skills, its passive last, each with its picture. */
export function heroSkills(id: string, skills: readonly HeroSkillView[]): HeroSkill[] {
  const assets = HERO_ASSETS.find((one) => one.folder === `heroes/${id}`);
  return skills.map((skill, i) => ({ ...skill, picture: assets ? built(skillPicture(assets, i)) : null }));
}
