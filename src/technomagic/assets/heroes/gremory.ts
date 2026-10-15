import type { HeroAssets } from '../types.ts';

/**
 * Her cube, floating under her, big enough to lie on: she lies on her side along its top, her head at its back and
 * her right knee over its front edge (its top just under her as she lies: her moves, ../../heroes/gremory/moves.ts,
 * keep her there). The same for both her skins.
 */
const CUBE = { at: [0, 0.52, -0.1], size: 1.1 } as const;

export const GREMORY_ASSETS: HeroAssets = {
  name: 'Gremory',
  folder: 'heroes/gremory',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/94/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Pigritia, her cube.
  unique: { Hero_Gremory_Vari05_Weapon: 'Hero_Gremory_Unique01_Weapon' },
  skins: [
    // As in her artwork: no hood, her cape about her hips, her long hair and horns. Her files' own texture for this
    // body is tinted orange: it is drawn with her hooded body's, on the same layout. (Her files have her hood up and
    // open too: Hero_Gremory_Vari05_Hood and _HoodOpen, each with its own hair.)
    {
      name: 'Gremory',
      // Her artwork, sitting on her cube (its face is small: the meter's close-up is her face by itself).
      portrait: { file: 'Gremory.png', crop: { x: 315, y: 132, size: 80 }, head: { x: 327, y: 142, size: 56 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Gremory_Vari05_Normal', 'Hero_Gremory_Vari05_Hair'],
        repaint: { from: 'Hero_Gremory_Vari05_Normal', to: 'Hero_Gremory_Vari05_Hood' },
        floating: { model: 'Hero_Gremory_Vari05_Weapon', ...CUBE },
      },
    },
    // Her Daily Look: its body has her hair in it.
    {
      name: 'Gremory_DailyLook',
      // Her artwork in her hoodie, sitting on her cube (the King's Raid wiki's: `format=original` has it send the PNG, not a WebP):
      // her hood and horns in the crop, her face by itself the meter's close-up.
      portrait: {
        file: 'Gremory_DailyLook.png',
        from: 'https://static.wikia.nocookie.net/charactah-account/images/6/69/Gremory_%28King%27s_Raid%29_Render_02.png/revision/latest?cb=20220930050745&format=original',
        crop: { x: 225, y: 0, size: 175 },
        head: { x: 250, y: 80, size: 108 },
      },
      model: {
        kind: 'parts',
        parts: ['Hero_Gremory_Cos21DailyLook_Body'],
        floating: { model: 'Hero_Gremory_Cos21DailyLook_Weapon', ...CUBE },
      },
    },
  ],
};
