import type { Object3D, Scene } from 'three';
import type { BossFx } from '../../fight/fx';
import type { Boss, BossLook } from '../boss';
import { loadTersio, TERSIO_LOOK } from '../tersio/model';
import { APOCALYPSION_LOOK, loadApocalypsion } from './model';

/*
 * Apocalypsion's fight (the sim's `apocalypsion`: King's Raid's Raid 1005) as the page draws it: Tersio, then at his 1%
 * Apocalypsion in his place (its def's `next`). Both bodies are read before the fight (no hitch as she comes in); the
 * fight's view (../../fight/view.ts) shows the one the sim's boss is, and the field moved on to her arena with her.
 */

/** Tersio's look, Apocalypsion's coming after it. */
export const APOCALYPSION_FIGHT_LOOK: BossLook = { ...TERSIO_LOOK, next: APOCALYPSION_LOOK };

/** Both bodies, Tersio's with hers as its `next`. */
export async function loadApocalypsionFight(scene: Scene, bright: Object3D): Promise<Boss> {
  const [tersio, apocalypsion] = await Promise.all([loadTersio(scene, bright), loadApocalypsion(scene, bright)]);
  tersio.next = apocalypsion;
  return tersio;
}

/**
 * What is drawn for their skills beyond their bodies' own moves: nothing of its own. Each of their attacks plays King's
 * Raid's own effects (their assets' vfx), what Lost Self and her Wrath keep on them is kept by what is on them, and what
 * holds a hero Hauled Into Hell by what is on it.
 */
export const APOCALYPSION_FIGHT_FX: BossFx = {};
