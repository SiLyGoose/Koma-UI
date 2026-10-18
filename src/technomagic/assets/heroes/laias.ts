import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Laias's files are named Ell in the game's own (Hero_Ell_…). Her staff goes in her right hand: the only hand her
 * file marks. With no rig of hers, she stands, runs in and does the rest as ../../heroes/laias/moves.ts has it.
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
  victoryIdle: 'VictoryIdol',
  lose: 'Lose',
  dead: 'Dead',
  attack: [{ clips: ['Attack1'], hits: [1] }],
  skills: {
    droplets: { clips: ['Skill1'], hits: [2.1] },
    bubble: { clips: ['Skill2'], hits: [1.6] },
    festival: { clips: ['Skill3'], hits: [1.7] },
  },
} as const satisfies KrAnimations;

export const LAIAS_ASSETS: HeroAssets = {
  name: 'Laias',
  folder: 'heroes/laias',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/29/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Eltoirre, her staff (Ell's in the game's files).
  unique: { Hero_Ell_Vari05_Weapon: 'Hero_Ell_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Ell.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      splash: [[{ clip: 'Hit_common_06', volume: 1.5 }]],
    },
    casts: {
      droplets: [{ clip: 'Attack-Casting-18', volume: 1.3, at: 0.069 }, { clip: 'Laias-Vox_Skill1_c', volume: 2.2, at: 0.23, own: true }, { clip: 'Attack-Casting-23', volume: 1.3, at: 0.342 }, { clip: 'Attack-Magic-15', volume: 1.2, at: 0.75 }, { clip: 'Attack-Magic-22', volume: 1.3, at: 0.75 }, { clip: 'Attack-Magic-07', volume: 1.3, at: 0.75 }, { clip: 'Attack-Magic-22', volume: 1.4, at: 0.75 }, { clip: 'Attack-Magic-51', volume: 1.2, at: 0.75 }],
      bubble: [{ clip: 'Laias-Vox_Skill2_c', volume: 2.2, at: 0.14, own: true }, { clip: 'Attack-Casting-27', volume: 1.3, at: 0.377 }, { clip: 'Attack-Magic-15', volume: 1.2, at: 0.447 }, { clip: 'Attack-Magic-52', volume: 1.2, at: 1.527 }, { clip: 'Attack-Magic-51', volume: 1.2, at: 1.552 }],
      festival: [{ clip: 'Attack-Casting-30', volume: 1.3 }, { clip: 'Laias-vox_pur2', volume: 2.2, own: true }, { clip: 'Attack-Casting-18', volume: 1.3, at: 0.14 }, { clip: 'Laias-Vox_Skill3_b', volume: 2.2, at: 0.91, own: true }, { clip: 'Attack-Casting-28', volume: 1.3, at: 0.924 }, { clip: 'Attack-Magic-22', volume: 1.2, at: 1.554 }, { clip: 'Attack-Magic-07', volume: 1.2, at: 1.554 }],
    },
    victory: [{ clip: 'Laias-Vox_Victory_b', volume: 2.2, at: 0.89, own: true }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    splash: { start: ['Skill.Hero.Ell.Attack1.Casting'], land: ['Skill.Hero.Ell.Attack1.Hit', 'Skill.Hero.Ell.Attack1.Projectile'] },
    droplets: { start: ['Skill.Hero.Ell.Skill1.Casting'], land: ['Skill.Hero.Ell.Skill1.Hit', 'Skill.Hero.Ell.Skill1.Projectile'] },
    bubble: { start: ['Skill.Hero.Ell.Skill2.Casting'], land: ['Skill.Hero.Ell.Skill2.HitLoop', 'Skill.Hero.Ell.Skill2.Hit', 'Skill.Hero.Ell.Skill2.Projectile'] },
    festival: { start: ['Skill.Hero.Ell.Skill3.Casting'], land: ['Skill.Hero.Ell.Re.Skill3.Hit'] },
  },
  skins: [
    {
      name: 'Laias',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Laias.webp',
      // Her artwork, floating with her tail curled under her: her head and crown in the crop (the meter's close-up is her face by itself).
      portrait: {
        file: 'Laias.png',
        from: 'https://drive.google.com/uc?export=download&id=1OY08dVdhjOslRqDW75djPgT0J3PrpBsl',
        crop: { x: 375, y: 185, size: 210 },
        head: { x: 418, y: 250, size: 130 },
      },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Ell_Vari05_Body', 'Hero_Ell_Vari05_Hair'],
        right: 'Hero_Ell_Vari05_Weapon',
      },
    },
  ],
};
