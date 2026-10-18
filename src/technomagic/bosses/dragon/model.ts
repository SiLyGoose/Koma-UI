import { Group, Vector3, type Object3D, type Scene } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { modelFolder, type BossAssets } from '../../assets';
import { loadModels, materialsOf } from '../../engine/models';
import { Rig } from '../../engine/rig';
import type { Plan } from '../../sim/bosses/boss';
import { MOVES, type DragonMove } from '../../sim/bosses/dragon/moves';
import type { Span } from '../../sim/motion';
import type { Boss } from '../boss';
import { krBossMotion, loadKrBossClips } from '../kr';
import { makeBreath } from './breath';

/*
 * A dragon on the field: King's Raid's four dragons are one body on one skeleton (a biped's bones, on all fours, with
 * wings and a tail), each in its own skin. It is moved by King's Raid's own animations for it (../kr.ts: its idle, each
 * of its attacks, going down and getting up), each attack fitted to how the fight has it go (its moves one after
 * another: ../../sim/bosses/dragon/moves.ts). Its breath (./breath.ts) pours from its mouth, wherever the game's
 * animation has put it, through each of its breath's moves. It is only drawn: when it attacks, is knocked down or
 * slowed, and what comes of each blow, is the fight's sim's (../../sim/bosses/<dragon>/).
 */

/** Hit: white for this long, and shaken. */
const FLINCH = 0.22;
/** Where the breath leaves it: its tongue, at the front of its mouth. */
const MOUTH = 'Bone_Tongue02';
/** Scalaxia's pillars of ice: how many, where (along the field and toward the camera), how long they take to rise and to sink, and how long they stand. */
const PILLARS = { at: [-9, -6.5, -4, -1.5, 1] as const, depth: [1.5, -1, 2.5, 0, 1.8] as const, rise: 0.5, sink: 0.7, stand: 4.2, size: 1.05 };

/** A dragon's look: its files, its attacks' moves (its sim's plans), and its breath's colours (where it is hottest, and as it fades). */
export interface DragonBody {
  assets: BossAssets;
  plans: Readonly<Record<string, Plan>>;
  breath: { core: number; edge: number };
}

/** How the fight times each of its attacks: when its moves' blows land (each after the last is done), and when the last is done. */
function timingOf(plans: Readonly<Record<string, Plan>>): Record<string, Span> {
  return Object.fromEntries(
    Object.entries(plans).map(([attack, plan]) => {
      const lands: number[] = [];
      let until = 0;
      for (const [kind] of plan) {
        const move = MOVES[kind as DragonMove];
        if (move.hit !== null) lands.push(Math.round((until + move.hit) * 1000) / 1000);
        until += move.length;
      }
      return [attack, { lands, until }];
    }),
  );
}

export async function loadDragon(body: DragonBody, scene: Scene, bright: Object3D): Promise<Boss> {
  const { animations } = body.assets;
  if (!animations) throw new Error(`${body.assets.name} has no animations`);
  const [[dragon, pillar], clips] = await Promise.all([loadModels(body.assets.models.map((model) => modelFolder(body.assets, model))), loadKrBossClips(body.assets, animations, timingOf(body.plans))]);
  if (!dragon) throw new Error(`${body.assets.name} has no model`);
  const rig = new Rig([dragon]);
  const root = new Group();
  // The model sits in a group of its own, that shakes when it is hit.
  const shell = new Group();
  shell.add(dragon);
  root.add(shell);
  const materials = materialsOf([dragon]);
  const motion = krBossMotion([dragon], clips);
  const breath = makeBreath(bright, body.breath.core, body.breath.edge);

  /** What it is doing, and will do after (its breath and its bursts go by these): a move of an attack, which of the attack's moves it is, and how far into it. */
  const going: { move: DragonMove; part: number; t: number; hit: boolean }[] = [];
  let flinch = 0;
  let slowed = { rate: 1, left: 0 };
  /** Its pillars of ice, standing (Scalaxia's): each one's body, and how long it has stood. */
  const pillars: { body: Object3D; age: number }[] = [];
  const mouth = new Vector3();
  const aim = new Vector3();
  const across = new Vector3();

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
      going.splice(0);
      for (const [move] of body.plans[attack] ?? []) going.push({ move: move as DragonMove, part: going.length, t: 0, hit: false });
      if (attack === 'storm') raisePillars();
      motion.use(attack);
    },
    target: (into) => into,
    daze(seconds, down = false) {
      going.splice(0);
      motion.daze(seconds, down);
    },
    slow(rate, seconds) {
      slowed = { rate, left: seconds };
      motion.slow(rate, seconds);
    },
    hit() {
      flinch = FLINCH;
    },
    update(now, dt) {
      motion.update(dt);
      slowed.left = Math.max(0, slowed.left - dt);
      const rate = slowed.left > 0 ? slowed.rate : 1;

      const doing = going[0];
      if (doing) {
        doing.t += dt * rate;
        const move = MOVES[doing.move];
        if (move.hit !== null && !doing.hit && doing.t >= move.hit) {
          doing.hit = true;
          if (doing.move === 'bite' || doing.move === 'claw') breath.burst(boss.target(aim));
        }
        // Its breath, from its mouth at whoever it is fighting, sweeping across the field as it goes on.
        if (doing.move === 'breath') {
          dragon.localToWorld(mouth.copy(rig.at(MOUTH)));
          boss.target(aim);
          across.set(0, 0, ((doing.part - 2.5) / 2) * 3);
          breath.pour(mouth, aim.add(across), dt);
        }
        if (doing.t >= move.length) going.shift();
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
      shell.position.x = Math.sin(now * 70) * 0.12 * k;
      // Brighter than its picture: it shows as a white shape of itself.
      for (const material of materials) material.color.setScalar(1 + k * 5);
    },
  };
  return boss;
}
