import type { HeroAssets } from '../types.ts';

/*
 * Oddy, a red panda: his body (all of him in one), and his clock floating on his back, its face to the back (its file
 * has it at his right hand, but it is no weapon he swings: what he casts comes from his paw). No rig of his: he hovers,
 * glides in and does everything by the poses written in code (../../heroes/oddy/moves.ts).
 */

/** His clock on his back: its middle at his chest's height, its front a little behind him, its top over his head. */
const CLOCK = { at: [0, 0.75, -0.32], size: 1 } as const;

export const ODDY_ASSETS: HeroAssets = {
  name: 'Oddy',
  folder: 'heroes/oddy',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/41/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded: Tempodiana, his clock.
  unique: { Hero_Oddy_Vari05_Weapon: 'Hero_Oddy_Unique01_Weapon' },
  skins: [
    {
      name: 'Oddy',
      // His artwork (from the wiki, asked for as the PNG it was uploaded as), his clock overhead: his head, ears and goggles in the crop (the meter's close-up is his face by itself).
      portrait: {
        file: 'Oddy.png',
        from: 'https://static.wikia.nocookie.net/charactah-account/images/6/6f/Oddy_Render_01.png/revision/latest?cb=20221007054314&format=original',
        crop: { x: 290, y: 290, size: 160 },
        head: { x: 325, y: 335, size: 95 },
      },
      model: {
        kind: 'parts',
        parts: ['Hero_Oddy_Vari05_Mesh'],
        floating: { model: 'Hero_Oddy_Vari05_Weapon', ...CLOCK },
      },
    },
  ],
};
