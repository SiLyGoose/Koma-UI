import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Tanya in her fifth look: her body (her hair and mask a part of it), and a katar on each fist (the same file in both
 * hands, held, not a shield). She is moved by King's Raid's own animations of her (ANIMATIONS:
 * ../../heroes/body/kr.ts).
 */


/**
 * King's Raid's own animations (its skins of the game's files are moved by them: ../../heroes/body/kr.ts): its basic attack's
 * chain, and each skill's clips, with when its blows land in them as the game's timelines have them (KR-extracted/scripts/tm-anims.mjs).
 */
const ANIMATIONS = {
  idle: 'Idle',
  run: 'Run',
  hurt: 'Damage',
  attack: [{ clips: ['Attack1-1'], hits: [0.5, 0.7, 0.9, 1.4] }, { clips: ['Attack1-2'], hits: [0.2, 0.3] }, { clips: ['Attack1-3'], hits: [0.2] }],
  skills: {
    sighted: { clips: ['Skill1-1', 'Skill1-2', 'Skill1-3'], hits: [0.7, 1.6, 1.9] },
    tornado: { clips: ['Skill2'], hits: [2.1, 2.2, 2.3] },
    whisper: { clips: ['Skill3-1', 'Skill3-9'], hits: [0, 0.1, 2.4] },
  },
} as const satisfies KrAnimations;

