import { CanvasTexture, DoubleSide, LoadingManager, MeshBasicMaterial, SRGBColorSpace, Texture, type Group, type Material, type Mesh } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { built, builtSmall, texturesBuilt } from '../../shared/built';
import { LOCAL } from '../assets';
import { lowMemory } from './memory';

/*
 * Loads the models (../assets/ names them): each folder's .fbx, drawn with its textures. A texture comes as two
 * pictures, "…_D(RGB).png" (the colour) and "…_D(AS).png" (its red is how solid each part is), put
 * together here into one; some heroes' files name them "…_D.png" and "…_AS.png". The colour already has
 * its shading painted in, so it is drawn as it is, unlit.
 */

const ROOT = LOCAL;

/** A texture's colour picture, by the name of either of its two; and its (AS) picture, by its colour's (the same name: it has none). */
const colourOf = (file: string): string => file.replace('(AS)', '(RGB)').replace(/_AS(\.\w+)$/, '_D$1');
const solidOf = (file: string): string => file.replace('(RGB)', '(AS)').replace(/_D(\.\w+)$/, '_AS$1');
const BLANK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/** Where a folder's file is: the folder is a path under public/kr/ (heroes/kirze/models/…). */
export const fileUrl = (folder: string, file: string): string => `${ROOT}/${[...folder.split('/'), file].map(encodeURIComponent).join('/')}`;

// The loader's own textures are left blank: they are put together here instead (texture()).
const manager = new LoadingManager();
manager.setURLModifier((url) => (/\.(png|jpe?g|tga|bmp|dds)$/i.test(url) ? BLANK : url));

function picture(url: string): Promise<HTMLImageElement> {
  return new Promise((done, failed) => {
    const img = new Image();
    img.onload = () => done(img);
    img.onerror = () => failed(new Error(`No picture at ${url}`));
    img.src = url;
  });
}

const textures = new Map<string, Promise<Texture>>();

/**
 * A folder's colour picture, see-through where its (AS) picture says. Once built, the two come as one picture
 * (scripts/pictures.mjs: a tenth of their size, nothing to put together here; a big one at half its size on a device
 * short of memory); else, or if that can't be read,
 * they're put together here.
 */
function texture(folder: string, file: string): Promise<Texture> {
  const key = `${folder}/${file}`;
  let made = textures.get(key);
  if (!made) {
    made = (async () => {
      const own = `${ROOT}/${folder}/${file}`;
      if (texturesBuilt(own)) {
        const read = (url: string): Promise<HTMLImageElement | null> => picture(url.split('/').map(encodeURIComponent).join('/')).catch(() => null);
        // (Short of memory, a big one at half its size, where there is one: ./memory.ts.)
        const small = lowMemory() ? builtSmall(own) : null;
        const whole = (small && (await read(small))) || (await read(built(own)));
        if (whole) {
          const ready = new Texture(whole);
          ready.colorSpace = SRGBColorSpace;
          ready.needsUpdate = true;
          return ready;
        }
      }
      const colour = await picture(fileUrl(folder, file));
      const solid = solidOf(file) === file ? null : await picture(fileUrl(folder, solidOf(file))).catch(() => null);
      const canvas = document.createElement('canvas');
      canvas.width = colour.naturalWidth;
      canvas.height = colour.naturalHeight;
      const g = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
      if (solid) {
        g.drawImage(solid, 0, 0, canvas.width, canvas.height);
        const alpha = g.getImageData(0, 0, canvas.width, canvas.height).data;
        g.drawImage(colour, 0, 0);
        const pixels = g.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < alpha.length; i += 4) pixels.data[i + 3] = alpha[i] as number;
        g.putImageData(pixels, 0, 0);
      } else {
        g.drawImage(colour, 0, 0);
      }
      const made = new CanvasTexture(canvas);
      made.colorSpace = SRGBColorSpace;
      return made;
    })();
    textures.set(key, made);
  }
  return made;
}

