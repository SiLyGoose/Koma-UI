import type { BossAssets } from '../types.ts';

/**
 * Tersio, the Deranged Dragon, as King's Raid's Divine Punishment Raid has him (creature 60001, Raid.Punishment.Tersio: its
 * Boss.Tersio model), the first of Apocalypsion's fight: a dragon too great for the field, fought from the bridge before
 * him (Apocalypsion's field: ./apocalypsion.ts has its music and map).
 */
export const TERSIO_ASSETS: BossAssets = {
  name: 'Tersio',
  folder: 'bosses/tersio',
  models: ['Boss_Tersio_Body'],
  // King's Raid's own, each the clip its skill script plays (Raid/Punishment/Tersio.bjs), its blows where the skill's timeline
  // has them: Firstborn his Attack1 (its blow 1.8 s in), Deathly Dragon's Breath Skill3-1 (3.8 s), Overwhelming Annihilation
  // Skill3-2 (its ray 3 to 4.8 s), Death's Door Skill4-1 to 4-3 (its spectral dragons from 2 s). No CC holds him: no fall.
  animations: {
    idle: 'Astand',
    attacks: {
      firstborn: { clips: ['Attack1'], hits: [1.8] },
      breath: { clips: ['Skill3_1'], hits: [3.8] },
      annihilation: { clips: ['Skill3_2'], hits: [3, 3.9, 4.8] },
      door: { clips: ['Skill4_1', 'Skill4_2', 'Skill4_3'], hits: [2, 7] },
    },
  },
  // His raid's music (Raid 1005's BGM: Raid.Apocalypsion.Boss), the whole fight's: Apocalypsion's goes on with it.
  music: { file: 'ApocalypsionBossBGM.mp3', loop: 89.914 },
  // King's Raid's sounds (its BeginFireSkill.<skill>, Hit.Raid.Punishment.Tersio.*, Down and Dead ones): as each of its attacks begins
  // (cut to how long the attack takes here), as its blows land on a hero, as it is knocked down, and as it falls.
  sounds: {
    uses: {
      firstborn: [{ clip: 'Tersio_06', volume: 2.9, at: 0.115, own: true }, { clip: 'Tersio_fx_04', volume: 2.7, at: 1.613 }, { clip: 'Tersio_02', volume: 2.9, at: 1.73, own: true }, { clip: 'Tersio_fx_11', volume: 2.7, at: 3.665 }, { clip: 'Tersio_fx_12', volume: 2.7, at: 4.502 }],
      breath: [{ clip: 'Tersio_05', volume: 2.9, at: 1.634, own: true }, { clip: 'Tersio_fx_06', volume: 2.7, at: 1.7 }, { clip: 'Tersio_fx_07', volume: 2.7, at: 3.221 }, { clip: 'Tersio_08', volume: 2.9, at: 3.255, own: true }, { clip: 'Tersio_fx_08', volume: 2.7, at: 3.685 }, { clip: 'Tersio_fx_12', volume: 2.7, at: 5.669 }],
      annihilation: [{ clip: 'Tersio_04', volume: 2.9, at: 1.634, own: true }, { clip: 'Tersio_fx_11', volume: 2.7, at: 1.766 }, { clip: 'Tersio_03', volume: 2.9, at: 2.968, own: true }, { clip: 'Tersio_fx_09', volume: 2.7, at: 3.101 }, { clip: 'Tersio_fx_12', volume: 2.7, at: 5.512 }],
      door: [{ clip: 'Tersio_fx_11', volume: 2.7, at: 0.247 }, { clip: 'Tersio_03', volume: 2.9, at: 1.495, own: true }, { clip: 'Tersio_fx_10', volume: 2.7, at: 2.234 }],
    },
    hits: {
      firstborn: [{ clip: 'Dmg-shot-01~EFFECT3_Common', volume: 2.5, at: 0.05 }],
      breath: [{ clip: 'Dmg-shot-01~EFFECT3_Common', volume: 2.5, at: 0.05 }],
      annihilation: [{ clip: 'Dmg-shot-01~EFFECT3_Common', volume: 2.5, at: 0.05 }],
      door: [{ clip: 'Dmg-shot-01~EFFECT3_Common', volume: 2.5, at: 0.05 }],
    },
    down: [{ clip: 'Tersio_05', volume: 2.9, at: 0.05, own: true }, { clip: 'Heavy_fall_01', volume: 2.7, at: 0.6 }],
  },
  // What King's Raid has on a hero while one of its skills does (KR-extracted/scripts/tm-boss-vfx.mjs, from its skill script): by the
  // status's name, the effect kept on it (where, from its feet, and how big) and the colour it is drawn in.
  holds: {
    'Hauled Into Hell': { effect: 'Skill.Boss.Tersio.Skill2.Loop' },
  },
  // King's Raid's own effects for it (KR-extracted/scripts/tm-boss-vfx.mjs): each attack's, as it begins, flown from it, and as its blows land on a hero.
  vfx: {
    attacks: {
      firstborn: { start: ['Skill.Boss.Tersio.Attack1'] },
      breath: { start: ['Skill.Boss.Tersio.Skill3-1.Casting'], hit: ['Skill.Boss.Tersio.Skill3-1.Hit', 'Skill.Boss.Tersio.Skill3-1.Loop'] },
      annihilation: { start: ['Skill.Boss.Tersio.Skill3-2.Casting'], later: [{ at: 3, code: 'Skill.Boss.Tersio.Skill3-2.Loop', lasts: 2 }] },
      door: { start: ['Skill.Boss.Tersio.Skill4.Casting'], later: [{ at: 2, code: 'Skill.Boss.Tersio.Skill4.Loop', lasts: 6 }] },
    },
    advent: ['Skill.Boss.Tersio.Advent'],
    kept: [
      { status: 'Lost Self', effects: ['Skill.Boss.Tersio.Skill1', 'Skill.Boss.Tersio.Skill1.EyeL', 'Skill.Boss.Tersio.Skill1.EyeR', 'Skill.Boss.Tersio.Skill1.Body', 'Skill.Boss.Tersio.Skill1.Mouth'] },
    ],
    worn: [{ code: 'BattleFieldMap.WorldBoss.ApocalypsionField.1', at: [7, 0, 0] }],
  },
};
