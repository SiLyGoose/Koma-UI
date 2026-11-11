import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Veronica, The Eye of Discernment (Hero_Veronica_Vari05…): as King's Raid's own model has it, moved by King's Raid's
 * own animations of it (ANIMATIONS: ../../heroes/body/kr.ts).
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
    hurt: { clips: ['Skill1'], hits: [1.7] },
    rune: { clips: ['Skill2'], hits: [0, 2.1] },
    sight: { clips: ['Skill3'], hits: [1.4, 1.5] },
  },
} as const satisfies KrAnimations;

export const VERONICA_ASSETS: HeroAssets = {
  name: 'Veronica',
  folder: 'heroes/veronica',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/72/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Its unique weapon, wielded.
  unique: { Hero_Veronica_Vari05_Weapon_L: 'Hero_Veronica_Unique01_Weapon_L', Hero_Veronica_Vari05_Weapon_R: 'Hero_Veronica_Unique01_Weapon_R' },
  // King's Raid's sounds (its Hit.Hero.Veronica.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_magic_01', volume: 1.5 }]],
      hurt: [[{ clip: 'Hit_fire_02', volume: 2 }]],
      sight: [[{ clip: 'Hit_big_02', volume: 2 }]],
    },
    casts: {
      hurt: [{ clip: 'Veronica-Vox_Skill1', volume: 2.4, at: 0.12, own: true }, { clip: 'Attack-Casting-65', volume: 1.4, at: 0.25 }, { clip: 'Attack-Casting-45', volume: 1.2, at: 0.83 }, { clip: 'Attack-Magic-39', volume: 1.5, at: 1.56 }, { clip: 'Attack-Magic-27', volume: 1.5, at: 1.59 }, { clip: 'Attack-Magic-64', volume: 1.5, at: 1.6 }],
      rune: [{ clip: 'Attack-Casting-65', volume: 1.2 }, { clip: 'Veronica-Vox_Skill2', volume: 2.4, own: true }, { clip: 'Attack-Casting-47', volume: 1.4, at: 0.05 }, { clip: 'Attack-Casting-57', volume: 1.2, at: 0.91 }, { clip: 'Attack-Casting-48', volume: 1.2, at: 0.99 }, { clip: 'Attack-Casting-56', volume: 1.2, at: 1.02 }, { clip: 'Attack-Magic-39', volume: 1.7, at: 2.02 }, { clip: 'Attack-Magic-59', volume: 1.7, at: 2.02 }],
      sight: [{ clip: 'Attack-Casting-65', volume: 1.6 }, { clip: 'Veronica-Vox_Skill3', volume: 2.4, own: true }, { clip: 'Attack-Magic-03', volume: 1.8, at: 1.1 }, { clip: 'Veronica-Vox_Attack4', volume: 2.4, at: 1.42, own: true }, { clip: 'Attack-Magic-13', volume: 1.8, at: 1.6 }, { clip: 'Attack-Magic-39', volume: 1.8, at: 2.2 }, { clip: 'Attack-Magic-59', volume: 1.8, at: 2.2 }],
    },
    victory: [{ clip: 'Veronica-Vox_Victory', volume: 2, at: 1.61, own: true }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Veronica.Attack1.Casting'], land: ['Skill.Hero.Veronica.Attack1.Projectile', 'Skill.Hero.Veronica.Attack1.Hit'] },
    hurt: { start: ['Skill.Hero.Veronica.Skill1.Casting'], land: ['Skill.Hero.Veronica.Skill1.Projectile', 'Skill.Hero.Veronica.Skill1.Hit'] },
    rune: { start: ['Skill.Hero.Veronica.Skill2.Casting'], land: ['Skill.Hero.Veronica.Skill2.HitLoop'] },
    sight: { start: ['Skill.Hero.Veronica.Skill3.Casting'], land: ['Skill.Hero.Veronica.Skill3.Projectile', 'Skill.Hero.Veronica.Skill3.HitLoop', 'Skill.Hero.Veronica.Skill3.Hit'] },
  },
  skins: [
    {
      name: 'Veronica',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Veronica.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Veronica.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Veronica.webp',
      // Its artwork (the Drive folder's): its head in the crop (the meter's close-up is its face by itself).
      portrait: { file: 'Veronica.png', from: `${DRIVE}1EeugIlSQnzCg1lMF9yyG5cV059VY50Zd`, crop: { x: 375, y: 0, size: 280 }, head: { x: 458, y: 70, size: 132 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Veronica_Vari05_Body', 'Hero_Veronica_Vari05_Hair'],
        left: 'Hero_Veronica_Vari05_Weapon_L',
        right: 'Hero_Veronica_Vari05_Weapon_R',
        offHand: 'held',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Veronica_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Veronica_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Veronica_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Veronica_Summer.webp',
      title: 'Beachside Veronica',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Veronica_Cos18Summer1_Body', 'Hero_Veronica_Hair_02'],
        left: 'Hero_Veronica_Cos18Summer_Weapon_L',
        right: 'Hero_Veronica_Cos18Summer_Weapon_R',
        offHand: 'held',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Veronica_Summer2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Veronica_Summer2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Veronica_Summer2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Veronica_Summer2.webp',
      title: 'Beachside Veronica',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Veronica_Cos18Summer2_Body', 'Hero_Veronica_Hair_02'],
        left: 'Hero_Veronica_Cos18Summer_Weapon_L',
        right: 'Hero_Veronica_Cos18Summer_Weapon_R',
        offHand: 'held',
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Veronica_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Veronica_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Veronica_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Veronica_Halloween.webp',
      title: 'Nurse Veronica',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Veronica_Cos18Halloween1_Body', 'Hero_Veronica_Cos18Halloween_Hair'],
        left: 'Hero_Veronica_Cos18Halloween_Weapon_L',
        right: 'Hero_Veronica_Cos18Halloween_Weapon_R',
        offHand: 'held',
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Veronica_Halloween2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Veronica_Halloween2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Veronica_Halloween2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Veronica_Halloween2.webp',
      title: 'Nurse Veronica',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Veronica_Cos18Halloween2_Body', 'Hero_Veronica_Cos18Halloween_Hair'],
        left: 'Hero_Veronica_Cos18Halloween_Weapon_L',
        right: 'Hero_Veronica_Cos18Halloween_Weapon_R',
        offHand: 'held',
      },
    },
    // King's Raid's Maid costume (tm-costumes.mjs).
    {
      name: 'Veronica_Maid',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Veronica_Maid.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Veronica_Maid.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Veronica_Maid.webp',
      title: 'Maid Veronica',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Veronica_Cos18Maid1_Body', 'Hero_Veronica_Cos18Maid_Hair'],
        left: 'Hero_Veronica_Cos18Maid_Weapon_L',
        right: 'Hero_Veronica_Cos18Maid_Weapon_R',
        offHand: 'held',
      },
    },
    // King's Raid's Maid costume (tm-costumes.mjs).
    {
      name: 'Veronica_Maid2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Veronica_Maid2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Veronica_Maid2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Veronica_Maid2.webp',
      title: 'Maid Veronica',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Veronica_Cos18Maid2_Body', 'Hero_Veronica_Cos18Maid_Hair'],
        left: 'Hero_Veronica_Cos18Maid_Weapon_L',
        right: 'Hero_Veronica_Cos18Maid_Weapon_R',
        offHand: 'held',
      },
    },
    // King's Raid's Job costume (tm-costumes.mjs).
    {
      name: 'Veronica_Job',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Veronica_Job.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Veronica_Job.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Veronica_Job.webp',
      title: 'Flight Attendant Veronica',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Veronica_Cos19Job1_Body', 'Hero_Veronica_Cos19Job_Hair'],
        left: 'Hero_Veronica_Cos19Job_Weapon_L',
        right: 'Hero_Veronica_Cos19Job_Weapon_R',
        offHand: 'held',
      },
    },
    // King's Raid's Job costume (tm-costumes.mjs).
    {
      name: 'Veronica_Job2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Veronica_Job2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Veronica_Job2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Veronica_Job2.webp',
      title: 'Flight Attendant Veronica',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Veronica_Cos19Job2_Body', 'Hero_Veronica_Cos19Job_Hair'],
        left: 'Hero_Veronica_Cos19Job_Weapon_L',
        right: 'Hero_Veronica_Cos19Job_Weapon_R',
        offHand: 'held',
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Veronica_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Veronica_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Veronica_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Veronica_Wedding.webp',
      title: 'Pledge of Faith Veronica',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Veronica_Cos20_Wedding1_Body', 'Hero_Veronica_Cos20_Wedding_Hair'],
        left: 'Hero_Veronica_Cos20_Wedding_Weapon_L',
        right: 'Hero_Veronica_Cos20_Wedding_Weapon_R',
        offHand: 'held',
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Veronica_Wedding2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Veronica_Wedding2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Veronica_Wedding2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Veronica_Wedding2.webp',
      title: 'Pledge of Faith Veronica',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Veronica_Cos20_Wedding2_Body', 'Hero_Veronica_Cos20_Wedding_Hair'],
        left: 'Hero_Veronica_Cos20_Wedding_Weapon_L',
        right: 'Hero_Veronica_Cos20_Wedding_Weapon_R',
        offHand: 'held',
      },
    },
  ],
};
