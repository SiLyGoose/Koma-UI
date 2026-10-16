import type { HeroAssets } from '../types.ts';

/*
 * Laias's files are named Ell in the game's own (Hero_Ell_…). Her staff goes in her right hand: the only hand her
 * file marks. With no rig of hers, she stands, runs in and does the rest as ../../heroes/laias/moves.ts has it.
 */

export const LAIAS_ASSETS: HeroAssets = {
  name: 'Laias',
  folder: 'heroes/laias',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/29/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Eltoirre, her staff (Ell's in the game's files).
  unique: { Hero_Ell_Vari05_Weapon: 'Hero_Ell_Unique01_Weapon' },
  skins: [
    {
      name: 'Laias',
      // Her artwork, floating with her tail curled under her: her head and crown in the crop (the meter's close-up is her face by itself).
      portrait: {
        file: 'Laias.png',
        from: 'https://drive.google.com/uc?export=download&id=1OY08dVdhjOslRqDW75djPgT0J3PrpBsl',
        crop: { x: 375, y: 185, size: 210 },
        head: { x: 418, y: 250, size: 130 },
      },
      model: {
        kind: 'parts',
        parts: ['Hero_Ell_Vari05_Body', 'Hero_Ell_Vari05_Hair'],
        right: 'Hero_Ell_Vari05_Weapon',
      },
    },
  ],
};
