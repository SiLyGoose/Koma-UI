import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Talisha, Brilliant Gemologist (Hero_Talisha_Vari05…): as King's Raid's own model has it, moved by King's Raid's
 * own animations of it (ANIMATIONS: ../../heroes/body/kr.ts).
 */

/**
 * King's Raid's own animations (its skins of the game's files are moved by them: ../../heroes/body/kr.ts): its basic attack's
 * chain, and each skill's clips, with when its blows land in them as the game's timelines have them (KR-extracted/scripts/tm-anims.mjs).
 */
const ANIMATIONS = {
  idle: 'Idle',
  run: 'Run-Blue',
  hurt: 'Damage-Blue',
  victory: 'Victory',
  lose: 'Lose-Blue',
  dead: 'Dead-Blue',
  attack: [{ clips: ['Attack1_Blue'], hits: [1.6] }],
  skills: {
    radiance: { clips: ['Skill1-Blue'], hits: [2.8] },
    splendor: { clips: ['Skill2-Blue'], hits: [3.5] },
    resonance: { clips: ['Skill3-Blue'], hits: [1.7] },
    dance: { clips: ['Skill1-Red'], hits: [2.5, 2.6, 2.7, 2.8, 2.9, 3, 3.1, 3.2, 3.3] },
    bloom: { clips: ['Skill2-Red'], hits: [3.5] },
    luberry: { clips: ['Skill3-Red'], hits: [1.7] },
    redshot: { clips: ['Attack1_Red'], hits: [0.5, 0.6, 0.7, 1.3, 1.4, 1.5] },
  },
} as const satisfies KrAnimations;

