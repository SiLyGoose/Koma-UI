import type { PinecraftOre } from '../protocol';
import { ORE_COLOR } from './textures';
import type { Scene } from './scene';

/** Adds the chips a dug block throws off (and sparks, for an ore). */
export function burst(scene: Scene, x: number, y: number, ground: 'dirt' | 'stone', ore: PinecraftOre | null, now: number): void {
  const chip = ground === 'stone' ? ['#77787b', '#5a5b5f', '#8d8e91'] : ['#6b4f35', '#533c28', '#7d5d40'];
  const add = (color: string, speed: number, size: number, life: number): void => {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.5 + Math.random());
    scene.particles.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, size, color, born: now, life });
  };
  for (let k = 0; k < 12; k++) add(chip[k % chip.length] as string, 3, 0.09 + Math.random() * 0.06, 500 + Math.random() * 250);
  if (ore) {
    const { gem, shine } = ORE_COLOR[ore];
    for (let k = 0; k < 14; k++) add(k % 2 ? gem : shine, 4.5, 0.07 + Math.random() * 0.05, 700 + Math.random() * 300);
  }
}

/** Moves the particles on by `dt` ms (they spread out and slow down), and forgets the ones that are gone. */
export function stepParticles(scene: Scene, dt: number, now: number): void {
  const t = dt / 1000;
  const drag = Math.exp(-4 * t);
  scene.particles = scene.particles.filter((p) => now - p.born < p.life);
  for (const p of scene.particles) {
    p.vx *= drag;
    p.vy *= drag;
    p.x += p.vx * t;
    p.y += p.vy * t;
  }
}
