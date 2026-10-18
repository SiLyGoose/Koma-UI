import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Morrah: her body and hair, her sword (Carprain) in her right hand and her shield on her left arm, laid out as Klaus's
 * are (the blade along what was its y). She is moved by King's Raid's own animations of her (ANIMATIONS:
 * ../../heroes/body/kr.ts).
 */

/**
 * King's Raid's own animations (its skins of the game's files are moved by them: ../../heroes/body/kr.ts): its basic attack's
 * chain, and each skill's clips, with when its blows land in them as the game's timelines have them (KR-extracted/scripts/tm-anims.mjs).
 */
const ANIMATIONS = {
  idle: 'Idle',
  run: 'Run',
  hurt: 'Damage',
  attack: [{ clips: ['Attack1-1'], hits: [0.3] }, { clips: ['Attack1-2'], hits: [0.2, 0.4] }, { clips: ['Attack1-3'], hits: [0.5] }, { clips: ['Attack1-4'], hits: [0.8] }],
  skills: {
    burning: { clips: ['Skill1'], hits: [1.2, 1.3, 1.4] },
    hellfire: { clips: ['Skill2'], hits: [1.1] },
    eruption: { clips: ['Dash', 'Skill3'], hits: [2.333, 2.633, 2.933] },
  },
} as const satisfies KrAnimations;

export const MORRAH_ASSETS: HeroAssets = {
  name: 'Morrah',
  folder: 'heroes/morrah',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/22/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Carprain, her sword and shield.
  unique: { Hero_Morrah_Vari05_Shield: 'Hero_Morrah_Unique01_Shield', Hero_Morrah_Vari05_Sword: 'Hero_Morrah_Unique01_Sword' },
  // King's Raid's sounds (its Hit.Hero.Morrah.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); and as each skill begins.
  sounds: {
    hits: {
      attack: [[{ clip: 'Dmg_punch_01', volume: 1.5 }], [{ clip: 'Dmg_punch_02', volume: 1.5 }], [{ clip: 'Dmg_punch_03', volume: 1.5 }], [{ clip: 'Dmg_punch_04', volume: 1.5 }]],
      burning: [[{ clip: 'Hit_big_01', volume: 2 }]],
      hellfire: [[{ clip: 'Hit_big_02', volume: 2 }]],
      eruption: [[{ clip: 'Hit_big_03', volume: 2 }]],
    },
    casts: {
      burning: [{ clip: 'Attack-Casting-14', volume: 1.1 }, { clip: 'Attack-Casting-15', volume: 0.95 }, { clip: 'Attack-Casting-12', volume: 2.5, at: 0.81 }, { clip: 'Morrah-Vox_Skill1_b', volume: 2.1, at: 1.12, own: true }, { clip: 'Attack-Magic-22', volume: 2.5, at: 1.68 }, { clip: 'Attack-Magic-10', volume: 2.5, at: 1.73 }],
      hellfire: [{ clip: 'Attack-Casting-14', volume: 1.1 }, { clip: 'Attack-Casting-15', volume: 0.95 }, { clip: 'Morrah-Vox_Skill2', volume: 2.1, at: 0.11, own: true }, { clip: 'Attack-Magic-22', volume: 2.2, at: 0.87 }, { clip: 'Attack-Magic-10', volume: 2.2, at: 0.92 }, { clip: 'Attack-Magic-19', volume: 1.2, at: 1.4 }],
      eruption: [{ clip: 'Attack-Casting-14', volume: 1.1 }, { clip: 'Attack-Casting-15', volume: 0.95 }, { clip: 'Attack-Woosh-09', volume: 1.8, at: 0.45 }, { clip: 'Morrah-Vox_Attack2', volume: 2.1, at: 0.52, own: true }, { clip: 'Attack-Magic-23', volume: 2.5, at: 0.6 }, { clip: 'Attack-Shot-09', volume: 1.6, at: 0.6 }, { clip: 'Attack-Woosh-09', volume: 1.8, at: 0.96 }, { clip: 'Morrah-Vox_Attack3', volume: 2.1, at: 1.07, own: true }, { clip: 'Attack-Magic-23', volume: 2.5, at: 1.12 }, { clip: 'Attack-Shot-09', volume: 1.6, at: 1.12 }, { clip: 'Morrah-Vox_Skill3', volume: 2.1, at: 1.66, own: true }, { clip: 'Attack-Magic-10', volume: 2.5, at: 1.74 }, { clip: 'Attack-Magic-22', volume: 2.5, at: 1.76 }, { clip: 'Attack-Woosh-09', volume: 1.8, at: 2.13 }, { clip: 'Attack-Magic-26', volume: 2.5, at: 2.27 }, { clip: 'Death-Fall-06', volume: 3.5, at: 2.27 }],
    },
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Morrah.Re.Attack1.Casting1', 'Skill.Hero.Morrah.Re.Attack1.Casting4', 'Skill.Hero.Morrah.Re.Attack1.Casting2', 'Skill.Hero.Morrah.Re.Attack1.Casting3'], land: ['Skill.Hero.Morrah.Attack1.Hit', 'Hit.Normal.StrikeBig', 'Hit.Normal.SlashBig'] },
    burning: { start: ['Skill.Hero.Morrah.Skill1.Ring', 'Skill.Hero.Morrah.Re.Skill1.Casting', 'Skill.Hero.Morrah.Skill1'], land: ['Hit.Normal.Fire'] },
    hellfire: { start: ['Skill.Hero.Morrah.Re.Skill2.Casting'], land: ['Skill.Hero.Morrah.Re.Skill2.HitLoop', 'Hit.Explosion.05'] },
    eruption: { start: ['Skill.Hero.Morrah.Re.Skill3.Casting'], land: ['Skill.Hero.Morrah.Skill3.HitRing', 'Skill.Hero.Morrah.Re.Skill3.Hit'] },
  },
  skins: [
    {
      name: 'Morrah',
      // Her artwork, leaping, her wings spread and Carprain's fire dragon over her: her head and horns in the crop (the meter’s close-up is her face by itself).
      portrait: { file: 'Morrah.png', crop: { x: 385, y: 214, size: 100 }, head: { x: 396, y: 236, size: 60 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Morrah_Vari05_Body', 'Hero_Morrah_Vari05_Hair'],
        left: 'Hero_Morrah_Vari05_Shield',
        right: 'Hero_Morrah_Vari05_Sword',
        blade: 'y',
      },
    },
  ],
};
