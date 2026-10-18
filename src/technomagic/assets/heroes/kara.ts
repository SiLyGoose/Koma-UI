import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Kara, the Technomagic Mechanic (Hero_Kara_…): her body, hair and her weapon on her own skeleton, as King's Raid's own model has them. She is
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
  attack: [{ clips: ['Attack1'], hits: [0.9, 1] }],
  skills: {
    laser: { clips: ['Skill1-Ground'], hits: [1.1, 1.3, 1.5, 1.7, 2.1] },
    barrage: { clips: ['Skill2-Ground'], hits: [2.3, 2.7, 3.1, 3.5] },
    siege: { clips: ['Skill3-1'], hits: [] },
    sieglaser: { clips: ['Skill1-Midair'], hits: [1.8] },
    focused: { clips: ['Skill2-Midair'], hits: [2, 2.1, 2.2, 2.3, 2.4] },
    unsiege: { clips: ['Skill3-3'], hits: [] },
  },
} as const satisfies KrAnimations;

export const KARA_ASSETS: HeroAssets = {
  name: 'Kara',
  folder: 'heroes/kara',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/64/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded.
  unique: { Hero_Kara_Vari05_Weapon: 'Hero_Kara_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Kara.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_gun_01', volume: 1.5 }]],
      laser: [[{ clip: 'Hit_gun_01', volume: 1.6 }], [{ clip: 'Hit_gun_02', volume: 1.8 }]],
      barrage: [[{ clip: 'Hit_gun_01', volume: 1.6 }], [{ clip: 'Hit_gun_03', volume: 1.8 }]],
      siege: [[{ clip: 'Hit_gun_04', volume: 1.8 }]],
      sieglaser: [[{ clip: 'Hit_gun_01', volume: 1.6 }], [{ clip: 'Hit_gun_02', volume: 1.8 }]],
      focused: [[{ clip: 'Hit_gun_01', volume: 1.6 }], [{ clip: 'Hit_gun_03', volume: 1.8 }]],
      unsiege: [[{ clip: 'Hit_gun_04', volume: 1.8 }]],
    },
    casts: {
      laser: [{ clip: 'Attack-Casting-45' }, { clip: 'Attack-Casting-46' }, { clip: 'Kara-Vox_Skill1', volume: 2.4, own: true }, { clip: 'Attack-Shot-17', volume: 1.5, at: 1.04 }, { clip: 'Attack-Shot-21', volume: 1.2, at: 1.04 }, { clip: 'Attack-Shot-17', volume: 1.5, at: 1.24 }, { clip: 'Attack-Shot-21', volume: 1.2, at: 1.24 }, { clip: 'Attack-Shot-17', volume: 1.5, at: 1.44 }, { clip: 'Attack-Shot-21', volume: 1.2, at: 1.44 }, { clip: 'Attack-Shot-17', volume: 1.5, at: 1.66 }, { clip: 'Attack-Shot-21', volume: 1.2, at: 1.66 }, { clip: 'Attack-Shot-17', volume: 1.5, at: 1.96 }, { clip: 'Attack-Shot-21', volume: 1.2, at: 1.96 }, { clip: 'Attack-Shot-09', volume: 1.5, at: 1.96 }],
      barrage: [{ clip: 'Attack-Casting-45' }, { clip: 'Attack-Casting-46' }, { clip: 'Attack-Casting-55', volume: 1.4 }, { clip: 'Kara-Vox_Skill2', volume: 2.4, own: true }, { clip: 'Kara-Vox_Attack3', volume: 2.4, at: 1.89, own: true }, { clip: 'Attack-Magic-03', volume: 1.4, at: 2.08 }, { clip: 'Attack-Magic-22', volume: 1.7, at: 2.36 }, { clip: 'Attack-Magic-03', volume: 1.4, at: 2.55 }, { clip: 'Attack-Magic-22', volume: 1.7, at: 2.77 }, { clip: 'Attack-Magic-03', volume: 1.4, at: 2.92 }, { clip: 'Attack-Magic-03', volume: 1.4, at: 3.22 }, { clip: 'Attack-Magic-22', volume: 1.7, at: 3.22 }, { clip: 'Attack-Magic-22', volume: 1.7, at: 3.63 }],
      siege: [{ clip: 'Attack-Casting-45' }, { clip: 'Attack-Casting-46' }, { clip: 'Kara-Vox_Skill3', volume: 2.4, own: true }],
      sieglaser: [{ clip: 'Attack-Casting-45' }, { clip: 'Attack-Casting-46' }, { clip: 'Kara-Vox_Skill6', volume: 2.4, own: true }, { clip: 'Attack-Casting-51', volume: 1.2, at: 0.56 }, { clip: 'Attack-Casting-49', volume: 1.2, at: 1 }, { clip: 'Attack-Shot-03', volume: 1.2, at: 1.76 }, { clip: 'Attack-Shot-01', volume: 1.2, at: 1.76 }, { clip: 'Attack-Shot-14', volume: 1.2, at: 1.77 }, { clip: 'Attack-Shot-10', at: 1.86 }],
      focused: [{ clip: 'Attack-Casting-45' }, { clip: 'Attack-Casting-46' }, { clip: 'Kara-Vox_Skill4', volume: 2.4, own: true }, { clip: 'Attack-Casting-51', volume: 1.2, at: 0.92 }, { clip: 'Attack-Casting-49', volume: 1.2, at: 1.36 }, { clip: 'Kara-Vox_Attack4', volume: 2.4, at: 1.74, own: true }, { clip: 'Attack-Magic-17', volume: 1.4, at: 2.03 }, { clip: 'Attack-Magic-56', volume: 1.4, at: 2.08 }, { clip: 'Attack-Shot-03', volume: 1.2, at: 2.15 }, { clip: 'Attack-Shot-14', volume: 1.5, at: 2.16 }],
      unsiege: [{ clip: 'Attack-Casting-67', volume: 1.4, at: 0.03 }, { clip: 'Death-Fall-07', volume: 1.2, at: 1.02 }],
    },
    victory: [{ clip: 'Kara-Vox_Victory', volume: 1.6, at: 0.34, own: true }, { clip: 'Attack-Body-02', volume: 1.2, at: 0.37 }, { clip: 'Attack-Body-01', volume: 1.4, at: 1.7 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs; split by hand between her two modes: Skill1-1 and Skill2-1 her Anti-personnel Weapon's,
  // Skill1-2 and Skill2-2 her Siege Weapon's).
  vfx: {
    attack: { start: ['Skill.Hero.Kara.Attack1.Casting'], land: ['Skill.Hero.Kara.Attack1.Projectile'] },
    laser: { start: ['Skill.Hero.Kara.Skill1-1.Casting'], land: ['Skill.Hero.Kara.Skill1-1.Projectile2', 'Skill.Hero.Kara.Skill1-1.Projectile1', 'Skill.Hero.Kara.Skill1-1.Hit'] },
    barrage: { start: ['Skill.Hero.Kara.Skill2-1.Casting'], land: ['Skill.Hero.Kara.Skill2-1.Hit', 'Skill.Hero.Kara.Skill2-1.Projectile'] },
    siege: { start: ['Skill.Hero.Kara.Skill3.Casting1'] },
    sieglaser: { start: ['Skill.Hero.Kara.Skill1-2.Casting'], land: ['Skill.Hero.Kara.Skill1-2.Projectile', 'Skill.Hero.Kara.Skill1-2.Hit'] },
    focused: { start: ['Skill.Hero.Kara.Skill2-2.Casting'], land: ['Skill.Hero.Kara.Skill2-2.Hit', 'Skill.Hero.Kara.Skill2-2.Projectile'] },
    unsiege: { start: ['Skill.Hero.Kara.Skill3.Casting3'] },
  },
  skins: [
    {
      name: 'Kara',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Kara.webp',
      // Her artwork (the Drive folder's): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Kara.png', from: `${DRIVE}1KRkv1nEtfjCcAN_QFTdv07nMvvUz305I`, crop: { x: 455, y: 165, size: 170 }, head: { x: 509, y: 222, size: 95 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Kara_Vari05_Body', 'Hero_Kara_Vari05', 'Hero_Kara_Vari05_Weapon'],
      },
    },
  ],
};
