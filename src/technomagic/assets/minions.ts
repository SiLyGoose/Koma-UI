// Made by KR-extracted/scripts/tm-minion-fx.mjs from King's Raid's CBT2 playtest's tables: don't edit it.
import type { GameSound } from './types.ts';

/*
 * The Dragon Raid's minions' own sounds and effects (../fight/minions.ts plays them), by their kind (../sim/bosses/dragon/minions.ts):
 * as each begins its attack and its skill, as a blow of each lands on a hero, as it is hit, and as it falls (sounds: clips of
 * public/kr/effects/sounds/); and the effects played on it as it begins each, comes onto the field, and falls (codes of
 * public/kr/effects/kr/).
 */
export interface MinionFx {
  sounds: Partial<Record<'attack' | 'skill' | 'hitAttack' | 'hitSkill' | 'hurt' | 'down', GameSound>>;
  vfx: Partial<Record<'attack' | 'skill' | 'down' | 'enter', readonly string[]>>;
}

export const MINION_FX: Readonly<Record<string, MinionFx>> = {
  'hatchling-fire': { sounds: { attack: [{ clip: 'Attack-Woosh-09', volume: 1.8, at: 0.59 }, { clip: 'Attack-Woosh-11', volume: 1.8, at: 0.62 }, { clip: 'Attack-Woosh-13', volume: 1.8, at: 0.62 }], skill: [{ clip: 'Mon-Hatchling_01', volume: 2.2, at: 0.03 }, { clip: 'FX-Hatchling-01', volume: 2.5, at: 0.07 }, { clip: 'Attack-Magic-46', volume: 2.5, at: 2.01 }], hitAttack: [{ clip: 'Attack-Damage-04', volume: 2 }], hitSkill: [{ clip: 'Attack-Damage-02', volume: 2.5 }], hurt: [{ clip: 'FX-Hatchling-01', volume: 2.5, at: 0.01 }, { clip: 'Mon-Hatchling_02', volume: 2.2, at: 0.08 }], down: [{ clip: 'Mon-Hatchling_03', volume: 2.2, at: 0.06 }, { clip: 'FX-Hatchling-01', volume: 2.5, at: 0.15 }, { clip: 'Death-Fall-02', volume: 1.3, at: 0.92 }] }, vfx: { attack: ['Skill.Monster.Hatchling.Fire.Attack1'], skill: ['Skill.Monster.Hatchling.Fire.Skill1'] } },
  'hatchling-ice': { sounds: { attack: [{ clip: 'Attack-Woosh-09', volume: 1.8, at: 0.59 }, { clip: 'Attack-Woosh-11', volume: 1.8, at: 0.62 }, { clip: 'Attack-Woosh-13', volume: 1.8, at: 0.62 }], skill: [{ clip: 'Mon-Hatchling_01', volume: 2.2, at: 0.03 }, { clip: 'FX-Hatchling-01', volume: 2.5, at: 0.07 }, { clip: 'Attack-Magic-46', volume: 2.5, at: 2.01 }], hitAttack: [{ clip: 'Attack-Damage-04', volume: 2 }], hitSkill: [{ clip: 'Attack-Damage-02', volume: 2.5 }], hurt: [{ clip: 'FX-Hatchling-01', volume: 2.5, at: 0.01 }, { clip: 'Mon-Hatchling_02', volume: 2.2, at: 0.08 }], down: [{ clip: 'Mon-Hatchling_03', volume: 2.2, at: 0.06 }, { clip: 'FX-Hatchling-01', volume: 2.5, at: 0.15 }, { clip: 'Death-Fall-02', volume: 1.3, at: 0.92 }] }, vfx: { attack: ['Skill.Monster.Hatchling.Ice.Attack1'], skill: ['Skill.Monster.Hatchling.Ice.Skill1'] } },
  'hatchling-poison': { sounds: { attack: [{ clip: 'Attack-Woosh-09', volume: 1.8, at: 0.59 }, { clip: 'Attack-Woosh-11', volume: 1.8, at: 0.62 }, { clip: 'Attack-Woosh-13', volume: 1.8, at: 0.62 }], skill: [{ clip: 'Mon-Hatchling_01', volume: 2.2, at: 0.03 }, { clip: 'FX-Hatchling-01', volume: 2.5, at: 0.07 }, { clip: 'Attack-Magic-46', volume: 2.5, at: 2.01 }], hitAttack: [{ clip: 'Attack-Damage-04', volume: 2 }], hitSkill: [{ clip: 'Attack-Damage-02', volume: 2.5 }], hurt: [{ clip: 'FX-Hatchling-01', volume: 2.5, at: 0.01 }, { clip: 'Mon-Hatchling_02', volume: 2.2, at: 0.08 }], down: [{ clip: 'Mon-Hatchling_03', volume: 2.2, at: 0.06 }, { clip: 'FX-Hatchling-01', volume: 2.5, at: 0.15 }, { clip: 'Death-Fall-02', volume: 1.3, at: 0.92 }] }, vfx: { attack: ['Skill.Monster.Hatchling.Poison.Attack1'], skill: ['Skill.Monster.Hatchling.Poison.Skill1'] } },
  'ice-pillar': { sounds: {  }, vfx: { down: ['Skill.Raid.Dragon.Ice.IcePillar.Large.Die'], enter: ['Skill.Raid.Dragon.Ice.IcePillar.Large.Casting'] } },
  wyrm: { sounds: { hitAttack: [{ clip: 'Attack-Damage-13', volume: 0.7 }], hitSkill: [{ clip: 'Attack-Damage-13', volume: 0.9 }], hurt: [{ clip: 'Mon-Worm_Damage_01', at: 0.07 }], down: [{ clip: 'Mon-Worm_Dead_01', volume: 0.7, at: 0.08 }, { clip: 'Death-Fall-04', at: 1.42 }] }, vfx: { attack: ['Skill.Monster.GiantWorm.Grass.Attack1'], skill: ['Skill.Monster.GiantWorm.Grass.Skill1'] } },
  wyrmling: { sounds: { hitAttack: [{ clip: 'Attack-Damage-13', volume: 0.7 }], hitSkill: [{ clip: 'Attack-Damage-13', volume: 0.9 }], hurt: [{ clip: 'Mon-Worm_Damage_01', at: 0.07 }], down: [{ clip: 'Mon-Worm_Dead_01', volume: 0.7, at: 0.08 }, { clip: 'Death-Fall-04', at: 1.42 }] }, vfx: { attack: ['Skill.Monster.GiantWorm.Grass.Attack1'], skill: ['Skill.Monster.GiantWorm.Grass.Skill1'] } },
};
