import { Box3, Group, Vector3, type Object3D, type Scene } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { modelFolder, type BossAssets } from '../../assets';
import { loadModels, materialsOf } from '../../engine/models';
import { Rig } from '../../engine/rig';
import { poseAt } from '../../engine/track';
import type { Plan } from '../../sim/bosses/boss';
import { MOVES, type DragonMove } from '../../sim/bosses/dragon/moves';
import type { Boss } from '../boss';
import { makeBreath } from './breath';
import { STILL, TRACKS, type Pose } from './tracks';

/*
 * A dragon on the field: King's Raid's four dragons are one body on one skeleton (a biped's bones, on all fours, with
 * wings and a tail), so one body does for all of them, in each one's own skin. Its file has no animation, so it is moved
 * here: at rest it breathes, its wings stir and its tail sways; each of its moves is a short track (./tracks.ts) of how
 * it stands from moment to moment, timed to the fight's (../../sim/bosses/dragon/moves.ts). Its breath (./breath.ts)
 * pours from its mouth as its track says. Knocked down, it lies on the floor till it gets up. It is only drawn: when it attacks, is knocked down or slowed, and what comes of
 * each blow, is the fight's sim's (../../sim/bosses/<dragon>/).
 *
 * In the model's own axes z is ahead of it, y up and x to its left. Each turn is made about those (Rig.turnAbout), whatever
 * way its bones lie.
 */

/** Hit: white for this long, and shaken. */
const FLINCH = 0.22;
const JAW = 0.6;
const NECK = ['Bip001_Neck', 'Bip001_Neck1', 'Bip001_Neck2'];
const TAIL = ['Bone_Tail01', 'Bone_Tail02', 'Bone_Tail03', 'Bone_Tail04'];
/** Where the breath leaves it: its tongue, at the front of its mouth. */
const MOUTH = 'Bone_Tongue02';
/** How far each of a breath's blows has it turned (toward its left, then right), so it sweeps the field as it breathes. */
const SWEEP = [0.35, 0.12, -0.12, -0.35];
/** Its forelegs (upper, fore and claw), by side. */
const ARMS = {
  R: ['Bip001_R_UpperArm', 'Bip001_R_Forearm', 'Bip001_R_Hand'],
  L: ['Bip001_L_UpperArm', 'Bip001_L_Forearm', 'Bip001_L_Hand'],
} as const;
/**
 * A foreclaw's swipe, an arc about its shoulder: how far out along it the claw is (of the leg's length), and its way out
 * from the start of the swipe to the end (radians round from ahead toward its own side, and up).
 */
const SWIPE = { reach: 0.92, round: [1.3, -0.55] as const, up: [0.9, -0.6] as const };
/**
 * Knocked down (its CC gauge broken): it lies on the floor, sunk so far (of its height) and slumped onto its side, its neck
 * flat and its head turned to rest, its wings drooped and folded back, its tail still; it takes so long to go down, and
 * to get up again.
 */
const LIE = { sink: 0.22, down: 0.45, up: 0.9 };
/** Scalaxia's pillars of ice: how many, where (along the field and toward the camera), how long they take to rise and to sink, and how long they stand. */
const PILLARS = { at: [-9, -6.5, -4, -1.5, 1] as const, depth: [1.5, -1, 2.5, 0, 1.8] as const, rise: 0.5, sink: 0.7, stand: 4.2, size: 1.05 };

/** A dragon's look: its files, its attacks' moves (its sim's plans), and its breath's colours (where it is hottest, and as it fades). */
export interface DragonBody {
  assets: BossAssets;
  plans: Readonly<Record<string, Plan>>;
  breath: { core: number; edge: number };
}

