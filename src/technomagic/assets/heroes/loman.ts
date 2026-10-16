import type { HeroAssets, RiggedModel } from '../types.ts';

/*
 * Loman in his fourth look (Hero_Loman_Vari04_…: his fifth's weapon and hair have their colour pictures spoiled, one hue
 * all over; every file of his hair has, so his ponytail is drawn orange, not blue): his body, his hair, and his halberd in
 * his right hand, laid out along what was its y. He stands and runs in by animations of Mixamo's (the motions alone); his
 * attack (a lunge, his halberd thrust out) and his skills are the poses written in code (../../heroes/loman/moves.ts). (The game's
 * cutscene of his ascension, Maps, Items, Other/Other, has him rise into the air, lie flat and turn about: nothing a
 * skill of his could be played with.)
 */

/** What moves him. */
const MOVED_BY = {
  kind: 'rigged',
  folder: 'Loman_Mixamo',
  idle: 'Standing Idle.fbx',
  run: 'Unarmed Run Forward.fbx',
} as const satisfies RiggedModel;

export const LOMAN_ASSETS: HeroAssets = {
  name: 'Loman',
  folder: 'heroes/loman',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/73/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded: Gaiamenes, his halberd.
  unique: { Hero_Loman_Vari04_Weapon: 'Hero_Loman_Unique_Weapon' },
  skins: [
    {
      name: 'Loman',
      // His artwork (the King's Raid Index's), his halberd planted beside him: his helmed head in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Loman.png', from: 'https://raw.githubusercontent.com/IcyDipity/KingsRaidIndex/master/images/heroes/Loman/Loman.png', crop: { x: 380, y: 240, size: 150 }, head: { x: 405, y: 280, size: 95 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Loman_Vari04_Body', 'Hero_Loman_Vari04_Hair'],
        right: 'Hero_Loman_Vari04_Weapon',
        blade: 'y',
        movedBy: MOVED_BY,
      },
    },
  ],
};
