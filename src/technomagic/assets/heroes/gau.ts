import type { HeroAssets, PartsModel, KrAnimations } from '../types.ts';

/*
 * Gau, a beastman, in his fourth look (Hero_Gau_Vari04_…: his fifth's body has its colour picture spoiled, one hue all
 * over): his body (all of him in one), and his great axe in his right hand, laid out along what was its y. He is moved
 * by King's Raid's own animations of him (ANIMATIONS: ../../heroes/body/kr.ts).
 */

/**
 * How his right hand holds his axe for his animations: its handle out from his fist partway along his forearm (40° off
 * it, as Phillop holds his), so it hangs at his side as he stands, rises over him as he winds up, and comes down on the boss
 * edge first (turned a quarter round its handle from how Phillop holds his: held so, it came down flat).
 */
const GRIPS = { R: { at: [0.111, 0.075, 0.008], turn: [1.011, -0.232, -1.57] } } as const satisfies PartsModel['grips'];


/**
 * King's Raid's own animations (its skins of the game's files are moved by them: ../../heroes/body/kr.ts): its basic attack's
 * chain, and each skill's clips, with when its blows land in them as the game's timelines have them (KR-extracted/scripts/tm-anims.mjs).
 */
const ANIMATIONS = {
  idle: 'Idle',
  run: 'Run',
  hurt: 'Damage',
  attack: [{ clips: ['Attack1-1'], hits: [0.9] }, { clips: ['Attack1-2'], hits: [0.3, 0.7] }, { clips: ['Attack1-3'], hits: [0.3] }],
  skills: {
    smash: { clips: ['Attack2'], hits: [0.8, 1.8] },
    warcry: { clips: ['Skill1'], hits: [1.5] },
    vortex: { clips: ['Skill2'], hits: [0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.6, 2.8, 3.4] },
  },
} as const satisfies KrAnimations;

export const GAU_ASSETS: HeroAssets = {
  name: 'Gau',
  folder: 'heroes/gau',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/5/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded: Numinu, his axe.
  unique: { Hero_Gau_Vari04_Weapon: 'Hero_Gau_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Gau.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); and as each skill begins.
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_axe_03', volume: 1.5 }]],
      smash: [[{ clip: 'Hit_axe_02', volume: 2 }]],
      warcry: [[{ clip: 'Hit_axe_01', volume: 2 }]],
      vortex: [[{ clip: 'Hit_axe_02', volume: 2 }]],
    },
    casts: {
      smash: [{ clip: 'Gau-Vox_Attack4', volume: 1.8, at: 0.11, own: true }, { clip: 'Attack-Woosh-01', volume: 1.1, at: 0.7 }, { clip: 'Attack-Woosh-09', volume: 1.1, at: 0.71 }, { clip: 'Gau-Vox_Skill1_b', volume: 2, at: 0.86, own: true }, { clip: 'Attack-Woosh-08', volume: 1.1, at: 1.26 }, { clip: 'Attack-Jump-01', volume: 0.7, at: 1.27 }, { clip: 'Attack-Woosh-01', volume: 1.1, at: 1.61 }, { clip: 'Attack-Woosh-09', volume: 1.1, at: 1.62 }, { clip: 'Attack-Cut-04', volume: 0.95, at: 1.64 }, { clip: 'Death-Fall-02', volume: 1.1, at: 1.78 }],
      warcry: [{ clip: 'Attack-Casting-07', volume: 2.9, at: 0.08 }, { clip: 'Attack-Casting-05', volume: 2.9, at: 0.12 }, { clip: 'Attack-Body-02', volume: 2.6, at: 0.21 }, { clip: 'Attack-Landing-01', volume: 3.3, at: 0.37 }, { clip: 'Gau-Vox_Skill2_b', volume: 2, at: 0.38, own: true }, { clip: 'Death-Fall-04', volume: 3.2, at: 0.39 }, { clip: 'Attack-Body-02', volume: 2.6, at: 0.64 }, { clip: 'Death-Fall-04', volume: 3.2, at: 0.72 }, { clip: 'Attack-Landing-01', volume: 3.3, at: 0.72 }, { clip: 'Attack-Woosh-09', volume: 2.7, at: 1.46 }, { clip: 'Attack-Woosh-08', volume: 2.7, at: 1.47 }, { clip: 'Attack-Magic-03', volume: 3.2, at: 1.49 }, { clip: 'Attack-Shot-09', volume: 3.2, at: 1.64 }],
      vortex: [{ clip: 'Attack-Magic-11', volume: 3, at: 1.01 }, { clip: 'Attack-Woosh-02', volume: 3.5, at: 1.02 }, { clip: 'Attack-Damage-22', volume: 2.5, at: 1.02 }, { clip: 'Gau-Vox_Skill3_b', volume: 1.5, at: 1.18, own: true }, { clip: 'Attack-Woosh-02', volume: 3.5, at: 1.25 }, { clip: 'Attack-Woosh-02', volume: 3.5, at: 1.48 }, { clip: 'Attack-Woosh-02', volume: 3.5, at: 1.7 }, { clip: 'Attack-Woosh-02', volume: 3.5, at: 1.93 }, { clip: 'Attack-Woosh-02', volume: 3.5, at: 2.16 }, { clip: 'Attack-Woosh-02', volume: 3.5, at: 2.37 }, { clip: 'Attack-Woosh-02', volume: 3.5, at: 2.6 }, { clip: 'Attack-Woosh-08', volume: 3.2, at: 3.38 }, { clip: 'Attack-Woosh-09', volume: 3.2, at: 3.41 }],
    },
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Gau.Attack1', 'Skill.Hero.Gau.Re.Attack1.Casting'], land: ['Hit.Normal.AxeHit', 'Hit.Normal.SlashBig'] },
    smash: { start: ['Skill.Hero.Gau.Attack2.Casting', 'Skill.Hero.Gau.Attack2.Casting.Billboard'], land: ['Skill.Hero.Gau.Attack2.Hit.Horizontal', 'Skill.Hero.Gau.Attack2.Hit.Vertical', 'Hit.Normal.StrikeBig'] },
    warcry: { start: ['Skill.Hero.Gau.Skill1.Casting1', 'Skill.Hero.Gau.Skill1.Casting2'] },
    vortex: { start: ['Skill.Hero.Gau.Skill2'] },
  },
  skins: [
    {
      name: 'Gau',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Gau.webp',
      // His artwork (the King's Raid Index's): his head and mane in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Gau.png', from: 'https://raw.githubusercontent.com/IcyDipity/KingsRaidIndex/master/images/heroes/Gau/Gau.png', crop: { x: 490, y: 75, size: 180 }, head: { x: 520, y: 110, size: 120 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Gau_Vari04_Mesh'],
        right: 'Hero_Gau_Vari04_Weapon',
        blade: 'y',
        grips: GRIPS,
      },
    },
  ],
};
