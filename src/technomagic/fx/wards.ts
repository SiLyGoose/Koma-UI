import { AdditiveBlending, Color, FrontSide, Group, Mesh, MeshBasicMaterial, ShaderMaterial, SphereGeometry, SRGBColorSpace, TextureLoader, type Material, type Scene, type Texture, type Vector3 } from 'three';
import { EFFECTS, effectFolder, type HeroAssets } from '../assets';
import { fileUrl, isMesh } from '../engine/models';
import type { Props } from './props';

/*
 * What is kept on a hero while something guards it, for as long as it does: a shield on it (any hero's, unless
 * the skill has a look of its own) is the game's Common_Shield, a round bubble of light all round it (its file's dome
 * made a ball) with the file's ring of light on the floor under it; a skill with a look of its own (Clause's Guardian Shield) is that hero's own shield,
 * glowing, three of them going round it, spread evenly (a triangle), each facing out. Each comes up as it is put on, and fades as it goes.
 */

/** A hero's shield that is the look of one of its skills: by its name among that hero's props. */
export interface Emblem {
  hero: HeroAssets;
  name: string;
}

export interface Wards {
  /** What is on a hero this frame (by its index among the fighters): where it stands, whether a shield is on it, and the emblems of what else guards it. */
  keep(who: number, at: Vector3, shielded: boolean, emblems: readonly Emblem[]): void;
  /** Moves them on: each that wasn't kept since last time fades, and is gone once it has. */
  update(dt: number): void;
  clear(): void;
}

/**
 * The bubble: how far it reaches out from its middle, and how high that is over the floor (its foot is under the floor,
 * out of sight, as a ball sits round whoever stands in it); how big the ring on the floor is (as big as its file's
 * this many times); the colour it is lit (its file's picture's); how bright at its middle and at its rim.
 */
const BUBBLE = { radius: 1.75, high: 1.2, ring: 1.3, colour: 0xffe7b0, inner: 0.06, rim: 0.85, sharp: 2.4 };
/**
 * An emblem: how many go round its hero, how big each is, how far out from its hero's middle and how high, how fast they
 * go round (radians a second), how much each bobs (and how fast), and the colour of their glow.
 */
const EMBLEM = { count: 3, size: 0.9, out: 1.15, high: 1.1, spin: 1.6, bob: 0.06, pace: 2.2, glow: 0xffc65a };
/** How long one takes to come up, and to fade. */
const FADE = { up: 0.35, down: 0.4 };

interface Ward {
  root: Group;
  materials: { material: Material; most: number }[];
  /** How far up it is (0: gone, 1: all there), and how long it has been on. */
  shown: number;
  t: number;
  kept: boolean;
  /** Sets it where its hero stands, as far up as it is. */
  place(at: Vector3, shown: number, t: number): void;
}

