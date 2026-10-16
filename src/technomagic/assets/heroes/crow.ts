import type { HeroAssets } from '../types.ts';

/*
 * Crow in his fourth look (Hero_Crow_Vari04_…: his fifth's files have their colour pictures spoiled, one hue all
 * over): his body and hair, and his great gun in his right hand, along its x (his shots come from its far end). No rig
 * of his: he stands, runs in and does everything by the poses written in code (../../heroes/crow/moves.ts).
 */

export const CROW_ASSETS: HeroAssets = {
  name: 'Crow',
  folder: 'heroes/crow',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/49/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded: Akistra, his gun.
  unique: { Hero_Crow_Vari04_Weapon: 'Hero_Crow_Unique01_Weapon' },
  skins: [
    {
      name: 'Crow',
      // His artwork (from the wiki, asked for as the PNG it was uploaded as), his gun at his side: his head in the crop (the meter's close-up is his face by itself).
      portrait: {
        file: 'Crow.png',
        from: 'https://static.wikia.nocookie.net/charactah-account/images/e/ec/Crow_%28King%27s_Raid%29_Render_01.png/revision/latest?cb=20221007053744&format=original',
        crop: { x: 290, y: 0, size: 120 },
        head: { x: 318, y: 22, size: 65 },
      },
      model: {
        kind: 'parts',
        parts: ['Hero_Crow_Vari04_Body', 'Hero_Crow_Hair_01'],
        right: 'Hero_Crow_Vari04_Weapon',
      },
    },
  ],
};
