import type { HeroAssets } from '../types.ts';

export const FALLEN_FREY_ASSETS: HeroAssets = {
  name: 'Fallen Frey',
  folder: 'heroes/fallen-frey',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/89/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  skins: [
    {
      name: 'Fallen Frey',
      // Her artwork, cut out of its white ground.
      portrait: { file: 'Fallen_Frey.png', crop: { x: 528, y: 72, size: 150 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Frey_Fallen_Vari05_Body', 'Hero_Frey_Fallen_Vari05_Hair'],
        // Her weapon, in her left hand: the only hand her file marks.
        left: 'Hero_Frey_Fallen_Vari05_Weapon',
        offHand: 'held',
        // Fallen Frey as Mixamo rigged her, read for Light of Doom alone: she stands, runs in and does the rest as ../../heroes/fallen-frey/moves.ts has it.
        movedBy: {
          kind: 'rigged',
          folder: 'Fallen_Frey_Mixamo',
          // Her free hand thrust out ahead (fully out 0.95 s in, where the heal comes down), held there, and the light bursting on the boss as she lets it go.
          skills: { light: { file: 'Fallen Frey - Magic Heal.fbx', lands: [0.95, 1.45], until: 2.35 } },
        },
      },
    },
  ],
};
