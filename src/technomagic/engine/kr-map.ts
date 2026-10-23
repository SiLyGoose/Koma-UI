import {
  BufferGeometry,
  CustomBlending,
  DoubleSide,
  DstAlphaFactor,
  DstColorFactor,
  Float32BufferAttribute,
  Group,
  Mesh,
  NoColorSpace,
  OneFactor,
  OneMinusDstAlphaFactor,
  OneMinusDstColorFactor,
  OneMinusSrcAlphaFactor,
  OneMinusSrcColorFactor,
  RepeatWrapping,
  ShaderMaterial,
  SrcAlphaFactor,
  SrcAlphaSaturateFactor,
  SrcColorFactor,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  Vector4,
  ZeroFactor,
  type BlendingDstFactor,
  type BlendingSrcFactor,
  type Texture,
} from 'three';

/*
 * A battle map of King's Raid's (KR-extracted/scripts/kr-map.py: a folder of its map.json and its pictures): each of
 * its meshes where the game puts it, drawn as the game's shader for it draws it. The game draws its maps before what
 * stands on them, in their render queue's order and mostly writing no depth (each layer painted over the last, the
 * fighters over them all); what is in a later queue than the fighters (a fog over the field) after them. Its pictures
 * are each tiled as their material has them; on some a glow moves (under its mask, pulsing), on a fog its smoke drifts.
 */

/** Where a map's own effect plays (in its own space: its place and its turn, a quaternion), and the stretch of the game's field (x) it plays for. */
export interface KrMapEffect {
  code: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
  scale: number;
  area: [number, number];
}

/** A texture slot: its picture, and its tiling (scale x and y, offset x and y). */
interface Slot {
  picture: string;
  st: [number, number, number, number];
}

/** A map's file (kr-map.py). */
interface KrMapFile {
  name: string;
  /** How the game sees it: how far down it looks, and how wide (degrees). */
  camera: { look: number; fov: number };
  pieces: {
    name: string;
    kind: 'map' | 'sky' | 'glow' | 'fog';
    /** Unity's blend factors (UnityEngine.Rendering.BlendMode) for what it draws, and over what is there. */
    blend: [number, number];
    depthWrite: boolean;
    queue: number;
    tint?: [number, number, number, number];
    main: Slot;
    alpha?: Slot;
    cutout?: number;
    glow?: { texture: Slot | null; mask: Slot | null; color: [number, number, number]; strength: number; speed: [number, number]; pulse: number };
    fog?: { noise: Slot | null; speed: [number, number]; noiseSpeed: [number, number]; noiseStrength: number; strength: number };
    position: number[];
    uv: number[];
    index: number[];
  }[];
  effects: KrMapEffect[];
}

/** A map read: what is drawn, how the game sees it, its own effects, and what moves on it (each frame). */
export interface KrMap {
  map: Group;
  camera: KrMapFile['camera'];
  effects: readonly KrMapEffect[];
  update(dt: number): void;
}

/** Unity's blend factors, as three.js has them. */
const FACTORS: readonly (BlendingSrcFactor & BlendingDstFactor)[] = [ZeroFactor, OneFactor, DstColorFactor, SrcColorFactor, OneMinusDstColorFactor, SrcAlphaFactor, OneMinusSrcColorFactor, DstAlphaFactor, OneMinusDstAlphaFactor, SrcAlphaSaturateFactor as BlendingSrcFactor & BlendingDstFactor, OneMinusSrcAlphaFactor];
/** The fighters' queue (Unity's Geometry and AlphaTest): what is drawn before it is the map under them. */
const FIGHTERS = 2500;

