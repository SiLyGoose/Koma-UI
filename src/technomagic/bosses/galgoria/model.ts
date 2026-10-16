import { Group, Vector3, type Object3D, type Scene } from 'three';
import { GALGORIA_ASSETS, modelFolder } from '../../assets';
import { loadModels, materialsOf } from '../../engine/models';
import { Rig } from '../../engine/rig';
import { poseAt } from '../../engine/track';
import { HEADS, MOVES, PLANS, type Attack, type Head } from '../../sim/bosses/galgoria/attacks';
import type { Boss, BossLook } from '../boss';
import { STILL, TRACKS, type Pose } from './tracks';
import { makeVenom } from './venom';

/*
 * Galgoria on the field: a chimera of three heads, each on a neck of six bones, with a tail behind. Its
 * file has no animation, so it is moved here: at rest the heads weave and the tail, curled round to its
 * front, sways; a head's move is a short track of where it is from moment to moment (pulled back, then
 * thrust out at the heroes with its jaw wide, spraying its venom (./venom.ts), and back). Each of its
 * skills is some of its heads' moves, one after another (../../sim/bosses/galgoria/attacks.ts, as long as that has each
 * take: ./tracks.ts). It is only drawn: when it attacks, is stunned or slowed, and what comes of each blow, is the fight's
 * sim's (../../sim/bosses/galgoria/).
 *
 * In the model's own axes z is ahead of it, y up and x to its left (where its L head is).
 */

/** Hit: white for this long, and shaken. */
const FLINCH = 0.22;

/** How far a head's reach carries to each bone of its neck, from its base (1) to under the head (6). */
const carried = (bone: number): number => (bone / 7) ** 1.6;
/** How far to the side a side head rests, to bring it in over the middle. */
const SIDE = 2.9;
const JAW = 0.55;
/** How far each bone of its tail is turned to bring it round to its front, on the side the heroes see. */
const CURL = -0.5;
/** The bone its body leans in from: the middle of its spine. */
const WAIST = 'Bone_Spine02';
/**
 * How it holds itself: a snake standing up. Its body is one column, nearly upright, in a shallow S: a
 * little back through its chest (`back`, shared between the bones of its spine), then its necks easing
 * forward toward the top (`ahead`, `up`, `nod`: where its heads end up from where they rest, each bone
 * of a neck taking its share by how high it is, so nothing bends at one place), bowed back by `bow` halfway up.
 */
const STAND = { back: -0.14, ahead: 1.5, up: -0.45, nod: 0.46, bow: 0.55 };
/** The bone above its waist, which shares its lean. */
const CHEST = 'Bone_Spine03';

/**
 * Its files, and where it stands: right of the middle, a hero that fights hand to hand not far in front of it, as in
 * the game (the left of the field is for those who fight from further off).
 */
export const GALGORIA_LOOK: BossLook = {
  assets: GALGORIA_ASSETS,
  stands: { x: 7, turn: -1.1 },
  reach: { hit: [-2.2, 3.4, 3], feet: [-1, 0, 0.6] },
  skills: ['destroyer', 'swamp', 'explosion', 'fatal'],
};

