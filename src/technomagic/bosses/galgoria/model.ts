import { Group, Vector3, type Object3D, type Scene } from 'three';
import { GALGORIA_ASSETS, modelFolder } from '../../assets';
import { loadModels, materialsOf } from '../../engine/models';
import { Rig } from '../../engine/rig';
import { HEADS, MOVES, PLANS, type Attack, type Head } from '../../sim/bosses/galgoria/attacks';
import type { Span } from '../../sim/motion';
import type { Boss, BossLook } from '../boss';
import { krBossMotion, loadKrBossClips } from '../kr';
import { WASTELAND } from './scenery';

/*
 * Galgoria on the field: a chimera of three heads, each on a neck of six bones, with a tail behind. It is moved by King's
 * Raid's own animations for it (../kr.ts: its idle, each of its attacks, going down and getting up), each attack fitted to
 * how the fight has it go (../../sim/bosses/galgoria/attacks.ts: each of its skills is some of its heads' moves, one after
 * another). Its spit is King's Raid's own (its assets' vfx fly), launched here by its heads' moves as the fight times
 * them: from a head's mouth at whoever it is fighting as it spits (SPIT into it), there as its blow lands. It is only
 * drawn: when it attacks, is stunned or slowed, and what comes of each blow, is the fight's sim's (../../sim/bosses/galgoria/).
 */

/** Hit: white for this long, and shaken. */
const FLINCH = 0.22;
/** When in a head's spit it spits (it takes a moment to get there: till the blow lands). */
const SPIT = 0.6;

/**
 * How the fight times each of its attacks: when its heads' blows land (each head's moves one after another, each
 * beginning `after` seconds after the last is done, or after the attack begins), and when the last of them is done.
 */
const TIMING: Readonly<Record<string, Span>> = Object.fromEntries(
  Object.entries(PLANS).map(([skill, plan]) => {
    const ends = new Map<Head, number>();
    const lands = new Set<number>();
    let until = 0;
    for (const [kind, head, after] of plan) {
      const start = (ends.get(head) ?? 0) + after;
      const move = MOVES[kind];
      if (move.hit !== null) lands.add(Math.round((start + move.hit) * 1000) / 1000);
      ends.set(head, start + move.length);
      until = Math.max(until, start + move.length);
    }
    return [skill, { lands: [...lands].sort((a, b) => a - b), until }];
  }),
);

/**
 * Its files, and where it stands: right of the middle, a hero that fights hand to hand not far in front of it, as in
 * the game (the left of the field is for those who fight from further off).
 */
export const GALGORIA_LOOK: BossLook = {
  assets: GALGORIA_ASSETS,
  stands: { x: 7, turn: -1.1 },
  reach: { hit: [-2.2, 3.4, 3], feet: [-1, 0, 0.6] },
  skills: ['destroyer', 'swamp', 'explosion', 'fatal'],
  scenery: WASTELAND,
};

export async function loadGalgoria(scene: Scene, bright: Object3D): Promise<Boss> {
  const animations = GALGORIA_ASSETS.animations;
  if (!animations) throw new Error('Galgoria has no animations');
  const [models, clips] = await Promise.all([loadModels(GALGORIA_ASSETS.models.map((model) => modelFolder(GALGORIA_ASSETS, model))), loadKrBossClips(GALGORIA_ASSETS, animations, TIMING)]);
  const rig = new Rig(models);
  const root = new Group();
  // The models sit in a group of their own, that shakes when it is hit.
  const body = new Group();
  body.add(...models);
  root.add(body);
  const motion = krBossMotion(models, clips);

  /** What each head is doing, and will do after it (its spit goes by these): a move of a skill (its name), which of the skill's moves it is, and whether it has spat. */
  const going = new Map<Head, { kind: Attack; skill: string; part: number; t: number; hit: boolean; spat?: boolean }[]>();
  const materials = materialsOf(models);
  let flinch = 0;
  let slowed = { rate: 1, left: 0 };
  const mouth = new Vector3();
  const aim = new Vector3();
  const tongue = (head: Head, into: Vector3): Vector3 => (models[0] as Object3D).localToWorld(into.copy(rig.at(`Bone_${head}_Tongue02`)));

  const boss: Boss = {
    root,
    use(skill) {
      const plan = PLANS[skill] ?? [];
      for (const [, head] of plan) going.delete(head);
      plan.forEach(([kind, head, after], part) => {
        const moves = going.get(head) ?? [];
        moves.push({ kind, skill, part, t: -after, hit: false });
        going.set(head, moves);
      });
      motion.use(skill);
    },
    target: (into) => into,
    daze(seconds, down = false) {
      going.clear();
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
      // Its spit: from each head as its moves have it, where the game's animation has put that head now.
      for (const head of HEADS) {
        const moves = going.get(head);
        const doing = moves?.[0];
        if (!moves || !doing) continue;
        doing.t += dt * rate;
        const move = MOVES[doing.kind];
        if (doing.kind === 'spit' && move.hit !== null && !doing.spat && doing.t >= SPIT) {
          doing.spat = true;
          boss.launch?.(tongue(head, mouth), boss.target(aim), Math.max(0.05, (move.hit - doing.t) / rate));
        }
        if (move.hit !== null && !doing.hit && doing.t >= move.hit) doing.hit = true;
        if (doing.t >= move.length) {
          moves.shift();
          if (moves.length === 0) going.delete(head);
        }
      }

      flinch = Math.max(0, flinch - dt);
      const k = flinch / FLINCH;
      body.position.x = Math.sin(now * 70) * 0.12 * k;
      // Brighter than its picture: it shows as a white shape of itself.
      for (const material of materials) material.color.setScalar(1 + k * 5);
    },
  };
  return boss;
}
