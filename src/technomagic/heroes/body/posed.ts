import { AnimationClip, AnimationMixer, LoopOnce, type AnimationAction, type Object3D, type Vector3 } from 'three';
import type { Rig } from '../../engine/rig';
import { lengthOf } from '../../engine/track';
import { flowing, MOVES, type HeroMove } from '../moves';
import { ENTER, holdShield, RED, redden, type Hero, type Stood } from './hero';
import { REST, STILL, TURN, type Bends, type Pose } from './pose';
import { poseBody, poseLoose } from './posing';
import type { Played } from './rigged';
import { BIPED } from './skeletons';

/*
 * A hero of the game's own files moved by the poses written in code: it stands at rest and breathes, its
 * hair, tail and ears moving with it; it runs in; and its attack, being hit and its skills are tracks of
 * poses (../moves/). Its attack or a skill it is given animations for (made over for its skeleton: ./animated.ts)
 * is played by those instead, one after another, eased in from how it stands and back out to it. Given an idle, it
 * stands in that (looping) rather than at rest, whenever it isn't running in or doing anything: eased out of it as
 * a move begins, and back into it after. Varied, how it stands wanders as it stands there: never quite the same twice.
 */

/** Running in: how many strides a second; and in its run, given one, how many times as fast that is played. */
const STRIDES = 2.9;
const RUN_RATE = 1.25;
/** Seated on what floats under it: how far it bobs up and down (as the field measures it), and how fast. */
const BOB = { high: 0.05, rate: 1.6 };
/** What floats beside one that doesn't sit on it: how far it hovers up and down (in its model's own lengths), and how fast. */
const HOVER = { high: 0.05, rate: 2.2 };
/** How long a skill's animation takes to come in over how it stands, and to give way back to it when it is left. */
const INTO = 0.14;
const RETURN = 0.45;
/** One of its animations giving way to the next. */
const BLEND = 0.18;
/**
 * Varied, as it stands: how far its chest turns, leans and tips and its head looks round and nods (radians), and
 * its hips sway (in its model's lengths), each eased to a mark picked at random and held there for `hold` seconds
 * (between the two); and how fast its idle is played, wandering between the two of `rate`.
 */
const VARY = { twist: 0.14, lean: 0.05, tip: 0.05, look: 0.3, nod: 0.08, sway: 0.012, rate: [0.86, 1.1], hold: [1.2, 4] } as const;

/** A move it is given animations for: played one after another, so many times as fast. */
export interface Own {
  parts: readonly Played[];
  speed: number;
}

/**
 * How else it is moved: `seated` on what floats under it, it glides in on it, bobbing, rather than running. Its knees
 * and elbows bend as `bends` has them (./posing.ts). With an `idle` (made over for its skeleton), it stands in that.
 * With a `run`, it runs in in that (over its stride written in code), the blade in its right hand pointing along
 * `bladeRunning` (a way in its model's axes), if that is given. `varied`, how it stands wanders (VARY).
 */
export interface Posing {
  seated?: boolean;
  bends?: Bends;
  idle?: AnimationClip;
  run?: AnimationClip;
  bladeRunning?: Vector3;
  varied?: boolean;
}

/** A value that wanders: eased to a mark picked at random within `most` of 0 (either way), held a while, then another. */
function wandering(most: number): (dt: number) => number {
  let at = (Math.random() * 2 - 1) * most;
  let to = at;
  let speed = 0;
  let wait = 0;
  return (dt) => {
    wait -= dt;
    if (wait <= 0) {
      to = (Math.random() * 2 - 1) * most;
      wait = VARY.hold[0] + Math.random() * (VARY.hold[1] - VARY.hold[0]);
    }
    // As a spring would take it there, slowing to a stop (in a second or so).
    const k = 2.4;
    speed += (k * k * (to - at) - 2 * k * speed) * dt;
    at += speed * dt;
    return at;
  };
}

/**
 * A hero moved by poses written in code: it stands `rest` (a swordsman's, unless its hero has a stance of its own), and its moves are added to that;
 * but for those it has animations for (`own`, by their move's name). And as `posing` has it.
 */
