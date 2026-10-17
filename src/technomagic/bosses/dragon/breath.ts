import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, Points, PointsMaterial, type Object3D, type Vector3 } from 'three';

/*
 * A dragon's breath: a stream of light from its mouth over the heroes, billowing out as it goes (fire, ice, venom or black
 * flame, by its colours), and a burst where a blow of it lands. Drawn over everything, each puff fading as it goes.
 */

const COUNT = 2400;
/** Puffs a second in its breath, how long one takes to get there, how far they spread, and how big they grow. */
const RATE = 900;
const FLIGHT = 0.5;
const SPREAD = 3.2;
const SIZE = 2.6;

export interface Breath {
  /** Breathes for `dt` seconds from a place toward another. */
  pour(from: Vector3, to: Vector3, dt: number): void;
  /** A burst at a place. */
  burst(at: Vector3): void;
  update(dt: number): void;
}

/** A soft round puff. */
function puff(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  const glow = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(canvas);
}

/** A breath in `scene`, its puffs `core` where it is hottest and `edge` as they fade. */
export function makeBreath(scene: Object3D, core: number, edge: number): Breath {
  const places = new Float32Array(COUNT * 3);
  const colours = new Float32Array(COUNT * 3);
  const speeds = new Float32Array(COUNT * 3);
  const left = new Float32Array(COUNT);
  const lives = new Float32Array(COUNT);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(places, 3));
  geometry.setAttribute('color', new BufferAttribute(colours, 3));
  const points = new Points(geometry, new PointsMaterial({ size: SIZE, map: puff(), vertexColors: true, transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending }));
  points.frustumCulled = false;
  points.renderOrder = 9;
  scene.add(points);
  const hot = new Color(core);
  const cool = new Color(edge);

  let next = 0;
  let owed = 0;
  const emit = (x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number): void => {
    const i = next;
    next = (next + 1) % COUNT;
    places.set([x, y, z], i * 3);
    speeds.set([vx, vy, vz], i * 3);
    left[i] = lives[i] = life;
  };
  const spread = (): number => (Math.random() - 0.5) * 2;

  return {
    pour(from, to, dt) {
      owed += dt * RATE;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dz = to.z - from.z;
      while (owed >= 1) {
        owed--;
        const k = (0.8 + Math.random() * 0.4) / FLIGHT;
        emit(from.x, from.y, from.z, dx * k + spread() * SPREAD, dy * k + spread() * SPREAD * 0.5, dz * k + spread() * SPREAD, FLIGHT * (0.9 + Math.random() * 0.5));
      }
    },
    burst(at) {
      for (let i = 0; i < 90; i++) {
        const speed = 2 + Math.random() * 7;
        const round = Math.random() * Math.PI * 2;
        const up = Math.random() * 1.4 - 0.1;
        emit(at.x, at.y, at.z, Math.cos(round) * speed, up * speed, Math.sin(round) * speed * 0.6, 0.35 + Math.random() * 0.4);
      }
    },
    update(dt) {
      for (let i = 0; i < COUNT; i++) {
        if ((left[i] as number) <= 0) continue;
        left[i] = (left[i] as number) - dt;
        const at = i * 3;
        // (Slowing as it billows out, and rising a little: hot air.)
        for (let axis = 0; axis < 3; axis++) {
          speeds[at + axis] = (speeds[at + axis] as number) * (1 - 0.5 * dt);
          places[at + axis] = (places[at + axis] as number) + (speeds[at + axis] as number) * dt;
        }
        places[at + 1] = (places[at + 1] as number) + 0.8 * dt;
        // From its hottest to its edge's colour, dimming to nothing.
        const k = Math.max(0, (left[i] as number) / (lives[i] as number));
        const fade = k ** 0.8;
        colours[at] = (cool.r + (hot.r - cool.r) * k) * fade;
        colours[at + 1] = (cool.g + (hot.g - cool.g) * k) * fade;
        colours[at + 2] = (cool.b + (hot.b - cool.b) * k) * fade;
      }
      (geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
      (geometry.getAttribute('color') as BufferAttribute).needsUpdate = true;
    },
  };
}
