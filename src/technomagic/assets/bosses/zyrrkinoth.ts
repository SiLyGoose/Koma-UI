import type { BossAssets } from '../types.ts';

/** Zyrrkinoth, the Poison Dragon: one mesh on the dragons' skeleton (the game's files call it Raid_Dragon_Poison). */
export const ZYRRKINOTH_ASSETS: BossAssets = {
  name: 'Zyrrkinoth',
  folder: 'bosses/zyrrkinoth',
  models: ['Raid_Dragon_Poison_Vari01_Mesh'],
  // King's Raid's own (its blows as the game's timelines have them: Raid/Dragon's skill scripts). Its bite is its Attack1,
  // its claw its Attack2, its tail its Skill1 and its breath its Skill2; its Poison Cloud its Skill3 (its Slimes called up,
  // then its two blows); its Poisoned Lands its Skill4-1 (up on its wings, their blast), Skill4-2 (its venom from the air,
  // after a moment unseen there: the sim's second blow is where Skill4-1 ends) and Landing. (One its sim has land far
  // sooner than the game, its blows aren't matched: it is only sped up.)
  animations: {
    idle: 'Astand',
    down: 'Getup_Down',
    getUp: 'Getup_Getup',
    leave: 'Phase',
    arrive: 'Landing',
    attacks: {
      bite: { clips: ['Attack1'], hits: [1.3] },
      claw: { clips: ['Attack2'], hits: [1.2] },
      smashes: { clips: ['Skill1'], hits: [3.5] },
      breath: { clips: ['Skill2'], hits: [2.5, 4.3] },
      cloud: { clips: ['Skill3'], hits: [0.5, 3, 3.2] },
      lands: { clips: ['Skill4-1', 'Skill4-2', 'Landing'], hits: [1.6, 5.3, 5.6, 5.7, 5.8, 5.9, 6, 7.6] },
    },
  },
  // The minions of its raid's waves (King's Raid's own: their model, and their clips; both its wyrms the one model), and
  // the Slimes its Poison Cloud calls up (the game's Monster.SlimeNomal.Green: its SlimeMini model).
  minions: {
    slime: { model: 'Monster_SlimeMini_Green_Vari01_Mesh', animations: 'slime' },
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
      breath: [{ clip: 'Raid_Dragon_06', volume: 2.5, own: true }, { clip: 'Attack-Casting-32', volume: 1.2, at: 0.06 }, { clip: 'Attack-Casting-18', volume: 1.2, at: 0.08 }, { clip: 'Raid_Dragon_07', volume: 2.5, at: 1.99, own: true }, { clip: 'Attack-Magic-43', volume: 2.2, at: 2.16 }, { clip: 'Attack-Magic-40', volume: 2.2, at: 2.16 }],
      smashes: [{ clip: 'Raid_Dragon_02', volume: 2.6, at: 0.38, own: true }, { clip: 'FX-Dragon-move-01', volume: 1.6, at: 2.25 }, { clip: 'Attack-Magic-05', volume: 1.8, at: 3.09 }, { clip: 'Attack-Magic-22', volume: 1.8, at: 3.09 }, { clip: 'FX-Dragon-Wing-01', volume: 2.2, at: 3.09 }],
      cloud: [{ clip: 'Raid_Dragon_07', volume: 2.6, at: 0.74, own: true }, { clip: 'Attack-Casting-32', volume: 1.5, at: 0.98 }, { clip: 'Attack-Casting-18', volume: 1.5, at: 1.7 }, { clip: 'Raid_Dragon_03', volume: 2.6, at: 3, own: true }, { clip: 'Attack-Magic-10', volume: 2.5, at: 3 }],
      lands: [{ clip: 'Raid_Dragon_02', volume: 2.6, at: 0.96, own: true }, { clip: 'FX-Dragon-Wing-01', volume: 2, at: 1.37 }, { clip: 'FX-Dragon-Wing-02', volume: 2, at: 2.57 }, { clip: 'FX-Dragon-Wing-01', volume: 2, at: 3.8 }, { clip: 'FX-Dragon-Wing-02', volume: 2, at: 4.94 }, { clip: 'Raid_Dragon_03', volume: 2.6, at: 5.01, own: true }, { clip: 'FX-Dragon-move-01', volume: 1.8, at: 5.06 }, { clip: 'Attack-Magic-41', volume: 1.8, at: 6.4 }, { clip: 'Attack-Magic-33', volume: 1.8, at: 6.47 }, { clip: 'Attack-Magic-58', volume: 1.8, at: 6.54 }, { clip: 'Attack-Magic-46', volume: 1.8, at: 6.54 }, { clip: 'Raid_Dragon_07', volume: 2.6, at: 8.21, own: true }, { clip: 'FX-Dragon-Landing-01', volume: 1.8, at: 8.56 }],
    },
    hits: {
      bite: [{ clip: 'Attack-Damage-28', volume: 2 }],
      claw: [{ clip: 'Attack-Damage-28', volume: 2 }],
      breath: [{ clip: 'Attack-Damage-09', volume: 2.7 }],
      smashes: [{ clip: 'Attack-Damage-09', volume: 2.7 }],
      cloud: [{ clip: 'Attack-Damage-09', volume: 2.7 }],
      lands: [{ clip: 'Attack-Damage-09', volume: 2.7 }],
    },
    down: [{ clip: 'Raid_Dragon_04', volume: 2.6, own: true }],
    dead: [{ clip: 'Raid_Dragon_05', volume: 2.6, own: true }, { clip: 'FX-Dragon-Landing-01', volume: 1.6, at: 2.8 }],
  },
  // King's Raid's own effects for it (KR-extracted/scripts/tm-boss-vfx.mjs): each attack's, as it begins, flown from it, and as its blows land on a hero.
  vfx: {
    attacks: {
      bite: { start: ['Skill.Raid.Dragon.Poison.Attack01'] },
      claw: { start: ['Skill.Raid.Dragon.Poison.Attack02'] },
      smashes: { start: ['Skill.Raid.Dragon.Poison.Skill1.Casting'] },
      breath: { start: ['Skill.Raid.Dragon.Poison.Skill2.Casting', 'Skill.Raid.Dragon.Poison.Skill2.Shot'] },
      cloud: { start: ['Skill.Raid.Dragon.Poison.Skill3.Casting'], fly: ['Skill.Raid.Dragon.Poison.Skill3.Projectile'], hit: ['Skill.Raid.Dragon.Poison.Skill3.Hit'] },
      lands: { start: ['Skill.Raid.Dragon.Poison.Skill4.Casting'], hit: ['Skill.Raid.Dragon.Poison.Skill4.Hit'] },
    },
    advent: ['Skill.Raid.Dragon.Poison.Encounter'],
  },
};
