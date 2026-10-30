import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Hilda, Spear of Dawn (Hero_Hilda_Vari05…): as King's Raid's own model has it, moved by King's Raid's
 * own animations of it (ANIMATIONS: ../../heroes/body/kr.ts).
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
  attack: [{ clips: ['Attack1-1'], hits: [0.3, 0.8] }, { clips: ['Attack1-2'], hits: [0.4] }, { clips: ['Attack1-3'], hits: [0.2, 0.4, 0.6, 0.8, 1.6] }],
  skills: {
    whirlwind: { clips: ['Skill1-1', 'Skill1-2', 'Skill1-2', 'Skill1-2', 'Skill1-2', 'Skill1-3'], hits: [2.3, 2.6, 2.9, 3.2, 3.5, 3.8, 4.1, 4.4, 4.7, 5, 5.3, 5.6] },
    voidstrike: { clips: ['Skill3'], hits: [2.3] },
    untranscend: { clips: ['Skill2-2'], hits: [] },
    voidattack: { clips: ['Attack2-1', 'Attack2-2', 'Attack2-3', 'Attack2-4', 'Attack2-5'], hits: [0.3, 0.9, 2, 2.6, 3.4, 3.9, 4.5, 5, 6] },
    transcend: { clips: ['Skill2'], hits: [1.6] },
  },
} as const satisfies KrAnimations;

