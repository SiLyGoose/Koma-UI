import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Points, PointsMaterial, type Scene, type Vector3 } from 'three';

/*
 * Galgoria's venom: a spray of purple drops from a mouth to whoever it is spat at, and a splash where it
 * lands. Drops of light, drawn over everything, each fading as it goes.
 */

const COUNT = 1000;
/** Drops a second in a spray, how long one takes to get there, and how far they scatter. */
const RATE = 620;
const FLIGHT = 0.28;
const SCATTER = 2.4;
const FALL = 5;

export interface Venom {
  /** Sprays for `dt` seconds from a place to another. */
  spray(from: Vector3, to: Vector3, dt: number): void;
  /** A splash at a place. */
  splash(at: Vector3): void;
  update(dt: number): void;
}

/** A soft round drop. */
function drop(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  const glow = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(canvas);
}

export function makeVenom(scene: Scene): Venom {
  const places = new Float32Array(COUNT * 3);
  const colours = new Float32Array(COUNT * 3);
  const speeds = new Float32Array(COUNT * 3);
  const left = new Float32Array(COUNT);
  const lives = new Float32Array(COUNT);
  const tones = new Float32Array(COUNT);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(places, 3));
  geometry.setAttribute('color', new BufferAttribute(colours, 3));
  const points = new Points(geometry, new PointsMaterial({ size: 1.5, map: drop(), vertexColors: true, transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending }));
  points.frustumCulled = false;
  points.renderOrder = 9;
  scene.add(points);

  let next = 0;
  let owed = 0;
  const emit = (x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number): void => {
    const i = next;
    next = (next + 1) % COUNT;
    places.set([x, y, z], i * 3);
    speeds.set([vx, vy, vz], i * 3);
    left[i] = lives[i] = life;
    tones[i] = Math.random();
  };
  const spread = (): number => (Math.random() - 0.5) * 2;

  return {
    spray(from, to, dt) {
      owed += dt * RATE;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dz = to.z - from.z;
      while (owed >= 1) {
        owed--;
        const k = (0.85 + Math.random() * 0.3) / FLIGHT;
        // Aimed a little high: the drops fall on the way.
        emit(from.x + spread() * 0.2, from.y + spread() * 0.2, from.z + spread() * 0.2, dx * k + spread() * SCATTER, dy * k + spread() * SCATTER + FALL * FLIGHT * 0.5, dz * k + spread() * SCATTER, FLIGHT * (0.95 + Math.random() * 0.25));
      }
    },
    splash(at) {
      for (let i = 0; i < 70; i++) {
        const speed = 2 + Math.random() * 6;
        const round = Math.random() * Math.PI * 2;
        const up = Math.random() * 1.2 - 0.2;
        emit(at.x, at.y, at.z, Math.cos(round) * speed, up * speed, Math.sin(round) * speed * 0.6, 0.3 + Math.random() * 0.35);
      }
    },
    update(dt) {
      for (let i = 0; i < COUNT; i++) {
        if ((left[i] as number) <= 0) continue;
        left[i] = (left[i] as number) - dt;
        const at = i * 3;
        speeds[at + 1] = (speeds[at + 1] as number) - FALL * dt;
        for (let axis = 0; axis < 3; axis++) places[at + axis] = (places[at + axis] as number) + (speeds[at + axis] as number) * dt;
        // Purple, some drops pinker than others, dimming to nothing.
        const k = Math.max(0, (left[i] as number) / (lives[i] as number)) ** 0.7;
        const tone = tones[i] as number;
        colours[at] = (0.5 + tone * 0.35) * k;
        colours[at + 1] = (0.12 + tone * 0.2) * k;
        colours[at + 2] = 1 * k;
      }
      (geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
      (geometry.getAttribute('color') as BufferAttribute).needsUpdate = true;
    },
  };
}
