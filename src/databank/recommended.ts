/*
 * The heroes recommended against each of the TechnoMagic Raid's bosses and the Dragon Raid's dragons, for the databank's
 * enemies (./bosses.ts). Written by KR-extracted/scripts/tm-recommend.mjs: King's Raid's own picks first (its hard Dragon Raid's,
 * those the raid has: `kr`), then the heroes whose parties fared best against it in the raid's sim, up to 4 in all.
 */

export const RECOMMENDED: Readonly<Record<string, { kr: readonly string[]; heroes: readonly string[] }>> = {
  galgoria: { kr: [], heroes: ['rehartna', 'laias', 'annette', 'fallen-frey'] },
  temeraire: { kr: ['morrah', 'gremory', 'laias'], heroes: ['morrah', 'gremory', 'laias', 'evan'] },
  scalaxia: { kr: ['loman', 'yanne', 'estelle'], heroes: ['loman', 'yanne', 'estelle', 'laias'] },
  zyrrkinoth: { kr: ['glenwys', 'erze'], heroes: ['glenwys', 'erze', 'evan', 'fallen-frey'] },
  armarta: { kr: ['shea'], heroes: ['shea', 'fallen-frey', 'evan', 'lucias'] },
};