export const HILDA_ASSETS: HeroAssets = {
  name: 'Hilda',
  folder: 'heroes/hilda',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/91/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Its unique weapon, wielded.
  unique: { Hero_Hilda_Vari05_Weapon: 'Hero_Hilda_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Hilda.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Dmg-swd-01', volume: 1.8, at: 0.01 }], [{ clip: 'Dmg-swd-02', volume: 1.8, at: 0.01 }], [{ clip: 'Dmg-swd-01', volume: 1.8, at: 0.01 }], [{ clip: 'Dmg-swd-03', volume: 1.8, at: 0.01 }], [{ clip: 'Dmg-Sword-01', volume: 1.8, at: 0.01 }], [{ clip: 'Dmg-swd-03', volume: 1.8, at: 0.01 }], [{ clip: 'Dmg-Sword-01', volume: 1.8, at: 0.01 }]],
      whirlwind: [[{ clip: 'Hit_sword_01', volume: 2, at: 0.01 }]],
      transcend: [[{ clip: 'Hit_sword_02', volume: 2, at: 0.01 }]],
      voidstrike: [[{ clip: 'Hit_elect_02', volume: 2, at: 0.01 }]],
      untranscend: [[{ clip: 'Hit_sword_02', volume: 2, at: 0.01 }]],
      voidattack: [[{ clip: 'Hit_sword_02', volume: 2, at: 0.01 }]],
    },
    casts: {
      whirlwind: [{ clip: 'Hilda-Vox_Skill2', volume: 3, at: 0.138, own: true }, { clip: 'Cast-10', volume: 2.7, at: 0.269 }, { clip: 'Swd-fx-01', volume: 2.7, at: 0.91 }, { clip: 'Magic-swd-wind-01', volume: 2.7, at: 1.639 }, { clip: 'Swd-06', volume: 2.7, at: 5.991 }],
      transcend: [{ clip: 'Hilda-Vox_Skill4_b', volume: 3, at: 0.077, own: true }, { clip: 'Magic-swd-01', volume: 2.7, at: 0.077 }, { clip: 'Magic-swd-02', volume: 2.7, at: 1.37 }, { clip: 'Magic-swd-03', volume: 2.7, at: 2.174 }],
      voidstrike: [{ clip: 'Hilda-Vox_Skill6', volume: 3, at: 0.238, own: true }, { clip: 'Magic-swd-04', volume: 2.7, at: 0.238 }, { clip: 'Magic-swd-05', volume: 2.7, at: 0.733 }, { clip: 'Cast-11', volume: 2.7, at: 1.239 }, { clip: 'Magic-swd-06', volume: 2.7, at: 2.266 }],
      voidattack: [{ clip: 'Swish-05', volume: 2.7, at: 0.011 }],
    },
    victory: [{ clip: 'Texture-05', volume: 2, at: 0.3 }, { clip: 'Hilda-Vox_Victory', volume: 3, at: 0.367, own: true }, { clip: 'Flap-02', volume: 2.2, at: 1.867 }, { clip: 'Texture-03', volume: 2.8, at: 3.067 }, { clip: 'Texture-07', volume: 2.8, at: 4.133 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Hilda.Attack1.Casting', 'Skill.Hero.Hilda.Attack1-2.Casting', 'Skill.Hero.Hilda.Attack1-3.Casting', 'Skill.Hero.Hilda.Attack1-1.Casting'] },
    whirlwind: { start: ['Skill.Hero.Hilda.Skill1.Casting', 'Skill.Hero.Hilda.Skill1.Loop'] },
    voidstrike: { start: ['Skill.Hero.Hilda.Skill3.Casting'] },
    untranscend: { start: ['Skill.Hero.Hilda.Skill2.Casting', 'Skill.Hero.Hilda.Skill2.Loop'] },
    voidattack: { start: ['Skill.Hero.Hilda.Attack2-5.Casting', 'Skill.Hero.Hilda.Attack2-2.Casting', 'Skill.Hero.Hilda.Attack2.Casting', 'Skill.Hero.Hilda.Attack2-3.Casting', 'Skill.Hero.Hilda.Attack2-1.Casting', 'Skill.Hero.Hilda.Attack2-4.Casting'] },
    transcend: { start: ['Skill.Hero.Hilda.Skill2.Casting', 'Skill.Hero.Hilda.Skill2.Loop'] },
  },
  skins: [
    {
      name: 'Hilda',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Hilda.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Hilda.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Hilda.webp',
      // Her artwork (krinfo.net's; the Drive folder has none of her): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Hilda.png', from: 'https://krinfo.net/kingsraid-data/assets/heroes/Hilda/cos/Basic.png', crop: { x: 640, y: 135, size: 150 }, head: { x: 665, y: 190, size: 75 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Hilda_Vari05_Body', 'Hero_Hilda_Hair_01'],
        // (In its right hand, where King's Raid hangs it: Point_Hand_R.)
        right: 'Hero_Hilda_Vari05_Weapon',
      },
    },
    // King's Raid's Advance costume (tm-costumes.mjs).
    {
      name: 'Hilda_Advance',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Hilda_Advance.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Hilda_Advance.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Hilda_Advance.webp',
      title: 'Dream of Dawn Hilda',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Hilda_Cos20Advance_Body', 'Hero_Hilda_Cos20Advance_Hair'],
        right: 'Hero_Hilda_Cos20Advance_Weapon',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Hilda_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Hilda_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Hilda_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Hilda_Summer.webp',
      title: 'Beachside Hilda',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Hilda_Cos20Summer_Body', 'Hero_Hilda_Cos20Summer_Hair'],
        right: 'Hero_Hilda_Cos20Summmer_Weapon',
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Hilda_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Hilda_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Hilda_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Hilda_Halloween.webp',
      title: 'Princess of the Night Hilda',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Hilda_Cos20Halloween_Body', 'Hero_Hilda_Cos20Halloween_Hair'],
        right: 'Hero_Hilda_Cos20Halloween_Weapon',
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Hilda_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Hilda_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Hilda_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Hilda_Wedding.webp',
      title: 'Romance of Dawn Hilda',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Hilda_Cos21Wedding_Body', 'Hero_Hilda_Cos21Wedding_Hair'],
        right: 'Hero_Hilda_Cos21Wedding_Weapon',
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Hilda_Glory',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Hilda_Glory.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Hilda_Glory.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Hilda_Glory.webp',
      title: 'Hilda of Honor (Mythic Divine Beast)',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        attack: { start: ['Skill.Hero.Hilda.Attack1.Casting', 'Skill.Hero.HildaCos21GloryLeague.Attack1-2.Casting', 'Skill.Hero.HildaCos21GloryLeague.Attack1-3.Casting', 'Skill.Hero.HildaCos21GloryLeague.Attack1-1.Casting'] },
        whirlwind: { start: ['Skill.Hero.HildaCos21GloryLeague.Skill1.Casting', 'Skill.Hero.HildaCos21GloryLeague.Skill1.Loop'] },
        voidstrike: { start: ['Skill.Hero.HildaCos21GloryLeague.Skill3.Casting'] },
        untranscend: { start: ['Skill.Hero.HildaCos21GloryLeague.Skill2.Casting', 'Skill.Hero.HildaCos21GloryLeague.Skill2.Loop'] },
        voidattack: { start: ['Skill.Hero.HildaCos21GloryLeague.Attack2-5.Casting', 'Skill.Hero.HildaCos21GloryLeague.Attack2-2.Casting', 'Skill.Hero.Hilda.Attack2.Casting', 'Skill.Hero.HildaCos21GloryLeague.Attack2-3.Casting', 'Skill.Hero.HildaCos21GloryLeague.Attack2-1.Casting', 'Skill.Hero.HildaCos21GloryLeague.Attack2-4.Casting'] },
        transcend: { start: ['Skill.Hero.HildaCos21GloryLeague.Skill2.Casting', 'Skill.Hero.HildaCos21GloryLeague.Skill2.Loop'] },
      },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Hilda_Cos21GloryLeague_Body1', 'Hero_Hilda_Cos21GloryLeague_Hair'],
        right: 'Hero_Hilda_Cos21GloryLeague_Weapon1',
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Hilda_Glory2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Hilda_Glory2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Hilda_Glory2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Hilda_Glory2.webp',
      title: 'Hilda of Glaring Honor (Pure Mythic Divine Beast)',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        attack: { start: ['Skill.Hero.Hilda.Attack1.Casting', 'Skill.Hero.HildaCos21GloryLeague.Attack1-2.Casting', 'Skill.Hero.HildaCos21GloryLeague.Attack1-3.Casting', 'Skill.Hero.HildaCos21GloryLeague.Attack1-1.Casting'] },
        whirlwind: { start: ['Skill.Hero.HildaCos21GloryLeague.Skill1.Casting', 'Skill.Hero.HildaCos21GloryLeague.Skill1.Loop'] },
        voidstrike: { start: ['Skill.Hero.HildaCos21GloryLeague.Skill3.Casting'] },
        untranscend: { start: ['Skill.Hero.HildaCos21GloryLeague.Skill2.Casting', 'Skill.Hero.HildaCos21GloryLeague.Skill2.Loop'] },
        voidattack: { start: ['Skill.Hero.HildaCos21GloryLeague.Attack2-5.Casting', 'Skill.Hero.HildaCos21GloryLeague.Attack2-2.Casting', 'Skill.Hero.Hilda.Attack2.Casting', 'Skill.Hero.HildaCos21GloryLeague.Attack2-3.Casting', 'Skill.Hero.HildaCos21GloryLeague.Attack2-1.Casting', 'Skill.Hero.HildaCos21GloryLeague.Attack2-4.Casting'] },
        transcend: { start: ['Skill.Hero.HildaCos21GloryLeague.Skill2.Casting', 'Skill.Hero.HildaCos21GloryLeague.Skill2.Loop'] },
      },
      // What King's Raid keeps on it all the while (tm-glory.mjs).
      wears: ['Skill.Hero.EvanCos21GloryLeague.Cos21GloryLeagueLight', 'Skill.Hero.HildaCos21GloryLeague.Cos21GloryLeagueParts'],
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Hilda_Cos21GloryLeague_Body2', 'Hero_Hilda_Cos21GloryLeague_Hair'],
        right: 'Hero_Hilda_Cos21GloryLeague2_Weapon2',
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Hilda_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Hilda_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Hilda_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Hilda_Christmas.webp',
      title: 'Longing in the First Snow Hilda',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Hilda_Cos21Christmas_Body', 'Hero_Hilda_Cos21Christmas_Hair'],
        right: 'Hero_Hilda_Cos21Christmas_Weapon',
      },
    },
  ],
};
