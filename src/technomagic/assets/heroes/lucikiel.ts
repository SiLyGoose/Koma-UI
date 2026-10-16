import type { HeroAssets, RiggedModel } from '../types.ts';

/*
 * Lucikiel in his fourth look (Hero_Lucikiel_Vari04_…): his body (all of him in one), and the demon god's claws on his
 * hands (on his skeleton, as his body's file has them). His later look's files (Hero_ZLucikiel_Vari05_…) have their
 * colour pictures spoiled (one hue all over), and his unique weapon's claws are made for that look: he looks the same
 * with it. He stands in a boxer's bouncing idle and attacks with a fist fight (Ezekiel's), animations of Mixamo's (the
 * motions alone); he runs in and does his skills by the poses written in code (../../heroes/lucikiel/moves.ts).
 */

/** What moves him. */
const MOVED_BY = {
  kind: 'rigged',
  folder: 'Lucikiel_Mixamo',
  idle: 'Bouncing Fight Idle.fbx',
  // A jab, a cross, a hook and a kick from his guard, and back to it: the blows land as Ezekiel's do (../../sim/heroes/lucikiel.ts).
  attack: [{ file: 'Fist Fight A.fbx' }],
} as const satisfies RiggedModel;

export const LUCIKIEL_ASSETS: HeroAssets = {
  name: 'Lucikiel',
  folder: 'heroes/lucikiel',
  // (And Annihilation Surge's, past his passive's.)
  skills: { from: 'https://kingsraid.shodyra.com/static/images/97/', files: ['s1.png', 's2.png', 's3.png', 's4.png', 's21.png'] },
  skins: [
    {
      name: 'Lucikiel',
      // His artwork (from the wiki, asked for as the PNG it was uploaded as): his head and horns in the crop (the meter's close-up is his face by itself).
      portrait: {
        file: 'Lucikiel.png',
        from: 'https://static.wikia.nocookie.net/charactah-account/images/4/4a/Lucikiel_Render_01.png/revision/latest?cb=20221010051510&format=original',
        crop: { x: 300, y: 40, size: 135 },
        head: { x: 335, y: 75, size: 75 },
      },
      model: {
        kind: 'parts',
        parts: ['Hero_Lucikiel_Vari04_Mesh', 'Hero_Lucikiel_Vari04_Weapon'],
        movedBy: MOVED_BY,
      },
    },
  ],
};
