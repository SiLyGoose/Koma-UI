import { AnimationClip, AnimationMixer, LoopOnce, LoopRepeat, type AnimationAction, type Object3D } from 'three';
import { retargeter } from '../../engine/retarget';
import { lengthOf } from '../../engine/track';
import { flowing, MOVES, type HeroMove } from '../moves';
import { ENTER, holdShield, RED, redden, type Hero, type Stood } from './hero';
import { OWN_SPEED, SKILL_SPEED } from '../../sim/motion';
import { posedHero } from './posed';
import { REST, type Pose } from './pose';
import { poseBody, poseLoose } from './posing';
import type { Animations, Rigged } from './rigged';
import { BIPED, BIPED_FROM_MIXAMO, MIXAMO, type Skeleton } from './skeletons';

/*
 * A hero moved by animations: it stands in its idle and runs in in its run. Its attack is its own when
 * it has one: it plays its attack's animations one after another, where it stands (what they walk is
 * taken out of them: ./rigged.ts); and so is a skill it has an animation for. Its other skills and being
 * hit (and its attack, with none of its own) are the moves written in code (../moves/), on its skeleton. While one of those goes on its animations
 * stand aside, and the two are eased into each other at its start and its end.
 *
 * A skin's animations are its hero's too: a skin of the game's own files, which have none, is moved by
 * them (heroLike), made over for its skeleton (../../engine/retarget.ts).
 */

/** How long one animation takes to give way to another, and an animation to a move written in code, and that back to it. */
const BLEND = 0.18;
const INTO = 0.14;
const OUT_OF = 0.32;
/**
 * How long it takes to ease back to its idle after its own attack, or a skill of its own (slower than one
 * animation giving way to another: drawing its weapon back, not snapping to it). How fast those are played
 * is the fight's (../../sim/motion.ts).
 */
const RETURN = 0.45;

/** Animations with an idle and a run: what stands a hero by them. */
type Standing = Animations & { idle: AnimationClip; run: AnimationClip };

/** The hero that comes with its animations. */
export function riggedHero({ stood, animations }: Rigged): Hero {
  const { idle, run } = animations;
  if (!idle || !run) throw new Error('A skin that comes with its animations has no idle or run');
  return animatedHero(stood, MIXAMO, { ...animations, idle, run });
}

/**
 * A hero of the game's own files moved as `like` is: by its animations, made over for the game's skeleton.
 * Both stand as they were bound: before either has been moved. With no idle or run among them (a rig read
 * only for some of its skills) it is posed in code (standing `rest`), but for those skills; with an idle and no
 * run, the same, but standing in its idle.
 */
export function heroLike(stood: Stood, like: Rigged, rest?: Pose): Hero {
  const mine = retargeter(like.space, stood.models, BIPED_FROM_MIXAMO);
  const { idle, run, attack, skills } = like.animations;
  const made = Object.fromEntries(Object.entries(skills).map(([move, skill]) => [move, { ...skill, clip: mine(skill.clip) }]));
  if (!idle || !run) return posedHero(stood, rest, made, false, {}, idle && mine(idle));
  return animatedHero(stood, BIPED, {
    idle: mine(idle),
    run: mine(run),
    attack: attack.map((part) => ({ ...part, clip: mine(part.clip) })),
    skills: made,
  });
}

