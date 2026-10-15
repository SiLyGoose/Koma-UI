import { Box3, Vector3, type Object3D } from 'three';
import { modelFolder, type HeroAssets, type PartsModel } from '../../assets';
import { loadModels, materialsOf } from '../../engine/models';
import { Rig } from '../../engine/rig';
import { hang, type Stood } from './hero';

/** A skin of the game's own files, stood on the field: its parts on their skeleton, and what it holds in its hands. `owner` is the hero whose it is. */
export async function standHero(owner: HeroAssets, model: PartsModel): Promise<Stood> {
  const hands = [model.left, model.right].filter((folder) => folder !== undefined);
  const folders = (names: readonly string[]): string[] => names.map((name) => modelFolder(owner, name));
  const [parts, held, floats] = await Promise.all([loadModels(folders(model.parts), model.repaint && { ...model.repaint, at: modelFolder(owner, model.repaint.to) }), loadModels(folders(hands)), loadModels(folders(model.floating ? [model.floating.model] : []))]);
  // Where the model's hips are as it stands: its hands are placed from them, and it turns about them.
  const hips = new Rig(parts).at('Bip001');
  const { root, body, middle } = hang(parts, hips.y);

  // A weapon goes where the body's file marks the hand it is for. The mark stands by itself in the
  // file: it is hung on the hand's bone here, so the weapon goes with the arm.
  body.updateMatrixWorld(true);
  /** The way the blade in the right hand runs, in that hand's own axes. */
  const blade = new Vector3(1, 0, 0);
  let shield: Stood['shield'];
  hands.forEach((folder, i) => {
    const side = folder === model.left ? 'L' : 'R';
    for (const part of parts) {
      // (Some files spell the mark with a small h; some mark only one, at the right hand, as Point_Weapon: Lorraine's.)
      const point = part.getObjectByName(`Point_Hand_${side}`) ?? part.getObjectByName(`Point_hand_${side}`) ?? (side === 'R' ? part.getObjectByName('Point_Weapon') : undefined);
      const hand = part.getObjectByName(`Bip001_${side}_Hand`);
      if (!point) continue;
      if (hand) hand.attach(point);
      point.add(held[i] as Object3D);
      // What is on its left arm is a shield (unless its skin says it is only held): flat, its face along the file's own z.
      if (side === 'L' && model.offHand !== 'held') shield = { mark: point.name, face: new Vector3(0, 0, -1) };
      // The weapon's own length: along its x, or (a file turned on its side as it loads) what was its y.
      if (side === 'R') {
        if (model.blade === 'y') blade.set(0, 1, 0).applyQuaternion((held[i] as Object3D).quaternion);
        else blade.set(1, 0, 0);
        blade.applyQuaternion(point.quaternion).normalize();
      }
      break;
    }
  });
  // What floats beside it: in the group that goes along the field and up with it, not the one that turns head over heels.
  const [floating] = floats;
  let floated: Stood['floating'];
  if (floating && model.floating) {
    floating.position.set(...model.floating.at);
    floating.scale.multiplyScalar(model.floating.size);
    body.add(floating);
    // Its pieces: each moved by a bone of its own (its file names them Point_Move_01, _02…), about its middle.
    const pieces: { bone: Object3D; rest: Vector3 }[] = [];
    floating.traverse((o) => {
      if (/^Point_Move_\d+$/.test(o.name)) pieces.push({ bone: o, rest: o.position.clone() });
    });
    // Where it tips about: the back of its underside, in the body's own lengths (its box, as it stands, out of the body's scale).
    body.updateMatrixWorld(true);
    const box = new Box3().setFromObject(floating);
    const pivot = body.worldToLocal(new Vector3((box.min.x + box.max.x) / 2, box.min.y, box.min.z));
    // Its top layer: the pieces highest up as it floats (its file's own axes may not have them up), and their middle.
    const high = pieces.map(({ bone }) => bone.getWorldPosition(new Vector3()).y);
    const highest = Math.max(...high);
    const tops = pieces.filter((_, i) => (high[i] as number) > highest - 0.01);
    const top = tops.reduce((sum, { rest }) => sum.add(rest), new Vector3()).divideScalar(Math.max(1, tops.length));
    floated = { model: floating, at: floating.position.clone(), pieces, top, pivot };
  }

  const rig = new Rig(parts);
  // Where its feet are as it stands: they are placed from there.
  const feet = { L: rig.at('Bip001_L_Foot'), R: rig.at('Bip001_R_Foot') };
  return { root, body, middle, models: parts, rig, hips, feet, blade, shield, materials: materialsOf([...parts, ...held, ...floats]), floating: floated };
}
