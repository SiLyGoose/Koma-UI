import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Roi, Swift Assassin (Hero_Roi_Vari05…): as King's Raid's own model has it, moved by King's Raid's
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
  attack: [{ clips: ['Attack1-1'], hits: [0.3, 0.6, 0.8] }, { clips: ['Attack1-2'], hits: [0.4, 0.7] }, { clips: ['Attack1-3'], hits: [0.6] }],
  skills: {
    merciless: { clips: ['Skill2-1', 'Skill2-2', 'Skill2-3', 'Skill2-4', 'Skill2-5'], hits: [0.8, 1.1, 1.2, 1.433, 1.533, 1.767, 2.367] },
    curtain: { clips: ['Skill1-1'], hits: [0.5] },
    bladeclaw: { clips: ['Dash', 'Attack3'], hits: [0.967] },
  },
} as const satisfies KrAnimations;

export const ROI_ASSETS: HeroAssets = {
  name: 'Roi',
  folder: 'heroes/roi',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/4/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Its unique weapon, wielded.
  unique: { Hero_Roi_Vari05_Weapon: 'Hero_Roi_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Roi.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_common_01', volume: 1.5 }]],
      merciless: [[{ clip: 'Hit_common_03', volume: 2 }]],
      bladeclaw: [[{ clip: 'Hit_common_04', volume: 2 }]],
    },
    casts: {
      merciless: [{ clip: 'Attack-Casting-03', volume: 2.5, at: 0.09 }, { clip: 'Attack-Casting-07', volume: 2.9, at: 0.09 }, { clip: 'Roi-Vox_Skill1_c', volume: 2.2, at: 0.15, own: true }],
      curtain: [{ clip: 'Roi-Vox_Skill2_b', volume: 2.2, own: true }, { clip: 'Attack-Casting-03', volume: 2.5, at: 0.09 }, { clip: 'Attack-Casting-07', volume: 2.5, at: 0.09 }, { clip: 'Roi-Vox_Attack6', volume: 2.2, at: 1.22, own: true }, { clip: 'Roi-Vox_Attack7', volume: 2.2, at: 3.22, own: true }],
    },
    victory: [{ clip: 'Attack-Action-02', at: 0.08 }, { clip: 'Attack-Body-01', at: 0.46 }, { clip: 'Attack-Spin-01', at: 0.53 }, { clip: 'Attack-Woosh-08', at: 0.75 }, { clip: 'Roi-Vox_Victory', volume: 0.9, at: 0.94, own: true }, { clip: 'Attack-Body-01', at: 1.91 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Roi.Re.Attack1.Casting1', 'Skill.Hero.Roi.Re.Attack1.Casting2', 'Skill.Hero.Roi.Re.Attack1.Casting3'], land: ['Hit.Normal.SlashBig'] },
    merciless: { start: ['Skill.Hero.Roi.Skill2', 'Skill.Hero.Roi.Re.Skill2.Casting'], land: ['Skill.Hero.Roi.Re.Skill2.HitLoop', 'Skill.Hero.Roi.Skill2.Hit', 'Hit.Physical.SlashXL'] },
    curtain: { start: ['Skill.Hero.Roi.Skill1', 'Skill.Hero.Roi.Re.Skill1.Casting2', 'Skill.Hero.Roi.Re.Skill1.Casting1'], land: ['Skill.Hero.Roi.Re.Skill1.Hit'] },
    bladeclaw: { start: ['Skill.Hero.Roi.Re.Skill3.Shadow', 'Skill.Hero.Roi.Skill3', 'Skill.Hero.Roi.Re.Skill3.Casting'], land: ['Hit.Normal.StrikeBig', 'Common.Claw'] },
  },
  skins: [
    {
      name: 'Roi',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Roi.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Roi.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Roi.webp',
      // Its artwork (the Drive folder's): its head in the crop (the meter's close-up is its face by itself).
      portrait: { file: 'Roi.png', from: `${DRIVE}14-mSU8L2wehAb66ggAdIgiqdILgepVpz`, crop: { x: 300, y: 250, size: 150 }, head: { x: 335, y: 300, size: 80 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Roi_Vari05_Body', 'Hero_Roi_Hair_01'],
        // (In its right hand, where King's Raid hangs it: Point_Hand_R.)
        right: 'Hero_Roi_Vari05_Weapon',
      },
    },
    // King's Raid's School costume (tm-costumes.mjs).
    {
      name: 'Roi_School',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Roi_School.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Roi_School.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Roi_School.webp',
      title: 'Delinquent Roi',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Roi_Cos16SL_Body', 'Hero_Roi_Hair_01'],
        right: 'Hero_Roi_Cos16SL_Weapon',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Roi_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Roi_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Roi_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Roi_Summer.webp',
      title: 'Beachside Roi',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Roi_Cos17Summer_Body', 'Hero_Roi_Hair_02'],
        right: 'Hero_Roi_Cos17Summer_Weapon',
      },
    },
    // King's Raid's Idol costume (tm-costumes.mjs).
    {
      name: 'Roi_Idol',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Roi_Idol.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Roi_Idol.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Roi_Idol.webp',
      title: 'Halcyon Knights Roi',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Roi_Cos17Idol_Body', 'Hero_Roi_Hair_01'],
        right: 'Hero_Roi_Cos17Idol_Weapon',
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Roi_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Roi_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Roi_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Roi_Christmas.webp',
      title: 'Santa Roi',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Roi_Cos17Christmas_Body', 'Hero_Roi_Hair_01'],
        right: 'Hero_Roi_Cos17Christmas_Weapon',
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Roi_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Roi_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Roi_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Roi_Wedding.webp',
      title: 'Bright Shadow Roi',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Roi_Cos18Wedding_Body', 'Hero_Roi_Hair_03'],
        right: 'Hero_Roi_Cos18Wedding_Weapon',
      },
    },
    // King's Raid's NewYear costume (tm-costumes.mjs).
    {
      name: 'Roi_NewYear',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Roi_NewYear.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Roi_NewYear.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Roi_NewYear.webp',
      title: 'Ninja Roi',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Roi_Cos19NewYear_Body', 'Hero_Roi_Hair_01'],
        right: 'Hero_Roi_Cos18Newyear_Weapon',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Roi_Summer19',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Roi_Summer19.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Roi_Summer19.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Roi_Summer19.webp',
      title: 'Beachside Roi',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Roi_Cos19Summer_Body', 'Hero_Roi_Hair_05'],
        right: 'Hero_Roi_Cos19Summer_Weapon',
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Roi_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Roi_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Roi_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Roi_Halloween.webp',
      title: 'Pirate Captain Roi',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Roi_Cos20Halloween_Body', 'Hero_Roi_Cos20Halloween_Hair'],
        right: 'Hero_Roi_Cos20Halloween_Weapon',
      },
    },
    // King's Raid's Story costume (tm-costumes.mjs).
    {
      name: 'Roi_Story',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Roi_Story.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Roi_Story.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Roi_Story.webp',
      title: 'Sin-Treading Shadow Roi',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Roi_Substory01_01_Body', 'Hero_Roi_Hair_06'],
        right: 'Hero_Roi_Substory01_Weapon',
      },
    },
    // King's Raid's Story costume (tm-costumes.mjs).
    {
      name: 'Roi_Story2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Roi_Story2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Roi_Story2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Roi_Story2.webp',
      title: 'Sin-Treading Shadow Roi',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Roi_Substory01_02_Body', 'Hero_Roi_Hair_06'],
        right: 'Hero_Roi_Substory01_Weapon',
      },
    },
  ],
};
