import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Shea, the Wandering Songstress (Hero_Shea_…): her body and hair, and her weapon in her right hand, as King's Raid's own model has them. She is
 * moved by King's Raid's own animations of her (ANIMATIONS: ../../heroes/body/kr.ts).
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
  attack: [{ clips: ['Attack1'], hits: [0.4] }],
  skills: {
    melody: { clips: ['Skill1-1', 'Skill1-2', 'Skill1-2', 'Skill1-2', 'Skill1-3'], hits: [1.4, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 7.7, 8.1, 9.1] },
    song: { clips: ['Skill2-1', 'Skill2-2', 'Skill2-2', 'Skill2-2', 'Skill2-3'], hits: [1.4, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 9.8] },
    passion: { clips: ['Skill3-1', 'Skill3-2', 'Skill3-2', 'Skill3-3'], hits: [1.4, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 9.7] },
  },
} as const satisfies KrAnimations;

export const SHEA_ASSETS: HeroAssets = {
  name: 'Shea',
  folder: 'heroes/shea',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/63/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded.
  unique: { Hero_Shea_Vari05_Weapon: 'Hero_Shea_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Shea.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_Dmg-sfx-01', volume: 1.5 }]],
    },
    casts: {
      melody: [{ clip: 'Attack-Casting-07', volume: 1.2 }, { clip: 'Shea-Vox_Skill1', volume: 2.3, own: true }, { clip: 'FX-Shea-02', volume: 1.5, at: 0.07 }, { clip: 'Attack-Casting-33', volume: 1.2, at: 1.22 }, { clip: 'Attack-Casting-40', volume: 0.9, at: 1.22 }],
      song: [{ clip: 'Attack-Casting-07', volume: 1.2 }, { clip: 'Shea-Vox_Skill2', volume: 2.3, own: true }, { clip: 'Attack-Casting-05', volume: 1.1, at: 1.53 }, { clip: 'Attack-Casting-55', volume: 0.9, at: 1.54 }],
      passion: [{ clip: 'Attack-Casting-07', volume: 1.2 }, { clip: 'Attack-Casting-12' }, { clip: 'Shea-Vox_Skill3', volume: 2.3, own: true }],
    },
    victory: [{ clip: 'Shea-Vox_Victory', volume: 2, at: 0.06, own: true }, { clip: 'FX-Shea-07', volume: 1.6, at: 0.48 }, { clip: 'Attack-Body-02', volume: 1.2, at: 0.48 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Shea.Attack1.Casting'], land: ['Skill.Hero.Shea.Attack1.Projectile', 'Skill.Hero.Shea.Attack1.Hit'] },
    melody: { start: ['Skill.Hero.Shea.Skill1.Wave', 'Skill.Hero.Shea.Skill1.Casting', 'Skill.Hero.Shea.Skill1.Loop'], land: ['Skill.Hero.Shea.Skill1.HitLoop'] },
    song: { start: ['Skill.Hero.Shea.Skill2.Loop', 'Skill.Hero.Shea.Skill2.Casting', 'Skill.Hero.Shea.Skill2.Wave'], land: ['Skill.Hero.Shea.Skill2.HitLoop'] },
    passion: { start: ['Skill.Hero.Shea.Skill3.Casting', 'Skill.Hero.Shea.Skill3.Wave', 'Skill.Hero.Shea.Skill3.Loop'], land: ['Skill.Hero.Shea.Skill3.HitLoop'] },
  },
  skins: [
    {
      name: 'Shea',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Shea.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Shea.webp',
      // Her artwork (the Drive folder's): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Shea.png', from: `${DRIVE}1cWwVLe5S4J1X74SO8cnNEyeEL5vj6AS3`, crop: { x: 565, y: 40, size: 200 }, head: { x: 597, y: 105, size: 110 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Shea_Vari05_Body', 'Hero_Shea_Vari05_Hair'],
        right: 'Hero_Shea_Vari05_Weapon',
      },
    },
  ],
};
