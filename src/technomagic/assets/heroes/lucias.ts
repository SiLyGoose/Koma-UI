import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Lucias, the Priest of Light (Hero_Lucias_…): his body and his weapon on his own skeleton, as King's Raid's own model has them. He is
 * moved by King's Raid's own animations of him (ANIMATIONS: ../../heroes/body/kr.ts).
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
  attack: [{ clips: ['Attack1'], hits: [0.8] }],
  skills: {
    path: { clips: ['Skill1'], hits: [1.1] },
    zone: { clips: ['Skill2'], hits: [1.3] },
    stigmata: { clips: ['Skill3'], hits: [2.1] },
  },
} as const satisfies KrAnimations;

export const LUCIAS_ASSETS: HeroAssets = {
  name: 'Lucias',
  folder: 'heroes/lucias',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/56/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded.
  unique: { Hero_Lucias_Vari05_Weapon: 'Hero_Lucias_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Lucias.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_fire_05', volume: 1.5 }]],
      zone: [[{ clip: 'Hit_buff_01', volume: 2 }], [{ clip: 'Hit_elect_04', volume: 2 }]],
      stigmata: [[{ clip: 'Hit_gun_01', volume: 2 }]],
    },
    casts: {
      path: [{ clip: 'Attack-Casting-26', volume: 1.2 }, { clip: 'Attack-Magic-59', volume: 1.4 }, { clip: 'Lucias-Vox_Skill1', volume: 3.4, own: true }, { clip: 'Attack-Casting-25', volume: 1.2, at: 0.96 }, { clip: 'Attack-Casting-24', volume: 1.2, at: 0.99 }, { clip: 'Attack-Casting-26', volume: 1.2, at: 1.02 }, { clip: 'Attack-Magic-47', volume: 1.4, at: 1.02 }],
      zone: [{ clip: 'Attack-Magic-59', volume: 1.4 }, { clip: 'Lucias-Vox_Skill2', volume: 3.4, own: true }, { clip: 'Attack-Casting-26', volume: 1.2, at: 0.28 }, { clip: 'Attack-Magic-39', volume: 1.2, at: 1.21 }, { clip: 'Attack-Magic-32', volume: 1.2, at: 1.24 }],
      stigmata: [{ clip: 'Attack-Casting-26', volume: 1.2 }, { clip: 'Attack-Magic-59', volume: 1.4 }, { clip: 'Lucias-Vox_Skill3', volume: 3.4, at: 0.15, own: true }, { clip: 'Attack-Magic-48', volume: 1.4, at: 0.31 }, { clip: 'Attack-Spin-06', volume: 1.7, at: 1.44 }, { clip: 'Attack-Magic-62', volume: 1.4, at: 1.69 }, { clip: 'Attack-Magic-59', volume: 1.4, at: 1.92 }],
    },
    victory: [{ clip: 'Lucias-Vox_Victory', volume: 3.2, at: 0.56, own: true }, { clip: 'Attack-Woosh-09', volume: 1.5, at: 1.02 }, { clip: 'Attack-Body-01', volume: 1.5, at: 1.05 }, { clip: 'Attack-Body-02', volume: 1.5, at: 1.58 }, { clip: 'Attack-Body-02', volume: 1.5, at: 2.22 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Lucias.Attack1.Casting'], land: ['Skill.Hero.Lucias.Attack1.Hit', 'Skill.Hero.Lucias.Attack1.Projectile'] },
    path: { start: ['Skill.Hero.Lucias.Skill1.Casting'], land: ['Skill.Hero.Lucias.Skill1.Projectile', 'Skill.Hero.Lucias.Skill1.Hit'] },
    zone: { start: ['Skill.Hero.Lucias.Skill2.Loop', 'Skill.Hero.Lucias.Skill2.Casting'], land: ['Skill.Hero.Lucias.Skill2.Hit'] },
    stigmata: { start: ['Skill.Hero.Lucias.Skill3.Casting', 'Skill.Hero.Lucias.Skill3.Stigma'] },
  },
  skins: [
    {
      name: 'Lucias',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lucias.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lucias.webp',
      // His artwork (the Drive folder's): his head in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Lucias.png', from: `${DRIVE}19sqR7X1Zdogp9Vit4drpdT1sGWyqf0xN`, crop: { x: 453, y: 150, size: 150 }, head: { x: 514, y: 213, size: 80 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lucias_Vari05_Body', 'Hero_Lucias_Hair_01'],
        // (Held in his right hand, where King's Raid hangs it: Point_Hand_R.)
        right: 'Hero_Lucias_Vari05_Weapon',
      },
    },
  ],
};
