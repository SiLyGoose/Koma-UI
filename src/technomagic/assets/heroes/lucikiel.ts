import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Lucikiel in his fourth look (Hero_Lucikiel_Vari04_…): his body (all of him in one), and the demon god's claws on his
 * hands (on his skeleton, as his body's file has them). His later look's files (Hero_ZLucikiel_Vari05_…) have their
 * colour pictures spoiled (one hue all over), and his unique weapon's claws are made for that look: he looks the same
 * with it. He is moved by King's Raid's own animations of him (ANIMATIONS: ../../heroes/body/kr.ts).
 */


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
  attack: [{ clips: ['Legend/Attack1-1'], hits: [0.3] }, { clips: ['Legend/Attack1-2'], hits: [0.4, 1.2] }, { clips: ['Legend/Attack1-3'], hits: [0.5] }],
  skills: {
    storm: { clips: ['Legend/Skill1'], hits: [0.4, 0.8, 2] },
    wave: { clips: ['Legend/Skill2'], hits: [0.5, 2.1] },
    doomsday: { clips: ['Legend/Skill3'], hits: [0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4] },
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
  attack: [{ clips: ['Attack1-1'], hits: [0.3] }, { clips: ['Attack1-2'], hits: [0.4, 1.2] }, { clips: ['Attack1-3'], hits: [0.5] }],
  skills: {
    storm: { clips: ['Skill1'], hits: [0.4, 0.8, 2] },
    wave: { clips: ['Skill2'], hits: [0.5, 2.1] },
    doomsday: { clips: ['Skill3'], hits: [0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4] },
  },
} as const satisfies KrAnimations;

export const LUCIKIEL_ASSETS: HeroAssets = {
  name: 'Lucikiel',
  folder: 'heroes/lucikiel',
  // (And Annihilation Surge's, past his passive's.)
  skills: { from: 'https://kingsraid.shodyra.com/static/images/97/', files: ['s1.png', 's2.png', 's3.png', 's4.png', 's21.png'] },
  // King's Raid's sounds (its Hit.Hero.Lucikiel.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Dmg_punch_01', volume: 1.7, at: 0.2 }], [{ clip: 'Dmg_punch_02', volume: 1.7, at: 0.2 }], [{ clip: 'Dmg_punch_03', volume: 1.7, at: 0.2 }], [{ clip: 'Dmg_punch_04', volume: 1.7, at: 0.2 }], [{ clip: 'Dmg_punch_04', volume: 1.7, at: 0.2 }], [{ clip: 'Dmg_punch_05', volume: 1.7, at: 0.2 }]],
      storm: [[{ clip: 'Dmg_punch_04', volume: 2.1, at: 0.15 }]],
      wave: [[{ clip: 'DMG-Poison-01', volume: 2.1, at: 0.15 }], [{ clip: 'DMG-Poison-01', volume: 2.1, at: 0.15 }]],
      doomsday: [[{ clip: 'Dmg_punch_01', volume: 2.1, at: 0.1 }]],
    },
    casts: {
      storm: [{ clip: 'Lusikiel-Vox_Skill6', volume: 2.9, at: 0.05, own: true }, { clip: 'Punch_03', volume: 2.7, at: 0.298 }, { clip: 'Punch_s_03', volume: 2.7, at: 0.613 }, { clip: 'Punch_s_04', volume: 2.7, at: 1.267 }, { clip: 'Skill-Impact-01', volume: 2.7, at: 1.951 }],
      wave: [{ clip: 'Lusikiel-Vox_Skill4', volume: 2.9, at: 0.016, own: true }, { clip: 'Impact-01', volume: 2.7, at: 0.265 }, { clip: 'Magic-glass-07', volume: 2.7, at: 1.415 }, { clip: 'Buff-heal-02', volume: 2.7, at: 2.149 }],
      doomsday: [{ clip: 'Buff-spell-02', volume: 2.3, at: 0.066 }, { clip: 'Lusikiel-Vox_Skill3_1', volume: 2.9, at: 0.137, own: true }, { clip: 'Exp_04', volume: 2.3, at: 0.483 }, { clip: 'Elect_01', volume: 2.7, at: 0.723 }, { clip: 'Exp_05', volume: 2.7, at: 2.319 }],
    },
    victory: [{ clip: 'Lusikiel-Vox_Sigh', volume: 3, at: 0.001, own: true }, { clip: 'Leather-01', volume: 2.5, at: 0.362 }, { clip: 'Leather-02', volume: 2.5, at: 1.467 }, { clip: 'Lusikiel-Vox_Jump', volume: 3, at: 1.554, own: true }, { clip: 'Texture-10', volume: 2.7, at: 1.624 }, { clip: 'Idle-fall-02', volume: 2.7, at: 2.333 }, { clip: 'Lusikiel-Vox_Landing', volume: 3, at: 2.366, own: true }, { clip: 'Idle-cloth-09', volume: 2.7, at: 3.37 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.ZLucikiel.Attack1.Casting1', 'Skill.Hero.ZLucikiel.Attack1.Casting2', 'Skill.Hero.ZLucikiel.Attack1.Casting3'] },
    storm: { start: ['Skill.Hero.ZLucikiel.Skill1.Casting'] },
    wave: { start: ['Skill.Hero.ZLucikiel.Skill2.Casting.1', 'Skill.Hero.ZLucikiel.Skill2.Casting.2'] },
    doomsday: { start: ['Skill.Hero.ZLucikiel.Skill3.Casting'] },
  },
  skins: [
    {
      name: 'Lucikiel',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lucikiel.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lucikiel.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lucikiel.webp',
      // His artwork (from the wiki, asked for as the PNG it was uploaded as): his head and horns in the crop (the meter's close-up is his face by itself).
      portrait: {
        file: 'Lucikiel.png',
        from: 'https://static.wikia.nocookie.net/charactah-account/images/4/4a/Lucikiel_Render_01.png/revision/latest?cb=20221010051510&format=original',
        crop: { x: 300, y: 40, size: 135 },
        head: { x: 335, y: 75, size: 75 },
      },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lucikiel_Vari04_Mesh', 'Hero_Lucikiel_Vari04_Weapon'],
      },
    },
    // King's Raid's Advance costume (tm-costumes.mjs).
    {
      name: 'Lucikiel_Advance',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lucikiel_Advance.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lucikiel_Advance.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lucikiel_Advance.webp',
      title: 'Grandeur of Destruction Lucikiel',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_ZLucikiel_Cos21Advance_Body', 'Hero_ZLucikiel_Hair_01', 'Hero_Lucikiel_Vari04_Weapon'],
      },
    },
    // King's Raid's Legend costume (its models made from the game's bundles: KR-extracted/scripts/kr-models.py).
    {
      name: 'Lucikiel_Legend',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lucikiel_Legend.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lucikiel_Legend.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lucikiel_Legend.webp',
      title: 'Cruel Empress of Destruction Lucikiel',
      // King's Raid's own effects of this look, for its moves instead of its hero's (KR-extracted/scripts/tm-vfx.mjs --look=Legend).
      vfx: {
        attack: { start: ['Skill.Hero.ZLucikielCos21Legend.Attack1.Casting2', 'Skill.Hero.ZLucikielCos21Legend.Attack1.Casting3', 'Skill.Hero.ZLucikielCos21Legend.Attack1.Casting1'] },
        storm: { start: ['Skill.Hero.ZLucikielCos21Legend.Skill1.Casting'] },
        wave: { start: ['Skill.Hero.ZLucikielCos21Legend.Skill2.Casting.2', 'Skill.Hero.ZLucikielCos21Legend.Skill2.Casting.1'] },
        doomsday: { start: ['Skill.Hero.ZLucikielCos21Legend.Skill3.Casting'] },
      },
      model: {
        kind: 'parts',
        animations: LEGEND_ANIMATIONS,
        parts: ['Hero_ZLucikiel_Cos21Legend_Body', 'Hero_ZLucikiel_Cos21Legend_Hair', 'Hero_ZLucikiel_Cos21Legend_Weapon_L', 'Hero_ZLucikiel_Cos21Legend_Weapon_R'],
      },
    },
  ],
};
