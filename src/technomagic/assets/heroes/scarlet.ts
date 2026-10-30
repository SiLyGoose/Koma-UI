import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Scarlet, Faith of Silver (Hero_Scarlet_Vari05…): as King's Raid's own model has it, moved by King's Raid's
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
  attack: [{ clips: ['Re_Attack1-1'], hits: [0.3] }, { clips: ['Re_Attack1-2'], hits: [0.1, 0.4, 0.7] }, { clips: ['Re_Attack1-3'], hits: [0.2, 0.7] }],
  skills: {
    halt: { clips: ['Re_Skill1_Re'], hits: [1.7] },
    justice: { clips: ['Re_Skill2_Re'], hits: [1.3] },
    honor: { clips: ['Re_Skill3_Re'], hits: [0.4, 0.7, 2.6, 2.9] },
  },
} as const satisfies KrAnimations;

export const SCARLET_ASSETS: HeroAssets = {
  name: 'Scarlet',
  folder: 'heroes/scarlet',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/59/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Its unique weapon, wielded.
  unique: { Hero_Scarlet_Vari05_Weapon: 'Hero_Scarlet_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Scarlet.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_sword_04', volume: 1.5 }]],
      halt: [[{ clip: 'Hit_big_03', volume: 2 }]],
      honor: [[{ clip: 'Hit_fire_04', volume: 2 }]],
    },
    casts: {
      halt: [{ clip: 'Attack-Casting-51', volume: 1.5 }, { clip: 'Attack-Casting-56', volume: 1.5 }, { clip: 'Scarlet-Vox_Skill1', volume: 2.2, own: true }, { clip: 'Attack-Magic-22', volume: 1.3, at: 1.57 }, { clip: 'Attack-Magic-03', volume: 1.2, at: 1.63 }, { clip: 'Scarlet-Vox_Attack1', volume: 2.2, at: 1.68, own: true }, { clip: 'Attack-Magic-56', volume: 1.2, at: 1.7 }],
      justice: [{ clip: 'Attack-Casting-51', volume: 1.5 }, { clip: 'Attack-Casting-56', volume: 1.5 }, { clip: 'Scarlet-Vox_Skill2', volume: 2.2, own: true }, { clip: 'Attack-Magic-22', volume: 1.3, at: 1.24 }, { clip: 'Attack-Magic-47', volume: 1.7, at: 1.24 }, { clip: 'Attack-Magic-03', volume: 1.2, at: 1.3 }],
      honor: [{ clip: 'Attack-Casting-51', volume: 1.5 }, { clip: 'Attack-Casting-56', volume: 1.5 }, { clip: 'Scarlet-Vox_Skill3', volume: 2.2, own: true }, { clip: 'Attack-Woosh-09', volume: 1.8, at: 0.14 }, { clip: 'Attack-Cut-05', volume: 0.85, at: 0.24 }, { clip: 'Attack-Woosh-08', volume: 1.8, at: 0.41 }, { clip: 'Attack-Cut-04', volume: 0.95, at: 0.49 }, { clip: 'Attack-Magic-36', volume: 1.7, at: 1.24 }, { clip: 'Attack-Magic-16', volume: 1.7, at: 1.24 }, { clip: 'Attack-Magic-47', volume: 1.4, at: 2.21 }, { clip: 'Attack-Magic-37', volume: 1.4, at: 2.21 }, { clip: 'Scarlet-Vox_Attack4', volume: 2.2, at: 2.4, own: true }, { clip: 'Attack-Magic-10', volume: 1.4, at: 2.44 }],
    },
    victory: [{ clip: 'Death-Sword-03', volume: 1.2, at: 0.48 }, { clip: 'Attack-Woosh-02', volume: 1.6, at: 0.88 }, { clip: 'Scarlet-Vox_Victory', volume: 2.2, at: 1.35, own: true }, { clip: 'Attack-Woosh-03', volume: 1.6, at: 1.55 }, { clip: 'Attack-Woosh-08', volume: 1.6, at: 2.27 }, { clip: 'FX-Sword-04', volume: 1.5, at: 2.37 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Scarlet.Re.Attack1.Casting1', 'Skill.Hero.Scarlet.Re.Attack1.Casting2', 'Skill.Hero.Scarlet.Re.Attack1.Casting3'], land: ['Skill.Hero.Scarlet.Re.Attack1.Hit'] },
    halt: { start: ['Skill.Hero.Scarlet.Re.Skill1.Casting', 'Skill.Hero.Scarlet.Re.Skill1.Loop'], land: ['Hit.Normal.SlashBig'] },
    justice: { start: ['Skill.Hero.Scarlet.Re.Skill2-1.Casting', 'Skill.Hero.Scarlet.Re.Skill2-2.Casting', 'Skill.Hero.Scarlet.Re.Skill2.Buff'], land: ['Skill.Hero.Scarlet.Re.Skill2.Hit1', 'Skill.Hero.Scarlet.Re.Skill2.Hit2', 'Skill.Hero.Scarlet.Re.Skill2.Debuff'] },
    honor: { start: ['Skill.Hero.Scarlet.Re.Skill3.Casting'] },
  },
  skins: [
    {
      name: 'Scarlet',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Scarlet.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Scarlet.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Scarlet.webp',
      // Its artwork (the Drive folder's): its head in the crop (the meter's close-up is its face by itself).
      portrait: { file: 'Scarlet.png', from: `${DRIVE}1Poidv32tZ3Agx1UXS9f2I_QJgQ_nnOEB`, crop: { x: 790, y: 140, size: 150 }, head: { x: 830, y: 185, size: 75 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Scarlet_Vari05_Body', 'Hero_Scarlet_Vari05_Hair'],
        // (In its right hand, where King's Raid hangs it: Point_Hand_R.)
        right: 'Hero_Scarlet_Vari05_Weapon',
      },
    },
    // King's Raid's Frozen costume (tm-costumes.mjs).
    {
      name: 'Scarlet_Frozen',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Scarlet_Frozen.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Scarlet_Frozen.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Scarlet_Frozen.webp',
      title: 'Ice Princess Scarlet',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Scarlet_Cos18Ice_Body', 'Hero_Scarlet_Cos18Ice_Hair'],
        right: 'Hero_Scarlet_Cos18Ice_Weapon',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Scarlet_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Scarlet_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Scarlet_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Scarlet_Summer.webp',
      title: 'Beachside Scarlet',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Scarlet_Cos18Summer_Body', 'Hero_Scarlet_Cos18Summer_Hair'],
        right: 'Hero_Scarlet_Cos18Summer_Weapon',
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Scarlet_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Scarlet_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Scarlet_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Scarlet_Wedding.webp',
      title: 'March of Silver Scarlet',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Scarlet_Cos18Wedding_Body', 'Hero_Scarlet_Cos18Wedding_Hair'],
        right: 'Hero_Scarlet_Cos18Wedding_Weapon',
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Scarlet_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Scarlet_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Scarlet_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Scarlet_Halloween.webp',
      title: 'March Hare Scarlet',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Scarlet_Cos18Halloween_Body', 'Hero_Scarlet_Cos18Halloween_Hair'],
        right: 'Hero_Scarlet_Cos18Halloween_Weapon',
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Scarlet_Glory',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Scarlet_Glory.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Scarlet_Glory.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Scarlet_Glory.webp',
      title: 'Scarlet of Honor',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        attack: { start: ['Skill.Hero.ScarletCos19GloryLague.Re.Attack1.Casting1', 'Skill.Hero.ScarletCos19GloryLague.Re.Attack1.Casting2', 'Skill.Hero.ScarletCos19GloryLague.Re.Attack1.Casting3'], land: ['Skill.Hero.ScarletCos19GloryLague.Re.Attack1.Hit'] },
        halt: { start: ['Skill.Hero.ScarletCos19GloryLague.Re.Skill1.Casting', 'Skill.Hero.ScarletCos19GloryLague.Re.Skill1.Loop'], land: ['Hit.Normal.SlashBig'] },
        justice: { start: ['Skill.Hero.ScarletCos19GloryLague.Re.Skill2-1.Casting', 'Skill.Hero.ScarletCos19GloryLague.Re.Skill2-2.Casting', 'Skill.Hero.ScarletCos19GloryLague.Re.Skill2.Buff'], land: ['Skill.Hero.ScarletCos19GloryLague.Re.Skill2.Hit1', 'Skill.Hero.ScarletCos19GloryLague.Re.Skill2.Hit2', 'Skill.Hero.Scarlet.Re.Skill2.Debuff'] },
        honor: { start: ['Skill.Hero.ScarletCos19GloryLague.Re.Skill3.Casting'] },
      },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Scarlet_Cos19GloryLeague_Body', 'Hero_Scarlet_Hair_03'],
        right: 'Hero_Scarlet_Cos19GloryLeague_Weapon',
      },
    },
    // King's Raid's School costume (tm-costumes.mjs).
    {
      name: 'Scarlet_School',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Scarlet_School.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Scarlet_School.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Scarlet_School.webp',
      title: 'Band Member Scarlet',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Scarlet_Cos20SL_Body', 'Hero_Scarlet_Hair_04'],
        right: 'Hero_Scarlet_Cos20SL_Weapon',
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Scarlet_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Scarlet_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Scarlet_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Scarlet_Christmas.webp',
      title: "Forest's Grace Scarlet",
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Scarlet_Cos21Christmas_Body', 'Hero_Scarlet_Cos21Christmas_Hair'],
        right: 'Hero_Scarlet_Cos21Christmas_Weapon',
      },
    },
    // Its Glory League costume's Brilliant Honor tier: the same model, wearing its effects (tm-glory.mjs).
    {
      name: 'Scarlet_Glory2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Scarlet_Glory2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Scarlet_Glory2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Scarlet_Glory2.webp',
      title: 'Scarlet of Brilliant Honor',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        attack: { start: ['Skill.Hero.ScarletCos19GloryLague.Re.Attack1.Casting1', 'Skill.Hero.ScarletCos19GloryLague.Re.Attack1.Casting2', 'Skill.Hero.ScarletCos19GloryLague.Re.Attack1.Casting3'], land: ['Skill.Hero.ScarletCos19GloryLague.Re.Attack1.Hit'] },
        halt: { start: ['Skill.Hero.ScarletCos19GloryLague.Re.Skill1.Casting', 'Skill.Hero.ScarletCos19GloryLague.Re.Skill1.Loop'], land: ['Hit.Normal.SlashBig'] },
        justice: { start: ['Skill.Hero.ScarletCos19GloryLague.Re.Skill2-1.Casting', 'Skill.Hero.ScarletCos19GloryLague.Re.Skill2-2.Casting', 'Skill.Hero.ScarletCos19GloryLague.Re.Skill2.Buff'], land: ['Skill.Hero.ScarletCos19GloryLague.Re.Skill2.Hit1', 'Skill.Hero.ScarletCos19GloryLague.Re.Skill2.Hit2', 'Skill.Hero.Scarlet.Re.Skill2.Debuff'] },
        honor: { start: ['Skill.Hero.ScarletCos19GloryLague.Re.Skill3.Casting'] },
      },
      // What King's Raid keeps on it all the while.
      wears: ['Skill.Hero.ScarletCos19GloryLague.Cos19GloryLeague'],
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Scarlet_Cos19GloryLeague_Body', 'Hero_Scarlet_Hair_03'],
        right: 'Hero_Scarlet_Cos19GloryLeague_Weapon',
      },
    },
    // Its Glory League costume's Glaring Honor tier: the same model, wearing its effects (tm-glory.mjs).
    {
      name: 'Scarlet_Glory3',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Scarlet_Glory3.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Scarlet_Glory3.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Scarlet_Glory3.webp',
      title: 'Scarlet of Glaring Honor',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        attack: { start: ['Skill.Hero.ScarletCos19GloryLague.Re.Attack1.Casting1', 'Skill.Hero.ScarletCos19GloryLague.Re.Attack1.Casting2', 'Skill.Hero.ScarletCos19GloryLague.Re.Attack1.Casting3'], land: ['Skill.Hero.ScarletCos19GloryLague.Re.Attack1.Hit'] },
        halt: { start: ['Skill.Hero.ScarletCos19GloryLague.Re.Skill1.Casting', 'Skill.Hero.ScarletCos19GloryLague.Re.Skill1.Loop'], land: ['Hit.Normal.SlashBig'] },
        justice: { start: ['Skill.Hero.ScarletCos19GloryLague.Re.Skill2-1.Casting', 'Skill.Hero.ScarletCos19GloryLague.Re.Skill2-2.Casting', 'Skill.Hero.ScarletCos19GloryLague.Re.Skill2.Buff'], land: ['Skill.Hero.ScarletCos19GloryLague.Re.Skill2.Hit1', 'Skill.Hero.ScarletCos19GloryLague.Re.Skill2.Hit2', 'Skill.Hero.Scarlet.Re.Skill2.Debuff'] },
        honor: { start: ['Skill.Hero.ScarletCos19GloryLague.Re.Skill3.Casting'] },
      },
      // What King's Raid keeps on it all the while.
      wears: ['Skill.Hero.ScarletCos19GloryLague.Cos19GloryLeague', 'Skill.Hero.ScarletCos19GloryLague.Light'],
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Scarlet_Cos19GloryLeague_Body', 'Hero_Scarlet_Hair_03'],
        right: 'Hero_Scarlet_Cos19GloryLeague_Weapon',
      },
    },
    // Its Glory League costume's Eternal Honor tier: the same model, wearing its effects (tm-glory.mjs).
    {
      name: 'Scarlet_Glory4',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Scarlet_Glory4.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Scarlet_Glory4.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Scarlet_Glory4.webp',
      title: 'Scarlet of Eternal Honor',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        attack: { start: ['Skill.Hero.ScarletCos19GloryLague.Re.Attack1.Casting1', 'Skill.Hero.ScarletCos19GloryLague.Re.Attack1.Casting2', 'Skill.Hero.ScarletCos19GloryLague.Re.Attack1.Casting3'], land: ['Skill.Hero.ScarletCos19GloryLague.Re.Attack1.Hit'] },
        halt: { start: ['Skill.Hero.ScarletCos19GloryLague.Re.Skill1.Casting', 'Skill.Hero.ScarletCos19GloryLague.Re.Skill1.Loop'], land: ['Hit.Normal.SlashBig'] },
        justice: { start: ['Skill.Hero.ScarletCos19GloryLague.Re.Skill2-1.Casting', 'Skill.Hero.ScarletCos19GloryLague.Re.Skill2-2.Casting', 'Skill.Hero.ScarletCos19GloryLague.Re.Skill2.Buff'], land: ['Skill.Hero.ScarletCos19GloryLague.Re.Skill2.Hit1', 'Skill.Hero.ScarletCos19GloryLague.Re.Skill2.Hit2', 'Skill.Hero.Scarlet.Re.Skill2.Debuff'] },
        honor: { start: ['Skill.Hero.ScarletCos19GloryLague.Re.Skill3.Casting'] },
      },
      // What King's Raid keeps on it all the while.
      wears: ['Skill.Hero.ScarletCos19GloryLague.Cos19GloryLeague', 'Skill.Hero.ScarletCos19GloryLague.Light'],
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Scarlet_Cos19GloryLeague_Body', 'Hero_Scarlet_Hair_03'],
        right: 'Hero_Scarlet_Cos19GloryLeague_Weapon',
      },
    },
  ],
};