export const TALISHA_ASSETS: HeroAssets = {
  name: 'Talisha',
  folder: 'heroes/talisha',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/90/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Its unique weapon, wielded.
  unique: { Hero_Talisha_Vari05_Weapon_Blue: 'Hero_Talisha_Unique01_Weapon_Blue', Hero_Talisha_Vari05_Weapon_Red: 'Hero_Talisha_Unique01_Weapon_Red' },
  // King's Raid's sounds (its Hit.Hero.Talisha.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Dmg-magic-01', volume: 1.5, at: 0.01 }], [{ clip: 'Hit_Dmg-Elect-01', volume: 1.5, at: 0.01 }]],
      radiance: [[{ clip: 'Dmg-Ice-02', volume: 2, at: 0.01 }], [{ clip: 'Dmg-magic-02', volume: 2, at: 0.01 }]],
      splendor: [[{ clip: 'Dmg-Ice-02', volume: 2, at: 0.02 }]],
      dance: [[{ clip: 'Dmg-Ice-02', volume: 2, at: 0.01 }], [{ clip: 'Dmg-magic-02', volume: 2, at: 0.01 }]],
      bloom: [[{ clip: 'Dmg-Ice-02', volume: 2, at: 0.02 }]],
    },
    casts: {
      radiance: [{ clip: 'Talisha-Vox_Skill2', volume: 3, at: 0.152, own: true }, { clip: 'Crystal-Cast-02', volume: 2.7, at: 0.388 }, { clip: 'Crystal-Shot-03', volume: 2.7, at: 1.09 }, { clip: 'Crystal-Impact-01', volume: 2.7, at: 2.795 }],
      splendor: [{ clip: 'Talisha-Vox_Skill6', volume: 3, at: 0.101, own: true }, { clip: 'Magic-glass-04', volume: 2.7, at: 0.101 }, { clip: 'Magic-glass-02-1', volume: 2.7, at: 0.938 }, { clip: 'Magic-glass-02-2', volume: 2.7, at: 1.607 }, { clip: 'Shot-fire-01', volume: 2.8, at: 1.837 }, { clip: 'Magic-glass-03', volume: 2.7, at: 2.409 }, { clip: 'Talisha-Vox_Attack3', volume: 3, at: 3.299, own: true }, { clip: 'Magic-glass-shot-01', volume: 2.7, at: 3.435 }, { clip: 'Dmg-glass-01', volume: 2.7, at: 3.664 }],
      resonance: [{ clip: 'Talisha-Vox_Skill5', volume: 3, at: 0.154, own: true }, { clip: 'Magic-glass-07', volume: 2.7, at: 0.154 }, { clip: 'Magic-glass-roll-01', volume: 2.7, at: 1.017 }, { clip: 'Magic-glass-shot-03', volume: 2.7, at: 1.754 }],
      dance: [{ clip: 'Crystal-Cast-03', volume: 2.7, at: 0.072 }, { clip: 'Talisha-Vox_Skill4', volume: 3, at: 0.213, own: true }, { clip: 'Crystal-Cast-04', volume: 2.7, at: 1.211 }],
      bloom: [{ clip: 'Talisha-Vox_Skill7', volume: 3, at: 0.237, own: true }, { clip: 'Magic-glass-05', volume: 2.7, at: 0.237 }, { clip: 'Magic-glass-06', volume: 2.7, at: 1.737 }, { clip: 'Magic-glass-03', volume: 2.7, at: 2.535 }, { clip: 'Magic-glass-shot-02', volume: 2.7, at: 3.373 }],
      luberry: [{ clip: 'Talisha-Vox_Skill5', volume: 3, at: 0.154, own: true }, { clip: 'Magic-glass-07', volume: 2.7, at: 0.154 }, { clip: 'Magic-glass-roll-01', volume: 2.7, at: 1.017 }, { clip: 'Magic-glass-shot-03', volume: 2.7, at: 1.754 }],
      redshot: [{ clip: 'Crystal-Shot-02', volume: 2.7, at: 0.115 }],
    },
    victory: [{ clip: 'Talisha-Victory-01', volume: 2.7, at: 0.001 }, { clip: 'Talisha-Vox_Victory', volume: 3, at: 0.005, own: true }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Talisha.Attack1-2.Casting'], land: ['Skill.Hero.Talisha.Attack1-2.Projectile'] },
    radiance: { start: ['Skill.Hero.Talisha.Skill1-2.Casting'], land: ['Skill.Hero.Talisha.Skill1-2.Hit'] },
    splendor: { start: ['Skill.Hero.Talisha.Skill2-2.Casting', 'Skill.Hero.Talisha.Skill2-2.Loop'], land: ['Skill.Hero.Talisha.Skill2-2.Hit'] },
    resonance: { start: ['Skill.Hero.Talisha.Skill3-2'] },
    dance: { start: ['Skill.Hero.Talisha.Skill1-1.Casting'], land: ['Skill.Hero.Talisha.Skill1-1.Hit'] },
    bloom: { start: ['Skill.Hero.Talisha.Skill2-1.Casting', 'Skill.Hero.Talisha.Skill2-1.Loop'], land: ['Skill.Hero.Talisha.Skill2-1.Hit'] },
    luberry: { start: ['Skill.Hero.Talisha.Skill3-1'] },
    redshot: { start: ['Skill.Hero.Talisha.Attack1-1.Casting'], land: ['Skill.Hero.Talisha.Attack1-1.Projectile'] },
  },
  skins: [
    {
      name: 'Talisha',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Talisha.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Talisha.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Talisha.webp',
      // Her artwork (krinfo.net's; the Drive folder has none of her): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Talisha.png', from: 'https://krinfo.net/kingsraid-data/assets/heroes/Talisha/cos/Basic.png', crop: { x: 500, y: 40, size: 150 }, head: { x: 535, y: 85, size: 80 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Talisha_Vari05_Body', 'Hero_Talisha_Vari05_Hair'],
        // (Her two crystals where King's Raid hangs them: the blue one in her right hand, Point_hand_R, the red in her left.)
        left: 'Hero_Talisha_Vari05_Weapon_Red',
        offHand: 'held',
        right: 'Hero_Talisha_Vari05_Weapon_Blue',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Talisha_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Talisha_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Talisha_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Talisha_Summer.webp',
      title: 'Beachside Talisha',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Talisha_Cos20Summer_Body', 'Hero_Talisha_Cos20Summer_Hair'],
        left: 'Hero_Talisha_Cos20Summer_Weapon_Red',
        offHand: 'held',
        right: 'Hero_Talisha_Cos20Summer_Weapon_Blue',
      },
    },
    // King's Raid's Advance costume (tm-costumes.mjs).
    {
      name: 'Talisha_Advance',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Talisha_Advance.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Talisha_Advance.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Talisha_Advance.webp',
      title: 'Beholder of Radiance Talisha',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Talisha_Cos20Advance_Body', 'Hero_Talisha_Cos20Advance_Hair'],
        left: 'Hero_Talisha_Cos20Advance_Weapon_Red',
        offHand: 'held',
        right: 'Hero_Talisha_Cos20Advance_Weapon_Blue',
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Talisha_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Talisha_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Talisha_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Talisha_Halloween.webp',
      title: 'Gemologist of the Night Talisha',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Talisha_Cos20Halloween_Body', 'Hero_Talisha_Cos20Halloween_Hair'],
        left: 'Hero_Talisha_Cos20Halloween_Weapon_Red',
        offHand: 'held',
        right: 'Hero_Talisha_Cos20Halloween_Weapon_Blue',
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Talisha_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Talisha_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Talisha_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Talisha_Wedding.webp',
      title: 'Eternally Shining Vow Talisha',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Talisha_Cos21Wedding_Body', 'Hero_Talisha_Cos21Wedding_Hair'],
        left: 'Hero_Talisha_Cos21Wedding_Weapon_Red',
        offHand: 'held',
        right: 'Hero_Talisha_Cos21Wedding_Weapon_Blue',
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Talisha_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Talisha_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Talisha_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Talisha_Christmas.webp',
      title: 'News Delivered with First Snow Talisha',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Talisha_Cos21Christmas_Body', 'Hero_Talisha_Cos21Christmas_Hair'],
        left: 'Hero_Talisha_Cos21Christmas_Weapon_Red',
        offHand: 'held',
        right: 'Hero_Talisha_Cos21Christmas_Weapon_Blue',
      },
    },
  ],
};
