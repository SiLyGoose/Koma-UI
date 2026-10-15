import type { HeroAssets } from '../types.ts';

/**
 * Rascal, her golem, hovering beside her left shoulder and a little behind it: on the boss's side of her as the
 * field shows her, so her attack's beam (out of it: ../../heroes/annette/fx.ts) goes clear of her. The same for both her skins.
 */
const RASCAL = { at: [0.6, 1.15, -0.2], size: 1 } as const;

/**
 * Annette as Mixamo rigged her, read for her idle alone: she stands in it, and runs in and does the rest as
 * ../../heroes/annette/moves.ts has it. The same for both her skins (one skeleton).
 */
const MOVED_BY = { kind: 'rigged', folder: 'Annette_Mixamo', idle: 'Annette - Idle.fbx' } as const;

export const ANNETTE_ASSETS: HeroAssets = {
  name: 'Annette',
  folder: 'heroes/annette',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/33/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  skins: [
    {
      name: 'Annette',
      // Her artwork, Rascal held up over her head: her head in the middle of the crop (the meter’s close-up is her face by itself, under her ribbon).
      portrait: { file: 'Annette.png', crop: { x: 417, y: 420, size: 140 }, head: { x: 428, y: 458, size: 110 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Annette_Vari05_Body', 'Hero_Annette_Vari05_Hair'],
        floating: { model: 'Hero_Annette_Vari05_Weapon', ...RASCAL },
        movedBy: MOVED_BY,
      },
    },
    // Her Halloween costume, with its own hair and a Rascal of its own (smaller).
    {
      name: 'Annette_Halloween',
      model: {
        kind: 'parts',
        parts: ['Hero_Annette_Cos17Halloween_Body', 'Hero_Annette_Cos17Halloween_Hair'],
        floating: { model: 'Hero_Annette_Cos17Halloween_Weapon', ...RASCAL },
        movedBy: MOVED_BY,
      },
    },
  ],
};
