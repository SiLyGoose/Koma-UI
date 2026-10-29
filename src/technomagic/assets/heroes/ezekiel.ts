import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Ezekiel holds nothing: his weapon, Barbatos, is his demonic right arm, a part on his own skeleton (his body has
 * no right arm of its own), with the chains wound round it a part of its own. He stands in Kirze's idle (a copy of
 * her Glory League rig's, on her skeleton: varied as he stands in it, so the two never stand alike,
 * ../../heroes/ezekiel/) and attacks with a fist fight; he runs in and does his skills as ../../heroes/ezekiel/moves.ts has it.
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
  attack: [{ clips: ['Attack1-1'], hits: [0.3] }, { clips: ['Attack1-2'], hits: [0.2, 0.5] }, { clips: ['Attack1-3'], hits: [0.4] }, { clips: ['Attack1-4'], hits: [0.3] }],
  skills: {
    instinct: { clips: ['Skill1'], hits: [0, 1.3, 2] },
    despair: { clips: ['Skill2-1', 'Skill2-2', 'Skill2-3'], hits: [1.2] },
    doom: { clips: ['Skill3'], hits: [2.1] },
  },
} as const satisfies KrAnimations;

export const EZEKIEL_ASSETS: HeroAssets = {
  name: 'Ezekiel',
  folder: 'heroes/ezekiel',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/37/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded: Barbatos, his demon arm.
  unique: { Hero_Ezekiel_Vari05_Weapon: 'Hero_Ezekiel_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Ezekiel.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Dmg_punch_01', volume: 1.5 }]],
      despair: [[{ clip: 'Dmg_punch_04', volume: 2 }]],
    },
    casts: {
      instinct: [{ clip: 'Attack-Casting-04', volume: 1.3, at: 0.1 }, { clip: 'Attack-Casting-16', volume: 1.3, at: 0.21 }, { clip: 'Ezekiel-Vox_Skill1', volume: 2.3, at: 0.55, own: true }, { clip: 'Attack-Magic-04', volume: 1.4, at: 1.23 }, { clip: 'Attack-Woosh-15', volume: 1.6, at: 1.29 }, { clip: 'Attack-Woosh-14', volume: 1.6, at: 1.5 }, { clip: 'FX-WB_Golem_01', volume: 1.6, at: 2.06 }, { clip: 'Attack-Damage-20', volume: 1.5, at: 2.06 }],
      despair: [{ clip: 'Ezekiel-Vox_Skill2', volume: 2.3, own: true }, { clip: 'Attack-Casting-04', volume: 1.3, at: 0.16 }, { clip: 'Attack-Casting-16', volume: 1.3, at: 0.27 }, { clip: 'Attack-Magic-05', volume: 1.4, at: 0.84 }, { clip: 'Attack-Magic-05', volume: 1.4, at: 1.01 }],
      doom: [{ clip: 'Attack-Casting-04', volume: 1.3, at: 0.16 }, { clip: 'Attack-Casting-16', volume: 1.3, at: 0.27 }, { clip: 'Ezekiel-Vox_Skill3', volume: 2.3, at: 0.41, own: true }, { clip: 'Attack-Magic-06', volume: 1.4, at: 0.86 }, { clip: 'Attack-Magic-16', volume: 1.4, at: 2.03 }, { clip: 'Attack-Magic-09', volume: 1.4, at: 2.18 }, { clip: 'Attack-Magic-20', volume: 1.4, at: 2.18 }],
    },
    victory: [{ clip: 'Attack-Body-01', volume: 1.2, at: 0.29 }, { clip: 'Ezekiel-Vox_Victory', volume: 2.3, at: 0.4, own: true }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Ezekiel.Attack1-1.Casting.4', 'Skill.Hero.Ezekiel.Attack1-1.Casting.1', 'Skill.Hero.Ezekiel.Attack1-1.Casting.3', 'Skill.Hero.Ezekiel.Attack1-1.Casting.2', 'Skill.Hero.Ezekiel.Attack1-2.Casting.4', 'Skill.Hero.Ezekiel.Attack1-2.Casting.2', 'Skill.Hero.Ezekiel.Attack1-2.Casting.3', 'Skill.Hero.Ezekiel.Attack1-2.Casting.1'], land: ['Skill.Hero.Ezekiel.Attack1-1.Hit2', 'Skill.Hero.Ezekiel.Attack1-1.Hit1'] },
    instinct: { start: ['Skill.Hero.Ezekiel.Skill1-2.Casting', 'Skill.Hero.Ezekiel.Skill1-1.Casting'] },
    despair: { start: ['Skill.Hero.Ezekiel.Skill2-1.Casting2', 'Skill.Hero.Ezekiel.Skill2-1.Casting1', 'Skill.Hero.Ezekiel.Skill2-2.Casting2', 'Skill.Hero.Ezekiel.Skill2-2.Casting1'] },
    doom: { start: ['Skill.Hero.Ezekiel.Skill3-2.Casting', 'Skill.Hero.Ezekiel.Skill3-1.Casting'] },
  },
  skins: [
    {
      name: 'Ezekiel',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Ezekiel.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Ezekiel.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Ezekiel.webp',
      // His artwork, lunging with his demon arm flung out: his head in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Ezekiel.png', from: `${DRIVE}1YnvFZjPQRrM40MH0gZrBU_lYrFu6t1pR`, crop: { x: 320, y: 200, size: 190 }, head: { x: 350, y: 240, size: 120 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Ezekiel_Vari05_Mesh', 'Hero_Ezekiel_Vari05_Weapon', 'Hero_Ezekiel_Vari05_Arm'],
      },
    },
    // King's Raid's School costume (tm-costumes.mjs).
    {
      name: 'Ezekiel_School',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Ezekiel_School.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Ezekiel_School.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Ezekiel_School.webp',
      title: 'Troublemaker Ezekiel',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Ezekiel_Cos18SL_Mesh', 'Hero_Ezekiel_Cos18SL_Weapon', 'Hero_Ezekiel_Cos18SL_Arm'],
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Ezekiel_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Ezekiel_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Ezekiel_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Ezekiel_Summer.webp',
      title: 'Beachside Ezekiel',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Ezekiel_Cos18Summer_Mesh', 'Hero_Ezekiel_Cos18Summer_Weapon', 'Hero_Ezekiel_Cos18Summer_Arm'],
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Ezekiel_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Ezekiel_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Ezekiel_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Ezekiel_Halloween.webp',
      title: 'Cheshire Cat Ezekiel',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Ezekiel_Cos18Halloween_Mesh', 'Hero_Ezekiel_Cos18Halloween_Weapon', 'Hero_Ezekiel_Cos18Halloween_Arm'],
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Ezekiel_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Ezekiel_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Ezekiel_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Ezekiel_Wedding.webp',
      title: 'Love, the Curse Breaker Ezekiel',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Ezekiel_Cos19Wedding_Mesh', 'Hero_Ezekiel_Cos19Wedding_Weapon', 'Hero_Ezekiel_Cos19Wedding_Arm'],
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Ezekiel_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Ezekiel_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Ezekiel_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Ezekiel_Christmas.webp',
      title: 'Christmas of the Half-Demon Ezekiel',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Ezekiel_Cos19Christmas_Mesh', 'Hero_Ezekiel_Cos19Christmas_Weapon', 'Hero_Ezekiel_Cos19Christmas_Arm'],
      },
    },
  ],
};
