import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Oddy, a red panda: his body (all of him in one), and his clock, held as his right hand's: King's Raid's own
 * animations of him (ANIMATIONS: ../../heroes/body/kr.ts) keep its mark on his back, and carry it (grown) as he leaps.
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
  attack: [{ clips: ['Attack1'], hits: [1.4] }],
  skills: {
    fracture: { clips: ['Skill1'], hits: [1.9] },
    fragments: { clips: ['Skill2'], hits: [2, 2.1, 2.2, 2.3, 2.4, 2.5] },
    distortion: { clips: ['Skill3'], hits: [2.7] },
  },
} as const satisfies KrAnimations;

export const ODDY_ASSETS: HeroAssets = {
  name: 'Oddy',
  folder: 'heroes/oddy',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/41/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded: Tempodiana, his clock.
  unique: { Hero_Oddy_Vari05_Weapon: 'Hero_Oddy_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Oddy.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      chime: [[{ clip: 'Hit_gun_02', volume: 1.5 }]],
      fracture: [[{ clip: 'Hit_gun_03', volume: 2 }]],
      fragments: [[{ clip: 'Hit_gun_04', volume: 2 }]],
      distortion: [[{ clip: 'Hit_magic_01', volume: 2, at: 1.34 }]],
    },
    casts: {
      fracture: [{ clip: 'Attack-Casting-62', volume: 1.8 }, { clip: 'Oddy-Vox_Skill5-2', volume: 2.2, own: true }, { clip: 'Attack-Magic-58', volume: 1.4, at: 0.7 }, { clip: 'Attack-Magic-59', volume: 1.4, at: 0.7 }, { clip: 'Oddy-Vox_Skill5-3', volume: 2.2, at: 0.9, own: true }, { clip: 'Attack-Magic-22', volume: 1.4, at: 1.63 }, { clip: 'Attack-Shot-03', volume: 1.7, at: 1.63 }, { clip: 'Oddy-Vox_Skill5-4', volume: 2.2, at: 2.3, own: true }],
      fragments: [{ clip: 'Attack-Casting-62', volume: 1.8 }, { clip: 'Oddy-Vox_Skill3', volume: 2.2, own: true }, { clip: 'Attack-Casting-20', volume: 1.6, at: 0.45 }, { clip: 'Attack-Shot-03', volume: 1.8, at: 1.84 }, { clip: 'Attack-Shot-03', volume: 1.8, at: 2.02 }, { clip: 'Attack-Shot-03', volume: 1.8, at: 2.27 }, { clip: 'Attack-Shot-03', volume: 1.8, at: 2.46 }, { clip: 'Attack-Landing-01', volume: 1.6, at: 3.63 }],
      distortion: [{ clip: 'Oddy-Vox_Skill2', volume: 2.2, own: true }, { clip: 'Attack-Casting-40', volume: 1.8, at: 0.05 }, { clip: 'Attack-Woosh-10', volume: 1.5, at: 0.63 }, { clip: 'Attack-Woosh-10', volume: 1.5, at: 1.03 }, { clip: 'Attack-Casting-45', volume: 1.5, at: 1.18 }, { clip: 'Attack-Casting-45', volume: 1.8, at: 1.8 }, { clip: 'Attack-Magic-39', volume: 1.6, at: 2.45 }],
    },
    victory: [{ clip: 'Oddy-Vox_Victory', volume: 2.2, at: 0.63, own: true }, { clip: 'Attack-Body-02', volume: 1.8, at: 1.45 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    chime: { start: ['Skill.Hero.Oddy.Attack1.Casting'], land: ['Skill.Hero.Oddy.Attack1.Projectile', 'Skill.Hero.Oddy.Attack1.Hit'] },
    fracture: { start: ['Skill.Hero.Oddy.Skill1.Casting'], land: ['Skill.Hero.Oddy.Skill1.Hit', 'Common.Stone'] },
    fragments: { start: ['Skill.Hero.Oddy.Skill2.Casting'], land: ['Skill.Hero.Oddy.Skill2.Projectile', 'Skill.Hero.Oddy.Skill2.Hit', 'Common.CooldownReduction'] },
    distortion: { start: ['Skill.Hero.Oddy.Skill3.Casting', 'Skill.Hero.Oddy.Skill3.Loop'], land: ['Skill.Hero.Oddy.Skill3.Hit'] },
  },
  skins: [
    {
      name: 'Oddy',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Oddy.webp',
      // His artwork (from the wiki, asked for as the PNG it was uploaded as), his clock overhead: his head, ears and goggles in the crop (the meter's close-up is his face by itself).
      portrait: {
        file: 'Oddy.png',
        from: 'https://static.wikia.nocookie.net/charactah-account/images/6/6f/Oddy_Render_01.png/revision/latest?cb=20221007054314&format=original',
        crop: { x: 290, y: 290, size: 160 },
        head: { x: 325, y: 335, size: 95 },
      },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Oddy_Vari05_Mesh'],
        right: 'Hero_Oddy_Vari05_Weapon',
      },
    },
  ],
};
