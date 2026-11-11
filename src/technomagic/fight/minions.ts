import { AnimationMixer, Box3, Group, LoopOnce, LoopRepeat, Vector3, type AnimationAction, type AnimationClip, type Material, type MeshBasicMaterial, type Object3D, type Scene } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { animationFile, modelFolder, type BossAssets, type KrMove } from '../assets';
import { fitted, inPlace, loadKrClip } from '../engine/kr-clips';
import { isMesh, loadModels } from '../engine/models';
import { SCALE } from '../heroes/body/hero';
import { MINION_FX } from '../assets/minions';
import type { KrEffects } from '../fx/kr-effects';
import { MINIONS, type MinionDef } from '../sim/bosses/dragon/minions';

/*
 * The minions of a raid's waves on the field (../sim/bosses/dragon/minions.ts), drawn as the sim says: each the game's own
 * model of it (its boss's `minions`: ../assets/bosses/), as big beside the heroes as the game has it, moved by King's Raid's
 * own clips of it: standing, its attack and its skill as it begins each, reeling when stunned, and falling as it is beaten
 * (then gone). Hit, it shows white for a moment. Its models and clips are read as the fight begins; and King's Raid's own
 * effects of it (../assets/minions.ts) are played on it as it comes on, as it begins its attack and its skill, and where it falls.
 * One with moves of its own (its look's `moves`: Ascalon's beasts) plays each as King's Raid's clips for it, fitted to how the
 * fight times it (several of the game's one after another: a leap and its strikes), each of its skills its own; their effects
 * each so far in (moved on with it), and on a hero as a blow of it lands (struck()).
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
  /** Begins its attack or its skill (one of more than one: which, by its place: MinionDef.skills). */
  use(foe: number, move: 'attack' | 'skill', skill?: number): void;
  /** A blow of the move it began last lands on a hero (`on`: its body): its kind's effect for that, there. */
  struck(foe: number, on: Object3D): void;
  hit(foe: number): void;
  daze(foe: number, seconds: number): void;
  /** Beaten (or `blast`: bursting, its burst's effect where it falls). */
  down(foe: number, blast?: boolean): void;
  /** Those still on the field (falling) move along it by `dx`, as the map does moving on to the next wave's platform. */
  shift(dx: number): void;
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
  /** The move it began last (its skill's place among its skills; -1 its one skill; null its attack), and its effects still to play, each how long until it does. */
  doing: number | null;
  later: { left: number; code: string; lasts?: number }[];
}

/** The clip of a move of its own (its look's `moves`), by the move (its skill's place, among more than one). */
const moveClip = (move: 'attack' | 'skill', skill?: number): string => (move === 'attack' ? 'move:attack' : skill === undefined ? 'move:skill' : `move:skill:${skill}`);

/** A kind's own moves, each the game's clips joined and fitted to how the fight times it (`def`'s), its walking along the floor taken out: by moveClip(). */
function ownMoves(look: NonNullable<BossAssets['minions']>[string], def: MinionDef | undefined, clips: ReadonlyMap<string, AnimationClip>): [string, AnimationClip][] {
  const { moves } = look;
  if (!moves || !def) return [];
  const fit = (key: string, move: KrMove | undefined, timing: { length: number; lands: readonly number[] } | undefined): [string, AnimationClip][] => {
    const parts = move?.clips.map((name) => clips.get(name));
    if (!move || !timing || !parts || parts.some((part) => !part)) return [];
    return [[key, inPlace(fitted((parts as AnimationClip[]).map((part) => part.clone()), move.hits, timing.lands, timing.length))]];
  };
  return [
    ...fit(moveClip('attack'), moves.attack, def.attack),
    ...fit(moveClip('skill'), moves.skill, def.skill),
    ...(moves.skills ?? []).flatMap((move, i) => fit(moveClip('skill', i), move, def.skills?.[i])),
    // (Its falling, where its clip is named otherwise: the Discarded's Die.)
    ...(moves.dead && clips.get(moves.dead) ? [['Dead', clips.get(moves.dead) as AnimationClip] as [string, AnimationClip]] : []),
  ];
}

