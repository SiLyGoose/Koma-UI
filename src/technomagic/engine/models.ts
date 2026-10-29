import { CanvasTexture, CustomBlending, DoubleSide, FrontSide, LoadingManager, MeshBasicMaterial, NoColorSpace, OneFactor, RepeatWrapping, SRGBColorSpace, Texture, Vector2, Vector3, Vector4, type Group, type Material, type Mesh } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { built, builtSmall, texturesBuilt } from '../../shared/built';
import { LOCAL } from '../assets';
import { lowMemory } from './memory';
import { AURAS, type Aura, type AuraPicture } from './auras';

/*
 * Loads the models (../assets/ names them): each folder's .fbx, drawn with its textures. A texture comes as two
 * pictures, "…_D(RGB).png" (the colour) and "…_D(AS).png" (its red is how solid each part is), put
 * together here into one; some heroes' files name them "…_D.png" and "…_AS.png". The colour already has
 * its shading painted in, so it is drawn as it is, unlit. A costume's aura (./auras.ts: the shells whose light flows over Glory League's
 * Glaring Honor tiers) is drawn as King's Raid's shader draws it: auraMaterial().
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

/** The auras' clock (the page's, in seconds): set as each is drawn, so every one flows at the same time. */
const auraTime = { value: 0 };
const auraPictures = new Map<string, Promise<Texture>>();

/** One of an aura's pictures (its numbers as they are: they're worked with as King's Raid's shader has them), repeating. */
function auraPicture(file: string): Promise<Texture> {
  let made = auraPictures.get(file);
  if (!made) {
    const own = `${ROOT}/${file}`;
    const at = (url: string): string => url.split('/').map(encodeURIComponent).join('/');
    // (Built as WebP, smaller: else the picture as it is.)
    made = picture(at(built(own)))
      .catch(() => picture(at(own)))
      .then((image) => {
        const texture = new Texture(image);
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.colorSpace = NoColorSpace;
        texture.needsUpdate = true;
        return texture;
      });
    auraPictures.set(file, made);
  }
  return made;
}

/** A picture's place on the mesh, as the shader takes it: its repeat and start (x, y, z, w), and its scroll a second and strength (x, y, z). */
const placeOf = (one: AuraPicture | undefined): { st: Vector4; move: Vector3 } => ({
  st: new Vector4(one?.scale[0] ?? 1, one?.scale[1] ?? 1, one?.offset[0] ?? 0, one?.offset[1] ?? 0),
  move: new Vector3(one?.speed[0] ?? 0, one?.speed[1] ?? 0, one?.str ?? 1),
});

/**
 * A costume's aura, as King's Raid draws it (./auras.ts): added onto what is behind it, not hiding it (nor what is drawn after
 * it), its pictures scrolling on the auras' clock. 'mask' (Vespa/ShaderForge/Addtive_Aura_Mask): colour × main (moved by the
 * noise's red) × tile's red × mask; 'flow': colour × its picture (moved by the noise, as a normal map), × its mask's red where it
 * has one. Worked out in the pictures' own numbers, as the game does, and made the screen's at the end.
 */
