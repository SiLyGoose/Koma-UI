import type { HeroAssets, PartsModel, KrAnimations } from '../types.ts';

/*
 * Yanne in her fourth look (Hero_Yanne_Vari04_…: her fifth's hair and headband have their colour pictures spoiled, one
 * hue all over): her body and hair, her great bow in her left hand (held, not a shield: its string drawn by bones of
 * its own), and an arrow in her right, along its x (her shots come from its tip). She is moved by King's Raid's own
 * animations of her (ANIMATIONS: ../../heroes/body/kr.ts).
 */

/** How her left hand holds her bow for her animations (as Selene holds hers): upright, its string toward her, as she draws. */
const GRIPS = { L: { at: [0.051, 0.031, 0], turn: [-2.222, 0.732, 0.474] } } as const satisfies PartsModel['grips'];


/**
 * King's Raid's own animations (its skins of the game's files are moved by them: ../../heroes/body/kr.ts): its basic attack's
 * chain, and each skill's clips, with when its blows land in them as the game's timelines have them (KR-extracted/scripts/tm-anims.mjs).
 */
const ANIMATIONS = {
  idle: 'Idle',
  run: 'Run',
  hurt: 'Damage',
  attack: [{ clips: ['Attack1'], hits: [1.2] }],
  skills: {
    focus: { clips: ['Skill1-1', 'Skill1-2', 'Skill1-2', 'Skill1-2', 'Skill1-3'], hits: [0.6, 1.5, 2.4, 3.1, 3.3] },
    wipeout: { clips: ['Skill2'], hits: [1.8] },
    unleash: { clips: ['Skill3'], hits: [1] },
  },
} as const satisfies KrAnimations;

export const YANNE_ASSETS: HeroAssets = {
  name: 'Yanne',
  folder: 'heroes/yanne',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/44/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Svelta, her bow.
  unique: { Hero_Yanne_Vari04_Weapon: 'Hero_Yanne_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Yanne.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); and as each skill begins.
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_bow_03', volume: 1.5 }]],
      focus: [[{ clip: 'Hit_fire_03', volume: 2 }]],
      wipeout: [[{ clip: 'Hit_fire_04', volume: 2 }]],
    },
    casts: {
      focus: [{ clip: 'Yanne-Vox_Skill3-1', volume: 2.2, own: true }, { clip: 'Attack-Casting-26', volume: 1.5, at: 0.54 }, { clip: 'Attack-BowPull-03', volume: 1.8, at: 0.54 }, { clip: 'Attack-Casting-43', volume: 1.2, at: 0.69 }, { clip: 'Attack-Casting-27', volume: 1.2, at: 1.74 }, { clip: 'Attack-Casting-39', volume: 1.2, at: 1.82 }, { clip: 'Yanne-Vox_Skill3-2', volume: 2.2, at: 1.95, own: true }, { clip: 'Attack-Magic-20', volume: 1.7, at: 3.49 }, { clip: 'Attack-Magic-22', volume: 1.7, at: 3.49 }],
      wipeout: [{ clip: 'Attack-Casting-04', volume: 1.5 }, { clip: 'Attack-Magic-19', volume: 1.6 }, { clip: 'Yanne-Vox_02', volume: 2.2, at: 0.14, own: true }, { clip: 'Yanne-Vox_Skill2', volume: 2.2, at: 0.63, own: true }, { clip: 'Attack-Casting-43', volume: 1.5, at: 0.78 }, { clip: 'Attack-Magic-22', volume: 1.8, at: 1.69 }, { clip: 'Attack-Magic-06', volume: 1.8, at: 1.69 }],
      unleash: [{ clip: 'Attack-Casting-04', volume: 1.5 }, { clip: 'Attack-Magic-19', volume: 1.5 }, { clip: 'Yanne-Vox_Skill1', volume: 2.2, own: true }, { clip: 'Attack-Magic-22', volume: 1.8, at: 0.83 }, { clip: 'Attack-Magic-06', volume: 1.8, at: 0.83 }],
    },
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { land: ['Skill.Hero.Yanne.Attack1.Shot', 'Skill.Hero.Yanne.Attack1.Projectile2', 'Skill.Hero.Yanne.Attack1.Projectile1', 'Skill.Hero.Yanne.Attack1.Hit1', 'Skill.Hero.Yanne.Attack1.Hit2'] },
    focus: { start: ['Skill.Hero.Yanne.Skill1.Loop', 'Skill.Hero.Yanne.Skill1.Casting'], land: ['Skill.Hero.Yanne.Skill1.Shot'] },
    wipeout: { start: ['Skill.Hero.Yanne.Skill2.Casting'], land: ['Skill.Hero.Yanne.Skill2.Projectile', 'Skill.Hero.Yanne.Skill2.Hit'] },
    unleash: { start: ['Skill.Hero.Yanne.Skill3.Loop', 'Skill.Hero.Yanne.Skill3.Casting'] },
  },
  skins: [
    {
      name: 'Yanne',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Yanne.webp',
      // Her artwork (the King's Raid Index's): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Yanne.png', from: 'https://raw.githubusercontent.com/IcyDipity/KingsRaidIndex/master/images/heroes/Yanne/Yanne.png', crop: { x: 315, y: 395, size: 160 }, head: { x: 355, y: 440, size: 95 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Yanne_Vari04_Body', 'Hero_Yanne_Vari04_Hair'],
        left: 'Hero_Yanne_Vari04_Weapon',
        offHand: 'held',
        right: 'Hero_Yanne_Arrow',
        grips: GRIPS,
      },
    },
  ],
};
