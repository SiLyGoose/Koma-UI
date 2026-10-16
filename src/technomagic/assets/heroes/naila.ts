import type { HeroAssets, RiggedModel } from '../types.ts';

/*
 * Naila: her body, her hair and wings, and her claws (on her skeleton, as her body's file has them: none in her hands).
 * She attacks with a fist fight (Ezekiel's, an animation of Mixamo's: the motion alone), going from one straight on into
 * the next; she stands, runs in and does her skills by the poses written in code (../../heroes/naila/moves.ts).
 */

/** What moves her. */
const MOVED_BY = {
  kind: 'rigged',
  folder: 'Naila_Mixamo',
  // A jab, a cross, a hook and a kick from her guard, and back to it: the blows land as Ezekiel's do (../../sim/heroes/naila.ts).
  attack: [{ file: 'Fist Fight A.fbx' }],
  chained: true,
} as const satisfies RiggedModel;

export const NAILA_ASSETS: HeroAssets = {
  name: 'Naila',
  folder: 'heroes/naila',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/20/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Baroro, her claws.
  unique: { Hero_Naila_Vari05_Weapon: 'Hero_Naila_Unique01_Weapon' },
  skins: [
    {
      name: 'Naila',
      // Her artwork (from the wiki, asked for as the PNG it was uploaded as), her wings spread: her head in the crop (the meter's close-up is her face by itself).
      portrait: {
        file: 'Naila.png',
        from: 'https://static.wikia.nocookie.net/charactah-account/images/a/a4/Naila_%28King%27s_Raid%29_Render_01.png/revision/latest?cb=20220930025252&format=original',
        crop: { x: 345, y: 195, size: 115 },
        head: { x: 375, y: 228, size: 58 },
      },
      model: {
        kind: 'parts',
        parts: ['Hero_Naila_Vari05_Body', 'Hero_Naila_Vari05_Hair', 'Hero_Naila_Vari05_Weapon'],
        movedBy: MOVED_BY,
      },
    },
  ],
};
