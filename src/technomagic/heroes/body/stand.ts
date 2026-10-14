import { Vector3, type Object3D } from 'three';
import { modelFolder, type HeroAssets, type PartsModel } from '../../assets';
import { loadModels, materialsOf } from '../../engine/models';
import { Rig } from '../../engine/rig';
import { hang, type Stood } from './hero';

/** A skin of the game's own files, stood on the field: its parts on their skeleton, and what it holds in its hands. `owner` is the hero whose it is. */
export async function standHero(owner: HeroAssets, model: PartsModel): Promise<Stood> {
  const hands = [model.left, model.right].filter((folder) => folder !== undefined);
  const folders = (names: readonly string[]): string[] => names.map((name) => modelFolder(owner, name));
  const [parts, held] = await Promise.all([loadModels(folders(model.parts)), loadModels(folders(hands))]);
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
      // (Some files spell the mark with a small h.)
      const point = part.getObjectByName(`Point_Hand_${side}`) ?? part.getObjectByName(`Point_hand_${side}`);
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

  const rig = new Rig(parts);
  // Where its feet are as it stands: they are placed from there.
  const feet = { L: rig.at('Bip001_L_Foot'), R: rig.at('Bip001_R_Foot') };
  return { root, body, middle, models: parts, rig, hips, feet, blade, shield, materials: materialsOf([...parts, ...held]) };
}
