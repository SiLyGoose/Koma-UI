import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Selene in her third look (Hero_Selene_Vari03_…: her fifth's files have their colour pictures spoiled, one hue all
 * over): her body and hair, her bow in her left hand (held, not a shield) and an arrow in her right, along its x (her
 * shots come from its tip). She is moved by King's Raid's own animations of her (ANIMATIONS: ../../heroes/body/kr.ts).
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
  victoryIdle: 'VictoryIdol',
  lose: 'Lose',
  dead: 'Dead',
  attack: [{ clips: ['Attack1'], hits: [1, 1.1, 1.2, 1.3] }],
  skills: {
    rain: { clips: ['Skill1'], hits: [2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3, 3.1] },
    rush: { clips: ['Attack3'], hits: [1.1, 1.2, 1.3, 1.4, 1.5] },
    flash: { clips: ['Skill2'], hits: [2.5] },
  },
} as const satisfies KrAnimations;

export const SELENE_ASSETS: HeroAssets = {
  name: 'Selene',
  folder: 'heroes/selene',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/10/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Notos, her bow.
  unique: { Hero_Selene_Vari03_Weapon: 'Hero_Selene_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Selene.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_bow_01', volume: 1.5 }]],
      rain: [[{ clip: 'Hit_bow_02', volume: 2 }]],
      flash: [[{ clip: 'Hit_bow_03', volume: 2 }]],
    },
    casts: {
      rain: [{ clip: 'Selene-Vox_Skill1', volume: 2, at: 0.1, own: true }, { clip: 'Attack-Body-01', volume: 3, at: 0.34 }, { clip: 'Attack-Woosh-08', volume: 2.8, at: 0.38 }, { clip: 'Attack-Landing-01', volume: 3, at: 0.54 }, { clip: 'Attack-Casting-07', volume: 2.8, at: 0.9 }, { clip: 'Attack-Casting-04', volume: 2.6, at: 0.91 }, { clip: 'Attack-Casting-03', volume: 2.8, at: 0.93 }, { clip: 'Attack-BowPull-01', volume: 3, at: 1.43 }, { clip: 'Attack-BowShot-01', volume: 3.2, at: 1.95 }, { clip: 'Attack-Shot-09', volume: 2.6, at: 2.01 }, { clip: 'Attack-Shot-11', volume: 2.6, at: 2.02 }],
      rush: [{ clip: 'Selene-Vox_Attack6', volume: 2, at: 0.21, own: true }, { clip: 'Attack-Casting-04', volume: 2.8, at: 0.27 }, { clip: 'Attack-Jump-01', volume: 3, at: 0.31 }, { clip: 'Attack-Spin-05', volume: 2.6, at: 0.85 }, { clip: 'Selene-Vox_Skill2_b', volume: 2, at: 0.87, own: true }, { clip: 'Attack-Magic-04', volume: 3, at: 1.27 }, { clip: 'Attack-Landing-01', volume: 3, at: 1.58 }, { clip: 'Attack-Landing-01', volume: 3, at: 1.58 }],
      flash: [{ clip: 'Attack-Casting-09', volume: 3.5, at: 0.08 }, { clip: 'Selene-Vox_Attack1', volume: 2.2, at: 0.62, own: true }, { clip: 'Attack-Casting-02', volume: 3.5, at: 1.13 }, { clip: 'Attack-BowPull-01', volume: 3, at: 1.47 }, { clip: 'Selene-Vox_Skill3', volume: 2.2, at: 1.61, own: true }, { clip: 'Attack-BowShot-01', volume: 3.2, at: 2.25 }, { clip: 'Attack-Shot-03', volume: 3.2, at: 2.56 }, { clip: 'Attack-Shot-11', volume: 3.2, at: 2.57 }],
    },
    victory: [{ clip: 'Attack-Body-02', at: 0.22 }, { clip: 'Selene-Vox_Victory_b', volume: 1.5, at: 0.26, own: true }, { clip: 'Attack-Jump-01', at: 0.52 }, { clip: 'Attack-Landing-01', at: 1.26 }, { clip: 'Attack-BowPull-02', at: 1.99 }, { clip: 'Attack-BowShot-01', at: 2.54 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Selene.Re.Attack1.Casting'], land: ['Skill.Hero.Selene.Re.Attack1.Projectile'] },
    rain: { start: ['Skill.Hero.Selene.Re.Skill1.Casting'], land: ['Skill.Hero.Selene.Re.Skill1.Hit', 'Skill.Hero.Selene.Re.Skill1.Projectile'] },
    rush: { start: ['Skill.Hero.Selene.Attack3.Casting'], land: ['Skill.Hero.Selene.Attack3.Shoot'] },
    flash: { start: ['Skill.Hero.Selene.Skill2.Charge', 'Skill.Hero.Selene.Re.Skill2.Casting'], land: ['Skill.Hero.Selene.Skill2.Hit', 'Skill.Hero.Selene.Skill2.Shoot', 'Skill.Hero.Selene.Re.Skill2.Projectile', 'Hit.Physical.02'] },
  },
  skins: [
    {
      name: 'Selene',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Selene.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Selene.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Selene.webp',
      // Her artwork (from the wiki, asked for as the PNG it was uploaded as), the wind about her: her head and crown in the crop (the meter's close-up is her face by itself).
      portrait: {
        file: 'Selene.png',
        from: 'https://static.wikia.nocookie.net/charactah-account/images/0/01/Selene_%28King%27s_Raid%29_Render_01.png/revision/latest?cb=20221002055127&format=original',
        crop: { x: 265, y: 155, size: 130 },
        head: { x: 295, y: 195, size: 70 },
      },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Selene_Vari03_Body', 'Hero_Selene_Hair_01'],
        left: 'Hero_Selene_Vari03_Weapon',
        offHand: 'held',
        right: 'Hero_Selene_Vari03_Arrow',
        grips: { L: { at: [0.071, 0.02, -0.002], turn: [-2.02, 0.87, 0.164] } },
      },
    },
  ],
};
