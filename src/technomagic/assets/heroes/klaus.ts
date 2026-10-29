import type { HeroAssets, KrAnimations } from '../types.ts';

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
  attack: [{ clips: ['Attack1-1'], hits: [0.5, 0.7] }, { clips: ['Attack1-2'], hits: [0.6, 1.1] }, { clips: ['Attack1-3'], hits: [0.7] }],
  skills: {
    slam: { clips: ['Dash', 'Skill2'], hits: [1.3] },
    bash: { clips: ['Attack2'], hits: [0.8, 1.4] },
    guard: { clips: ['Skill1'], hits: [0, 1.9] },
  },
} as const satisfies KrAnimations;

export const KLAUS_ASSETS: HeroAssets = {
  name: 'Klaus',
  folder: 'heroes/klaus',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/14/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // Guardian Shield's look: the game's own shields going round him as he raises it, kept round each hero it guards while it lasts.
  wards: { 'Guardian Shield': 'Skill.Hero.Clause.Skill1.Loop' },
  // His unique weapon, wielded: Exian, his sword and shield.
  unique: { Hero_Klaus_Vari05_Shield: 'Hero_Klaus_Unique01_Shield', Hero_Klaus_Vari05_Sword: 'Hero_Klaus_Unique01_Sword' },
  // King's Raid's sounds (its Hit.Hero.Clause.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); as each skill begins; and as it strikes its victory pose (Victory.Hero.*).
  sounds: {
    hits: {
      attack: [[{ clip: 'Hit_Dmg-Metal-01', volume: 1.5 }]],
      slam: [[{ clip: 'Hit_big_03', volume: 2 }]],
      bash: [[{ clip: 'Hit_shield_06', volume: 2 }]],
    },
    casts: {
      bash: [{ clip: 'Attack-Casting-15', volume: 1.2, at: 0.12 }, { clip: 'Attack-Woosh-03', volume: 3, at: 0.38 }, { clip: 'Attack-Cut-08', volume: 0.25, at: 0.95 }, { clip: 'Clause-Vox_02', volume: 2, at: 0.95, own: true }, { clip: 'Attack-Woosh-09', volume: 2, at: 0.95 }, { clip: 'Attack-Body-02', at: 1 }, { clip: 'Attack-Woosh-08', volume: 1.5, at: 1.35 }, { clip: 'Attack-Woosh-09', volume: 1.5, at: 1.37 }, { clip: 'Clause-Vox_03', volume: 1.9, at: 1.38, own: true }, { clip: 'Attack-Body-02', at: 1.38 }],
      guard: [{ clip: 'Attack-Casting-05', volume: 3, at: 0.01 }, { clip: 'Attack-Casting-04', volume: 2.2, at: 0.15 }, { clip: 'Attack-Woosh-10', volume: 2.4, at: 0.22 }, { clip: 'Clause-Vox_Skill1', volume: 2.1, at: 0.43, own: true }, { clip: 'Attack-Casting-03', volume: 3.5, at: 1.27 }, { clip: 'Attack-Body-01', volume: 3, at: 1.78 }, { clip: 'Attack-Magic-03', volume: 3.1, at: 1.9 }, { clip: 'Attack-Damage-19', volume: 3.3, at: 1.9 }, { clip: 'Attack-Magic-04', volume: 2.5, at: 1.91 }],
    },
    victory: [{ clip: 'Clause-Vox_Victory', volume: 0.9, at: 0.28, own: true }, { clip: 'FX-Clause_01', volume: 0.8, at: 0.8 }, { clip: 'Attack-Woosh-11', volume: 2, at: 1.46 }, { clip: 'Attack-Action-01', at: 1.59 }, { clip: 'FX-Clause_02', volume: 0.7, at: 2.98 }],
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Clause.Attack1.3', 'Skill.Hero.Clause.Attack1.2'], land: ['Hit.Normal.SlashBig', 'Hit.Normal.StrikeBig'] },
    slam: { start: ['Skill.Hero.Clause.Re.Skill2.Casting', 'Skill.Hero.Clause.Re.Skill2.Mark'], land: ['Skill.Hero.Clause.Re.Skill2.Hit'] },
    guard: { start: ['Skill.Hero.Clause.Skill1.CastingShield', 'Skill.Hero.Clause.Skill1.CastingParticle', 'Skill.Hero.Clause.Re.Skill1.Casting'] },
    bash: { land: ['Common.HitImpact', 'Hit.Physical.02', 'Common.EarthQuake'] },
  },
  skins: [
    {
      name: 'Klaus',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Klaus.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Klaus.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Klaus.webp',
      portrait: { file: 'Klaus.png', from: 'https://drive.google.com/uc?export=download&id=1bFANcAEYPRzphZmxGd79xgdvYFda-6ev', crop: { x: 612, y: 62, size: 160 } },
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        // His body, and his hair and helm (the folder with no more to its name).
        parts: ['Hero_Klaus_Vari05_01_Body', 'Hero_Klaus_Vari05'],
        left: 'Hero_Klaus_Vari05_Shield',
        right: 'Hero_Klaus_Vari05_Sword',
        blade: 'y',
      },
    },
    // King's Raid's School costume (tm-costumes.mjs).
    {
      name: 'Klaus_School',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Klaus_School.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Klaus_School.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Klaus_School.webp',
      title: 'Student Council Klaus',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Clause_Cos16SL_Body', 'Hero_Clause_Hair_05'],
        left: 'Hero_Clause_Cos16SL_Shield',
        right: 'Hero_Clause_Cos16SL_Sword',
        blade: 'y',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Klaus_Summer',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Klaus_Summer.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Klaus_Summer.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Klaus_Summer.webp',
      title: 'Beachside Klaus',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Clause_Cos17Summer_Body', 'Hero_Clause_Hair_05'],
        left: 'Hero_Clause_Cos17Summer_Shield',
        right: 'Hero_Clause_Cos17Summer_Sword',
        blade: 'y',
      },
    },
    // King's Raid's Idol costume (tm-costumes.mjs).
    {
      name: 'Klaus_Idol',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Klaus_Idol.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Klaus_Idol.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Klaus_Idol.webp',
      title: 'Halcyon Knights Klaus',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Clause_Cos17Idol_Body', 'Hero_Clause_Hair_05'],
        left: 'Hero_Clause_Cos17Idol_Shield',
        right: 'Hero_Clause_Cos17Idol_Sword',
        blade: 'y',
      },
    },
    // King's Raid's Frozen costume (tm-costumes.mjs).
    {
      name: 'Klaus_Frozen',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Klaus_Frozen.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Klaus_Frozen.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Klaus_Frozen.webp',
      title: 'Ice Knight Klaus',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Clause_Cos18Frozen_Body', 'Hero_Clause_Hair_05'],
        left: 'Hero_Clause_Cos18Frozen_Shield',
        right: 'Hero_Clause_Cos18Frozen_Sword',
        blade: 'y',
      },
    },
    // King's Raid's Maid costume (tm-costumes.mjs).
    {
      name: 'Klaus_Maid',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Klaus_Maid.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Klaus_Maid.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Klaus_Maid.webp',
      title: 'Butler Klaus',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Clause_Cos18Maid_Body', 'Hero_Clause_Hair_05'],
        left: 'Hero_Clause_Cos18Maid_Shield',
        right: 'Hero_Clause_Cos18Maid_Sword',
        blade: 'y',
      },
    },
    // King's Raid's NewYear costume (tm-costumes.mjs).
    {
      name: 'Klaus_NewYear',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Klaus_NewYear.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Klaus_NewYear.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Klaus_NewYear.webp',
      title: 'Centurion Klaus',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Clause_Cos19NewYear_Body', 'Hero_Clause_Cos19NewYear'],
        left: 'Hero_Clause_Cos19NewYear_Shield',
        right: 'Hero_Clause_Cos19NewYear_Sword',
        blade: 'y',
      },
    },
    // King's Raid's Summer costume (tm-costumes.mjs).
    {
      name: 'Klaus_Summer19',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Klaus_Summer19.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Klaus_Summer19.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Klaus_Summer19.webp',
      title: 'Beachside Klaus',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Clause_Cos19Summer_Body', 'Hero_Clause_Hair_05'],
        left: 'Hero_Clause_Cos19Summer_Shield',
        right: 'Hero_Clause_Cos19Summer_Sword',
        blade: 'y',
      },
    },
    // King's Raid's Wedding costume (tm-costumes.mjs).
    {
      name: 'Klaus_Wedding',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Klaus_Wedding.webp',
      // King's Raid's own card of it (KR-extracted/scripts/tm-icons.mjs).
      card: 'Klaus_Wedding.webp',
      // King's Raid's own battle portrait of it (KR-extracted/scripts/tm-icons.mjs).
      battle: 'Klaus_Wedding.webp',
      title: 'Unbreakable Vow of Trust Klaus',
      model: {
        kind: 'parts',
        animations: ANIMATIONS,
        parts: ['Hero_Clause_Cos20Wedding_Body', 'Hero_Clause_Hair_05'],
        left: 'Hero_Clause_Cos20Wedding_Shield',
        right: 'Hero_Clause_Cos20Wedding_Sword',
        blade: 'y',
      },
    },
  ],
};
