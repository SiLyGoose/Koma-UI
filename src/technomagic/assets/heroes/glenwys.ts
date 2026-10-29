import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Glenwys, the Imperial Knight (Hero_Glenwys_…): her body, and her weapon in her right hand, a shield in the other, as King's Raid's own model has them. She is
 * moved by King's Raid's own animations of her (ANIMATIONS: ../../heroes/body/kr.ts).
 */

const DRIVE = 'https://drive.google.com/uc?export=download&id=';

/**
 * King's Raid's own animations (its skins of the game's files are moved by them: ../../heroes/body/kr.ts): its basic attack's
 * chain, and each skill's clips, with when its blows land in them as the game's timelines have them (KR-extracted/scripts/tm-anims.mjs).
 */
const ANIMATIONS = {
  idle: 'Idle',
  run: 'Run',
  hurt: 'Damage',
  victory: 'Victory',
  lose: 'Lose',
  dead: 'Dead',
  attack: [{ clips: ['Attack1-1'], hits: [0.3, 0.8] }, { clips: ['Attack1-2'], hits: [0.3] }, { clips: ['Attack1-3'], hits: [0.3, 0.7, 1.1] }],
  skills: {
    finisher: { clips: ['Skill1'], hits: [1.4, 1.7, 2, 2.3, 2.6, 2.9, 3.2] },
    unstayed: { clips: ['Skill2'], hits: [0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.9] },
    counter: { clips: ['Skill3'], hits: [1.5] },
  },
} as const satisfies KrAnimations;

