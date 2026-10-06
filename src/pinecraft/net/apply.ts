import { points, replay } from '../../shared/util';
import { centerCamera } from '../camera';
import { burst } from '../draw';
import { breakSounds, floatText, keysGap, renderEnergy, renderHud, renderOreTip } from '../hud';
import type { WorldEvent, WorldState } from '../protocol';
import { play } from '../sfx';
import { state } from '../state';
import { ui } from '../ui';

/** The bot's word on the world, and what the last move did (`dug`: the block the page was digging). */
export function apply(world: WorldState, event: WorldEvent | undefined, moveCharacter: boolean, dug: { x: number; y: number } | null): void {
  const now = performance.now();
  const first = state.scene === null;
  if (!state.scene) {
    state.scene = { state: world, known: new Map(), cam: { x: 0, y: 0 }, character: { x: world.x, y: world.y }, facing: 1, swing: null, digging: null, particles: [], keysGap: keysGap(), keysGoneAt: null };
    state.keysFrom = { x: world.x, y: world.y };
    renderOreTip(world);
  }
  const { scene } = state;
  // A new week: a fresh mine. Forget the old one's blocks, and start from the room.
  if (!first && world.week && scene.state.week && world.week !== scene.state.week) {
    scene.known.clear();
    scene.particles = [];
    scene.digging = null;
    scene.swing = null;
    scene.character = { x: world.x, y: world.y };
    state.worldMap = null;
    moveCharacter = true;
    ui.log.textContent = '🔄 New week, new mine! Your energy and earnings are kept.';
  }
  // An answer behind the page's own walks: the page's idea of where the character is stands.
  if (!moveCharacter) {
    world.x = scene.state.x;
    world.y = scene.state.y;
  }
  scene.state = world;
  const known = scene.known;
  world.rows.forEach((row, k) => {
    const y = world.top + k;
    for (let i = 0; i < row.length; i++) known.set(y * world.size + world.left + i, row[i] as string);
  });
  if (moveCharacter) state.target = { x: world.x, y: world.y };
  if (first) centerCamera(true);

  state.energy = { count: world.energy, max: world.maxEnergy, nextAt: world.nextEnergyMs === null ? null : now + world.nextEnergyMs, every: world.energyMs };
  renderHud(world);
  renderEnergy(now);

  if (event) {
    if (event.kind === 'dig' && dug) {
      breakSounds([event, ...(event.blast ?? [])]);
      burst(scene, dug.x, dug.y, event.ground, event.ore, now);
      if (event.ore) floatText(dug.x, dug.y, `+${points(event.points)}${event.lucky ? ' ×2' : ''}`, event.lucky ? '#7dffb0' : '#ffd84a');
      else if (event.points > 0) floatText(dug.x, dug.y, `+${points(event.points)}`, '#d8cbb8');
      // An Amethyst Pickaxe's free dig: above the points, when there are some.
      if (event.free) floatText(dug.x, event.points > 0 ? dug.y - 0.4 : dug.y, 'Free ⚡', '#c9a2ff');
      // A blast: every block around goes at once.
      if (event.blast) {
        for (const b of event.blast) {
          burst(scene, b.x, b.y, b.ground, b.ore, now);
          if (b.ore) floatText(b.x, b.y, `+${points(b.points)}${b.lucky ? ' ×2' : ''}`, b.lucky ? '#7dffb0' : '#ffb057');
        }
        replay(ui.wrap, 'shake');
      }
    }
    if (event.kind === 'tired') replay(ui.energy.parentElement as HTMLElement, 'shake');
    if (event.kind === 'tired' || event.kind === 'bedrock') play('cancel');
  }
}