export const isMesh = (o: unknown): o is Mesh => (o as Mesh).isMesh === true;

/** A folder's model as its file has it (a .fbx of the folder's own name), its textures left blank (an effect's are its own: ../fx/effects.ts). */
export const loadFbx = (folder: string): Promise<Group> => new FBXLoader(manager).loadAsync(fileUrl(folder, `${folder.split('/').at(-1)}.fbx`));

/**
 * The models in `folders`, in their order. A material with no texture of its own in its file (a face's
 * eyebrows, in the hair's) takes the one a material of the same name has in another of the folders. With
 * `repaint`, a texture whose name has `from` in it is the same picture of `to` instead, from the folder `at`.
 * `pictures`: by material name, the picture a file names for it that three.js's loader drops (../assets/types.ts).
 */
export async function loadModels(folders: readonly string[], repaint?: { from: string; to: string; at: string }, pictures?: Readonly<Record<string, string>>): Promise<Group[]> {
  const models = await Promise.all(folders.map(loadFbx));

  // Where each material's texture is: the file names it by its picture's name (or `pictures` does, where three.js's loader
  // drops the one its file names).
  const pictureOf = (material: Material & { map?: Texture | null }): string | undefined => material.map?.name || pictures?.[material.name];
  const found = new Map<string, { folder: string; file: string }>();
  const each = (visit: (material: Material & { map?: Texture | null }, folder: string) => void): void => {
    models.forEach((model, i) =>
      model.traverse((o) => {
        if (isMesh(o)) for (const material of [o.material].flat()) visit(material, folders[i] as string);
      }),
    );
  };
  each((material, folder) => {
    const picture = pictureOf(material);
    if (picture) found.set(material.name, { folder, file: colourOf(picture) });
  });

  const drawn = new Map<string, Promise<MeshBasicMaterial>>();
  const draw = (name: string, folder: string, file: string | undefined): Promise<MeshBasicMaterial> => {
    const key = `${folder}/${file}/${name}`;
    let made = drawn.get(key);
    if (!made) {
      // An "Effect" material is a see-through layer (a glow, a veil); the rest is cut out where it isn't solid.
      const veil = /effect/i.test(name);
      made = (file ? texture(folder, file) : Promise.resolve(null)).then(
        (map) => new MeshBasicMaterial({ name, map, side: DoubleSide, transparent: veil, depthWrite: !veil, alphaTest: veil ? 0 : 0.5 }),
      );
      drawn.set(key, made);
    }
    return made;
  };

  const waiting: Promise<void>[] = [];
  models.forEach((model, i) =>
    model.traverse((o) => {
      if (!isMesh(o)) return;
      // A skinned mesh is drawn where its bones are, which its box (taken standing still) doesn't follow.
      o.frustumCulled = false;
      const materials = [o.material].flat() as (Material & { map?: Texture | null })[];
      waiting.push(
        Promise.all(
          materials.map((material) => {
            const picture = pictureOf(material);
            const named = picture ? { folder: folders[i] as string, file: colourOf(picture) } : found.get(material.name);
            const own = repaint && named?.file.includes(repaint.from) ? { folder: repaint.at, file: named.file.replace(repaint.from, repaint.to) } : named;
            return draw(material.name, own?.folder ?? (folders[i] as string), own?.file);
          }),
        ).then((made) => {
          o.material = Array.isArray(o.material) ? made : (made[0] as MeshBasicMaterial);
        }),
      );
    }),
  );
  await Promise.all(waiting);
  return models;
}

/** Every material a model is drawn with (to tint it when it is hit). */
export function materialsOf(models: readonly Group[]): MeshBasicMaterial[] {
  const all = new Set<MeshBasicMaterial>();
  for (const model of models)
    model.traverse((o) => {
      if (isMesh(o)) for (const material of [o.material].flat()) all.add(material as MeshBasicMaterial);
    });
  return [...all];
}
