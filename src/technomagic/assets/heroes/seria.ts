import type { HeroAssets } from '../types.ts';

/*
 * Seria: her body (her hair is a part of its own, the first of her files'), her sword in her right hand (its blade
 * along what was its y, as Clause's) and its sheath held in her left. No rig of hers: she stands, runs in and does
 * everything by the poses written in code (a swordsman's, and ../../heroes/seria/moves.ts).
 */

const DRIVE = 'https://drive.google.com/uc?export=download&id=';

export const SERIA_ASSETS: HeroAssets = {
  name: 'Seria',
  folder: 'heroes/seria',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/52/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  skins: [
    {
      name: 'Seria',
      // Her artwork, crouched with her sword drawn: her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Seria.png', from: `${DRIVE}1eTijd3ZY18qjl6KknmLWuOYgZQCwDCrN`, crop: { x: 605, y: 70, size: 200 }, head: { x: 655, y: 160, size: 120 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Seria_Vari05_Body', 'Hero_Seria_Hair_01'],
        left: 'Hero_Seria_Vari05_WeaponB',
        right: 'Hero_Seria_Vari05_WeaponA',
        offHand: 'held',
        blade: 'y',
      },
    },
    // Her Christmas costume, with its own hair, sword and sheath.
    {
      name: 'Seria_Christmas',
      portrait: { file: 'Seria_Christmas.png', from: `${DRIVE}1zbsVdK__ytCQ-YxrIpRV_SNKRaDSqamX`, crop: { x: 345, y: 10, size: 200 }, head: { x: 400, y: 118, size: 115 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Seria_Cos19Christmas_Body', 'Hero_Seria_Cos19Christmas_Hair'],
        left: 'Hero_Seria_Cos19Christmas_Weapon_B',
        right: 'Hero_Seria_Cos19Christmas_Weapon_A',
        offHand: 'held',
        blade: 'y',
      },
    },
  ],
};
