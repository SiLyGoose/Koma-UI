import { hasLevels } from '../shared/items';
import type { HeroCopy } from '../shared/heroes';

/**
 * What the forge does, picked from its menu: refine a copy (a hero's gear: awaken it), or, to a hero's gear, reroll one of
 * its substats (King's Raid's options), enhance one (its amount rolled again), or reroll its effect (TechnoMagic gear's additional skill).
 */
export type ForgeMode = 'refine' | 'reroll' | 'enhance' | 'effects';

/** The menu's buttons, in order: each mode's name, what it does, and its anvil's button. */
export const FORGE_MODES: readonly { id: ForgeMode; name: string; about: string; go: string }[] = [
  { id: 'refine', name: 'Refine Gear', about: 'Raise a piece a star, using up a spare copy of it.', go: 'Refine Gear' },
  { id: 'reroll', name: 'Reroll Substats', about: 'Roll one of a hero gear piece’s substats again.', go: 'Reroll Substat' },
  { id: 'enhance', name: 'Enhance Substats', about: 'Roll one of its substats’ amounts again, anywhere in its range.', go: 'Enhance Substat' },
  { id: 'effects', name: 'Reroll Effects', about: 'Roll a TechnoMagic piece’s additional effect again.', go: 'Reroll Effect' },
];

/** Whether the forge can do `mode` to a hero's gear copy (as the heroes page has it): the bot's prices say what it can be done for. */
export function heroCan(copy: HeroCopy, mode: ForgeMode): boolean {
  switch (mode) {
    case 'refine':
      return hasLevels(copy) && copy.level < copy.maxLevel;
    case 'reroll':
      return copy.options.length > 0 && copy.reroll !== null;
    case 'enhance':
      return copy.upgrade !== null;
    case 'effects':
      return copy.rerollUnique !== null;
  }
}
