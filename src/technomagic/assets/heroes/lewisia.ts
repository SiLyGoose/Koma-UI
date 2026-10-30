import type { HeroAssets, KrAnimations, PartsModel } from '../types.ts';

/*
 * Lewisia, The Royal Vermilion Blood (Hero_Lewsia_Vari05…): as King's Raid's own model has it, moved by King's Raid's
 * own animations of it (ANIMATIONS: ../../heroes/body/kr.ts).
 */

const DRIVE = 'https://drive.google.com/uc?export=download&id=';

/** Her staff turned end over end in her hand, its head up (as the user knows her; her Vari05 look's own clips hold it head down, Vari03's up). */
const HEAD_UP = { R: [Math.PI, 0, 0] } as const satisfies PartsModel['heldTurn'];

/**
 * King's Raid's own animations for its Vari03 look (its skins of that look are moved by them: ../../heroes/body/kr.ts): as
 * ANIMATIONS, but the look's own clips (KR-extracted/scripts/tm-anims.mjs --look=Vari03).
 */
const VARI03_ANIMATIONS = {
  idle: 'Vari03/Idle',
  run: 'Vari03/Run',
  hurt: 'Vari03/Damage',
  victory: 'Vari03/Victory',
  lose: 'Vari03/Lose',
  dead: 'Vari03/Dead',
  attack: [{ clips: ['Vari03/Attack1'], hits: [1] }],
  skills: {
    orb: { clips: ['Vari03/Skill1'], hits: [2.1] },
    bloodzone: { clips: ['Vari03/Skill2'], hits: [2] },
    banquet: { clips: ['Vari03/Skill3'], hits: [3, 3.2, 3.4] },
  },
} as const satisfies KrAnimations;

/**
 * King's Raid's own animations for its Vari04 look (its skins of that look are moved by them: ../../heroes/body/kr.ts): as
 * ANIMATIONS, but the look's own clips (KR-extracted/scripts/tm-anims.mjs --look=Vari04).
 */
