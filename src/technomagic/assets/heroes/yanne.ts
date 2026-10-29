import type { HeroAssets, PartsModel, KrAnimations } from '../types.ts';

/*
 * Yanne in her fourth look (Hero_Yanne_Vari04_…: her fifth's hair and headband have their colour pictures spoiled, one
 * hue all over): her body and hair, her great bow in her left hand (held, not a shield: its string drawn by bones of
 * its own), and an arrow in her right, along its x (her shots come from its tip). She is moved by King's Raid's own
 * animations of her (ANIMATIONS: ../../heroes/body/kr.ts).
 */

/** How her left hand holds her bow for her animations (as Selene holds hers): upright, its string toward her, as she draws. */
const GRIPS = { L: { at: [0.051, 0.031, 0], turn: [-2.222, 0.732, 0.474] } } as const satisfies PartsModel['grips'];


/**
 * King's Raid's own animations for its Legend look (its skins of that look are moved by them: ../../heroes/body/kr.ts): as
 * ANIMATIONS, but the look's own clips (KR-extracted/scripts/tm-anims.mjs --look=Legend).
 */
const LEGEND_ANIMATIONS = {
  idle: 'Legend/Idle',
  run: 'Legend/Run',
  hurt: 'Legend/Damage',
  victory: 'Legend/Victory',
  lose: 'Legend/Lose',
  dead: 'Legend/Dead',
  attack: [{ clips: ['Legend/Attack1'], hits: [1.2] }],
  skills: {
    focus: { clips: ['Legend/Skill1-1', 'Legend/Skill1-2', 'Legend/Skill1-2', 'Legend/Skill1-2', 'Legend/Skill1-3'], hits: [0.6, 1.5, 2.4, 3.1, 3.3] },
    wipeout: { clips: ['Legend/Skill2'], hits: [1.8] },
    unleash: { clips: ['Legend/Skill3'], hits: [1] },
  },
} as const satisfies KrAnimations;

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
  attack: [{ clips: ['Attack1'], hits: [1.2] }],
  skills: {
    focus: { clips: ['Skill1-1', 'Skill1-2', 'Skill1-2', 'Skill1-2', 'Skill1-3'], hits: [0.6, 1.5, 2.4, 3.1, 3.3] },
    wipeout: { clips: ['Skill2'], hits: [1.8] },
    unleash: { clips: ['Skill3'], hits: [1] },
  },
} as const satisfies KrAnimations;

