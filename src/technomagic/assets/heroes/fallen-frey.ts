import type { HeroAssets } from '../types.ts';

export const FALLEN_FREY_ASSETS: HeroAssets = {
  name: 'Fallen Frey',
  folder: 'heroes/fallen-frey',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/89/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her dark self rising behind her (Blessing of Doom): her body as the game's effects have it, with the noise it is burnt away by.
  props: { self: 'Hero_Frey_Fallen_Vari05FX_Mesh' },
  // Her unique weapon, wielded: Rosmerta.
  unique: { Hero_Frey_Fallen_Vari05_Weapon: 'Hero_Frey_Fallen_Unique01_Weapon' },
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
        // Fallen Frey as Mixamo rigged her, read for her idle and Light of Doom alone, and the game's own cutscene of her for Heaven's
        // Vengeance: she runs in and does the rest as ../../heroes/fallen-frey/moves.ts has it.
        movedBy: {
          kind: 'rigged',
          folder: 'Fallen_Frey_Mixamo',
          idle: 'Standing Torch Idle 01.fbx',
          skills: {
            // Her free hand thrust out ahead (fully out 0.95 s in, where the heal comes down), held there, and the light bursting on the boss as she lets it go.
            light: { file: 'Fallen Frey - Magic Heal.fbx' },
            // Her weapon raised high overhead in her left hand (the cutscene of her coming to the player, Maps, Items, Other/Other: from
            // 2.2 s into it, gathering, to 4.4 s, lowering it), held up while the light comes down on the boss.
            vengeance: { file: 'FreyFallen.fbx', folder: 'FreyFallen', span: [2.2, 4.4] },
          },
        },
      },
    },
  ],
};
