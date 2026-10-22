import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Aselica, the Knight of the Sun (Hero_Aselica_…): her body and hair, and her weapon in her right hand, a shield in the other, as King's Raid's own model has them. She is
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
  attack: [{ clips: ['Attack1-1'], hits: [0.3] }, { clips: ['Attack1-2'], hits: [0.5, 0.7] }, { clips: ['Attack1-3'], hits: [0.4] }, { clips: ['Attack1-4'], hits: [0.4] }, { clips: ['Attack1-5'], hits: [] }],
  skills: {
    sunsword: { clips: ['Skill1'], hits: [1.6] },
    sunbless: { clips: ['Skill2'], hits: [0, 1.1] },
    sunjudge: { clips: ['Skill3-1', 'Skill3-2', 'Skill3-3'], hits: [0.4, 0.9, 1.4, 1.9, 2.4, 2.9, 3.4, 3.9] },
  },
} as const satisfies KrAnimations;

export const ASELICA_ASSETS: HeroAssets = {
  name: 'Aselica',
  folder: 'heroes/aselica',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/48/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded.
  unique: { Hero_Aselica_Vari05_Shield: 'Hero_Aselica_Unique01_Shield', Hero_Aselica_Vari05_Sword: 'Hero_Aselica_Unique01_Sword' },
  // King's Raid's sounds (its Hit.Hero.Aselica.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_sword_01', volume: 1.5 }]],
      sunsword: [[{ clip: 'Hit_magic_04', volume: 2 }]],
      sunjudge: [[{ clip: 'Hit_sword_03', volume: 2 }]],
    },
    casts: {
      sunsword: [{ clip: 'Attack-Casting-16', volume: 1.2 }, { clip: 'Attack-Casting-21', volume: 1.4 }, { clip: 'Aselica-Vox_Skill1', volume: 2.3, own: true }, { clip: 'Attack-Magic-06', volume: 1.2, at: 1.15 }, { clip: 'Attack-Magic-09', volume: 1.2, at: 1.72 }, { clip: 'Attack-Magic-09', volume: 1.2, at: 1.87 }],
      sunbless: [{ clip: 'Attack-Casting-16', volume: 1.2 }, { clip: 'Aselica-Vox_Skill2', volume: 2.3, own: true }, { clip: 'Attack-Casting-21', volume: 1.4, at: 0.41 }, { clip: 'Attack-Magic-12', volume: 1.3, at: 1.09 }, { clip: 'Attack-Magic-09', volume: 1.4, at: 1.09 }, { clip: 'FX-Satria-Wing_01', volume: 1.8, at: 1.44 }],
      sunjudge: [{ clip: 'Attack-Casting-16', volume: 1.2 }, { clip: 'Aselica-Vox_Skill3', volume: 2.3, own: true }, { clip: 'Attack-Magic-13', volume: 0.8, at: 0.67 }, { clip: 'Attack-Magic-60', volume: 1.2, at: 0.73 }, { clip: 'Attack-Magic-60', volume: 1.2, at: 1.19 }, { clip: 'Attack-Magic-13', volume: 0.8, at: 1.48 }, { clip: 'Attack-Magic-60', volume: 1.2, at: 1.67 }, { clip: 'Attack-Magic-60', volume: 1.2, at: 2.08 }, { clip: 'Attack-Magic-13', volume: 0.8, at: 2.33 }, { clip: 'Attack-Magic-60', volume: 1.2, at: 2.61 }, { clip: 'Attack-Magic-60', volume: 1.2, at: 3.13 }, { clip: 'Attack-Magic-13', volume: 0.8, at: 3.24 }, { clip: 'Attack-Magic-60', volume: 1.2, at: 3.67 }, { clip: 'Attack-Magic-13', volume: 0.8, at: 4.1 }, { clip: 'Attack-Magic-60', volume: 1.2, at: 4.15 }, { clip: 'Aselica-Vox_Attack3', volume: 2.3, at: 4.7, own: true }, { clip: 'Attack-Magic-09', volume: 1.3, at: 4.95 }, { clip: 'FX-Satria-Wing_01', volume: 1.8, at: 5.06 }],
    },
    victory: [{ clip: 'FX-Satria-Wing_01', volume: 1.2, at: 0.37 }, { clip: 'Aselica-Vox_Victory', volume: 2.3, at: 1.24, own: true }, { clip: 'FX-Satria-Wing_01', volume: 1.2, at: 2.07 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Aselica.Attack1.Casting4', 'Skill.Hero.Aselica.Attack1.Casting1', 'Skill.Hero.Aselica.Attack1.Casting3', 'Skill.Hero.Aselica.Attack1.Casting2'] },
    sunsword: { start: ['Skill.Hero.Aselica.Skill1.Casting'], land: ['Skill.Hero.Aselica.Skill1.Projectile', 'Hit.Physical.Slash02'] },
    sunbless: { start: ['Skill.Hero.Aselica.Skill2.Loop', 'Skill.Hero.Aselica.Skill2.Casting'], land: ['Skill.Hero.Aselica.Skill2.HitLoop'] },
    sunjudge: { start: ['Skill.Hero.Aselica.Skill3.Casting'], land: ['Skill.Hero.Aselica.Skill3.Projectile'] },
  },
  skins: [
    {
      name: 'Aselica',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Aselica.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Aselica.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Aselica.webp',
      // Her artwork (the Drive folder's): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Aselica.png', from: `${DRIVE}1FCusI3_ZxLmvjic7KYD57Lgo3RxMW_cA`, crop: { x: 462, y: 180, size: 180 }, head: { x: 505, y: 254, size: 95 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Aselica_Vari05_Body', 'Hero_Aselica_Vari05_Hair'],
        left: 'Hero_Aselica_Vari05_Shield',
        right: 'Hero_Aselica_Vari05_Sword',
        blade: 'y',
      },
    },
  ],
};
