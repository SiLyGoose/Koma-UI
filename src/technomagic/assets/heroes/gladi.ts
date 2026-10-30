import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Gladi, Beast of the Arena (Hero_Gladi_Vari05…): as King's Raid's own model has it, moved by King's Raid's
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
  attack: [{ clips: ['Attack1-1'], hits: [0.3] }, { clips: ['Attack1-2'], hits: [0.3, 0.5, 0.7] }, { clips: ['Attack1-3'], hits: [0.3, 0.5] }, { clips: ['Attack1-4'], hits: [0.7] }],
  skills: {
    quick: { clips: ['Skill1'], hits: [1.2, 1.4, 1.6, 1.7, 1.8, 1.9, 2.2] },
    wargod: { clips: ['Skill2'], hits: [1] },
    punch: { clips: ['Skill3'], hits: [2] },
  },
} as const satisfies KrAnimations;

export const GLADI_ASSETS: HeroAssets = {
  name: 'Gladi',
  folder: 'heroes/gladi',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/71/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Its unique weapon, wielded.
  unique: { Hero_Gladi_Vari05_Weapon: 'Hero_Gladi_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Gladi.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Dmg_punch_01', volume: 1.5 }]],
      quick: [[{ clip: 'Dmg_punch_02', volume: 2 }]],
      punch: [[{ clip: 'Hit_big_01', volume: 2 }]],
    },
    casts: {
      quick: [{ clip: 'Attack-Casting-04', volume: 1.2 }, { clip: 'Attack-Woosh-11', volume: 1.8, at: 0.52 }, { clip: 'Gladi-Vox_Skill1-1', volume: 2.2, at: 0.62, own: true }, { clip: 'Attack-Magic-23', volume: 1.6, at: 0.64 }, { clip: 'Attack-Body-01', volume: 1.6, at: 0.69 }, { clip: 'Attack-Woosh-11', volume: 1.8, at: 1.03 }, { clip: 'Gladi-Vox_Skill1-2', volume: 2.2, at: 1.09, own: true }, { clip: 'Attack-Body-01', volume: 1.6, at: 1.2 }, { clip: 'Attack-Woosh-11', volume: 1.8, at: 1.23 }, { clip: 'Attack-Woosh-09', volume: 1.5, at: 1.23 }, { clip: 'Attack-Woosh-10', volume: 1.4, at: 1.41 }, { clip: 'Attack-Woosh-10', volume: 1.4, at: 1.58 }, { clip: 'Gladi-Vox_Skill1-3', volume: 2.2, at: 1.59, own: true }, { clip: 'Attack-Woosh-10', volume: 1.4, at: 1.71 }, { clip: 'Attack-Woosh-10', volume: 1.4, at: 1.85 }, { clip: 'Attack-Woosh-11', volume: 1.8, at: 2.09 }, { clip: 'Gladi-Vox_Skill1-4', volume: 2.2, at: 2.1, own: true }, { clip: 'Attack-Magic-23', volume: 1.6, at: 2.11 }],
      wargod: [{ clip: 'Attack-Casting-15', volume: 1.5 }, { clip: 'Gladi-Vox_Skill2', volume: 2.2, at: 0.23, own: true }, { clip: 'Attack-Magic-02', volume: 1.5, at: 0.96 }, { clip: 'Attack-Magic-07', volume: 1.5, at: 0.96 }, { clip: 'Attack-Magic-23', volume: 1.5, at: 1.03 }],
      punch: [{ clip: 'Attack-Casting-15', volume: 1.5 }, { clip: 'Attack-Magic-07', volume: 1.5, at: 0.42 }, { clip: 'Attack-Casting-12', volume: 1.5, at: 0.48 }, { clip: 'Gladi-Vox_Skill3', volume: 2.2, at: 0.5, own: true }, { clip: 'Attack-Magic-23', volume: 1.5, at: 0.57 }, { clip: 'Attack-Magic-02', volume: 1.5, at: 1.46 }, { clip: 'Attack-Magic-07', volume: 1.5, at: 2.09 }, { clip: 'Attack-Magic-20', volume: 1.7, at: 2.09 }],
    },
    victory: [{ clip: 'Attack-Jump-03', volume: 1.5, at: 0.37 }, { clip: 'Gladi-Vox_Victory', volume: 2.2, at: 0.57, own: true }, { clip: 'Attack-Woosh-11', volume: 1.5, at: 0.93 }, { clip: 'Attack-Body-01', volume: 1.5, at: 0.93 }, { clip: 'Attack-Body-01', volume: 1.5, at: 1.87 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Gladi.Attack1.1', 'Skill.Hero.Gladi.Attack1.2', 'Skill.Hero.Gladi.Attack1.3', 'Skill.Hero.Gladi.Attack1.4'], land: ['Hit.Normal.SlashBig'] },
    quick: { start: ['Skill.Hero.Gladi.Skill1.Casting'] },
    wargod: { start: ['Skill.Hero.Gladi.Skill2.Loop', 'Skill.Hero.Gladi.Skill2.Casting'], land: ['Skill.Hero.Gladi.Skill2.Hit', 'Hit.Normal.Fire'] },
    punch: { start: ['Skill.Hero.Gladi.Skill3.Casting'], land: ['Hit.Physical.03'] },
  },
  skins: [
    {
      name: 'Gladi',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Gladi.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Gladi.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Gladi.webp',
      // Its artwork (the Drive folder's): its head in the crop (the meter's close-up is its face by itself).
      portrait: { file: 'Gladi.png', from: `${DRIVE}1ux24oPe9KX1M_EE4PCDhAgBNK6AaJ5GN`, crop: { x: 460, y: 195, size: 150 }, head: { x: 485, y: 240, size: 85 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Gladi_Vari05_Mesh', 'Hero_Gladi_Hair_01', 'Hero_Gladi_Vari05_Weapon'],
      },
    },
    // King's Raid's Frozen costume (tm-costumes.mjs).
    {
      name: 'Gladi_Frozen',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Gladi_Frozen.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Gladi_Frozen.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Gladi_Frozen.webp',
      title: 'Ice Mercenary Gladi',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Gladi_Cos18Frozen_Mesh', 'Hero_Gladi_Cos18Frozen_Hair', 'Hero_Gladi_Cos18Frozen_Weapon'],
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Gladi_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Gladi_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Gladi_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Gladi_Summer.webp',
      title: 'Beachside Gladi',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Gladi_Cos18Summer_Mesh', 'Hero_Gladi_Cos18Summer_Hair', 'Hero_Gladi_Cos18Summer_Weapon'],
      },
    },
    // King's Raid's Maid costume (tm-costumes.mjs).
    {
      name: 'Gladi_Maid',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Gladi_Maid.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Gladi_Maid.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Gladi_Maid.webp',
      title: 'Butler Gladi',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Gladi_Cos18Maid_Mesh', 'Hero_Gladi_Cos18Maid_Hair', 'Hero_Gladi_Cos18Maid_Weapon'],
      },
    },
    // King's Raid's Dessert costume (tm-costumes.mjs).
    {
      name: 'Gladi_Dessert',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Gladi_Dessert.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Gladi_Dessert.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Gladi_Dessert.webp',
      title: 'Peppermint Candy Dreams Gladi',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Gladi_Cos20Dessert_Mesh', 'Hero_Gladi_Cos20Dessert_Hair', 'Hero_Gladi_Cos20Dessert_Weapon'],
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Gladi_Glory',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Gladi_Glory.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Gladi_Glory.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Gladi_Glory.webp',
      title: 'Gladi of Honor (Flame of Fighting Spirit)',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        attack: { start: ['Skill.Hero.GladiCos20GloryLeague.Attack1.1', 'Skill.Hero.GladiCos20GloryLeague.Attack1.2', 'Skill.Hero.GladiCos20GloryLeague.Attack1.3', 'Skill.Hero.GladiCos20GloryLeague.Attack1.4'], land: ['Hit.Normal.SlashBig'] },
        quick: { start: ['Skill.Hero.GladiCos20GloryLeague.Skill1.Casting'] },
        wargod: { start: ['Skill.Hero.GladiCos20GloryLeague.Skill2.Loop', 'Skill.Hero.GladiCos20GloryLeague.Skill2.Casting'], land: ['Skill.Hero.Gladi.Skill2.Hit', 'Hit.Normal.Fire'] },
        punch: { start: ['Skill.Hero.GladiCos20GloryLeague.Skill3.Casting'], land: ['Hit.Physical.03'] },
      },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Gladi_Cos20GloryLeague1_Body', 'Hero_Gladi_Cos20GloryLeague1_Hair', 'Hero_Gladi_Cos20GloryLeague1_Weapon'],
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Gladi_Glory2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Gladi_Glory2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Gladi_Glory2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Gladi_Glory2.webp',
      title: 'Gladi of Glaring Honor (Flame of Fighting Spirit)',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        attack: { start: ['Skill.Hero.GladiCos20GloryLeague.Attack1.1', 'Skill.Hero.GladiCos20GloryLeague.Attack1.2', 'Skill.Hero.GladiCos20GloryLeague.Attack1.3', 'Skill.Hero.GladiCos20GloryLeague.Attack1.4'], land: ['Hit.Normal.SlashBig'] },
        quick: { start: ['Skill.Hero.GladiCos20GloryLeague.Skill1.Casting'] },
        wargod: { start: ['Skill.Hero.GladiCos20GloryLeague.Skill2.Loop', 'Skill.Hero.GladiCos20GloryLeague.Skill2.Casting'], land: ['Skill.Hero.Gladi.Skill2.Hit', 'Hit.Normal.Fire'] },
        punch: { start: ['Skill.Hero.GladiCos20GloryLeague.Skill3.Casting'], land: ['Hit.Physical.03'] },
      },
      // What King's Raid keeps on it all the while (tm-glory.mjs).
      wears: ['Skill.Hero.GladiCos20GloryLeague.Body'],
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Gladi_Cos20GloryLeague2_Body', 'Hero_Gladi_Cos20GloryLeague2_Hair', 'Hero_Gladi_Cos20GloryLeague2_Weapon'],
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Gladi_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Gladi_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Gladi_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Gladi_Halloween.webp',
      title: 'Only Trick, No Duel Today! Gladi',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Gladi_Cos21Halloween_Body', 'Hero_Gladi_Cos21Halloween_Hair', 'Hero_Gladi_Cos21Halloween_Weapon'],
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Gladi_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Gladi_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Gladi_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Gladi_Christmas.webp',
      title: 'Merry Gift Deliverer Gladi',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Gladi_Cos21Christmas_Body', 'Hero_Gladi_Cos21Christmas_Hair', 'Hero_Gladi_Cos21Christmas_Weapon'],
      },
    },
  ],
};
