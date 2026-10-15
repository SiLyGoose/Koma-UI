import type { HeroAssets } from '../types.ts';

/*
 * Lorraine: her body and hair, and her staff in her right hand (her body's file marks only that hand, as
 * Point_Weapon), laid out along what was its y. No rig of hers: she stands, runs in and does everything by the poses
 * written in code (../../heroes/lorraine/moves.ts).
 */

const DRIVE = 'https://drive.google.com/uc?export=download&id=';

export const LORRAINE_ASSETS: HeroAssets = {
  name: 'Lorraine',
  folder: 'heroes/lorraine',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/13/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  skins: [
    {
      name: 'Lorraine',
      // Her newer artwork, sitting on the World Tree's roots under its flowers: her head and ears in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Lorraine.png', from: `${DRIVE}1mBAtFWXJu10lnOCXx7rzecxSsDuFvV51`, crop: { x: 450, y: 185, size: 185 }, head: { x: 490, y: 225, size: 115 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Lorraine_Vari05_Body', 'Hero_Lorraine_Hair_01'],
        right: 'Hero_Lorraine_Vari05_Weapon',
        blade: 'y',
      },
    },
    // Her Christmas costume, with its own hair and staff.
    {
      name: 'Lorraine_Christmas',
      // Her artwork, lying on a great cushion: her face is small in it.
      portrait: { file: 'Lorraine_Christmas.png', from: `${DRIVE}1m5CYTgPvIgBnDivY3QCu6mi524mV3Uie`, crop: { x: 335, y: 25, size: 140 }, head: { x: 360, y: 82, size: 75 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Lorraine_Cos18Christmas_Body', 'Hero_Lorraine_Cos18Christmas_Hair'],
        right: 'Hero_Lorraine_Cos18Christmas_Weapon',
        blade: 'y',
      },
    },
  ],
};
