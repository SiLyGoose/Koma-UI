import type { HeroAssets, RiggedModel } from '../types.ts';

/*
 * Tanya in her fifth look: her body (her hair and mask a part of it), and a katar on each fist (the same file in both
 * hands, held, not a shield). She stands in Ezekiel's ninja idle and attacks with his fist fight (his rig's own files,
 * borrowed whole: animations of Mixamo's, the motions alone); she runs in and does her skills by the poses written in
 * code (../../heroes/tanya/moves.ts).
 */

/** What moves her. */
const MOVED_BY = {
  kind: 'rigged',
  folder: 'Ezekiel_Mixamo',
  of: 'heroes/ezekiel',
  idle: 'Ezekiel - Ninja Idle.fbx',
  // A jab, a cross, a hook and a kick from her guard, and back to it: the blows land as Ezekiel's do (../../sim/heroes/tanya.ts).
  attack: [{ file: 'Ezekiel - Fist Fight A.fbx' }],
} as const satisfies RiggedModel;

export const TANYA_ASSETS: HeroAssets = {
  name: 'Tanya',
  folder: 'heroes/tanya',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/36/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Caethasis, her katars.
  unique: { Hero_Tanya_Vari05_Weapon: 'Hero_Tanya_Unique01_Weapon' },
  skins: [
    {
      name: 'Tanya',
      // Her artwork (the King's Raid Index's), leaping with her katars out: her hooded head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Tanya.png', from: 'https://raw.githubusercontent.com/IcyDipity/KingsRaidIndex/master/images/heroes/Tanya/Tanya.png', crop: { x: 575, y: 85, size: 170 }, head: { x: 610, y: 110, size: 105 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Tanya_Vari05_Mesh'],
        left: 'Hero_Tanya_Vari05_Weapon',
        offHand: 'held',
        right: 'Hero_Tanya_Vari05_Weapon',
        movedBy: MOVED_BY,
      },
    },
  ],
};
