import type { HeroAssets } from '../types.ts';

/*
 * Valance's files have only her fourth look (Hero_Valance_Vari04_…): her body (her face in it; Hero_Valance_Facial_Mesh
 * is only its expressions), and her technomagic crossbow, in her right hand: the only hand her file marks (at her feet,
 * as Seria's do, so it is held as GRIP has it). With no rig of hers, she stands, runs in and does the rest as
 * ../../heroes/valance/moves.ts has it.
 */

/**
 * How she holds her crossbow: by the cap at its back (where its file has its middle), in her palm, its bolt along her
 * hand and out past her fingers (the crossbow's own x, its single top limb its y), so it points where her hand does.
 */
const GRIP = { at: [0.06, 0, 0], turn: [0, 0, 0] } as const;

export const VALANCE_ASSETS: HeroAssets = {
  name: 'Valance',
  folder: 'heroes/valance',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/101/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  skins: [
    {
      name: 'Valance',
      // Her artwork (from the wiki, asked for as the PNG it was uploaded as, not the WebP it is served as), her crossbow
      // flung out: her head and goggles in the crop (the meter's close-up is her face by itself).
      portrait: {
        file: 'Valance.png',
        from: 'https://static.wikia.nocookie.net/charactah-account/images/a/a5/Valance_Render_01.png/revision/latest?cb=20221002060111&format=original',
        crop: { x: 360, y: 30, size: 125 },
        head: { x: 385, y: 80, size: 72 },
      },
      model: {
        kind: 'parts',
        parts: ['Hero_Valance_Vari04_Mesh'],
        right: 'Hero_Valance_Vari04_Weapon',
        grips: { R: GRIP },
      },
    },
  ],
};