export function posedHero({ root, body, middle, models, rig, hips, feet, blade, shield, materials, floating }: Stood, rest: Pose = REST, own: Readonly<Record<string, Own>> = {}, posing: Posing = {}): Hero {
  const { seated = false, bends = {}, idle, run, bladeRunning, varied = false } = posing;
  // Each animation plays on each of its models at once, each with what the animation has for the bones it has.
  const mixer = new AnimationMixer(root);
  type Part = Played & { actions: AnimationAction[] };
  const animated: Partial<Record<string, { parts: Part[]; speed: number }>> = Object.fromEntries(
    Object.entries(own).map(([move, { parts, speed }]) => [
      move,
      {
        speed,
        parts: parts.map((part) => ({
          ...part,
          actions: models.map((model: Object3D) => {
            const { clip } = part;
            const action = mixer.clipAction(new AnimationClip(clip.name, clip.duration, clip.tracks.filter((track) => model.getObjectByName(track.name.slice(0, track.name.lastIndexOf('.'))))), model);
            action.setLoop(LoopOnce, 1);
            action.clampWhenFinished = true;
            return action;
          }),
        })),
      },
    ]),
  );
  /**
   * A move played by its animations: which, which of them it is in and how far in (in the animation's own time), how
   * long since it was left (null: it hasn't been), and how its last animation left it as this one began (and how long ago).
   */
  let playing: { own: { parts: Part[]; speed: number }; part: number; t: number; left: number | null; from: { kept: ReturnType<Rig['keep']>; t: number } | null } | null = null;
  const stopPlaying = (): void => {
    for (const action of playing?.own.parts[playing.part]?.actions ?? []) action.stop();
    playing = null;
  };
  // Varied: what wanders (how fast its idle is played among it, and from how far into it it starts).
  const wander = varied ? { twist: wandering(VARY.twist), lean: wandering(VARY.lean), tip: wandering(VARY.tip), look: wandering(VARY.look), nod: wandering(VARY.nod), sway: wandering(VARY.sway), rate: wandering((VARY.rate[1] - VARY.rate[0]) / 2) } : null;
  // How the poses written in code have it, this frame: what an animation is eased in from and out to.
  const posed = rig.keep();
  // Its idle, on a mixer of its own (so a skill's animation is never mixed with it): how far into it, and how much of it shows (0 to 1).
  const idling = idle && new AnimationMixer(root);
  const idleActions = idling
    ? models.map((model: Object3D) => {
        const action = idling.clipAction(new AnimationClip(idle.name, idle.duration, idle.tracks.filter((track) => model.getObjectByName(track.name.slice(0, track.name.lastIndexOf('.'))))), model);
        action.play();
        return action;
      })
    : [];
  let idleT = wander && idle ? Math.random() * idle.duration : 0;
  let standing = 1;
  // Its run, the same way: how far into it, and how much of it shows (as much as its stride written in code does).
  const runMixer = run && new AnimationMixer(root);
  const runActions = runMixer
    ? models.map((model: Object3D) => {
        const action = runMixer.clipAction(new AnimationClip(run.name, run.duration, run.tracks.filter((track) => model.getObjectByName(track.name.slice(0, track.name.lastIndexOf('.'))))), model);
        action.play();
        return action;
      })
    : [];
  let runT = 0;
  let striding = 0;

  let red = 0;
  let doing: { name: HeroMove | 'hit'; t: number } | null = null;
  let was = 0;
  let rush = 0;
  /** How long it has been running in (null: it isn't). */
  let running: number | null = null;

  const hero: Hero = {
    root,
    enter() {
      doing = null;
      stopPlaying();
      running = 0;
      runT = 0;
    },
    start(move) {
      running = null;
      stopPlaying();
      const own = animated[move];
      if (own?.parts[0]) {
        doing = null;
        playing = { own, part: 0, t: 0, left: null, from: null };
        for (const action of own.parts[0].actions) action.reset().play();
      } else doing = { name: move, t: 0 };
    },
    head: (into) => (models[0] as Object3D).localToWorld(into.copy(rig.at(BIPED.head))),
    leftHand: (into) => (models[0] as Object3D).localToWorld(into.copy(rig.at(BIPED.arms.L[2]))),
    ...(floating && { floater: (into: Vector3) => floating.model.getWorldPosition(into) }),
    place: (into) => body.getWorldPosition(into),
    hit() {
      red = RED;
    },
    stagger() {
      if (running !== null) return;
      red = RED;
      stopPlaying();
      doing = { name: 'hit', t: 0 };
    },
    fall() {
      running = null;
      stopPlaying();
      doing = null;
    },
    update(now, dt) {
      let moved = STILL;
      if (doing) {
        doing.t += dt;
        const move = MOVES[doing.name];
        moved = flowing(move, doing.t);
        if (doing.t >= lengthOf(move.keys)) doing = null;
      }

      // At rest, what it is doing, and being alive: breathing, its weight easing on and off its leg, its loose hand swinging a little.
      const breath = Math.sin(now * 2);
      const pose = { ...rest };
      for (const part of Object.keys(pose) as (keyof Pose)[]) pose[part] += moved[part];
      // It stays where it stands, whatever the move has it go: only running in takes it along the field. (But what one
      // seated rides carries it where its move has it go, and back.)
      if (!seated) pose.ahead = 0;
      pose.hipY += breath * 0.01;
      pose.hipX += Math.sin(now * 0.6) * 0.008;
      pose.lean += breath * 0.012;
      pose.twist += Math.sin(now * 0.7 + 1) * 0.025;
      pose.nod += Math.sin(now * 2 - 0.8) * 0.015;
      pose.lhY += Math.sin(now * 2 - 0.6) * 0.008;
      pose.lhZ += Math.sin(now * 1.1) * 0.018;
      pose.rhY += Math.sin(now * 2 - 1.1) * 0.008;
      pose.bTurn += Math.sin(now * 0.9) * 0.04;
      // Varied: what wanders goes on wandering whatever it does (its weight shifted from leg to leg here), though it shows only as it stands.
      const step = Math.min(dt, 0.1);
      const wandered = wander && { twist: wander.twist(step), lean: wander.lean(step), tip: wander.tip(step), look: wander.look(step), nod: wander.nod(step), sway: wander.sway(step), rate: wander.rate(step) };
      if (wandered) pose.hipX += wandered.sway * standing;

      // Seated, gliding in: only carried along the field, easing to a stop as it arrives.
      if (running !== null && seated) {
        running += dt;
        const k = Math.min(1, running / ENTER.time);
        pose.ahead += ENTER.from * (1 - k) ** 1.6;
        pose.lean -= 0.12 * (1 - k);
        if (k >= 1) running = null;
      }
      // Running in: leaning into it, its legs striding and its blade trailing behind, easing into standing as it arrives.
      if (running !== null) {
        running += dt;
        const k = Math.min(1, running / ENTER.time);
        const still = k < 0.8 ? 0 : (k - 0.8) / 0.2;
        const w = 1 - still * still * (3 - 2 * still);
        const stride = running * STRIDES * TURN;
        pose.ahead += ENTER.from * (1 - k) ** 1.6;
        pose.hipX -= rest.hipX * w;
        pose.tilt -= rest.tilt * w;
        // Long strides: each foot far out ahead, then far behind and kicked up as it comes through.
        pose.lean += 0.52 * w;
        pose.hipY += (-0.1 + Math.abs(Math.sin(stride)) * 0.05) * w;
        pose.hipZ += 0.06 * w;
        pose.lfZ += Math.sin(stride) * 0.46 * w;
        pose.rfZ -= Math.sin(stride) * 0.46 * w;
        pose.lfY += (Math.max(0, Math.cos(stride)) * 0.26 + Math.max(0, -Math.sin(stride)) * 0.1) * w;
        pose.rfY += (Math.max(0, -Math.cos(stride)) * 0.26 + Math.max(0, Math.sin(stride)) * 0.1) * w;
        pose.lfTip += Math.max(0, -Math.sin(stride)) * 0.8 * w;
        pose.rfTip += Math.max(0, Math.sin(stride)) * 0.8 * w;
        pose.twist += Math.sin(stride) * 0.12 * w;
        pose.lhZ += (-0.26 - Math.sin(stride) * 0.06) * w;
        pose.lhY += 0.12 * w;
        pose.rhZ += (-0.2 + Math.sin(stride) * 0.04) * w;
        pose.rhY += 0.06 * w;
        // The blade low behind it, pointing back.
        pose.bTurn += (3.4 - rest.bTurn) * w;
        pose.bUp += (-0.3 - rest.bUp) * w;
        striding = w;
        if (k >= 1) running = null;
      } else striding = 0;

      poseBody(rig, BIPED, pose, hips, feet, blade, bends);
      // How fast it is moving along the field, smoothed: its hair and tail trail behind.
      rush += ((pose.ahead - was) / Math.max(dt, 0.001) - rush) * Math.min(1, dt * 10);
      was = pose.ahead;
      poseLoose(rig, now, Math.max(-0.6, Math.min(0.6, rush * 0.06)));

      // Running in in its run, over its stride written in code (as much of it as that shows), its blade held as it has it.
      if (runMixer && run && striding > 0) {
        runT = (runT + dt * RUN_RATE) % run.duration;
        rig.keep(posed);
        for (const action of runActions) action.time = runT;
        runMixer.update(0);
        if (bladeRunning) rig.point(BIPED.arms.R[2], blade, bladeRunning);
        rig.blend(posed, 1 - striding);
      }

      // Standing in its idle while it does nothing else: eased out of it quickly as a move begins, and back into it slowly after.
      // (Under a move played by its animations it goes on standing in it: they are eased in from it, and back out to it.)
      const still = !doing && running === null;
      standing = still ? Math.min(1, standing + dt / RETURN) : Math.max(0, standing - dt / INTO);
      if (idling && idle) {
        idleT = (idleT + dt * (wandered ? (VARY.rate[0] + VARY.rate[1]) / 2 + wandered.rate : 1)) % idle.duration;
        if (standing > 0) {
          rig.keep(posed);
          for (const action of idleActions) action.time = idleT;
          idling.update(0);
          rig.blend(posed, 1 - standing * standing * (3 - 2 * standing));
        }
      }
      // Varied: its chest and head turned as what wanders has them, as it stands.
      if (wandered && standing > 0) {
        const k = standing * standing * (3 - 2 * standing);
        for (const bone of BIPED.chest) rig.turnAbout(bone, (wandered.lean * k) / 2, (wandered.twist * k) / 2, (wandered.tip * k) / 2);
        rig.turnAbout(BIPED.head, wandered.nod * k, wandered.look * k, 0);
      }

      // A move played by its animations, over how it stands: eased in as it starts, each giving way to the next, held where it is left, and eased out from there.
      if (playing) {
        let part = playing.own.parts[playing.part] as Part;
        /** It as the animation it is in has it, `t` into it. */
        const pose = (t: number): void => {
          for (const action of part.actions) action.time = Math.min(t, part.until);
          mixer.update(0);
        };
        if (playing.left === null) {
          playing.t += dt * playing.own.speed;
          const next = playing.own.parts[playing.part + 1];
          if (playing.t >= part.until && next) {
            // On to the next, from how this one leaves it.
            rig.keep(posed);
            pose(part.until);
            playing.from = { kept: rig.keep(playing.from?.kept), t: 0 };
            rig.blend(posed, 1);
            for (const action of part.actions) action.stop();
            playing.part++;
            playing.t = 0;
            part = next;
            for (const action of part.actions) action.reset().play();
          } else if (playing.t >= part.until) playing.left = 0;
        } else playing.left += dt;
        const shown = playing.left === null ? (playing.part === 0 ? Math.min(1, playing.t / INTO) : 1) : 1 - playing.left / RETURN;
        if (shown <= 0) stopPlaying();
        else {
          rig.keep(posed);
          pose(playing.t);
          if (playing.from && playing.from.t < BLEND) {
            playing.from.t += dt;
            const k = Math.min(1, playing.from.t / BLEND);
            rig.blend(playing.from.kept, 1 - k * k * (3 - 2 * k));
          }
          rig.blend(posed, 1 - shown * shown * (3 - 2 * shown));
        }
      }
      holdShield(rig, shield);

      body.position.z = pose.ahead;
      body.position.y = Math.max(0, pose.jump) + (seated ? BOB.high * (1 + Math.sin(now * BOB.rate)) : 0);
      // What floats beside it (not under it), hovering up and down.
      if (floating && !seated) floating.model.position.set(floating.at.x, floating.at.y + HOVER.high * Math.sin(now * HOVER.rate), floating.at.z);
      // What it sits on: its pieces spread apart (down and out from its top, so it stays on it), and it tipped back, front up, with it on it (about the back of its underside).
      body.rotation.x = 0;
      if (floating) {
        const apart = 1 + pose.spread;
        for (const { bone, rest: at } of floating.pieces) bone.position.copy(at).sub(floating.top).multiplyScalar(apart).add(floating.top);
        const k = body.scale.x;
        const c = Math.cos(-pose.rock);
        const s = Math.sin(-pose.rock);
        const y = floating.pivot.y * k;
        const z = floating.pivot.z * k;
        body.rotation.x = -pose.rock;
        body.position.y += y - (y * c - z * s);
        body.position.z += z - (y * s + z * c);
      }
      middle.rotation.set(pose.flip, pose.roll, 0);
      body.rotation.y = pose.spin;
      red = Math.max(0, red - dt);
      redden(materials, red);
    },
  };
  return hero;
}
