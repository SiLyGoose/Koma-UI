import type { HeroAssets, RiggedModel } from '../types.ts';

/*
 * Selene in her third look (Hero_Selene_Vari03_…: her fifth's files have their colour pictures spoiled, one hue all
 * over): her body and hair, her bow in her left hand (held, not a shield) and an arrow in her right, along its x (her
 * shots come from its tip). She runs in in a sprint, attacks drawing an arrow and aiming it (going from one draw
 * straight on into the next), and uses her skills overdrawing her bow (Arrow Rain crouched and aimed up into the sky),
 * animations of Mixamo's (the motions alone); her arrow is gone from her hand once it is shot, and back as she reaches
 * to draw again. She stands by the poses written in code (../../heroes/selene/moves.ts).
 */

/** What moves her. */
const MOVED_BY = {
  kind: 'rigged',
  folder: 'Selene_Mixamo',
  run: 'Standing Sprint Forward.fbx',
  // An arrow drawn and aimed (drawn back by about 0.55 s in, held aimed after): loosed as it ends (../../sim/heroes/selene.ts).
  attack: [{ file: 'Standing Draw Arrow.fbx' }],
  chained: true,
  // (Her hand at her quiver, about 0.35 s into her draw.)
  loosed: { nock: 0.35 },
  // Her bow held drawn, drawn further and further (the first 2.6 s of it), each loosed as it lands its first (../../sim/heroes/selene.ts).
  skills: {
    rain: { file: 'Standing Aim Overdraw.fbx', span: [0, 2.6], crouch: 0.22, aimUp: 0.75 },
    rush: { file: 'Standing Aim Overdraw.fbx', span: [0, 2.6] },
    flash: { file: 'Standing Aim Overdraw.fbx', span: [0, 2.6] },
  },
} as const satisfies RiggedModel;

export const SELENE_ASSETS: HeroAssets = {
  name: 'Selene',
  folder: 'heroes/selene',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/10/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Notos, her bow.
  unique: { Hero_Selene_Vari03_Weapon: 'Hero_Selene_Unique01_Weapon' },
  skins: [
    {
      name: 'Selene',
      // Her artwork (from the wiki, asked for as the PNG it was uploaded as), the wind about her: her head and crown in the crop (the meter's close-up is her face by itself).
      portrait: {
        file: 'Selene.png',
        from: 'https://static.wikia.nocookie.net/charactah-account/images/0/01/Selene_%28King%27s_Raid%29_Render_01.png/revision/latest?cb=20221002055127&format=original',
        crop: { x: 265, y: 155, size: 130 },
        head: { x: 295, y: 195, size: 70 },
      },
      model: {
        kind: 'parts',
        parts: ['Hero_Selene_Vari03_Body', 'Hero_Selene_Hair_01'],
        left: 'Hero_Selene_Vari03_Weapon',
        offHand: 'held',
        right: 'Hero_Selene_Vari03_Arrow',
        grips: { L: { at: [0.071, 0.02, -0.002], turn: [-2.02, 0.87, 0.164] } },
        movedBy: MOVED_BY,
      },
    },
  ],
};