/** Each minion of `boss`'s raid in `scene` (its kinds' models and clips read now, for the waves to come), its effects played by `kr`. */
export function makeMinions(scene: Scene, boss: BossAssets, kr: KrEffects): Minions {
  const looks = boss.minions ?? {};
  kr.read(
    Object.keys(looks).flatMap((kind) => [
      ...Object.values(MINION_FX[kind]?.vfx ?? {}).flat(),
      ...(MINION_FX[kind]?.skills ?? []).flatMap((skill) => [...(skill.vfx.skill ?? []).map((one) => one.code), ...(skill.vfx.hitSkill ?? [])]),
    ]),
  );
  /** Each one's kind, by its index. */
  const kindOf = new Map<number, string>();
  /** Plays its kind's effects of `what` on it (or, `at` it, where it is). */
  const effect = (foe: number, what: 'attack' | 'skill' | 'down' | 'enter' | 'blast', at = false): void => {
    const body = bodies.get(foe);
    const codes = MINION_FX[kindOf.get(foe) ?? '']?.vfx[what] ?? [];
    if (!body) return;
    for (const code of codes) kr.play(code, at ? { at: body.root.position, turn: body.root.rotation.y, scale: SCALE } : { on: body.root, scale: SCALE });
  };
  const kinds = new Map<string, Promise<Kind | null>>();
  for (const [kind, look] of Object.entries(looks)) {
    const owner = { folder: boss.folder };
    const { moves = {} } = look;
    const own = [moves.attack, moves.skill, ...(moves.skills ?? [])].flatMap((move) => move?.clips ?? []);
    // (One with moves of its own: only the clips they name, beside its standing and reeling.)
    const plain = look.moves ? ['Astand', 'Stun', moves.dead ?? 'Dead'] : ['Astand', 'Attack1', 'Skill1', 'Stun', 'Dead'];
    const names = [...new Set([...plain, ...(look.clips ?? []), ...own])];
    kinds.set(
      kind,
      Promise.all([loadModels([modelFolder(boss, look.model)]), Promise.all(names.map(async (name) => [name, await loadKrClip(animationFile(owner, `${look.animations}/${name}`)).catch(() => null)] as const))])
        .then(([[model], clips]) => {
          if (!model) return null;
          const high = new Box3().setFromObject(model).getSize(new Vector3()).y * SCALE;
          const read = new Map(clips.filter((one): one is readonly [string, AnimationClip] => one[1] !== null));
          // (And its own moves, fitted to the fight's timing of them: Ascalon's beasts'.)
          for (const [key, clip] of ownMoves(look, (MINIONS as Readonly<Record<string, MinionDef | undefined>>)[kind], read)) read.set(key, clip);
          return { model, clips: read, high };
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
      kindOf.set(foe, kind);
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
        const body: Body = { root, mixer, actions, showing: null, back: 0, gone: 0, flinch: 0, materials, high: made.high, doing: null, later: [] };
        bodies.set(foe, body);
        // (Coming onto the field: its own coming, where it has one.)
        body.back = play(body, actions.has('Advent') ? 'Advent' : 'Astand', actions.has('Advent'));
        effect(foe, 'enter');
      });
    },
    use(foe, move, skill) {
      const body = bodies.get(foe);
      if (!body || body.gone > 0) return;
      // (Its own clip for the move, where it has one; else the game's plain ones.)
      const own = moveClip(move, skill);
      body.back = play(body, body.actions.has(own) ? own : move === 'skill' ? 'Skill1' : 'Attack1', true);
      body.doing = move === 'attack' ? null : (skill ?? -1);
      // (A skill of more than one: its own effects, each so far into it; what the last move had still to play doesn't.)
      const timed = skill === undefined ? null : MINION_FX[kindOf.get(foe) ?? '']?.skills?.[skill];
      body.later = (timed?.vfx.skill ?? []).map((one) => ({ left: one.at, code: one.code, ...(one.lasts !== undefined && { lasts: one.lasts }) }));
      if (!timed) effect(foe, move);
    },
    struck(foe, on) {
      const body = bodies.get(foe);
      const fx = MINION_FX[kindOf.get(foe) ?? ''];
      if (!body || !fx) return;
      const codes = body.doing === null ? fx.vfx.hitAttack : body.doing < 0 ? fx.vfx.hitSkill : fx.skills?.[body.doing]?.vfx.hitSkill;
      for (const code of codes ?? []) kr.play(code, { on, scale: SCALE });
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
    down(foe, blast = false) {
      const body = bodies.get(foe);
      if (!body) return;
      effect(foe, 'down', true);
      if (blast) effect(foe, 'blast', true);
      body.later = [];
      // (One with no falling of its own, the ice pillars: gone at once, its effect there as it breaks.)
      if (!body.actions.has('Dead')) {
        scene.remove(body.root);
        bodies.delete(foe);
        return;
      }
      play(body, 'Dead', true);
      body.back = 0;
      body.gone = GONE;
    },
    shift(dx) {
      for (const body of bodies.values()) body.root.position.x += dx;
    },
    head(foe, into) {
      const body = bodies.get(foe);
      if (!body || body.gone > 0) return null;
      return into.copy(body.root.position).setY(body.high + 0.2);
    },
    update(dt) {
      for (const [foe, body] of bodies) {
        body.mixer.update(dt);
        // (What of its move's effects is due now: on it.)
        if (body.later.length > 0) {
          for (const one of body.later) {
            one.left -= dt;
            if (one.left <= 0) kr.play(one.code, { on: body.root, scale: SCALE, ...(one.lasts !== undefined && { lasts: one.lasts }) });
          }
          body.later = body.later.filter((one) => one.left > 0);
        }
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
