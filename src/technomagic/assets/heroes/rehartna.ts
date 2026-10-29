import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Rehartna, the Bard of the New Road (Hero_Rehartna_…): her body, hair and her weapon on her own skeleton, as King's Raid's own model has them. She is
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
  attack: [{ clips: ['Attack1'], hits: [1.2] }],
  skills: {
    ultrasonic: { clips: ['Skill1'], hits: [2.3, 2.5, 2.7, 2.9] },
    crystal: { clips: ['Skill2'], hits: [0.7] },
    instrument: { clips: ['Skill3'], hits: [2.3] },
  },
} as const satisfies KrAnimations;

export const REHARTNA_ASSETS: HeroAssets = {
  name: 'Rehartna',
  folder: 'heroes/rehartna',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/82/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded.
  unique: { Hero_Rehartna_Vari05_Weapon: 'Hero_Rehartna_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Rehartna.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Dmg_bell_01', volume: 1.4 }]],
      ultrasonic: [[{ clip: 'Hit_gun_03', volume: 1.3 }]],
    },
    casts: {
      ultrasonic: [{ clip: 'Attack-Magic-73', volume: 1.2, at: 0.11 }, { clip: 'Rehartna-Vox_Skill1_b', volume: 2.4, at: 0.36, own: true }, { clip: 'Attack-Casting-20', volume: 1.4, at: 0.5 }, { clip: 'Attack-Magic-37', volume: 1.2, at: 0.78 }, { clip: 'Attack-Magic-74', volume: 1.4, at: 1.05 }, { clip: 'Attack-Casting-48', volume: 1.2, at: 1.21 }],
      crystal: [{ clip: 'Attack-Jump-01', volume: 1.6, at: 0.27 }, { clip: 'Rehartna-Vox_Attack3', volume: 2.2, at: 0.27, own: true }, { clip: 'Attack-Magic-73', volume: 1.2, at: 0.36 }, { clip: 'Attack-Casting-74', volume: 1.4, at: 0.5 }, { clip: 'FX-Rehartna_01', volume: 1.7, at: 0.85 }, { clip: 'Attack-Magic-72', volume: 1.4, at: 0.88 }, { clip: 'Attack-Magic-61', volume: 1.1, at: 1.72 }, { clip: 'Attack-Magic-84', volume: 1.3, at: 1.86 }],
      instrument: [{ clip: 'Rehartna-Vox_Skill5_c', volume: 2.5, at: 0.16, own: true }, { clip: 'Attack-Jump-01', volume: 1.6, at: 0.58 }, { clip: 'FX-Machine-02', volume: 1.7, at: 1.29 }, { clip: 'Attack-Casting-81~EFFECT_Attack_Casting', volume: 1.4, at: 1.59 }, { clip: 'Attack-Magic-41', volume: 1.1, at: 2.21 }, { clip: 'Attack-Magic-59', volume: 1.1, at: 2.25 }, { clip: 'FX-Rehartna_02', volume: 1.7, at: 2.27 }, { clip: 'Attack-Magic-84', volume: 1.1, at: 2.31 }],
    },
    victory: [{ clip: 'Rehartna-Vox_Victory_b', volume: 2.2, at: 0.28, own: true }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Rehartna.Attack1.Casting'], land: ['Skill.Hero.Rehartna.Attack1.Projectile', 'Skill.Hero.Rehartna.Attack1.Hit'] },
    ultrasonic: { start: ['Skill.Hero.Rehartna.Skill1.Casting'], land: ['Skill.Hero.Rehartna.Skill1.Hit'] },
    crystal: { start: ['Skill.Hero.Rehartna.Skill2.Casting', 'Skill.Hero.Rehartna.Skill2.Loop'], land: ['Skill.Hero.Rehartna.Skill2.Projectile'] },
    instrument: { start: ['Skill.Hero.Rehartna.Skill3.Casting'], land: ['Skill.Hero.Rehartna.Skill3.Hit', 'Skill.Hero.Rehartna.Skill3.HitLoop'] },
  },
  skins: [
    {
      name: 'Rehartna',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Rehartna.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Rehartna.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Rehartna.webp',
      // Her artwork (the Drive folder's): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Rehartna.png', from: `${DRIVE}1QzkWSlvOQgaWy0fohkkFUpgF7F1dlI6N`, crop: { x: 285, y: 140, size: 220 }, head: { x: 395, y: 200, size: 100 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Rehartna_Vari05_Body', 'Hero_Rehartna_Vari05_Hair'],
        // (Held in her right hand, where King's Raid hangs it: Point_Hand_R.)
        right: 'Hero_Rehartna_Vari05_Weapon',
      },
    },
    // King's Raid's Job costume (tm-costumes.mjs).
    {
      name: 'Rehartna_Job',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Rehartna_Job.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Rehartna_Job.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Rehartna_Job.webp',
      title: 'Orchestra Rehartna',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Rehartna_Cos19Job_Body', 'Hero_Rehartna_Cos19Job_Hair'],
        right: 'Hero_Rehartna_Cos19Job_Weapon',
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Rehartna_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Rehartna_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Rehartna_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Rehartna_Christmas.webp',
      title: 'Christmas of the Messenger Rehartna',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Rehartna_Cos19Christmas_Body', 'Hero_Rehartna_Cos19Christmas_Hair'],
        right: 'Hero_Rehartna_Cos19Christmas_Weapon',
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Rehartna_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Rehartna_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Rehartna_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Rehartna_Wedding.webp',
      title: 'Serenade of Happiness Rehartna',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Rehartna_Cos20Wedding_Body', 'Hero_Rehartna_Cos20Wedding_Hair'],
        right: 'Hero_Rehartna_Cos20Wedding_Weapon',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Rehartna_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Rehartna_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Rehartna_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Rehartna_Summer.webp',
      title: 'Beachside Rehartna',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Rehartna_Cos20Summer_Body', 'Hero_Rehartna_Cos20Summer_Hair'],
        right: 'Hero_Rehartna_Cos20Summer_Weapon',
      },
    },
  ],
};
