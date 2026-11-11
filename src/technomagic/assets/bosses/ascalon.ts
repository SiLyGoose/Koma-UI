import type { BossAssets } from '../types.ts';

/**
 * Ascalon, as King's Raid's raid has him (Raid.Tech.Ascalon: Boss_Ascalon_Vari01_Mesh, one body on one skeleton, nothing held),
 * and the Synthetic Demon Beasts of his waves and of his Dimension Warp (the playtest's Raid chimeras, each its model's own).
 */
export const ASCALON_ASSETS: BossAssets = {
  name: 'Ascalon',
  folder: 'bosses/ascalon',
  models: ['Boss_Ascalon_Vari01_Mesh'],
  // King's Raid's own (its blows as the game's timelines have them: SkillTable 3592000 to 3592030's TickTimeValue). The
  // playtest's files have no Advent clip for him (his BossIntro's EmotiMotion): he comes in with his attack's swings, as his
  // Advent sound has them (its voice and swishes at his attack's).
  animations: {
    idle: 'Astand',
    dead: 'Dead',
    arrive: 'Attack',
    attacks: {
      attack: { clips: ['Attack'], hits: [1.7, 2.4, 4.1] },
      barrage: { clips: ['Skill1'], hits: [3.1, 3.2, 3.3, 3.4] },
      warp: { clips: ['Skill2'], hits: [2] },
      destruction: { clips: ['Skill3'], hits: [2, 2.2, 2.4, 2.6, 4.5, 5.4] },
    },
  },
  // The music of his raid (CampaignWaveTable's Battle.Chapter10.Boss: Chapter10_BOSS_BGM), over and over.
  music: { file: 'Chapter10BossBGM.mp3', loop: 74.552 },
  // The beasts of his waves and his warp (King's Raid's own: their models, their clips' folders, and their moves' clips, each
  // fitted to the fight's timing of it: the Failed's leap its Skill1-1 and 1-2, then its strikes; the Experimented's dash its
  // Skill1-1 to 1-3, then its nine blows). The Discarded from afar attacks with its Skill2 (3592500's clip).
  minions: {
    'beast-discarded': {
      model: 'Monster_Chimera_Normal_Mesh',
      animations: 'chimera-normal',
      moves: { attack: { clips: ['Attack1'], hits: [0.8, 1.5] }, skill: { clips: ['Skill1'], hits: [1.7, 2] }, dead: 'Die' },
    },
    'beast-discarded-ranged': {
      model: 'Monster_Chimera_Normal_Mesh',
      animations: 'chimera-normal',
      moves: { attack: { clips: ['Skill2'], hits: [2] }, dead: 'Die' },
    },
    'beast-failed': {
      model: 'Monster_Chimera_Elite_Mesh',
      animations: 'chimera-elite',
      moves: {
        attack: { clips: ['Attack1'], hits: [1, 2.4] },
        skills: [
          { clips: ['Skill1-1', 'Skill1-2', 'Skill3'], hits: [5.8, 6.8] },
          { clips: ['Skill2'], hits: [1.8] },
        ],
      },
    },
    'beast-experimented': {
      model: 'Monster_Chimera_SuperElite1_Mesh',
      animations: 'chimera-superelite1',
      moves: {
        attack: { clips: ['Attack1'], hits: [0.5, 0.8] },
        skills: [
          { clips: ['Skill1-1', 'Skill1-2', 'Skill1-3', 'Skill3'], hits: [4, 4.2, 4.4, 4.6, 4.8, 5, 5.2, 5.4, 5.6] },
          { clips: ['Skill2'], hits: [] },
        ],
      },
    },
    'beast-ceased': {
      model: 'Monster_Chimera_SuperElite2_Mesh',
      animations: 'chimera-superelite2',
      moves: {
        attack: { clips: ['Attack1'], hits: [0.6, 0.8, 1] },
        skills: [
          { clips: ['Skill1'], hits: [1.8] },
          { clips: ['Skill2'], hits: [] },
          { clips: ['Skill3'], hits: [1.8] },
        ],
      },
    },
  },
  // King's Raid's own effects for it (KR-extracted/scripts/tm-boss-vfx.mjs): each attack's, as it begins, flown from it, and as its blows land on a hero.
  vfx: {
    attacks: {
      attack: { start: ['Skill.Boss.Ascalon.Attack1.Attack'], later: [{ at: 1.7, code: 'Skill.Boss.Ascalon.Attack1.Hit1' }, { at: 2.4, code: 'Skill.Boss.Ascalon.Attack1.Hit1' }] },
      barrage: { start: ['Skill.Boss.Ascalon.Skill1.Casting'], hit: ['Skill.Boss.Ascalon.Skill1.Hit'] },
      warp: { start: ['Skill.Boss.Ascalon.Skill2.Casting'] },
      destruction: { start: ['Skill.Boss.Ascalon.Skill3.Casting'], hit: ['Skill.Boss.Ascalon.Skill3.Hit'] },
    },
    own: ['Skill.Boss.Ascalon.Attack1.Hit2', 'Skill.Boss.Ascalon.Skill1.Circle', 'Skill.Boss.Ascalon.Skill1.Projectile', 'Skill.Boss.Ascalon.Skill1.Hit', 'Skill.Boss.Ascalon.Skill2.Buff'],
  },
  // King's Raid's sounds (its BeginFireSkill.<skill>, Hit.Boss.Ascalon.*, Down and Dead ones): as each of its attacks begins
  // (cut to how long the attack takes here), as its blows land on a hero, as it is knocked down, and as it falls.
  sounds: {
    uses: {
      attack: [{ clip: 'Ascalon_01', volume: 3, at: 0.212, own: true }, { clip: 'Ascalon_02', volume: 4, at: 1.114, own: true }, { clip: 'swish_05', volume: 4, at: 1.114 }, { clip: 'Ascalon_03', volume: 4, at: 2.315, own: true }, { clip: 'swish_06', volume: 4, at: 2.315 }, { clip: 'Ascalon_04', volume: 4, at: 3.85, own: true }, { clip: 'Impact-01', volume: 4, at: 3.85 }],
      barrage: [{ clip: 'Laser_01', volume: 4, at: 0.02 }],
      warp: [{ clip: 'Ascalon_05', volume: 4, at: 0.227, own: true }, { clip: 'Heavy_fall_02', volume: 4, at: 0.825 }, { clip: 'Ascalon_06', volume: 4, at: 1.327, own: true }, { clip: 'Boss_magic_01', volume: 4, at: 1.463 }],
      destruction: [{ clip: 'Ascalon_07', volume: 4, at: 0.444, own: true }, { clip: 'Ascalon_08', volume: 4, at: 1.847, own: true }, { clip: 'Boss_magic_01', volume: 4, at: 1.847 }, { clip: 'Texture-06', volume: 4, at: 3.266 }, { clip: 'Ascalon_09', volume: 4, at: 4.299, own: true }, { clip: 'Impact-02', volume: 4, at: 4.43 }, { clip: 'Ascalon_10', volume: 4, at: 5.532, own: true }, { clip: 'Impact-03', volume: 4, at: 5.532 }],
      arrive: [{ clip: 'Ascalon_01', volume: 4, at: 0.2, own: true }, { clip: 'Ascalon_02', volume: 4, at: 1.4, own: true }, { clip: 'swish_05', volume: 4, at: 1.4 }, { clip: 'Ascalon_03', volume: 4, at: 2.4, own: true }, { clip: 'swish_06', volume: 4, at: 2.4 }, { clip: 'Ascalon_10', volume: 4, at: 4.033, own: true }, { clip: 'Heavy_fall_01', volume: 4, at: 4.033 }],
    },
    hits: {
      attack: [{ clip: 'Attack-Damage-05', volume: 2, at: 0.03 }],
      barrage: [{ clip: 'Attack-Damage-09', volume: 2, at: 0.03 }],
      destruction: [{ clip: 'Attack-Damage-03', volume: 2, at: 0.03 }],
    },
    dead: [{ clip: 'Ascalon_11', volume: 4, at: 0.2, own: true }, { clip: 'Heavy_fall_02', volume: 4, at: 1.2 }],
  },
};
