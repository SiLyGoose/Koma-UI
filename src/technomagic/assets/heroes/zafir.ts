import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Zafir, the King of the Desert (Hero_Zafir_…): his body, hair and his weapon on his own skeleton, as King's Raid's own model has them. He is
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
  attack: [{ clips: ['Attack1'], hits: [1.1] }],
  skills: {
    desert: { clips: ['Skill1'], hits: [1.5] },
    spirit: { clips: ['Skill2'], hits: [1.3] },
    sandstorm: { clips: ['Skill3'], hits: [1.9] },
  },
} as const satisfies KrAnimations;

export const ZAFIR_ASSETS: HeroAssets = {
  name: 'Zafir',
  folder: 'heroes/zafir',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/45/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded.
  unique: { Hero_Zafir_Vari05_Weapon: 'Hero_Zafir_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Zafir.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_gun_02', volume: 1.5 }], [{ clip: 'Hit_gun_03', volume: 1.5 }]],
      spirit: [[{ clip: 'Hit_fire_01', volume: 1.9 }]],
      sandstorm: [[{ clip: 'Hit_fire_03', volume: 1.9 }]],
    },
    casts: {
      desert: [{ clip: 'Zafir-Vox_Attack1', volume: 3.3, at: 0.05, own: true }, { clip: 'Attack-Casting-10', volume: 1.1, at: 0.08 }, { clip: 'Attack-Casting-11', volume: 1.1, at: 0.57 }, { clip: 'Zafir-Vox_Skill1', volume: 3.3, at: 0.75, own: true }, { clip: 'Attack-BowShot-03', volume: 1.4, at: 1.46 }, { clip: 'Attack-Magic-10', volume: 1.5, at: 1.52 }, { clip: 'Attack-Magic-22', volume: 1.4, at: 1.54 }],
      spirit: [{ clip: 'Attack-Casting-10', volume: 1.1 }, { clip: 'Zafir-Vox_Skill2', volume: 3.3, own: true }, { clip: 'Attack-Casting-11', volume: 1.1, at: 0.49 }, { clip: 'Attack-Magic-10', volume: 1.5, at: 1.44 }],
      sandstorm: [{ clip: 'Zafir-Vox_Skill3', volume: 3.3, own: true }, { clip: 'Attack-Casting-10', volume: 1.1, at: 0.06 }, { clip: 'Attack-Jump-01', volume: 1.3, at: 0.55 }, { clip: 'Attack-Casting-12', volume: 1.1, at: 0.8 }, { clip: 'Attack-BowPull-03', volume: 1.4, at: 1.44 }, { clip: 'Attack-Magic-10', volume: 1.1, at: 1.7 }, { clip: 'Attack-BowShot-03', volume: 1.4, at: 1.74 }, { clip: 'Attack-BowShot-01', volume: 1.4, at: 1.8 }],
    },
    victory: [{ clip: 'Zafir-Vox_Victory', volume: 3.3, at: 0.71, own: true }, { clip: 'Attack-BowPull-03', volume: 1.4, at: 1.79 }, { clip: 'Attack-BowShot-02', volume: 1.4, at: 2.15 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Zafir.Attack1.Casting'], land: ['Skill.Hero.Zafir.Attack1.Projectile', 'Skill.Hero.Zafir.Attack1.Hit'] },
    desert: { start: ['Skill.Hero.Zafir.Skill1.Casting'], land: ['Skill.Hero.Zafir.Skill1.Projectile', 'Skill.Hero.Zafir.Skill1.Hit', 'Hit.Physical.03'] },
    spirit: { start: ['Skill.Hero.Zafir.Skill2.Casting'], land: ['Skill.Hero.Zafir.Skill2.HitLoop', 'Skill.Hero.Zafir.Skill2.Hit'] },
    sandstorm: { start: ['Skill.Hero.Zafir.Skill3.Casting'], land: ['Skill.Hero.Zafir.Skill3.HitLoop', 'Skill.Hero.Zafir.Skill3.Projectile'] },
  },
  skins: [
    {
      name: 'Zafir',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Zafir.webp',
      // His artwork (the Drive folder's): his head in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Zafir.png', from: `${DRIVE}1bHx3Dx5NwDGPf1xsxLyi4NfyYXz8COYH`, crop: { x: 470, y: 180, size: 230 }, head: { x: 499, y: 218, size: 125 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Zafir_Vari05_Body', 'Hero_Zafir_Vari05_Hair'],
        // (Held in his left hand, where King's Raid hangs it: Point_Hand_L.)
        left: 'Hero_Zafir_Vari05_Weapon',
        offHand: 'held',
      },
    },
  ],
};
