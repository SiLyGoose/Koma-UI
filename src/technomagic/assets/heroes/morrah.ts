import type { HeroAssets, RiggedModel } from '../types.ts';

/*
 * Morrah: her body and hair, her sword (Carprain) in her right hand and her shield on her left arm, laid out as
 * Clause's are (the blade along what was its y). No rig of hers: she stands, runs in and attacks as Clause does, by
 * copies of his rig's animations (sword and shield, as hers are), and does her skills by the poses written in code
 * (../../heroes/morrah/moves.ts).
 */

/**
 * Clause's idle, run and slash (copies of ../clause.ts's, on his skeleton), timed as his are: the blow lands a
 * little after the sword hand is moving fastest, and she leaves it just after. The same for both her skins.
 */
const MOVED_BY = {
  kind: 'rigged',
  folder: 'Morrah_Mixamo',
  idle: 'Morrah - Sword And Shield Idle.fbx',
  run: 'Morrah - Sword And Shield Run.fbx',
  attack: [{ file: 'Morrah - Sword And Shield Slash.fbx', lands: [0.68], until: 0.8 }],
} as const satisfies RiggedModel;
export const MORRAH_ASSETS: HeroAssets = {
  name: 'Morrah',
  folder: 'heroes/morrah',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/22/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  skins: [
    {
      name: 'Morrah',
      // Her artwork, her wings spread and Carprain held out: her head and horns in the crop (the meter’s close-up is her face by itself).
      portrait: { file: 'Morrah.png', crop: { x: 450, y: 62, size: 170 }, head: { x: 472, y: 98, size: 104 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Morrah_Vari05_Body', 'Hero_Morrah_Vari05_Hair'],
        left: 'Hero_Morrah_Vari05_Shield',
        right: 'Hero_Morrah_Vari05_Sword',
        blade: 'y',
        movedBy: MOVED_BY,
      },
    },
    // Her Halloween costume, with its own hair, sword and shield.
    {
      name: 'Morrah_Halloween',
      model: {
        kind: 'parts',
        parts: ['Hero_Morrah_Cos19Halloween_Body', 'Hero_Morrah_Cos19Halloween_Hair'],
        left: 'Hero_Morrah_Cos19Halloween_Shield',
        right: 'Hero_Morrah_Cos19Halloween_Sword',
        blade: 'y',
        movedBy: MOVED_BY,
      },
    },
  ],
};
