import { Group, type Mesh, type MeshBasicMaterial } from 'three';
import { modelFolder, type BossAssets } from '../assets';
import { isMesh, loadModels, materialsOf } from '../engine/models';
import type { BossMove, Plan } from '../sim/bosses/boss';
import type { Boss } from './boss';
import { krBossMotion, loadKrBossClips, timingOf } from './kr';

/*
 * A King's Raid boss of one body on one skeleton (Divine Punishment's Tersio and Apocalypsion), moved by the game's own
 * clips for it (./kr.ts: its idle, each of its attacks fitted to how the fight times it, coming in, falling): its first
 * model its body, the rest what it holds, each hung on its body's mark for the hand the game hangs it from (its creature's
 * WeaponList: Point_Hand_L, Point_Hand_R), straight in it (ResetRotation). It is only drawn: what it does is the sim's.
 */

/** Hit: white for this long, and shaken. */
const FLINCH = 0.22;

/**
 * Reads `assets`' body (`size` times its model's size) and what it holds (`held`: by its model's name, the mark it hangs
 * from), and its clips fitted to its sim def's attacks (`def`). `options.pictures`: pictures its files name otherwise
 * (loadModels'); `options.hidden`: materials not drawn (an effect layer drawn here as a solid sheet).
 */
export async function loadKrBody(
  assets: BossAssets,
  def: { plans: Readonly<Record<string, Plan>>; moves: Readonly<Record<string, BossMove>> },
  size: number,
  held: Readonly<Record<string, string>> = {},
  options: { pictures?: Readonly<Record<string, string>>; hidden?: readonly string[] } = {},
): Promise<Boss> {
  const animations = assets.animations;
  if (!animations) throw new Error(`${assets.name} has no animations`);
  const [models, clips] = await Promise.all([
    loadModels(
      assets.models.map((model) => modelFolder(assets, model)),
      undefined,
      options.pictures,
    ),
    loadKrBossClips(assets, animations, timingOf(def)),
  ]);
  const [body, ...rest] = models;
  if (!body) throw new Error(`${assets.name} has no model`);
  rest.forEach((model, i) => {
    const mark = held[assets.models[i + 1] as string];
    if (!mark) return;
    // (Straight in the hand, as King's Raid hangs it: the turn its file's top has from the export undone.)
    for (const top of model.children) top.rotation.set(0, 0, 0);
    (body.getObjectByName(mark) ?? body).add(model);
  });
  if (options.hidden?.length)
    body.traverse((o) => {
      if (isMesh(o) && [o.material].flat().some((material) => options.hidden?.includes(material.name))) (o as Mesh).visible = false;
    });
  const root = new Group();
  root.scale.setScalar(size);
  // The model sits in a group of its own, that shakes when it is hit.
  const shell = new Group();
  shell.add(body);
  root.add(shell);
  const materials: MeshBasicMaterial[] = materialsOf([body]);
  const motion = krBossMotion([body], clips);
  let flinch = 0;
  return {
    root,
    use: (attack) => motion.use(attack),
    target: (into) => into,
    daze: (seconds, down = false) => motion.daze(seconds, down),
    slow: (rate, seconds) => motion.slow(rate, seconds),
    hit() {
      flinch = FLINCH;
    },
    arrive: () => void motion.arrive(),
    fall: () => motion.fall(),
    reset: () => motion.reset(),
    update(now, dt) {
      motion.update(dt);
      flinch = Math.max(0, flinch - dt);
      const k = flinch / FLINCH;
      shell.position.x = Math.sin(now * 70) * 0.06 * k;
      // Brighter than its picture: it shows as a white shape of itself.
      for (const material of materials) material.color.setScalar(1 + k * 5);
    },
  };
}