export async function loadGalgoria(scene: Scene, bright: Object3D): Promise<Boss> {
  const models = await loadModels(GALGORIA_ASSETS.models.map((model) => modelFolder(GALGORIA_ASSETS, model)));
  const rig = new Rig(models);
  const root = new Group();
  // The models sit in a group of their own, that shakes when it is hit.
  const body = new Group();
  body.add(...models);
  root.add(body);

  // Where its waist is, and each bone of its necks and each head above it, as it stands.
  const waist = rig.at(WAIST);
  const above = new Map<string, Vector3>();
  for (const head of HEADS) {
    for (let bone = 1; bone <= 6; bone++) above.set(`Bone_${head}_Neck0${bone}`, rig.at(`Bone_${head}_Neck0${bone}`));
    above.set(`Point_${head}_Head`, rig.at(`Point_${head}_Head`));
  }
  /** What each head is doing, and will do after it: a move of a skill (its name), and which of the skill's moves it is. */
  const going = new Map<Head, { kind: Attack; skill: string; part: number; t: number; hit: boolean }[]>();
  const materials = materialsOf(models);
  let flinch = 0;
  /** How long it is stunned for yet, how low its heads are to hang (0 to 1) and how low they hang now; and how its attacks are slowed. */
  let dazed = 0;
  let low = 0;
  let droop = 0;
  let slowed = { rate: 1, left: 0 };
  const mouth = new Vector3();
  const aim = new Vector3();
  // (Its venom is drawn as light: kept bright when the field goes dark.)
  const venom = makeVenom(bright);
  const splashed = new Vector3();
  /** Begins a skill, as the fight has it begin: whatever its heads were at is cut short. */
  const use = (skill: string): void => {
    const plan = PLANS[skill] ?? [];
    dazed = 0;
    low = 0;
    for (const [, head] of plan) going.delete(head);
    plan.forEach(([kind, head, after], part) => {
      const moves = going.get(head) ?? [];
      moves.push({ kind, skill, part, t: -after, hit: false });
      going.set(head, moves);
    });
  };

  const boss: Boss = {
    root,
    use,
    target: (into) => into,
    daze(seconds, down = false) {
      going.clear();
      dazed = Math.max(dazed, seconds);
      low = down ? 1 : Math.max(low, 0.55);
    },
    slow(rate, seconds) {
      slowed = { rate, left: seconds };
    },
    hit() {
      flinch = FLINCH;
    },
    update(now, dt) {
      rig.reset();
      let lean = 0;
      // Stunned: its heads sink (and come up again after), as far as `low` says.
      dazed = Math.max(0, dazed - dt);
      if (dazed <= 0) low = 0;
      droop += (low - droop) * Math.min(1, dt * 7);
      slowed.left = Math.max(0, slowed.left - dt);
      const rate = slowed.left > 0 ? slowed.rate : 1;
      HEADS.forEach((head, i) => {
        // At rest: each head weaves on its own, out of step with the others.
        const beat = now + i * 2.1;
        const pose: Pose = {
          ...STILL,
          ahead: Math.sin(beat * 0.9) * 0.16,
          up: Math.sin(beat * 1.3) * 0.2,
          nod: Math.sin(beat * 1.3 + 1) * 0.05,
          jaw: 0.1 + Math.sin(beat * 0.7) * 0.06,
        };
        let sway = Math.sin(beat * 0.7) * 0.14;
        pose.up -= droop * (1.4 + i * 0.3);
        pose.ahead += droop * 0.5;
        pose.nod += droop * 0.5;
        pose.jaw += droop * 0.25;

        const moves = going.get(head);
        const doing = moves?.[0];
        if (moves && doing) {
          doing.t += dt * rate;
          const move = MOVES[doing.kind];
          const at = poseAt(TRACKS[doing.kind].keys, Math.max(0, doing.t), STILL);
          for (const part of Object.keys(pose) as (keyof Pose)[]) pose[part] += at[part];
          sway += Math.sin(now * 46) * 0.07 * at.shake;
          if (move.hit !== null && !doing.hit && doing.t >= move.hit) {
            // It lands: its venom splashes where its target is (or, come down into the swamp, where its mouth is).
            doing.hit = true;
            if (doing.kind === 'spit') venom.splash(boss.target(aim));
            if (doing.kind === 'slam') venom.splash((models[0] as Object3D).localToWorld(splashed.copy(rig.at(`Bone_${head}_Tongue02`))).setY(0.2));
          }
          if (doing.t >= move.length) {
            moves.shift();
            if (moves.length === 0) going.delete(head);
          }
        }
        lean = Math.max(lean, pose.lean);

        // A side head comes in over the middle as it strikes.
        const side = head === 'L' ? 1 : head === 'R' ? -1 : 0;
        const across = sway - side * SIDE * pose.inward;
        for (let bone = 1; bone <= 6; bone++) {
          const k = carried(bone);
          // How it stands, by how high the bone is: an even curve, from nothing at the neck's foot.
          const high = bone / 7;
          // Bowed back a little through the middle of the neck, before it comes forward at the top: the S.
          const bowed = STAND.ahead * high * high - STAND.bow * Math.sin(Math.PI * high);
          rig.shift(`Bone_${head}_Neck0${bone}`, across * k, pose.up * k + STAND.up * high * high, pose.ahead * k + bowed);
          rig.turnIn(`Bone_${head}_Neck0${bone}`, pose.nod * k + STAND.nod * high, 0, 0);
        }
        rig.shift(`Point_${head}_Head`, across, pose.up + STAND.up, pose.ahead + STAND.ahead);
        rig.turnIn(`Point_${head}_Head`, pose.nod + STAND.nod, 0, 0);
        rig.turn(`Bone_${head}_Mouth`, 0, 0, pose.jaw * JAW);
      });

      // The tail is curled round to its front, and sways, a wave running down it.
      for (let bone = 1; bone <= 5; bone++) rig.turnAbout(`Bone_Tail0${bone}`, 0, CURL, 0);
      for (let bone = 1; bone <= 5; bone++) rig.turn(`Bone_Tail0${bone}`, 0, Math.sin(now * 1.1 - bone * 0.6) * 0.07, 0);
      // It leans in from its middle, not its feet: its chest tips forward there and its necks and heads
      // go with it, each as far as it stands above that; what is below (its coils, its tail) stays on the floor.
      // (Leaning back as it always does, less whatever it leans in to attack.)
      lean += STAND.back;
      rig.turnAbout(WAIST, lean / 2, 0, 0);
      rig.turnAbout(CHEST, lean / 2, 0, 0);
      const sin = Math.sin(lean);
      const cos = Math.cos(lean);
      for (const [name, stands] of above) {
        const up = stands.y - waist.y;
        const out = stands.z - waist.z;
        rig.shift(name, 0, up * cos - out * sin - up, up * sin + out * cos - out);
        rig.turnIn(name, lean, 0, 0);
      }

      // Its venom, from each mouth that is spraying at whoever it is fighting, now the heads are where they will be drawn.
      for (const [head, [doing]] of going) {
        const spray = doing && TRACKS[doing.kind].spray;
        if (doing && spray && doing.t >= spray[0] && doing.t <= spray[1]) venom.spray((models[0] as Object3D).localToWorld(mouth.copy(rig.at(`Bone_${head}_Tongue02`))), boss.target(aim), dt);
      }
      venom.update(dt);

      flinch = Math.max(0, flinch - dt);
      const k = flinch / FLINCH;
      body.position.x = Math.sin(now * 70) * 0.12 * k;
      // Brighter than its picture: it shows as a white shape of itself.
      for (const material of materials) material.color.setScalar(1 + k * 5);
    },
  };
  return boss;
}
