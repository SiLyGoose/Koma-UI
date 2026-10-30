import { Box3, Matrix4, Object3D, Vector3, type Mesh } from 'three';
import { modelFolder, type HeroAssets, type PartsModel } from '../../assets';
import { loadModels, materialsOf } from '../../engine/models';
import { Rig } from '../../engine/rig';
import { hang, type Stood } from './hero';

/** A mark put on what is held at its far end along its own `axis` (as far out as its meshes reach that way): its tip, or its muzzle. */
function tipOf(held: Object3D, axis: 'x' | 'y'): Object3D {
  held.updateMatrixWorld(true);
  const into = new Matrix4().copy(held.matrixWorld).invert();
  const box = new Box3();
  const part = new Box3();
  held.traverse((o) => {
    const { geometry } = o as Mesh;
    if (!(o as Mesh).isMesh || !geometry) return;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    box.union(part.copy(geometry.boundingBox as Box3).applyMatrix4(new Matrix4().multiplyMatrices(into, o.matrixWorld)));
  });
  const tip = new Object3D();
  tip.name = 'Muzzle';
  tip.position.setComponent(axis === 'x' ? 0 : 1, box.isEmpty() ? 0 : box.max.getComponent(axis === 'x' ? 0 : 1));
  held.add(tip);
  return tip;
}

/**
 * The other hand's mark, where it is at this hand (`hand`, this side's bone) and this one has none: Shea's file marks her right
 * hand Point_Hand_L, as the game's own pivot list has it (Bip001 R Hand/Point_Hand_L).
 */
function misnamed(part: Object3D, side: 'L' | 'R', hand: Object3D | undefined): Object3D | undefined {
  const other = side === 'L' ? 'R' : 'L';
  const mark = part.getObjectByName(`Point_Hand_${other}`) ?? part.getObjectByName(`Point_hand_${other}`);
  const otherHand = part.getObjectByName(`Bip001_${other}_Hand`);
  if (!mark || !hand || !otherHand) return undefined;
  const at = mark.getWorldPosition(new Vector3());
  return at.distanceTo(hand.getWorldPosition(new Vector3())) < at.distanceTo(otherHand.getWorldPosition(new Vector3())) ? mark : undefined;
}

/** A skin of the game's own files, stood on the field: its parts on their skeleton, and what it holds in its hands. `owner` is the hero whose it is. */
export async function standHero(owner: HeroAssets, model: PartsModel): Promise<Stood> {
  const hands = [model.left, model.right].filter((folder) => folder !== undefined);
  const folders = (names: readonly string[]): string[] => names.map((name) => modelFolder(owner, name));
  const [parts, held, floats] = await Promise.all([loadModels(folders(model.parts), model.repaint && { ...model.repaint, at: modelFolder(owner, model.repaint.to) }, model.pictures), loadModels(folders(hands), undefined, model.pictures), loadModels(folders(model.floating ? [model.floating.model] : []), undefined, model.pictures)]);
  // (What its files have that its look hasn't: Tanya's fox mask over her face.)
  if (model.hidden) {
    const gone: Object3D[] = [];
    for (const part of parts) part.traverse((o) => void (model.hidden?.includes(o.name) && gone.push(o)));
    for (const o of gone) o.removeFromParent();
  }
  // Where the model's hips are as it stands: its hands are placed from them, and it turns about them.
  const hips = new Rig(parts).at('Bip001');
  const { root, body, middle } = hang(parts, hips.y);

  // What is held comes straight in the hand, as King's Raid hangs it (its recipe's ResetRotation: the turn its file's top
  // has, the export's from 3ds Max, undone): else what runs along the file's z (a staff, a spear) lies flat.
  // (A file whose top has no turn has it a level down, on its mesh and its first bone: Isolet's Santa staff.)
  const exported = (o: Object3D): boolean => Math.abs(o.rotation.x + Math.PI / 2) < 0.01 && Math.abs(o.rotation.y) < 0.01 && Math.abs(o.rotation.z) < 0.01;
  for (const model of held)
    for (const top of model.children) {
      const turned = top.rotation.x !== 0 || top.rotation.y !== 0 || top.rotation.z !== 0;
      top.rotation.set(0, 0, 0);
      if (!turned) for (const below of top.children) if (exported(below)) below.rotation.set(0, 0, 0);
    }

  // A weapon goes where the body's file marks the hand it is for. The mark stands by itself in the
  // file: it is hung on the hand's bone here, so the weapon goes with the arm.
  body.updateMatrixWorld(true);
  /** The way the blade in the right hand runs, in that hand's own axes. */
  const blade = new Vector3(1, 0, 0);
  let shield: Stood['shield'];
  let muzzle: Object3D | undefined;
  hands.forEach((_folder, i) => {
    // (By its place, not its name: the same model may be in both hands, Tanya's katars.)
    const side = model.left !== undefined && i === 0 ? 'L' : 'R';
    for (const part of parts) {
      // (Some files spell the mark with a small h; some mark only one, at the right hand, as Point_Weapon: Lorraine's.)
      const hand = part.getObjectByName(`Bip001_${side}_Hand`);
      const point = part.getObjectByName(`Point_Hand_${side}`) ?? part.getObjectByName(`Point_hand_${side}`) ?? (side === 'R' ? part.getObjectByName('Point_Weapon') : undefined) ?? misnamed(part, side, hand);
      if (!point) continue;
      if (hand) hand.attach(point);
      // Held as its skin says, where its file's mark is not in its hand.
      const grip = model.grips?.[side];
      if (grip && hand) {
        point.position.set(...grip.at);
        point.rotation.set(...grip.turn);
      }
      const turn = model.heldTurn?.[side];
      if (turn) (held[i] as Object3D).rotation.set(...turn);
      point.add(held[i] as Object3D);
      // What is on its left arm is a shield (unless its skin says it is only held): flat, its face along the file's own z.
      if (side === 'L' && model.offHand !== 'held') shield = { mark: point.name, face: new Vector3(0, 0, -1) };
      // The weapon's own length: along its x, or (a file turned on its side as it loads) what was its y.
      if (side === 'R') {
        if (model.blade === 'y') blade.set(0, 1, 0).applyQuaternion((held[i] as Object3D).quaternion);
        else blade.set(1, 0, 0);
        blade.applyQuaternion(point.quaternion).normalize();
        muzzle = tipOf(held[i] as Object3D, model.blade === 'y' ? 'y' : 'x');
      }
      break;
    }
  });
  // What is in its left hand the sheath of what is in its right: its file has the sword's hilt in it, on a mark of its own (Point_Weapon).
  const sword = model.right === undefined ? undefined : held[hands.length - 1];
  const scabbard = model.left === undefined ? undefined : held[0];
  const hilt = scabbard?.getObjectByName('Point_Weapon');
  const sheath = sword && scabbard && hilt ? { sword, scabbard, hilt } : undefined;

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
  return { root, body, middle, models: parts, rig, hips, feet, blade, muzzle, ...(sword && { inRight: sword }), shield, sheath, materials: materialsOf([...parts, ...held, ...floats]), floating: floated };
}
