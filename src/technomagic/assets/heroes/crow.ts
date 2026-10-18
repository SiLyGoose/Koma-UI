import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Crow in his fourth look (Hero_Crow_Vari04_…: his fifth's files have their colour pictures spoiled, one hue all over):
 * his body and hair, and his great gun in his right hand, along its x (his shots come from its far end). He is moved by
 * King's Raid's own animations of him (ANIMATIONS: ../../heroes/body/kr.ts).
 */

/**
 * King's Raid's own animations (its skins of the game's files are moved by them: ../../heroes/body/kr.ts): its basic attack's
 * chain, and each skill's clips, with when its blows land in them as the game's timelines have them (KR-extracted/scripts/tm-anims.mjs).
 */
const ANIMATIONS = {
  idle: 'Idle',
  run: 'Run',
  hurt: 'Damage',
  attack: [{ clips: ['Attack1'], hits: [0.9, 1] }],
  skills: {
    eliminate: { clips: ['Skill1-1', 'Skill1-2', 'Skill1-3'], hits: [1.1, 1.3, 1.5, 1.7, 1.9, 2.1, 2.3, 2.5, 2.7, 2.9, 3.1, 3.3, 3.5, 3.7, 3.9] },
    struggle: { clips: ['Skill2'], hits: [2.6, 2.7, 2.8, 2.9, 3, 3.3] },
    gods: { clips: ['Skill3-1', 'Skill3-2', 'Skill3-3'], hits: [1, 3, 3.5, 4.8] },
  },
} as const satisfies KrAnimations;

export const CROW_ASSETS: HeroAssets = {
  name: 'Crow',
  folder: 'heroes/crow',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/49/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded: Akistra, his gun.
  unique: { Hero_Crow_Vari04_Weapon: 'Hero_Crow_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Crow.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); and as each skill begins.
  sounds: {
    hits: {
      snipe: [[{ clip: 'Hit_gun_02', volume: 1.5 }]],
      eliminate: [[{ clip: 'Hit_gun_01', volume: 2 }]],
      struggle: [[{ clip: 'Hit_gun_01', volume: 2 }]],
      gods: [[{ clip: 'Hit_elect_01', volume: 2 }]],
    },
    casts: {
      eliminate: [{ clip: 'Attack-Casting-09' }, { clip: 'Attack-Casting-16' }, { clip: 'Crow-Vox_Skill1', volume: 2.3, own: true }, { clip: 'Attack-Shot-24', volume: 1.8, at: 0.89 }],
      struggle: [{ clip: 'Attack-Casting-09' }, { clip: 'Attack-Casting-16' }, { clip: 'Crow-Vox_Skill2', volume: 2.3, at: 1.16, own: true }, { clip: 'Attack-Casting-45', volume: 1.4, at: 1.54 }, { clip: 'Attack-Shot-25', volume: 1.6, at: 2.6 }, { clip: 'Attack-Shot-25', volume: 1.6, at: 3.19 }],
      gods: [{ clip: 'Attack-Casting-09' }, { clip: 'Attack-Casting-16' }, { clip: 'Attack-Casting-42', volume: 1.8, at: 0.33 }, { clip: 'Attack-Casting-31', volume: 1.4, at: 0.9 }, { clip: 'Crow-Vox_Skill3', volume: 2.3, at: 1.16, own: true }, { clip: 'Crow-Vox_Casting2', volume: 2.3, at: 4.28, own: true }, { clip: 'Attack-Magic-22', volume: 1.3, at: 4.98 }, { clip: 'Attack-Magic-55', volume: 1.3, at: 4.98 }],
    },
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    snipe: { start: ['Skill.Hero.Crow.Attack1.Casting', 'Skill.Hero.Crow.Attack1.Casting2'], land: ['Skill.Hero.Crow.Attack1.Projectile2', 'Skill.Hero.Crow.Attack1.Hit', 'Skill.Hero.Crow.Attack1.Projectile'] },
    eliminate: { start: ['Skill.Hero.Crow.Skill1.Casting1', 'Skill.Hero.Crow.Skill1.CastingLoop', 'Skill.Hero.Crow.Skill1.Casting2'] },
    struggle: { start: ['Skill.Hero.Crow.Skill2.Casting'], land: ['Skill.Hero.Crow.Skill2.Projectile2', 'Skill.Hero.Crow.Skill2.Projectile', 'Skill.Hero.Crow.Skill2.HitLoop', 'Skill.Hero.Crow.Skill2.Hit'] },
    gods: { start: ['Skill.Hero.Crow.Skill3.Casting', 'Skill.Hero.Crow.Skill3.CastingLoop2', 'Skill.Hero.Crow.Skill3.CastingLoop'], land: ['Skill.Hero.Crow.Skill3.Projectile1', 'Skill.Hero.Crow.Skill3.Projectile2', 'Skill.Hero.Crow.Skill3.Projectile3'] },
  },
  skins: [
    {
      name: 'Crow',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Crow.webp',
      // His artwork (from the wiki, asked for as the PNG it was uploaded as), his gun at his side: his head in the crop (the meter's close-up is his face by itself).
      portrait: {
        file: 'Crow.png',
        from: 'https://static.wikia.nocookie.net/charactah-account/images/e/ec/Crow_%28King%27s_Raid%29_Render_01.png/revision/latest?cb=20221007053744&format=original',
        crop: { x: 290, y: 0, size: 120 },
        head: { x: 318, y: 22, size: 65 },
      },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Crow_Vari04_Body', 'Hero_Crow_Hair_01'],
        right: 'Hero_Crow_Vari04_Weapon',
      },
    },
  ],
};
