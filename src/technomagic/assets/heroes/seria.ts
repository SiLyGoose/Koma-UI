import type { HeroAssets, PartsModel, KrAnimations } from '../types.ts';

/*
 * Seria: her body (her hair is a part of its own, the first of her files'), her sword in her right hand (its blade
 * along what was its y, as Klaus's) and its sheath held in her left. She is moved by King's Raid's own animations of
 * her (ANIMATIONS: ../../heroes/body/kr.ts).
 */

const DRIVE = 'https://drive.google.com/uc?export=download&id=';

/**
 * How her hands hold her sword and sheath (her body's files mark both hands at her feet): her sword by the middle of
 * its grip, its blade out past her little finger, so it points away from her as she swings it (her slash's animation
 * holds a sword that way); her sheath in her left hand as Morrah holds her sword, mirrored and turned about, so it runs
 * back past her little finger and the hilt in it is forward, ready to be drawn.
 */
const GRIPS = {
  R: { at: [0.064, -0.149, 0.002], turn: [Math.PI, 0.436, 0] },
  L: { at: [0.064, 0.021, 0.002], turn: [Math.PI, -0.436, 0] },
} as const satisfies PartsModel['grips'];


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
  attack: [{ clips: ['Attack1-1'], hits: [0.4] }, { clips: ['Attack1-2'], hits: [0.5] }, { clips: ['Attack1-3'], hits: [0.4, 0.8] }],
  skills: {
    petals: { clips: ['Skill1-1', 'Skill1-2'], hits: [0.5, 2.2] },
    scatter: { clips: ['Skill2-1', 'Dash'], hits: [] },
    moon: { clips: ['Skill3-1', 'Skill3-2', 'Skill3-3'], hits: [0, 2.2, 3] },
    blossom: { clips: ['Skill1-1', 'Skill1-2'], hits: [0.5, 2.2] },
  },
} as const satisfies KrAnimations;

