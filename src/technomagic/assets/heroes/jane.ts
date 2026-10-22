import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Jane, Alabaster Corpse (Hero_Jane_Vari05…): as King's Raid's own model has it, moved by King's Raid's
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
  victoryIdle: 'VictoryIdol',
  lose: 'Lose',
  dead: 'Dead',
  attack: [{ clips: ['Attack1-1'], hits: [0.3] }, { clips: ['Attack1-2'], hits: [0.4, 0.7] }, { clips: ['Attack1-3'], hits: [0.4] }],
  skills: {
    rites: { clips: ['Dash', 'Skill1'], hits: [1.9] },
    mark: { clips: ['Skill2'], hits: [0, 1.8, 2] },
    ruinday: { clips: ['Skill3'], hits: [2.6] },
  },
} as const satisfies KrAnimations;

export const JANE_ASSETS: HeroAssets = {
  name: 'Jane',
  folder: 'heroes/jane',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/24/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Its unique weapon, wielded.
  unique: { Hero_Jane_Vari05_Weapon: 'Hero_Jane_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Jane.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_shield_06', volume: 1.5 }], [{ clip: 'Hit_shield_06', volume: 1.5 }], [{ clip: 'Hit_shield_01', volume: 1.5 }]],
      rites: [[{ clip: 'Hit_shield_02', volume: 2 }]],
      mark: [[{ clip: 'Hit_shield_04', volume: 2.2 }]],
    },
    casts: {
      rites: [{ clip: 'Attack-Casting-02', volume: 1.3 }, { clip: 'Attack-Casting-07', volume: 2.5 }, { clip: 'Attack-Casting-05', volume: 2.5, at: 0.27 }, { clip: 'Jane-Vox_Skill1_b', volume: 3, at: 0.68, own: true }, { clip: 'Attack-Casting-16', volume: 2.2, at: 1.67 }, { clip: 'Attack-Casting-16', volume: 1.8, at: 1.67 }, { clip: 'Death-Fall-06', volume: 2.8, at: 1.67 }],
      mark: [{ clip: 'Attack-Casting-02', volume: 1.3 }, { clip: 'Attack-Casting-07', volume: 2.5 }, { clip: 'Jane-Vox_Skill2_c', volume: 2.5, at: 0.14, own: true }, { clip: 'Attack-Casting-05', volume: 2.5, at: 0.27 }, { clip: 'Attack-Magic-19', volume: 1.9, at: 1.6 }, { clip: 'FX-Jane-03', volume: 1.8, at: 1.63 }, { clip: 'Attack-Magic-23', volume: 1.9, at: 1.8 }, { clip: 'Attack-Magic-22', volume: 1.9, at: 2.05 }, { clip: 'FX-Jane-01', volume: 1.5, at: 3.01 }],
      ruinday: [{ clip: 'Attack-Casting-02', volume: 1.3 }, { clip: 'Attack-Casting-07', volume: 2.5 }, { clip: 'Jane-Vox_Skill3_c', volume: 2.5, own: true }, { clip: 'Attack-Casting-05', volume: 2.5, at: 0.27 }, { clip: 'FX-Jane-01', volume: 1.9, at: 1.41 }, { clip: 'Attack-Magic-19', volume: 1.9, at: 2.1 }, { clip: 'Attack-Magic-23', volume: 1.9, at: 2.3 }, { clip: 'Attack-Casting-24', volume: 2, at: 2.62 }, { clip: 'Attack-Magic-22', volume: 1.9, at: 2.88 }, { clip: 'FX-Jane-03', volume: 1.8, at: 4.42 }],
    },
    victory: [{ clip: 'Jane-Vox_Victory_b', volume: 2.2, at: 0.31, own: true }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Jane.Attack1.3', 'Skill.Hero.Jane.Attack1.2', 'Skill.Hero.Jane.Attack1.1'], land: ['Hit.Normal.StrikeBig'] },
    rites: { start: ['Skill.Hero.Jane.Skill1.Casting'], land: ['Skill.Hero.Jane.Skill1.Hit'] },
    mark: { start: ['Skill.Hero.Jane.Skill2.Mark', 'Skill.Hero.Jane.Skill2.Casting'], land: ['Skill.Hero.Jane.Skill2.Hit'] },
    ruinday: { start: ['Skill.Hero.Jane.Skill3.Casting'], land: ['Skill.Hero.Jane.Skill3.Hit'] },
  },
  skins: [
    {
      name: 'Jane',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Jane.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Jane.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Jane.webp',
      // Its artwork (the Drive folder's): its head in the crop (the meter's close-up is its face by itself).
      portrait: { file: 'Jane.png', from: `${DRIVE}17qqPX5asjcPaKUhcbO3fo-U0Er8aJTW4`, crop: { x: 150, y: 130, size: 320 }, head: { x: 212, y: 250, size: 160 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Jane_Vari05_Body', 'Hero_Jane_Vari05_Hair'],
        // (In its right hand, where King's Raid hangs it: Point_Hand_R.)
        right: 'Hero_Jane_Vari05_Weapon',
      },
    },
  ],
};
