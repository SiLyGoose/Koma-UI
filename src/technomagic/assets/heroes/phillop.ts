import type { HeroAssets, PartsModel, KrAnimations } from '../types.ts';

/*
 * Phillop, a dwarf, in his fourth look (Hero_Phillop_Vari04_…: his fifth's body has its colour picture spoiled, one hue
 * all over): his body (all of him in one), his shield on his left arm and his axe in his right, laid out along what was
 * its y. He is moved by King's Raid's own animations of him (ANIMATIONS: ../../heroes/body/kr.ts). (His unique weapon's
 * file is his axe and shield in one: he looks the same with it.)
 */

/**
 * How his right hand holds his axe for his animations: its handle out from his fist partway along his forearm (40° off
 * it), so it hangs at his side as he stands, rises behind him as he winds up, and comes down on the boss.
 */
const GRIPS = { R: { at: [0.111, 0.075, 0.008], turn: [-0.304, 0.496, -1.441] } } as const satisfies PartsModel['grips'];


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
  attack: [{ clips: ['Attack1-1'], hits: [0.4] }, { clips: ['Attack1-2'], hits: [0.3, 0.6] }, { clips: ['Attack1-3'], hits: [0.2] }, { clips: ['Attack1-4'], hits: [0.6] }],
  skills: {
    collision: { clips: ['Skill1'], hits: [0.8, 1.4] },
    headbutt: { clips: ['Attack2'], hits: [0.9] },
    incarnate: { clips: ['Skill2'], hits: [0.9] },
  },
} as const satisfies KrAnimations;

export const PHILLOP_ASSETS: HeroAssets = {
  name: 'Phillop',
  folder: 'heroes/phillop',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/6/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // King's Raid's sounds (its Hit.Hero.Phillop.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_axe_01', volume: 1.5 }]],
      collision: [[{ clip: 'Hit_axe_02', volume: 2 }]],
      headbutt: [[{ clip: 'Hit_axe_03', volume: 2 }]],
    },
    casts: {
      collision: [{ clip: 'Phillop-Vox_Skill1_c', volume: 2.5, own: true }, { clip: 'Attack-Casting-04', volume: 3.1, at: 0.12 }, { clip: 'Attack-Jump-01', volume: 2.85, at: 0.13 }, { clip: 'Attack-Magic-15', volume: 2.9, at: 0.28 }, { clip: 'Attack-Magic-02', volume: 2.95, at: 0.67 }, { clip: 'Attack-Woosh-06', volume: 3.1, at: 0.74 }, { clip: 'Attack-Landing-01', volume: 2.7, at: 0.75 }, { clip: 'Attack-Woosh-02', volume: 3.1, at: 1.27 }, { clip: 'Attack-Woosh-08', volume: 3.1, at: 1.3 }, { clip: 'Attack-Woosh-09', volume: 3.1, at: 1.32 }, { clip: 'Attack-Magic-08', volume: 3.1, at: 1.35 }, { clip: 'Phillop-Vox_Skill1', volume: 2.2, at: 1.38, own: true }],
      headbutt: [{ clip: 'Phillop-Vox_Skill2', volume: 2.2, own: true }, { clip: 'Attack-Magic-15', volume: 0.7, at: 0.04 }, { clip: 'Attack-Magic-01', volume: 0.8, at: 0.1 }, { clip: 'Attack-Casting-06', volume: 0.5, at: 0.48 }, { clip: 'Attack-Woosh-09', volume: 0.7, at: 0.95 }, { clip: 'Attack-Magic-05', volume: 1.2, at: 0.96 }, { clip: 'Attack-Jump-01', at: 1 }, { clip: 'Attack-Damage-32', volume: 1.3, at: 1.03 }],
      incarnate: [{ clip: 'Attack-Casting-04', volume: 2.8, at: 0.04 }, { clip: 'Attack-Body-02', volume: 2.6, at: 0.05 }, { clip: 'Phillop-Vox_Skill3_b', volume: 2.5, at: 0.08, own: true }, { clip: 'Attack-Magic-05', volume: 3.2, at: 0.88 }, { clip: 'Attack-Magic-21', volume: 2.95, at: 0.88 }, { clip: 'Attack-Magic-02', volume: 2.1, at: 0.89 }],
    },
    victory: [{ clip: 'Attack-Jump-02', at: 0.53 }, { clip: 'Death-Sword-02', at: 0.55 }, { clip: 'Attack-Woosh-10', at: 0.6 }, { clip: 'Phillop-Vox_Victory', volume: 1.8, at: 0.61, own: true }, { clip: 'FX-Machine-03', at: 1.07 }, { clip: 'Death-Sword-01', at: 1.55 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Phillop.Re.Attack1.Casting2', 'Skill.Hero.Phillop.Re.Attack1.Casting3', 'Skill.Hero.Phillop.Re.Attack1.Casting1', 'Skill.Hero.Phillop.Re.Attack1.Casting4', 'Skill.Hero.Phillop.Attack1'], land: ['Skill.Hero.Phillop.Re.Attack1.Hit', 'Hit.Normal.SlashBig', 'Hit.Normal.StrikeBig', 'Hit.Normal.AxeHit'] },
    collision: { start: ['Skill.Hero.Phillop.Skill1', 'Skill.Hero.Phillop.Re.Skill1.Casting'] },
    headbutt: { start: ['Skill.Hero.Phillop.Attack2'], land: ['Hit.Physical.03', 'Hit.Normal.ArrowHit', 'Common.Aura3'] },
    incarnate: { start: ['Skill.Hero.Phillop.Re.Skill2.Casting'] },
  },
  skins: [
    {
      name: 'Phillop',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Phillop.webp',
      // His artwork (from the wiki, asked for as the PNG it was uploaded as), sitting by his barrels with a tankard: his head and helm in the crop (the meter's close-up is his face by itself).
      portrait: {
        file: 'Phillop.png',
        from: 'https://static.wikia.nocookie.net/charactah-account/images/b/bd/Phillop_Render_01.png/revision/latest?cb=20220927052432&format=original',
        crop: { x: 220, y: 180, size: 190 },
        head: { x: 250, y: 220, size: 120 },
      },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Phillop_Vari04_Mesh'],
        left: 'Hero_Phillop_Vari04_Shield',
        right: 'Hero_Phillop_Vari04_Axe',
        blade: 'y',
        grips: GRIPS,
      },
    },
  ],
};