export const SERIA_ASSETS: HeroAssets = {
  name: 'Seria',
  folder: 'heroes/seria',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/52/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Elsion, her sword and its sheath.
  unique: { Hero_Seria_Vari05_WeaponA: 'Hero_Seria_Unique01_WeaponA', Hero_Seria_Vari05_WeaponB: 'Hero_Seria_Unique01_WeaponB' },
  // King's Raid's sounds (its Hit.Hero.Seria.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_sword_01', volume: 1.5 }]],
      petals: [[{ clip: 'Hit_sword_02', volume: 2 }]],
      scatter: [[{ clip: 'Hit_sword_03', volume: 2 }]],
      moon: [[{ clip: 'Damage_01', volume: 2 }]],
      blossom: [[{ clip: 'Hit_sword_02', volume: 2 }]],
    },
    casts: {
      petals: [{ clip: 'Attack-Casting-20', volume: 1.2 }, { clip: 'Attack-Cut-04', volume: 1.5, at: 0.36 }, { clip: 'Seria-Vox_Skill1', volume: 3.2, at: 0.44, own: true }],
      scatter: [{ clip: 'Seria-Vox_Skill2', volume: 3.2, at: 0.05, own: true }, { clip: 'Attack-Cut-04', volume: 1.5, at: 0.25 }, { clip: 'Attack-Magic-09', volume: 1.3, at: 0.36 }, { clip: 'Attack-Casting-09', volume: 1.2, at: 1.39 }, { clip: 'Attack-Casting-09', volume: 1.2, at: 1.73 }, { clip: 'FX-Sword-10', volume: 1.5, at: 2.37 }, { clip: 'Attack-Magic-05', volume: 1.3, at: 2.77 }],
      moon: [{ clip: 'Attack-Casting-09', volume: 1.3 }, { clip: 'Seria-Vox_Skill5', volume: 3.2, own: true }, { clip: 'Attack-Casting-07', volume: 1.1, at: 0.45 }, { clip: 'Attack-Casting-34', volume: 1.8, at: 0.63 }, { clip: 'Attack-Casting-26', volume: 1.3, at: 0.74 }],
    },
    victory: [{ clip: 'Attack-Jump-01', volume: 1.2, at: 0.31 }, { clip: 'Attack-Body-02', volume: 1.2, at: 0.74 }, { clip: 'Attack-Cut-08', volume: 1.3, at: 1.59 }, { clip: 'Seria-Vox_Victory', volume: 3.2, at: 1.6, own: true }, { clip: 'Attack-Spin-01', volume: 1.3, at: 2.72 }, { clip: 'FX-Sword-07', volume: 1.3, at: 3.27 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Seria.Attack1.Casting1', 'Skill.Hero.Seria.Attack1.Casting3', 'Skill.Hero.Seria.Attack1.Casting2'], land: ['Skill.Hero.Seria.Attack1.Hit'] },
    petals: { start: ['Skill.Hero.Seria.Skill1-1.Casting', 'Skill.Hero.Seria.Skill1-2.Casting'], land: ['Skill.Hero.Seria.Hit1', 'Skill.Hero.Seria.Hit2'] },
    scatter: { start: ['Skill.Hero.Seria.Skill2.Slash', 'Skill.Hero.Seria.Skill2.Casting'], land: ['Skill.Hero.Seria.Skill2.HitLoop', 'Skill.Hero.Seria.Skill2.Hit'] },
    moon: { start: ['Skill.Hero.Seria.Skill3.Casting1Loop', 'Skill.Hero.Seria.Skill3.Casting2', 'Skill.Hero.Seria.Skill3.Casting1', 'Skill.Hero.Seria.Skill3.Moon1', 'Skill.Hero.Seria.Skill3.Moon2', 'Skill.Hero.Seria.Skill3.Moon3', 'Skill.Hero.Seria.Skill3.Icon'] },
    blossom: { start: ['Skill.Hero.Seria.Skill1-1.Casting', 'Skill.Hero.Seria.Skill1-2.Casting'], land: ['Skill.Hero.Seria.Hit1', 'Skill.Hero.Seria.Hit2'] },
  },
  skins: [
    {
      name: 'Seria',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Seria.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Seria.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Seria.webp',
      // Her artwork, crouched with her sword drawn: her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Seria.png', from: `${DRIVE}1eTijd3ZY18qjl6KknmLWuOYgZQCwDCrN`, crop: { x: 605, y: 70, size: 200 }, head: { x: 655, y: 160, size: 120 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Seria_Vari05_Body', 'Hero_Seria_Hair_01'],
        left: 'Hero_Seria_Vari05_WeaponB',
        right: 'Hero_Seria_Vari05_WeaponA',
        offHand: 'held',
        blade: 'y',
        grips: GRIPS,
      },
    },
    // Her Christmas costume, with its own hair, sword and sheath.
    {
      name: 'Seria_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Seria_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Seria_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Seria_Christmas.webp',
      title: 'Christmas of an Exorcist Seria',
      portrait: { file: 'Seria_Christmas.png', from: `${DRIVE}1zbsVdK__ytCQ-YxrIpRV_SNKRaDSqamX`, crop: { x: 345, y: 10, size: 200 }, head: { x: 400, y: 118, size: 115 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Seria_Cos19Christmas_Body', 'Hero_Seria_Cos19Christmas_Hair'],
        left: 'Hero_Seria_Cos19Christmas_Weapon_B',
        right: 'Hero_Seria_Cos19Christmas_Weapon_A',
        offHand: 'held',
        blade: 'y',
        grips: GRIPS,
      },
    },
    // King's Raid's NewYear costume (tm-costumes.mjs).
    {
      name: 'Seria_NewYear',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Seria_NewYear.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Seria_NewYear.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Seria_NewYear.webp',
      title: 'Priestess Seria',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Seria_Cos19NewYear_Body', 'Hero_Seria_Hair_01'],
        left: 'Hero_Seria_Cos19NewYear_WeaponB',
        right: 'Hero_Seria_Cos19NewYear_WeaponA',
        offHand: 'held',
        blade: 'y',
        grips: GRIPS,
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Seria_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Seria_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Seria_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Seria_Wedding.webp',
      title: 'A Resting Sword Seria',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Seria_Cos19Wedding_Body', 'Hero_Seria_Cos19Wedding_Hair'],
        left: 'Hero_Seria_Cos19Wedding_WeaponB',
        right: 'Hero_Seria_Cos19Wedding_WeaponA',
        offHand: 'held',
        blade: 'y',
        grips: GRIPS,
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Seria_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Seria_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Seria_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Seria_Summer.webp',
      title: 'Beachside Seria',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Seria_Cos19Summer_Body', 'Hero_Seria_Hair_01'],
        left: 'Hero_Seria_Cos19Summer_Weapon_B',
        right: 'Hero_Seria_Cos19Summer_Weapon_A',
        offHand: 'held',
        blade: 'y',
        grips: GRIPS,
      },
    },
    // King's Raid's School costume (tm-costumes.mjs).
    {
      name: 'Seria_School',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Seria_School.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Seria_School.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Seria_School.webp',
      title: 'Kendo Club Seria',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Seria_Cos20SL_Body', 'Hero_Seria_Hair_01'],
        left: 'Hero_Seria_Cos20SL_Weapon_B',
        right: 'Hero_Seria_Cos20SL_Weapon_A',
        offHand: 'held',
        blade: 'y',
        grips: GRIPS,
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Seria_Glory',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Seria_Glory.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Seria_Glory.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Seria_Glory.webp',
      title: 'Seria of Honor (Call of Dawn)',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Seria_Cos20GloryLeague1_Body', 'Hero_Seria_Cos20GloryLeague1_Hair'],
        left: 'Hero_Seria_Cos20GloryLeague1_Weapon_B',
        right: 'Hero_Seria_Cos20GloryLeague1_Weapon_A',
        offHand: 'held',
        blade: 'y',
        grips: GRIPS,
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Seria_Glory2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Seria_Glory2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Seria_Glory2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Seria_Glory2.webp',
      title: 'Seria of Glaring Honor (Call of Dawn)',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Seria_Cos20GloryLeague2_Body', 'Hero_Seria_Cos20GloryLeague2_Hair'],
        left: 'Hero_Seria_Cos20GloryLeague2_Weapon_B',
        right: 'Hero_Seria_Cos20GloryLeague2_Weapon_A',
        offHand: 'held',
        blade: 'y',
        grips: GRIPS,
      },
    },
    // King's Raid's Fallen costume (tm-costumes.mjs).
    {
      name: 'Seria_Fallen',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Seria_Fallen.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Seria_Fallen.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Seria_Fallen.webp',
      title: 'Corrupted Diligence Seria',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Seria_Cos21Fallen_Body', 'Hero_Seria_Cos21Fallen_Hair'],
        left: 'Hero_Seria_Cos21Fallen_Weapon_B',
        right: 'Hero_Seria_Cos21Fallen_Weapon_A',
        offHand: 'held',
        blade: 'y',
        grips: GRIPS,
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Seria_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Seria_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Seria_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Seria_Halloween.webp',
      title: 'Candy for the One Seria',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Seria_Cos21Halloween_Body', 'Hero_Seria_Cos21Halloween_Hair'],
        left: 'Hero_Seria_Cos21Halloween_Weapon_B',
        right: 'Hero_Seria_Cos21Halloween_Weapon_A',
        offHand: 'held',
        blade: 'y',
        grips: GRIPS,
      },
    },
  ],
};
