import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Naila: her body, her hair and wings, and her claws (on her skeleton, as her body's file has them: none in her hands).
 * She is moved by King's Raid's own animations of her (ANIMATIONS: ../../heroes/body/kr.ts).
 */


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
  attack: [{ clips: ['Attack1-1'], hits: [0.3] }, { clips: ['Attack1-2'], hits: [0.1, 0.3, 0.7] }, { clips: ['Attack1-3'], hits: [0.3] }, { clips: ['Attack1-4'], hits: [0.6] }],
  skills: {
    winds: { clips: ['Skill1-a', 'Skill1-b'], hits: [1] },
    reading: { clips: ['Skill2-1', 'Skill2-2'], hits: [1] },
    dive: { clips: ['Skill3'], hits: [1.7] },
  },
} as const satisfies KrAnimations;

export const NAILA_ASSETS: HeroAssets = {
  name: 'Naila',
  folder: 'heroes/naila',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/20/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Baroro, her claws.
  unique: { Hero_Naila_Vari05_Weapon: 'Hero_Naila_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Naila.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Dmg_punch_01', volume: 1.5 }], [{ clip: 'Dmg_punch_02', volume: 1.5 }], [{ clip: 'Dmg_punch_03', volume: 1.5 }], [{ clip: 'Dmg_punch_04', volume: 1.5 }]],
      winds: [[{ clip: 'Hit_big_01', volume: 2 }]],
      dive: [[{ clip: 'Hit_big_02', volume: 2 }]],
    },
    casts: {
      winds: [{ clip: 'Attack-Casting-10', volume: 1.5, at: 0.19 }, { clip: 'Attack-Casting-21', volume: 1.4, at: 0.19 }, { clip: 'Naila-Vox_Skill1', volume: 2, at: 0.29, own: true }, { clip: 'Attack-Magic-22', volume: 1.6, at: 1.14 }, { clip: 'Attack-Magic-23', volume: 1.6, at: 1.14 }, { clip: 'Attack-Magic-22', volume: 1.6, at: 1.54 }, { clip: 'Attack-Magic-23', volume: 1.6, at: 1.54 }],
      reading: [{ clip: 'Naila-Vox_Skill2', volume: 2.3, own: true }, { clip: 'Attack-Magic-06', volume: 1.8, at: 0.15 }, { clip: 'Attack-Casting-10', volume: 1.5, at: 0.19 }, { clip: 'Attack-Casting-21', volume: 1.4, at: 0.19 }, { clip: 'Attack-Magic-22', volume: 1.8, at: 0.5 }],
      dive: [{ clip: 'Attack-Casting-07', volume: 1.8 }, { clip: 'Naila-Vox_Skill3', volume: 2, at: 0.67, own: true }, { clip: 'Attack-Casting-16', volume: 1.3, at: 0.9 }, { clip: 'Attack-Casting-16', volume: 1.3, at: 0.9 }, { clip: 'Attack-Magic-03', at: 0.9 }, { clip: 'Attack-Casting-21', volume: 1.6, at: 1.14 }],
    },
    victory: [{ clip: 'Attack-Jump-01', volume: 1.6, at: 0.37 }, { clip: 'Naila-Vox_Victory', volume: 1.8, at: 0.48, own: true }, { clip: 'Attack-Action-02', volume: 1.2, at: 0.51 }, { clip: 'FX-Naila-01', volume: 1.9, at: 1.52 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Naila.Re.Attack1.4', 'Skill.Hero.Naila.Re.Attack1.1', 'Skill.Hero.Naila.Re.Attack1.3', 'Skill.Hero.Naila.Re.Attack1.2'], land: ['Hit.Normal.StrikeBig', 'Hit.Physical.02'] },
    winds: { start: ['Skill.Hero.Naila.Re.Skill1.Casting'], land: ['Skill.Hero.Naila.Re.Skill1.Hit'] },
    reading: { start: ['Skill.Hero.Naila.Skill2.Loop', 'Skill.Hero.Naila.Re.Skill2.Casting'], land: ['Skill.Hero.Naila.Re.Skill2.HitLoop'] },
    dive: { start: ['Skill.Hero.Naila.Re.Skill3.Casting'], land: ['Skill.Hero.Naila.Skill3.HitRing'] },
  },
  skins: [
    {
      name: 'Naila',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Naila.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Naila.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Naila.webp',
      // Her artwork (from the wiki, asked for as the PNG it was uploaded as), her wings spread: her head in the crop (the meter's close-up is her face by itself).
      portrait: {
        file: 'Naila.png',
        from: 'https://static.wikia.nocookie.net/charactah-account/images/a/a4/Naila_%28King%27s_Raid%29_Render_01.png/revision/latest?cb=20220930025252&format=original',
        crop: { x: 345, y: 195, size: 115 },
        head: { x: 375, y: 228, size: 58 },
      },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Naila_Vari05_Body', 'Hero_Naila_Vari05_Hair', 'Hero_Naila_Vari05_Weapon'],
      },
    },
    // King's Raid's School costume (tm-costumes.mjs).
    {
      name: 'Naila_School',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Naila_School.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Naila_School.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Naila_School.webp',
      title: 'Catpunch Naila',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Naila_Cos16SL_Body', 'Hero_Naila_Cos16SL_Hair', 'Hero_Naila_Cos16SL_Weapon'],
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Naila_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Naila_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Naila_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Naila_Summer.webp',
      title: 'Beachside Naila',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Naila_Cos17Summer_Body', 'Hero_Naila_Cos17Summer_Hair', 'Hero_Naila_Cos17Summer_Weapon'],
      },
    },
    // King's Raid's Frozen costume (tm-costumes.mjs).
    {
      name: 'Naila_Frozen',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Naila_Frozen.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Naila_Frozen.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Naila_Frozen.webp',
      title: 'Wing of Northern Wind Naila',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Naila_Cos18Frozen_Body', 'Hero_Naila_Cos18Frozen_Hair', 'Hero_Naila_Cos18Frozen_Weapon'],
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Naila_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Naila_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Naila_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Naila_Wedding.webp',
      title: 'Breath of Spring Breeze Naila',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Naila_Cos19Wedding_Body', 'Hero_Naila_Cos19Wedding_Hair', 'Hero_Naila_Cos19Wedding_Weapon'],
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Naila_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Naila_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Naila_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Naila_Christmas.webp',
      title: 'Christmas of a Harpy Naila',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Naila_Cos19Christmas_Body', 'Hero_Naila_Cos19Christmas_Hair', 'Hero_Naila_Cos19Christmas_Weapon'],
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Naila_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Naila_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Naila_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Naila_Halloween.webp',
      title: 'Wing of the Night Naila',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Naila_Cos20Halloween_Body', 'Hero_Naila_Cos20Halloween_Hair', 'Hero_Naila_Cos20Halloween_Weapon'],
      },
    },
  ],
};