export const GLENWYS_ASSETS: HeroAssets = {
  name: 'Glenwys',
  folder: 'heroes/glenwys',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/69/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded.
  unique: { Hero_Glenwys_Vari05_Shield: 'Hero_Glenwys_Unique01_Shield', Hero_Glenwys_Vari05_Gunblade: 'Hero_Glenwys_Unique01_Gunblade' },
  // King's Raid's sounds (its Hit.Hero.Glenwys.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_sword_02', volume: 1.3 }], [{ clip: 'Hit_sword_04', volume: 1.3 }], [{ clip: 'Hit_gun_01', volume: 1.2 }]],
      finisher: [[{ clip: 'Hit_common_04', volume: 1.2 }]],
      unstayed: [[{ clip: 'Hit_common_03', volume: 1.2 }]],
    },
    casts: {
      finisher: [{ clip: 'Attack-Casting-18', volume: 1.3 }, { clip: 'Death-Sword-03', volume: 1.5, at: 0.64 }, { clip: 'Glenwys-Vox_Skill2', volume: 3.2, at: 0.68, own: true }, { clip: 'FX-Sword-06', volume: 1.2, at: 0.84 }, { clip: 'Attack-Shot-20', volume: 1.5, at: 1.29 }, { clip: 'Attack-Shot-20', volume: 1.5, at: 1.57 }, { clip: 'Attack-Shot-20', volume: 1.5, at: 1.92 }, { clip: 'Attack-Shot-20', volume: 1.5, at: 2.19 }, { clip: 'Attack-Shot-20', volume: 1.5, at: 2.48 }, { clip: 'Attack-Shot-01', volume: 1.3, at: 2.75 }, { clip: 'Attack-Shot-20', volume: 1.5, at: 2.79 }],
      unstayed: [{ clip: 'Attack-Casting-18', volume: 1.3 }, { clip: 'Glenwys-Vox_Skill4', volume: 3.2, own: true }, { clip: 'Attack-Magic-03', volume: 1.3, at: 0.55 }, { clip: 'Attack-Magic-28', volume: 1.3, at: 0.89 }, { clip: 'Attack-Spin-08', volume: 1.5, at: 0.89 }, { clip: 'Attack-Casting-10', volume: 1.3, at: 0.99 }],
      counter: [{ clip: 'Glenwys-Vox_Skill7', volume: 3.2, own: true }, { clip: 'Attack-Casting-61', volume: 1.3, at: 0.42 }, { clip: 'Attack-Casting-48', volume: 1.3, at: 0.57 }, { clip: 'Attack-Casting-57', volume: 1.3, at: 1.09 }, { clip: 'Attack-Magic-03', volume: 1.3, at: 1.59 }],
    },
    victory: [{ clip: 'Death-Sword-01', volume: 1.2, at: 0.58 }, { clip: 'Glenwys-Vox_Victory', volume: 3.2, at: 0.79, own: true }, { clip: 'Attack-Body-01', volume: 1.2, at: 1.89 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Glenwys.Attack1.Casting1', 'Skill.Hero.Glenwys.Attack1.Casting2', 'Skill.Hero.Glenwys.Attack1.Casting3'], land: ['Skill.Hero.Glenwys.Attack1.Hit'] },
    finisher: { start: ['Skill.Hero.Glenwys.Skill1.Casting'], land: ['Skill.Hero.Glenwys.Skill1.Hit'] },
    unstayed: { start: ['Skill.Hero.Glenwys.Skill2.Casting'], land: ['Skill.Hero.Glenwys.Skill2.Hit'] },
    counter: { start: ['Skill.Hero.Glenwys.Skill3.Casting', 'Skill.Hero.Glenwys.Skill3.Shield'] },
  },
  skins: [
    {
      name: 'Glenwys',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Glenwys.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Glenwys.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Glenwys.webp',
      // Her artwork (the Drive folder's): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Glenwys.png', from: `${DRIVE}1QD77RE-P6pI6JUY_ux-dK6sJ-JNKTx16`, crop: { x: 340, y: 10, size: 160 }, head: { x: 374, y: 27, size: 85 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Glenwys_Vari05_Body', 'Hero_Glenwys_Hair_01'],
        left: 'Hero_Glenwys_Vari05_Shield',
        right: 'Hero_Glenwys_Vari05_Gunblade',
        blade: 'y',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Glenwys_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Glenwys_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Glenwys_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Glenwys_Summer.webp',
      title: 'Beachside Glenwys',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Glenwys_Cos19Summer_Body', 'Hero_Glenwys_Cos19Summer_Hair'],
        left: 'Hero_Glenwys_Cos19Summer_Shield',
        right: 'Hero_Glenwys_Cos19Summer_Gunblade',
        blade: 'y',
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Glenwys_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Glenwys_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Glenwys_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Glenwys_Halloween.webp',
      title: 'Dark Knight Glenwys',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Glenwys_Cos19Halloween_Body', 'Hero_Glenwys_Cos19Halloween_Hair'],
        left: 'Hero_Glenwys_Cos19Halloween_Shield',
        right: 'Hero_Glenwys_Cos19Halloween_Gunblade',
        blade: 'y',
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Glenwys_Glory',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Glenwys_Glory.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Glenwys_Glory.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Glenwys_Glory.webp',
      title: 'Glenwys of Honor (Light of the Blue Night Sky)',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Glenwys_Cos20GloryLeague_Body', 'Hero_Glenwys_Hair_01'],
        left: 'Hero_Glenwys_Cos20GloryLeague_Shield',
        right: 'Hero_Glenwys_Cos20GloryLeague_Gunblade',
        blade: 'y',
      },
    },
    // King's Raid's Dessert costume (tm-costumes.mjs).
    {
      name: 'Glenwys_Dessert',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Glenwys_Dessert.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Glenwys_Dessert.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Glenwys_Dessert.webp',
      title: 'Blueberry Pie Dreams Glenwys',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Glenwys_Cos20Dessert_Body', 'Hero_Glenwys_Cos20Dessert_Hair'],
        left: 'Hero_Glenwys_Cos20Dessert_Weapon_Shield',
        right: 'Hero_Glenwys_Cos20Dessert_Weapon_Gunblade',
        blade: 'y',
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Glenwys_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Glenwys_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Glenwys_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Glenwys_Christmas.webp',
      title: 'Guardian of the White Night Glenwys',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Glenwys_Cos20Christmas_Body', 'Hero_Glenwys_Cos20Christmas_Hair'],
        left: 'Hero_Glenwys_Cos20Christmas_Weapon_Shield',
        right: 'Hero_Glenwys_Cos20Christmas_Weapon_Gunblade',
        blade: 'y',
      },
    },
    // King's Raid's Fallen costume (tm-costumes.mjs).
    {
      name: 'Glenwys_Fallen',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Glenwys_Fallen.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Glenwys_Fallen.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Glenwys_Fallen.webp',
      title: 'Corrupted Sincerity Glenwys',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Glenwys_Cos21Fallen_Body', 'Hero_Glenwys_Cos21Fallen_Hair'],
        left: 'Hero_Glenwys_Cos21Fallen_Shield',
        right: 'Hero_Glenwys_Cos21Fallen_Gunblade',
        blade: 'y',
      },
    },
  ],
};
