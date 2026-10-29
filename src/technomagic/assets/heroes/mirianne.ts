import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Mirianne, the Assassin of the Rose (Hero_Mirianne_…): her body and hair, and her weapon in her right hand, as King's Raid's own model has them. She is
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
  attack: [{ clips: ['Attack1-1'], hits: [0.4] }, { clips: ['Attack1-2'], hits: [0.2] }, { clips: ['Attack1-3'], hits: [0.4] }, { clips: ['Attack1-4'], hits: [0.5] }],
  skills: {
    lockon: { clips: ['Skill1'], hits: [1.4, 1.7, 2] },
    restrain: { clips: ['Skill2-1', 'Skill2-2'], hits: [1.1] },
    assassinate: { clips: ['Skill3-1', 'Skill3-2', 'Skill3-3'], hits: [2, 2.1] },
  },
} as const satisfies KrAnimations;

export const MIRIANNE_ASSETS: HeroAssets = {
  name: 'Mirianne',
  folder: 'heroes/mirianne',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/62/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded.
  unique: { Hero_Mirianne_Vari05_Weapon: 'Hero_Mirianne_Unique01_Weapon', Hero_Mirianne_Vari05_Handle: 'Hero_Mirianne_Unique01_Handle' },
  // King's Raid's sounds (its Hit.Hero.Mirianne.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_bow_01', volume: 1.5 }]],
      lockon: [[{ clip: 'Hit_bow_03', volume: 2 }]],
      restrain: [[{ clip: 'Hit_bow_02', volume: 2 }]],
      assassinate: [[{ clip: 'Hit_fire_03', volume: 2 }]],
    },
    casts: {
      lockon: [{ clip: 'Attack-Casting-03', volume: 1.2 }, { clip: 'Attack-Casting-04', volume: 1.2 }, { clip: 'Mirianne-Vox_Skill1', volume: 2.2, own: true }, { clip: 'Attack-Magic-61', volume: 1.8, at: 1.23 }, { clip: 'Attack-Magic-61', volume: 1.8, at: 1.54 }, { clip: 'Attack-Magic-61', volume: 1.8, at: 1.86 }],
      restrain: [{ clip: 'Attack-Casting-16', volume: 1.6 }, { clip: 'Mirianne-Vox_Skill2', volume: 2.2, own: true }, { clip: 'Attack-Jump-01', volume: 1.5, at: 0.13 }, { clip: 'Attack-Magic-62', volume: 1.8, at: 0.64 }, { clip: 'FX-Sword-01', volume: 1.2, at: 1.13 }, { clip: 'FX-Sword-03', volume: 1.5, at: 1.21 }],
      assassinate: [{ clip: 'Attack-Casting-04', volume: 1.5 }, { clip: 'Mirianne-Vox_Skill3', volume: 2.2, own: true }, { clip: 'Attack-Casting-03', volume: 1.5, at: 0.59 }, { clip: 'Attack-Magic-36', volume: 1.8, at: 1.83 }, { clip: 'Attack-Magic-37', volume: 1.8, at: 2.01 }],
    },
    victory: [{ clip: 'Mirianne-Vox_Victory', volume: 2.2, own: true }, { clip: 'Attack-Action-01', volume: 1.4, at: 0.43 }, { clip: 'Attack-Action-01', volume: 1.4, at: 1.86 }, { clip: 'Attack-Action-02', volume: 1.5, at: 2.18 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    lockon: { land: ['Skill.Hero.Mirianne.HitLoop'] },
  },
  skins: [
    {
      name: 'Mirianne',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Mirianne.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Mirianne.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Mirianne.webp',
      // Her artwork (the Drive folder's): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Mirianne.png', from: `${DRIVE}1IE9t1-E4WCBerDzM4s3D3KBE06m5bac2`, crop: { x: 455, y: 80, size: 190 }, head: { x: 454, y: 135, size: 110 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Mirianne_Vari05_Body', 'Hero_Mirianne_Vari05_Hair', 'Hero_Mirianne_Vari05_Weapon'],
        right: 'Hero_Mirianne_Vari05_Handle',
      },
    },
    // King's Raid's Frozen costume (tm-costumes.mjs).
    {
      name: 'Mirianne_Frozen',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Mirianne_Frozen.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Mirianne_Frozen.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Mirianne_Frozen.webp',
      title: 'Ice Assassin Mirianne',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Mirianne_Cos18Frozen_Body', 'Hero_Mirianne_Vari05_Hair', 'Hero_Mirianne_Cos18Frozen_Weapon'],
        right: 'Hero_Mirianne_Cos18Frozen_Handle',
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Mirianne_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Mirianne_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Mirianne_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Mirianne_Wedding.webp',
      title: 'Pure Heart Mirianne',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Mirianne_Cos18Wedding_Body', 'Hero_Mirianne_Cos18Wedding_Hair', 'Hero_Mirianne_Cos18Wedding_Weapon'],
        right: 'Hero_Mirianne_Vari05_Handle',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Mirianne_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Mirianne_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Mirianne_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Mirianne_Summer.webp',
      title: 'Beachside Mirianne',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Mirianne_Cos18Summer_Body', 'Hero_Mirianne_Cos18Summer_Hair', 'Hero_Mirianne_Cos18Summer_Weapon'],
        right: 'Hero_Mirianne_Vari05_Handle',
      },
    },
    // King's Raid's Maid costume (tm-costumes.mjs).
    {
      name: 'Mirianne_Maid',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Mirianne_Maid.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Mirianne_Maid.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Mirianne_Maid.webp',
      title: 'Butler Mirianne',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Mirianne_Cos18Maid_Body', 'Hero_Mirianne_Vari05_Hair', 'Hero_Mirianne_Cos18Maid_Weapon'],
        right: 'Hero_Mirianne_Cos18Maid_Handle',
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Mirianne_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Mirianne_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Mirianne_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Mirianne_Christmas.webp',
      title: 'Rudolph Mirianne',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Mirianne_Cos18Christmas_Body', 'Hero_Mirianne_Cos18Christmas_Hair', 'Hero_Mirianne_Cos18Christmas_Weapon'],
        right: 'Hero_Mirianne_Cos18Christmas_Handle',
      },
    },
    // King's Raid's UserPick costume (tm-costumes.mjs).
    {
      name: 'Mirianne_UserPick',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Mirianne_UserPick.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Mirianne_UserPick.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Mirianne_UserPick.webp',
      title: "Sunflower's Scent Mirianne",
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Mirianne_Cos19UserPick02_Body', 'Hero_Mirianne_Cos19UserPick02_Hair', 'Hero_Mirianne_Cos19UserPick02_Weapon'],
        right: 'Hero_Mirianne_Vari05_Handle',
      },
    },
    // King's Raid's UserPick costume (tm-costumes.mjs).
    {
      name: 'Mirianne_UserPick1',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Mirianne_UserPick1.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Mirianne_UserPick1.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Mirianne_UserPick1.webp',
      title: 'Fallen Mirianne',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Mirianne_Cos19UserPick01_Body', 'Hero_Mirianne_Cos19UserPick01_Hair', 'Hero_Mirianne_Cos19UserPick01_Weapon'],
        right: 'Hero_Mirianne_Vari05_Handle',
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Mirianne_Glory',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Mirianne_Glory.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Mirianne_Glory.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Mirianne_Glory.webp',
      title: 'Mirianne of Honor',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        lockon: { land: ['Skill.Hero.Mirianne19GloryLeague.HitLoop'] },
      },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Mirianne_Cos19GloryLeague_Body', 'Hero_Mirianne_Cos19GloryLeague_Hair', 'Hero_Mirianne_Cos19GloryLeague_Weapon'],
        right: 'Hero_Mirianne_Vari05_Handle',
      },
    },
    // King's Raid's School costume (tm-costumes.mjs).
    {
      name: 'Mirianne_School',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Mirianne_School.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Mirianne_School.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Mirianne_School.webp',
      title: 'Secretary Mirianne',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Mirianne_Cos20SL_Body', 'Hero_Mirianne_Cos20SL_Hair', 'Hero_Mirianne_Cos20SL_Weapon'],
        right: 'Hero_Mirianne_Vari05_Handle',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Mirianne_Summer21',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Mirianne_Summer21.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Mirianne_Summer21.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Mirianne_Summer21.webp',
      title: 'Beachside Mirianne',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Mirianne_Cos21Summer_Body', 'Hero_Mirianne_Hair_01', 'Hero_Mirianne_Cos21Summer_Weapon'],
        right: 'Hero_Mirianne_Vari05_Handle',
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Mirianne_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Mirianne_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Mirianne_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Mirianne_Halloween.webp',
      title: 'Swift Treatster Mirianne',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Mirianne_Cos21Halloween_Body', 'Hero_Mirianne_Cos21Halloween_Hair', 'Hero_Mirianne_Cos21Halloween_Weapon'],
        right: 'Hero_Mirianne_Cos21Halloween_Handle',
      },
    },
    // Its Glory League costume's Brilliant Honor tier: the same model, wearing its effects (tm-glory.mjs).
    {
      name: 'Mirianne_Glory2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Mirianne_Glory2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Mirianne_Glory2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Mirianne_Glory2.webp',
      title: 'Mirianne of Brilliant Honor',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        lockon: { land: ['Skill.Hero.Mirianne19GloryLeague.HitLoop'] },
      },
      // What King's Raid keeps on it all the while.
      wears: ['Skill.Hero.Mirianne19GloryLeague.Cos19GloryLeagueParts'],
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Mirianne_Cos19GloryLeague_Body', 'Hero_Mirianne_Cos19GloryLeague_Hair', 'Hero_Mirianne_Cos19GloryLeague_Weapon'],
        right: 'Hero_Mirianne_Vari05_Handle',
      },
    },
    // Its Glory League costume's Glaring Honor tier: the same model, wearing its effects (tm-glory.mjs).
    {
      name: 'Mirianne_Glory3',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Mirianne_Glory3.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Mirianne_Glory3.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Mirianne_Glory3.webp',
      title: 'Mirianne of Glaring Honor',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        lockon: { land: ['Skill.Hero.Mirianne19GloryLeague.HitLoop'] },
      },
      // What King's Raid keeps on it all the while.
      wears: ['Skill.Hero.Mirianne19GloryLeague.Cos19GloryLeagueLight', 'Skill.Hero.Mirianne19GloryLeague.Cos19GloryLeagueParts'],
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Mirianne_Cos19GloryLeague_Body', 'Hero_Mirianne_Cos19GloryLeague_Hair', 'Hero_Mirianne_Cos19GloryLeague_Weapon'],
        right: 'Hero_Mirianne_Vari05_Handle',
      },
    },
    // Its Glory League costume's Eternal Honor tier: the same model, wearing its effects (tm-glory.mjs).
    {
      name: 'Mirianne_Glory4',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Mirianne_Glory4.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Mirianne_Glory4.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Mirianne_Glory4.webp',
      title: 'Mirianne of Eternal Honor',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        lockon: { land: ['Skill.Hero.Mirianne19GloryLeague.HitLoop'] },
      },
      // What King's Raid keeps on it all the while.
      wears: ['Skill.Hero.Mirianne19GloryLeague.Cos19GloryLeagueLight', 'Skill.Hero.Mirianne19GloryLeague.Cos19GloryLeagueParts', 'Skill.Hero.Mirianne19GloryLeague.Cos19GloryLeagueWeapon'],
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Mirianne_Cos19GloryLeague_Body', 'Hero_Mirianne_Cos19GloryLeague_Hair', 'Hero_Mirianne_Cos19GloryLeague_Weapon'],
        right: 'Hero_Mirianne_Vari05_Handle',
      },
    },
  ],
};