/** A see-through bubble, lit most at its rim (as a ball of glass catches the light). */
function bubbleMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { colour: { value: new Color(BUBBLE.colour) }, opacity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 seen = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-seen.xyz);
        gl_Position = projectionMatrix * seen;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 colour;
      uniform float opacity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
        float light = ${BUBBLE.inner.toFixed(2)} + pow(rim, ${BUBBLE.sharp.toFixed(2)}) * ${BUBBLE.rim.toFixed(2)};
        gl_FragColor = vec4(colour * light * opacity, 1.0);
      }`,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: FrontSide,
  });
}

const ease = (k: number): number => 1 - (1 - k) * (1 - k);

export function makeWards(scene: Scene, props: Props): Wards {
  const wards = new Map<string, Ward>();
  const folder = effectFolder(EFFECTS.shield);
  const pictures = new TextureLoader();
  const picture = (file: string): Texture => {
    const map = pictures.load(fileUrl(folder, file));
    map.colorSpace = SRGBColorSpace;
    return map;
  };
  // The ring on the floor: its colour picture, how solid each part is by its other.
  const ring = props.shield ? { map: picture('Common_Shield01(Color).png'), alphaMap: picture('Common_Shield01(Alpha).png') } : null;
  const ball = new SphereGeometry(BUBBLE.radius, 48, 32);

  function bubble(): Ward | null {
    if (!props.shield || !ring) return null;
    const root = new Group();
    // The file's ring on the floor (its dome left out: a ball in its place).
    const model = props.shield.clone(true);
    const materials: Ward['materials'] = [];
    model.getObjectByName('Sphere01')?.removeFromParent();
    model.traverse((o) => {
      if (!isMesh(o)) return;
      o.frustumCulled = false;
      o.renderOrder = 9;
      const material = new MeshBasicMaterial({ ...ring, blending: AdditiveBlending, transparent: true, depthWrite: false });
      o.material = material;
      materials.push({ material, most: 1 });
    });
    const bubbled = new Mesh(ball, bubbleMaterial());
    bubbled.position.y = BUBBLE.high;
    bubbled.renderOrder = 9;
    materials.push({ material: bubbled.material, most: 1 });
    root.add(model, bubbled);
    return {
      root,
      materials,
      shown: 0,
      t: 0,
      kept: true,
      place(at, shown, t) {
        root.position.copy(at);
        // Swelling as it comes up, then breathing a little; and its ring turning slowly.
        const swell = (0.7 + 0.3 * ease(shown)) * (1 + 0.02 * Math.sin(t * 2.5));
        bubbled.scale.setScalar(swell);
        model.scale.setScalar(BUBBLE.ring * swell);
        root.rotation.y = t * 0.4;
      },
    };
  }

  /** One of an emblem's shields: itself, a little see-through; and over it the same again, as light, a little bigger: its glow. */
  function piece({ hero, name }: Emblem, materials: Ward['materials']): Group | null {
    const model = props.copy(hero, name);
    const glow = props.copy(hero, name);
    if (!model || !glow) return null;
    model.traverse((o) => {
      if (!isMesh(o)) return;
      o.frustumCulled = false;
      const material = new MeshBasicMaterial({ map: (o.material as MeshBasicMaterial).map, transparent: true, depthWrite: false, alphaTest: 0.05 });
      o.material = material;
      materials.push({ material, most: 0.85 });
    });
    glow.traverse((o) => {
      if (!isMesh(o)) return;
      o.frustumCulled = false;
      o.renderOrder = 9;
      const material = new MeshBasicMaterial({ map: (o.material as MeshBasicMaterial).map, color: EMBLEM.glow, blending: AdditiveBlending, transparent: true, depthWrite: false });
      o.material = material;
      materials.push({ material, most: 0.4 });
    });
    glow.scale.setScalar(1.08);
    const made = new Group();
    made.add(model, glow);
    made.scale.setScalar(EMBLEM.size);
    return made;
  }

  function emblem(look: Emblem): Ward | null {
    const root = new Group();
    const materials: Ward['materials'] = [];
    const pieces: Group[] = [];
    for (let i = 0; i < EMBLEM.count; i++) {
      const made = piece(look, materials);
      if (!made) return null;
      pieces.push(made);
      root.add(made);
    }
    return {
      root,
      materials,
      shown: 0,
      t: 0,
      kept: true,
      place(at, shown, t) {
        root.position.copy(at);
        // Going round it, spreading out to their places as they come up; each facing out (its face is the file's -z), bobbing in turn.
        root.rotation.y = t * EMBLEM.spin;
        const out = EMBLEM.out * (0.4 + 0.6 * ease(shown));
        pieces.forEach((made, i) => {
          const round = (i * Math.PI * 2) / EMBLEM.count;
          made.position.set(Math.sin(round) * out, EMBLEM.high - (1 - ease(shown)) * 0.5 + Math.sin(t * EMBLEM.pace + round) * EMBLEM.bob, Math.cos(round) * out);
          made.rotation.y = round + Math.PI;
        });
      },
    };
  }

  const remove = (key: string, ward: Ward): void => {
    scene.remove(ward.root);
    for (const { material } of ward.materials) material.dispose();
    wards.delete(key);
  };

  const keepOne = (key: string, make: () => Ward | null, at: Vector3): void => {
    let ward = wards.get(key);
    if (!ward) {
      const made = make();
      if (!made) return;
      ward = made;
      wards.set(key, ward);
      scene.add(ward.root);
    }
    ward.kept = true;
    ward.place(at, ward.shown, ward.t);
  };

  return {
    keep(who, at, shielded, emblems) {
      if (shielded) keepOne(`${who}`, bubble, at);
      for (const one of emblems) keepOne(`${who}/${one.hero.folder}/${one.name}`, () => emblem(one), at);
    },
    update(dt) {
      for (const [key, ward] of wards) {
        ward.t += dt;
        ward.shown = Math.min(1, Math.max(0, ward.shown + (ward.kept ? dt / FADE.up : -dt / FADE.down)));
        if (!ward.kept && ward.shown <= 0) {
          remove(key, ward);
          continue;
        }
        for (const { material, most } of ward.materials) {
          if (material instanceof ShaderMaterial) (material.uniforms.opacity as { value: number }).value = ward.shown * most;
          else material.opacity = ward.shown * most;
        }
        // Going: it stays where it was last, fading.
        ward.kept = false;
      }
    },
    clear() {
      for (const [key, ward] of wards) remove(key, ward);
    },
  };
}
