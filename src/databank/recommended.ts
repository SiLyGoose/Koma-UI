/*
 * The heroes recommended against each of the TechnoMagic Raid's bosses and the Dragon Raid's dragons, for the databank's
 * enemies (./bosses.ts), out of every hero King's Raid has had, the raid's or not. Written by KR-extracted/scripts/tm-picks.mjs:
 * King's Raid's own picks first (`kr`: its Hard Dragon Raid's, and `normal` its Normal one's; Galgoria has none), then
 * `picks`, chosen for what their skills do against the boss's, each with why, up to 8 in all (recommendedIn).
 * OTHER_HEROES: those the raid doesn't have, as King's Raid has them (their icons in public/kr/hero-icons/).
 */

import type { HeroClass } from '../technomagic/sim/heroes/kit';

export interface Recommended {
  kr: readonly string[];
  normal: readonly string[] | null;
  picks: Readonly<Record<string, string>>;
}

export const RECOMMENDED: Readonly<Record<string, Recommended>> = {
  galgoria: {
    kr: [],
    normal: null,
    picks: {
      laias: "Raises everyone's M.DEF and M.Block against its venom and heals the party; the best against it in the raid's simulated fights.",
      'fallen-frey': "Heals and shields through its venom while cutting its healing; among the best against it in the raid's simulated fights.",
      shakmeh: 'Grudge cuts its healing, and Vessel of Dark Spirit raises the party’s M.DEF.',
      isolet: 'Deals P.DMG, Ignite cuts its healing, and Blazing Storm lowers the M.DMG the party takes.',
      valance: 'Manipulated cuts its healing and raises all the DMG it takes; Absolute Protection Field keeps the party healed and free of CC.',
      tanya: 'Deals P.DMG, and Blade Tornado from Stealth cuts its healing by 70%.',
      rehartna: 'Gives the party mana and shortens its cooldowns while Poisonous Swamp slows their mana.',
      arch: 'Arbiter makes the party immune to M.DMG for a while, through its venom.',
    },
  },
  temeraire: {
    kr: ['morrah', 'gremory', 'laias'],
    normal: ['morrah', 'kaulah', 'luna'],
    picks: {
      laudia: 'Dance of the Desert lands dozens of M.DMG hits, wearing away Blessing of the Flame.',
      theo: 'Final Crash’s 16 M.DMG hits wear away Blessing of the Flame.',
      arch: 'Deals M.DMG, raises the M.DMG it takes, and Arbiter makes the party immune to M.DMG for a while.',
      jane: 'Shreds its M.DEF stack by stack and cuts the M.DMG the party takes.',
      annette: 'Raises the M.DMG it takes and clears Burn from the whole party.',
    },
  },
  scalaxia: {
    kr: ['loman', 'yanne', 'estelle'],
    normal: ['rephy', 'gau', 'annette'],
    picks: {
      selene: 'Deals heavy P.DMG to bosses with extra P.DEF Penetration, where it blocks M.DMG.',
      glenwys: 'Lands many P.DMG hits that raise the P.DMG it takes, and cleanses the party.',
      'rebel-klaus': 'Power of Galicta: P.DMG that ignores DEF once DEF Penetration is high enough.',
      gladi: 'Deals P.DMG, and Ultimate Punch ignores a boss’s DEF.',
      evan: 'Origin of Life shields the party and makes them immune to CC, keeping Freeze off, and gives mana back.',
    },
  },
  zyrrkinoth: {
    kr: ['glenwys', 'erze', 'mediana'],
    normal: ['annette', 'epis', 'kaulah'],
    picks: {
      ezekiel: 'Strike of Doom ignores its DMG Reduction.',
      naila: 'Tornado Strike ignores its DMG Reduction and raises the P.DMG it takes.',
      priscilla: 'Vital Strike always crits, cracking its scales past its Crit Resistance.',
      lavril: 'Lowers its Crit Resistance and raises an ally’s Crit DMG.',
      ophelia: 'Raises every ally’s Crit Chance, so more blows crack its scales.',
    },
  },
  armarta: {
    kr: ['shakmeh', 'cecilia', 'shea'],
    normal: ['gau', 'laias', 'lorraine'],
    picks: {
      loman: 'Cleanses the Dark Flames from the party, shields everyone and cuts all the DMG they take.',
      lucias: 'Zone of Faith keeps cleansing the Dark Flames, and Path of Blessings cuts the P.DMG the party takes.',
      isaiah: 'Cleanses and shields the party, and grants Invincibility through Ashen Eclipse; on King’s Raid’s other Black Dragon list too.',
      klaus: 'Raises the party’s P.DEF and P.Block, and cuts the P.DMG they take.',
      'fallen-frey': 'Heals past the Dark Flames’ healing cut, and Blessing of Doom’s shields dispel harmful effects.',
    },
  },
};

/** The heroes recommended against `boss` in `mode` (a dragon's Normal or Hard): King's Raid's own (`kr`) first, then the picks, up to 8. */
export function recommendedIn(boss: string, mode: 'normal' | 'hard' = 'hard'): { heroes: string[]; kr: readonly string[] } {
  const of = RECOMMENDED[boss];
  if (!of) return { heroes: [], kr: [] };
  const kr = (mode === 'normal' && of.normal) || of.kr;
  return { heroes: [...new Set([...kr, ...Object.keys(of.picks)])].slice(0, 8), kr };
}

/** A hero King's Raid has had that the raid doesn't: its name, class and the kind of damage it deals. */
export interface OtherHero {
  name: string;
  class: HeroClass;
  deals: 'physical' | 'magical';
}

export const OTHER_HEROES: Readonly<Record<string, OtherHero>> = {
  kaulah: { name: 'Kaulah', class: 'priest', deals: 'magical' },
  epis: { name: 'Epis', class: 'assassin', deals: 'magical' },
  rephy: { name: 'Rephy', class: 'priest', deals: 'magical' },
  jane: { name: 'Jane', class: 'knight', deals: 'magical' },
  luna: { name: 'Luna', class: 'archer', deals: 'magical' },
  arch: { name: 'Arch', class: 'archer', deals: 'magical' },
  mediana: { name: 'Mediana', class: 'priest', deals: 'physical' },
  ophelia: { name: 'Ophelia', class: 'wizard', deals: 'magical' },
  laudia: { name: 'Laudia', class: 'assassin', deals: 'magical' },
  cecilia: { name: 'Cecilia', class: 'mechanic', deals: 'physical' },
  shakmeh: { name: 'Shakmeh', class: 'knight', deals: 'physical' },
  gladi: { name: 'Gladi', class: 'assassin', deals: 'physical' },
  isaiah: { name: 'Isaiah', class: 'priest', deals: 'magical' },
};
