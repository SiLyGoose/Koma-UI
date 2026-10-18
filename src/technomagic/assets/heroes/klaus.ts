import type { HeroAssets, KrAnimations } from '../types.ts';

/**
 * King's Raid's own animations (its skins of the game's files are moved by them: ../../heroes/body/kr.ts): its basic attack's
 * chain, and each skill's clips, with when its blows land in them as the game's timelines have them (KR-extracted/scripts/tm-anims.mjs).
 */
const ANIMATIONS = {
  idle: 'Idle',
  run: 'Run',
  hurt: 'Damage',
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
  // Guardian Shield's look: his own shield, held up before each hero it guards.
  props: { guardian: 'Hero_Klaus_Vari05_Shield' },
  // His unique weapon, wielded: Exian, his sword and shield.
  unique: { Hero_Klaus_Vari05_Shield: 'Hero_Klaus_Unique01_Shield', Hero_Klaus_Vari05_Sword: 'Hero_Klaus_Unique01_Sword' },
  // King's Raid's sounds (its Hit.Hero.Clause.* and BeginFireSkill.<skill> ones): as each blow of a move lands, a move's n-th part
  // playing its n-th (round again past the last); and as each skill begins.
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
  },
  // King's Raid's own effects for its moves (../../fx/kr-effects.ts): as each begins, on it, and as each of its blows lands, where it
  // lands (KR-extracted/scripts/tm-vfx.mjs).
  vfx: {
    attack: { start: ['Skill.Hero.Clause.Attack1.3', 'Skill.Hero.Clause.Attack1.2'], land: ['Hit.Normal.SlashBig', 'Hit.Normal.StrikeBig'] },
    slam: { start: ['Skill.Hero.Clause.Re.Skill2.Casting', 'Skill.Hero.Clause.Re.Skill2.Mark'], land: ['Skill.Hero.Clause.Re.Skill2.Hit'] },
    guard: { start: ['Skill.Hero.Clause.Skill1.CastingShield', 'Skill.Hero.Clause.Skill1.CastingParticle', 'Skill.Hero.Clause.Re.Skill1.Casting', 'Skill.Hero.Clause.Skill1.Loop'] },
    bash: { land: ['Common.HitImpact', 'Hit.Physical.02', 'Common.EarthQuake'] },
  },
  skins: [
    {
      name: 'Klaus',
      // King's Raid's own icon of it (KR-extracted/scripts/tm-icons.mjs).
      icon: 'Klaus.webp',
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
  ],
};
