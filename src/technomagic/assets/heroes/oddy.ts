import type { HeroAssets } from '../types.ts';

/*
 * Oddy, a red panda: her body (all of her in one), and her clock in her right hand, the only hand her file marks (at her
 * feet, as Valance's does: so it is held as GRIP has it). No rig of hers: she stands, runs in and does everything by
 * the poses written in code (../../heroes/oddy/moves.ts).
 */

/** How she holds her clock: by its rim, in her paw. */
const GRIP = { at: [0.08, 0, 0], turn: [0, 0, 0] } as const;

export const ODDY_ASSETS: HeroAssets = {
  name: 'Oddy',
  folder: 'heroes/oddy',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/41/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Tempodiana, her clock.
  unique: { Hero_Oddy_Vari05_Weapon: 'Hero_Oddy_Unique01_Weapon' },
  skins: [
    {
      name: 'Oddy',
      // Her artwork (from the wiki, asked for as the PNG it was uploaded as), her clock overhead: her head, ears and goggles in the crop (the meter's close-up is her face by itself).
      portrait: {
        file: 'Oddy.png',
        from: 'https://static.wikia.nocookie.net/charactah-account/images/6/6f/Oddy_Render_01.png/revision/latest?cb=20221007054314&format=original',
        crop: { x: 290, y: 290, size: 160 },
        head: { x: 325, y: 335, size: 95 },
      },
      model: {
        kind: 'parts',
        parts: ['Hero_Oddy_Vari05_Mesh'],
        right: 'Hero_Oddy_Vari05_Weapon',
        grips: { R: GRIP },
      },
    },
  ],
};
