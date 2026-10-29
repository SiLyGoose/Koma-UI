import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Dark Lord Kasel, the Corrupted Warrior of the Holy Sword (Hero_Kasel_DarkLord_…): his body (his face and skirt in
 * it), his hair, and Aea in his right hand, laid out as Klaus's sword is (the blade along what was its y). He is moved
 * by King's Raid's own animations of him (ANIMATIONS: ../../heroes/body/kr.ts).
 */

/**
 * King's Raid's own animations (its skins of the game's files are moved by them: ../../heroes/body/kr.ts): its basic attack's
 * chain, and each skill's clips, with when its blows land in them as the game's timelines have them (KR-extracted/scripts/tm-anims.mjs).
 */
const ANIMATIONS = {
  idle: 'Idle',
  run: 'Run',
  victory: 'Victory',
  lose: 'Lose',
  dead: 'Dead',
  attack: [{ clips: ['Attack1-1', 'Attack1-2'], hits: [0.3, 0.8] }, { clips: ['Attack1-3', 'Attack1-4'], hits: [0.3, 0.4] }, { clips: ['Attack1-5'], hits: [0.7] }],
  skills: {
    judge: { clips: ['Skill1'], hits: [1.2, 1.6] },
    ruin: { clips: ['Skill2'], hits: [2.3, 2.5, 2.7] },
    advent: { clips: ['Skill3_Ready', 'Skill3_Loop', 'Skill3_End'], hits: [4] },
  },
} as const satisfies KrAnimations;

