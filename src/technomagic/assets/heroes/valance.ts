import type { HeroAssets } from '../types.ts';

/*
 * Valance's files have only her fourth look (Hero_Valance_Vari04_…): her body (her face in it; Hero_Valance_Facial_Mesh
 * is only its expressions), and her technomagic crossbow, in her right hand: the only hand her file marks. With no
 * rig of hers, she stands, runs in and does the rest as ../../heroes/valance/moves.ts has it. (No artwork of hers
 * yet: her card pictures her as she stands on the field.)
 */

export const VALANCE_ASSETS: HeroAssets = {
  name: 'Valance',
  folder: 'heroes/valance',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/101/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  skins: [
    {
      name: 'Valance',
      model: {
        kind: 'parts',
        parts: ['Hero_Valance_Vari04_Mesh'],
        right: 'Hero_Valance_Vari04_Weapon',
      },
    },
  ],
};
