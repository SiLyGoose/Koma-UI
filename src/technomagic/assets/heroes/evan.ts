import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Evan, the Alchemist of the Forest of Knowledge (Hero_Evan_…): his body and his weapon on his own skeleton, as King's Raid's own model has them. He is
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
  attack: [{ clips: ['Attack1-2'], hits: [1.1] }],
  skills: {
    purify: { clips: ['Skill1'], hits: [2.3] },
    circle: { clips: ['Skill2'], hits: [2.8] },
    origin: { clips: ['Skill3'], hits: [1.9] },
    uproar: { clips: ['Skill1-2'], hits: [2] },
    gluttony: { clips: ['Skill2-2'], hits: [1.9] },
    rampage: { clips: ['Skill3-2'], hits: [2.5, 3, 3.4, 3.9, 4.2, 4.7, 5.6] },
  },
} as const satisfies KrAnimations;

export const EVAN_ASSETS: HeroAssets = {
  name: 'Evan',
  folder: 'heroes/evan',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/87/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded.
  unique: { Hero_Evan_Vari05_Weapon: 'Hero_Evan_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Evan.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_magic_02', volume: 1.5, at: 0.01 }]],
      purify: [[{ clip: 'Dmg_bell_02', volume: 2, at: 0.01 }]],
      circle: [[{ clip: 'DMG-Poison-01', volume: 2, at: 0.01 }]],
      origin: [[{ clip: 'DMG-Poison-02', volume: 2, at: 0.01 }]],
      uproar: [[{ clip: 'Dmg_bell_02', volume: 2, at: 0.01 }]],
      gluttony: [[{ clip: 'DMG-Poison-01', volume: 2, at: 0.01 }]],
      rampage: [[{ clip: 'DMG-Poison-02', volume: 2, at: 0.01 }]],
    },
    casts: {
      purify: [{ clip: 'Evan-Vox_Casting2', volume: 3, at: 0.645, own: true }, { clip: 'Poison-cast-02', volume: 2.8, at: 0.645 }, { clip: 'Posion-wind-01', volume: 2.8, at: 2.286 }, { clip: 'Evan-Vox_Attack1', volume: 3, at: 2.316, own: true }],
      circle: [{ clip: 'Evan-Vox_Skill1_a', volume: 3, at: 0.442, own: true }, { clip: 'Poison-cast-04', volume: 2.8, at: 0.442 }, { clip: 'Poison-shot-03', volume: 2.8, at: 2.64 }, { clip: 'Fire-exp-01', volume: 2.8, at: 2.64 }],
      origin: [{ clip: 'Evan-Vox_Skill7_a', volume: 3, at: 0.248, own: true }, { clip: 'Poison-cast-02', volume: 2.8, at: 0.248 }, { clip: 'Poison-shot-02', volume: 2.8, at: 0.833 }, { clip: 'Buff-spell-01', volume: 2.8, at: 1.834 }, { clip: 'Buff-heal-01', volume: 2.3, at: 2.166 }],
      uproar: [{ clip: 'Evan-Vox_Skill3_b', volume: 3, at: 0.343, own: true }, { clip: 'Poison-cast-03', volume: 2.8, at: 0.343 }, { clip: 'Poison-shot-02', volume: 2.8, at: 1.939 }],
      gluttony: [{ clip: 'Evan-Vox_Skill6_b', volume: 3, at: 0.154, own: true }, { clip: 'Dark-fx-01', volume: 2.8, at: 0.154 }, { clip: 'Shield-fx-01', volume: 2.8, at: 1.821 }, { clip: 'Fire-exp-01', volume: 2.8, at: 1.821 }, { clip: 'Shield-fx-02', volume: 2.8, at: 3.279 }],
      rampage: [{ clip: 'Evan-Vox_Skill4_a', volume: 3, at: 0.041, own: true }, { clip: 'Shield-fx-01', volume: 2.8, at: 0.363 }, { clip: 'Poison-shot-02', volume: 2.8, at: 1.503 }, { clip: 'DMG-Poison-02~EFFECT3_Common', volume: 2.5, at: 2.191 }, { clip: 'DMG-Poison-02~EFFECT3_Common', volume: 2.5, at: 2.557 }, { clip: 'DMG-Poison-02~EFFECT3_Common', volume: 2.5, at: 2.935 }, { clip: 'DMG-Poison-02~EFFECT3_Common', volume: 2.5, at: 3.367 }, { clip: 'DMG-Poison-02~EFFECT3_Common', volume: 2.5, at: 3.617 }, { clip: 'Poison-shot-01', volume: 2.8, at: 4.186 }, { clip: 'Dark-fx-01', volume: 2.8, at: 4.186 }, { clip: 'Poison-exp-01', volume: 2.8, at: 5.1 }],
    },
    victory: [{ clip: 'Evan-Vox_Victory_a', volume: 2.8, at: 0.329, own: true }, { clip: 'Evan_Victory-01', volume: 2.7, at: 0.39 }, { clip: 'Evan_Victory-02', volume: 2.7, at: 1.52 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Evan.Attack1-2.Casting'], land: ['Skill.Hero.Evan.Attack1-2.Projectile'] },
    purify: { start: ['Skill.Hero.Evan.Skill1-1.Buff', 'Skill.Hero.Evan.Skill1-1.BuffEnd', 'Skill.Hero.Evan.Skill1-1.Casting'] },
    circle: { start: ['Skill.Hero.Evan.Skill2-1.Loop', 'Skill.Hero.Evan.Skill2-1.Casting', 'Skill.Hero.Evan.Skill2-1.Buff'] },
    origin: { start: ['Skill.Hero.Evan.Skill3-1.Casting', 'Skill.Hero.Evan.Skill3-1.Buff'] },
    uproar: { start: ['Skill.Hero.Evan.Skill1-2.Casting', 'Skill.Hero.Evan.Skill1-2.Debuff'] },
    gluttony: { start: ['Skill.Hero.Evan.Skill2-2.Casting', 'Skill.Hero.Evan.Skill2-2.Loop'], land: ['Skill.Hero.Evan.Skill2-2.Hit'] },
    rampage: { start: ['Skill.Hero.Evan.Skill3-2.Casting'], land: ['Skill.Hero.Evan.Skill3-2.Hit'] },
  },
  skins: [
    {
      name: 'Evan',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Evan.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Evan.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Evan.webp',
      // His artwork (the Drive folder's): his head in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Evan.png', from: `${DRIVE}1uOyLYC7d4wFKsAR0Yp-H5F6cNUoGvE3_`, crop: { x: 405, y: 140, size: 150 }, head: { x: 440, y: 172, size: 85 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Evan_Vari05_body', 'Hero_Evan_Hair01'],
        // (Held in his right hand, where King's Raid hangs it: Point_Hand_R.)
        right: 'Hero_Evan_Vari05_Weapon',
      },
    },
  ],
};
