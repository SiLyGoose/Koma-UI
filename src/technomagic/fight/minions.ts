import { AnimationMixer, Box3, Group, LoopOnce, LoopRepeat, Vector3, type AnimationAction, type AnimationClip, type Material, type MeshBasicMaterial, type Object3D, type Scene } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { animationFile, modelFolder, type BossAssets } from '../assets';
import { loadKrClip } from '../engine/kr-clips';
import { isMesh, loadModels } from '../engine/models';
import { SCALE } from '../heroes/body/hero';

/*
 * The minions of a raid's waves on the field (../sim/bosses/dragon/minions.ts), drawn as the sim says: each the game's own
 * model of it (its boss's `minions`: ../assets/bosses/), as big beside the heroes as the game has it, moved by King's Raid's
 * own clips of it: standing, its attack and its skill as it begins each, reeling when stunned, and falling as it is beaten
 * (then gone). Hit, it shows white for a moment. Its models and clips are read as the fight begins.
 */

/** Hit: white for this long. Beaten: gone this long after it falls. How long one clip takes to give way to the next. */
const FLINCH = 0.18;
const GONE = 1.6;
const BLEND = 0.15;
/** Turned toward the heroes, as the boss stands (more toward the camera than straight at them). */
const TURN = -1.1;

export interface Minions {
  /** One comes onto the field (by its index among the sim's enemies), of its kind, where it stands. */
  enter(foe: number, kind: string, x: number, z: number): void;
  use(foe: number, move: 'attack' | 'skill'): void;
  hit(foe: number): void;
  daze(foe: number, seconds: number): void;
  down(foe: number): void;
  /** Over a minion's head (for its health and the numbers off it), put in `into`; null for one not on the field. */
  head(foe: number, into: Vector3): Vector3 | null;
  update(dt: number): void;
  /** Takes every one off (the fight is done with). */
  clear(): void;
}

/** A kind's model and clips, read once. */
interface Kind {
  model: Group;
  clips: Map<string, AnimationClip>;
  /** How tall it stands (the field's units), for over its head. */
  high: number;
}

/** One on the field. */
interface Body {
  root: Group;
  mixer: AnimationMixer;
  actions: Map<string, AnimationAction>;
  showing: AnimationAction | null;
  /** What it does once its clip is done: back to standing, or (beaten) gone. */
  back: number;
  gone: number;
  flinch: number;
  materials: MeshBasicMaterial[];
  high: number;
}

/** Each minion of `boss`'s raid in `scene` (its kinds' models and clips read now, for the waves to come). */
export function makeMinions(scene: Scene, boss: BossAssets): Minions {
  const looks = boss.minions ?? {};
  const kinds = new Map<string, Promise<Kind | null>>();
  for (const [kind, look] of Object.entries(looks)) {
    const owner = { folder: boss.folder };
    const names = ['Astand', 'Attack1', 'Skill1', 'Stun', 'Dead', ...(look.clips ?? [])];
    kinds.set(
      kind,
      Promise.all([loadModels([modelFolder(boss, look.model)]), Promise.all(names.map(async (name) => [name, await loadKrClip(animationFile(owner, `${look.animations}/${name}`)).catch(() => null)] as const))])
        .then(([[model], clips]) => {
          if (!model) return null;
          const high = new Box3().setFromObject(model).getSize(new Vector3()).y * SCALE;
          return { model, clips: new Map(clips.filter((one): one is readonly [string, AnimationClip] => one[1] !== null)), high };
        })
        .catch((error: unknown) => {
          console.warn(`The ${kind} isn't on this computer`, error);
          return null;
        }),
    );
  }

  const bodies = new Map<number, Body>();
  const play = (body: Body, name: string, once: boolean): number => {
    const action = body.actions.get(name);
    if (!action) return 0;
    action.reset();
    action.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
    action.clampWhenFinished = once;
    action.play();
    if (body.showing && body.showing !== action) body.showing.crossFadeTo(action, BLEND, false);
    body.showing = action;
    return once ? action.getClip().duration : 0;
  };

  return {
    enter(foe, kind, x, z) {
      void kinds.get(kind)?.then((made) => {
        if (!made || bodies.has(foe)) return;
        const model = clone(made.model);
        // (Its own materials: white when it is hit, and none other with it.)
        const materials: MeshBasicMaterial[] = [];
        model.traverse((o) => {
          if (!isMesh(o)) return;
          o.material = [o.material].flat().map((material: Material) => {
            const own = material.clone() as MeshBasicMaterial;
            materials.push(own);
            return own;
          });
          if (Array.isArray(o.material) && o.material.length === 1) o.material = o.material[0] as MeshBasicMaterial;
        });
        const root = new Group();
        model.scale.setScalar(SCALE);
        root.add(model);
        root.position.set(x, 0, z);
        root.rotation.y = TURN;
        scene.add(root);
        const mixer = new AnimationMixer(model);
        const actions = new Map([...made.clips].map(([name, clip]) => [name, mixer.clipAction(clip)]));
        const body: Body = { root, mixer, actions, showing: null, back: 0, gone: 0, flinch: 0, materials, high: made.high };
        bodies.set(foe, body);
        // (Coming onto the field: its own coming, where it has one.)
        body.back = play(body, actions.has('Advent') ? 'Advent' : 'Astand', actions.has('Advent'));
      });
    },
    use(foe, move) {
      const body = bodies.get(foe);
      if (body && body.gone === 0) body.back = play(body, move === 'skill' ? 'Skill1' : 'Attack1', true);
    },
    hit(foe) {
      const body = bodies.get(foe);
      if (body) body.flinch = FLINCH;
    },
    daze(foe, seconds) {
      const body = bodies.get(foe);
      if (!body || body.gone > 0) return;
      play(body, 'Stun', false);
      body.back = seconds;
    },
    down(foe) {
      const body = bodies.get(foe);
      if (!body) return;
      play(body, 'Dead', true);
      body.back = 0;
      body.gone = GONE;
    },
    head(foe, into) {
      const body = bodies.get(foe);
      if (!body || body.gone > 0) return null;
      return into.copy(body.root.position).setY(body.high + 0.2);
    },
    update(dt) {
      for (const [foe, body] of bodies) {
        body.mixer.update(dt);
        if (body.back > 0) {
          body.back -= dt;
          if (body.back <= 0 && body.gone === 0) play(body, 'Astand', false);
        }
        body.flinch = Math.max(0, body.flinch - dt);
        const k = body.flinch / FLINCH;
        for (const material of body.materials) material.color.setScalar(1 + k * 4);
        if (body.gone > 0) {
          body.gone -= dt;
          if (body.gone <= 0) {
            scene.remove(body.root);
            bodies.delete(foe);
          }
        }
      }
    },
    clear() {
      for (const body of bodies.values()) scene.remove(body.root);
      bodies.clear();
    },
  };
}
