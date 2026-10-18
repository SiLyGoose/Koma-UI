import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Valance's files have only her fourth look (Hero_Valance_Vari04_…): her body (her face in it; Hero_Valance_Facial_Mesh
 * is only its expressions), and her technomagic crossbow, in her right hand: the only hand her file marks (at her feet,
 * as Seria's do, so it is held as GRIP has it). With no rig of hers, she stands, runs in and does the rest as
 * ../../heroes/valance/moves.ts has it.
 */

/**
 * How she holds her crossbow: by the cap at its back (where its file has its middle), in her palm, its bolt along her
 * hand and out past her fingers (the crossbow's own x, its single top limb its y), so it points where her hand does.
 */
const GRIP = { at: [0.06, 0, 0], turn: [0, 0, 0] } as const;

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
    prototype: { clips: ['Skill1'], hits: [3.2] },
    field: { clips: ['Skill2'], hits: [1.8] },
    cannon: { clips: ['Skill3'], hits: [0, 0.5, 0.7, 0.8, 0.9, 1, 1.1] },
  },
} as const satisfies KrAnimations;

export const VALANCE_ASSETS: HeroAssets = {
  name: 'Valance',
  folder: 'heroes/valance',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/101/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // King's Raid's sounds (its Hit.Hero.Valance.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); and as each skill begins.
  sounds: {
    hits: {
      bolt: [[{ clip: 'Dmg-Laser-01', volume: 2.3, at: 0.01 }]],
      cannon: [[{ clip: 'Dmg-Laser-01', volume: 2.3, at: 0.01 }]],
    },
    casts: {
      prototype: [{ clip: 'magic-gear-02', volume: 2.7, at: 0.033 }, { clip: 'Valance-Vox_Skill1', volume: 3.7, at: 0.7, own: true }, { clip: 'magic-gear-03', volume: 2.7, at: 1.8 }],
      field: [{ clip: 'magic-gear-04', volume: 2.8, at: 0.025 }, { clip: 'Valance-Vox_Skill7', volume: 4, at: 0.137, own: true }],
      cannon: [{ clip: 'magic-gear-05', volume: 2.8, at: 0.033 }, { clip: 'Valance-Vox_Skill2', volume: 4, at: 0.5, own: true }],
    },
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    bolt: { start: ['Skill.Hero.Valance.Attack1.Casting'], land: ['Skill.Hero.Valance.Attack1.Hit', 'Skill.Hero.Valance.Attack1.Projectile'] },
    prototype: { start: ['Skill.Hero.Valance.Skill1.Casting', 'Skill.Hero.Valance.Skill1.BuffCasting', 'Skill.Hero.Valance.Skill1.BuffEnd', 'Skill.Hero.Valance.Skill1.BuffLoop'], land: ['Skill.Hero.Valance.Skill1.Hit', 'Skill.Hero.Valance.Skill1.Projectile'] },
    field: { start: ['Skill.Hero.Valance.Skill2.Casting', 'Skill.Hero.Valance.Skill2.Loop', 'Skill.Hero.Valance.Skill2.Buff'] },
    cannon: { start: ['Skill.Hero.Valance.Skill3.Projecitle2', 'Skill.Hero.Valance.Skill3.Casting2', 'Skill.Hero.Valance.Skill3.Casting1', 'Skill.Hero.Valance.Skill3.Target', 'Skill.Hero.Valance.Skill3.Projecitle1', 'Skill.Hero.Valance.Skill3.End'], land: ['Skill.Hero.Valance.Skill3.Shot2', 'Skill.Hero.Valance.Skill3.CastingShot', 'Skill.Hero.Valance.Skill3.CastingShot-25', 'Skill.Hero.Valance.Skill3.Shot1', 'Skill.Hero.Valance.Skill3.CastingShot-18', 'Skill.Hero.Valance.Skill3.CastingShot-10'] },
  },
  skins: [
    {
      name: 'Valance',
      // Her artwork (from the wiki, asked for as the PNG it was uploaded as, not the WebP it is served as), her crossbow
      // flung out: her head and goggles in the crop (the meter's close-up is her face by itself).
      portrait: {
        file: 'Valance.png',
        from: 'https://static.wikia.nocookie.net/charactah-account/images/a/a5/Valance_Render_01.png/revision/latest?cb=20221002060111&format=original',
        crop: { x: 360, y: 30, size: 125 },
        head: { x: 385, y: 80, size: 72 },
      },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Valance_Vari04_Mesh'],
        right: 'Hero_Valance_Vari04_Weapon',
        grips: { R: GRIP },
        heldStill: ['R'],
      },
    },
  ],
};