const VARI04_ANIMATIONS = {
  idle: 'Vari04/Idle',
  run: 'Vari04/Run',
  hurt: 'Vari04/Damage',
  victory: 'Vari04/Victory',
  victoryIdle: 'Vari04/VictoryIdol',
  lose: 'Vari04/Lose',
  dead: 'Vari04/Dead',
  attack: [{ clips: ['Vari04/Attack1'], hits: [1] }],
  skills: {
    orb: { clips: ['Vari04/Skill1'], hits: [2.1] },
    bloodzone: { clips: ['Vari04/Skill2'], hits: [2] },
    banquet: { clips: ['Vari04/Skill3'], hits: [3, 3.2, 3.4] },
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
  attack: [{ clips: ['Attack1'], hits: [1] }],
  skills: {
    orb: { clips: ['Skill1'], hits: [2.1] },
    bloodzone: { clips: ['Skill2'], hits: [2] },
    banquet: { clips: ['Skill3'], hits: [3, 3.2, 3.4] },
  },
} as const satisfies KrAnimations;

export const LEWISIA_ASSETS: HeroAssets = {
  name: 'Lewisia',
  folder: 'heroes/lewisia',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/31/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Its unique weapon, wielded.
  unique: { Hero_Lewsia_Vari05_Weapon: 'Hero_Lewsia_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Lewsia.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {

    },
    casts: {

    },
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Lewsia.Attack1.Casting'], land: ['Skill.Hero.Lewsia.Attack1.Projectile', 'Skill.Hero.Lewsia.Attack1.Hit'] },
    orb: { start: ['Skill.Hero.Lewsia.Skill1.Casting'], land: ['Skill.Hero.Lewsia.Skill1.Projectile', 'Skill.Hero.Lewsia.Skill1.HitLoop'] },
    bloodzone: { start: ['Skill.Hero.Lewsia.Skill2.Casting'], land: ['Skill.Hero.Lewsia.Skill2.Hit', 'Skill.Hero.Lewsia.Skill2.Projectile'] },
    banquet: { start: ['Skill.Hero.Lewsia.Skill3.Casting'], land: ['Skill.Hero.Lewsia.Skill3.Projectile'] },
  },
  skins: [
    {
      name: 'Lewisia',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lewisia.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lewisia.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lewisia.webp',
      // Its artwork (the Drive folder's): its head in the crop (the meter's close-up is its face by itself).
      portrait: { file: 'Lewisia.png', from: `${DRIVE}1EYRyXbnBKjO1PIpcdWfHY5mjLlioOYYH`, crop: { x: 600, y: 90, size: 150 }, head: { x: 600, y: 105, size: 90 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lewsia_Vari05_Body', 'Hero_Lewsia_Vari05_Hair'],
        // (In its right hand, where King's Raid hangs it: Point_Hand_R.)
        right: 'Hero_Lewsia_Vari05_Weapon',
        heldTurn: HEAD_UP,
      },
    },
    // King's Raid's Idol costume (tm-costumes.mjs).
    {
      name: 'Lewisia_Idol',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lewisia_Idol.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lewisia_Idol.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lewisia_Idol.webp',
      title: 'Twinkle Pure Lewisia',
      model: {
        kind: 'parts',
        animations: VARI04_ANIMATIONS,
        parts: ['Hero_Lewsia_Vari04_Cos17Idol_Body', 'Hero_Lewsia_Vari04_Cos17Idol_Hair'],
        right: 'Hero_Lewsia_Vari04_Cos17Idol_Weapon',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Lewisia_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lewisia_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lewisia_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lewisia_Summer.webp',
      title: 'Beachside Lewisia(3Star)',
      model: {
        kind: 'parts',
        animations: VARI03_ANIMATIONS,
        parts: ['Hero_Lewsia_Vari03_Cos17Summer_Body', 'Hero_Lewsia_Vari03_Cos17Summer_Hair'],
        right: 'Hero_Lewsia_Vari03_Cos17Summer_Weapon',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Lewisia_Summer4',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lewisia_Summer4.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lewisia_Summer4.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lewisia_Summer4.webp',
      title: 'Beachside Lewisia(4Star)',
      model: {
        kind: 'parts',
        animations: VARI04_ANIMATIONS,
        parts: ['Hero_Lewsia_Vari04_Cos17Summer_Body', 'Hero_Lewsia_Vari04_Cos17Summer_Hair'],
        right: 'Hero_Lewsia_Vari04_Cos17Summer_Weapon',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Lewisia_Summer5',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lewisia_Summer5.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lewisia_Summer5.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lewisia_Summer5.webp',
      title: 'Beachside Lewisia(5Star)',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lewsia_Vari05_Cos17Summer_Body', 'Hero_Lewsia_Vari05_Cos17Summer_Hair'],
        right: 'Hero_Lewsia_Vari05_Cos17Summer_Weapon',
        heldTurn: HEAD_UP,
      },
    },
    // King's Raid's Christmas costume (tm-costumes.mjs).
    {
      name: 'Lewisia_Christmas',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lewisia_Christmas.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lewisia_Christmas.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lewisia_Christmas.webp',
      title: 'Santa Lewisia',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lewsia_Vari05_Cos17Christmas_Body', 'Hero_Lewsia_Vari05_Cos17Christmas_Hair'],
        right: 'Hero_Lewsia_Vari05_Cos17Christmas_Weapon',
        heldTurn: HEAD_UP,
      },
    },
    // King's Raid's Frozen costume (tm-costumes.mjs).
    {
      name: 'Lewisia_Frozen',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lewisia_Frozen.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lewisia_Frozen.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lewisia_Frozen.webp',
      title: 'Snow Queen Lewisia',
      model: {
        kind: 'parts',
        animations: VARI03_ANIMATIONS,
        parts: ['Hero_Lewsia_Vari03_Cos18Frozen_Body', 'Hero_Lewsia_Vari03_Cos18Ice_Hair'],
        right: 'Hero_Lewsia_Vari03_Cos18Frozen_Weapon',
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Lewisia_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lewisia_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lewisia_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lewisia_Wedding.webp',
      title: 'The Midnight Rose Lewisia',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Lewsia_Vari05_Cos18Wedding_Body', 'Hero_Lewsia_Vari05_Cos18Wedding_Hair'],
        right: 'Hero_Lewsia_Vari05_Cos18Wedding_Weapon',
        heldTurn: HEAD_UP,
      },
    },
    // King's Raid's Halloween costume (tm-costumes.mjs).
    {
      name: 'Lewisia_Halloween',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lewisia_Halloween.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lewisia_Halloween.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lewisia_Halloween.webp',
      title: 'Magical Vampire Lewisia',
      model: {
        kind: 'parts',
        animations: VARI04_ANIMATIONS,
        parts: ['Hero_Lewsia_Vari04_Cos19Halloween_Body', 'Hero_Lewsia_Vari04_Cos19Halloween_Hair'],
        right: 'Hero_Lewsia_Vari04_Cos19HalloweenWeapon',
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Lewisia_Wedding20',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Lewisia_Wedding20.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Lewisia_Wedding20.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Lewisia_Wedding20.webp',
      title: 'Bud of Blessings Lewisia',
      model: {
        kind: 'parts',
        animations: VARI03_ANIMATIONS,
        parts: ['Hero_Lewsia_Vari03_Cos20Wedding_Body', 'Hero_Lewsia_Vari03_Cos20Wedding_Hair'],
        right: 'Hero_Lewsia_Vari03_Cos20Wedding_Weapon',
      },
    },
  ],
};
