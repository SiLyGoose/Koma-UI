import { AdditiveBlending, AnimationMixer, DoubleSide, Group, LoopOnce, MeshBasicMaterial, SRGBColorSpace, TextureLoader, type AnimationClip, type Scene, type Vector3 } from 'three';
import { EFFECTS, effectFolder, type EffectName } from '../assets';
import { fileUrl, isMesh, loadFbx } from '../engine/models';

/*
 * The effects where a hit lands (../assets/effects.ts names them): each is a few flat pictures, white on black,
 * that its file moves and grows over a fraction of a second. Drawn as light, over everything, facing
 * the camera, and gone when its animation ends.
 */

/** An effect fades out over this last part of its animation. */
const FADE = 0.4;
/** How long one with no animation in its file stays. */
const PLAIN = 0.4;

interface Loaded {
  model: Group;
  clip: AnimationClip | null;
  size: number;
}

interface Playing {
  root: Group;
  mixer: AnimationMixer | null;
  materials: MeshBasicMaterial[];
  t: number;
  length: number;
}

export interface Effects {
  /** Plays an effect once at a place on the field, turned `turn` radians as the camera sees it and `scale` times its usual size. */
  play(name: EffectName, at: Vector3, turn?: number, scale?: number): void;
  update(dt: number): void;
}

async function load(name: EffectName): Promise<Loaded> {
  const { tint, size } = EFFECTS[name];
  const folder = effectFolder(EFFECTS[name]);
  const model = await loadFbx(folder);
  const pictures = new TextureLoader();
  const waiting: Promise<void>[] = [];
  model.traverse((o) => {
    if (!isMesh(o)) return;
    o.frustumCulled = false;
    o.renderOrder = 10;
    const file = ([o.material].flat()[0] as MeshBasicMaterial).map?.name;
    const material = new MeshBasicMaterial({ color: tint, blending: AdditiveBlending, transparent: true, depthWrite: false, depthTest: false, side: DoubleSide });
    o.material = material;
    if (file)
      waiting.push(
        pictures.loadAsync(fileUrl(folder, file)).then((map) => {
          map.colorSpace = SRGBColorSpace;
          material.map = map;
          material.needsUpdate = true;
        }),
      );
  });
  await Promise.all(waiting);
  return { model, clip: model.animations[0] ?? null, size };
}

export async function loadEffects(scene: Scene): Promise<Effects> {
  const names = Object.keys(EFFECTS) as EffectName[];
  const loaded = new Map(await Promise.all(names.map(async (name) => [name, await load(name)] as const)));
  const playing = new Set<Playing>();

  return {
    play(name, at, turn = 0, scale = 1) {
      const { model, clip, size } = loaded.get(name) as Loaded;
      const copy = model.clone(true);
      // Its own materials: each one playing fades by itself.
      const materials: MeshBasicMaterial[] = [];
      copy.traverse((o) => {
        if (!isMesh(o)) return;
        const material = (o.material as MeshBasicMaterial).clone();
        o.material = material;
        materials.push(material);
      });
      const root = new Group();
      root.add(copy);
      root.position.copy(at);
      root.rotation.z = turn;
      root.scale.setScalar(size * scale);
      scene.add(root);
      let mixer: AnimationMixer | null = null;
      if (clip) {
        mixer = new AnimationMixer(copy);
        const action = mixer.clipAction(clip);
        action.setLoop(LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
      }
      playing.add({ root, mixer, materials, t: 0, length: clip?.duration ?? PLAIN });
    },
    update(dt) {
      for (const effect of playing) {
        effect.t += dt;
        effect.mixer?.update(dt);
        const left = 1 - effect.t / effect.length;
        for (const material of effect.materials) material.opacity = Math.min(1, Math.max(0, left / FADE));
        if (left <= 0) {
          scene.remove(effect.root);
          for (const material of effect.materials) material.dispose();
          playing.delete(effect);
        }
      }
    },
  };
}
