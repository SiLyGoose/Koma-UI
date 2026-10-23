import type { BossAssets } from '../types.ts';

/** Zyrrkinoth, the Poison Dragon: one mesh on the dragons' skeleton (the game's files call it Raid_Dragon_Poison). */
export const ZYRRKINOTH_ASSETS: BossAssets = {
  name: 'Zyrrkinoth',
  folder: 'bosses/zyrrkinoth',
  models: ['Raid_Dragon_Poison_Vari01_Mesh'],
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
      bite: { clips: ['Attack1'], hits: [1.3] },
      claw: { clips: ['Attack2'], hits: [1.2] },
      sweep: { clips: ['Skill1'], hits: [3.5] },
      smashes: { clips: ['Skill1'], hits: [3.5] },
      breath: { clips: ['Skill2'], hits: [2.5, 4.3] },
    },
  },
  // The minions of its raid's waves (King's Raid's own: their model, and their clips; both its wyrms the one model).
  minions: {
    'hatchling-poison': { model: 'Monster_Hatchling_Poison_Vari01_Mesh', animations: 'hatchling' },
    wyrm: { model: 'Mob_GiantWorm_Grass_Vari01_Mesh', animations: 'wyrm' },
    wyrmling: { model: 'Mob_GiantWorm_Grass_Vari01_Mesh', animations: 'wyrm' },
  },
  // The music the Dragon Raid plays (BattleBGM.RaidBGM): it ends where it begins, so it goes round again from its end.
  music: { file: 'RaidBGM.mp3', loop: 64.762 },
  // King's Raid's sounds (its BeginFireSkill.<skill>, Hit.Raid.Dragon.Poison.*, Damage and Dead ones): as each of its attacks begins
  // (cut to how long the attack takes here), as its blows land on a hero, as it is knocked down, and as it falls.
  sounds: {
    uses: {
      bite: [{ clip: 'Attack-Woosh-14', volume: 2.2, at: 0.94 }, { clip: 'Raid_Dragon_02', volume: 2.5, at: 1.06, own: true }, { clip: 'FX-Dragon-Landing-01', volume: 1.8, at: 1.12 }],
      claw: [{ clip: 'Attack-Woosh-14', volume: 2.2, at: 0.88 }, { clip: 'Raid_Dragon_03', volume: 2.6, at: 0.89, own: true }],
      sweep: [{ clip: 'Raid_Dragon_02', volume: 2.6, at: 0.38, own: true }],
      breath: [{ clip: 'Raid_Dragon_06', volume: 2.5, own: true }, { clip: 'Attack-Casting-32', volume: 1.2, at: 0.06 }, { clip: 'Attack-Casting-18', volume: 1.2, at: 0.08 }, { clip: 'Raid_Dragon_07', volume: 2.5, at: 1.99, own: true }, { clip: 'Attack-Magic-43', volume: 2.2, at: 2.16 }, { clip: 'Attack-Magic-40', volume: 2.2, at: 2.16 }],
      smashes: [{ clip: 'Raid_Dragon_02', volume: 2.6, at: 0.38, own: true }, { clip: 'FX-Dragon-move-01', volume: 1.6, at: 2.25 }, { clip: 'Attack-Magic-05', volume: 1.8, at: 3.09 }, { clip: 'Attack-Magic-22', volume: 1.8, at: 3.09 }, { clip: 'FX-Dragon-Wing-01', volume: 2.2, at: 3.09 }],
    },
    hits: {
      bite: [{ clip: 'Attack-Damage-28', volume: 2 }],
      claw: [{ clip: 'Attack-Damage-28', volume: 2 }],
      sweep: [{ clip: 'Attack-Damage-09', volume: 2.7 }],
      breath: [{ clip: 'Attack-Damage-09', volume: 2.7 }],
      smashes: [{ clip: 'Attack-Damage-09', volume: 2.7 }],
    },
    down: [{ clip: 'Raid_Dragon_04', volume: 2.6, own: true }],
    dead: [{ clip: 'Raid_Dragon_05', volume: 2.6, own: true }, { clip: 'FX-Dragon-Landing-01', volume: 1.6, at: 2.8 }],
  },
  // King's Raid's own effects for it (KR-extracted/scripts/tm-boss-vfx.mjs): each attack's, as it begins, flown from it, and as its blows land on a hero.
  vfx: {
    attacks: {
      bite: { start: ['Skill.Raid.Dragon.Poison.Attack01'] },
      claw: { start: ['Skill.Raid.Dragon.Poison.Attack02'] },
      sweep: { start: ['Skill.Raid.Dragon.Poison.Skill1.Casting'] },
      smashes: { start: ['Skill.Raid.Dragon.Poison.Skill1.Casting'] },
      breath: { start: ['Skill.Raid.Dragon.Poison.Skill2.Casting', 'Skill.Raid.Dragon.Poison.Skill2.Shot'] },
    },
    advent: ['Skill.Raid.Dragon.Poison.Encounter'],
  },
};
