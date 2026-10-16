import type { HeroAssets, RiggedModel } from '../types.ts';

/*
 * Rebel Klaus, the Shieldless Knight (the game's Rebel Clause: its files name him Hero_Clause_Traitor_…): his body (his
 * face and cape in it), his hair, and Galicta in his right hand, laid out as Klaus's sword is (the blade along what was
 * its y). No shield. He runs in by an animation of Mixamo's (the motion alone, as Loman's is); he stands on guard,
 * attacks and does his skills by the poses written in code (../../heroes/rebel-klaus/moves.ts).
 */

/** What moves him. */
const MOVED_BY = {
  kind: 'rigged',
  folder: 'RebelKlaus_Mixamo',
  run: 'Unarmed Run Forward.fbx',
} as const satisfies RiggedModel;

export const REBEL_KLAUS_ASSETS: HeroAssets = {
  name: 'Rebel Klaus',
  folder: 'heroes/rebel-klaus',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/93/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded: Galicta, the Adversary of the Goddess.
  unique: { Hero_Clause_Traitor_Vari05_Weapon: 'Hero_Clause_Traitor_Unique01_Weapon' },
  skins: [
    {
      name: 'Rebel Klaus',
      // His artwork, Galicta planted before him, its light swirling round him: his head and hair in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Rebel_Klaus.png', from: 'https://i.redd.it/hm3zimp0tuc81.png', crop: { x: 395, y: 110, size: 110 }, head: { x: 425, y: 150, size: 70 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Clause_Traitor_Vari05_Body', 'Hero_Clause_Traitor_Hair_01'],
        right: 'Hero_Clause_Traitor_Vari05_Weapon',
        blade: 'y',
        movedBy: MOVED_BY,
      },
    },
  ],
};
