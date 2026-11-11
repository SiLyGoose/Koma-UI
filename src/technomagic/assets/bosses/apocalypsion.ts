import type { BossAssets } from '../types.ts';

/**
 * Apocalypsion, Calamity of Destruction, as King's Raid's Divine Punishment Raid has her (creature 60002,
 * Raid.Punishment.Apocalypsion: its Boss.Apocalypsion model, a blade in each hand), come in Tersio's place at his 1%.
 */
export const APOCALYPSION_ASSETS: BossAssets = {
  name: 'Apocalypsion',
  folder: 'bosses/apocalypsion',
  models: ['Boss_Apocalypsion_Mesh', 'Boss_Apocalypsion_Weapon_L', 'Boss_Apocalypsion_Weapon_R'],
  // King's Raid's own, each the clip its skill script plays (Raid/Punishment/Apocalypsion.bjs), its blows where the skill's
  // timeline has them: her attack Attack1 (its third cut, 1.4 s in, the stand-in's one blow), Engraving Aura Skill1 (1.2, 1.8,
  // 2.3 and 3.5 s), Shaking Earth Skill2 (2.5 s), Invitation to the Abyss Skill3-1, its charging (3-2, once) and its blast
  // (3-3, 0.6 s in). Coming in, her wave-start skill (6000270: Skill5); beaten, her Dead. No CC holds her: no knockdown.
  animations: {
    idle: 'Astand',
    dead: 'Dead',
    arrive: 'Skill5',
    attacks: {
      strike: { clips: ['Attack1'], hits: [1.4] },
      aura: { clips: ['Skill1'], hits: [1.2, 1.8, 2.3, 3.5] },
      earth: { clips: ['Skill2'], hits: [2.5] },
      abyss: { clips: ['Skill3_1', 'Skill3_2', 'Skill3_3'], hits: [0.9, 8.6] },
    },
  },
  // Her raid's music (Raid 1005's BGM: Raid.Apocalypsion.Boss), going on from Tersio's.
  music: { file: 'ApocalypsionBossBGM.mp3', loop: 89.914 },
  // King's Raid's sounds (its BeginFireSkill.<skill>, Hit.Raid.Punishment.Apocalypsion.*, Down and Dead ones): as each of its attacks begins
  // (cut to how long the attack takes here), as its blows land on a hero, as it is knocked down, and as it falls.
  sounds: {
    uses: {
      strike: [{ clip: 'Swd-01', volume: 2.5, at: 0.308 }, { clip: 'Swd_idle_03', volume: 2.5, at: 0.639 }, { clip: 'Swd-02', volume: 2.5, at: 0.937 }, { clip: 'Swd-03', volume: 2.5, at: 1.488 }, { clip: 'Swd-04', volume: 2.5, at: 1.754 }, { clip: 'Texture-05', volume: 2.5, at: 2.174 }, { clip: 'Swd-05', volume: 2.5, at: 2.505 }],
      aura: [{ clip: 'Apocalypsion-Vox_Skill1', volume: 4.5, at: 0.17, own: true }, { clip: 'Dark-fx-03', volume: 2.5, at: 0.335 }, { clip: 'Swd-01', volume: 2.5, at: 1.336 }, { clip: 'Swd-02', volume: 2.5, at: 1.933 }, { clip: 'Swd-fire-03', volume: 2.5, at: 2.334 }, { clip: 'Swd-fire-01', volume: 2.5, at: 3.5 }],
      earth: [{ clip: 'Apocalypsion-Vox_Skill2', volume: 4.5, at: 0.1, own: true }, { clip: 'Dark_magic_01', volume: 2.5, at: 0.331 }, { clip: 'Dark_magic_02', volume: 2.5, at: 1.666 }, { clip: 'Dark_exp_01', volume: 2.5, at: 2.521 }],
      abyss: [{ clip: 'Apocalypsion-Vox_Skill3', volume: 4.5, at: 0.159, own: true }, { clip: 'Dark_magic_02', volume: 2.5, at: 0.176 }, { clip: 'Dark_elec_01', volume: 2.5, at: 0.804 }, { clip: 'Dark_elec_02', volume: 2.5, at: 1.635 }, { clip: 'Dark_exp_02', volume: 2.5, at: 4.509 }, { clip: 'Apocalypsion-Vox_Attack4', volume: 4.5, at: 4.642, own: true }],
      advent: [{ clip: 'Dark_magic_08', volume: 2.5, at: 0.472 }],
    },
    hits: {
      strike: [{ clip: 'Dmg-swd-01', volume: 2.5, at: 0.05 }],
      aura: [{ clip: 'Damage_01', volume: 2.6, at: 0.05 }],
      earth: [{ clip: 'Dmg_punch_02~EFFECT3_Common', volume: 2.5, at: 0.05 }],
      abyss: [{ clip: 'Dmg-shot-01~EFFECT3_Common', volume: 2.5, at: 0.05 }],
    },
    down: [{ clip: 'Apocalypsion-Vox_Damage_1', volume: 4.5, at: 0.03, own: true }, { clip: 'Texture-10', volume: 2.5, at: 0.03 }, { clip: 'Idle-sword-01', volume: 2.5, at: 0.467 }],
    dead: [{ clip: 'Apocalypsion-Vox_Dead', volume: 4.5, at: 0.01, own: true }, { clip: 'Texture-05', volume: 2.5, at: 0.01 }, { clip: 'Idle-sword-01', volume: 2.5, at: 0.633 }, { clip: 'Idle-sword-02~EFFECT3_Common', volume: 2.5, at: 1.042 }, { clip: 'Idle-fall-01', volume: 2.5, at: 2.333 }, { clip: 'Idle-fall-02', volume: 2.5, at: 3.7 }],
  },
  // King's Raid's own effects for it (KR-extracted/scripts/tm-boss-vfx.mjs): each attack's, as it begins, flown from it, and as its blows land on a hero.
  vfx: {
    attacks: {
      strike: { start: ['Skill.Boss.Apocalypsion.Attack1.Casting'], hit: ['Skill.Boss.Apocalypsion.Attack1.Hit'] },
      aura: { start: ['Skill.Boss.Apocalypsion.Skill1.Casting', 'Skill.Boss.Apocalypsion.Skill1.Hit'] },
      earth: { start: ['Skill.Boss.Apocalypsion.Skill2.Casting'], hit: ['Skill.Boss.Apocalypsion.Skill2.Hit'] },
      abyss: { start: ['Skill.Boss.Apocalypsion.Skill3.Casting'], later: [{ at: 3.6, code: 'Skill.Boss.Apocalypsion.Skill3.Loop', lasts: 1.2 }, { at: 4.8, code: 'Skill.Boss.Apocalypsion.Skill3.Hit' }], hit: ['Skill.Boss.Apocalypsion.Skill3.Lightning'] },
    },
    advent: ['Skill.Boss.Apocalypsion.Advent.Casting'],
    kept: [
      { status: 'Wrath of the Matriarch', until: 'Wrath (2)', effects: ['Skill.Boss.Apocalypsion.Skill4.Mark1'] },
      { status: 'Wrath (2)', effects: ['Skill.Boss.Apocalypsion.Skill4.Mark2'] },
    ],
    worn: ['Skill.Boss.Apocalypsion.Advent.Loop', { code: 'BattleFieldMap.WorldBoss.ApocalypsionField.2', at: [-20, -2.5, -30], turn: -0.349 }, { code: 'BattleFieldMap.WorldBoss.ApocalypsionField.3', at: [-25, -3.5, -35], turn: -0.175 }],
  },
};
