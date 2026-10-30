import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Ricardo, Lua's Judgment (Hero_Ricardo_Vari05…): as King's Raid's own model has it, moved by King's Raid's
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
  lose: 'Lose',
  dead: 'Dead',
  attack: [{ clips: ['Attack1-1'], hits: [0.4] }, { clips: ['Attack1-2'], hits: [0.3] }, { clips: ['Attack1-3'], hits: [0.3] }],
  skills: {
    destruction: { clips: ['Skill1'], hits: [1.8] },
    protection: { clips: ['Skill2'], hits: [1.4] },
    divine: { clips: ['Skill3'], hits: [1, 1.7, 3] },
  },
} as const satisfies KrAnimations;

export const RICARDO_ASSETS: HeroAssets = {
  name: 'Ricardo',
  folder: 'heroes/ricardo',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/35/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Its unique weapon, wielded.
  unique: { Hero_Ricardo_Vari05_Weapon: 'Hero_Ricardo_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Ricardo.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_shield_06', volume: 1.5 }]],
      destruction: [[{ clip: 'Hit_shield_02', volume: 2 }]],
      protection: [[{ clip: 'Hit_shield_03', volume: 2 }]],
      divine: [[{ clip: 'Hit_shield_04', volume: 2 }]],
    },
    casts: {
      destruction: [{ clip: 'Attack-Casting-21', volume: 1.4 }, { clip: 'Attack-Casting-20', volume: 1.4, at: 0.5 }, { clip: 'Attack-Woosh-14', volume: 1.6, at: 1.53 }, { clip: 'Attack-Magic-22', volume: 1.5, at: 1.53 }, { clip: 'Ricardo-Vox_Skill1_b', volume: 2.2, at: 1.58, own: true }],
      protection: [{ clip: 'Attack-Casting-21', volume: 1.4 }, { clip: 'Ricardo-Vox_Skill2_b', volume: 2.2, own: true }, { clip: 'Attack-Casting-20', volume: 1.4, at: 0.5 }, { clip: 'Attack-Magic-20', volume: 1.5, at: 1.26 }, { clip: 'Attack-Magic-09', volume: 1.5, at: 1.26 }],
      divine: [{ clip: 'Attack-Casting-21', volume: 1.4 }, { clip: 'Ricardo-Vox_Skill3', volume: 2.2, own: true }, { clip: 'Attack-Casting-20', volume: 1.4, at: 0.5 }, { clip: 'Attack-Magic-20', volume: 1.5, at: 1.05 }, { clip: 'Attack-Magic-20', volume: 1.5, at: 1.67 }, { clip: 'Attack-Magic-20', volume: 1.5, at: 2.97 }, { clip: 'Attack-Magic-09', volume: 1.5, at: 2.97 }],
    },
    victory: [{ clip: 'Ricardo-Vox_Victory', volume: 2.2, at: 0.49, own: true }, { clip: 'Attack-Woosh-15', volume: 1.2, at: 0.92 }, { clip: 'Attack-Woosh-15', volume: 1.2, at: 1.57 }, { clip: 'Death-Fall-02', volume: 1.4, at: 1.81 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Ricardo.Attack1.3', 'Skill.Hero.Ricardo.Attack1.2', 'Skill.Hero.Ricardo.Attack1.1'], land: ['Skill.Hero.Ricardo.Hit'] },
    destruction: { start: ['Skill.Hero.Ricardo.Skill1'] },
    protection: { start: ['Skill.Hero.Ricardo.Skill2.CastingShield', 'Skill.Hero.Ricardo.Skill2.Casting', 'Skill.Hero.Ricardo.Skill2.Loop'] },
    divine: { start: ['Skill.Hero.Ricardo.Skill3'] },
  },
  skins: [
    {
      name: 'Ricardo',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Ricardo.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Ricardo.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Ricardo.webp',
      // Its artwork (the Drive folder's): its head in the crop (the meter's close-up is its face by itself).
      portrait: { file: 'Ricardo.png', from: `${DRIVE}1aRdsqIg8NFjbMkXUnvsONdS5RNPX96qP`, crop: { x: 220, y: 200, size: 160 }, head: { x: 255, y: 285, size: 85 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Ricardo_Vari05_Body', 'Hero_Ricardo_Hair_01'],
        // (In its right hand, where King's Raid hangs it: Point_Hand_R.)
        right: 'Hero_Ricardo_Vari05_Weapon',
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Ricardo_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Ricardo_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Ricardo_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Ricardo_Halloween.webp',
      title: 'Ghost Knight Ricardo',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Ricardo_Cos17Halloween_Body', 'Hero_Ricardo_Hair_02'],
        right: 'Hero_Ricardo_Cos17Halloween_Weapon',
      },
    },
    // King's Raid's School costume (tm-costumes.mjs).
    {
      name: 'Ricardo_School',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Ricardo_School.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Ricardo_School.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Ricardo_School.webp',
      title: 'Principal Ricardo',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Ricardo_Cos18SL_Body', 'Hero_Ricardo_Hair_01'],
        right: 'Hero_Ricardo_Cos18SL_Weapon',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Ricardo_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Ricardo_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Ricardo_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Ricardo_Summer.webp',
      title: 'Beachside Ricardo',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Ricardo_Cos18Summer_Body', 'Hero_Ricardo_Hair_01'],
        right: 'Hero_Ricardo_Cos18Summer_Weapon',
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Ricardo_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Ricardo_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Ricardo_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Ricardo_Christmas.webp',
      title: 'Santa Ricardo',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Ricardo_Cos18Christmas_Body', 'Hero_Ricardo_Cos18Christmas_Hair'],
        right: 'Hero_Ricardo_Cos18Christmas_Weapon',
      },
    },
    // King's Raid's Casual costume (tm-costumes.mjs).
    {
      name: 'Ricardo_Casual',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Ricardo_Casual.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Ricardo_Casual.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Ricardo_Casual.webp',
      title: 'Legendary Center Ricardo',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Ricardo_Cos19Casual_Body', 'Hero_Ricardo_Hair_01'],
        right: 'Hero_Ricardo_Cos19Casual_Weapon',
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Ricardo_Glory',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Ricardo_Glory.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Ricardo_Glory.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Ricardo_Glory.webp',
      title: 'Ricardo of Honor (Brilliance of the Azure Sky)',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        attack: { start: ['Skill.Hero.RicardoCos20GloryLeague.Attack1.3', 'Skill.Hero.RicardoCos20GloryLeague.Attack1.2', 'Skill.Hero.RicardoCos20GloryLeague.Attack1.1'], land: ['Skill.Hero.RicardoCos20GloryLeague.Hit'] },
        destruction: { start: ['Skill.Hero.RicardoCos20GloryLeague.Skill1'] },
        protection: { start: ['Skill.Hero.Ricardo.Skill2.CastingShield', 'Skill.Hero.RicardoCos20GloryLeague.Skill2.Casting', 'Skill.Hero.RicardoCos20GloryLeague.Skill2.Loop'] },
        divine: { start: ['Skill.Hero.RicardoCos20GloryLeague.Skill3'] },
      },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Ricardo_Cos20GloryLeague_Body', 'Hero_Ricardo_Cos20GloryLeague_Hair'],
        right: 'Hero_Ricardo_Cos20GloryLeague_Weapon',
      },
    },
    // King's Raid's Fallen costume (tm-costumes.mjs).
    {
      name: 'Ricardo_Fallen',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Ricardo_Fallen.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Ricardo_Fallen.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Ricardo_Fallen.webp',
      title: 'Corrupted Piety Ricardo',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Ricardo_Cos21Fallen_Body', 'Hero_Ricardo_Hair_01'],
        right: 'Hero_Ricardo_Cos21Fallen_Weapon',
      },
    },
    // Its Glory League costume's Glaring Honor tier: the same model, wearing its effects (tm-glory.mjs).
    {
      name: 'Ricardo_Glory2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Ricardo_Glory2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Ricardo_Glory2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Ricardo_Glory2.webp',
      title: 'Ricardo of Glaring Honor (Brilliance of the Azure Sky)',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        attack: { start: ['Skill.Hero.RicardoCos20GloryLeague.Attack1.3', 'Skill.Hero.RicardoCos20GloryLeague.Attack1.2', 'Skill.Hero.RicardoCos20GloryLeague.Attack1.1'], land: ['Skill.Hero.RicardoCos20GloryLeague.Hit'] },
        destruction: { start: ['Skill.Hero.RicardoCos20GloryLeague.Skill1'] },
        protection: { start: ['Skill.Hero.Ricardo.Skill2.CastingShield', 'Skill.Hero.RicardoCos20GloryLeague.Skill2.Casting', 'Skill.Hero.RicardoCos20GloryLeague.Skill2.Loop'] },
        divine: { start: ['Skill.Hero.RicardoCos20GloryLeague.Skill3'] },
      },
      // What King's Raid keeps on it all the while.
      wears: ['Skill.Hero.RicardoCos20GloryLeague.Cos20GloryLeagueLight'],
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Ricardo_Cos20GloryLeague_Body', 'Hero_Ricardo_Cos20GloryLeague_Hair'],
        right: 'Hero_Ricardo_Cos20GloryLeague_Weapon',
      },
    },
  ],
};