async function auraMaterial(name: string, aura: Aura): Promise<MeshBasicMaterial> {
  const [main, tile, noise, mask] = await Promise.all([aura.main, aura.tile, aura.noise, aura.mask].map((one) => (one ? auraPicture(one.file) : Promise.resolve(null))));
  const material = new MeshBasicMaterial({ name, map: main, side: FrontSide, transparent: true, depthWrite: false, blending: CustomBlending, blendSrc: OneFactor, blendDst: OneFactor });
  const uniforms = {
    auraTime,
    auraKind: { value: aura.kind === 'mask' ? 0 : 1 },
    auraColor: { value: new Vector3(aura.color[0] ?? 1, aura.color[1] ?? 1, aura.color[2] ?? 1) },
    auraTile: { value: tile ?? main },
    auraNoise: { value: noise ?? main },
    auraMask: { value: mask ?? main },
    auraHas: { value: new Vector3(tile ? 1 : 0, noise ? 1 : 0, mask ? 1 : 0) },
    auraMainSt: { value: placeOf(aura.main).st },
    auraMainMove: { value: placeOf(aura.main).move },
    auraTileSt: { value: placeOf(aura.tile).st },
    auraTileMove: { value: placeOf(aura.tile).move },
    auraNoiseSt: { value: placeOf(aura.noise).st },
    auraNoiseMove: { value: placeOf(aura.noise).move },
    auraMaskSt: { value: placeOf(aura.mask).st },
    auraMaskStr: { value: new Vector2(aura.mask?.str ?? 1, 0) },
  };
  // (One program for every aura; another for those coloured as a fighter is: mixable().)
  material.customProgramCacheKey = () => (mixes.has(material) ? 'kr-aura-mixed' : 'kr-aura');
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float auraTime;
uniform int auraKind;
uniform vec3 auraColor;
uniform sampler2D auraTile;
uniform sampler2D auraNoise;
uniform sampler2D auraMask;
uniform vec3 auraHas;
uniform vec4 auraMainSt;
uniform vec3 auraMainMove;
uniform vec4 auraTileSt;
uniform vec3 auraTileMove;
uniform vec4 auraNoiseSt;
uniform vec3 auraNoiseMove;
uniform vec4 auraMaskSt;
uniform vec2 auraMaskStr;`,
      )
      .replace(
        '#include <map_fragment>',
        `vec2 auraUv = vMapUv;
  vec4 auraN = texture2D(auraNoise, (auraUv + fract(auraTime * auraNoiseMove.xy)) * auraNoiseSt.xy + auraNoiseSt.zw);
  // (mask: the noise's red moves it; flow: the noise as a normal map, its red and green about the middle.)
  vec2 auraWarp = auraHas.y * auraNoiseMove.z * (auraKind == 0 ? vec2(auraN.r) : auraN.rg * 2.0 - 1.0);
  vec3 auraMain = texture2D(map, ((auraUv + fract(auraTime * auraMainMove.xy)) + auraWarp) * auraMainSt.xy + auraMainSt.zw).rgb * auraMainMove.z;
  float auraTileLight = mix(1.0, texture2D(auraTile, (auraUv + fract(auraTime * auraTileMove.xy)) * auraTileSt.xy + auraTileSt.zw).r * auraTileMove.z, auraHas.x);
  vec4 auraM = texture2D(auraMask, auraUv * auraMaskSt.xy + auraMaskSt.zw);
  vec3 auraMasked = auraKind == 0 ? mix(vec3(1.0), auraM.rgb, auraHas.z) : vec3(mix(1.0, auraM.r * auraMaskStr.x, auraHas.z));
  vec3 aura = auraColor * auraMasked * auraMain * auraTileLight;
  // (Worked out in the pictures' numbers, as the game's are: made the screen's own, as the end of the shader makes them again.)
  diffuseColor.rgb = pow(max(aura, vec3(0.0)), vec3(2.2));`,
      );
  };
  return material;
}

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
    // A costume's aura: as King's Raid draws it.
    const aura = AURAS[name];
    if (!made && aura) {
      made = auraMaterial(name, aura);
      drawn.set(key, made);
    }
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
          // An aura's clock, set as it's drawn.
          if (made.some((material) => AURAS[material.name])) o.onBeforeRender = () => void (auraTime.value = performance.now() / 1000);
        }),
      );
    }),
  );
  await Promise.all(waiting);
  return models;
}

/** Every material a model is drawn with (to tint it when it is hit, and colour it as a skill does: mixColor()). */
export function materialsOf(models: readonly Group[]): MeshBasicMaterial[] {
  const all = new Set<MeshBasicMaterial>();
  for (const model of models)
    model.traverse((o) => {
      if (isMesh(o)) for (const material of [o.material].flat()) all.add(material as MeshBasicMaterial);
    });
  for (const material of all) mixable(material);
  return [...all];
}

/** Each material's colour mix (mixColor()). */
const mixes = new WeakMap<Material, { value: Vector4 }>();

/**
 * Lets a material be coloured as King's Raid's shaders colour a fighter (their _ColorMix: what a skill puts on it,
 * Galgoria's Swamp Imprisonment): drawn rgb·(1 − a) + mix.rgb, in the picture's own colours (after they are made the
 * screen's, as the game's are kept). Given as it is read, so it isn't compiled again mid-fight; none (0) till it is set.
 */
function mixable(material: MeshBasicMaterial): void {
  if (mixes.has(material)) return;
  const mix = { value: new Vector4(0, 0, 0, 0) };
  mixes.set(material, mix);
  // (After what it is drawn with already: an aura's.)
  const before = material.onBeforeCompile.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    before(shader, renderer);
    shader.uniforms.colorMix = mix;
    shader.fragmentShader = `uniform vec4 colorMix;\n${shader.fragmentShader.replace('#include <colorspace_fragment>', '#include <colorspace_fragment>\n\tgl_FragColor.rgb = gl_FragColor.rgb * (1.0 - colorMix.a) + colorMix.rgb;')}`;
  };
  material.needsUpdate = true;
}

/** Colours what a fighter is drawn with (its materialsOf()) by King's Raid's colour mix `mix` (rgb added, a how much of its own colour goes); (0, 0, 0, 0): its own. */
export function mixColor(materials: readonly MeshBasicMaterial[], mix: Vector4): void {
  for (const material of materials) mixes.get(material)?.value.copy(mix);
}