/** A hero moved by animations of its skeleton's own (`bones` says which of its bones are which), and by the moves written in code. */
function animatedHero({ root, body, middle, models, rig, hips, feet, blade, shield, materials }: Stood, bones: Skeleton, animations: Standing): Hero {
  // An animation plays on each of its models at once, each with what the animation has for the bones it has.
  const mixer = new AnimationMixer(root);
  const playing = (clip: AnimationClip, once = false): AnimationAction[] =>
    models.map((model: Object3D) => {
      const action = mixer.clipAction(new AnimationClip(clip.name, clip.duration, clip.tracks.filter((track) => model.getObjectByName(track.name.slice(0, track.name.lastIndexOf('.'))))), model);
      if (once) {
        action.setLoop(LoopOnce, 1);
        action.clampWhenFinished = true;
      } else action.setLoop(LoopRepeat, Infinity);
      return action;
    });
  const idle = playing(animations.idle);
  const run = playing(animations.run);
  for (const action of idle) action.play();
  const own = animations.attack.map((part) => ({ ...part, action: playing(part.clip, true) }));
  const skills: Partial<Record<string, typeof own>> = Object.fromEntries(Object.entries(animations.skills).map(([move, skill]) => [move, [{ ...skill, action: playing(skill.clip, true) }]]));
  let showing = idle;
  const show = (actions: AnimationAction[], speed = 1, fade = BLEND): void => {
    for (const action of actions) action.timeScale = speed;
    if (actions === showing) return;
    actions.forEach((action, i) => {
      action.reset().play();
      (showing[i] as AnimationAction).crossFadeTo(action, fade, false);
    });
    showing = actions;
  };
  /** Its own attack has just ended: it eases back to its idle the slower way. */
  let returning = false;

  let red = 0;
  /** What it is doing besides standing: running in, or a move written in code. */
  let doing:
    | { what: 'enter'; t: number }
    | { what: HeroMove | 'hit'; t: number }
    // Its own attack, or a skill of its own: which of its animations it is in, and how far in (in the animation's own time).
    | { what: 'own'; move: HeroMove; parts: typeof own; part: number; t: number }
    | null = null;
  // How its animations have it, kept while a move written in code has it otherwise.
  const animated = rig.keep();

  const hero: Hero = {
    root,
    enter() {
      doing = { what: 'enter', t: 0 };
    },
    start(move) {
      // (Unless it is in a move written in code already: then its bones aren't as its animations have them.)
      if (!doing || doing.what === 'own' || doing.what === 'enter') rig.keep(animated);
      const parts = move === 'attack' ? own : (skills[move] ?? []);
      doing = parts.length > 0 ? { what: 'own', move, parts, part: 0, t: 0 } : { what: move, t: 0 };
    },
    head: (into) => (models[0] as Object3D).localToWorld(into.copy(rig.at(bones.head))),
    leftHand: (into) => (models[0] as Object3D).localToWorld(into.copy(rig.at(bones.arms.L[2]))),
    place: (into) => body.getWorldPosition(into),
    hit() {
      red = RED;
    },
    stagger() {
      if (doing?.what === 'enter') return;
      red = RED;
      // Unless it is in a move written in code already: then its bones aren't as its animations have them.
      if (!doing || doing.what === 'own') rig.keep(animated);
      doing = { what: 'hit', t: 0 };
    },
    fall() {
      // Cut short in a move written in code: back as its animations last had it, for its idle to take on from there.
      if (doing && doing.what !== 'own' && doing.what !== 'enter') rig.blend(animated, 1);
      doing = null;
    },
    update(now, dt) {
      let ahead = 0;
      let jump = 0;
      let flip = 0;
      let spin = 0;
      if (doing?.what === 'own') {
        // Its own attack, or a skill of its own, where it stands.
        const attacking = doing.move === 'attack';
        const speed = attacking ? OWN_SPEED : SKILL_SPEED;
        doing.t += dt * speed;
        const part = doing.parts[doing.part] as (typeof own)[number];
        show(part.action, speed);
        mixer.update(dt);
        if (doing.t >= part.until) {
          doing = doing.part + 1 < doing.parts.length ? { ...doing, part: doing.part + 1, t: 0 } : null;
          if (!doing) returning = true;
        }
      } else if (doing && doing.what !== 'enter') {
        // A move written in code, on this skeleton.
        doing.t += dt;
        const move = MOVES[doing.what];
        const length = lengthOf(move.keys);
        const moved = flowing(move, doing.t);
        const pose: Pose = { ...REST };
        for (const part of Object.keys(pose) as (keyof Pose)[]) pose[part] += moved[part];
        // It stays where it stands, whatever the move has it go.
        ({ jump, flip, spin } = pose);

        // How much of its own animation shows: all of it as the move starts and as it ends, none between.
        const mine = Math.max(1 - doing.t / INTO, 1 - (length - doing.t) / OUT_OF, 0);
        show(idle);
        if (mine > 0) {
          // Back as its animations last had it first: an animation only moves the bones it has changing.
          rig.blend(animated, 1);
          mixer.update(dt);
          rig.keep(animated);
        }
        poseBody(rig, bones, pose, hips, feet, blade);
        poseLoose(rig, now, 0);
        if (mine > 0) rig.blend(animated, Math.min(1, mine) ** 2 * (3 - 2 * Math.min(1, mine)));
        if (doing.t >= length) doing = null;
      } else {
        if (doing) {
          // Running in.
          doing.t += dt;
          const k = Math.min(1, doing.t / ENTER.time);
          ahead = ENTER.from * (1 - k) ** 1.6;
          show(k < 0.86 ? run : idle, 1.25);
          if (k >= 1) doing = null;
        } else {
          show(idle, 1, returning ? RETURN : BLEND);
          returning = false;
        }
        mixer.update(dt);
      }

      // Its shield, if it has one, faces ahead whatever its arm is doing.
      holdShield(rig, shield);

      body.position.z = ahead;
      body.position.y = Math.max(0, jump);
      middle.rotation.x = flip;
      body.rotation.y = spin;
      red = Math.max(0, red - dt);
      redden(materials, red);
    },
  };
  return hero;
}
