import type { HeroAssets, PartsModel, RiggedModel } from '../types.ts';

/*
 * Neraxis in his fifth look: his body (his wings a part of it), his hair, and his dragon's-head gauntlet on his left hand
 * (where his body's file marks it: held, not a shield). He stands in a boxer's bouncing idle, runs in, attacks with a fist fight (Ezekiel's)
 * and roars Obsidian Roar as a battle cry, animations of Mixamo's (the motions alone); his other skills are the poses
 * written in code (../../heroes/neraxis/moves.ts).
 */

/** How his left hand wears his gauntlet (his body's file marks its hand at his feet): along his hand, the dragon's head over his fist. */
const GRIPS = { L: { at: [0, 0, 0], turn: [0, 0, 0] } } as const satisfies PartsModel['grips'];

/** What moves him. */
const MOVED_BY = {
  kind: 'rigged',
  folder: 'Neraxis_Mixamo',
  idle: 'Bouncing Fight Idle.fbx',
  run: 'Unarmed Run Forward.fbx',
  // A jab, a cross, a hook and a kick from his guard, and back to it: the blows land as Ezekiel's do (../../sim/heroes/neraxis.ts).
  attack: [{ file: 'Fist Fight A.fbx' }],
  skills: { roar: { file: 'Standing Taunt Battlecry.fbx' } },
} as const satisfies RiggedModel;

export const NERAXIS_ASSETS: HeroAssets = {
  name: 'Neraxis',
  folder: 'heroes/neraxis',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/58/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded: Acravita, his gauntlet.
  unique: { Hero_Neraxis_Vari05_Weapon: 'Hero_Neraxis_Unique01_Weapon' },
  skins: [
    {
      name: 'Neraxis',
      // His artwork (the King's Raid Index's): his head and horns in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Neraxis.png', from: 'https://raw.githubusercontent.com/IcyDipity/KingsRaidIndex/master/images/heroes/Neraxis/Neraxis.png', crop: { x: 480, y: 220, size: 175 }, head: { x: 510, y: 265, size: 110 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Neraxis_Vari05_Body', 'Hero_Neraxis_Hair_01'],
        left: 'Hero_Neraxis_Vari05_Weapon',
        offHand: 'held',
        grips: GRIPS,
        movedBy: MOVED_BY,
      },
    },
  ],
};
