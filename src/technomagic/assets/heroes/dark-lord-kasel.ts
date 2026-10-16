import type { HeroAssets, RiggedModel } from '../types.ts';

/*
 * Dark Lord Kasel, the Corrupted Warrior of the Holy Sword (Hero_Kasel_DarkLord_…): his body (his face and skirt in it),
 * his hair, and Aea in his right hand, laid out as Klaus's sword is (the blade along what was its y). He runs in by an
 * animation of Mixamo's (the motion alone, as Loman's is); he stands on guard, attacks and does his skills by the poses written in
 * code (../../heroes/dark-lord-kasel/moves.ts).
 */

/** What moves him. */
const MOVED_BY = {
  kind: 'rigged',
  folder: 'DarkLordKasel_Mixamo',
  run: 'Unarmed Run Forward.fbx',
} as const satisfies RiggedModel;

export const DARK_LORD_KASEL_ASSETS: HeroAssets = {
  name: 'Dark Lord Kasel',
  folder: 'heroes/dark-lord-kasel',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/88/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded: Aea, the Corrupted Holy Sword.
  unique: { Hero_Kasel_DarkLord_Vari05_Weapon: 'Hero_Kasel_DarkLord_Unique01_Weapon' },
  skins: [
    {
      name: 'Dark Lord Kasel',
      // His artwork, darkness in his raised left hand (i.postimg.cc/2850R7jk/Dark-Lord-Kasel-1.jpg: only 214 pixels wide, on
      // white; kept with the page four times as big, the white cut away): his head and horns in the crop (the meter's
      // close-up is his face by itself).
      portrait: { file: 'Dark_Lord_Kasel.png', crop: { x: 395, y: 40, size: 180 }, head: { x: 425, y: 130, size: 100 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Kasel_DarkLord_Vari05_Body', 'Hero_Kasel_DarkLord_Vari05_Hair'],
        right: 'Hero_Kasel_DarkLord_Vari05_Weapon',
        blade: 'y',
        movedBy: MOVED_BY,
      },
    },
  ],
};
