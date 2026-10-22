import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Isolet, the Witch of Technomagic (Hero_Isolet_…): her body, hair and her weapon on her own skeleton, as King's Raid's own model has them. She is
 * moved by King's Raid's own animations of her (ANIMATIONS: ../../heroes/body/kr.ts).
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
  attack: [{ clips: ['Attack'], hits: [1.1] }],
  skills: {
    caienne: { clips: ['Skill1'], hits: [1.8] },
    devion: { clips: ['Skill2'], hits: [1.8] },
    icarus: { clips: ['Skill3'], hits: [1.9] },
  },
} as const satisfies KrAnimations;

export const ISOLET_ASSETS: HeroAssets = {
  name: 'Isolet',
  folder: 'heroes/isolet',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/92/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded.
  unique: { Hero_Isolet_Vari05_Weapon: 'Hero_Isolet_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Isolet.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Dmg_bell_02', volume: 1.5, at: 0.01 }]],
      caienne: [[{ clip: 'Hit_common_01', volume: 1.5, at: 0.02 }]],
      devion: [[{ clip: 'Hit_common_02', volume: 1.5, at: 0.02 }]],
    },
    casts: {
      caienne: [{ clip: 'Isolet-Vox_Skill4', volume: 2.8, at: 0.161, own: true }, { clip: 'Cast-05', volume: 2.6, at: 0.161 }, { clip: 'Fire-Swish-02', volume: 2.6, at: 1.765 }],
      devion: [{ clip: 'Skill-Cast-Ice-01', volume: 2.6, at: 0.303 }, { clip: 'Isolet-Vox_Skill6', volume: 2.8, at: 0.591, own: true }, { clip: 'Skill-Impact-02', volume: 2.3, at: 1.815 }, { clip: 'Skill-Cast-01', volume: 2.3, at: 1.815 }, { clip: 'Wind-01', volume: 2.3, at: 1.815 }],
      icarus: [{ clip: 'Isolet-Vox_Skill3', volume: 2.8, at: 0.242, own: true }, { clip: 'Skill-Swish-02', volume: 2.6, at: 0.303 }, { clip: 'Whoosh-Spin-02', volume: 2.6, at: 0.609 }, { clip: 'Exp-Fire-01', volume: 2.6, at: 1.867 }, { clip: 'Magic-Wind-01', volume: 2, at: 2.345 }],
    },
    victory: [{ clip: 'Isolet-Vox_Victory', volume: 3, at: 0.227, own: true }, { clip: 'Idle-Gear-01', volume: 2.8, at: 0.426 }, { clip: 'Texture-17', volume: 2.8, at: 1.606 }, { clip: 'Texture-18', volume: 2.8, at: 3.046 }, { clip: 'Idle-Metal-01', volume: 2.8, at: 3.8 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Isolet.Attack1.Casting'], land: ['Skill.Hero.Isolet.Attack1.Hit', 'Skill.Hero.Isolet.Attack1.Projectile'] },
    caienne: { start: ['Skill.Hero.Isolet.Skill1.Casting'], land: ['Skill.Hero.Isolet.Skill1.FireHitLoop', 'Skill.Hero.Isolet.Skill1.Hit'] },
    devion: { start: ['Skill.Hero.Isolet.Skill2.Casting'], land: ['Skill.Hero.Isolet.Skill2.HitLoop', 'Skill.Hero.Isolet.Skill2.Hit2', 'Skill.Hero.Isolet.Skill2.Hit', 'Skill.Hero.Isolet.Skill2.HitEnd', 'Skill.Hero.Isolet.Skill2.HitCasting'] },
    icarus: { start: ['Skill.Hero.Isolet.Skill3.Tornado.Casting', 'Skill.Hero.Isolet.Skill3.Casting', 'Skill.Hero.Isolet.Skill3.FireTornado.Casting', 'Skill.Hero.Isolet.Skill3.FireTornado.End', 'Skill.Hero.Isolet.Skill3.Tornado.Loop', 'Skill.Hero.Isolet.Skill3.FireTornado.Loop', 'Skill.Hero.Isolet.Skill3.Tornado.End'] },
  },
  skins: [
    {
      name: 'Isolet',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Isolet.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Isolet.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Isolet.webp',
      // Her artwork (krinfo.net's; the Drive folder has none of her): her head and the brim of her hat in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Isolet.png', from: 'https://krinfo.net/kingsraid-data/assets/heroes/Isolet/cos/Basic.png', crop: { x: 405, y: 235, size: 105 }, head: { x: 424, y: 278, size: 60 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Isolet_Vari05_Body', 'Hero_Isolet_Vari05_Hair'],
        // (Held in her left hand, where King's Raid hangs it: Point_Hand_L.)
        left: 'Hero_Isolet_Vari05_Weapon',
        offHand: 'held',
      },
    },
  ],
};
