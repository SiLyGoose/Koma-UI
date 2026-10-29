import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Jane, Alabaster Corpse (Hero_Jane_Vari05…): as King's Raid's own model has it, moved by King's Raid's
 * own animations of it (ANIMATIONS: ../../heroes/body/kr.ts).
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
  attack: [{ clips: ['Attack1-1'], hits: [0.3] }, { clips: ['Attack1-2'], hits: [0.4, 0.7] }, { clips: ['Attack1-3'], hits: [0.4] }],
  skills: {
    rites: { clips: ['Dash', 'Skill1'], hits: [1.9] },
    mark: { clips: ['Skill2'], hits: [0, 1.8, 2] },
    ruinday: { clips: ['Skill3'], hits: [2.6] },
  },
} as const satisfies KrAnimations;

export const JANE_ASSETS: HeroAssets = {
  name: 'Jane',
  folder: 'heroes/jane',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/24/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Its unique weapon, wielded.
  unique: { Hero_Jane_Vari05_Weapon: 'Hero_Jane_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Jane.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_shield_06', volume: 1.5 }], [{ clip: 'Hit_shield_06', volume: 1.5 }], [{ clip: 'Hit_shield_01', volume: 1.5 }]],
      rites: [[{ clip: 'Hit_shield_02', volume: 2 }]],
      mark: [[{ clip: 'Hit_shield_04', volume: 2.2 }]],
    },
    casts: {
      rites: [{ clip: 'Attack-Casting-02', volume: 1.3 }, { clip: 'Attack-Casting-07', volume: 2.5 }, { clip: 'Attack-Casting-05', volume: 2.5, at: 0.27 }, { clip: 'Jane-Vox_Skill1_b', volume: 3, at: 0.68, own: true }, { clip: 'Attack-Casting-16', volume: 2.2, at: 1.67 }, { clip: 'Attack-Casting-16', volume: 1.8, at: 1.67 }, { clip: 'Death-Fall-06', volume: 2.8, at: 1.67 }],
      mark: [{ clip: 'Attack-Casting-02', volume: 1.3 }, { clip: 'Attack-Casting-07', volume: 2.5 }, { clip: 'Jane-Vox_Skill2_c', volume: 2.5, at: 0.14, own: true }, { clip: 'Attack-Casting-05', volume: 2.5, at: 0.27 }, { clip: 'Attack-Magic-19', volume: 1.9, at: 1.6 }, { clip: 'FX-Jane-03', volume: 1.8, at: 1.63 }, { clip: 'Attack-Magic-23', volume: 1.9, at: 1.8 }, { clip: 'Attack-Magic-22', volume: 1.9, at: 2.05 }, { clip: 'FX-Jane-01', volume: 1.5, at: 3.01 }],
      ruinday: [{ clip: 'Attack-Casting-02', volume: 1.3 }, { clip: 'Attack-Casting-07', volume: 2.5 }, { clip: 'Jane-Vox_Skill3_c', volume: 2.5, own: true }, { clip: 'Attack-Casting-05', volume: 2.5, at: 0.27 }, { clip: 'FX-Jane-01', volume: 1.9, at: 1.41 }, { clip: 'Attack-Magic-19', volume: 1.9, at: 2.1 }, { clip: 'Attack-Magic-23', volume: 1.9, at: 2.3 }, { clip: 'Attack-Casting-24', volume: 2, at: 2.62 }, { clip: 'Attack-Magic-22', volume: 1.9, at: 2.88 }, { clip: 'FX-Jane-03', volume: 1.8, at: 4.42 }],
    },
    victory: [{ clip: 'Jane-Vox_Victory_b', volume: 2.2, at: 0.31, own: true }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Jane.Attack1.3', 'Skill.Hero.Jane.Attack1.2', 'Skill.Hero.Jane.Attack1.1'], land: ['Hit.Normal.StrikeBig'] },
    rites: { start: ['Skill.Hero.Jane.Skill1.Casting'], land: ['Skill.Hero.Jane.Skill1.Hit'] },
    mark: { start: ['Skill.Hero.Jane.Skill2.Mark', 'Skill.Hero.Jane.Skill2.Casting'], land: ['Skill.Hero.Jane.Skill2.Hit'] },
    ruinday: { start: ['Skill.Hero.Jane.Skill3.Casting'], land: ['Skill.Hero.Jane.Skill3.Hit'] },
  },
  skins: [
    {
      name: 'Jane',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Jane.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Jane.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Jane.webp',
      // Its artwork (the Drive folder's): its head in the crop (the meter's close-up is its face by itself).
      portrait: { file: 'Jane.png', from: `${DRIVE}17qqPX5asjcPaKUhcbO3fo-U0Er8aJTW4`, crop: { x: 150, y: 130, size: 320 }, head: { x: 212, y: 250, size: 160 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Jane_Vari05_Body', 'Hero_Jane_Vari05_Hair'],
        // (In its right hand, where King's Raid hangs it: Point_Hand_R.)
        right: 'Hero_Jane_Vari05_Weapon',
      },
    },
    // King's Raid's School costume (tm-costumes.mjs).
    {
      name: 'Jane_School',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Jane_School.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Jane_School.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Jane_School.webp',
      title: 'Sailor Uniform Jane',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Jane_Cos16SL_Body', 'Hero_Jane_Cos16SL_Hair'],
        right: 'Hero_Jane_Cos16SL_Weapon',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Jane_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Jane_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Jane_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Jane_Summer.webp',
      title: 'Beachside Jane',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Jane_Cos17Summer01_Body', 'Hero_Jane_Cos17Summer01_Hair'],
        right: 'Hero_Jane_Cos17Summer_Weapon',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Jane_Summer2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Jane_Summer2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Jane_Summer2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Jane_Summer2.webp',
      title: 'Beachside Jane',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Jane_Cos17Summer02_Body', 'Hero_Jane_Cos17Summer01_Hair'],
        right: 'Hero_Jane_Cos17Summer02_Weapon',
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Jane_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Jane_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Jane_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Jane_Halloween.webp',
      title: 'Mummy Jane',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Jane_Cos17Halloween_Body', 'Hero_Jane_Vari05_Hair'],
        right: 'Hero_Jane_Cos17Halloween_Weapon',
      },
    },
    // King's Raid's Idol costume (tm-costumes.mjs).
    {
      name: 'Jane_Idol',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Jane_Idol.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Jane_Idol.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Jane_Idol.webp',
      title: 'Twinkle Pure Jane',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Jane_Cos17Idol_Body', 'Hero_Jane_Cos17Idol_Hair'],
        right: 'Hero_Jane_Cos17Idol_Weapon',
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Jane_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Jane_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Jane_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Jane_Christmas.webp',
      title: 'Santa Jane',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Jane_Cos17Christmas_Body', 'Hero_Jane_Cos17Christmas_Hair'],
        right: 'Hero_Jane_Cos17Christmas_Weapon',
      },
    },
    // King's Raid's NewYear costume (tm-costumes.mjs).
    {
      name: 'Jane_NewYear',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Jane_NewYear.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Jane_NewYear.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Jane_NewYear.webp',
      title: 'Hanbok Jane',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Jane_Cos18NewYear_Body', 'Hero_Jane_Cos18NewYear_Hair'],
        right: 'Hero_Jane_Cos18NewYear_Weapon',
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Jane_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Jane_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Jane_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Jane_Wedding.webp',
      title: 'Love Beyond Death Jane',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Jane_Cos18Wedding_Body', 'Hero_Jane_Cos18Wedding_Hair'],
        right: 'Hero_Jane_Cos18Wedding_Weapon',
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Jane_Glory',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Jane_Glory.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Jane_Glory.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Jane_Glory.webp',
      title: 'Jane of Honor',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Jane_Cos18GloryLeague_Body', 'Hero_Jane_Cos18GloryLeague_Hair'],
        right: 'Hero_Jane_Cos18GloryLeague_Weapon',
      },
    },
    // King's Raid's Casual costume (tm-costumes.mjs).
    {
      name: 'Jane_Casual',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Jane_Casual.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Jane_Casual.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Jane_Casual.webp',
      title: 'Midsummer Travel Jane',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Jane_Cos19Casual_Body', 'Hero_Jane_Cos19Casual_Hair'],
        right: 'Hero_Jane_Cos19Casual_Weapon',
      },
    },
  ],
};
