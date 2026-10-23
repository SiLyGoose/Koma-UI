import type { BossFx } from '../../fight/fx';

/*
 * What is drawn for what Galgoria's skills do (./skills.ts), beyond its body's own moves (./model.ts): nothing of its own.
 * Each of its attacks plays King's Raid's own effects (its assets' vfx), and the hero it shuts away in the swamp has the
 * game's own kept on it while it is (its assets' wards).
 */

export const GALGORIA_FX: BossFx = {};
