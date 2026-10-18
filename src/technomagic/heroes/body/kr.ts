import { AnimationClip, AnimationMixer, LoopOnce, LoopRepeat, type AnimationAction, type Object3D } from 'three';
import { animationFile, type HeroAssets, type KrAnimations, type KrMove } from '../../assets';
import { fitted, inPlace, loadKrClip, topOf } from '../../engine/kr-clips';
import type { Motion, Timeline } from '../../sim/motion';
import type { HeroMove } from '../moves';
import { ENTER, heightOf, RED, redden, runOf, type Hero, type Stood } from './hero';
import { BIPED } from './skeletons';

/*
 * A hero of the game's own files moved by King's Raid's own animations for it (its skin's `animations`): it stands in
 * its idle, runs in in its run, and plays the game's clip for each of its moves, fitted to how the fight times it
 * (../../sim/motion.ts: its blows land when the fight's do). Staggered, it plays its being hurt; a move with no clip
 * of the game's for it is stood through in its idle. The clips stay where it stands: what they walk is taken out.
 */

/** How long one clip takes to give way to the next, and the end of a move to its idle. */
const BLEND = 0.15;
const RETURN = 0.3;

/**
 * A hero's clips, each move's fitted to the fight's timing: its takes (played in turn, each time it is begun), each a
 * clip for each of the move's parts.
 */
export interface KrClips {
  idle: AnimationClip;
  run: AnimationClip;
  hurt?: AnimationClip;
  /** How it ends (as the game has them, not fitted to anything): its victory and the pose it holds after, its loss, its fall. */
  ends: { victory?: AnimationClip; victoryIdle?: AnimationClip; lose?: AnimationClip; dead?: AnimationClip };
  moves: Partial<Record<HeroMove, AnimationClip[][]>>;
}

/**
 * `clip` with what it doesn't move of `idle`'s held as `idle` begins (the game's own clips leave a bone they don't move
 * as it was: three.js would put it back as the model was bound).
 */
function filled(clip: AnimationClip, idle: AnimationClip): AnimationClip {
  const moved = new Set(clip.tracks.map((track) => track.name));
  for (const track of idle.tracks) {
    if (moved.has(track.name)) continue;
    const size = track.getValueSize();
    const held = track.clone();
    held.times = Float32Array.from([0]);
    held.values = track.values.slice(0, size);
    clip.tracks.push(held);
  }
  return clip;
}

/** Reads `owner`'s clips that `animations` names, each move's fitted to how `motion` times it. */
export async function loadKrClips(owner: HeroAssets, animations: KrAnimations, motion: Motion): Promise<KrClips> {
  const endNames = { victory: animations.victory, victoryIdle: animations.victoryIdle, lose: animations.lose, dead: animations.dead };
  const names = new Set([animations.idle, animations.run, ...(animations.hurt ? [animations.hurt] : []), ...Object.values(endNames).filter((name): name is string => Boolean(name)), ...[...(animations.attack ?? []), ...Object.values(animations.skills ?? {})].flatMap((move) => move.clips)]);
  const read = new Map(await Promise.all([...names].map(async (name) => [name, await loadKrClip(animationFile(owner, name))] as const)));
  const clip = (name: string): AnimationClip => read.get(name) as AnimationClip;
  const idle = inPlace(clip(animations.idle));
  const fit = (move: KrMove, timeline: Timeline, part: number): AnimationClip | null => {
    const span = timeline.parts[part];
    return span ? filled(inPlace(fitted(move.clips.map(clip), move.hits, span.lands, span.until)), idle) : null;
  };
  const moves: KrClips['moves'] = {};
  // Its attack, whatever its move's name: the fight having it in one part of one blow, each of the game's chain is a take
  // of its own (the next one each time it attacks); otherwise the chain is shared out among its parts (each one after
  // another; more of the game's in one part, its blows from where each begins; fewer, round again), all of it in one
  // part of several blows.
  const chain = animations.attack ?? [];
  const timeline = motion.moves[motion.attack];
  if (chain.length > 0) {
    const count = timeline.parts.length;
    if (count === 1 && (timeline.parts[0]?.lands.length ?? 0) <= 1) {
      const takes = chain.map((move) => fit(move, timeline, 0));
      if (takes.every((take) => take !== null)) moves[motion.attack] = (takes as AnimationClip[]).map((take) => [take]);
    } else {
      const shares = Array.from({ length: count }, (_, i) => (chain.length >= count ? chain.slice(Math.floor((i * chain.length) / count), Math.floor(((i + 1) * chain.length) / count)) : [chain[i % chain.length] as KrMove]));
      const parts = shares.map((share, i) => {
        let at = 0;
        const hits: number[] = [];
        for (const move of share) {
          hits.push(...move.hits.map((hit) => at + hit));
          at += move.clips.reduce((sum, name) => sum + clip(name).duration, 0);
        }
        return fit({ clips: share.flatMap((move) => move.clips), hits }, timeline, i);
      });
      if (parts.every((part) => part !== null)) moves[motion.attack] = [parts as AnimationClip[]];
    }
  }
  for (const [move, kr] of Object.entries(animations.skills ?? {})) {
    const timeline = motion.moves[move as HeroMove];
    const one = timeline && fit(kr, timeline, 0);
    if (one) moves[move as HeroMove] = [[one]];
  }
  const hit = motion.moves.hit.parts[0];
  const ends: KrClips['ends'] = {};
  for (const [end, name] of Object.entries(endNames)) if (name) ends[end as keyof KrClips['ends']] = filled(inPlace(clip(name)), idle);
  return {
    idle,
    ends,
    run: filled(inPlace(clip(animations.run)), idle),
    ...(animations.hurt && hit && { hurt: filled(inPlace(fitted([clip(animations.hurt)], [], [], hit.until)), idle) }),
    moves,
  };
}

