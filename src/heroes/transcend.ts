import { KEPT } from '../technomagic/assets';
import { HEROES } from '../technomagic/sim/heroes';
import type { HeroClass } from '../technomagic/sim/heroes/kit';
import { CLASS_PERKS, COMMON_PERKS, type OwnPerkId } from '../technomagic/sim/perks';
import { TRANSCEND_PERKS, type TranscendTier } from '../protocol/heroes';

/** How far a hero can be transcended, the TP it has at its most, and the hero essences: the bot's (../protocol/heroes.ts). */
export { ESSENCE_NAME, TRANSCEND_MAX, TRANSCEND_POINTS, type EssenceId, type TranscendTier } from '../protocol/heroes';


/*
 * Transcendence on the heroes page: each hero's transcendence perks (its Transcend tab) in King's Raid's own words,
 * as kingsraid.shodyra.com has them (the fight's: ../technomagic/sim/perks.ts, and each hero's own in its
 * ../technomagic/sim/heroes/), with their pictures (public/technomagic/transcend/: each hero's own in its folder, the
 * rest in perks/), and the hero essences transcending a hero pays with (its Stats tab; essences/: the King's Raid
 * wiki's fragments of each kind). Which perks there are, what each costs, how far a hero is transcended and what the
 * next level costs are the bot's (../protocol/heroes.ts); a hero of a class has its class's Transcend 2 perks.
 */

/** An essence's picture. */
export const essencePicture = (id: string): string => `${KEPT}/transcend/essences/${id}.png`;

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

/** A class perk's picture goes by its name (its words lower case, joined by dashes); everyone's by its id, and a hero's own in its folder. */
const slug = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** A hero's perks, in the bot's order (Transcend 1, 2, 3, then 5); only the ones the sim has words for. */
export function heroPerks(id: string, heroClass: string): Perk[] {
  const def = HEROES.find((hero) => hero.id === id);
  const own = def?.perks;
  const skills = def ? [...def.abilities.map(({ name }) => name), def.passive?.shown.name] : [];
  const classes = CLASS_PERKS[heroClass as HeroClass] ?? [];
  const perks: Perk[] = [];
  for (const { id: perk, tier, cost } of TRANSCEND_PERKS) {
    if (tier === 1) {
      const { name, words } = COMMON_PERKS[perk as keyof typeof COMMON_PERKS];
      perks.push({ id: perk, tier, cost, name, side: null, text: words, picture: `${FOLDER}/perks/${perk}.png` });
      continue;
    }
    if (tier === 2) {
      const def = classes[Number(perk.slice('class-'.length)) - 1];
      if (def?.name) perks.push({ id: perk, tier, cost, name: def.name, side: null, text: def.words, picture: `${FOLDER}/perks/${slug(def.name)}.png` });
      continue;
    }
    const def = own?.[perk as OwnPerkId];
    if (!def) continue;
    const side = perk.endsWith('-light') ? 'light' : 'dark';
    // (A Transcend 3 perk goes by its skill's name, the passive's for s4; a Transcend 5 perk by its side.)
    const name = tier === 3 ? (skills[Number(perk[1]) - 1] ?? `Skill ${perk[1]}`) : side === 'light' ? 'Light' : 'Dark';
    perks.push({ id: perk, tier, cost, name, side, text: def.words, picture: `${FOLDER}/${id}/${perk}.png` });
  }
  return perks;
}

/** The TP a hero's picked perks cost all told. */
export const spent = (perks: readonly Perk[], picked: readonly string[]): number => perks.filter((perk) => picked.includes(perk.id)).reduce((sum, perk) => sum + perk.cost, 0);
