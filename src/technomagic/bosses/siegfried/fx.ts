import type { BossFx } from '../../fight/fx';

/*
 * What is drawn for what Siegfried's skills do (../../sim/bosses/siegfried/skills.ts), beyond his body's own moves
 * (./model.ts): nothing of its own. Each of his attacks plays King's Raid's own effects (his assets' vfx), and what his
 * sword keeps on after he rises is kept by what is on him (their `kept`); a shield his blow breaks, and skills his storm
 * seals, show as the heroes' statuses do.
 */

export const SIEGFRIED_FX: BossFx = {};
