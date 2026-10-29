import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Lakrak, the Lizardman Gunner (Hero_Lakrak_…): his body and hair, and his weapon in his right hand, as King's Raid's own model has them. He is
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
  attack: [{ clips: ['Attack1'], hits: [0.7] }],
  skills: {
    rapid: { clips: ['Skill1'], hits: [1.8] },
    smoke: { clips: ['Attack2'], hits: [1.2] },
    glue: { clips: ['Skill2'], hits: [1.3] },
  },
} as const satisfies KrAnimations;

export const LAKRAK_ASSETS: HeroAssets = {
  name: 'Lakrak',
  folder: 'heroes/lakrak',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/7/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded.
  unique: { Lakrak_Vari05_Weapon: 'Hero_Lakrak_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Lakrak.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_gun_01', volume: 1.5 }]],
      rapid: [[{ clip: 'Hit_gun_02', volume: 2 }]],
      smoke: [[{ clip: 'Hit_gun_03', volume: 2 }]],
    },
    casts: {
      rapid: [{ clip: 'Attack-Casting-07', volume: 2.75, at: 0.08 }, { clip: 'Lakrak-Vox_Skill1_c', volume: 3, at: 0.43, own: true }, { clip: 'Attack-Casting-02', volume: 2.7, at: 0.48 }, { clip: 'Attack-Casting-03', volume: 2.7, at: 0.81 }, { clip: 'Attack-Shot-03', volume: 3, at: 1.72 }],
      smoke: [{ clip: 'Lakrak-Vox_Skill2', volume: 2, own: true }, { clip: 'Attack-Woosh-01', volume: 1.2, at: 0.2 }, { clip: 'FX-Gun-01', volume: 0.7, at: 0.25 }, { clip: 'Attack-Shot-01', volume: 1.2, at: 1.14 }],
      glue: [{ clip: 'FX-Gun-01', volume: 2.7, at: 0.08 }, { clip: 'Lakrak-Vox_Skill3_c', volume: 2.3, at: 0.12, own: true }, { clip: 'Attack-Casting-04', volume: 3, at: 0.13 }, { clip: 'Attack-Woosh-03', volume: 3.2, at: 1.3 }, { clip: 'FX-Lakrak_02', volume: 2.8, at: 1.74 }, { clip: 'FX-Lakrak_02', volume: 2.6, at: 2.25 }, { clip: 'FX-Lakrak_02', volume: 2.6, at: 3.22 }, { clip: 'FX-Lakrak_02', volume: 2.6, at: 4.21 }],
    },
    victory: [{ clip: 'Lakrak-Vox_Victory_b', volume: 1.6, own: true }, { clip: 'Attack-Body-02', at: 0.19 }, { clip: 'Attack-Body-02', at: 0.89 }, { clip: 'Attack-Body-02', at: 1.55 }, { clip: 'FX-Gun-01', at: 1.75 }, { clip: 'FX-Gun-03', at: 1.84 }, { clip: 'Death-Fall-01', at: 2.97 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Lakrak.Re.Attack1.Casting'], land: ['Skill.Hero.Lakrak.Re.Attack1.Hit'] },
    rapid: { start: ['Skill.Hero.Lakrak.Skill1.Billboard', 'Skill.Hero.Lakrak.Re.Skill1.Casting'], land: ['Skill.Hero.Lakrak.Re.Skill1.Hit', 'Skill.Hero.Lakrak.Skill1.Shot', 'Skill.Hero.Lakrak.Re.Skill1.Projectile', 'Hit.Physical.02'] },
    smoke: { start: ['Skill.Hero.Lakrak.Re.Attack2.Casting'], land: ['Skill.Hero.Lakrak.Re.Attack2.Hit'] },
    glue: { start: ['Skill.Hero.Lakrak.Re.Skill2.Casting'], land: ['Skill.Hero.Lakrak.Re.Skill2.Projectile', 'Skill.Hero.Lakrak.Re.Skill2.Hit'] },
  },
  skins: [
    {
      name: 'Lakrak',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lakrak.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lakrak.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lakrak.webp',
      // His artwork (the Drive folder's): his head in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Lakrak.png', from: `${DRIVE}1EWspkiph8rG3vumj6zoQJ2_SNV_Su11b`, crop: { x: 420, y: 200, size: 290 }, head: { x: 480, y: 290, size: 170 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        // (King's Raid's older naming: one mesh, no Hero_ before it.)
        parts: ['Lakrak_Vari05_Mesh'],
        right: 'Lakrak_Vari05_Weapon',
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Lakrak_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lakrak_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lakrak_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lakrak_Halloween.webp',
      title: 'Clown Lakrak',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lakrak_Cos17Halloween_Mesh'],
        right: 'Hero_Lakrak_Cos17Halloween_Weapon',
      },
    },
    // King's Raid's Frozen costume (tm-costumes.mjs).
    {
      name: 'Lakrak_Frozen',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lakrak_Frozen.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lakrak_Frozen.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lakrak_Frozen.webp',
      title: 'Ice Demon Lakrak',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lakrak_Cos18Frozen_Mesh'],
        right: 'Hero_Lakrak_Cos18Frozen_Weapon',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Lakrak_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lakrak_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lakrak_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lakrak_Summer.webp',
      title: 'Beachside Lakrak',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lakrak_Cos18Summer_Mesh'],
        right: 'Hero_Lakrak_Cos18Summer_Weapon',
      },
    },
    // King's Raid's Job costume (tm-costumes.mjs).
    {
      name: 'Lakrak_Job',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lakrak_Job.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lakrak_Job.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lakrak_Job.webp',
      title: 'Miner Lakrak',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lakrak_Cos19Job_Mesh'],
        right: 'Hero_Lakrak_Cos19Job_Weapon',
      },
    },
  ],
};
