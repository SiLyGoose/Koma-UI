import type { BossAssets } from '../types.ts';

/** Armarta, the Black Dragon: one mesh on the dragons' skeleton (the game's files call it Raid_Dragon_Black). */
export const ARMARTA_ASSETS: BossAssets = {
  name: 'Armarta',
  folder: 'bosses/armarta',
  models: ['Raid_Dragon_Black_Vari01_Mesh'],
  // King's Raid's own (its blows as the game's timelines have them: Raid/Dragon's skill scripts). Its bite is its Attack1,
  // its claw its Attack2, its tail its Skill1 and its breath its Skill2; its rise into the air, what it casts there and
  // its landing its Skill4. (One its sim has land far sooner than the game, its blows aren't matched: it is only sped up.)
  animations: {
    idle: 'Astand',
    down: 'Getup_Down',
    getUp: 'Getup_Getup',
    attacks: {
      bite: { clips: ['Attack1'], hits: [1.2] },
      claw: { clips: ['Attack2'], hits: [1.3] },
      sweep: { clips: ['Skill1'], hits: [2] },
      breath: { clips: ['Skill2'], hits: [2.2, 4.7] },
      gaze: { clips: ['Skill3'], hits: [] },
      eclipse: { clips: ['Skill4-1', 'Landing'], hits: [6.6] },
    },
  },
  // The music the Dragon Raid plays (BattleBGM.RaidBGM): it ends where it begins, so it goes round again from its end.
  music: { file: 'RaidBGM.mp3', loop: 64.762 },
  // King's Raid's sounds (its BeginFireSkill.<skill>, Hit.Raid.Dragon.Black.*, Damage and Dead ones): as each of its attacks begins
  // (cut to how long the attack takes here), as its blows land on a hero, as it is knocked down, and as it falls.
  sounds: {
    uses: {
      bite: [{ clip: 'Attack-Woosh-14', volume: 2.2, at: 1.32 }, { clip: 'Raid_Dragon_02', volume: 2.5, at: 1.44, own: true }, { clip: 'FX-Dragon-Landing-01', volume: 1.8, at: 1.5 }],
      claw: [{ clip: 'Attack-Woosh-14', volume: 2.2, at: 1.21 }, { clip: 'Raid_Dragon_03', volume: 2.6, at: 1.22, own: true }],
      sweep: [{ clip: 'Raid_Dragon_01', volume: 2.6, at: 0.15, own: true }, { clip: 'Attack-Casting-32', volume: 1.6, at: 0.86 }, { clip: 'Attack-Woosh-14', volume: 2.2, at: 1.9 }, { clip: 'Attack-Magic-39', volume: 2.2, at: 1.94 }, { clip: 'FX-Dragon-Landing-01', volume: 1.9, at: 2.03 }],
      breath: [{ clip: 'Raid_Dragon_06', volume: 2.5, own: true }, { clip: 'Attack-Casting-32', volume: 1.2, at: 0.06 }, { clip: 'Attack-Casting-18', volume: 1.2, at: 0.08 }, { clip: 'Raid_Dragon_07', volume: 2.5, at: 1.99, own: true }, { clip: 'Attack-Magic-43', volume: 2.2, at: 2.16 }],
      gaze: [{ clip: 'Raid_Dragon_03', volume: 2.6, at: 0.18, own: true }, { clip: 'Attack-Magic-41', volume: 2.2, at: 0.18 }, { clip: 'Attack-Magic-46', volume: 2.2, at: 0.18 }, { clip: 'Attack-Magic-40', volume: 2.2, at: 0.2 }],
      eclipse: [{ clip: 'FX-Dragon-Wing-01', volume: 2 }, { clip: 'Raid_Dragon_03', volume: 2.6, at: 0.8, own: true }, { clip: 'FX-Dragon-Wing-01', volume: 2, at: 1.16 }, { clip: 'FX-Dragon-Wing-02', volume: 2, at: 2.38 }],
    },
    hits: {
      bite: [{ clip: 'Attack-Damage-28', volume: 2 }],
      claw: [{ clip: 'Attack-Damage-28', volume: 2 }],
      sweep: [{ clip: 'Attack-Damage-09', volume: 2.7 }],
      breath: [{ clip: 'Attack-Damage-09', volume: 2.7 }],
      gaze: [{ clip: 'Attack-Damage-09', volume: 2 }],
      eclipse: [{ clip: 'Attack-Damage-09', volume: 2 }],
    },
    down: [{ clip: 'Raid_Dragon_04', volume: 2.6, own: true }],
    dead: [{ clip: 'Raid_Dragon_05', volume: 2.6, own: true }, { clip: 'FX-Dragon-Landing-01', volume: 1.6, at: 2.8 }],
  },
  // King's Raid's own effects for it (KR-extracted/scripts/tm-boss-vfx.mjs): each attack's, as it begins and as its blows land on a hero.
  vfx: {
    attacks: {
      bite: { start: ['Skill.Raid.Dragon.Black.Attack01'] },
      claw: { start: ['Skill.Raid.Dragon.Black.Attack02'] },
      sweep: { start: ['Skill.Raid.Dragon.Black.Skill1.Casting'] },
      breath: { start: ['Skill.Raid.Dragon.Black.Skill2.Casting', 'Skill.Raid.Dragon.Black.Skill2.Shot'] },
      gaze: { start: ['Skill.Raid.Dragon.Black.Skill3.Casting'], hit: ['Skill.Raid.Dragon.Black.Skill3.Hit'] },
      eclipse: { start: ['Skill.Raid.Dragon.Black.Skill4.Casting'], hit: ['Skill.Raid.Dragon.Black.Skill4.Hit'] },
    },
    advent: ['Skill.Raid.Dragon.Black.Encounter'],
  },
};
