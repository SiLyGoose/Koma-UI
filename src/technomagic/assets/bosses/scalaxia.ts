import type { BossAssets } from '../types.ts';

/** Scalaxia, the Frost Dragon: one mesh on the dragons' skeleton (the game's files call it Raid_Dragon_Ice). Its second model is the pillar of ice its Glacial Storm calls up (drawn apart from it). */
export const SCALAXIA_ASSETS: BossAssets = {
  name: 'Scalaxia',
  folder: 'bosses/scalaxia',
  models: ['Raid_Dragon_Ice_Vari01_Mesh', 'Raid_Dragon_Ice_Pillar_Vari01_Mesh'],
  // King's Raid's own (its blows as the game's timelines have them: Raid/Dragon's skill scripts). Its bite is its Attack1,
  // its claw its Attack2, its tail its Skill1 and its breath its Skill2; its rise into the air, what it casts there and
  // its landing its Skill4. (One its sim has land far sooner than the game, its blows aren't matched: it is only sped up.)
  animations: {
    idle: 'Astand',
    down: 'Getup_Down',
    getUp: 'Getup_Getup',
    leave: 'Phase',
    arrive: 'Landing',
    attacks: {
      bite: { clips: ['Attack1'], hits: [1.2] },
      claw: { clips: ['Attack2'], hits: [1.4] },
      sweep: { clips: ['Skill1'], hits: [2] },
      smashes: { clips: ['Skill1'], hits: [2] },
      breath: { clips: ['Skill2'], hits: [2.2, 4.6] },
      storm: { clips: ['Skill4-1', 'Skill4-2', 'Landing'], hits: [5, 5.8, 7.6] },
    },
  },
  // The minions of its raid's waves (King's Raid's own: their model, and their clips).
  minions: { 'hatchling-ice': { model: 'Monster_Hatchling_Ice_Vari01_Mesh', animations: 'hatchling' }, 'ice-pillar': { model: 'Raid_Dragon_Ice_Pillar_Vari01_Mesh', animations: 'pillar', clips: ['Advent'] } },
  // The music the Dragon Raid plays (BattleBGM.RaidBGM): it ends where it begins, so it goes round again from its end.
  music: { file: 'RaidBGM.mp3', loop: 64.762 },
  // King's Raid's sounds (its BeginFireSkill.<skill>, Hit.Raid.Dragon.Ice.*, Damage and Dead ones): as each of its attacks begins
  // (cut to how long the attack takes here), as its blows land on a hero, as it is knocked down, and as it falls.
  sounds: {
    uses: {
      bite: [{ clip: 'Attack-Woosh-14', volume: 2.2, at: 1.21 }, { clip: 'Raid_Dragon_03', volume: 2.6, at: 1.22, own: true }, { clip: 'FX-Dragon-Landing-01', volume: 1.8, at: 1.22 }],
      claw: [{ clip: 'Attack-Woosh-14', volume: 2.2, at: 1.32 }, { clip: 'Raid_Dragon_02', volume: 2.5, at: 1.44, own: true }, { clip: 'FX-Dragon-Landing-01', volume: 1.8, at: 1.5 }],
      sweep: [{ clip: 'Raid_Dragon_01', volume: 2.6, at: 0.15, own: true }, { clip: 'Attack-Casting-32', volume: 1.6, at: 0.86 }, { clip: 'Attack-Woosh-14', volume: 2.2, at: 1.9 }, { clip: 'Attack-Magic-39', volume: 2.2, at: 1.94 }, { clip: 'FX-Dragon-Landing-01', volume: 1.9, at: 2.03 }],
      breath: [{ clip: 'Raid_Dragon_06', volume: 2.5, own: true }, { clip: 'Attack-Casting-32', volume: 1.2, at: 0.06 }, { clip: 'Attack-Casting-18', volume: 1.2, at: 0.08 }, { clip: 'Raid_Dragon_07', volume: 2.5, at: 1.99, own: true }, { clip: 'Attack-Magic-43', volume: 2.2, at: 2.16 }],
      smashes: [{ clip: 'Raid_Dragon_01', volume: 2.6, at: 0.15, own: true }, { clip: 'Attack-Casting-32', volume: 1.6, at: 0.86 }, { clip: 'Attack-Woosh-14', volume: 2.2, at: 1.9 }, { clip: 'Attack-Magic-39', volume: 2.2, at: 1.94 }, { clip: 'FX-Dragon-Landing-01', volume: 1.9, at: 2.03 }, { clip: 'Raid_Dragon_03', volume: 2.6, at: 2.14, own: true }],
      storm: [{ clip: 'Raid_Dragon_02', volume: 2.5, at: 0.96, own: true }, { clip: 'FX-Dragon-Wing-01', volume: 2, at: 1.37 }, { clip: 'FX-Dragon-Wing-01', volume: 2, at: 4.41 }],
    },
    hits: {
      bite: [{ clip: 'Attack-Damage-28', volume: 2 }],
      claw: [{ clip: 'Attack-Damage-28', volume: 2 }],
      sweep: [{ clip: 'Attack-Damage-09', volume: 2.7 }],
      breath: [{ clip: 'Attack-Damage-09', volume: 2.7 }],
      smashes: [{ clip: 'Attack-Damage-09', volume: 2.7 }],
      storm: [{ clip: 'Attack-Damage-09', volume: 2 }],
    },
    down: [{ clip: 'Raid_Dragon_04', volume: 2.6, own: true }],
    dead: [{ clip: 'Raid_Dragon_05', volume: 2.6, own: true }, { clip: 'FX-Dragon-Landing-01', volume: 1.6, at: 2.8 }],
  },
  // King's Raid's own effects for it (KR-extracted/scripts/tm-boss-vfx.mjs): each attack's, as it begins, flown from it, and as its blows land on a hero.
  vfx: {
    attacks: {
      bite: { start: ['Skill.Raid.Dragon.Ice.Attack01'] },
      claw: { start: ['Skill.Raid.Dragon.Ice.Attack02'] },
      sweep: { start: ['Skill.Raid.Dragon.Ice.Skill1.Casting'] },
      smashes: { start: ['Skill.Raid.Dragon.Ice.Skill1.Casting'] },
      breath: { start: ['Skill.Raid.Dragon.Ice.Skill2.Casting', 'Skill.Raid.Dragon.Ice.Skill2.Shot'] },
      storm: { start: ['Skill.Raid.Dragon.Ice.Skill4.Casting'], hit: ['Skill.Raid.Dragon.Ice.Skill4.Hit'] },
    },
    advent: ['Skill.Raid.Dragon.Ice.Encounter'],
  },
};