export const YANNE_ASSETS: HeroAssets = {
  name: 'Yanne',
  folder: 'heroes/yanne',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/44/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Svelta, her bow.
  unique: { Hero_Yanne_Vari04_Weapon: 'Hero_Yanne_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Yanne.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_bow_03', volume: 1.5 }]],
      focus: [[{ clip: 'Hit_fire_03', volume: 2 }]],
      wipeout: [[{ clip: 'Hit_fire_04', volume: 2 }]],
    },
    casts: {
      focus: [{ clip: 'Yanne-Vox_Skill3-1', volume: 2.2, own: true }, { clip: 'Attack-Casting-26', volume: 1.5, at: 0.54 }, { clip: 'Attack-BowPull-03', volume: 1.8, at: 0.54 }, { clip: 'Attack-Casting-43', volume: 1.2, at: 0.69 }, { clip: 'Attack-Casting-27', volume: 1.2, at: 1.74 }, { clip: 'Attack-Casting-39', volume: 1.2, at: 1.82 }, { clip: 'Yanne-Vox_Skill3-2', volume: 2.2, at: 1.95, own: true }, { clip: 'Attack-Magic-20', volume: 1.7, at: 3.49 }, { clip: 'Attack-Magic-22', volume: 1.7, at: 3.49 }],
      wipeout: [{ clip: 'Attack-Casting-04', volume: 1.5 }, { clip: 'Attack-Magic-19', volume: 1.6 }, { clip: 'Yanne-Vox_02', volume: 2.2, at: 0.14, own: true }, { clip: 'Yanne-Vox_Skill2', volume: 2.2, at: 0.63, own: true }, { clip: 'Attack-Casting-43', volume: 1.5, at: 0.78 }, { clip: 'Attack-Magic-22', volume: 1.8, at: 1.69 }, { clip: 'Attack-Magic-06', volume: 1.8, at: 1.69 }],
      unleash: [{ clip: 'Attack-Casting-04', volume: 1.5 }, { clip: 'Attack-Magic-19', volume: 1.5 }, { clip: 'Yanne-Vox_Skill1', volume: 2.2, own: true }, { clip: 'Attack-Magic-22', volume: 1.8, at: 0.83 }, { clip: 'Attack-Magic-06', volume: 1.8, at: 0.83 }],
    },
    victory: [{ clip: 'Yanne-Vox_07', volume: 2.2, at: 0.49, own: true }, { clip: 'Attack-Body-02', at: 0.49 }, { clip: 'Yanne-Vox_Victory', volume: 2.2, at: 1.5, own: true }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { land: ['Skill.Hero.Yanne.Attack1.Shot', 'Skill.Hero.Yanne.Attack1.Projectile2', 'Skill.Hero.Yanne.Attack1.Projectile1', 'Skill.Hero.Yanne.Attack1.Hit1', 'Skill.Hero.Yanne.Attack1.Hit2'] },
    focus: { start: ['Skill.Hero.Yanne.Skill1.Loop', 'Skill.Hero.Yanne.Skill1.Casting'], land: ['Skill.Hero.Yanne.Skill1.Shot'] },
    wipeout: { start: ['Skill.Hero.Yanne.Skill2.Casting'], land: ['Skill.Hero.Yanne.Skill2.Projectile', 'Skill.Hero.Yanne.Skill2.Hit'] },
    unleash: { start: ['Skill.Hero.Yanne.Skill3.Loop', 'Skill.Hero.Yanne.Skill3.Casting'] },
  },
  skins: [
    {
      name: 'Yanne',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Yanne.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Yanne.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Yanne.webp',
      // Her artwork (the King's Raid Index's): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Yanne.png', from: 'https://raw.githubusercontent.com/IcyDipity/KingsRaidIndex/master/images/heroes/Yanne/Yanne.png', crop: { x: 315, y: 395, size: 160 }, head: { x: 355, y: 440, size: 95 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Yanne_Vari04_Body', 'Hero_Yanne_Vari04_Hair'],
        left: 'Hero_Yanne_Vari04_Weapon',
        offHand: 'held',
        right: 'Hero_Yanne_Arrow',
        grips: GRIPS,
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Yanne_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Yanne_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Yanne_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Yanne_Halloween.webp',
      title: 'March Hare Yanne',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Yanne_Cos17Halloween_Body', 'Hero_Yanne_Cos17Halloween_Hair'],
        left: 'Hero_Yanne_Cos17Halloween_Weapon',
        offHand: 'held',
        right: 'Hero_Yanne_Arrow',
        grips: GRIPS,
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Yanne_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Yanne_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Yanne_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Yanne_Christmas.webp',
      title: 'Rudolph Yanne',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Yanne_Cos17Christmas_Body', 'Hero_Yanne_Cos17Christmas_Hair'],
        left: 'Hero_Yanne_Cos17Christmas_Weapon',
        offHand: 'held',
        right: 'Hero_Yanne_Arrow',
        grips: GRIPS,
      },
    },
    // King's Raid's NewYear costume (tm-costumes.mjs).
    {
      name: 'Yanne_NewYear',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Yanne_NewYear.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Yanne_NewYear.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Yanne_NewYear.webp',
      title: 'Native American Yanne',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Yanne_Cos18NewYear_Body', 'Hero_Yanne_Cos18NewYear_Hair'],
        left: 'Hero_Yanne_Cos18NewYear_Weapon',
        offHand: 'held',
        right: 'Hero_Yanne_Arrow',
        grips: GRIPS,
      },
    },
    // King's Raid's School costume (tm-costumes.mjs).
    {
      name: 'Yanne_School',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Yanne_School.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Yanne_School.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Yanne_School.webp',
      title: 'Delinquent Yanne',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Yanne_Cos18SL_Body', 'Hero_Yanne_Cos18SL_Hair'],
        left: 'Hero_Yanne_Cos18SL_Weapon',
        offHand: 'held',
        right: 'Hero_Yanne_Arrow',
        grips: GRIPS,
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Yanne_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Yanne_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Yanne_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Yanne_Summer.webp',
      title: 'Beachside Yanne',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Yanne_Cos18Summer_Body', 'Hero_Yanne_Vari04_Hair'],
        left: 'Hero_Yanne_Cos18Summer_Weapon',
        offHand: 'held',
        right: 'Hero_Yanne_Cos18Summer_Arrow',
        grips: GRIPS,
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Yanne_Summer19',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Yanne_Summer19.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Yanne_Summer19.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Yanne_Summer19.webp',
      title: 'Beachside Yanne',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Yanne_Cos19Summer_Body', 'Hero_Yanne_Cos19Summer_Hair'],
        left: 'Hero_Yanne_Cos19Summer_Weapon',
        offHand: 'held',
        right: 'Hero_Yanne_Cos19Summer_Arrow',
        grips: GRIPS,
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Yanne_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Yanne_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Yanne_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Yanne_Wedding.webp',
      title: 'Captivating Passion Yanne',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Yanne_Cos20Wedding_Body', 'Hero_Yanne_Cos20Wedding_Hair'],
        left: 'Hero_Yanne_Cos20Wedding_Weapon',
        offHand: 'held',
        right: 'Hero_Yanne_Cos20Wedding_Arrow',
        grips: GRIPS,
      },
    },
    // King's Raid's Legend costume (its models made from the game's bundles: KR-extracted/scripts/kr-models.py).
    {
      name: 'Yanne_Legend',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Yanne_Legend.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Yanne_Legend.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Yanne_Legend.webp',
      title: 'Prey-Searching Claw Yanne',
      model: {
        kind: 'parts',
        animations: LEGEND_ANIMATIONS,
        // (No bow: the game hides her weapons in all of this look's moves.)
        parts: ['Hero_Yanne_Cos22Legend_Body', 'Hero_Yanne_Cos22Legend_Hair'],
      },
    },
  ],
};
