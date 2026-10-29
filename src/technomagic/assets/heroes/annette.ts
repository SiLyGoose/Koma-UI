import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Rascal, her golem, held as her right hand's: King's Raid's own animations of her (ANIMATIONS: ../../heroes/body/kr.ts)
 * float its mark beside her and beat its wings. The same for both her skins.
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
  victoryIdle: 'VictoryIdol',
  lose: 'Lose',
  dead: 'Dead',
  attack: [{ clips: ['Attack1'], hits: [1, 1.2, 1.4] }],
  skills: {
    ray: { clips: ['Skill1'], hits: [2.2, 2.3] },
    treatment: { clips: ['Skill2'], hits: [2.8] },
    elimination: { clips: ['Skill3'], hits: [3.2] },
  },
} as const satisfies KrAnimations;

export const ANNETTE_ASSETS: HeroAssets = {
  name: 'Annette',
  folder: 'heroes/annette',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/33/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Rascal as it is made over.
  unique: { Hero_Annette_Vari05_Weapon: 'Hero_Annette_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Aneette.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      zap: [[{ clip: 'Hit_gun_02', volume: 1.5 }]],
      ray: [[{ clip: 'Hit_gun_03', volume: 2 }]],
      elimination: [[{ clip: 'Hit_gun_04', volume: 2 }]],
    },
    casts: {
      ray: [{ clip: 'Attack-Casting-04', volume: 1.5, at: 0.05 }, { clip: 'Attack-Casting-27', volume: 1.6, at: 0.73 }, { clip: 'Attack-Casting-49', volume: 1.6, at: 0.73 }, { clip: 'Annette-Vox_Skill1_b', volume: 2.5, at: 1.35, own: true }, { clip: 'FX-Laser_01', volume: 1.8, at: 2.19 }],
      treatment: [{ clip: 'Attack-Casting-48', volume: 1.8, at: 0.09 }, { clip: 'Annette-Vox_Attack4', volume: 2.5, at: 0.23, own: true }, { clip: 'Attack-Casting-30', volume: 1.5, at: 0.56 }, { clip: 'Annette-Vox_Skill2_c', volume: 2.5, at: 1.19, own: true }, { clip: 'Attack-Magic-56', volume: 1.8, at: 1.45 }, { clip: 'Attack-Casting-50', volume: 1.5, at: 1.73 }, { clip: 'Attack-Casting-48', volume: 1.8, at: 2.53 }, { clip: 'Attack-Magic-39', volume: 1.7, at: 2.53 }, { clip: 'Attack-Magic-22', volume: 1.7, at: 2.53 }],
      elimination: [{ clip: 'Attack-Body-02', volume: 1.4 }, { clip: 'Attack-Casting-48', volume: 2, at: 0.58 }, { clip: 'Attack-Casting-47', volume: 1.6, at: 0.58 }, { clip: 'Annette-Vox_Skill3-1_b', volume: 2.5, at: 0.93, own: true }, { clip: 'Attack-Magic-05', volume: 0.7, at: 1.2 }, { clip: 'Attack-Magic-05', volume: 0.7, at: 1.36 }, { clip: 'Attack-Magic-05', volume: 0.7, at: 1.49 }, { clip: 'Attack-Magic-05', volume: 0.7, at: 1.68 }, { clip: 'Attack-Magic-05', volume: 0.7, at: 1.89 }, { clip: 'Attack-Magic-05', volume: 0.7, at: 2.2 }, { clip: 'Attack-Magic-56', volume: 1.5, at: 3 }, { clip: 'Annette-Vox_Skill3-2_c', volume: 2.5, at: 3.02, own: true }],
    },
    victory: [{ clip: 'Attack-Body-02', volume: 0.9, at: 0.46 }, { clip: 'Annette-Vox_Victory_b', volume: 2.5, at: 0.52, own: true }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    zap: { start: ['Skill.Hero.Annette.Attack1.Casting'], land: ['Skill.Hero.Annette.Attack1.Projectile', 'Skill.Hero.Annette.Attack1.Hit'] },
    ray: { start: ['Skill.Hero.Annette.Skill1.Casting'] },
    treatment: { start: ['Skill.Hero.Annette.Skill2.Loop', 'Skill.Hero.Annette.Skill2.Casting'], land: ['Skill.Hero.Annette.Skill2.Hit'] },
    elimination: { start: ['Skill.Hero.Annette.Skill3.Casting'], land: ['Skill.Hero.Annette.Skill3.Hit', 'Skill.Hero.Annette.Skill3.Projectile', 'Common.Shock'] },
  },
  skins: [
    {
      name: 'Annette',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Annette.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Annette.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Annette.webp',
      // Her artwork, Rascal held up over her head: her head in the middle of the crop (the meter’s close-up is her face by itself, under her ribbon).
      portrait: { file: 'Annette.png', crop: { x: 417, y: 420, size: 140 }, head: { x: 428, y: 458, size: 110 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Annette_Vari05_Body', 'Hero_Annette_Vari05_Hair'],
        right: 'Hero_Annette_Vari05_Weapon',
      },
    },
    // Her Halloween costume, with its own hair and a Rascal of its own (smaller).
    {
      name: 'Annette_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Annette_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Annette_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Annette_Halloween.webp',
      title: 'Cheshire Cat Annette',
      // Her artwork as a black cat, a paw raised: her head and cat ears in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Annette_Halloween.png', from: `${DRIVE}1RuKDrkocmMXny4VDPyKN9rX_zQiTNyhE`, crop: { x: 220, y: 40, size: 320 }, head: { x: 262, y: 138, size: 210 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Annette_Cos17Halloween_Body', 'Hero_Annette_Cos17Halloween_Hair'],
        right: 'Hero_Annette_Cos17Halloween_Weapon',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Annette_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Annette_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Annette_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Annette_Summer.webp',
      title: 'Beachside Annette',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Annette_Cos17Summer_Body', 'Hero_Annette_Cos17Summer_Hair'],
        right: 'Hero_Annette_Cos17Summer_Weapon',
      },
    },
    // King's Raid's Idol costume (tm-costumes.mjs).
    {
      name: 'Annette_Idol',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Annette_Idol.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Annette_Idol.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Annette_Idol.webp',
      title: 'Twinkle Pure Annette',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Annette_Cos17Idol_Body', 'Hero_Annette_Cos17Idol_Hair'],
        right: 'Hero_Annette_Cos17Idol_Weapon',
      },
    },
    // King's Raid's School costume (tm-costumes.mjs).
    {
      name: 'Annette_School',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Annette_School.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Annette_School.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Annette_School.webp',
      title: 'Science Club Annette',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Annette_Cos18SL_Body', 'Hero_Annette_Cos18SL_Hair'],
        right: 'Hero_Annette_Cos18SL_Weapon',
      },
    },
    // King's Raid's Maid costume (tm-costumes.mjs).
    {
      name: 'Annette_Maid',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Annette_Maid.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Annette_Maid.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Annette_Maid.webp',
      title: 'Maid Annette',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Annette_Cos18Maid1_Body', 'Hero_Annette_Cos18Maid1_Hair'],
        right: 'Hero_Annette_Cos18Maid_Weapon',
      },
    },
    // King's Raid's Maid costume (tm-costumes.mjs).
    {
      name: 'Annette_Maid2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Annette_Maid2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Annette_Maid2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Annette_Maid2.webp',
      title: 'Maid Annette',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Annette_Cos18Maid2_Body', 'Hero_Annette_Cos18Maid1_Hair'],
        right: 'Hero_Annette_Cos18Maid_Weapon',
      },
    },
    // King's Raid's UserPick costume (tm-costumes.mjs).
    {
      name: 'Annette_UserPick',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Annette_UserPick.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Annette_UserPick.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Annette_UserPick.webp',
      title: 'Space Age Annette',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Annette_Cos19UserPick_Body', 'Hero_Annette_Cos19UserPick_Hair'],
        right: 'Hero_Annette_Cos19UserPick_Weapon',
      },
    },
    // King's Raid's Dessert costume (tm-costumes.mjs).
    {
      name: 'Annette_Dessert',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Annette_Dessert.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Annette_Dessert.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Annette_Dessert.webp',
      title: 'Mint Chocolate Chip Muffin Dreams Annette',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Annette_Cos20Desssert2_Body', 'Hero_Annette_Vari05_Hair'],
        right: 'Hero_Annette_Cos20Desssert_Weapon',
      },
    },
    // King's Raid's Dessert costume (tm-costumes.mjs).
    {
      name: 'Annette_Dessert1',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Annette_Dessert1.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Annette_Dessert1.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Annette_Dessert1.webp',
      title: 'Mint Chocolate Chip Muffins Dreams Annette',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Annette_Cos20Desssert1_Body', 'Hero_Annette_Vari05_Hair'],
        right: 'Hero_Annette_Cos20Desssert_Weapon',
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Annette_Glory',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Annette_Glory.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Annette_Glory.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Annette_Glory.webp',
      title: 'Annette of Honor (Blooming Blue Flame)',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Annette_Cos21GloryLeague_Body', 'Hero_Annette_Hair_04'],
        right: 'Hero_Annette_Cos21GloryLeague_Weapon',
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Annette_Glory2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Annette_Glory2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Annette_Glory2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Annette_Glory2.webp',
      title: 'Annette of Glaring Honor (Blooming Blue Flame)',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Annette_Cos21GloryLeague2_Body', 'Hero_Annette_Hair_04'],
        right: 'Hero_Annette_Cos21GloryLeague_Weapon',
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Annette_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Annette_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Annette_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Annette_Christmas.webp',
      title: 'Christmas Express Delivery Annette',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Annette_Cos21Christmas_Body', 'Hero_Annette_Cos21Christmas_Hair'],
        right: 'Hero_Annette_Cos21Christmas_Weapon',
      },
    },
  ],
};
