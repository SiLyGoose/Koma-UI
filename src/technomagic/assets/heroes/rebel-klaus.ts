import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Rebel Klaus, the Shieldless Knight (the game's Rebel Clause: its files name him Hero_Clause_Traitor_…): his body (his
 * face and cape in it), his hair, and Galicta in his right hand, laid out as Klaus's sword is (the blade along what was
 * its y). No shield. He is moved by King's Raid's own animations of him (ANIMATIONS: ../../heroes/body/kr.ts).
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
  attack: [{ clips: ['Attack1-1', 'Attack1-2', 'Attack1-3'], hits: [0.4, 0.6] }],
  skills: {
    determined: { clips: ['Skill1'], hits: [2.5] },
    indomitable: { clips: ['Skill2'], hits: [2.4] },
    perish: { clips: ['Skill3-2-1', 'Skill3-2-2', 'Skill3-2-2', 'Skill3-2-2', 'Skill3-2-2', 'Skill3-2-2', 'Skill3-2-2', 'Skill3-2-2', 'Skill3-2-2', 'Skill3-2-2', 'Skill3-2-2', 'Skill3-2-2', 'Skill3-2-2', 'Skill3-2-2', 'Skill3-2-2', 'Skill3-2-2', 'Skill3-2-3', 'Skill3-1'], hits: [2.5, 2.8, 3.1, 3.7, 4, 4.3, 6.3] },
  },
} as const satisfies KrAnimations;

export const REBEL_KLAUS_ASSETS: HeroAssets = {
  name: 'Rebel Klaus',
  folder: 'heroes/rebel-klaus',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/93/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded: Galicta, the Adversary of the Goddess.
  unique: { Hero_Clause_Traitor_Vari05_Weapon: 'Hero_Clause_Traitor_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.ClauseTraitor.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      rend: [[{ clip: 'Dmg-swd-01', volume: 1.5, at: 0.03 }], [{ clip: 'Dmg-swd-02', volume: 1.5, at: 0.03 }], [{ clip: 'Dmg-swd-03', volume: 1.5, at: 0.03 }]],
      determined: [[{ clip: 'Dmg-swd-01', volume: 2, at: 0.01 }]],
      indomitable: [[{ clip: 'Dmg-swd-02', volume: 2, at: 0.01 }]],
      perish: [[{ clip: 'Damage_01', volume: 2, at: 0.03 }]],
    },
    casts: {
      determined: [{ clip: 'Clause_ice-Vox_Skill1', volume: 3, at: 0.139, own: true }, { clip: 'Magic-07', volume: 2.7, at: 0.542 }, { clip: 'Whoosh-fx-04', volume: 2.7, at: 0.542 }, { clip: 'sword-swish-01', volume: 2.7, at: 1.578 }, { clip: 'Impact-02', volume: 2.7, at: 2.406 }],
      indomitable: [{ clip: 'Clause_ice-Vox_Skill2_b', volume: 3, at: 0.016, own: true }, { clip: 'Cast-13', volume: 2.7, at: 0.586 }, { clip: 'Cast-07', volume: 2.7, at: 0.586 }, { clip: 'Rock_cast_01', volume: 2.7, at: 0.818 }, { clip: 'Swd-05', volume: 2.7, at: 1.92 }, { clip: 'Exp_02', volume: 2.7, at: 1.986 }],
      perish: [{ clip: 'Clause_ice-Vox_Skill7', volume: 3, at: 0.033, own: true }, { clip: 'Skill-Sword-02', volume: 2.7, at: 0.23 }, { clip: 'Skill-Sword-03', volume: 2.7, at: 1.593 }, { clip: 'Swd-fx-01', volume: 2.7, at: 1.981 }, { clip: 'Swd-05', volume: 2.7, at: 2.516 }, { clip: 'Skill-Sword-04', volume: 2.7, at: 2.648 }, { clip: 'Exp_04', volume: 2.7, at: 5.799 }, { clip: 'Swd_impact_01', volume: 2.7, at: 6.161 }],
    },
    victory: [{ clip: 'Clause_ice-Vox_Victory', volume: 2.8, at: 0.433, own: true }, { clip: 'Texture-04', volume: 2.7, at: 0.733 }, { clip: 'Texture-10', volume: 2.7, at: 1.7 }, { clip: 'Texture-01', volume: 2.7, at: 1.7 }, { clip: 'Swd-stab-01', volume: 2.3, at: 2.5 }, { clip: 'Idle-cloth-03', volume: 2.3, at: 3.567 }, { clip: 'Texture-07', volume: 2.3, at: 3.567 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    rend: { start: ['Skill.Hero.ClauseTraitor.Attack1.1', 'Skill.Hero.ClauseTraitor.Attack1.3', 'Skill.Hero.ClauseTraitor.Attack1.2'] },
    determined: { start: ['Skill.Hero.ClauseTraitor.Skill1.Casting'] },
    indomitable: { start: ['Skill.Hero.ClauseTraitor.Skill2.Casting', 'Skill.Hero.ClauseTraitor.Skill2.Buff'], land: ['Skill.Hero.ClauseTraitor.Skill2.Hit'] },
    perish: { start: ['Skill.Hero.ClauseTraitor.Skill3.4', 'Skill.Hero.ClauseTraitor.Skill3.2', 'Skill.Hero.ClauseTraitor.Skill3.2.3', 'Skill.Hero.ClauseTraitor.Skill3.3', 'Skill.Hero.ClauseTraitor.Skill3.1', 'Skill.Hero.ClauseTraitor.Skill3.2.1', 'Skill.Hero.ClauseTraitor.Skill3.2.2'], land: ['Skill.Hero.ClauseTraitor.Skill3.Hit2', 'Skill.Hero.ClauseTraitor.Skill3.Hit1', 'Skill.Hero.ClauseTraitor.Skill3.Hit2_test'] },
  },
  skins: [
    {
      name: 'Rebel Klaus',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Rebel_Klaus.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Rebel_Klaus.webp',
      // His artwork, Galicta planted before him, its light swirling round him: his head and hair in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Rebel_Klaus.png', from: 'https://i.redd.it/hm3zimp0tuc81.png', crop: { x: 395, y: 110, size: 110 }, head: { x: 425, y: 150, size: 70 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Clause_Traitor_Vari05_Body', 'Hero_Clause_Traitor_Hair_01'],
        right: 'Hero_Clause_Traitor_Vari05_Weapon',
        blade: 'y',
      },
    },
  ],
};
