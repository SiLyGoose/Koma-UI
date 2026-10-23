import { AdditiveBlending, Color, FrontSide, Group, Mesh, MeshBasicMaterial, ShaderMaterial, SphereGeometry, SRGBColorSpace, TextureLoader, type Material, type Scene, type Texture, type Vector3 } from 'three';
import { EFFECTS, effectFolder } from '../assets';
import { fileUrl, isMesh } from '../engine/models';
import type { Props } from './props';

/*
 * What is kept on a hero while a shield is on it, for as long as it is: the game's Common_Shield, a round bubble of light
 * all round it (its file's dome made a ball) with the file's ring of light on the floor under it. It comes up as it is
 * put on, and fades as it goes. (A skill's look of its own kept on a hero, Klaus's Guardian Shield's, is the game's own
 * effect: its hero's assets' wards, played by ../fight/view.ts.)
 */

export interface Wards {
  /** What is on a hero this frame (by its index among the fighters): where it stands, how tall it is, and whether a shield is on it. */
  keep(who: number, at: Vector3, tall: number, shielded: boolean): void;
  /** Moves them on: each that wasn't kept since last time fades, and is gone once it has. */
  update(dt: number): void;
  clear(): void;
}

/**
 * The bubble: how far it reaches out from its middle, and how high that is over the floor (its foot is under the floor,
 * out of sight, as a ball sits round whoever stands in it); how big the ring on the floor is (as big as its file's
 * this many times); the colour it is lit (its file's picture's); how bright at its middle and at its rim. All of it is
 * made bigger or smaller for each hero, for its top to be `headroom` over the top of its head (its hair, its horns).
 */
const BUBBLE = { radius: 1.75, high: 1.2, ring: 1.3, colour: 0xffe7b0, inner: 0.06, rim: 0.85, sharp: 2.4, headroom: 0.35 };
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

  function bubble(tall: number): Ward | null {
    if (!props.shield || !ring) return null;
    const fit = (tall + BUBBLE.headroom) / (BUBBLE.high + BUBBLE.radius);
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
    bubbled.position.y = BUBBLE.high * fit;
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
        const swell = fit * (0.7 + 0.3 * ease(shown)) * (1 + 0.02 * Math.sin(t * 2.5));
        bubbled.scale.setScalar(swell);
        model.scale.setScalar(BUBBLE.ring * swell);
        root.rotation.y = t * 0.4;
      },
    };
  }

  const remove = (key: string, ward: Ward): void => {
    // (Its materials let go of, not disposed: disposing the last one using a shader program deletes it, compiled again mid-fight as the next one draws. ./kr-vfx-player.js dispose().)
    scene.remove(ward.root);
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
    keep(who, at, tall, shielded) {
      if (shielded) keepOne(`${who}`, () => bubble(tall), at);
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
