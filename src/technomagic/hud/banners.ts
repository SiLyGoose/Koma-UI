import { Vector3 } from 'three';
import type { Stage } from '../engine/stage';
import { makeKrEffects } from '../fx/kr-effects';

/*
 * King's Raid's own banners over a battle (public/kr/effects/kr/UI.*: KR-extracted/scripts/tm-vfx.mjs): as it starts, as
 * each stage of a raid does, as its boss comes, and as it is finished. Played flat on the screen, in its middle (the
 * stage's overlay), over everything.
 */

export type Banner = 'start' | 'stage1' | 'stage2' | 'stage3' | 'boss' | 'finish';

const CODES: Readonly<Record<Banner, string>> = {
  start: 'UI.Battle.BattleStart',
  stage1: 'UI.Battle.Phase.01',
  stage2: 'UI.Battle.Phase.02',
  stage3: 'UI.Battle.Phase.03',
  boss: 'UI.Battle.BossWave',
  finish: 'UI.Battle.Finish',
};

/** One wanted before it has been read is played once it is, this long after at most (seconds); later, it is let go. */
const WAIT = 3;
/** Moved on in steps no longer than a frame's (seconds), however long it has been: no more of it than the longest lasts. */
const STEP = 0.064;
const LONGEST = 5;

export interface Banners {
  play(banner: Banner): void;
  /** Moved on by `seconds`, as long as they really were (a page hardly drawn has one where it would be by now, or over). */
  update(seconds: number): void;
}

export function makeBanners(stage: Stage): Banners {
  const kr = makeKrEffects(stage.overlay.scene, stage.overlay.camera);
  // (Read now: each is wanted the moment it is played.)
  kr.read(Object.values(CODES));
  /** The one wanted that hasn't been read yet, and how much longer it is waited for. */
  let waiting: { code: string; left: number } | null = null;
  const show = (code: string): void => {
    kr.play(code, { at: new Vector3() });
  };
  return {
    play(banner) {
      const code = CODES[banner];
      if (kr.ready(code)) {
        waiting = null;
        show(code);
      } else waiting = { code, left: WAIT };
    },
    update(seconds) {
      for (let left = Math.min(seconds, LONGEST); left > 0; left -= STEP) {
        const dt = Math.min(left, STEP);
        if (waiting) {
          waiting.left -= dt;
          if (kr.ready(waiting.code)) show(waiting.code);
          if (kr.ready(waiting.code) || waiting.left <= 0) waiting = null;
        }
        kr.update(dt);
      }
    },
  };
}
