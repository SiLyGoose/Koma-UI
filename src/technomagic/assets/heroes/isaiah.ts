import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Isaiah, Shepherd of Chaos (Hero_Isaiah_Vari05…): as King's Raid's own model has it, moved by King's Raid's
 * own animations of it (ANIMATIONS: ../../heroes/body/kr.ts).
 */

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
  attack: [{ clips: ['Attack1'], hits: [1.2] }],
  skills: {
    salvation: { clips: ['Skill1'], hits: [1.8] },
    mercy: { clips: ['Skill2A-1', 'Skill2A-2'], hits: [0.6, 1.3] },
    atonement: { clips: ['Skill3'], hits: [0, 1.8, 2.5] },
    embrace: { clips: ['Skill2B-1', 'Skill2B-2'], hits: [0.6, 2.2] },
  },
} as const satisfies KrAnimations;

export const ISAIAH_ASSETS: HeroAssets = {
  name: 'Isaiah',
  folder: 'heroes/isaiah',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/100/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Its unique weapon, wielded.
  unique: { Hero_Isaiah_Vari05_Weapon_A: 'Hero_Isaiah_Unique01_Weapon_A', Hero_Isaiah_Vari05_Weapon_B: 'Hero_Isaiah_Unique01_Weapon_B' },
  // King's Raid's sounds (its Hit.Hero.Isaiah.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Dmg-magic-02', volume: 2, at: 0.01 }]],
      salvation: [[{ clip: 'Dmg-magic-02', volume: 2, at: 0.01 }]],
      atonement: [[{ clip: 'Hit_magic_01', volume: 2, at: 0.01 }]],
    },
    casts: {
      salvation: [{ clip: 'Isaiah-Vox_Skill4', volume: 3, at: 0.115, own: true }, { clip: 'Cast-magic-02', volume: 2.7, at: 0.719 }, { clip: 'Shot-magic-06', volume: 2.7, at: 1.823 }],
      mercy: [{ clip: 'Isaiah-Vox_Skill6', volume: 3, at: 0.005, own: true }, { clip: 'Attack-Casting-56', volume: 2.7, at: 0.005 }],
      atonement: [{ clip: 'Cast-18', volume: 2.7, at: 0.117 }, { clip: 'Isaiah-Vox_Skill7_b', volume: 2.7, at: 0.215, own: true }, { clip: 'Magic-Explo-01', volume: 2.7, at: 1.11 }],
      embrace: [{ clip: 'Isaiah-Vox_Skill1', volume: 3, at: 0.033, own: true }, { clip: 'Shot-magic-08', volume: 2.7, at: 0.033 }],
    },
    victory: [{ clip: 'Texture-18', volume: 2.7, at: 0.1 }, { clip: 'Texture-05', volume: 2.7, at: 0.29 }, { clip: 'Isaiah-Vox_Victory', volume: 3, at: 0.392, own: true }, { clip: 'Texture-17', volume: 2.7, at: 1.224 }, { clip: 'Sword-Short-04', volume: 2.4, at: 1.746 }, { clip: 'Texture-10', volume: 2.7, at: 2.613 }, { clip: 'Idle-sword-01', volume: 2.7, at: 2.613 }, { clip: 'Idle-Sword-04', volume: 2.7, at: 2.95 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Isaiah.Attack1.Casting'], land: ['Skill.Hero.Isaiah.Attack1.Projectile', 'Skill.Hero.Isaiah.Attack1.Hit'] },
    salvation: { start: ['Skill.Hero.Isaiah.Skill1.Debuff', 'Skill.Hero.Isaiah.Skill1.Casting', 'Skill.Hero.Isaiah.Skill1.Buff'] },
    atonement: { start: ['Skill.Hero.Isaiah.Skill3.Casting', 'Skill.Hero.Isaiah.Skill3.Mark4', 'Skill.Hero.Isaiah.Skill3.Mark1', 'Skill.Hero.Isaiah.Skill3.Mark2', 'Skill.Hero.Isaiah.Skill3.Mark3', 'Skill.Hero.Isaiah.Skill3.Buff', 'Skill.Hero.Isaiah.Skill3.Loop', 'Skill.Hero.Isaiah.Skill3.Debuff'] },
  },
  skins: [
    {
      name: 'Isaiah',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Isaiah.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Isaiah.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Isaiah.webp',
      // His artwork (krinfo.net's; the Drive folder has none of him): his head in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Isaiah.png', from: 'https://krinfo.net/kingsraid-data/assets/heroes/Isaiah/cos/Basic.png', crop: { x: 430, y: 240, size: 150 }, head: { x: 455, y: 280, size: 75 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Isaiah_Vari05_Body', 'Hero_Isaiah_Vari05_Hair'],
        // (Where King's Raid hangs them: A in his left hand, Point_Hand_L; B in his right, Point_Hand_R.)
        left: 'Hero_Isaiah_Vari05_Weapon_A',
        offHand: 'held',
        right: 'Hero_Isaiah_Vari05_Weapon_B',
      },
    },
    // King's Raid's Advance costume (tm-costumes.mjs).
    {
      name: 'Isaiah_Advance',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Isaiah_Advance.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Isaiah_Advance.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Isaiah_Advance.webp',
      title: 'Benevolent Chaos Isaiah',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Isaiah_Cos21Advance_Body', 'Hero_Isaiah_Cos21Advance_Hair'],
        left: 'Hero_Isaiah_Cos21Advance_Weapon_A',
        offHand: 'held',
        right: 'Hero_Isaiah_Cos21Advance_Weapon_B',
      },
    },
    // King's Raid's Fallen costume (tm-costumes.mjs).
    {
      name: 'Isaiah_Fallen',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Isaiah_Fallen.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Isaiah_Fallen.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Isaiah_Fallen.webp',
      title: 'Generosity Indulging in Corruption Isaiah',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Isaiah_Cos21Fallen_Body', 'Hero_Isaiah_Cos21Fallen_hair'],
        left: 'Hero_Isaiah_Cos21Fallen_Weapon_A',
        offHand: 'held',
        right: 'Hero_Isaiah_Cos21Fallen_Weapon_B',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Isaiah_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Isaiah_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Isaiah_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Isaiah_Summer.webp',
      title: 'Beachside Isaiah',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Isaiah_Cos21Summer_Body', 'Hero_Isaiah_Cos21Summer_Hair'],
        left: 'Hero_Isaiah_Cos21Summer_Weapon_A',
        offHand: 'held',
        right: 'Hero_Isaiah_Cos21Summer_Weapon_B',
      },
    },
  ],
};
