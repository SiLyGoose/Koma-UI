import type { HeroAssets, KrAnimations } from '../types.ts';

const FOLDER = 'heroes/kirze';

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
  attack: [{ clips: ['Attack1-1'], hits: [0.3, 0.5] }, { clips: ['Attack1-2'], hits: [0.4, 1] }, { clips: ['Attack1-3'], hits: [0.7] }],
  skills: {
    judgment: { clips: ['Skill1'], hits: [1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.4] },
    haze: { clips: ['Skill2'], hits: [1.2] },
    flower: { clips: ['Skill3'], hits: [1.9] },
  },
} as const satisfies KrAnimations;

export const KIRZE_ASSETS: HeroAssets = {
  name: 'Kirze',
  folder: FOLDER,
  skills: { from: 'https://kingsraid.shodyra.com/static/images/79/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Elicipira.
  unique: { Hero_Kirze_Vari05_Weapon: 'Hero_Kirze_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Kirze.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_sword_04', volume: 1.5 }], [{ clip: 'Hit_sword_01', volume: 1.5 }], [{ clip: 'Hit_dmg_01', volume: 1.8 }]],
      judgment: [[{ clip: 'Hit_common_03', volume: 1.5 }]],
      haze: [[{ clip: 'Hit_shield_02', volume: 1.5 }]],
      flower: [[{ clip: 'Dmg-Fire-01', volume: 1.5 }]],
    },
    casts: {
      judgment: [{ clip: 'Kirze-Vox_Skill3_b', volume: 2.2, own: true }, { clip: 'Attack-Casting-10', volume: 1.5, at: 0.13 }, { clip: 'Attack-Magic-41', volume: 1.2, at: 0.46 }, { clip: 'FX-Sword-03', volume: 1.1, at: 0.52 }, { clip: 'Attack-Jump-01', volume: 1.6, at: 1.01 }, { clip: 'Attack-Spin-08', volume: 1.5, at: 1.11 }, { clip: 'Attack-Magic-81', volume: 1.2, at: 1.29 }, { clip: 'Kirze-Vox_Landing', volume: 2.2, at: 2.28, own: true }, { clip: 'Attack-Magic-46', volume: 1.4, at: 2.31 }, { clip: 'Attack-Cut-04', volume: 1.1, at: 2.32 }],
      haze: [{ clip: 'Attack-Casting-14', volume: 1.2 }, { clip: 'Attack-Casting-37', volume: 1.2 }, { clip: 'Kirze-Vox_Skill5_b', volume: 2.2, own: true }, { clip: 'Attack-Magic-57', volume: 1.4, at: 0.94 }, { clip: 'Attack-Magic-68', volume: 1.4, at: 1.04 }],
      flower: [{ clip: 'Attack-Casting-05', volume: 1.2 }, { clip: 'Kirze-Vox_Skill4', volume: 2.2, own: true }, { clip: 'Attack-Casting-03', volume: 1.2, at: 0.39 }, { clip: 'Attack-Magic-22', volume: 1.4, at: 0.7 }, { clip: 'Attack-Magic-31', volume: 1.3, at: 1.09 }, { clip: 'Attack-Magic-36', volume: 1.2, at: 1.44 }, { clip: 'Attack-Magic-34', volume: 1.6, at: 1.69 }, { clip: 'Attack-Magic-39', volume: 1.2, at: 2.34 }, { clip: 'Kirze-Vox_Landing', volume: 2.2, at: 2.44, own: true }, { clip: 'Attack-Magic-34', volume: 1.6, at: 2.49 }],
    },
    victory: [{ clip: 'Attack-Woosh-03', volume: 1.3, at: 0.4 }, { clip: 'Kirze-Vox_Victory', volume: 2.5, at: 0.47, own: true }, { clip: 'Attack-Action-02', volume: 1.5, at: 0.53 }, { clip: 'Attack-Jump-01', volume: 1.7, at: 1.16 }, { clip: 'Attack-Landing-01', volume: 1.7, at: 2.26 }, { clip: 'FX-Sword-11', volume: 0.8, at: 3.82 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Kirze.Attack1.Casting1', 'Skill.Hero.Kirze.Attack1.Casting2', 'Skill.Hero.Kirze.Attack1.Casting3'], land: ['Skill.Hero.Kirze.Attack1.Hit'] },
    judgment: { start: ['Skill.Hero.Kirze.Skill1.Casting'] },
    haze: { start: ['Skill.Hero.Kirze.Skill2.Casting'], land: ['Skill.Hero.Kirze.Skill2.HitLoop03', 'Skill.Hero.Kirze.Skill2.HitLoop02', 'Skill.Hero.Kirze.Skill2.HitLoop01.Hit', 'Skill.Hero.Kirze.Skill2.Hit', 'Skill.Hero.Kirze.Skill2.HitLoop01'] },
    flower: { start: ['Skill.Hero.Kirze.Skill3.Casting2', 'Skill.Hero.Kirze.Skill3.Casting1', 'Skill.Hero.Kirze.Skill3.Loop'], land: ['Skill.Hero.Kirze.Skill3.Hit'] },
  },
  skins: [
    {
      name: 'Kirze',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Kirze.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Kirze.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Kirze.webp',
      // (Her face square takes in her ears: the meter's close-up is her face by itself.)
      portrait: { file: 'Kirze.png', crop: { x: 805, y: 4, size: 170 }, head: { x: 808, y: 62, size: 125 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Kirze_Vari05_Body', 'Hero_Kirze_Vari05_Hair', 'Hero_Kirze_Vari05_Arms_Mesh'],
        // Her two blades joined as one, in her right hand (they also come apart: Hero_Kirze_Vari05_Weapon_L and _R, one for each hand).
        right: 'Hero_Kirze_Vari05_Weapon',
      },
    },
    // Her Glory League costume, the game's own model of it: moved as she is.
    {
      name: 'Kirze_Glory',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Kirze_Glory.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Kirze_Glory.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Kirze_Glory.webp',
      title: 'Kirze of Honor (Brilliance of the Azure Sky)',
      portrait: { file: 'Kirze_Glory.png', crop: { x: 356, y: 112, size: 135 }, head: { x: 362, y: 140, size: 85 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Kirze_Cos20GloryLeague_Body', 'Hero_Kirze_Cos20GloryLeague_Hair'],
        right: 'Hero_Kirze_Cos20GloryLeague_Weapon',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Kirze_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Kirze_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Kirze_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Kirze_Summer.webp',
      title: 'Beachside Kirze',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Kirze_Cos19Summer_Body', 'Hero_Kirze_Vari05_Hair'],
        right: 'Hero_Kirze_Cos19_Summer_Weapon',
      },
    },
    // King's Raid's Job costume (tm-costumes.mjs).
    {
      name: 'Kirze_Job',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Kirze_Job.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Kirze_Job.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Kirze_Job.webp',
      title: 'Hairdresser Kirze',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Kirze_Cos19Job_Body', 'Hero_Kirze_Cos19Job_Hair'],
        right: 'Hero_Kirze_Cos19_Job_Weapon',
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Kirze_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Kirze_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Kirze_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Kirze_Halloween.webp',
      title: 'Princess of Hearts Kirze',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Kirze_Cos20Halloween_Body', 'Hero_Kirze_Cos20Halloween_Hair'],
        right: 'Hero_Kirze_Cos20Halloween_Weapon',
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Kirze_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Kirze_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Kirze_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Kirze_Christmas.webp',
      title: 'White Season Cat Kirze',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Kirze_Cos20Christmas_Body', 'Hero_Kirze_Cos20Christmas_Hair'],
        right: 'Hero_Kirze_Cos20Christmas_Weapon',
      },
    },
  ],
};
