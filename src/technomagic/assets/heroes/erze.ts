import type { HeroAssets } from '../types.ts';

/*
 * Erze in her fourth look (Hero_Erze_Vari04_…: her fifth's weapon has its colour picture spoiled, one hue all over): her
 * body, her hair, and her bat-winged orb of blood floating by her right shoulder (its file has it on her skeleton, at her
 * feet, where the game's own animations move it from). No rig of hers: she stands, runs in and does everything by the
 * poses written in code (../../heroes/erze/moves.ts).
 */

/** Where her orb floats: by her right shoulder, a little ahead of her. */
const ORB = { at: [-0.4, 1.25, 0.15], size: 1 } as const;

export const ERZE_ASSETS: HeroAssets = {
  name: 'Erze',
  folder: 'heroes/erze',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/53/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Perion, her orb.
  unique: { Hero_Erze_Vari04_Weapon: 'Hero_Erze_Unique01_Weapon' },
  skins: [
    {
      name: 'Erze',
      // Her artwork (the King's Raid Index's): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Erze.png', from: 'https://raw.githubusercontent.com/IcyDipity/KingsRaidIndex/master/images/heroes/Erze/Erze.png', crop: { x: 455, y: 160, size: 190 }, head: { x: 535, y: 205, size: 105 } },
      model: { kind: 'parts', parts: ['Hero_Erze_Vari04_Body', 'Hero_Erze_Vari04_Hair'], floating: { model: 'Hero_Erze_Vari04_Weapon', ...ORB } },
    },
  ],
};
