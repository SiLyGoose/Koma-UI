import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Cecilia, Crimson Wind of Justice (Hero_Cecilia_Vari05…): as King's Raid's own model has it, moved by King's Raid's
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
  attack: [{ clips: ['Attack1-1'], hits: [0.3, 0.9, 1.3] }, { clips: ['Attack1-2'], hits: [0.4, 0.9, 1.4] }, { clips: ['Attack1-3'], hits: [0.4, 0.5, 0.6, 0.7, 0.8] }],
  skills: {
    outta: { clips: ['Skill1-1', 'Skill1-2', 'Skill1-3', 'Skill1-4', 'Skill1-5', 'Skill1-6'], hits: [0.7, 1.3, 2.3, 2.901, 3.2] },
    potential: { clips: ['Skill2'], hits: [1.9] },
    watah: { clips: ['Skill3-1', 'Skill3-2'], hits: [0.7, 1, 1.3, 1.6, 1.9, 2.2, 3.3, 5.9] },
  },
} as const satisfies KrAnimations;

export const CECILIA_ASSETS: HeroAssets = {
  name: 'Cecilia',
  folder: 'heroes/cecilia',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/77/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Its unique weapon, wielded.
  unique: { Hero_Cecilia_Vari05_Weapon: 'Hero_Cecilia_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Cecilia.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Dmg_punch_01', volume: 1.4 }], [{ clip: 'Dmg_punch_02', volume: 1.4 }], [{ clip: 'Dmg_punch_03', volume: 1.4 }]],
      outta: [[{ clip: 'Dmg-shot-01', volume: 1.5 }], [{ clip: 'Dmg_punch_04', volume: 1.6 }], [{ clip: 'Hit_shield_02', volume: 1.7 }]],
      potential: [[{ clip: 'Damage_01', volume: 1.9 }]],
      watah: [[{ clip: 'Dmg_punch_03', volume: 2 }], [{ clip: 'Hit_big_03', volume: 2 }]],
    },
    casts: {
      outta: [{ clip: 'Cecilia-Vox_Skill3', volume: 2.2, at: 0.04, own: true }, { clip: 'Attack-Casting-09', volume: 1.5, at: 0.07 }, { clip: 'Attack-Casting-57', volume: 1.3, at: 0.14 }, { clip: 'Attack-Magic-22', volume: 1.6, at: 0.47 }],
      potential: [{ clip: 'Attack-Casting-09', volume: 1.2 }, { clip: 'Attack-Casting-57', volume: 1.1, at: 0.07 }, { clip: 'Cecilia-Vox_Skill1_b', volume: 2.2, at: 0.17, own: true }, { clip: 'Attack-Jump-01', volume: 1.1, at: 1 }, { clip: 'Attack-Woosh-01', volume: 1.2, at: 1.11 }, { clip: 'Attack-Woosh-02', volume: 1.2, at: 1.22 }, { clip: 'Attack-Woosh-01', volume: 1.2, at: 1.38 }, { clip: 'Attack-Magic-34', volume: 1.6, at: 1.79 }, { clip: 'Attack-Magic-03', volume: 1.6, at: 1.93 }],
      watah: [{ clip: 'Attack-Casting-57', volume: 1.1 }, { clip: 'Attack-Jump-01', volume: 1.3, at: 0.42 }, { clip: 'Attack-Magic-34', volume: 0.8, at: 0.57 }, { clip: 'Cecilia-Vox_Skill2_b', volume: 2.2, at: 0.67, own: true }, { clip: 'Attack-Magic-34', volume: 0.8, at: 0.84 }, { clip: 'Attack-Magic-34', volume: 0.8, at: 1.11 }, { clip: 'Attack-Magic-34', volume: 0.8, at: 1.4 }, { clip: 'Attack-Magic-34', volume: 0.8, at: 1.7 }, { clip: 'Attack-Jump-01', volume: 1.3, at: 2.22 }, { clip: 'Attack-Magic-34', volume: 0.8, at: 2.51 }],
    },
    victory: [{ clip: 'Cecilia-Vox_Victory_b', volume: 2.2, at: 1.02, own: true }, { clip: 'Attack-Woosh-01', volume: 1.3, at: 1.12 }, { clip: 'Attack-Jump-01', volume: 1.5, at: 1.76 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Cecilia.Attack1.Casting1', 'Skill.Hero.Cecilia.Attack1.Casting2', 'Skill.Hero.Cecilia.Attack1.Casting3'], land: ['Skill.Hero.Cecilia.Attack1.Hit2', 'Skill.Hero.Cecilia.Attack1.Hit1'] },
    outta: { start: ['Skill.Hero.Cecilia.Skill1.Casting6', 'Skill.Hero.Cecilia.Skill1.Casting4', 'Skill.Hero.Cecilia.Skill1.Casting5', 'Skill.Hero.Cecilia.Skill1.Casting2', 'Skill.Hero.Cecilia.Skill1.Casting3', 'Skill.Hero.Cecilia.Skill1.Casting1'], land: ['Skill.Hero.Cecilia.Skill1.HitLoop'] },
    potential: { start: ['Skill.Hero.Cecilia.Skill2.Casting', 'Skill.Hero.Cecilia.Skill2.CastingLoop'], land: ['Skill.Hero.Cecilia.Skill2.Hit1', 'Skill.Hero.Cecilia.Skill2.Hit2', 'Skill.Hero.Cecilia.Skill2.Hit3'] },
    watah: { start: ['Skill.Hero.Cecilia.Skill3.Casting2', 'Skill.Hero.Cecilia.Skill3.Casting1'] },
  },
  skins: [
    {
      name: 'Cecilia',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Cecilia.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Cecilia.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Cecilia.webp',
      // Its artwork (the Drive folder's): its head in the crop (the meter's close-up is its face by itself).
      portrait: { file: 'Cecilia.png', from: `${DRIVE}1PJf1E6KEleF5CCfbW9Sgo8zusV4xIJtb`, crop: { x: 515, y: 90, size: 150 }, head: { x: 585, y: 125, size: 80 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Cecilia_Vari05_Body', 'Hero_Cecilia_Vari05_Hair', 'Hero_Cecilia_Vari05_Weapon'],
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Cecilia_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Cecilia_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Cecilia_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Cecilia_Summer.webp',
      title: 'Beachside Cecilia',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Cecilia_Cos19Summer_Body', 'Hero_Cecilia_Cos19Summer_Hair', 'Hero_Cecilia_Cos19Summer_Weapon'],
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Cecilia_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Cecilia_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Cecilia_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Cecilia_Halloween.webp',
      title: 'Werewolf Girl Cecilia',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Cecilia_Cos19Halloween_Body', 'Hero_Cecilia_Cos19Halloween_Hair', 'Hero_Cecilia_Cos19Halloween_Weapon'],
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Cecilia_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Cecilia_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Cecilia_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Cecilia_Christmas.webp',
      title: 'Christmas of Justice Cecilia',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Cecilia_Cos19Christmas_Body', 'Hero_Cecilia_Cos19Christmas_Hair', 'Hero_Cecilia_Cos19Christmas_Weapon'],
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Cecilia_Glory',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Cecilia_Glory.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Cecilia_Glory.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Cecilia_Glory.webp',
      title: 'Cecilia of Honor (Flame of Fighting Spirit)',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        attack: { start: ['Skill.Hero.CeciliaCos20GloryLeague.Attack1.Casting1', 'Skill.Hero.CeciliaCos20GloryLeague.Attack1.Casting2', 'Skill.Hero.CeciliaCos20GloryLeague.Attack1.Casting3'], land: ['Skill.Hero.Cecilia.Attack1.Hit2', 'Skill.Hero.Cecilia.Attack1.Hit1'] },
        outta: { start: ['Skill.Hero.CeciliaCos20GloryLeague.Skill1.Casting6', 'Skill.Hero.CeciliaCos20GloryLeague.Skill1.Casting4', 'Skill.Hero.CeciliaCos20GloryLeague.Skill1.Casting5', 'Skill.Hero.CeciliaCos20GloryLeague.Skill1.Casting2', 'Skill.Hero.CeciliaCos20GloryLeague.Skill1.Casting3', 'Skill.Hero.CeciliaCos20GloryLeague.Skill1.Casting1'], land: ['Skill.Hero.CeciliaCos20GloryLeague.Skill1.HitLoop'] },
        potential: { start: ['Skill.Hero.CeciliaCos20GloryLeague.Skill2.Casting', 'Skill.Hero.Cecilia.Skill2.CastingLoop'], land: ['Skill.Hero.CeciliaCos20GloryLeague.Skill2.Hit1', 'Skill.Hero.CeciliaCos20GloryLeague.Skill2.Hit2', 'Skill.Hero.CeciliaCos20GloryLeague.Skill2.Hit3'] },
        watah: { start: ['Skill.Hero.CeciliaCos20GloryLeague.Skill3.Casting2', 'Skill.Hero.CeciliaCos20GloryLeague.Skill3.Casting1'] },
      },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Cecilia_Cos20GloryLeague1_Body', 'Hero_Cecilia_Cos20GloryLeague1_Hair', 'Hero_Cecilia_Cos20GloryLeague1_Weapon'],
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Cecilia_Glory2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Cecilia_Glory2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Cecilia_Glory2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Cecilia_Glory2.webp',
      title: 'Cecilia of Glaring Honor (Flame of Fighting Spirit)',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        attack: { start: ['Skill.Hero.CeciliaCos20GloryLeague.Attack1.Casting1', 'Skill.Hero.CeciliaCos20GloryLeague.Attack1.Casting2', 'Skill.Hero.CeciliaCos20GloryLeague.Attack1.Casting3'], land: ['Skill.Hero.Cecilia.Attack1.Hit2', 'Skill.Hero.Cecilia.Attack1.Hit1'] },
        outta: { start: ['Skill.Hero.CeciliaCos20GloryLeague.Skill1.Casting6', 'Skill.Hero.CeciliaCos20GloryLeague.Skill1.Casting4', 'Skill.Hero.CeciliaCos20GloryLeague.Skill1.Casting5', 'Skill.Hero.CeciliaCos20GloryLeague.Skill1.Casting2', 'Skill.Hero.CeciliaCos20GloryLeague.Skill1.Casting3', 'Skill.Hero.CeciliaCos20GloryLeague.Skill1.Casting1'], land: ['Skill.Hero.CeciliaCos20GloryLeague.Skill1.HitLoop'] },
        potential: { start: ['Skill.Hero.CeciliaCos20GloryLeague.Skill2.Casting', 'Skill.Hero.Cecilia.Skill2.CastingLoop'], land: ['Skill.Hero.CeciliaCos20GloryLeague.Skill2.Hit1', 'Skill.Hero.CeciliaCos20GloryLeague.Skill2.Hit2', 'Skill.Hero.CeciliaCos20GloryLeague.Skill2.Hit3'] },
        watah: { start: ['Skill.Hero.CeciliaCos20GloryLeague.Skill3.Casting2', 'Skill.Hero.CeciliaCos20GloryLeague.Skill3.Casting1'] },
      },
      // What King's Raid keeps on it all the while (tm-glory.mjs).
      wears: ['Skill.Hero.CeciliaCos20GloryLeague.Body'],
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Cecilia_Cos20GloryLeague2_Body', 'Hero_Cecilia_Cos20GloryLeague2_Hair', 'Hero_Cecilia_Cos20GloryLeague2_Weapon'],
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Cecilia_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Cecilia_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Cecilia_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Cecilia_Wedding.webp',
      title: 'Unwavering Promise Cecilia',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Cecilia_Cos20Wedding_Body', 'Hero_Cecilia_Cos20Wedding_Hair', 'Hero_Cecilia_Cos20Wedding_Weapon'],
      },
    },
  ],
};
