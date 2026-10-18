import type { BossAssets } from '../types.ts';

/** Galgoria: one mesh on one skeleton (the game's files spell it Gargoria). */
export const GALGORIA_ASSETS: BossAssets = {
  name: 'Galgoria',
  folder: 'bosses/galgoria',
  models: ['Raid_Gargoria_Mesh'],
  // King's Raid's own (its blows as the game's timelines have them). Its basic attack is one head's: Attack1-1 the
  // middle one's, 1-2 the left's, 1-3 the right's. Poisonous Explosion's is in three: its start, its loop (five times
  // over in the game: here once) and its end.
  animations: {
    idle: 'Astand',
    down: 'Getup_Down',
    getUp: 'Getup_Getup',
    attacks: {
      left: { clips: ['Attack1-2'], hits: [1.5] },
      centre: { clips: ['Attack1-1'], hits: [1.5] },
      right: { clips: ['Attack1-3'], hits: [1.5] },
      destroyer: { clips: ['Skill1'], hits: [3, 3.4, 4, 5.1] },
      swamp: { clips: ['Skill2'], hits: [2.4] },
      explosion: { clips: ['Skill3-3', 'Skill3-1', 'Skill3-2'], hits: [1.2, 3.7] },
      fatal: { clips: ['Skill4'], hits: [3.4] },
    },
  },
  // The music every stage of its raid plays (Battle.Chapter10.Battle1_Loop): it ends where it begins, so it goes round again from its end.
  music: { file: 'HildaBattleBGM.mp3', loop: 123.693 },
  // King's Raid's sounds (its BeginFireSkill.<skill>, Hit.Raid.Tech.Gargoria.*, Down and Dead ones): as each of its attacks begins
  // (cut to how long the attack takes here), as its blows land on a hero, as it is knocked down, and as it falls.
  sounds: {
    uses: {
      left: [{ clip: 'Mon-RaidTechGargoria_01', volume: 3, at: 0.424, own: true }, { clip: 'Mon-Water-02', volume: 2.8, at: 1.459 }],
      centre: [{ clip: 'Mon-RaidTechGargoria_01', volume: 3, at: 0.424, own: true }, { clip: 'Mon-Water-02', volume: 2.8, at: 1.459 }],
      right: [{ clip: 'Mon-RaidTechGargoria_01', volume: 3, at: 0.424, own: true }, { clip: 'Mon-Water-02', volume: 2.8, at: 1.459 }],
      destroyer: [{ clip: 'Mon-RaidTechGargoria_04', volume: 3, at: 0.081, own: true }, { clip: 'Mon-magic-07', volume: 2.8, at: 0.745 }, { clip: 'Mon-Tail-01', volume: 2.8, at: 2.779 }, { clip: 'Mon-Tail-01', volume: 2.8, at: 3.382 }, { clip: 'Mon-Tail-01', volume: 2.8, at: 3.912 }, { clip: 'Attack-Magic-73', volume: 2.8, at: 4.415 }],
      swamp: [{ clip: 'Mon-RaidTechGargoria_05', volume: 3, at: 0.385, own: true }, { clip: 'Attack-Magic-79', volume: 2.8, at: 0.884 }],
      explosion: [{ clip: 'Mon-RaidTechGargoria_06', volume: 3, at: 0.296, own: true }, { clip: 'Attack-Magic-77', volume: 2.8, at: 0.458 }, { clip: 'Attack-Magic-80', volume: 2.8, at: 1.495 }],
      fatal: [{ clip: 'Mon-RaidTechGargoria_07', volume: 3, at: 0.01, own: true }, { clip: 'Attack-Magic-79', volume: 2.8, at: 0.611 }],
    },
    down: [{ clip: 'Mon-RaidTechGargoria_08', volume: 4, at: 0.005, own: true }],
    dead: [{ clip: 'Mon-RaidTechGargoria_10', volume: 4, at: 0.005, own: true }, { clip: 'Mon-Fall-01', volume: 4, at: 2.64 }],
  },
  // King's Raid's own effects for it (KR-extracted/scripts/tm-boss-vfx.mjs): each attack's, as it begins and as its blows land on a hero.
  vfx: {
    attacks: {
      left: { start: ['Skill.Raid.Gargoria.Attack1.Casting2'], hit: ['Skill.Raid.Gargoria.Attack1.Hit'] },
      centre: { start: ['Skill.Raid.Gargoria.Attack1.Casting1'], hit: ['Skill.Raid.Gargoria.Attack1.Hit'] },
      right: { start: ['Skill.Raid.Gargoria.Attack1.Casting3'], hit: ['Skill.Raid.Gargoria.Attack1.Hit'] },
      destroyer: { start: ['Skill.Raid.Gargoria.Skill1.Casting'], hit: ['Skill.Raid.Gargoria.Skill1.Hit'] },
      swamp: { start: ['Skill.Raid.Gargoria.Skill2.Casting', 'Skill.Raid.Gargoria.Skill2.Loop'], hit: ['Skill.Raid.Gargoria.Skill2.Hit'] },
      explosion: { start: ['Skill.Raid.Gargoria.Skill3.Casting', 'Skill.Raid.Gargoria.Skill3.CastingLoop'], hit: ['Skill.Raid.Gargoria.Skill3.Hit01', 'Skill.Raid.Gargoria.Skill3.Hit02'] },
      fatal: { start: ['Skill.Raid.Gargoria.Skill4.Casting'], hit: ['Skill.Raid.Gargoria.Skill4.Hit'] },
    },
    advent: ['Skill.Raid.Gargoria.Advent'],
  },
};
