import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Shamilla, The Vessel of Curses (Hero_Shamilla_Vari05…): as King's Raid's own model has it, moved by King's Raid's
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
  lose: 'Lose',
  dead: 'Dead',
  attack: [{ clips: ['Attack1'], hits: [0.8] }],
  skills: {
    petrify: { clips: ['Skill1'], hits: [1.6] },
    timecurse: { clips: ['Skill2'], hits: [1.7] },
    pain: { clips: ['Skill3'], hits: [2.4] },
  },
} as const satisfies KrAnimations;

export const SHAMILLA_ASSETS: HeroAssets = {
  name: 'Shamilla',
  folder: 'heroes/shamilla',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/50/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Its unique weapon, wielded.
  unique: { Hero_Shamilla_Vari05_Weapon: 'Hero_Shamilla_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Shamilla.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_gun_02', volume: 1.5 }]],
      petrify: [[{ clip: 'Hit_magic_02', volume: 2 }]],
      timecurse: [[{ clip: 'Hit_bow_03', volume: 1.4 }]],
      pain: [[{ clip: 'DMG-Poison-01', volume: 2 }]],
    },
    casts: {
      petrify: [{ clip: 'Attack-Casting-30', volume: 1.5 }, { clip: 'Attack-Casting-16', volume: 1.5 }, { clip: 'Shamilla-Vox_Skill1', volume: 2.4, own: true }, { clip: 'Attack-Casting-12', volume: 1.5, at: 1.06 }, { clip: 'Attack-Casting-46', volume: 1.5, at: 1.73 }, { clip: 'Attack-Casting-57', volume: 1.5, at: 1.88 }],
      timecurse: [{ clip: 'Attack-Casting-30', volume: 1.5 }, { clip: 'Attack-Casting-16', volume: 1.5 }, { clip: 'Shamilla-Vox_Skill2', volume: 2.4, own: true }, { clip: 'Attack-Casting-12', volume: 1.5, at: 0.94 }, { clip: 'Attack-Casting-46', volume: 1.5, at: 1.5 }, { clip: 'Attack-Casting-57', volume: 1.5, at: 1.65 }, { clip: 'Attack-Magic-31', volume: 1.7, at: 1.84 }, { clip: 'Attack-Magic-22', volume: 1.4, at: 2.03 }],
      pain: [{ clip: 'Attack-Casting-30', volume: 1.5 }, { clip: 'Attack-Casting-16', volume: 1.5 }, { clip: 'Shamilla-Vox_Skill3', volume: 2.4, own: true }, { clip: 'Attack-Casting-24', volume: 1.3, at: 0.98 }, { clip: 'Attack-Casting-12', volume: 1.5, at: 1.24 }, { clip: 'Attack-Casting-32', volume: 0.7, at: 1.31 }, { clip: 'Attack-Casting-46', volume: 1.8, at: 1.31 }, { clip: 'Attack-Casting-57', volume: 1.8, at: 1.31 }],
    },
    victory: [{ clip: 'Shamilla-Vox_Victory', volume: 1.7, at: 0.09, own: true }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Shamilla.Attack1.Casting'], land: ['Skill.Hero.Shamilla.Attack1.Projectile', 'Skill.Hero.Shamilla.Attack1.Hit'] },
    petrify: { start: ['Skill.Hero.Shamilla.Skill1.Casting', 'Skill.Hero.Shamilla.Skill1.Loop'], land: ['Skill.Hero.Shamilla.Skill1.Hit', 'Skill.Hero.Shamilla.Skill1.Projectile', 'Common.Stone'] },
    timecurse: { start: ['Skill.Hero.Shamilla.Skill2.Casting'], land: ['Skill.Hero.Shamilla.Skill2.Hit', 'Common.CooldownIncrease'] },
    pain: { start: ['Skill.Hero.Shamilla.Skill3.Casting'], land: ['Skill.Hero.Shamilla.Skill3.Projectile', 'Skill.Hero.Shamilla.Skill3.HitLoop'] },
  },
  skins: [
    {
      name: 'Shamilla',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Shamilla.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Shamilla.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Shamilla.webp',
      // Its artwork (the Drive folder's): its head in the crop (the meter's close-up is its face by itself).
      portrait: { file: 'Shamilla.png', from: `${DRIVE}1EMWEODtsnwi_U12a9boiURcRbMDY641t`, crop: { x: 590, y: 105, size: 150 }, head: { x: 620, y: 125, size: 80 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Shamilla_Vari05_Body', 'Hero_Shamilla_Hair_01'],
        // (In its left hand, where King's Raid hangs it: Point_Hand_L.)
        left: 'Hero_Shamilla_Vari05_Weapon',
        offHand: 'held',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Shamilla_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Shamilla_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Shamilla_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Shamilla_Summer.webp',
      title: 'Beachside Shamilla',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Shamilla_Cos18Summer_Body', 'Hero_Shamilla_Hair_01'],
        left: 'Hero_Shamilla_Cos18Summer_Weapon',
        offHand: 'held',
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Shamilla_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Shamilla_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Shamilla_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Shamilla_Halloween.webp',
      title: 'Evangelist of Love Shamilla',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Shamilla_Cos18Halloween_Body', 'Hero_Shamilla_Cos18Halloween_Hair'],
        left: 'Hero_Shamilla_Cos18Halloween_Weapon',
        offHand: 'held',
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Shamilla_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Shamilla_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Shamilla_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Shamilla_Wedding.webp',
      title: 'Seduction in the Darkness Shamilla',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Shamilla_Cos19Wedding_Body', 'Hero_Shamilla_Cos19Wedding_Hair'],
        left: 'Hero_Shamilla_Cos19Wedding_Weapon',
        offHand: 'held',
      },
    },
    // King's Raid's Casual costume (tm-costumes.mjs).
    {
      name: 'Shamilla_Casual',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Shamilla_Casual.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Shamilla_Casual.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Shamilla_Casual.webp',
      title: 'Leisurely Demon Shamilla',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Shamilla_Cos19Casual_Body', 'Hero_Shamilla_Hair_04'],
        left: 'Hero_Shamilla_Cos19Casual_Weapon',
        offHand: 'held',
      },
    },
    // King's Raid's School costume (tm-costumes.mjs).
    {
      name: 'Shamilla_School',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Shamilla_School.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Shamilla_School.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Shamilla_School.webp',
      title: 'Professor Shamilla',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Shamilla_Cos20SL_Body', 'Hero_Shamilla_Hair_05'],
        left: 'Hero_Shamilla_Cos20SL_Weapon',
        offHand: 'held',
      },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Shamilla_Glory',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Shamilla_Glory.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Shamilla_Glory.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Shamilla_Glory.webp',
      title: 'Shamilla of Honor (Ascending Arabesque)',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Shamilla_Cos21Glory_Body', 'Hero_Shamilla_Cos21Glory_Hair'],
        left: 'Hero_Shamilla_Cos21Glory_Weapon',
        offHand: 'held',
      },
    },
    // Its Glory League costume's Glaring Honor tier: the same model, wearing its effects (tm-glory.mjs).
    {
      name: 'Shamilla_Glory2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Shamilla_Glory2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Shamilla_Glory2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Shamilla_Glory2.webp',
      title: 'Shamilla of Glaring Honor (Gracefully Ascending Arabesque)',
      // What King's Raid keeps on it all the while.
      wears: ['Skill.Hero.ShamillaCos21GloryLeague.Body'],
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Shamilla_Cos21Glory_Body', 'Hero_Shamilla_Cos21Glory_Hair'],
        left: 'Hero_Shamilla_Cos21Glory_Weapon',
        offHand: 'held',
      },
    },
  ],
};
