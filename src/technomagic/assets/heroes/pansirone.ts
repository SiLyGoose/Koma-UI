import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Pansirone, the Mechanic of the Dragon’s Flame (Hero_Pancironne_…): her body and hair, and her weapon in her right hand, as King's Raid's own model has them. She is
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
  attack: [{ clips: ['Attack1'], hits: [0.6, 0.8, 1, 1.2, 1.4] }],
  skills: {
    present: { clips: ['Skill1'], hits: [1.7] },
    thrill: { clips: ['Skill2-1', 'Skill2-2', 'Skill2-3'], hits: [1.6, 1.7, 1.8, 1.9, 2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8] },
    dare: { clips: ['Skill3'], hits: [1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3, 3.2, 3.4] },
    die: { clips: ['Skill4-1'], hits: [2.3, 2.6, 2.9, 3.2, 3.5, 3.8, 4.1] },
  },
} as const satisfies KrAnimations;

export const PANSIRONE_ASSETS: HeroAssets = {
  name: 'Pansirone',
  folder: 'heroes/pansirone',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/83/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded.
  unique: { Hero_Pancironne_Vari05_Weapon: 'Hero_Pancironne_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Pancironne.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_gun_03', volume: 1.5, at: 0.01 }]],
      present: [[{ clip: 'Hit_gun_01', volume: 1.5, at: 0.01 }]],
      thrill: [[{ clip: 'Hit_gun_02', volume: 1.5, at: 0.005 }]],
      dare: [[{ clip: 'Hit_elect_02', volume: 1.5, at: 0.005 }]],
      die: [[{ clip: 'Hit_gun_01', volume: 1.5, at: 0.01 }]],
    },
    casts: {
      present: [{ clip: 'Pansirone-Vox_Skill4', volume: 2.3, at: 0.044, own: true }, { clip: 'Reload-01', volume: 1.8, at: 0.097 }, { clip: 'Magic-10', volume: 2, at: 0.097 }, { clip: 'Attack-Casting-04', volume: 2, at: 0.601 }, { clip: 'Laser-Shot-02', volume: 2, at: 1.661 }, { clip: 'Star-fx-02', volume: 2, at: 1.661 }, { clip: 'Exp-Fire-01', volume: 2, at: 2.628 }],
      thrill: [{ clip: 'Pansirone-Vox_Skill2', volume: 2.3, at: 0.036, own: true }, { clip: 'Reload-01', volume: 2, at: 0.129 }, { clip: 'Magic-10', volume: 2, at: 0.129 }, { clip: 'Star-fx-02', volume: 2, at: 0.129 }, { clip: 'Buff-Shot-01', volume: 2, at: 0.129 }, { clip: 'Reload-03', volume: 2, at: 0.742 }, { clip: 'Fire-Swish-01', volume: 2, at: 0.96 }, { clip: 'Magic-Wind-01', volume: 2, at: 1.703 }, { clip: 'Laser-Shot-04', volume: 1.8, at: 1.703 }, { clip: 'Fire-Swish-02', volume: 2, at: 2.458 }],
      dare: [{ clip: 'Pansirone-Vox_Skill1', volume: 2.3, at: 0.112, own: true }, { clip: 'Reload-03', volume: 2, at: 0.218 }, { clip: 'Magic-Heal-01', volume: 2, at: 0.218 }, { clip: 'Skill-Load-03', volume: 2, at: 0.58 }, { clip: 'Reload-01', volume: 2, at: 0.699 }, { clip: 'Ground-Hit-02', volume: 2, at: 0.899 }, { clip: 'Magic-Heal-02', volume: 2, at: 1.361 }, { clip: 'Exp-Fire-01', volume: 2, at: 1.361 }, { clip: 'Laser-Shot-01', volume: 2, at: 1.361 }],
      die: [{ clip: 'Magic-10', volume: 2, at: 0.157 }, { clip: 'Reload-01', volume: 2, at: 0.157 }, { clip: 'Pansirone-Vox_Attack1', volume: 2.3, at: 0.497, own: true }, { clip: 'Reload-03', volume: 2, at: 0.797 }, { clip: 'Pansirone-Vox_Skill6', volume: 2.3, at: 1.395, own: true }, { clip: 'Flap-03', volume: 2, at: 1.827 }, { clip: 'Laser-Shot-03', volume: 2, at: 2.397 }, { clip: 'Fire-Swish-01', volume: 2, at: 2.712 }],
    },
    victory: [{ clip: 'Pansirone-Vox_Victory', volume: 2.3, at: 0.233, own: true }, { clip: 'Attack-Body-02', volume: 1.5, at: 0.233 }, { clip: 'Kiss-01', volume: 2, at: 1.267 }, { clip: 'Star-fx-01', volume: 1.8, at: 1.627 }, { clip: 'Flap-03', volume: 1.5, at: 1.627 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Pancironne.Attack1.Casting'], land: ['Skill.Hero.Pancironne.Attack1.Hit'] },
    present: { start: ['Skill.Hero.Pancironne.Skill1.Casting'], land: ['Skill.Hero.Pancironne.Skill1.Hit', 'Skill.Hero.Pancironne.Skill1.Projectile'] },
    thrill: { start: ['Skill.Hero.Pancironne.Skill2.Casting1', 'Skill.Hero.Pancironne.Skill2.Casting2'], land: ['Skill.Hero.Pancironne.Skill2.HitLoop'] },
    dare: { start: ['Skill.Hero.Pancironne.Skill3.Casting'], land: ['Skill.Hero.Pancironne.Skill3.Hit'] },
    die: { start: ['Skill.Hero.Pancironne.Skill4.Debuff2', 'Skill.Hero.Pancironne.Skill4.Debuff1', 'Skill.Hero.Pancironne.Skill4-1.Casting', 'Skill.Hero.Pancironne.Skill4-1.End', 'Skill.Hero.Pancironne.Skill4.Buff', 'Skill.Hero.Pancironne.Skill4-1.Loop'] },
  },
  skins: [
    {
      name: 'Pansirone',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Pansirone.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Pansirone.webp',
      // Her artwork (the Drive folder's): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Pansirone.png', from: `${DRIVE}1QmODcik0Fjj3TCSq-e79gdszYYNWiAJ2`, crop: { x: 290, y: 10, size: 170 }, head: { x: 360, y: 52, size: 85 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Pancironne_Vari05_Body', 'Hero_Pancironne_Vari05_Hair'],
        right: 'Hero_Pancironne_Vari05_Weapon',
      },
    },
  ],
};
