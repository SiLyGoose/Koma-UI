import type { HeroAssets, KrAnimations } from '../types.ts';

/*
 * Erze in her fourth look (Hero_Erze_Vari04_…: her fifth's weapon has its colour picture spoiled, one hue all over):
 * her body, her hair, and her bat-winged orb of blood, held as her right hand's: King's Raid's own animations of her
 * (ANIMATIONS: ../../heroes/body/kr.ts) float its mark by her shoulder and beat its wings.
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
  attack: [{ clips: ['Attack1-1'], hits: [0.4] }, { clips: ['Attack1-2'], hits: [0.3, 0.7] }, { clips: ['Attack1-3'], hits: [0.7] }],
  skills: {
    sweet: { clips: ['Skill1'], hits: [1.3] },
    soak: { clips: ['Skill2'], hits: [2] },
    liberation: { clips: ['Skill3'], hits: [3.2] },
  },
} as const satisfies KrAnimations;

export const ERZE_ASSETS: HeroAssets = {
  name: 'Erze',
  folder: 'heroes/erze',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/53/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Her unique weapon, wielded: Perion, her orb.
  unique: { Hero_Erze_Vari04_Weapon: 'Hero_Erze_Unique01_Weapon' },
  // King's Raid's sounds (its Hit.Hero.Erze.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      drain: [[{ clip: 'Dmg_punch_01', volume: 1.5 }], [{ clip: 'Hit_common_01', volume: 1.8 }]],
      sweet: [[{ clip: 'Hit_fire_04', volume: 2 }]],
      soak: [[{ clip: 'Hit_common_04', volume: 2 }]],
      liberation: [[{ clip: 'Hit_gun_02', volume: 2 }]],
    },
    casts: {
      sweet: [{ clip: 'Attack-Casting-26', volume: 1.3 }, { clip: 'Attack-Casting-10', volume: 1.3 }, { clip: 'Erze-Vox_Skill1', volume: 2.2, own: true }, { clip: 'Attack-Casting-24', volume: 1.3, at: 0.44 }, { clip: 'Attack-Magic-55', volume: 1.2, at: 1.35 }],
      soak: [{ clip: 'Attack-Casting-26', volume: 1.3 }, { clip: 'Attack-Casting-10', volume: 1.3 }, { clip: 'Erze-Vox_Skill2', volume: 2.2, own: true }, { clip: 'Attack-Casting-24', volume: 1.3, at: 0.65 }, { clip: 'Attack-Casting-33', volume: 1.3, at: 1.56 }, { clip: 'Attack-Magic-39', volume: 1.5, at: 1.96 }, { clip: 'Attack-Magic-48', volume: 1.4, at: 1.99 }, { clip: 'Attack-Magic-29', volume: 1.4, at: 2.08 }, { clip: 'Attack-Magic-55', volume: 1.4, at: 7.97 }],
      liberation: [{ clip: 'Attack-Casting-26', volume: 1.3 }, { clip: 'Attack-Casting-10', volume: 1.3 }, { clip: 'Attack-Casting-37', volume: 1.3, at: 0.46 }, { clip: 'Attack-Magic-35', volume: 1.2, at: 0.66 }, { clip: 'Erze-Vox_Skill3', volume: 2.2, at: 0.87, own: true }, { clip: 'Attack-Magic-39', volume: 1.2, at: 3.26 }, { clip: 'Attack-Magic-48', volume: 1.5, at: 3.29 }],
    },
    victory: [{ clip: 'Erze-Vox_Victory', volume: 2.2, at: 0.1, own: true }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    drain: { start: ['Skill.Hero.Erze.Attack1.Casting.2', 'Skill.Hero.Erze.Attack1.Casting.3', 'Skill.Hero.Erze.Attack1.Casting.1'], land: ['Skill.Hero.Erze.Attack1.Hit1', 'Skill.Hero.Erze.Attack1.Hit2'] },
    sweet: { start: ['Skill.Hero.Erze.Skill1.Casting'], land: ['Skill.Hero.Erze.Skill1.Projectile', 'Skill.Hero.Erze.Skill1.ProjectileHit', 'Skill.Hero.Erze.Skill1.Hit'] },
    soak: { start: ['Skill.Hero.Erze.Skill2.Casting', 'Skill.Hero.Erze.Skill2.Loop', 'Skill.Hero.Erze.Skill2.Buff'] },
    liberation: { start: ['Skill.Hero.Erze.Skill3.Casting'], land: ['Skill.Hero.Erze.Skill3.Projectile', 'Skill.Hero.Erze.Skill3.ProjectileHit'] },
  },
  skins: [
    {
      name: 'Erze',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Erze.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Erze.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Erze.webp',
      // Her artwork (the King's Raid Index's): her head in the crop (the meter's close-up is her face by itself).
      portrait: { file: 'Erze.png', from: 'https://raw.githubusercontent.com/IcyDipity/KingsRaidIndex/master/images/heroes/Erze/Erze.png', crop: { x: 455, y: 160, size: 190 }, head: { x: 535, y: 205, size: 105 } },
      model: { kind: 'parts', animations: ANIMATIONS, parts: ['Hero_Erze_Vari04_Body', 'Hero_Erze_Vari04_Hair'], right: 'Hero_Erze_Vari04_Weapon' },
    },
    // King's Raid's Maid costume (tm-costumes.mjs).
    {
      name: 'Erze_Maid',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Erze_Maid.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Erze_Maid.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Erze_Maid.webp',
      title: 'Maid Erze',
      model: { kind: 'parts', animations: ANIMATIONS, parts: ['Hero_Erze_Cos18Maid_Body', 'Hero_Erze_Cos18Maid_Hair'], right: 'Hero_Erze_Cos18Maid_Weapon' },
    },
    // King's Raid's NewYear costume (tm-costumes.mjs).
    {
      name: 'Erze_NewYear',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Erze_NewYear.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Erze_NewYear.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Erze_NewYear.webp',
      title: 'Pharaoh Erze',
      model: { kind: 'parts', animations: ANIMATIONS, parts: ['Hero_Erze_Cos19NewYear_Body', 'Hero_Erze_Cos19NewYear_Hair'], right: 'Hero_Erze_Cos19NewYear_Weapon' },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Erze_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Erze_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Erze_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Erze_Wedding.webp',
      title: 'The Blood Oath Erze',
      model: { kind: 'parts', animations: ANIMATIONS, parts: ['Hero_Erze_Cos19Wedding_Body', 'Hero_Erze_Cos19Wedding_Hair'], right: 'Hero_Erze_Cos19Wedding_Weapon' },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Erze_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Erze_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Erze_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Erze_Summer.webp',
      title: 'Beachside Erze',
      model: { kind: 'parts', animations: ANIMATIONS, parts: ['Hero_Erze_Cos19Summer_Body', 'Hero_Erze_Cos19Summer_Hair'], right: 'Hero_Erze_Cos19Summer_Weapon' },
    },
    // King's Raid's Job costume (tm-costumes.mjs).
    {
      name: 'Erze_Job',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Erze_Job.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Erze_Job.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Erze_Job.webp',
      title: 'Dancer Erze',
      model: { kind: 'parts', animations: ANIMATIONS, parts: ['Hero_Erze_Cos19Job_Body', 'Hero_Erze_Cos19Job_Hair'], right: 'Hero_Erze_Cos19Job_Weapon' },
    },
    // King's Raid's School costume (tm-costumes.mjs).
    {
      name: 'Erze_School',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Erze_School.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Erze_School.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Erze_School.webp',
      title: 'High School Erze',
      model: { kind: 'parts', animations: ANIMATIONS, parts: ['Hero_Erze_Cos20SL_Body', 'Hero_Erze_Vari04_Hair'], right: 'Hero_Erze_Cos20SL_Weapon' },
    },
    // King's Raid's DailyLook costume (tm-costumes.mjs).
    {
      name: 'Erze_DailyLook',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Erze_DailyLook.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Erze_DailyLook.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Erze_DailyLook.webp',
      title: 'Free-Spirited Blood Erze',
      model: { kind: 'parts', animations: ANIMATIONS, parts: ['Hero_Erze_Cos21DailyLook_Body', 'Hero_Erze_Cos21Dailylook_Hair'], right: 'Hero_Erze_Cos21DailyLook_Weapon' },
    },
    // King's Raid's Glory costume (tm-costumes.mjs).
    {
      name: 'Erze_Glory',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Erze_Glory.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Erze_Glory.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Erze_Glory.webp',
      title: 'Erze of Honor (Eminence of Elegance)',
      // What King's Raid keeps on it all the while (its weapon's: tm-glory.mjs).
      wears: ['Skill.Hero.ErzeCos21GloryLeague.VictoryIdle'],
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        drain: { start: ['Skill.Hero.ErzeCos21GloryLeague.Attack1.Casting.2', 'Skill.Hero.ErzeCos21GloryLeague.Attack1.Casting.3', 'Skill.Hero.ErzeCos21GloryLeague.Attack1.Casting.1'], land: ['Skill.Hero.ErzeCos21GloryLeague.Attack1.Hit1', 'Skill.Hero.ErzeCos21GloryLeague.Attack1.Hit2'] },
        sweet: { start: ['Skill.Hero.ErzeCos21GloryLeague.Skill1.Casting'], land: ['Skill.Hero.ErzeCos21GloryLeague.Skill1.Projectile', 'Skill.Hero.ErzeCos21GloryLeague.Skill1.ProjectileHit', 'Skill.Hero.ErzeCos21GloryLeague.Skill1.Hit'] },
        soak: { start: ['Skill.Hero.ErzeCos21GloryLeague.Skill2.Casting', 'Skill.Hero.ErzeCos21GloryLeague.Skill2.Loop', 'Skill.Hero.ErzeCos21GloryLeague.Skill2.Buff'] },
        liberation: { start: ['Skill.Hero.ErzeCos21GloryLeague.Skill3.Casting'], land: ['Skill.Hero.ErzeCos21GloryLeague.Skill3.Projectile', 'Skill.Hero.ErzeCos21GloryLeague.Skill3.ProjectileHit'] },
      },
      model: { kind: 'parts', animations: ANIMATIONS, parts: ['Hero_Erze_Cos21GloryLeague_Body', 'Hero_Erze_Cos21GloryLeague_Hair'], right: 'Hero_Erze_Cos21GloryLeague_Weapon' },
    },
    // King's Raid's Fallen costume (tm-costumes.mjs).
    {
      name: 'Erze_Fallen',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Erze_Fallen.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Erze_Fallen.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Erze_Fallen.webp',
      title: 'Corrupted Innocence Erze',
      model: { kind: 'parts', animations: ANIMATIONS, parts: ['Hero_Erze_Cos21Fallen_Body', 'Hero_Erze_Cos21Fallen_Hair'], right: 'Hero_Erze_Cos21Fallen_weapon' },
    },
    // Its Glory League costume's Glaring Honor tier: the same model, wearing its effects (tm-glory.mjs).
    {
      name: 'Erze_Glory2',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Erze_Glory2.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Erze_Glory2.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Erze_Glory2.webp',
      title: 'Erze of Glaring Honor (Eminence of Elegance)',
      // King's Raid's own effects of its Glory League costume, for its moves instead of its hero's (KR-extracted/scripts/tm-glory-vfx.mjs).
      vfx: {
        drain: { start: ['Skill.Hero.ErzeCos21GloryLeague.Attack1.Casting.2', 'Skill.Hero.ErzeCos21GloryLeague.Attack1.Casting.3', 'Skill.Hero.ErzeCos21GloryLeague.Attack1.Casting.1'], land: ['Skill.Hero.ErzeCos21GloryLeague.Attack1.Hit1', 'Skill.Hero.ErzeCos21GloryLeague.Attack1.Hit2'] },
        sweet: { start: ['Skill.Hero.ErzeCos21GloryLeague.Skill1.Casting'], land: ['Skill.Hero.ErzeCos21GloryLeague.Skill1.Projectile', 'Skill.Hero.ErzeCos21GloryLeague.Skill1.ProjectileHit', 'Skill.Hero.ErzeCos21GloryLeague.Skill1.Hit'] },
        soak: { start: ['Skill.Hero.ErzeCos21GloryLeague.Skill2.Casting', 'Skill.Hero.ErzeCos21GloryLeague.Skill2.Loop', 'Skill.Hero.ErzeCos21GloryLeague.Skill2.Buff'] },
        liberation: { start: ['Skill.Hero.ErzeCos21GloryLeague.Skill3.Casting'], land: ['Skill.Hero.ErzeCos21GloryLeague.Skill3.Projectile', 'Skill.Hero.ErzeCos21GloryLeague.Skill3.ProjectileHit'] },
      },
      // What King's Raid keeps on it all the while.
      wears: ['Skill.Hero.ErzeCos21GloryLeague.Body', 'Skill.Hero.ErzeCos21GloryLeague.Cos21GloryLeagueWeapon'],
      model: { kind: 'parts', animations: ANIMATIONS, parts: ['Hero_Erze_Cos21GloryLeague_Body', 'Hero_Erze_Cos21GloryLeague_Hair'], right: 'Hero_Erze_Cos21GloryLeague_Weapon' },
    },
  ],
};