export const DARK_LORD_KASEL_ASSETS: HeroAssets = {
  name: 'Dark Lord Kasel',
  folder: 'heroes/dark-lord-kasel',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/88/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded: Aea, the Corrupted Holy Sword.
  unique: { Hero_Kasel_DarkLord_Vari05_Weapon: 'Hero_Kasel_DarkLord_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.DarkLordKasel.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      corrupt: [[{ clip: 'Dmg-swd-01', volume: 1.5, at: 0.05 }], [{ clip: 'Dmg-swd-02', volume: 1.5, at: 0.05 }], [{ clip: 'Dmg-swd-03', volume: 1.5, at: 0.05 }], [{ clip: 'Dmg-swd-01', volume: 1.5, at: 0.05 }], [{ clip: 'Dmg-swd-01', volume: 1.5, at: 0.05 }], [{ clip: 'Dmg-swd-03', volume: 1.5, at: 0.05 }]],
      judge: [[{ clip: 'Dmg-swd-01', volume: 1.9, at: 0.05 }], [{ clip: 'Dmg-swd-01', volume: 1.9, at: 0.05 }]],
      ruin: [[{ clip: 'Dmg-01', volume: 1.9, at: 0.05 }], [{ clip: 'Dmg-01', volume: 1.9, at: 0.05 }]],
    },
    casts: {
      judge: [{ clip: 'Dark-fx-02', volume: 2.8, at: 0.179 }, { clip: 'KaselB-Vox_Skill5', volume: 3, at: 0.412, own: true }, { clip: 'Impact-01', volume: 2.8, at: 1.144 }, { clip: 'Impact-02', volume: 2.8, at: 1.575 }],
      ruin: [{ clip: 'KaselB-Vox_Skill4', volume: 3, at: 0.058, own: true }, { clip: 'Cast-01', volume: 2.8, at: 0.093 }, { clip: 'Swd-stab-01', volume: 2.8, at: 0.759 }, { clip: 'Dark-fx-03', volume: 2.8, at: 1.291 }, { clip: 'Magic-fire-01', volume: 2.8, at: 2.287 }],
      advent: [{ clip: 'Dark-fx-01', volume: 2.8, at: 0.026 }, { clip: 'KaselB-Vox_Skill2', volume: 3, at: 0.189, own: true }, { clip: 'Swd-stab-01', volume: 2.8, at: 0.855 }, { clip: 'Ground-Hit-01', volume: 2.4, at: 0.855 }, { clip: 'Cast-03', volume: 2.8, at: 1.789 }, { clip: 'Cast-02', volume: 2.8, at: 2.092 }, { clip: 'Dark-fx-03', volume: 2.8, at: 3.088 }, { clip: 'Sword-Stab-01', volume: 2.4, at: 3.088 }, { clip: 'Magic-exp-01', volume: 2.8, at: 3.843 }, { clip: 'KaselB-Vox_Attack4', volume: 3, at: 3.843, own: true }],
    },
    victory: [{ clip: 'KaselB-Vox_Victory', volume: 2.8, at: 0.2, own: true }, { clip: 'Texture-01', volume: 2.5, at: 0.2 }, { clip: 'Texture-04', volume: 2.5, at: 2.133 }, { clip: 'Texture-03', volume: 2.5, at: 2.667 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    corrupt: { start: ['Skill.Hero.Kasel.DarkLord.Attack1-1', 'Skill.Hero.Kasel.DarkLord.Attack1.1', 'Skill.Hero.Kasel.DarkLord.Attack1-2', 'Skill.Hero.Kasel.DarkLord.Attack1.2', 'Skill.Hero.Kasel.DarkLord.Attack1.4', 'Skill.Hero.Kasel.DarkLord.Attack1.3', 'Skill.Hero.Kasel.DarkLord.Attack1.5'] },
    judge: { start: ['Skill.Hero.Kasel.DarkLord.Skill1-1', 'Skill.Hero.Kasel.DarkLord.Skill1-2'] },
    ruin: { start: ['Skill.Hero.Kasel.DarkLord.Skill2-2.Casting', 'Skill.Hero.Kasel.DarkLord.Skill2-1.Casting'], land: ['Skill.Hero.Kasel.DarkLord.Skill2-2.Projectile'] },
    advent: { start: ['Skill.Hero.Kasel.DarkLord.Skill3.Casting', 'Skill.Hero.Kasel.DarkLord.Skill3.Buff', 'Skill.Hero.Kasel.DarkLord.Skill3.End', 'Skill.Hero.Kasel.DarkLord.Skill3.Loop'] },
  },
  skins: [
    {
      name: 'Dark Lord Kasel',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Dark_Lord_Kasel.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Dark_Lord_Kasel.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Dark_Lord_Kasel.webp',
      // His artwork, darkness in his raised left hand (krinfo.net's, 1024×1024: the 214-pixel one it replaces was blurry on
      // the heroes page): his head and horns in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Dark_Lord_Kasel.png', from: 'https://krinfo.net/kingsraid-data/assets/heroes/Dark%20Lord%20Kasel/cos/Basic.png', crop: { x: 418, y: 18, size: 180 }, head: { x: 468, y: 88, size: 92 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Kasel_DarkLord_Vari05_Body', 'Hero_Kasel_DarkLord_Vari05_Hair'],
        right: 'Hero_Kasel_DarkLord_Vari05_Weapon',
        blade: 'y',
      },
    },
    // King's Raid's Advance costume (tm-costumes.mjs).
    {
      name: 'Dark_Lord_Kasel_Advance',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Dark_Lord_Kasel_Advance.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Dark_Lord_Kasel_Advance.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Dark_Lord_Kasel_Advance.webp',
      title: 'Black Wings Nightmare Dark Lord Kasel',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Kasel_DarkLord_Cos20Advance_Body', 'Hero_Kasel_DarkLord_Cos20Advance_Hair'],
        right: 'Hero_Kasel_DarkLord_Cos20Advance_Weapon',
        blade: 'y',
      },
    },
    // King's Raid's Ash costume (tm-costumes.mjs).
    {
      name: 'Dark_Lord_Kasel_Ash',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Dark_Lord_Kasel_Ash.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Dark_Lord_Kasel_Ash.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Dark_Lord_Kasel_Ash.webp',
      title: 'Faded Purity Dark Lord Kasel',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Kasel_DarkLord_Cos21Ash_Body', 'Hero_Kasel_DarkLord_Hair_04'],
        right: 'Hero_Kasel_DarkLord_Cos21Ash_Weapon',
        blade: 'y',
      },
    },
  ],
};
