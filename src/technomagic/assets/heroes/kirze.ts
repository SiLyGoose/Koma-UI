import type { HeroAssets, RiggedModel } from '../types.ts';

const FOLDER = 'heroes/kirze';
const GLORY = 'Kirze_Cos20GloryLeague';
const RUN = 'Kirze_Cos20GloryLeague - Standing Run Forward.fbx';

/** Her Glory League rig's run, borrowed whole: how a hero with no run of its own runs in (../../heroes/load.ts). */
export const KIRZE_RUN = { kind: 'rigged', folder: GLORY, of: FOLDER, run: RUN } as const satisfies RiggedModel;

export const KIRZE_ASSETS: HeroAssets = {
  name: 'Kirze',
  folder: FOLDER,
  skills: { from: 'https://kingsraid.shodyra.com/static/images/79/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  skins: [
    {
      name: 'Kirze',
      // (Her face square takes in her ears: the meter's close-up is her face by itself.)
      portrait: { file: 'Kirze.png', crop: { x: 805, y: 4, size: 170 }, head: { x: 808, y: 62, size: 125 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Kirze_Vari05_Body', 'Hero_Kirze_Vari05_Hair', 'Hero_Kirze_Vari05_Arms_Mesh'],
        // Her two blades joined as one, in her right hand (they also come apart: Hero_Kirze_Vari05_Weapon_L and _R, one for each hand).
        right: 'Hero_Kirze_Vari05_Weapon',
        movedBy: 'Kirze_Glory',
      },
    },
    // Rigged by Mixamo, then finished with the game's own skin weights, its tail, hair and skirt bones, and its weapon.
    {
      name: 'Kirze_Glory',
      portrait: { file: 'Kirze_Glory.png', crop: { x: 356, y: 112, size: 135 }, head: { x: 362, y: 140, size: 85 } },
      model: {
        kind: 'rigged',
        folder: GLORY,
        idle: 'Kirze_Cos20GloryLeague - Ninja Idle.fbx',
        run: RUN,
        // One cut inward where it stands, then three as it walks forward. A blow lands a little after its blade is
        // moving fastest (1.17 s into the first; 0.63, 1.2 and 2.43 s into the second): as the swing comes through.
        attack: [
          { file: 'Kirze_Cos20GloryLeague - Stable Sword Inward Slash.fbx', lands: [1.29], until: 1.6 },
          { file: 'Kirze_Cos20GloryLeague - Sword And Shield Slash.fbx', lands: [0.75, 1.32, 2.55], until: 3 },
        ],
      },
    },
  ],
};
