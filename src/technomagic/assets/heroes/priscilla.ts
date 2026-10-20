import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Priscilla, the Sword Dancer (Hero_Priscilla_…): her body and hair, and her weapon in her left hand, as King's Raid's own model has them. She is
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
  attack: [{ clips: ['Attack1-1'], hits: [0.4] }, { clips: ['Attack1-2'], hits: [0.4, 0.8] }, { clips: ['Attack1-3', 'Attack1-4'], hits: [0.5, 1.3] }],
  skills: {
    vital: { clips: ['Skill1'], hits: [1.7] },
    coordination: { clips: ['Skill2'], hits: [0.9, 1] },
    turbulent: { clips: ['Skill3'], hits: [2.1] },
  },
} as const satisfies KrAnimations;

export const PRISCILLA_ASSETS: HeroAssets = {
  name: 'Priscilla',
  folder: 'heroes/priscilla',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/43/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded.
  unique: { Hero_Priscilla_Vari05_Weapon: 'Hero_Priscilla_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Priscilla.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_common_01', volume: 1.5 }]],
      vital: [[{ clip: 'Hit_common_02', volume: 2 }]],
      turbulent: [[{ clip: 'Hit_big_03', volume: 2 }]],
    },
    casts: {
      vital: [{ clip: 'Attack-Casting-07', volume: 1.4, at: 0.28 }, { clip: 'Attack-Casting-35', volume: 1.4, at: 0.28 }, { clip: 'Priscilla-Vox_Skill1_b', volume: 2.2, at: 0.54, own: true }, { clip: 'Attack-Woosh-15', volume: 1.7, at: 1.63 }, { clip: 'Attack-Cut-02', at: 1.63 }, { clip: 'Priscilla-Vox_Attack2', volume: 2.2, at: 1.75, own: true }],
      coordination: [{ clip: 'Attack-Casting-45', volume: 1.4, at: 0.14 }, { clip: 'Attack-Casting-48', volume: 1.4, at: 0.14 }, { clip: 'Priscilla-Vox_Skill2', volume: 2.2, at: 0.2, own: true }, { clip: 'Attack-Magic-03', volume: 1.6, at: 1.04 }, { clip: 'Attack-Magic-04', volume: 1.6, at: 1.04 }],
      turbulent: [{ clip: 'Attack-Casting-45', volume: 1.4 }, { clip: 'Attack-Casting-48', volume: 1.4 }, { clip: 'Priscilla-Vox_Attack2', volume: 2.2, at: 0.22, own: true }, { clip: 'Attack-Casting-45', volume: 1.4, at: 1.03 }, { clip: 'Attack-Jump-01', volume: 1.5, at: 1.27 }, { clip: 'Priscilla-Vox_Skill3_b', volume: 2.2, at: 1.52, own: true }, { clip: 'Attack-Casting-46', volume: 1.4, at: 1.595 }, { clip: 'Attack-Magic-20', volume: 1.8, at: 2.06 }],
    },
    victory: [{ clip: 'Attack-Woosh-09', volume: 1.2, at: 0.73 }, { clip: 'Attack-Woosh-09', volume: 1.2, at: 0.98 }, { clip: 'Priscilla-Vox_Victory', volume: 2.2, at: 1.2, own: true }, { clip: 'Attack-Woosh-09', volume: 1.2, at: 1.29 }, { clip: 'Attack-Woosh-09', volume: 1.2, at: 1.73 }, { clip: 'Attack-Body-01', volume: 1.5, at: 1.74 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Priscilla.Attack1.1', 'Skill.Hero.Priscilla.Attack1.2', 'Skill.Hero.Priscilla.Attack1.3', 'Skill.Hero.Priscilla.Attack1.4'], land: ['Hit.Normal.SlashBig'] },
    vital: { start: ['Skill.Hero.Priscilla.Skill1'] },
    coordination: { start: ['Skill.Hero.Priscilla.Skill2.CastingBuff', 'Skill.Hero.Priscilla.Skill2.Loop', 'Skill.Hero.Priscilla.Skill2.Casting'] },
    turbulent: { start: ['Skill.Hero.Priscilla.Skill3.Casting'], land: ['Skill.Hero.Priscilla.Skill3.Hit'] },
  },
  skins: [
    {
      name: 'Priscilla',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Priscilla.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Priscilla.webp',
      // Her artwork (the Drive folder's): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Priscilla.png', from: `${DRIVE}1KZauebZeINLzSfYH5UJmujWwvTXMYbNo`, crop: { x: 410, y: 65, size: 190 }, head: { x: 458, y: 112, size: 100 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Priscilla_Vari05_Body', 'Hero_Priscilla_Vari05'],
        // (In her left hand, where King's Raid's clips hang it: Point_hand_L.)
        left: 'Hero_Priscilla_Vari05_Weapon',
        offHand: 'held',
      },
    },
  ],
};
