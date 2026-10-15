import type { HeroAssets, PartsModel, RiggedModel } from '../types.ts';

/*
 * Seria: her body (her hair is a part of its own, the first of her files'), her sword in her right hand (its blade
 * along what was its y, as Clause's) and its sheath held in her left. The sword is kept in the sheath (its hilt
 * showing, as the sheath's file has it) but while she attacks or uses a skill: ../../heroes/body/sheath.ts. She runs in and attacks by animations of
 * Mixamo's (a sword and shield run and slash, the motions alone); she stands and does her skills by the poses written
 * in code (a swordsman's, and ../../heroes/seria/moves.ts).
 */

const DRIVE = 'https://drive.google.com/uc?export=download&id=';

/**
 * How her hands hold her sword and sheath (her body's files mark both hands at her feet): her sword by the middle of
 * its grip, its blade out past her little finger, so it points away from her as she swings it (her slash's animation
 * holds a sword that way); her sheath in her left hand as Morrah holds her sword, mirrored and turned about, so it runs
 * back past her little finger and the hilt in it is forward, ready to be drawn.
 */
const GRIPS = {
  R: { at: [0.064, -0.149, 0.002], turn: [Math.PI, 0.436, 0] },
  L: { at: [0.064, 0.021, 0.002], turn: [Math.PI, -0.436, 0] },
} as const satisfies PartsModel['grips'];

/** The same for both her skins (one skeleton). */
const MOVED_BY = {
  kind: 'rigged',
  folder: 'Seria_Mixamo',
  run: 'Seria - Sword And Shield Run.fbx',
  // One slash where she stands, from her right across to her left: her sword hand is moving fastest 0.8 s in, and the blow
  // lands a little after, as the swing comes through. Left as the swing ends, easing back to how she stands.
  attack: [{ file: 'Seria - Sword And Shield Slash.fbx', lands: [0.86], until: 1.1 }],
} as const satisfies RiggedModel;

export const SERIA_ASSETS: HeroAssets = {
  name: 'Seria',
  folder: 'heroes/seria',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/52/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Elsion, her sword and its sheath.
  unique: { Hero_Seria_Vari05_WeaponA: 'Hero_Seria_Unique01_WeaponA', Hero_Seria_Vari05_WeaponB: 'Hero_Seria_Unique01_WeaponB' },
  skins: [
    {
      name: 'Seria',
      // Her artwork, crouched with her sword drawn: her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Seria.png', from: `${DRIVE}1eTijd3ZY18qjl6KknmLWuOYgZQCwDCrN`, crop: { x: 605, y: 70, size: 200 }, head: { x: 655, y: 160, size: 120 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Seria_Vari05_Body', 'Hero_Seria_Hair_01'],
        left: 'Hero_Seria_Vari05_WeaponB',
        right: 'Hero_Seria_Vari05_WeaponA',
        offHand: 'held',
        blade: 'y',
        grips: GRIPS,
        movedBy: MOVED_BY,
      },
    },
    // Her Christmas costume, with its own hair, sword and sheath.
    {
      name: 'Seria_Christmas',
      portrait: { file: 'Seria_Christmas.png', from: `${DRIVE}1zbsVdK__ytCQ-YxrIpRV_SNKRaDSqamX`, crop: { x: 345, y: 10, size: 200 }, head: { x: 400, y: 118, size: 115 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Seria_Cos19Christmas_Body', 'Hero_Seria_Cos19Christmas_Hair'],
        left: 'Hero_Seria_Cos19Christmas_Weapon_B',
        right: 'Hero_Seria_Cos19Christmas_Weapon_A',
        offHand: 'held',
        blade: 'y',
        grips: GRIPS,
        movedBy: MOVED_BY,
      },
    },
  ],
};
