import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Lorraine: her body and hair, and her staff in her right hand (her body's file marks only that hand, as Point_Weapon),
 * laid out along what was its y. She is moved by King's Raid's own animations of her (ANIMATIONS:
 * ../../heroes/body/kr.ts).
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
  attack: [{ clips: ['Attack1'], hits: [0.3] }],
  skills: {
    thornbush: { clips: ['Skill1'], hits: [1.6, 1.7, 1.8] },
    vine: { clips: ['Attack3'], hits: [1] },
    wrath: { clips: ['Skill2'], hits: [1.6, 1.8, 2, 2.2, 2.4, 2.6] },
  },
} as const satisfies KrAnimations;

export const LORRAINE_ASSETS: HeroAssets = {
  name: 'Lorraine',
  folder: 'heroes/lorraine',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/13/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her plants, the pitcher-plant monsters' (Characters Other/Creature Monster): Tangled Vine's vines (the stem, its two long
  // arms wound round the boss), Thornbush Forest's fly-traps (the trap at the tip of one arm), and Wrath of the Forest's
  // flowers (the four kinds). And her attack's thorns: the thorn-mushrooms' (Maps, Items, Other/Other).
  props: {
    vine: 'Mob_Nepenthes_Stem_Vari01_Mesh',
    trap: 'Mob_Nepenthes_FlyTrap_Vari01_Mesh',
    flower1: 'Mob_Nepenthes_Flower_Vari01_Mesh',
    flower2: 'Mob_Nepenthes_Flower_Vari02_Mesh',
    flower3: 'Mob_Nepenthes_Flower_Vari03_Mesh',
    flower4: 'Mob_Nepenthes_Flower_Vari04_Mesh',
    thorn: 'Monster_Muhroom_Thorn_Thorn',
  },
  // Her unique weapon, wielded: Roburu, her staff.
  unique: { Hero_Lorraine_Vari05_Weapon: 'Hero_Lorraine_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Lorraine.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); and as each skill begins.
  sounds: {
    hits: {
      lash: [[{ clip: 'Hit_gun_01', volume: 1.5 }]],
      thornbush: [[{ clip: 'Hit_gun_02', volume: 2 }]],
      vine: [[{ clip: 'Hit_gun_03', volume: 2 }]],
      wrath: [[{ clip: 'Hit_gun_04', volume: 2 }]],
    },
    casts: {
      thornbush: [{ clip: 'Lorraine-Vox_Skill1_b', volume: 2.5, at: 0.36, own: true }, { clip: 'Attack-Casting-02', volume: 2.8, at: 0.41 }, { clip: 'Attack-Casting-04', volume: 3.2, at: 0.52 }, { clip: 'FX-Lorraine-03', volume: 3.2, at: 2.32 }, { clip: 'Attack-Damage-34', volume: 3.2, at: 2.32 }, { clip: 'Attack-Damage-24', volume: 3.2, at: 2.5 }, { clip: 'Attack-Damage-05', volume: 3.2, at: 2.54 }, { clip: 'Attack-Damage-24', volume: 3.2, at: 2.6 }, { clip: 'Attack-Damage-05', volume: 3.2, at: 2.64 }, { clip: 'Attack-Damage-24', volume: 3.2, at: 2.7 }, { clip: 'Attack-Damage-24', volume: 2, at: 3.49 }],
      vine: [{ clip: 'Attack-Woosh-09', volume: 1.2, at: 0.37 }, { clip: 'Lorraine-Vox_Attack3', volume: 1.6, at: 0.78, own: true }, { clip: 'Attack-Woosh-08', volume: 1.2, at: 0.83 }, { clip: 'Attack-Magic-02', at: 0.95 }],
      wrath: [{ clip: 'Lorraine-Vox_Casting2', volume: 2.1, at: 0.08, own: true }, { clip: 'Attack-Casting-04', volume: 2.9, at: 0.15 }, { clip: 'Attack-Casting-02', volume: 2.9, at: 0.35 }, { clip: 'FX-Lorraine-02', volume: 2.65, at: 0.41 }, { clip: 'Lorraine-Vox_Skill3_b', volume: 2.5, at: 1.46, own: true }, { clip: 'FX-Lorraine-01', volume: 2.8, at: 1.52 }],
    },
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    lash: { land: ['Skill.Hero.Lorraine.Attack1.Projectile', 'Hit.Normal.Nature'] },
    thornbush: { start: ['Skill.Hero.Lorraine.Skill1.Casting'], land: ['Skill.Hero.Lorraine.Skill1.Hit'] },
    vine: { start: ['Skill.Hero.Lorraine.Attack3.Casting'], land: ['Skill.Hero.Lorraine.Attack3.Hit2.Start', 'Skill.Hero.Lorraine.Attack3.Hit2.End', 'Skill.Hero.Lorraine.Attack3.Hit2.Loop', 'Skill.Hero.Lorraine.Attack3.Hit'] },
    wrath: { start: ['Skill.Hero.Lorraine.Skill2.Casting'], land: ['Skill.Hero.Lorraine.Skill2.Projectile', 'Skill.Hero.Lorraine.Skill2.Hit', 'Hit.Normal.StrikeBig'] },
  },
  skins: [
    {
      name: 'Lorraine',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lorraine.webp',
      // Her newer artwork, sitting on the World Tree's roots under its flowers: her head and ears in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Lorraine.png', from: `${DRIVE}1mBAtFWXJu10lnOCXx7rzecxSsDuFvV51`, crop: { x: 450, y: 185, size: 185 }, head: { x: 490, y: 225, size: 115 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lorraine_Vari05_Body', 'Hero_Lorraine_Hair_01'],
        right: 'Hero_Lorraine_Vari05_Weapon',
        blade: 'y',
      },
    },
    // Her Christmas costume, with its own hair and staff.
    {
      name: 'Lorraine_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lorraine_Christmas.webp',
      // Her artwork, lying on a great cushion: her face is small in it.
      portrait: { file: 'Lorraine_Christmas.png', from: `${DRIVE}1m5CYTgPvIgBnDivY3QCu6mi524mV3Uie`, crop: { x: 335, y: 25, size: 140 }, head: { x: 360, y: 82, size: 75 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lorraine_Cos18Christmas_Body', 'Hero_Lorraine_Cos18Christmas_Hair'],
        right: 'Hero_Lorraine_Cos18Christmas_Weapon',
        blade: 'y',
      },
    },
  ],
};
