import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Loman in his fourth look (Hero_Loman_Vari04_…: his fifth's weapon and hair have their colour pictures spoiled, one
 * hue all over; every file of his hair has, so his ponytail is drawn orange, not blue): his body, his hair, and his
 * halberd in his right hand, laid out along what was its y. He is moved by King's Raid's own animations of him
 * (ANIMATIONS: ../../heroes/body/kr.ts). (The game's cutscene of his ascension, Maps, Items, Other/Other, has him rise
 * into the air, lie flat and turn about: nothing a skill of his could be played with.)
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
  attack: [{ clips: ['Attack1-1'], hits: [0.3] }, { clips: ['Attack1-2'], hits: [0.4] }, { clips: ['Attack1-3'], hits: [0.2, 0.7] }, { clips: ['Attack1-4'], hits: [0.6] }],
  skills: {
    ground: { clips: ['Skill1'], hits: [1.4] },
    shroud: { clips: ['Skill2'], hits: [1.2] },
    creed: { clips: ['Skill3-1', 'Skill3-2', 'Skill3-3'], hits: [1.6, 2.7, 4.2, 4.3] },
  },
} as const satisfies KrAnimations;

export const LOMAN_ASSETS: HeroAssets = {
  name: 'Loman',
  folder: 'heroes/loman',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/73/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded: Gaiamenes, his halberd.
  unique: { Hero_Loman_Vari04_Weapon: 'Hero_Loman_Unique_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Loman.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      thrust: [[{ clip: 'Hit_common_01', volume: 1.5 }]],
      ground: [[{ clip: 'Hit_Dmg-Metal-02', volume: 2 }]],
      creed: [[{ clip: 'Hit_big_02', volume: 1.8 }]],
    },
    casts: {
      ground: [{ clip: 'Attack-Spin-08', volume: 1.5, at: 0.12 }, { clip: 'Attack-Casting-15', volume: 1.3, at: 0.12 }, { clip: 'Attack-Magic-09', volume: 1.5, at: 0.78 }, { clip: 'Attack-Magic-05', volume: 1.6, at: 0.78 }, { clip: 'Attack-Casting-03', volume: 1.3, at: 1.39 }, { clip: 'Roman-Vox_Skill1', volume: 2.4, at: 1.63, own: true }, { clip: 'Attack-Magic-39', volume: 1.6, at: 2.31 }],
      shroud: [{ clip: 'Attack-Casting-15', volume: 1.3 }, { clip: 'Roman-Vox_Skill2', volume: 2.4, at: 0.08, own: true }, { clip: 'Attack-Magic-37', volume: 1.4, at: 0.74 }, { clip: 'Attack-Casting-27', volume: 1.3, at: 1.14 }, { clip: 'Attack-Magic-39', volume: 1.3, at: 1.16 }, { clip: 'Attack-Magic-09', volume: 1.4, at: 1.17 }],
      creed: [{ clip: 'Attack-Casting-15', volume: 1.3 }, { clip: 'Roman-Vox_Attack1', volume: 2.4, at: 0.16, own: true }, { clip: 'Attack-Magic-05', volume: 1.4, at: 0.91 }, { clip: 'Attack-Magic-39', volume: 1.5, at: 1.45 }, { clip: 'FX-Golem-06', volume: 2, at: 1.56 }],
    },
    victory: [{ clip: 'Attack-Cut-11', volume: 1.2, at: 0.57 }, { clip: 'Attack-Action-01', volume: 1.3, at: 0.73 }, { clip: 'Roman-Vox_Victory', volume: 2.2, at: 1.51, own: true }, { clip: 'Attack-Jump-01', volume: 1.3, at: 1.73 }, { clip: 'Attack-Woosh-09', volume: 1.5, at: 2.4 }, { clip: 'Attack-Landing-01', volume: 1.5, at: 2.61 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    thrust: { start: ['Skill.Hero.Loman.Attack1.Casting1', 'Skill.Hero.Loman.Attack1.Casting3', 'Skill.Hero.Loman.Attack1.Casting4', 'Skill.Hero.Loman.Attack1.Casting2'] },
    ground: { start: ['Skill.Hero.Loman.Skill1.Casting'], land: ['Hit.Normal.StrikeBig'] },
    shroud: { start: ['Skill.Hero.Loman.Skill2.Casting'], land: ['Skill.Hero.Loman.Skill2.HitLoop', 'Skill.Hero.Loman.Skill2.Hit'] },
    creed: { start: ['Skill.Hero.Loman.Skill3-1.Casting', 'Skill.Hero.Loman.Skill3-2.Casting', 'Skill.Hero.Loman.Skill3-3.Casting'] },
  },
  skins: [
    {
      name: 'Loman',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Loman.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Loman.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Loman.webp',
      // His artwork (the King's Raid Index's), his halberd planted beside him: his helmed head in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Loman.png', from: 'https://raw.githubusercontent.com/IcyDipity/KingsRaidIndex/master/images/heroes/Loman/Loman.png', crop: { x: 380, y: 240, size: 150 }, head: { x: 405, y: 280, size: 95 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Loman_Vari04_Body', 'Hero_Loman_Vari04_Hair'],
        right: 'Hero_Loman_Vari04_Weapon',
        blade: 'y',
      },
    },
  ],
};
