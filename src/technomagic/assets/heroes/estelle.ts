import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Estelle, the Adventure Guide (Hero_Estelle_…): her body, hair and her weapon on her own skeleton, as King's Raid's own model has them. She is
 * moved by King's Raid's own animations of her (ANIMATIONS: ../../heroes/body/kr.ts).
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
  attack: [{ clips: ['Attack1'], hits: [1.2] }, { clips: ['Attack1-2'], hits: [1.2] }],
  skills: {
    tailwind: { clips: ['Skill1-1', 'Skill1-2'], hits: [1.6, 4.3] },
    wakeup: { clips: ['Skill2'], hits: [0.4, 1.1] },
    cheer: { clips: ['Skill3'], hits: [2.5] },
    headwind: { clips: ['Skill1-2'], hits: [1.8] },
  },
} as const satisfies KrAnimations;

export const ESTELLE_ASSETS: HeroAssets = {
  name: 'Estelle',
  folder: 'heroes/estelle',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/99/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded.
  unique: { Hero_Estelle_Vari05_Weapon: 'Hero_Estelle_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Estelle.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Dmg_bell_01', volume: 1.5, at: 0.01 }]],
      tailwind: [[{ clip: 'Dmg_bell_02', volume: 2, at: 0.01 }]],
      wakeup: [[{ clip: 'Dmg_bell_03', volume: 2, at: 0.01 }]],
      cheer: [[{ clip: 'Dmg_bell_04', volume: 2, at: 0.01 }]],
      headwind: [[{ clip: 'Dmg_bell_02', volume: 2, at: 0.01 }]],
    },
    casts: {
      tailwind: [{ clip: 'Estelle-Vox_Skill6_a', volume: 2.9, at: 0.017, own: true }, { clip: 'Bell_cast_01', volume: 2.7, at: 0.381 }, { clip: 'Bell_shot_03', volume: 2.7, at: 1.17 }],
      wakeup: [{ clip: 'Estelle-Vox_Skill5_b', volume: 2.9, at: 0.016, own: true }, { clip: 'Bell_shot_05', volume: 2.7, at: 0.3 }, { clip: 'Bell_shot_06', volume: 2.7, at: 1.344 }],
      cheer: [{ clip: 'Estelle-Vox_Skill7_a', volume: 2.9, at: 0.016, own: true }, { clip: 'Buff-heal-02', volume: 2.7, at: 0.016 }, { clip: 'Bell_cast_02', volume: 2.7, at: 0.753 }, { clip: 'Bell_cast_03', volume: 2.7, at: 1.619 }, { clip: 'Bell_shot_07', volume: 2.7, at: 2.177 }, { clip: 'Bell_idle_01', volume: 2.7, at: 3.351 }],
      headwind: [{ clip: 'Estelle-Vox_Skill2_a', volume: 2.9, at: 0.748, own: true }, { clip: 'Bell_shot_04', volume: 2.7, at: 1.36 }],
    },
    victory: [{ clip: 'Idle-Cloth-09~EFFECT2_Common', volume: 2.5, at: 0.454 }, { clip: 'Idle-cloth-01~EFFECT3_Common', volume: 2.5, at: 0.663 }, { clip: 'Idle-fall-01', volume: 2.5, at: 0.705 }, { clip: 'Estelle-Vox_Victory_a', volume: 3, at: 0.908, own: true }, { clip: 'Idle-cloth-01', volume: 2.5, at: 1.868 }, { clip: 'Idle-cloth-07', volume: 2.5, at: 2.782 }, { clip: 'Idle-cloth-06', volume: 2.5, at: 3.266 }, { clip: 'Attack-Step-01', volume: 2.5, at: 4.439 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Estelle.Attack1.Casting1', 'Skill.Hero.Estelle.Attack1.Casting2'], land: ['Skill.Hero.Estelle.Attack1.Hit', 'Skill.Hero.Estelle.Attack1.Projectile'] },
    tailwind: { start: ['Skill.Hero.Estelle.Skill1-1.Casting', 'Skill.Hero.Estelle.Skill1-2.Casting'], land: ['Skill.Hero.Estelle.Skill1-1.Hit', 'Skill.Hero.Estelle.Skill1-2.Hit'] },
    wakeup: { start: ['Skill.Hero.Estelle.Skill2.Casting', 'Skill.Hero.Estelle.Skill2.Buff', 'Skill.Hero.Estelle.Skill2.Debuff'] },
    cheer: { start: ['Skill.Hero.Estelle.Skill3.Buff', 'Skill.Hero.Estelle.Skill3.Casting'] },
    headwind: { start: ['Skill.Hero.Estelle.Skill1-2.Casting'], land: ['Skill.Hero.Estelle.Skill1-2.Hit'] },
  },
  skins: [
    {
      name: 'Estelle',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Estelle.webp',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Estelle_Vari05_Body', 'Hero_Estelle_Vari05_Hair'],
        // (Held in her left hand, where King's Raid hangs it: Point_Hand_L.)
        left: 'Hero_Estelle_Vari05_Weapon',
        offHand: 'held',
      },
    },
  ],
};