export const TANYA_ASSETS: HeroAssets = {
  name: 'Tanya',
  folder: 'heroes/tanya',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/36/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Caethasis, her katars.
  unique: { Hero_Tanya_Vari05_Weapon: 'Hero_Tanya_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Tanya.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); and as each skill begins.
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_sword_01', volume: 1.5 }]],
      sighted: [[{ clip: 'Hit_sword_02', volume: 2 }]],
      tornado: [[{ clip: 'Hit_sword_03', volume: 2 }]],
      whisper: [[{ clip: 'Hit_sword_04', volume: 2 }]],
    },
    casts: {
      sighted: [{ clip: 'Attack-Casting-15', volume: 0.9 }, { clip: 'Tanya-Vox_Skill1_b', volume: 2.5, at: 0.37, own: true }, { clip: 'Attack-Action-02', volume: 1.2, at: 0.61 }, { clip: 'Attack-Magic-03', volume: 1.2, at: 0.67 }, { clip: 'Attack-Woosh-07', volume: 1.5, at: 1.26 }, { clip: 'Attack-Woosh-07', volume: 1.5, at: 1.36 }, { clip: 'Attack-Body-02', volume: 1.2, at: 1.44 }, { clip: 'Attack-Magic-34', volume: 1.2, at: 1.47 }, { clip: 'Attack-Magic-34', volume: 1.2, at: 1.82 }, { clip: 'Attack-Jump-01', volume: 1.5, at: 1.97 }, { clip: 'Attack-Landing-01', volume: 1.5, at: 2.66 }],
      tornado: [{ clip: 'Attack-Casting-07', volume: 0.9, at: 0.02 }, { clip: 'Attack-Casting-12', volume: 0.9, at: 0.02 }, { clip: 'Attack-Magic-23', at: 0.45 }, { clip: 'Attack-Action-02', volume: 1.5, at: 0.48 }, { clip: 'Attack-Cut-07', volume: 0.7, at: 0.89 }, { clip: 'Attack-Woosh-08', volume: 1.5, at: 0.89 }, { clip: 'Tanya-Vox_Skill2_b', volume: 2.5, at: 0.9, own: true }, { clip: 'Attack-Magic-23', at: 1 }, { clip: 'Attack-Magic-23', at: 1.23 }, { clip: 'Attack-Magic-23', at: 1.51 }, { clip: 'Attack-Magic-23', at: 1.89 }, { clip: 'Attack-Magic-16', volume: 1.2, at: 1.89 }, { clip: 'Attack-Woosh-07', volume: 1.5, at: 1.89 }, { clip: 'Attack-Jump-01', volume: 1.3, at: 1.98 }, { clip: 'Attack-Woosh-07', volume: 1.5, at: 2.03 }, { clip: 'Attack-Woosh-07', volume: 1.5, at: 2.19 }, { clip: 'Attack-Landing-01', volume: 1.5, at: 2.85 }],
      whisper: [{ clip: 'Attack-Casting-10', volume: 0.9, at: 0.03 }, { clip: 'Tanya-Vox_Skill3', volume: 2.5, at: 0.2, own: true }, { clip: 'Attack-Casting-21', volume: 1.2, at: 0.95 }, { clip: 'Attack-Magic-10', volume: 1.2, at: 0.95 }, { clip: 'Attack-Jump-01', volume: 1.2, at: 1.08 }, { clip: 'Attack-Woosh-07', volume: 1.5, at: 1.23 }, { clip: 'Attack-Woosh-07', volume: 1.5, at: 1.37 }, { clip: 'Attack-Magic-22', volume: 1.2, at: 1.53 }, { clip: 'Attack-Landing-01', volume: 1.2, at: 1.67 }, { clip: 'Attack-Action-02', volume: 1.2, at: 1.67 }, { clip: 'Attack-Landing-01', volume: 1.5, at: 1.96 }, { clip: 'Attack-Magic-22', volume: 1.2, at: 2.36 }, { clip: 'Attack-Woosh-10', volume: 1.5, at: 2.36 }, { clip: 'Attack-Magic-22', volume: 1.2, at: 2.7 }, { clip: 'Attack-Woosh-10', volume: 1.5, at: 2.7 }, { clip: 'Attack-Magic-22', volume: 1.2, at: 2.83 }, { clip: 'Attack-Woosh-10', volume: 1.5, at: 2.83 }, { clip: 'Attack-Magic-22', volume: 1.2, at: 2.98 }, { clip: 'Attack-Woosh-10', volume: 1.5, at: 2.98 }, { clip: 'Attack-Magic-22', volume: 1.2, at: 3.08 }, { clip: 'Attack-Woosh-10', volume: 1.5, at: 3.08 }, { clip: 'Attack-Magic-22', volume: 1.2, at: 3.24 }, { clip: 'Attack-Woosh-10', volume: 1.5, at: 3.24 }, { clip: 'Attack-Magic-22', volume: 1.2, at: 3.45 }, { clip: 'Attack-Woosh-10', volume: 1.5, at: 3.45 }, { clip: 'Attack-Magic-22', volume: 1.2, at: 3.85 }, { clip: 'Attack-Woosh-10', volume: 1.5, at: 3.85 }, { clip: 'Attack-Magic-22', volume: 1.2, at: 4.47 }, { clip: 'Attack-Woosh-10', volume: 1.5, at: 4.47 }, { clip: 'Attack-Landing-01', volume: 1.2, at: 4.75 }],
    },
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Tanya.Attack1.Casting3', 'Skill.Hero.Tanya.Attack1.Casting2', 'Skill.Hero.Tanya.Attack1.Casting1'], land: ['Hit.Normal.SlashBig', 'Common.Aura2'] },
    sighted: { start: ['Skill.Hero.Tanya.Skill1.Casting1', 'Skill.Hero.Tanya.Skill1.Casting2'], land: ['Skill.Hero.Tanya.Skill1.Hit'] },
    whisper: { land: ['Hit.Physical.03', 'Hit.Physical.SlashXL'] },
  },
  skins: [
    {
      name: 'Tanya',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Tanya.webp',
      // Her artwork (the King's Raid Index's), leaping with her katars out: her hooded head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Tanya.png', from: 'https://raw.githubusercontent.com/IcyDipity/KingsRaidIndex/master/images/heroes/Tanya/Tanya.png', crop: { x: 575, y: 85, size: 170 }, head: { x: 610, y: 110, size: 105 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Tanya_Vari05_Mesh'],
        left: 'Hero_Tanya_Vari05_Weapon',
        offHand: 'held',
        right: 'Hero_Tanya_Vari05_Weapon',
      },
    },
  ],
};
