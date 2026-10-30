import type { BossAssets } from '../types.ts';

/** Every 0.3 seconds from 2.7 in, the twenty blows of Divine Storm of Blades' little swords (the game's timeline). */
const BLADES = Array.from({ length: 20 }, (_, i) => Math.round((2.7 + i * 0.3) * 10) / 10);

/** Siegfried, as King's Raid's raid has him (its Corrupted Siegfried: Monster.SiegFried.Corrupted): one body, and his sword, held in his right hand. */
export const SIEGFRIED_ASSETS: BossAssets = {
  name: 'Siegfried',
  folder: 'bosses/siegfried',
  models: ['Monster_Siegfried_Corrupted_Mesh', 'Monster_Siegfried_Corrupted_Weapon'],
  // King's Raid's own (its blows as the game's timelines have them). His basic attack is the same swing in each of his
  // lives, its sword's light bigger each time; Divine Storm of Blades' is in three: his sword raised, held up while the
  // little swords fall (its loop, three times over), and the divine sword brought down.
  animations: {
    idle: 'Astand',
    down: 'Getup_Down',
    getUp: 'Getup_Getup',
    attacks: {
      slash: { clips: ['Attack1'], hits: [0.4, 0.8, 1.8] },
      slash2: { clips: ['Attack1'], hits: [0.4, 0.8, 1.8] },
      slash3: { clips: ['Attack1'], hits: [0.4, 0.8, 1.8] },
      strike: { clips: ['Skill1'], hits: [1.4, 2.4] },
      storm: { clips: ['Skill3_1', 'Skill3_2', 'Skill3_2', 'Skill3_2', 'Skill3_3'], hits: [...BLADES, 9.8] },
      rise: { clips: ['Skill2'], hits: [1.2] },
    },
  },
  // The music every stage of his raid plays (Battle.Chapter10.Battle1_Loop), as Galgoria's does.
  music: { file: 'HildaBattleBGM.mp3', loop: 123.693 },
  // King's Raid's sounds (its BeginFireSkill.<skill>, Hit.Monster.SiegFried.Corrupted.*, Down and Dead ones): as each of its attacks begins
  // (cut to how long the attack takes here), as its blows land on a hero, as it is knocked down, and as it falls.
  sounds: {
    uses: {
      slash: [{ clip: 'Swd-02', volume: 2.7, at: 0.324 }, { clip: 'Swd-03', volume: 2.7, at: 0.725 }, { clip: 'Swd-02', volume: 2.7, at: 1.607 }],
      slash2: [{ clip: 'Swd-02', volume: 2.7, at: 0.324 }, { clip: 'Swd-03', volume: 2.7, at: 0.725 }, { clip: 'Swd-02', volume: 2.7, at: 1.607 }],
      slash3: [{ clip: 'Swd-02', volume: 2.7, at: 0.324 }, { clip: 'Swd-03', volume: 2.7, at: 0.725 }, { clip: 'Swd-02', volume: 2.7, at: 1.607 }],
      strike: [{ clip: 'Cast-05', volume: 2.7, at: 0.23 }, { clip: 'BossSiegfried-Vox_Skill4', volume: 4, at: 0.63, own: true }, { clip: 'Impact-02', volume: 2.7, at: 1.269 }, { clip: 'Swd-stab-01', volume: 2.7, at: 2.234 }, { clip: 'Impact-01', volume: 2.7, at: 2.234 }],
      storm: [{ clip: 'BossSiegfried-Vox_Skill1', volume: 4, at: 0.017, own: true }, { clip: 'Cast-05', volume: 2.7, at: 0.153 }, { clip: 'Cast-06', volume: 2.7, at: 0.813 }, { clip: 'Magic-swd-04', volume: 2.7, at: 2.418 }, { clip: 'Swd_thunder_01', volume: 2.7, at: 2.635 }, { clip: 'Swd-01', volume: 2.7, at: 9.446 }, { clip: 'Sword-Hit-fx-01', volume: 2.7, at: 9.867 }],
      rise: [{ clip: 'Magic-02', volume: 2.6, at: 0.152 }, { clip: 'BossSiegfried-Vox_Skill2', volume: 4, at: 0.819, own: true }, { clip: 'Exp_01', volume: 2.6, at: 0.951 }],
    },
    hits: {
      strike: [{ clip: 'Dmg-swd-01', volume: 1.5, at: 0.02 }],
      storm: [{ clip: 'Attack-Damage-03', volume: 1.5, at: 0.02 }],
    },
    down: [{ clip: 'Siegfried-Vox_Damage_03', volume: 2.8, at: 0.01, own: true }, { clip: 'Texture-04', volume: 2.5, at: 0.01 }, { clip: 'Texture-07', volume: 2.5, at: 0.733 }],
    dead: [{ clip: 'Siegfried-Vox_Damage_03', volume: 2.8, at: 0.01, own: true }, { clip: 'Texture-04', volume: 2.5, at: 0.01 }, { clip: 'Swd-stab-01', volume: 1.8, at: 0.733 }, { clip: 'Texture-08', volume: 2.5, at: 1 }, { clip: 'Texture-07', volume: 2.5, at: 2.067 }],
  },
  // King's Raid's own effects for it (KR-extracted/scripts/tm-boss-vfx.mjs): each attack's, as it begins, flown from it, and as its blows land on a hero.
  vfx: {
    attacks: {
      slash: { start: ['Skill.Raid.Siegfried.Attack1.Casting'] },
      slash2: { start: ['Skill.Raid.Siegfried.Attack2.Casting'] },
      slash3: { start: ['Skill.Raid.Siegfried.Attack3.Casting'] },
      strike: { start: ['Skill.Raid.Siegfried.Skill1.Casting'] },
      storm: { start: ['Skill.Raid.Siegfried.Skill3.Casting'], later: [{ at: 2.7, code: 'Skill.Raid.Siegfried.Skill3.Loop', lasts: 6 }, { at: 8.7, code: 'Skill.Raid.Siegfried.Skill3.End' }] },
      rise: { start: ['Skill.Raid.Siegfried.Skill2.Casting'] },
    },
    kept: [
      { status: 'Divine Power', effects: ['Skill.Raid.Siegfried.Skill2.WeaponBuff1'] },
      { status: 'Divine Power', count: 2, effects: ['Skill.Raid.Siegfried.Skill2.WeaponBuff2'] },
    ],
  },
};