const VERTEX = /* glsl */ `
varying vec2 vUv;
varying float vHigh;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vHigh = world.y;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const FRAGMENT = /* glsl */ `
uniform sampler2D map;
uniform vec4 mapST;
uniform vec4 tint;
uniform float time;
varying float vHigh;
#ifdef ALPHA
uniform sampler2D alphaMap;
uniform vec4 alphaST;
#endif
#ifdef CUTOUT
uniform float cutout;
#endif
#ifdef GLOW
uniform sampler2D glowMap;
uniform vec4 glowST;
uniform sampler2D maskMap;
uniform vec4 maskST;
uniform vec3 glowColor;
uniform vec2 glowSpeed;
uniform float pulse;
#endif
#ifdef FOG
uniform sampler2D noiseMap;
uniform vec4 noiseST;
uniform vec2 speed;
uniform vec2 noiseSpeed;
uniform float noiseStrength;
uniform float strength;
#endif
varying vec2 vUv;
void main() {
#ifdef GROUNDED
  if (vHigh < -0.05) discard;
#endif
#ifdef FOG
  vec2 bend = texture2D(noiseMap, vUv * noiseST.xy + noiseST.zw + time * noiseSpeed).rg - 0.5;
  float smoke = texture2D(map, vUv * mapST.xy + mapST.zw + time * speed + bend * noiseStrength).r;
  gl_FragColor = vec4(tint.rgb, clamp(smoke * strength, 0.0, 1.0) * tint.a);
#else
  vec3 color = texture2D(map, vUv * mapST.xy + mapST.zw).rgb * tint.rgb;
  float alpha = tint.a;
  #ifdef ALPHA
  alpha *= texture2D(alphaMap, vUv * alphaST.xy + alphaST.zw).r;
  #endif
  #ifdef CUTOUT
  if (alpha < cutout) discard;
  #endif
  #ifdef GLOW
  float mask = texture2D(maskMap, vUv * maskST.xy + maskST.zw).r;
  vec3 glow = texture2D(glowMap, vUv * glowST.xy + glowST.zw + time * glowSpeed).rgb;
  color += glow * glowColor * mask * mix(1.0, 0.5 + 0.5 * sin(time * 3.14159), pulse);
  #endif
  gl_FragColor = vec4(color, alpha);
#endif
  #include <colorspace_fragment>
}`;

/**
 * Reads the map in `folder` (its pictures too). `grounded`: nothing of it under the floor is drawn (a flat map's, made for
 * the game's camera alone, that ours sees under). `apron`: its floor carried on toward the camera, mirrored at its front
 * edge as the game tiles it along the field (a floor no deeper than the game's camera sees: ours, further back, sees past it).
 */
export async function loadKrMap(folder: string, grounded = false, apron = false): Promise<KrMap> {
  const response = await fetch(`${folder}/map.json`);
  if (!response.ok) throw new Error(`The map in ${folder} isn't on this computer`);
  const file = (await response.json()) as KrMapFile;
  const loader = new TextureLoader();
  // (Colour pictures as colour; masks, alpha and noise as they are.)
  const colour = new Set(file.pieces.flatMap((piece) => [piece.main.picture, ...(piece.glow?.texture ? [piece.glow.texture.picture] : [])]));
  const names = new Set(file.pieces.flatMap((piece) => [piece.main, piece.alpha, piece.glow?.texture, piece.glow?.mask, piece.fog?.noise].filter((slot): slot is Slot => Boolean(slot)).map((slot) => slot.picture)));
  const pictures = new Map<string, Texture>(
    await Promise.all(
      [...names].map(async (name) => {
        const picture = await loader.loadAsync(`${folder}/${name}.webp`);
        picture.colorSpace = colour.has(name) ? SRGBColorSpace : NoColorSpace;
        picture.wrapS = picture.wrapT = RepeatWrapping;
        return [name, picture] as const;
      }),
    ),
  );
  const st = (slot: Slot): Vector4 => new Vector4(...slot.st);
  const time = { value: 0 };
  const map = new Group();
  map.name = file.name;
  for (const piece of file.pieces) {
    const shape = new BufferGeometry();
    shape.setAttribute('position', new Float32BufferAttribute(piece.position, 3));
    shape.setAttribute('uv', new Float32BufferAttribute(piece.uv, 2));
    shape.setIndex(piece.index);
    const defines: Record<string, string> = grounded ? { GROUNDED: '' } : {};
    const uniforms: Record<string, { value: unknown }> = {
      map: { value: pictures.get(piece.main.picture) },
      mapST: { value: st(piece.main) },
      tint: { value: new Vector4(...(piece.tint ?? [1, 1, 1, 1])) },
      time,
    };
    if (piece.alpha) {
      defines.ALPHA = '';
      uniforms.alphaMap = { value: pictures.get(piece.alpha.picture) };
      uniforms.alphaST = { value: st(piece.alpha) };
    }
    if (piece.cutout !== undefined) {
      defines.CUTOUT = '';
      uniforms.cutout = { value: piece.cutout };
    }
    const { glow, fog } = piece;
    if (glow?.texture && glow.mask) {
      defines.GLOW = '';
      Object.assign(uniforms, {
        glowMap: { value: pictures.get(glow.texture.picture) },
        glowST: { value: st(glow.texture) },
        maskMap: { value: pictures.get(glow.mask.picture) },
        maskST: { value: st(glow.mask) },
        glowColor: { value: new Vector3(...glow.color).multiplyScalar(glow.strength) },
        glowSpeed: { value: new Vector2(...glow.speed) },
        pulse: { value: glow.pulse },
      });
    }
    if (fog?.noise) {
      defines.FOG = '';
      Object.assign(uniforms, {
        noiseMap: { value: pictures.get(fog.noise.picture) },
        noiseST: { value: st(fog.noise) },
        speed: { value: new Vector2(...fog.speed) },
        noiseSpeed: { value: new Vector2(...fog.noiseSpeed) },
        noiseStrength: { value: fog.noiseStrength },
        strength: { value: fog.strength },
      });
    }
    const under = piece.queue < FIGHTERS;
    const look = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      defines,
      uniforms,
      side: DoubleSide,
      blending: CustomBlending,
      blendSrc: FACTORS[piece.blend[0]] ?? OneFactor,
      blendDst: FACTORS[piece.blend[1]] ?? ZeroFactor,
      // Under the fighters: painted in the game's order before them (what writes no depth isn't hidden by what is
      // before it either). Over them: as anything seen through is.
      transparent: !under,
      depthWrite: piece.depthWrite,
      depthTest: !under || piece.depthWrite,
      fog: false,
    });
    const mesh = new Mesh(shape, look);
    mesh.name = piece.name;
    mesh.renderOrder = under ? piece.queue - 10_000 : piece.queue - 3000;
    // (It is seen from inside, and its parts far from its middle: never left out.)
    mesh.frustumCulled = false;
    map.add(mesh);
  }
  if (apron) {
    // The floor: what lies flat on the ground. Its front is toward the game's camera (-z).
    const flat = map.children.filter((mesh): mesh is Mesh => {
      if (!(mesh instanceof Mesh)) return false;
      mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox;
      return box !== null && box.min.y > -0.5 && box.max.y < 0.5;
    });
    const front = Math.min(...flat.map((mesh) => mesh.geometry.boundingBox?.min.z ?? 0));
    for (const mesh of flat) {
      const mirrored = mesh.clone();
      mirrored.name = `${mesh.name} (apron)`;
      mirrored.scale.z = -1;
      mirrored.position.z = 2 * front;
      map.add(mirrored);
    }
  }
  return {
    map,
    camera: file.camera,
    effects: file.effects,
    update(dt) {
      time.value += dt;
    },
  };
}
