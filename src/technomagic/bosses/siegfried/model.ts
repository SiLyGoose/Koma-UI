import { Group, type Object3D, type Scene } from 'three';
import { modelFolder, SIEGFRIED_ASSETS } from '../../assets';
import { loadModels, materialsOf } from '../../engine/models';
import { SCALE } from '../../heroes/body/hero';
import { MOVES, PLANS } from '../../sim/bosses/siegfried/attacks';
import type { Span } from '../../sim/motion';
import type { Boss, BossLook } from '../boss';
import { krBossMotion, loadKrBossClips } from '../kr';
import { DAWN_FIELD } from './scenery';

/*
 * Siegfried on the field: King's Raid's Corrupted Siegfried, one body on one skeleton, his sword in his right hand (its
 * file a mesh of its own, hung on the mark his body's file has for it, Point_Hand_R, which his clips move beside his
 * skeleton). He is moved by King's Raid's own animations for him (../kr.ts: his idle, each of his attacks, falling and
 * getting up), each fitted to how the fight has it go (his moves one after another: ../../sim/bosses/siegfried/attacks.ts).
 * What his sword keeps on after he rises is his assets' vfx `kept`, by what is on him. He is only drawn: when he attacks,
 * falls and rises, and what comes of each blow, is the fight's sim's (../../sim/bosses/siegfried/).
 */

/** Hit: white for this long, and shaken. */
const FLINCH = 0.22;
/**
 * How big he is: as much bigger than a hero as King's Raid has him (his raid's wave makes him 1.3 times his model's size,
 * CampaignWaveTable's 1300), with the heroes as big as they are here (SCALE): he stands a head over them.
 */
const SIZE = 1.3 * SCALE;

/** How the fight times each of his attacks: when his moves' blows land (each after the last is done), and when the last is done. */
const TIMING: Readonly<Record<string, Span>> = Object.fromEntries(
  Object.entries(PLANS).map(([attack, plan]) => {
    const lands: number[] = [];
    let until = 0;
    for (const [kind] of plan) {
      const move = MOVES[kind];
      if (!move) continue;
      if (move.hit !== null) lands.push(Math.round((until + move.hit) * 1000) / 1000);
      until += move.length;
    }
    return [attack, { lands, until }];
  }),
);

/** His files, and where he stands: where the bosses stand, his sword's reach before him; a hero's cut reaches his chest. */
export const SIEGFRIED_LOOK: BossLook = {
  assets: SIEGFRIED_ASSETS,
  stands: { x: 7, turn: -1.1 },
  reach: { hit: [-0.5, 1.8, 0.2], feet: [-0.2, 0, 0.2] },
  skills: ['strike', 'storm', 'rise'],
  scenery: DAWN_FIELD,
  gauge: 'mana',
};

export async function loadSiegfried(_scene: Scene, _bright: Object3D): Promise<Boss> {
  const animations = SIEGFRIED_ASSETS.animations;
  if (!animations) throw new Error('Siegfried has no animations');
  const [[body, sword], clips] = await Promise.all([loadModels(SIEGFRIED_ASSETS.models.map((model) => modelFolder(SIEGFRIED_ASSETS, model))), loadKrBossClips(SIEGFRIED_ASSETS, animations, TIMING)]);
  if (!body) throw new Error('Siegfried has no model');
  // His sword straight in his hand, as King's Raid hangs it (the turn its file's top has from the export undone), on its mark.
  if (sword) {
    for (const top of sword.children) top.rotation.set(0, 0, 0);
    (body.getObjectByName('Point_Hand_R') ?? body).add(sword);
  }
  const root = new Group();
  root.scale.setScalar(SIZE);
  // The model sits in a group of its own, that shakes when it is hit.
  const shell = new Group();
  shell.add(body);
  root.add(shell);
  const materials = materialsOf(sword ? [body, sword] : [body]);
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
    reset: () => motion.reset(),
    update(now, dt) {
      motion.update(dt);
      flinch = Math.max(0, flinch - dt);
      const k = flinch / FLINCH;
      shell.position.x = Math.sin(now * 70) * 0.06 * k;
      // Brighter than his picture: he shows as a white shape of himself.
      for (const material of materials) material.color.setScalar(1 + k * 5);
    },
  };
}
