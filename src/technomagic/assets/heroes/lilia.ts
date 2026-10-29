import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Lilia, the Wizard of the Oasis (Hero_Lilia_…): her body and hair, and her weapon in her right hand, as King's Raid's own model has them. She is
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
  attack: [{ clips: ['Attack1'], hits: [0.8, 0.9] }],
  skills: {
    tempest: { clips: ['Skill1'], hits: [1] },
    oasis: { clips: ['Skill2'], hits: [1.6] },
    cataract: { clips: ['Skill3-1', 'Skill3-2', 'Skill3-2', 'Skill3-3'], hits: [0, 1.9, 2.1, 2.3, 2.5, 2.7, 2.9, 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4, 4.3, 4.6, 4.9, 5.2, 5.5] },
  },
} as const satisfies KrAnimations;

export const LILIA_ASSETS: HeroAssets = {
  name: 'Lilia',
  folder: 'heroes/lilia',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/54/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded.
  unique: { Hero_Lilia_Vari05_Weapon: 'Hero_Lilia_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Lilia.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'DMG-Poison-02', volume: 1.5 }]],
      tempest: [[{ clip: 'Hit_wind_01', volume: 2 }]],
      cataract: [[{ clip: 'DMG-Poison-02', volume: 1.5 }]],
    },
    casts: {
      tempest: [{ clip: 'Lilia-Vox_Skill2', volume: 3.2, own: true }, { clip: 'Attack-Casting-40', volume: 0.8, at: 0.32 }, { clip: 'Attack-Magic-16', volume: 1.4, at: 1.14 }, { clip: 'Attack-Magic-07', volume: 1.2, at: 1.16 }],
      oasis: [{ clip: 'Attack-Casting-39', volume: 1.2, at: 0.21 }, { clip: 'Attack-Casting-40', volume: 0.8, at: 0.35 }, { clip: 'Attack-Casting-69', volume: 1.4, at: 0.38 }, { clip: 'Lilia-Vox_awk', volume: 3.2, at: 0.59, own: true }, { clip: 'Attack-Casting-69', volume: 1.4, at: 0.84 }, { clip: 'Attack-Magic-07', volume: 1.4, at: 1.69 }],
      cataract: [{ clip: 'Attack-Magic-05', volume: 1.2 }, { clip: 'Lilia-Vox_Skill3', volume: 3.2, own: true }, { clip: 'Attack-Casting-48', volume: 0.8, at: 0.13 }, { clip: 'Attack-Casting-39', volume: 1.2, at: 0.39 }, { clip: 'Attack-Magic-05', volume: 1.2, at: 2.04 }, { clip: 'Attack-Magic-05', volume: 1.2, at: 2.09 }, { clip: 'Attack-Magic-05', volume: 1.2, at: 2.34 }, { clip: 'Attack-Magic-05', volume: 1.2, at: 2.54 }, { clip: 'Attack-Magic-05', volume: 1.2, at: 2.82 }, { clip: 'Attack-Magic-05', volume: 1.2, at: 3.02 }, { clip: 'Attack-Magic-05', volume: 1.2, at: 3.21 }, { clip: 'Attack-Magic-05', volume: 1.2, at: 3.37 }, { clip: 'Attack-Magic-05', volume: 1.2, at: 3.58 }, { clip: 'Attack-Magic-05', volume: 1.2, at: 3.74 }, { clip: 'Attack-Magic-05', volume: 1.2, at: 3.93 }, { clip: 'Attack-Magic-55', volume: 1.2, at: 4.25 }, { clip: 'Attack-Magic-52', volume: 0.8, at: 4.29 }, { clip: 'Attack-Magic-55', volume: 1.2, at: 4.59 }, { clip: 'Attack-Magic-52', volume: 0.8, at: 4.63 }, { clip: 'Attack-Magic-55', volume: 1.2, at: 4.92 }, { clip: 'Attack-Magic-52', volume: 0.8, at: 4.96 }, { clip: 'Attack-Magic-55', volume: 1.2, at: 5.29 }, { clip: 'Attack-Magic-52', volume: 0.8, at: 5.33 }, { clip: 'Attack-Magic-55', volume: 1.2, at: 5.63 }, { clip: 'Attack-Magic-52', volume: 0.8, at: 5.67 }],
    },
    victory: [{ clip: 'Lilia-Vox_Victory', volume: 3.1, own: true }, { clip: 'Attack-Body-02', volume: 1.2, at: 0.47 }, { clip: 'Attack-Landing-01', volume: 1.2, at: 3.14 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Lilia.Attack1.Casting'], land: ['Skill.Hero.Lilia.Attack1.Hit', 'Skill.Hero.Lilia.Attack1.Projectile'] },
    tempest: { start: ['Skill.Hero.Lilia.Skill1.Casting'], land: ['Skill.Hero.Lilia.Skill1.Hit', 'Skill.Hero.Lilia.Skill1.HitLoop'] },
    oasis: { start: ['Skill.Hero.Lilia.Skill2.Casting'], land: ['Skill.Hero.Lilia.Skill2.Hit', 'Skill.Hero.Lilia.Skill2.HitLoop'] },
    cataract: { start: ['Skill.Hero.Lilia.Skill3.Casting2', 'Skill.Hero.Lilia.Skill3.Casting1', 'Skill.Hero.Lilia.Skill3.CastingLoop1', 'Skill.Hero.Lilia.Skill3.CastingLoop2'], land: ['Skill.Hero.Lilia.Skill3.Projectile1', 'Skill.Hero.Lilia.Skill3.Hit', 'Skill.Hero.Lilia.Skill3.Projectile2', 'Skill.Hero.Lilia.Skill3.CastingLoop2Hit'] },
  },
  skins: [
    {
      name: 'Lilia',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lilia.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lilia.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lilia.webp',
      // Her artwork (the Drive folder's): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Lilia.png', from: `${DRIVE}1hmEhGNDmnv-4X_YaXeKeWnBV6fuKjBxd`, crop: { x: 270, y: 90, size: 210 }, head: { x: 334, y: 131, size: 110 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lilia_Vari05_Body', 'Hero_Lilia_Vari05_Hair'],
        right: 'Hero_Lilia_Vari05_Weapon',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Lilia_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lilia_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lilia_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lilia_Summer.webp',
      title: 'Beachside Lilia',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lilia_Cos18Summer_Body', 'Hero_Lilia_Cos18Summer_Hair'],
        right: 'Hero_Lilia_Cos18Summer_Weapon',
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Lilia_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lilia_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lilia_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lilia_Halloween.webp',
      title: 'Cheshire Cat Lilia',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lilia_Cos18Halloween_Body', 'Hero_Lilia_Cos18Halloween_Hair'],
        right: 'Hero_Lilia_Cos18Halloween_Weapon',
      },
    },
    // King's Raid's Maid costume (tm-costumes.mjs).
    {
      name: 'Lilia_Maid',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lilia_Maid.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lilia_Maid.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lilia_Maid.webp',
      title: 'Maid Lilia',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lilia_Cos18Maid_Body', 'Hero_Lilia_Cos18Maid_Hair'],
        right: 'Hero_Lilia_Cos18Maid_Weapon',
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Lilia_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lilia_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lilia_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lilia_Christmas.webp',
      title: 'Caroler Lilia',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lilia_Cos18Christmas_Body', 'Hero_Lilia_Cos18Christmas_Hair'],
        right: 'Hero_Lilia_Cos18Christmas_Weapon',
      },
    },
    // King's Raid's UserPick costume (tm-costumes.mjs).
    {
      name: 'Lilia_UserPick',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lilia_UserPick.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lilia_UserPick.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lilia_UserPick.webp',
      title: 'Cradle of Dragons Lilia',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lilia_Cos19UserPick_Body', 'Hero_Lilia_Hair_01'],
        right: 'Hero_Lilia_Cos19UserPick_Weapon',
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Lilia_Glory',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lilia_Glory.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lilia_Glory.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lilia_Glory.webp',
      title: 'Lilia of Honor (Brilliance of the Azure Sky)',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lilia_Cos20GloryLeague_Body', 'Hero_Lilia_Cos20GloryLeague_Hair'],
        right: 'Hero_Lilia_Cos20GloryLeague_Weapon',
      },
    },
  ],
};
