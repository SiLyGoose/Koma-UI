import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Miruru, the Pirate Captain (Hero_Miruru_…): her body, hair and her weapon on her own skeleton, as King's Raid's own model has them. She is
 * moved by King's Raid's own animations of her (ANIMATIONS: ../../heroes/body/kr.ts).
 */

const DRIVE = 'https://drive.google.com/uc?export=download&id=';

/**
 * King's Raid's own animations for its Legend look (its skins of that look are moved by them: ../../heroes/body/kr.ts): as
 * ANIMATIONS, but the look's own clips (KR-extracted/scripts/tm-anims.mjs --look=Legend).
 */
const LEGEND_ANIMATIONS = {
  idle: 'Legend/Idle',
  run: 'Legend/Run',
  hurt: 'Legend/Damage',
  victory: 'Legend/Victory',
  lose: 'Legend/Lose',
  dead: 'Legend/Dead',
  attack: [{ clips: ['Legend/Attack1'], hits: [0.9] }],
  skills: {
    baam: { clips: ['Legend/Skill1'], hits: [1.6] },
    pirates: { clips: ['Legend/Skill2'], hits: [1.6, 1.9, 2.2, 2.5, 2.8] },
    roll: { clips: ['Legend/Attack1'], hits: [1.2] },
  },
} as const satisfies KrAnimations;

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
  attack: [{ clips: ['Attack1'], hits: [0.9] }],
  skills: {
    baam: { clips: ['Skill1'], hits: [1.6] },
    roll: { clips: ['Attack3'], hits: [1.2] },
    pirates: { clips: ['Skill2'], hits: [1.6, 1.9, 2.2, 2.5, 2.8] },
  },
} as const satisfies KrAnimations;

export const MIRURU_ASSETS: HeroAssets = {
  name: 'Miruru',
  folder: 'heroes/miruru',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/12/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded.
  unique: { Hero_Miruru_Vari05_Weapon: 'Hero_Miruru_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Miruru.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_common_01', volume: 1.5 }]],
    },
    casts: {
      baam: [{ clip: 'FX-Machine-01', volume: 2.3, at: 0.27 }, { clip: 'Attack-Casting-11', volume: 3.1, at: 0.3 }, { clip: 'Miruru-Vox_Skill1_b', volume: 2, at: 0.33, own: true }, { clip: 'Attack-Shot-06', volume: 3.2, at: 2 }, { clip: 'Attack-Shot-03', volume: 3.2, at: 2 }, { clip: 'Attack-Shot-16', volume: 2.9, at: 2 }],
      roll: [{ clip: 'Miruru-Vox_Skill2_b', volume: 2, own: true }, { clip: 'FX-Machine-01', volume: 3.3, at: 0.24 }, { clip: 'Attack-Shot-05', volume: 3.2, at: 1.02 }, { clip: 'Attack-Shot-16', volume: 2.9, at: 1.02 }, { clip: 'Attack-Shot-04', volume: 3.2, at: 1.07 }],
      pirates: [{ clip: 'Miruru-Vox_Skill3_b', volume: 2, own: true }, { clip: 'FX-Machine-01', volume: 0.3, at: 0.55 }, { clip: 'Attack-Body-01', volume: 0.8, at: 1.02 }, { clip: 'Attack-Body-01', volume: 0.8, at: 2.03 }],
    },
    victory: [{ clip: 'Miruru-Vox_Attack3', volume: 1.6, at: 0.28, own: true }, { clip: 'Attack-Jump-01', at: 0.71 }, { clip: 'FX-Machine-01', at: 0.82 }, { clip: 'Miruru-Vox_Victory_b', volume: 1.6, at: 0.86, own: true }, { clip: 'Attack-Shot-05', at: 1.91 }, { clip: 'Attack-Jump-01', at: 2.71 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { land: ['Skill.Hero.Miruru.Re.Attack1.Shot'] },
    baam: { start: ['Skill.Hero.Miruru.Re.Skill1.Casting'], land: ['Skill.Hero.Miruru.Re.Skill1.Hit', 'Skill.Hero.Miruru.Re.Skill1.Shot'] },
    roll: { land: ['Skill.Hero.Miruru.Attack3.Shot'] },
    pirates: { start: ['Skill.Hero.Miruru.Skill2.Casting', 'Skill.Hero.Miruru.Skill2.Circle'], land: ['Skill.Hero.Miruru.Re.Skill2.Hit', 'Skill.Hero.Miruru.Re.Skill2.Shot', 'Skill.Hero.Miruru.Skill2.Hit.Cannonball'] },
  },
  skins: [
    {
      name: 'Miruru',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Miruru.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Miruru.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Miruru.webp',
      // Her artwork (the Drive folder's): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Miruru.png', from: `${DRIVE}1zfZ0C8Tt_2SXtRWJk22q23JiMH1zaYYi`, crop: { x: 300, y: 60, size: 300 }, head: { x: 416, y: 200, size: 130 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Miruru_Vari05_Body', 'Hero_Miruru_Vari05_Hair', 'Hero_Miruru_Vari05_Weapon'],
      },
    },
    // King's Raid's School costume (tm-costumes.mjs).
    {
      name: 'Miruru_School',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Miruru_School.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Miruru_School.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Miruru_School.webp',
      title: 'Grade School Miruru',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Miruru_Cos16SL_Body', 'Hero_Miruru_Cos16SL_Hair', 'Hero_Miruru_Cos16SL_Weapon'],
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Miruru_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Miruru_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Miruru_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Miruru_Summer.webp',
      title: 'Beachside Miruru',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Miruru_Cos17Summer_Body', 'Hero_Miruru_Cos17Summer_Hair', 'Hero_Miruru_Cos17Summer_Weapon'],
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Miruru_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Miruru_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Miruru_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Miruru_Christmas.webp',
      title: 'Santa Miruru',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Miruru_Cos17Christmas_Body', 'Hero_Miruru_Cos17Christmas_Hair', 'Hero_Miruru_Cos17Christmas_Weapon'],
      },
    },
    // King's Raid's NewYear costume (tm-costumes.mjs).
    {
      name: 'Miruru_NewYear',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Miruru_NewYear.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Miruru_NewYear.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Miruru_NewYear.webp',
      title: 'Viking Miruru',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Miruru_Cos19NewYear_Body', 'Hero_Miruru_Cos19NewYear_Hair', 'Hero_Miruru_Cos19NewYear_Weapon'],
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Miruru_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Miruru_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Miruru_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Miruru_Halloween.webp',
      title: 'Little Pumpkin Witch Miruru',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Miruru_Cos19Halloween_Body', 'Hero_Miruru_Cos19Halloween_Hair', 'Hero_Miruru_Cos19Halloween_Weapon'],
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Miruru_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Miruru_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Miruru_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Miruru_Wedding.webp',
      title: 'Heart Stealer Miruru',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Miruru_Cos20Wedding_Body', 'Hero_Miruru_Cos20Wedding_Hair', 'Hero_Miruru_Cos20Wedding_Weapon'],
      },
    },
    // King's Raid's Legend costume (its models made from the game's bundles: KR-extracted/scripts/kr-models.py).
    {
      name: 'Miruru_Legend',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Miruru_Legend.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Miruru_Legend.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Miruru_Legend.webp',
      title: 'Return of the Legendary Pirate Miruru',
      model: {
        kind: 'parts',
        animations: LEGEND_ANIMATIONS,
        // (No cannon: the game hides her weapon in all of this look's moves.)
        parts: ['Hero_Miruru_Cos22Legend_Body', 'Hero_Miruru_Cos22Legend_Hair'],
      },
    },
  ],
};
