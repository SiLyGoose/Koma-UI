import { AnimationClip, AnimationMixer, LoopOnce, LoopRepeat, type AnimationAction, type Object3D } from 'three';
import { animationFile, type BossAssets, type KrBossAnimations } from '../assets';
import { fitted, loadKrClip } from '../engine/kr-clips';
import type { Span } from '../sim/motion';

/*
 * A boss moved by King's Raid's own animations for it (its asset file's `animations`): it stands in its idle and plays
 * the game's clip for each of its attacks, fitted to how the fight times the attack (its blows landing when the fight's
 * do); knocked down, it goes down and lies there until it is up again. Slowed, everything it does is. Only its body: what
 * is drawn for its attacks (its venom, its breath) is its model's.
 */

/** How long one clip takes to give way to the next, and an attack to its idle. */
const BLEND = 0.2;
const RETURN = 0.4;
/** Stunned (not knocked down), it goes on in its idle this many times as fast: dazed. */
const DAZED = 0.35;

/** A boss's clips, each attack's fitted to the fight's timing. */
export interface KrBossClips {
  idle: AnimationClip;
  down?: AnimationClip;
  getUp?: AnimationClip;
  leave?: AnimationClip;
  arrive?: AnimationClip;
  attacks: Readonly<Record<string, AnimationClip>>;
}

/** Reads `owner`'s clips that `animations` names, each attack's fitted to `timing` (by the attack's name: one it doesn't time is left out). */
export async function loadKrBossClips(owner: BossAssets, animations: KrBossAnimations, timing: Readonly<Record<string, Span>>): Promise<KrBossClips> {
  const names = new Set([animations.idle, ...[animations.down, animations.getUp, animations.leave, animations.arrive].filter((name): name is string => Boolean(name)), ...Object.values(animations.attacks).flatMap((move) => move.clips)]);
  const read = new Map(await Promise.all([...names].map(async (name) => [name, await loadKrClip(animationFile(owner, name))] as const)));
  const clip = (name: string): AnimationClip => read.get(name) as AnimationClip;
  const attacks: Record<string, AnimationClip> = {};
  for (const [attack, move] of Object.entries(animations.attacks)) {
    const span = timing[attack];
    if (span) attacks[attack] = fitted(move.clips.map(clip), move.hits, span.lands, span.until);
  }
  return {
    idle: clip(animations.idle),
    ...(animations.down && { down: clip(animations.down) }),
    ...(animations.getUp && { getUp: clip(animations.getUp) }),
    ...(animations.leave && { leave: clip(animations.leave) }),
    ...(animations.arrive && { arrive: clip(animations.arrive) }),
    attacks,
  };
}

/** What moves a boss by its clips. */
export interface KrBossMotion {
  /** Begins an attack (cutting short whatever it was doing). */
  use(attack: string): void;
  /** Stunned for so many seconds (or longer, if it already is): what it was doing is cut short; knocked `down`, it lies down meanwhile. */
  daze(seconds: number, down: boolean): void;
  /** Everything it does goes at `rate` of its speed for so many seconds. */
  slow(rate: number, seconds: number): void;
  /** It flies off the field (and stays gone: the page hides it once it is), or lands back on it. Returns how long it takes (seconds). */
  leave(): number;
  arrive(): number;
  update(dt: number): void;
}

/** `models` moved by `clips` (each model by what the clips have for the bones it has). */
export function krBossMotion(models: readonly Object3D[], clips: KrBossClips): KrBossMotion {
  const mixer = new AnimationMixer(models[0] as Object3D);
  const playing = (clip: AnimationClip, once = false): AnimationAction[] =>
    models.map((model) => {
      const action = mixer.clipAction(new AnimationClip(clip.name, clip.duration, clip.tracks.filter((track) => model.getObjectByName(track.name.slice(0, track.name.lastIndexOf('.'))))), model);
      if (once) {
        action.setLoop(LoopOnce, 1);
        action.clampWhenFinished = true;
      } else action.setLoop(LoopRepeat, Infinity);
      return action;
    });
  const idle = playing(clips.idle);
  const down = clips.down ? playing(clips.down, true) : null;
  const getUp = clips.getUp ? playing(clips.getUp, true) : null;
  const leaving = clips.leave ? playing(clips.leave, true) : null;
  const arriving = clips.arrive ? playing(clips.arrive, true) : null;
  const attacks = Object.fromEntries(Object.entries(clips.attacks).map(([name, clip]) => [name, playing(clip, true)]));
  for (const action of idle) action.play();
  let showing = idle;
  const show = (actions: AnimationAction[], fade = BLEND, again = false): void => {
    if (actions === showing && !again) return;
    actions.forEach((action, i) => {
      action.reset().play();
      if (actions !== showing) (showing[i] as AnimationAction).crossFadeTo(action, fade, false);
    });
    showing = actions;
  };

  /** What it is doing besides standing: an attack (how far in, in its own time), lying down, or getting up. */
  let doing: { what: 'attack'; actions: AnimationAction[]; t: number; length: number } | { what: 'down' } | { what: 'up'; t: number } | { what: 'gone' } | null = null;
  let dazed = 0;
  let slowed = { rate: 1, left: 0 };

  return {
    use(attack) {
      const actions = attacks[attack];
      if (!actions) return;
      dazed = 0;
      show(actions, BLEND, true);
      doing = { what: 'attack', actions, t: 0, length: (clips.attacks[attack] as AnimationClip).duration };
    },
    daze(seconds, isDown) {
      dazed = Math.max(dazed, seconds);
      if (isDown && down) {
        if (doing?.what !== 'down') show(down);
        doing = { what: 'down' };
      } else if (doing?.what === 'attack') {
        doing = null;
        show(idle);
      }
    },
    slow(rate, seconds) {
      slowed = { rate, left: seconds };
    },
    leave() {
      dazed = 0;
      if (!leaving || !clips.leave) return 0;
      show(leaving, BLEND, true);
      doing = { what: 'gone' };
      return clips.leave.duration;
    },
    arrive() {
      if (!arriving || !clips.arrive) {
        doing = null;
        show(idle, RETURN);
        return 0;
      }
      show(arriving, BLEND, true);
      doing = { what: 'attack', actions: arriving, t: 0, length: clips.arrive.duration };
      return clips.arrive.duration;
    },
    update(dt) {
      slowed.left = Math.max(0, slowed.left - dt);
      const rate = slowed.left > 0 ? slowed.rate : 1;
      const wasDazed = dazed > 0;
      dazed = Math.max(0, dazed - dt);
      let speed = rate;
      if (doing?.what === 'attack') {
        doing.t += dt * rate;
        if (doing.t >= doing.length) {
          doing = null;
          show(idle, RETURN);
        }
      } else if (doing?.what === 'down') {
        // Lying there until it is up again: then it gets up.
        if (wasDazed && dazed <= 0) {
          if (getUp) {
            show(getUp);
            doing = { what: 'up', t: 0 };
          } else {
            doing = null;
            show(idle, RETURN);
          }
        }
      } else if (doing?.what === 'up') {
        doing.t += dt;
        if (doing.t >= (clips.getUp as AnimationClip).duration) {
          doing = null;
          show(idle, RETURN);
        }
      } else if (dazed > 0) speed = DAZED;
      for (const action of showing) action.timeScale = doing?.what === 'up' || doing?.what === 'down' || doing?.what === 'gone' ? 1 : speed;
      mixer.update(dt);
    },
  };
}