export async function loadDragon(body: DragonBody, scene: Scene, bright: Object3D): Promise<Boss> {
  const [dragon, pillar] = await loadModels(body.assets.models.map((model) => modelFolder(body.assets, model)));
  if (!dragon) throw new Error(`${body.assets.name} has no model`);
  const rig = new Rig([dragon]);
  const root = new Group();
  // The model sits in a group of its own, that shakes when it is hit, turns and goes up into the air.
  const shell = new Group();
  shell.add(dragon);
  root.add(shell);
  const materials = materialsOf([dragon]);
  /** Each foreleg's length, from its shoulder to its claw, as it stands at rest. */
  const legOf = ([upper, lower, end]: readonly [string, string, string]): number => rig.at(upper).distanceTo(rig.at(lower)) + rig.at(lower).distanceTo(rig.at(end));
  const legs = { R: legOf(ARMS.R), L: legOf(ARMS.L) };
  const breath = makeBreath(bright, body.breath.core, body.breath.edge);
  /** How far it sinks, lying down. */
  const sink = new Box3().setFromObject(dragon).getSize(new Vector3()).y * LIE.sink;

  /** What it is doing, and will do after: a move of an attack (its name), which of the attack's moves it is, and how far into it. */
  const going: { move: DragonMove; part: number; t: number; hit: boolean }[] = [];
  let flinch = 0;
  /** How long it is stunned for yet, how low it is to sink (0 to 1) and how low it is now; and how its moves are slowed. */
  let dazed = 0;
  let low = 0;
  let sunk = 0;
  /** How long it is knocked down for yet, and how far down it is (0 standing, to 1 lying on the floor). */
  let downed = 0;
  let lying = 0;
  let slowed = { rate: 1, left: 0 };
  /** Its pillars of ice, standing (Scalaxia's): each one's body, and how long it has stood. */
  const pillars: { body: Object3D; age: number }[] = [];
  const mouth = new Vector3();
  const aim = new Vector3();
  const across = new Vector3();
  const goal = new Vector3();
  const bend = new Vector3();
  const out = new Vector3();

  /** A foreclaw taken `paw` of the way (0 to 1) from where it stands to `rake` along its swipe (-1 to 1), its elbow out to its side. */
  function swipe(side: 'R' | 'L', paw: number, rake: number): void {
    if (paw <= 1e-3) return;
    const [upper, lower, end] = ARMS[side];
    const shoulder = rig.at(upper);
    const k = (Math.min(1, Math.max(-1, rake)) + 1) / 2;
    const round = SWIPE.round[0] + (SWIPE.round[1] - SWIPE.round[0]) * k;
    const up = SWIPE.up[0] + (SWIPE.up[1] - SWIPE.up[0]) * k;
    // (Its own side: its right is less than 0 in x.)
    const own = side === 'R' ? -1 : 1;
    goal.set(own * Math.sin(round) * Math.cos(up), Math.sin(up), Math.cos(round) * Math.cos(up)).multiplyScalar(SWIPE.reach * legs[side]).add(shoulder);
    // From the elbow's way now, so the leg doesn't jump as it starts.
    bend.copy(rig.at(lower)).sub(shoulder).normalize().lerp(out.set(own, 0.2, -0.6).normalize(), paw);
    rig.reach(upper, lower, end, rig.at(end).lerp(goal, paw), bend);
  }

  /** Its pillars of ice rise along the field (where it has them). */
  function raisePillars(): void {
    if (!pillar) return;
    for (const old of pillars.splice(0)) scene.remove(old.body);
    PILLARS.at.forEach((x, i) => {
      const made = clone(pillar);
      made.scale.setScalar(PILLARS.size);
      made.position.set(x, 0, PILLARS.depth[i] as number);
      made.rotation.y = i * 1.7;
      scene.add(made);
      pillars.push({ body: made, age: -i * 0.06 });
    });
  }

  const boss: Boss = {
    root,
    use(attack) {
      dazed = 0;
      low = 0;
      downed = 0;
      going.splice(0);
      for (const [move] of body.plans[attack] ?? []) going.push({ move: move as DragonMove, part: going.length, t: 0, hit: false });
      if (attack === 'storm') raisePillars();
    },
    target: (into) => into,
    daze(seconds, down = false) {
      going.splice(0);
      if (down) downed = Math.max(downed, seconds);
      else {
        dazed = Math.max(dazed, seconds);
        low = Math.max(low, 0.5);
      }
    },
    slow(rate, seconds) {
      slowed = { rate, left: seconds };
    },
    hit() {
      flinch = FLINCH;
    },
    update(now, dt) {
      rig.reset();
      dazed = Math.max(0, dazed - dt);
      if (dazed <= 0) low = 0;
      sunk += (low - sunk) * Math.min(1, dt * 6);
      downed = Math.max(0, downed - dt);
      lying = downed > 0 ? Math.min(1, lying + dt / LIE.down) : Math.max(0, lying - dt / LIE.up);
      const lie = lying * lying * (3 - 2 * lying);
      slowed.left = Math.max(0, slowed.left - dt);
      const rate = slowed.left > 0 ? slowed.rate : 1;

      // At rest: it breathes (its front rising and falling), its wings stir, its head weaves and its tail sways.
      const pose: Pose = {
        ...STILL,
        rear: Math.sin(now * 1.4) * 0.025,
        neck: Math.sin(now * 0.8) * 0.06,
        turn: Math.sin(now * 0.5) * 0.08,
        head: Math.sin(now * 1.1 + 1) * 0.04,
        jaw: 0.05 + Math.sin(now * 0.7) * 0.04,
        wings: Math.sin(now * 1.4) * 0.05,
        tail: Math.sin(now * 0.9) * 0.15,
      };
      // Stunned: its head and front sink, its wings droop.
      pose.rear -= sunk * 0.18;
      pose.neck += sunk * 0.7;
      pose.head += sunk * 0.3;
      pose.wings -= sunk * 0.35;
      pose.jaw += sunk * 0.3;
      // Knocked down: lying on the floor, slumped onto its side, breathing slow and deep, its neck flat and its head turned
      // to rest on its chin, its wings drooped and folded back, its tail all but still.
      if (lie > 0) {
        pose.rear += lie * (Math.sin(now * 0.9) * 0.03 - pose.rear - 0.08);
        pose.neck += lie * (0.95 - pose.neck);
        pose.head += lie * (-0.3 - pose.head);
        pose.turn += lie * (0.4 - pose.turn);
        pose.jaw += lie * 0.1;
        pose.wings -= lie * 0.6;
        pose.fold += lie * 0.45;
        pose.tail *= 1 - lie * 0.8;
        pose.tailUp -= lie * 0.15;
        pose.roll += lie * 0.16;
      }

      const doing = going[0];
      if (doing) {
        doing.t += dt * rate;
        const move = MOVES[doing.move];
        const track = TRACKS[doing.move];
        // (Up to the end of its track, not past it: the next move takes on from there, the same frame.)
        const at = poseAt(track.keys, Math.min(Math.max(0, doing.t), move.length - 1e-3), STILL);
        for (const part of Object.keys(pose) as (keyof Pose)[]) pose[part] += at[part];
        if (doing.move === 'breath') pose.turn += SWEEP[(doing.part - 1) % SWEEP.length] ?? 0;
        if (move.hit !== null && !doing.hit && doing.t >= move.hit) {
          doing.hit = true;
          if (doing.move === 'bite' || doing.move === 'claw') breath.burst(boss.target(aim));
        }
        if (doing.t >= move.length) going.shift();
      }

      // Its body: turned, up in the air, and shaking.
      shell.rotation.y = pose.yaw;
      shell.position.y = pose.lift - lie * sink;
      rig.turnAbout('Bip001_Spine1', -pose.rear, 0, -pose.roll);
      for (const bone of NECK) rig.turnAbout(bone, pose.neck / NECK.length, pose.turn / NECK.length + Math.sin(now * 46) * 0.01 * pose.shake, 0);
      rig.turnAbout('Bip001_Head', pose.head, 0, 0);
      rig.turn('Bone_Mouth', 0, 0, pose.jaw * JAW);
      rig.turnAbout('Bone_Wing_L01', 0, -pose.fold, pose.wings);
      rig.turnAbout('Bone_Wing_R01', 0, pose.fold, -pose.wings);
      TAIL.forEach((bone, i) => rig.turnAbout(bone, pose.tailUp / TAIL.length, (pose.tail / TAIL.length) * (1 + i * 0.25), 0));
      swipe('R', pose.paw, pose.rake);
      swipe('L', pose.pawL, pose.rakeL);

      // Its breath, from its mouth at whoever it is fighting, sweeping across the field: now its head is where it will be drawn.
      const spray = doing && TRACKS[doing.move].breath;
      if (doing && spray && doing.t >= spray[0] && doing.t <= spray[1]) {
        dragon.localToWorld(mouth.copy(rig.at(MOUTH)));
        boss.target(aim);
        across.set(0, 0, ((doing.part - 2.5) / 2) * 3);
        breath.pour(mouth, aim.add(across), dt);
      }
      breath.update(dt);

      // Its pillars rise out of the floor, stand, and sink again.
      for (let i = pillars.length - 1; i >= 0; i--) {
        const one = pillars[i] as { body: Object3D; age: number };
        one.age += dt;
        const up = Math.min(1, Math.max(0, one.age / PILLARS.rise));
        const down = Math.min(1, Math.max(0, (one.age - PILLARS.stand) / PILLARS.sink));
        one.body.position.y = -PILLARS.size * 4 * (1 - up + down);
        if (down >= 1) {
          scene.remove(one.body);
          pillars.splice(i, 1);
        }
      }

      flinch = Math.max(0, flinch - dt);
      const k = flinch / FLINCH;
      shell.position.x = Math.sin(now * 70) * 0.12 * k + Math.sin(now * 46) * 0.05 * pose.shake;
      // Brighter than its picture: it shows as a white shape of itself.
      for (const material of materials) material.color.setScalar(1 + k * 5);
    },
  };
  return boss;
}
