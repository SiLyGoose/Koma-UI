import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Erze in her fourth look (Hero_Erze_Vari04_…: her fifth's weapon has its colour picture spoiled, one hue all over):
 * her body, her hair, and her bat-winged orb of blood, held as her right hand's: King's Raid's own animations of her
 * (ANIMATIONS: ../../heroes/body/kr.ts) float its mark by her shoulder and beat its wings.
 */

/**
 * King's Raid's own animations (its skins of the game's files are moved by them: ../../heroes/body/kr.ts): its basic attack's
 * chain, and each skill's clips, with when its blows land in them as the game's timelines have them (KR-extracted/scripts/tm-anims.mjs).
 */
const ANIMATIONS = {
  idle: 'Idle',
  run: 'Run',
  hurt: 'Damage',
  attack: [{ clips: ['Attack1-1'], hits: [0.4] }, { clips: ['Attack1-2'], hits: [0.3, 0.7] }, { clips: ['Attack1-3'], hits: [0.7] }],
  skills: {
    sweet: { clips: ['Skill1'], hits: [1.3] },
    soak: { clips: ['Skill2'], hits: [2] },
    liberation: { clips: ['Skill3'], hits: [3.2] },
  },
} as const satisfies KrAnimations;

export const ERZE_ASSETS: HeroAssets = {
  name: 'Erze',
  folder: 'heroes/erze',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/53/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Perion, her orb.
  unique: { Hero_Erze_Vari04_Weapon: 'Hero_Erze_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Erze.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); and as each skill begins.
  sounds: {
    hits: {
      drain: [[{ clip: 'Dmg_punch_01', volume: 1.5 }], [{ clip: 'Hit_common_01', volume: 1.8 }]],
      sweet: [[{ clip: 'Hit_fire_04', volume: 2 }]],
      soak: [[{ clip: 'Hit_common_04', volume: 2 }]],
      liberation: [[{ clip: 'Hit_gun_02', volume: 2 }]],
    },
    casts: {
      sweet: [{ clip: 'Attack-Casting-26', volume: 1.3 }, { clip: 'Attack-Casting-10', volume: 1.3 }, { clip: 'Erze-Vox_Skill1', volume: 2.2, own: true }, { clip: 'Attack-Casting-24', volume: 1.3, at: 0.44 }, { clip: 'Attack-Magic-55', volume: 1.2, at: 1.35 }],
      soak: [{ clip: 'Attack-Casting-26', volume: 1.3 }, { clip: 'Attack-Casting-10', volume: 1.3 }, { clip: 'Erze-Vox_Skill2', volume: 2.2, own: true }, { clip: 'Attack-Casting-24', volume: 1.3, at: 0.65 }, { clip: 'Attack-Casting-33', volume: 1.3, at: 1.56 }, { clip: 'Attack-Magic-39', volume: 1.5, at: 1.96 }, { clip: 'Attack-Magic-48', volume: 1.4, at: 1.99 }, { clip: 'Attack-Magic-29', volume: 1.4, at: 2.08 }, { clip: 'Attack-Magic-55', volume: 1.4, at: 7.97 }],
      liberation: [{ clip: 'Attack-Casting-26', volume: 1.3 }, { clip: 'Attack-Casting-10', volume: 1.3 }, { clip: 'Attack-Casting-37', volume: 1.3, at: 0.46 }, { clip: 'Attack-Magic-35', volume: 1.2, at: 0.66 }, { clip: 'Erze-Vox_Skill3', volume: 2.2, at: 0.87, own: true }, { clip: 'Attack-Magic-39', volume: 1.2, at: 3.26 }, { clip: 'Attack-Magic-48', volume: 1.5, at: 3.29 }],
    },
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    drain: { start: ['Skill.Hero.Erze.Attack1.Casting.2', 'Skill.Hero.Erze.Attack1.Casting.3', 'Skill.Hero.Erze.Attack1.Casting.1'], land: ['Skill.Hero.Erze.Attack1.Hit1', 'Skill.Hero.Erze.Attack1.Hit2'] },
    sweet: { start: ['Skill.Hero.Erze.Skill1.Casting'], land: ['Skill.Hero.Erze.Skill1.Projectile', 'Skill.Hero.Erze.Skill1.ProjectileHit', 'Skill.Hero.Erze.Skill1.Hit'] },
    soak: { start: ['Skill.Hero.Erze.Skill2.Casting', 'Skill.Hero.Erze.Skill2.Loop', 'Skill.Hero.Erze.Skill2.Buff'] },
    liberation: { start: ['Skill.Hero.Erze.Skill3.Casting'], land: ['Skill.Hero.Erze.Skill3.Projectile', 'Skill.Hero.Erze.Skill3.ProjectileHit'] },
  },
  skins: [
    {
      name: 'Erze',
      // Her artwork (the King's Raid Index's): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Erze.png', from: 'https://raw.githubusercontent.com/IcyDipity/KingsRaidIndex/master/images/heroes/Erze/Erze.png', crop: { x: 455, y: 160, size: 190 }, head: { x: 535, y: 205, size: 105 } },
      model: { kind: 'parts', animations: ANIMATIONS, parts: ['Hero_Erze_Vari04_Body', 'Hero_Erze_Vari04_Hair'], right: 'Hero_Erze_Vari04_Weapon' },
    },
  ],
};
