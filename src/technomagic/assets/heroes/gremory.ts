import type { HeroAssets, KrAnimations } from '../types.ts';

/**
 * Her cube, floating under her, big enough to lie on: she lies on her side along its top, her head at its back and
 * her right knee over its front edge (its top just under her as she lies: her moves, ../../heroes/gremory/moves.ts,
 * keep her there). The same for both her skins.
 */
const CUBE = { at: [0, 0.52, -0.1], size: 1.1 } as const;

/**
 * King's Raid's own animations (its skins of the game's files are moved by them: ../../heroes/body/kr.ts): its basic attack's
 * chain, and each skill's clips, with when its blows land in them as the game's timelines have them (KR-extracted/scripts/tm-anims.mjs).
 */
const ANIMATIONS = {
  idle: 'Idle',
  run: 'Run',
  hurt: 'Damage',
  attack: [{ clips: ['Attack1'], hits: [1, 1.1, 1.2] }],
  skills: {
    pochi: { clips: ['Skill1'], hits: [2.5, 2.7, 2.9, 3.1, 3.3] },
    puchi: { clips: ['Skill2'], hits: [3.2] },
    pippi: { clips: ['Skill3'], hits: [3.8] },
  },
} as const satisfies KrAnimations;

export const GREMORY_ASSETS: HeroAssets = {
  name: 'Gremory',
  folder: 'heroes/gremory',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/94/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Pigritia, her cube.
  unique: { Hero_Gremory_Vari05_Weapon: 'Hero_Gremory_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Gremory.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); and as each skill begins.
  sounds: {
    hits: {
      nudge: [[{ clip: 'Hit_common_01', volume: 1.5, at: 0.02 }]],
      pochi: [[{ clip: 'Hit_common_02', volume: 1.5, at: 0.02 }]],
      puchi: [[{ clip: 'Hit_common_03', volume: 1.5, at: 0.02 }]],
      pippi: [[{ clip: 'Hit_common_04', volume: 1.5, at: 0.02 }]],
    },
    casts: {
      pochi: [{ clip: 'Cast-15', volume: 2.6, at: 0.122 }, { clip: 'Gremory-Vox_Skill1_a', volume: 3.6, at: 0.444, own: true }, { clip: 'Shot-magic-02', volume: 2.6, at: 1.38 }, { clip: 'Shot-magic-03', volume: 2.6, at: 2.451 }, { clip: 'Liquid_fx_01', volume: 2.6, at: 2.935 }, { clip: 'Mon_vc_01', volume: 2.6, at: 2.935 }],
      puchi: [{ clip: 'Gremory-Vox_Skill2', volume: 2.9, at: 0.043, own: true }, { clip: 'Texture-06', volume: 2.6, at: 0.204 }, { clip: 'Cast-16', volume: 2.6, at: 0.469 }, { clip: 'Shot-magic-04', volume: 2.6, at: 2.264 }, { clip: 'Mon_vc_03', volume: 2.6, at: 3.216 }, { clip: 'Exp_04', volume: 2.6, at: 3.216 }, { clip: 'Exp_03', volume: 2.6, at: 3.857 }, { clip: 'Mon_vc_04', volume: 2.6, at: 3.857 }],
      pippi: [{ clip: 'Dark-fx-01', volume: 2.6, at: 0.071 }, { clip: 'Gremory-Vox_Skill6_a', volume: 3.6, at: 0.48, own: true }, { clip: 'Cast-17', volume: 2.6, at: 0.998 }, { clip: 'Texture-06', volume: 2.6, at: 3.537 }, { clip: 'Poison-shot-01', volume: 2.6, at: 3.715 }, { clip: 'Whoosh-wind-01', volume: 2.6, at: 4.214 }],
    },
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    nudge: { start: ['Skill.Hero.Gremory.Attack1.Casting'], land: ['Skill.Hero.Gremory.Attack1.Hit', 'Skill.Hero.Gremory.Attack1.Projectile'] },
    pochi: { start: ['Skill.Hero.Gremory.Skill1.Casting'] },
    puchi: { start: ['Skill.Hero.Gremory.Skill2.Casting'] },
    pippi: { start: ['Skill.Hero.Gremory.Skill3.Casting'] },
  },
  skins: [
    // As in her artwork: no hood, her cape about her hips, her long hair and horns. Her files' own texture for this
    // body is tinted orange: it is drawn with her hooded body's, on the same layout. (Her files have her hood up and
    // open too: Hero_Gremory_Vari05_Hood and _HoodOpen, each with its own hair.)
    {
      name: 'Gremory',
      // Her artwork, sitting on her cube (its face is small: the meter's close-up is her face by itself).
      portrait: { file: 'Gremory.png', crop: { x: 315, y: 132, size: 80 }, head: { x: 327, y: 142, size: 56 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Gremory_Vari05_Normal', 'Hero_Gremory_Vari05_Hair'],
        repaint: { from: 'Hero_Gremory_Vari05_Normal', to: 'Hero_Gremory_Vari05_Hood' },
        floating: { model: 'Hero_Gremory_Vari05_Weapon', ...CUBE },
      },
    },
    // Her Daily Look: its body has her hair in it.
    {
      name: 'Gremory_DailyLook',
      // Her artwork in her hoodie, sitting on her cube (the King's Raid wiki's: `format=original` has it send the PNG, not a WebP):
      // her hood and horns in the crop, her face by itself the meter's close-up.
      portrait: {
        file: 'Gremory_DailyLook.png',
        from: 'https://static.wikia.nocookie.net/charactah-account/images/6/69/Gremory_%28King%27s_Raid%29_Render_02.png/revision/latest?cb=20220930050745&format=original',
        crop: { x: 225, y: 0, size: 175 },
        head: { x: 250, y: 80, size: 108 },
      },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Gremory_Cos21DailyLook_Body'],
        floating: { model: 'Hero_Gremory_Cos21DailyLook_Weapon', ...CUBE },
      },
    },
  ],
};
