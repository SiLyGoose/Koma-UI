import { AnimationClip, AnimationMixer, LoopOnce, type AnimationAction, type Object3D } from 'three';
import { lengthOf } from '../../engine/track';
import { SKILL_SPEED } from '../../sim/motion';
import { flowing, MOVES, type HeroMove } from '../moves';
import { ENTER, holdShield, RED, redden, type Hero, type Stood } from './hero';
import { REST, STILL, TURN, type Pose } from './pose';
import { poseBody, poseLoose } from './posing';
import type { Played } from './rigged';
import { BIPED } from './skeletons';

/*
 * A hero of the game's own files moved by the poses written in code: it stands at rest and breathes, its
 * hair, tail and ears moving with it; it runs in; and its attack, being hit and its skills are tracks of
 * poses (../moves/). A skill it is given an animation for (made over for its skeleton: ./animated.ts) is
 * played by that instead, eased in from how it stands and back out to it.
 */

/** Running in: how many strides a second. */
const STRIDES = 2.9;
/** How long a skill's animation takes to come in over how it stands, and to give way back to it when it is left. */
const INTO = 0.14;
const RETURN = 0.45;

/** A hero moved by poses written in code: it stands `rest` (a swordsman's, unless its hero has a stance of its own), and its moves are added to that; but for the skills it has animations for (`skills`, by their move's name). */
export function posedHero({ root, body, middle, models, rig, hips, feet, blade, shield, materials }: Stood, rest: Pose = REST, skills: Readonly<Record<string, Played>> = {}): Hero {
  // Each skill's animation plays on each of its models at once, each with what the animation has for the bones it has.
  const mixer = new AnimationMixer(root);
  const animated: Partial<Record<string, Played & { actions: AnimationAction[] }>> = Object.fromEntries(
    Object.entries(skills).map(([move, skill]) => [
      move,
      {
        ...skill,
        actions: models.map((model: Object3D) => {
          const { clip } = skill;
          const action = mixer.clipAction(new AnimationClip(clip.name, clip.duration, clip.tracks.filter((track) => model.getObjectByName(track.name.slice(0, track.name.lastIndexOf('.'))))), model);
          action.setLoop(LoopOnce, 1);
          action.clampWhenFinished = true;
          return action;
        }),
      },
    ]),
  );
  /** A skill played by its animation: which, how far in (in the animation's own time), and how long since it was left (null: it hasn't been). */
  let playing: { own: Played & { actions: AnimationAction[] }; t: number; left: number | null } | null = null;
  const stopPlaying = (): void => {
    for (const action of playing?.own.actions ?? []) action.stop();
    playing = null;
  };
  // How the poses written in code have it, this frame: what an animation is eased in from and out to.
  const posed = rig.keep();

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
    },
    start(move) {
      running = null;
      stopPlaying();
      const own = animated[move];
      if (own) {
        doing = null;
        playing = { own, t: 0, left: null };
        for (const action of own.actions) action.reset().play();
      } else doing = { name: move, t: 0 };
    },
    head: (into) => (models[0] as Object3D).localToWorld(into.copy(rig.at(BIPED.head))),
    leftHand: (into) => (models[0] as Object3D).localToWorld(into.copy(rig.at(BIPED.arms.L[2]))),
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
      // It stays where it stands, whatever the move has it go: only running in takes it along the field.
      pose.ahead = 0;
      pose.hipY += breath * 0.01;
      pose.hipX += Math.sin(now * 0.6) * 0.008;
      pose.lean += breath * 0.012;
      pose.twist += Math.sin(now * 0.7 + 1) * 0.025;
      pose.nod += Math.sin(now * 2 - 0.8) * 0.015;
      pose.lhY += Math.sin(now * 2 - 0.6) * 0.008;
      pose.lhZ += Math.sin(now * 1.1) * 0.018;
      pose.rhY += Math.sin(now * 2 - 1.1) * 0.008;
      pose.bTurn += Math.sin(now * 0.9) * 0.04;

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
        if (k >= 1) running = null;
      }

      poseBody(rig, BIPED, pose, hips, feet, blade);
      // How fast it is moving along the field, smoothed: its hair and tail trail behind.
      rush += ((pose.ahead - was) / Math.max(dt, 0.001) - rush) * Math.min(1, dt * 10);
      was = pose.ahead;
      poseLoose(rig, now, Math.max(-0.6, Math.min(0.6, rush * 0.06)));

      // A skill played by its animation, over how it stands: eased in as it starts, held where it is left, and eased out from there.
      if (playing) {
        if (playing.left === null) {
          playing.t += dt * SKILL_SPEED;
          if (playing.t >= playing.own.until) playing.left = 0;
        } else playing.left += dt;
        const shown = playing.left === null ? Math.min(1, playing.t / INTO) : 1 - playing.left / RETURN;
        if (shown <= 0) stopPlaying();
        else {
          rig.keep(posed);
          for (const action of playing.own.actions) action.time = Math.min(playing.t, playing.own.until);
          mixer.update(0);
          rig.blend(posed, 1 - shown * shown * (3 - 2 * shown));
        }
      }
      holdShield(rig, shield);

      body.position.z = pose.ahead;
      body.position.y = Math.max(0, pose.jump);
      middle.rotation.x = pose.flip;
      body.rotation.y = pose.spin;
      red = Math.max(0, red - dt);
      redden(materials, red);
    },
  };
  return hero;
}
