import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Chase, the Mercenary of Fury (Hero_Chase_…): his body, and his weapon in his right hand, as King's Raid's own model has them. He is
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
  attack: [{ clips: ['Attack1-1'], hits: [0.4] }, { clips: ['Attack1-2'], hits: [0.5] }, { clips: ['Attack1-3'], hits: [0.4] }, { clips: ['Attack1-4'], hits: [0.4, 0.9] }],
  skills: {
    break: { clips: ['Skill1'], hits: [1.5] },
    limit: { clips: ['Skill2'], hits: [1.2] },
    fury: { clips: ['Skill3-1', 'Skill3-2'], hits: [0.3, 1.8, 2.6, 2.8, 3] },
  },
} as const satisfies KrAnimations;

export const CHASE_ASSETS: HeroAssets = {
  name: 'Chase',
  folder: 'heroes/chase',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/67/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded.
  unique: { Hero_Chase_Vari05_Weapon: 'Hero_Chase_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Chase.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_sword_02', volume: 1.5 }]],
      break: [[{ clip: 'Hit_sword_03', volume: 2 }]],
    },
    casts: {
      break: [{ clip: 'Chase-Vox_Skill1', volume: 2.2, own: true }, { clip: 'Attack-Magic-18', volume: 1.2, at: 0.39 }, { clip: 'Attack-Magic-23', volume: 1.6, at: 0.46 }, { clip: 'Attack-Casting-36', volume: 1.5, at: 0.81 }, { clip: 'Attack-Casting-12', volume: 1.5, at: 0.83 }, { clip: 'Chase-Vox_Attack2', volume: 1.8, at: 1.77, own: true }, { clip: 'Attack-Magic-23', volume: 1.6, at: 1.79 }],
      limit: [{ clip: 'Attack-Magic-23', volume: 1.6, at: 0.33 }, { clip: 'Attack-Magic-19', volume: 1.2, at: 0.7 }, { clip: 'Chase-Vox_Skill2', volume: 2.6, at: 0.7, own: true }, { clip: 'Attack-Casting-12', volume: 1.5, at: 1.11 }, { clip: 'Attack-Magic-21', volume: 1.6, at: 1.16 }, { clip: 'Attack-Magic-20', volume: 1.2, at: 1.2 }],
      fury: [{ clip: 'Attack-Casting-12', volume: 1.5 }, { clip: 'Attack-Magic-20', volume: 1.3, at: 0.29 }, { clip: 'Attack-Magic-23', volume: 1.6, at: 0.31 }, { clip: 'Attack-Casting-12', volume: 1.5, at: 1.17 }, { clip: 'Chase-Vox_Skill3', volume: 2.2, at: 1.23, own: true }, { clip: 'Attack-Magic-22', volume: 1.5, at: 1.79 }, { clip: 'Death-Fall-06', volume: 1.9, at: 1.83 }, { clip: 'Attack-Magic-21', volume: 1.8, at: 2.59 }],
    },
    victory: [{ clip: 'Chase-Vox_Victory', volume: 1.6, own: true }, { clip: 'Attack-Woosh-09', at: 1.08 }, { clip: 'Attack-Woosh-09', at: 1.27 }, { clip: 'Attack-Landing-03', at: 2.03 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Chase.Attack1.Casting.4', 'Skill.Hero.Chase.Attack1.Casting.2', 'Skill.Hero.Chase.Attack1.Casting.3', 'Skill.Hero.Chase.Attack1.Casting.1'] },
    break: { start: ['Skill.Hero.Chase.Skill1.Casting'], land: ['Skill.Hero.Chase.Skill1.Hit', 'Skill.Hero.Chase.Skill1.Projectile'] },
    limit: { start: ['Skill.Hero.Chase.Skill2.Casting2', 'Skill.Hero.Chase.Skill2.Casting', 'Skill.Hero.Chase.Skill2.CastingLoop'] },
    fury: { start: ['Skill.Hero.Chase.Skill3.Casting1', 'Skill.Hero.Chase.Skill3.Casting2'] },
  },
  skins: [
    {
      name: 'Chase',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Chase.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Chase.webp',
      // His artwork (the Drive folder's): his head in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Chase.png', from: `${DRIVE}1eqjv-gNXfErLArFpIeJ7TK_2WdKAWvEe`, crop: { x: 730, y: 240, size: 130 }, head: { x: 772, y: 278, size: 70 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Chase_Vari05_Body', 'Hero_Chase_Hair_01'],
        right: 'Hero_Chase_Vari05_Weapon',
      },
    },
  ],
};
