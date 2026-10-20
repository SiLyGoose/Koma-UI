import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Theo, the Knight of Loyalty (Hero_Theo_…): his body, and his weapon in his right hand, as King's Raid's own model has them. He is
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
  victoryIdle: 'VictoryIdol',
  lose: 'Lose',
  dead: 'Dead',
  attack: [{ clips: ['Attack1-1'], hits: [0.3, 0.5, 1] }, { clips: ['Attack1-2'], hits: [0.6] }, { clips: ['Attack1-3'], hits: [0.4] }],
  skills: {
    crash: { clips: ['Skill1'], hits: [0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.6, 2.7, 2.8, 2.9, 3.1, 3.3, 3.5] },
    thunder: { clips: ['Skill2'], hits: [1.6] },
    explosion: { clips: ['Skill3'], hits: [1.9, 2, 2.1, 2.3, 2.4] },
  },
} as const satisfies KrAnimations;

export const THEO_ASSETS: HeroAssets = {
  name: 'Theo',
  folder: 'heroes/theo',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/39/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded.
  unique: { Hero_Theo_Vari05_Weapon: 'Hero_Theo_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Theo.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_sword_03', volume: 1.5 }]],
      crash: [[{ clip: 'Hit_sword_01', volume: 2 }]],
      thunder: [[{ clip: 'Hit_dmg_01', volume: 2 }]],
      explosion: [[{ clip: 'Hit_dmg_01', volume: 2 }]],
    },
    casts: {
      crash: [{ clip: 'Attack-Casting-04', volume: 1.4 }, { clip: 'Attack-Woosh-08', volume: 1.4, at: 0.05 }, { clip: 'Theo-Vox_Skill1', volume: 2.2, at: 0.2, own: true }, { clip: 'Attack-Stab-01', volume: 1.3, at: 0.25 }, { clip: 'Attack-Cut-07', volume: 1.3, at: 0.26 }, { clip: 'Attack-Woosh-08', volume: 1.4, at: 0.75 }, { clip: 'Attack-Woosh-10', volume: 1.4, at: 0.75 }, { clip: 'FX-Spark-02', volume: 1.3, at: 0.75 }, { clip: 'Attack-Woosh-09', volume: 1.4, at: 0.98 }, { clip: 'Attack-Woosh-10', volume: 1.4, at: 1.01 }, { clip: 'Attack-Woosh-10', volume: 1.4, at: 1.17 }, { clip: 'Attack-Woosh-10', volume: 1.4, at: 1.23 }, { clip: 'Attack-Woosh-09', volume: 1.4, at: 1.39 }, { clip: 'Attack-Woosh-10', volume: 1.4, at: 1.43 }, { clip: 'Attack-Woosh-10', volume: 1.4, at: 1.63 }, { clip: 'Attack-Woosh-10', volume: 1.4, at: 1.83 }, { clip: 'Attack-Woosh-09', volume: 1.4, at: 1.85 }, { clip: 'Attack-Woosh-10', volume: 1.4, at: 2.06 }, { clip: 'Attack-Woosh-10', volume: 1.4, at: 2.19 }, { clip: 'Attack-Jump-01', volume: 1.3, at: 2.4 }, { clip: 'Attack-Woosh-08', volume: 1.4, at: 2.43 }, { clip: 'Attack-Cut-07', volume: 1.3, at: 2.49 }, { clip: 'Theo-Vox_02', volume: 2.2, at: 2.58, own: true }, { clip: 'Attack-Woosh-08', volume: 1.4, at: 2.64 }, { clip: 'Attack-Landing-01', volume: 1.5, at: 2.99 }],
      thunder: [{ clip: 'Attack-Casting-03', volume: 1.4 }, { clip: 'FX-Spark-03', volume: 1.3, at: 0.06 }, { clip: 'Attack-Woosh-08', volume: 1.4, at: 0.09 }, { clip: 'Theo-Vox_01', volume: 2.2, at: 0.09, own: true }, { clip: 'Attack-Woosh-10', volume: 1.4, at: 0.32 }, { clip: 'Attack-Spin-08', volume: 1.6, at: 0.53 }, { clip: 'Attack-Woosh-14', volume: 1.4, at: 1.48 }, { clip: 'Theo-Vox_Skill2', volume: 2.2, at: 1.59, own: true }, { clip: 'Attack-Magic-24', volume: 1.2, at: 1.7 }],
      explosion: [{ clip: 'Attack-Casting-04', volume: 1.4 }, { clip: 'Attack-Woosh-08', volume: 1.4, at: 0.03 }, { clip: 'Attack-Woosh-10', volume: 1.4, at: 0.26 }, { clip: 'Theo-Vox_03', volume: 2.2, at: 0.29, own: true }, { clip: 'FX-Spark-03', volume: 1.3, at: 0.42 }, { clip: 'Attack-Jump-01', volume: 1.5, at: 0.43 }, { clip: 'Attack-Woosh-09', volume: 1.4, at: 0.51 }, { clip: 'Attack-Woosh-09', volume: 1.4, at: 0.62 }, { clip: 'Theo-Vox_Skill3-1', volume: 2.2, at: 0.96, own: true }, { clip: 'Attack-Woosh-08', volume: 1.4, at: 1.64 }, { clip: 'Theo-Vox_Skill3-2', volume: 2.2, at: 1.65, own: true }, { clip: 'Attack-Magic-22', volume: 1.4, at: 1.79 }, { clip: 'FX-Golem-03', volume: 1.6, at: 2 }],
    },
    victory: [{ clip: 'Theo-Vox_Victory', volume: 2.2, at: 0.2, own: true }, { clip: 'Attack-Jump-01', volume: 0.38, at: 0.38 }, { clip: 'Attack-Body-02', volume: 1.5, at: 0.44 }, { clip: 'Attack-Action-01', volume: 1.3, at: 1.98 }, { clip: 'Attack-Body-02', volume: 1.5, at: 2.08 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Theo.Attack1.Casting1'], land: ['Skill.Hero.Theo.Attack1.Hit'] },
    crash: { start: ['Skill.Hero.Theo.Skill1.Casting'] },
    thunder: { start: ['Skill.Hero.Theo.Skill2.Casting'], land: ['Skill.Hero.Theo.Skill2.HitLoop2', 'Skill.Hero.Theo.Skill2.Hit', 'Skill.Hero.Theo.Skill2.HitLoop', 'Skill.Hero.Theo.Skill2.Projectile'] },
    explosion: { start: ['Skill.Hero.Theo.Skill3.Casting'], land: ['Skill.Hero.Theo.Skill3.Hit'] },
  },
  skins: [
    {
      name: 'Theo',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Theo.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Theo.webp',
      // His artwork (the Drive folder's): his head in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Theo.png', from: `${DRIVE}1N3sVPE7w_7NWO-kD-uhOCFe4C0Qy6ikh`, crop: { x: 407, y: 225, size: 170 }, head: { x: 446, y: 275, size: 90 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Theo_Vari05_Body', 'Hero_Theo_Hair_01'],
        right: 'Hero_Theo_Vari05_Weapon',
      },
    },
  ],
};
