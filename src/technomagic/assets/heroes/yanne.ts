import type { HeroAssets, PartsModel, RiggedModel } from '../types.ts';

/*
 * Yanne in her fourth look (Hero_Yanne_Vari04_…: her fifth's hair and headband have their colour pictures spoiled, one
 * hue all over): her body and hair, her great bow in her left hand (held, not a shield: its string drawn by bones of its
 * own), and an arrow in her right, along its x (her shots come from its tip). She runs in in a sprint, attacks
 * drawing an arrow and aiming it (from one draw straight on into the next), and uses her skills overdrawing her bow, as
 * Selene does: animations of Mixamo's (the motions alone); her arrow is gone from her hand once it is shot, and back as
 * she reaches to draw again. She stands by the poses written in code (../../heroes/yanne/moves.ts).
 */

/** How her left hand holds her bow for her animations (as Selene holds hers): upright, its string toward her, as she draws. */
const GRIPS = { L: { at: [0.051, 0.031, 0], turn: [-2.222, 0.732, 0.474] } } as const satisfies PartsModel['grips'];

/** What moves her. */
const MOVED_BY = {
  kind: 'rigged',
  folder: 'Yanne_Mixamo',
  run: 'Standing Sprint Forward.fbx',
  // An arrow drawn and aimed (drawn back by about 0.55 s in, held aimed after): loosed as it ends (../../sim/heroes/yanne.ts).
  attack: [{ file: 'Standing Draw Arrow.fbx' }],
  chained: true,
  // (Her hand at her quiver, about 0.35 s into her draw.)
  loosed: { nock: 0.35 },
  // Her bow held drawn, drawn further and further (the first 2.6 s of it), loosed as each lands (../../sim/heroes/yanne.ts).
  skills: {
    focus: { file: 'Standing Aim Overdraw.fbx', span: [0, 2.6] },
    wipeout: { file: 'Standing Aim Overdraw.fbx', span: [0, 2.6] },
    unleash: { file: 'Standing Aim Overdraw.fbx', span: [0, 2.6], aimUp: 0.6 },
  },
} as const satisfies RiggedModel;

export const YANNE_ASSETS: HeroAssets = {
  name: 'Yanne',
  folder: 'heroes/yanne',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/44/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Svelta, her bow.
  unique: { Hero_Yanne_Vari04_Weapon: 'Hero_Yanne_Unique01_Weapon' },
  skins: [
    {
      name: 'Yanne',
      // Her artwork (the King's Raid Index's): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Yanne.png', from: 'https://raw.githubusercontent.com/IcyDipity/KingsRaidIndex/master/images/heroes/Yanne/Yanne.png', crop: { x: 315, y: 395, size: 160 }, head: { x: 355, y: 440, size: 95 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Yanne_Vari04_Body', 'Hero_Yanne_Vari04_Hair'],
        left: 'Hero_Yanne_Vari04_Weapon',
        offHand: 'held',
        right: 'Hero_Yanne_Arrow',
        grips: GRIPS,
        movedBy: MOVED_BY,
      },
    },
  ],
};
