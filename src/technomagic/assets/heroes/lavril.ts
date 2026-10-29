import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Lavril, the Priestess of the Void (Hero_Lavril_…): her body, hair and her weapon on her own skeleton, as King's Raid's own model has them. She is
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
  attack: [{ clips: ['Attack1'], hits: [1] }],
  skills: {
    shoo: { clips: ['Skill1'], hits: [1] },
    bear: { clips: ['Skill2'], hits: [1.9] },
    alone: { clips: ['Skill3'], hits: [2.7] },
    scare: { clips: ['Skill2'], hits: [1.9] },
  },
} as const satisfies KrAnimations;

export const LAVRIL_ASSETS: HeroAssets = {
  name: 'Lavril',
  folder: 'heroes/lavril',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/51/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded.
  unique: { Hero_Lavril_Vari05_Weapon: 'Hero_Lavril_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Lavril.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_magic_01', volume: 1.5 }], [{ clip: 'Hit_magic_01', volume: 1.5 }]],
      shoo: [[{ clip: 'Hit_magic_02', volume: 2 }]],
      bear: [[{ clip: 'Hit_magic_03', volume: 2 }], [{ clip: 'Hit_magic_04', volume: 2 }]],
      alone: [[{ clip: 'Hit_gun_01', volume: 2 }]],
      scare: [[{ clip: 'Hit_magic_03', volume: 2 }], [{ clip: 'Hit_magic_04', volume: 2 }]],
    },
    casts: {
      shoo: [{ clip: 'Attack-Casting-81', volume: 1.1 }, { clip: 'Lavril-Vox_Skill1', volume: 2, own: true }, { clip: 'Attack-Magic-77', volume: 1.1, at: 0.733 }],
      bear: [{ clip: 'Attack-Casting-82', volume: 1.9 }, { clip: 'Lavril-Vox_Skill2', volume: 2.4, own: true }, { clip: 'Attack-Magic-78', volume: 1.9, at: 1.917 }],
      alone: [{ clip: 'Attack-Casting-83', volume: 1.9 }, { clip: 'Lavril-Vox_Skill4', volume: 2.4, own: true }, { clip: 'Attack-Magic-80', volume: 1.9, at: 2.383 }],
      scare: [{ clip: 'Attack-Casting-82', volume: 1.9 }, { clip: 'Lavril-Vox_Skill3', volume: 2.2, own: true }, { clip: 'Attack-Magic-79', volume: 1.9, at: 1.9 }],
    },
    victory: [{ clip: 'Attack-Casting-85', volume: 1.2 }, { clip: 'Lavril-Vox_Victory', volume: 2, own: true }, { clip: '103_Cloth', volume: 1.2, at: 0.233 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs; Bear Up...!'s and You Scare Me...!'s split by hand: Skill2-1 and Skill2-2).
  vfx: {
    attack: { start: ['Skill.Hero.Lavril.Attack1.Casting'], land: ['Skill.Hero.Lavril.Attack1.Projectile', 'Skill.Hero.Lavril.Attack1.Hit'] },
    shoo: { start: ['Skill.Hero.Lavril.Skill1.Casting', 'Skill.Hero.Lavril.Skill1.Loop'], land: ['Skill.Hero.Lavril.Skill1.Projectile', 'Skill.Hero.Lavril.Skill1.Hit'] },
    bear: { start: ['Skill.Hero.Lavril.Skill2-1.Casting', 'Skill.Hero.Lavril.Skill2-1.Loop'], land: ['Skill.Hero.Lavril.Skill2-1.Projectile', 'Skill.Hero.Lavril.Skill2-1.Hit'] },
    scare: { start: ['Skill.Hero.Lavril.Skill2-2.Casting', 'Skill.Hero.Lavril.Skill2-2.Debuff', 'Skill.Hero.Lavril.Skill2-2.Loop'], land: ['Skill.Hero.Lavril.Skill2-2.Hit', 'Skill.Hero.Lavril.Skill2-2.Projectile'] },
    alone: { start: ['Skill.Hero.Lavril.Skill3.Loop', 'Skill.Hero.Lavril.Skill3.Casting'], land: ['Skill.Hero.Lavril.Skill3.Projectile'] },
  },
  skins: [
    {
      name: 'Lavril',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lavril.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lavril.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lavril.webp',
      // Her artwork (the Drive folder's): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Lavril.png', from: `${DRIVE}1Q_WvLfg2OY851RjHqjr8l567dDUIr6Ua`, crop: { x: 358, y: 430, size: 220 }, head: { x: 435, y: 529, size: 120 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lavril_Vari05_Body', 'Hero_Lavril_Vari05_Hair', 'Hero_Lavril_Vari05_Weapon'],
      },
    },
    // King's Raid's NewYear costume (tm-costumes.mjs).
    {
      name: 'Lavril_NewYear',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lavril_NewYear.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lavril_NewYear.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lavril_NewYear.webp',
      title: 'Hanbok Lavril',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lavril_Cos19NewYear_Body', 'Hero_Lavril_Cos19NewYear_Hair', 'Hero_Lavril_Cos19NewYear_Weapon'],
      },
    },
    // King's Raid's UserPick costume (tm-costumes.mjs).
    {
      name: 'Lavril_UserPick',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lavril_UserPick.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lavril_UserPick.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lavril_UserPick.webp',
      title: 'Night of Carrot-filled Dreams Lavril',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lavril_Cos19UserPick_Body', 'Hero_Lavril_Cos19UserPick_Hair', 'Hero_Lavril_Cos19UserPick_Weapon'],
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Lavril_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lavril_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lavril_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lavril_Summer.webp',
      title: 'Beachside Lavril',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lavril_Cos19Summer_Body', 'Hero_Lavril_Cos19Summer_Hair', 'Hero_Lavril_Cos19Summer_Weapon'],
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Lavril_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lavril_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lavril_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lavril_Christmas.webp',
      title: 'Christmas of a Ghost Lavril',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lavril_Cos19Christmas_Body', 'Hero_Lavril_Cos19Christmas_Hair', 'Hero_Lavril_Cos19Christmas_Weapon'],
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Lavril_Glory',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lavril_Glory.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lavril_Glory.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lavril_Glory.webp',
      title: 'Lavril of Honor (Call of Dawn)',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        attack: { start: ['Skill.Hero.LavrilCos20GloryLeague.Attack1.Casting'], land: ['Skill.Hero.LavrilCos20GloryLeague.Attack1.Projectile', 'Skill.Hero.LavrilCos20GloryLeague.Attack1.Hit'] },
        shoo: { start: ['Skill.Hero.LavrilCos20GloryLeague.Skill1.Casting', 'Skill.Hero.LavrilCos20GloryLeague.Skill1.Loop'], land: ['Skill.Hero.LavrilCos20GloryLeague.Skill1.Projectile', 'Skill.Hero.LavrilCos20GloryLeague.Skill1.Hit'] },
        bear: { start: ['Skill.Hero.LavrilCos20GloryLeague.Skill2-1.Casting', 'Skill.Hero.LavrilCos20GloryLeague.Skill2-1.Loop'], land: ['Skill.Hero.LavrilCos20GloryLeague.Skill2-1.Projectile', 'Skill.Hero.LavrilCos20GloryLeague.Skill2-1.Hit'] },
        scare: { start: ['Skill.Hero.LavrilCos20GloryLeague.Skill2-2.Casting', 'Skill.Hero.Lavril.Skill2-2.Debuff', 'Skill.Hero.LavrilCos20GloryLeague.Skill2-2.Loop'], land: ['Skill.Hero.LavrilCos20GloryLeague.Skill2-2.Hit', 'Skill.Hero.LavrilCos20GloryLeague.Skill2-2.Projectile'] },
        alone: { start: ['Skill.Hero.LavrilCos20GloryLeague.Skill3.Loop', 'Skill.Hero.LavrilCos20GloryLeague.Skill3.Casting'], land: ['Skill.Hero.LavrilCos20GloryLeague.Skill3.Projectile'] },
      },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lavril_Cos20GloryLeague1_Body', 'Hero_Lavril_Cos20GloryLeague_Hair', 'Hero_Lavril_Cos20GloryLeague1_Weapon'],
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Lavril_Glory2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lavril_Glory2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lavril_Glory2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lavril_Glory2.webp',
      title: 'Lavril of Glaring Honor (Call of Dawn)',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        attack: { start: ['Skill.Hero.LavrilCos20GloryLeague.Attack1.Casting'], land: ['Skill.Hero.LavrilCos20GloryLeague.Attack1.Projectile', 'Skill.Hero.LavrilCos20GloryLeague.Attack1.Hit'] },
        shoo: { start: ['Skill.Hero.LavrilCos20GloryLeague.Skill1.Casting', 'Skill.Hero.LavrilCos20GloryLeague.Skill1.Loop'], land: ['Skill.Hero.LavrilCos20GloryLeague.Skill1.Projectile', 'Skill.Hero.LavrilCos20GloryLeague.Skill1.Hit'] },
        bear: { start: ['Skill.Hero.LavrilCos20GloryLeague.Skill2-1.Casting', 'Skill.Hero.LavrilCos20GloryLeague.Skill2-1.Loop'], land: ['Skill.Hero.LavrilCos20GloryLeague.Skill2-1.Projectile', 'Skill.Hero.LavrilCos20GloryLeague.Skill2-1.Hit'] },
        scare: { start: ['Skill.Hero.LavrilCos20GloryLeague.Skill2-2.Casting', 'Skill.Hero.Lavril.Skill2-2.Debuff', 'Skill.Hero.LavrilCos20GloryLeague.Skill2-2.Loop'], land: ['Skill.Hero.LavrilCos20GloryLeague.Skill2-2.Hit', 'Skill.Hero.LavrilCos20GloryLeague.Skill2-2.Projectile'] },
        alone: { start: ['Skill.Hero.LavrilCos20GloryLeague.Skill3.Loop', 'Skill.Hero.LavrilCos20GloryLeague.Skill3.Casting'], land: ['Skill.Hero.LavrilCos20GloryLeague.Skill3.Projectile'] },
      },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lavril_Cos20GloryLeague2_Body', 'Hero_Lavril_Cos20GloryLeague_Hair', 'Hero_Lavril_Cos20GloryLeague2_Weapon'],
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Lavril_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lavril_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lavril_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lavril_Halloween.webp',
      title: 'Ghost of Halloween Night Lavril',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lavril_Cos20Halloween_Body', 'Hero_Lavril_Cos20Halloween_Hair', 'Hero_Lavril_Cos20Halloween_Weapon'],
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Lavril_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lavril_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lavril_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lavril_Wedding.webp',
      title: 'Adorable Petit Dégagé Lavril',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lavril_Cos21Wedding_Body', 'Hero_Lavril_Cos21Wedding_Hair', 'Hero_Lavril_Cos21Wedding_Weapon'],
      },
    },
  ],
};