/** A hero of the game's own files moved by its clips (`motion`: how the fight times its moves), but for the marks `still` (left in its hands). */
export function krHero({ root, body, models: parts, rig, materials, floating }: Stood, clips: KrClips, motion: Motion, still: readonly string[] = []): Hero {
  // What hangs straight from it in the game's files, beside its skeleton, is moved there by its clips: what it holds
  // (Point_Dummy, in whichever hand it was put) and the marks of its hands. Here too it hangs from its skeleton's root
  // (the file's own, not the model's group), in its first model, whose clip moves it.
  const every = [clips.idle, clips.run, ...(clips.hurt ? [clips.hurt] : []), ...Object.values(clips.moves).flat(2), ...Object.values(clips.ends)];
  // What floats by it, where the clips move it too (Gremory's cube, its pieces coming apart and back): hung where its body's
  // file is, as the game has it, and moved with it.
  const models = [...parts];
  const first = parts[0];
  const moved = (model: Object3D): boolean => every.some((clip) => clip.tracks.some((track) => !/^Bip001/.test(track.name) && model.getObjectByName(track.name.slice(0, track.name.lastIndexOf('.')))));
  if (floating && first?.parent && moved(floating.model)) {
    first.parent.add(floating.model);
    floating.model.position.copy(first.position);
    floating.model.quaternion.copy(first.quaternion);
    floating.model.scale.copy(first.scale);
    models.push(floating.model);
  }
  const from = models[0]?.getObjectByName(BIPED.hips)?.parent;
  if (from)
    for (const name of new Set(every.flatMap(topOf))) {
      // (Only marks and what is held on them: a bone a clip lists there is its skeleton's own, where it is.)
      const node = /^Point_|Dummy/.test(name) && !still.includes(name) ? root.getObjectByName(name) : undefined;
      // (Never what it hangs from itself, nor anything that does.)
      let inside = false;
      from.traverseAncestors((above) => (inside ||= above === node));
      if (node && node !== from && !inside && node.parent !== from) from.attach(node);
    }

  // A clip plays on each of its models at once, each with what the clip has for the bones it has.
  const mixer = new AnimationMixer(root);
  const playing = (clip: AnimationClip, once = false): AnimationAction[] =>
    models.map((model: Object3D) => {
      const action = mixer.clipAction(new AnimationClip(clip.name, clip.duration, clip.tracks.filter((track) => {
        const node = track.name.slice(0, track.name.lastIndexOf('.'));
        return !still.includes(node) && model.getObjectByName(node);
      })), model);
      if (once) {
        action.setLoop(LoopOnce, 1);
        action.clampWhenFinished = true;
      } else action.setLoop(LoopRepeat, Infinity);
      return action;
    });
  const idle = playing(clips.idle);
  const run = playing(clips.run);
  const hurt = clips.hurt ? playing(clips.hurt, true) : null;
  // How it ends: each once and held at its end, but the pose after its victory, held as it goes on.
  const { victory, victoryIdle, lose, dead } = clips.ends;
  const ends = {
    victory: victory ? playing(victory, true) : null,
    victoryIdle: victoryIdle ? playing(victoryIdle) : null,
    lose: lose ? playing(lose, true) : null,
    dead: dead ? playing(dead, true) : null,
  };
  /** Plays one of how it ends (its clip's length), then holds `then` (null: its own end). */
  const ending = (actions: AnimationAction[] | null, clip: AnimationClip | undefined, then: AnimationAction[] | null = null): void => {
    doing = actions && clip ? { what: 'end', actions, t: 0, length: clip.duration, then } : null;
    again = true;
  };
  const moves = Object.fromEntries(Object.entries(clips.moves).map(([move, takes]) => [move, takes.map((parts) => parts.map((part) => playing(part, true)))])) as Partial<Record<HeroMove, AnimationAction[][][]>>;
  /** How many times each move has been begun: its takes are played in turn. */
  const begun = new Map<HeroMove, number>();
  for (const action of idle) action.play();
  let showing = idle;
  /** A move begun again while its clip still shows: played from its start. */
  let again = false;
  const show = (actions: AnimationAction[], speed = 1, fade = BLEND): void => {
    for (const action of actions) action.timeScale = speed;
    if (actions === showing) {
      if (again) for (const action of actions) action.reset().play();
      again = false;
      return;
    }
    again = false;
    actions.forEach((action, i) => {
      action.reset().play();
      (showing[i] as AnimationAction).crossFadeTo(action, fade, false);
    });
    showing = actions;
  };

  let red = 0;
  /** What it is doing besides standing: running in, a move (which part of it, and how far in: in the fight's time for it), or being hurt. */
  let doing:
    | { what: 'enter'; t: number }
    | { what: 'move'; move: HeroMove; parts: AnimationAction[][]; part: number; t: number }
    | { what: 'hurt'; t: number }
    | { what: 'end'; actions: AnimationAction[]; t: number; length: number; then: AnimationAction[] | null }
    | { what: 'held' }
    | null = null;
  let runIn = ENTER;
  let returning = false;

  return {
    root,
    enter(lasts) {
      runIn = runOf(lasts);
      doing = { what: 'enter', t: 0 };
    },
    start(move) {
      const takes = moves[move];
      const n = begun.get(move) ?? 0;
      begun.set(move, n + 1);
      const parts = takes?.[n % takes.length];
      doing = parts ? { what: 'move', move, parts, part: 0, t: 0 } : null;
      again = true;
    },
    head: (into) => (models[0] as Object3D).localToWorld(into.copy(rig.at(BIPED.head))),
    place: (into) => body.getWorldPosition(into),
    height: () => heightOf(root, models),
    leftHand: (into) => (models[0] as Object3D).localToWorld(into.copy(rig.at(BIPED.arms.L[2]))),
    rightHand: (into) => (models[0] as Object3D).localToWorld(into.copy(rig.at(BIPED.arms.R[2]))),
    hit() {
      red = RED;
    },
    stagger() {
      if (doing?.what === 'enter') return;
      red = RED;
      doing = hurt ? { what: 'hurt', t: 0 } : null;
      again = true;
    },
    fall() {
      ending(ends.dead, dead);
    },
    falls: Boolean(dead),
    pose(end) {
      if (end === 'victory') ending(ends.victory, victory, ends.victoryIdle);
      else ending(ends.lose, lose);
    },
    update(_now, dt) {
      let ahead = 0;
      if (doing?.what === 'move') {
        const timeline = motion.moves[doing.move];
        const { parts } = doing;
        const span = timeline.parts[doing.part];
        doing.t += dt * timeline.speed;
        show(parts[doing.part] as AnimationAction[], timeline.speed);
        if (!span || doing.t >= span.until) {
          doing = doing.part + 1 < parts.length ? { ...doing, part: doing.part + 1, t: 0 } : null;
          if (!doing) returning = true;
        }
      } else if (doing?.what === 'hurt' && hurt) {
        doing.t += dt;
        show(hurt);
        if (doing.t >= (clips.hurt as AnimationClip).duration) {
          doing = null;
          returning = true;
        }
      } else if (doing?.what === 'end') {
        doing.t += dt;
        show(doing.actions);
        if (doing.t >= doing.length) {
          if (doing.then) show(doing.then);
          doing = { what: 'held' };
        }
      } else if (doing?.what === 'held') {
        // (Held as it ended: its last frame, or the pose after it going on.)
      } else if (doing?.what === 'enter') {
        doing.t += dt;
        const k = Math.min(1, doing.t / runIn.time);
        ahead = runIn.from * (1 - k) ** 1.6;
        show(k < 0.86 ? run : idle, 1.25);
        if (k >= 1) doing = null;
      } else {
        show(idle, 1, returning ? RETURN : BLEND);
        returning = false;
      }
      mixer.update(dt);
      body.position.z = ahead;
      red = Math.max(0, red - dt);
      redden(materials, red);
    },
  };
}
