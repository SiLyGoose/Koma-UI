import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Shakmeh, Shadow of the Sun (Hero_Shakmeh_Vari05…): as King's Raid's own model has it, moved by King's Raid's
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
  attack: [{ clips: ['ShaAttack1-1'], hits: [0.3] }, { clips: ['ShaAttack1-2'], hits: [0.3] }, { clips: ['ShaAttack1-3'], hits: [0.3, 0.4] }, { clips: ['ShaAttack1-4'], hits: [0.2] }, { clips: ['ShaAttack1-5'], hits: [0.4] }, { clips: ['ShaAttack1-6'], hits: [] }],
  skills: {
    hatred: { clips: ['Skill1'], hits: [1.3, 1.5, 1.7, 1.9, 2.1] },
    grudge: { clips: ['Skill2'], hits: [2] },
    dread: { clips: ['Skill3'], hits: [2.7] },
  },
} as const satisfies KrAnimations;

export const SHAKMEH_ASSETS: HeroAssets = {
  name: 'Shakmeh',
  folder: 'heroes/shakmeh',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/98/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Its unique weapon, wielded.
  unique: { Hero_Shakmeh_Vari05_Weapon: 'Hero_Shakmeh_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Shakmeh.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Dmg-swd-01', volume: 1.5, at: 0.05 }], [{ clip: 'Dmg-swd-02', volume: 1.5, at: 0.05 }], [{ clip: 'Dmg-swd-01', volume: 1.5, at: 0.05 }], [{ clip: 'Dmg-swd-02', volume: 1.5, at: 0.05 }], [{ clip: 'Dmg-swd-03', volume: 1.5, at: 0.05 }]],
      hatred: [[{ clip: 'Hit_common_01', volume: 1.5, at: 0.01 }]],
      grudge: [[{ clip: 'Hit_common_02', volume: 1.5, at: 0.01 }]],
      dread: [[{ clip: 'Hit_common_01', volume: 1.5, at: 0.01 }]],
    },
    casts: {
      hatred: [{ clip: 'Skill-Sword-01', volume: 2.5, at: 0.069 }, { clip: 'Shakmeh-Vox_Skill4_a', volume: 2.9, at: 0.251, own: true }, { clip: 'Skill-Sword-03', volume: 2.5, at: 0.997 }, { clip: 'Swd_spin_01', volume: 2.5, at: 1.447 }, { clip: 'Swd_idle_02', volume: 2.5, at: 1.968 }, { clip: 'Swd_idle_01', volume: 2.5, at: 2.598 }],
      grudge: [{ clip: 'Shakmeh-Vox_Skill3_a', volume: 2.9, at: 0.017, own: true }, { clip: 'Swd_idle_ready_01', volume: 2.5, at: 0.017 }, { clip: 'Swish-fire-01', volume: 2.5, at: 1.113 }, { clip: 'Exp_04', volume: 2.5, at: 1.693 }, { clip: 'Rock_impact_01', volume: 2.5, at: 2.538 }, { clip: 'Wind_01', volume: 2.5, at: 2.538 }, { clip: 'Skill-Impact-01', volume: 2.5, at: 3.26 }],
      dread: [{ clip: 'Shakmeh-Vox_Skill5_a', volume: 2.9, at: 0.017, own: true }, { clip: 'Skill-Sword-01', volume: 2.5, at: 0.148 }, { clip: 'Dark-fx-03', volume: 2.5, at: 1.211 }, { clip: 'Cast-14', volume: 2.5, at: 1.791 }, { clip: 'Exp_04', volume: 2.5, at: 2.553 }],
    },
    victory: [{ clip: 'Idle-Sword-04', volume: 2.5, at: 0.819 }, { clip: 'Idle-Sword-02', volume: 2.5, at: 1.663 }, { clip: 'Shakmeh-Vox_Victory_a', volume: 3, at: 2.036, own: true }, { clip: 'Sword-Short-01', volume: 2.5, at: 2.12 }, { clip: 'Idle-cloth-04', volume: 2.5, at: 2.951 }, { clip: 'Sword-Medium-02', volume: 2.5, at: 3.311 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    hatred: { start: ['Skill.Hero.Shakmeh.Skill1.Casting'] },
    grudge: { start: ['Skill.Hero.Shakmeh.Skill2.Casting', 'Skill.Hero.Shakmeh.Skill2.Attack'] },
    dread: { start: ['Skill.Hero.Shakmeh.Skill3.Debuff', 'Skill.Hero.Shakmeh.Skill3.Buff', 'Skill.Hero.Shakmeh.Skill3.Casting'] },
  },
  skins: [
    {
      name: 'Shakmeh',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Shakmeh.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Shakmeh.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Shakmeh.webp',
      // His artwork (krinfo.net's; the Drive folder has none of him): his head in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Shakmeh.png', from: 'https://krinfo.net/kingsraid-data/assets/heroes/Shakmeh/cos/Basic.png', crop: { x: 360, y: 140, size: 150 }, head: { x: 395, y: 175, size: 85 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Shakmeh_Vari05_Body', 'Hero_Shakmeh_Hair_01'],
        // (In its right hand, where King's Raid hangs it: Point_Hand_R.)
        right: 'Hero_Shakmeh_Vari05_Weapon',
      },
    },
    // King's Raid's Advance costume (tm-costumes.mjs).
    {
      name: 'Shakmeh_Advance',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Shakmeh_Advance.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Shakmeh_Advance.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Shakmeh_Advance.webp',
      title: 'Shadow of Aegina Shakmeh',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Shakmeh_Cos20Advance_Body', 'Hero_Shakmeh_Cos20Advance_Hair'],
        right: 'Hero_Shakmeh_Cos20Advance_Weapon',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Shakmeh_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Shakmeh_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Shakmeh_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Shakmeh_Summer.webp',
      title: 'Beachside Shakmeh',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Shakmeh_Cos21Summer_Body', 'Hero_Shakmeh_Hair_02'],
        right: 'Hero_Shakmeh_Vari05_Weapon',
      },
    },
  ],
};
