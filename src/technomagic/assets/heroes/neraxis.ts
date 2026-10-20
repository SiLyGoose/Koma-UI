import type { HeroAssets, PartsModel, KrAnimations } from '../types.ts';

/*
 * Neraxis in his fifth look: his body (his wings a part of it), his hair, and his dragon's-head gauntlet on his left
 * hand (where his body's file marks it: held, not a shield). He is moved by King's Raid's own animations of him
 * (ANIMATIONS: ../../heroes/body/kr.ts).
 */

/** How his left hand wears his gauntlet (his body's file marks its hand at his feet): along his hand, the dragon's head over his fist. */
const GRIPS = { L: { at: [0, 0, 0], turn: [0, 0, 0] } } as const satisfies PartsModel['grips'];


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
  attack: [{ clips: ['Attack1-1'], hits: [0.4, 0.6] }, { clips: ['Attack1-2'], hits: [0.2] }, { clips: ['Attack1-3'], hits: [0.4, 1.1] }],
  skills: {
    lightning: { clips: ['Skill1'], hits: [2.1] },
    roar: { clips: ['Skill2'], hits: [2.1] },
    breath: { clips: ['Skill3'], hits: [2.6, 2.9, 3.2, 3.5, 3.8, 4] },
  },
} as const satisfies KrAnimations;

export const NERAXIS_ASSETS: HeroAssets = {
  name: 'Neraxis',
  folder: 'heroes/neraxis',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/58/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded: Acravita, his gauntlet.
  unique: { Hero_Neraxis_Vari05_Weapon: 'Hero_Neraxis_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Neraxis.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Dmg_punch_02', volume: 1.5 }], [{ clip: 'Dmg_punch_03', volume: 1.5 }], [{ clip: 'Dmg_punch_04', volume: 1.7 }]],
      lightning: [[{ clip: 'Hit_elect_01', volume: 2 }]],
      roar: [[{ clip: 'Hit_elect_03', volume: 2 }]],
      breath: [[{ clip: 'Hit_gun_04', volume: 1.8 }]],
    },
    casts: {
      lightning: [{ clip: 'Attack-Casting-24', volume: 1.2 }, { clip: 'FX-Spark-01', volume: 1.1, at: 0.09 }, { clip: 'Neraxis-Vox_Casting1', volume: 2.2, at: 0.1, own: true }, { clip: 'Attack-Magic-62', volume: 1.2, at: 1.47 }, { clip: 'Attack-Magic-50', volume: 1.2, at: 1.47 }, { clip: 'FX-Spark-07', volume: 1.2, at: 1.76 }, { clip: 'Neraxis-Vox_Skill1', volume: 2.2, at: 1.96, own: true }, { clip: 'FX-Spark-09', volume: 1.2, at: 2.77 }],
      roar: [{ clip: 'Attack-Casting-24', volume: 1.2 }, { clip: 'FX-Spark-01', volume: 1.1 }, { clip: 'Attack-Magic-16', volume: 1.2, at: 0.09 }, { clip: 'Neraxis-Vox_Attack3', volume: 2.2, at: 0.3, own: true }, { clip: 'Attack-Magic-20', volume: 1.2, at: 0.56 }, { clip: 'Neraxis-Vox_Skill2', volume: 2.2, at: 1.28, own: true }, { clip: 'Attack-Magic-18', volume: 1.3, at: 1.4 }, { clip: 'FX-Spark-04', volume: 1.2, at: 1.92 }, { clip: 'Attack-Magic-09', volume: 1.6, at: 2 }],
      breath: [{ clip: 'Attack-Casting-24', volume: 1.2 }, { clip: 'Attack-Magic-18', volume: 1.2, at: 0.44 }, { clip: 'FX-Spark-01', volume: 1.1, at: 0.52 }, { clip: 'Attack-Jump-01', volume: 1.6, at: 1.02 }, { clip: 'Neraxis-Vox_Skill3', volume: 2.2, at: 1.02, own: true }, { clip: 'Attack-Casting-37', volume: 1.3, at: 1.35 }, { clip: 'Attack-Magic-25', volume: 1.5, at: 2.58 }],
    },
    victory: [{ clip: 'Attack-Body-02', volume: 1.2, at: 0.39 }, { clip: 'Attack-Woosh-02', volume: 1.3, at: 0.68 }, { clip: 'Neraxis-Vox_Victory', volume: 1.8, at: 0.74, own: true }, { clip: 'Attack-Woosh-13', volume: 1.3, at: 1.37 }, { clip: 'Attack-Woosh-02', volume: 1.3, at: 2.55 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Neraxis.Attack1.Casting1', 'Skill.Hero.Neraxis.Attack1.Casting2', 'Skill.Hero.Neraxis.Attack1.Casting3'], land: ['Skill.Hero.Neraxis.Attack1.Hit'] },
    lightning: { start: ['Skill.Hero.Neraxis.Skill1.Casting'], land: ['Skill.Hero.Neraxis.Skill1.Hit'] },
    roar: { start: ['Skill.Hero.Neraxis.Skill2.Casting'] },
    breath: { start: ['Skill.Hero.Neraxis.Skill3.Casting'] },
  },
  skins: [
    {
      name: 'Neraxis',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Neraxis.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Neraxis.webp',
      // His artwork (the King's Raid Index's): his head and horns in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Neraxis.png', from: 'https://raw.githubusercontent.com/IcyDipity/KingsRaidIndex/master/images/heroes/Neraxis/Neraxis.png', crop: { x: 480, y: 220, size: 175 }, head: { x: 510, y: 265, size: 110 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Neraxis_Vari05_Body', 'Hero_Neraxis_Hair_01'],
        left: 'Hero_Neraxis_Vari05_Weapon',
        offHand: 'held',
        grips: GRIPS,
      },
    },
  ],
};
