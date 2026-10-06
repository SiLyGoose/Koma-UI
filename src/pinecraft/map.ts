import { send } from './net/connection';
import { stopBreaking } from './digging';
import { drawMap } from './draw';
import { setStick } from './input/joystick';
import { held, state } from './state';
import { ui } from './ui';

/** Where the character is, counted from where they started: right and up are positive. */
export function coords(): { x: number; y: number } | null {
  const world = state.scene?.state;
  if (!world?.spawn) return null;
  return { x: world.x - world.spawn.x, y: world.spawn.y - world.y };
}

/** The mine so far, from the map the bot sent last. */
export function renderMap(): void {
  const { scene, worldMap } = state;
  if (!scene || !worldMap) return;
  const rect = ui.mapCanvas.getBoundingClientRect();
  if (rect.width === 0) return;
  const ratio = window.devicePixelRatio || 1;
  ui.mapCanvas.width = Math.round(rect.width * ratio);
  ui.mapCanvas.height = Math.round(rect.height * ratio);
  const mg = ui.mapCanvas.getContext('2d') as CanvasRenderingContext2D;
  mg.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawMap(mg, worldMap, rect.width, rect.height, scene.state, scene.state.spawn);
}

/** "in 3d 4h", "in 5h 20m", "in 12m". */
function untilText(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return days > 0 ? `in ${days}d ${hours}h` : hours > 0 ? `in ${hours}h ${minutes % 60}m` : `in ${minutes}m`;
}

export function openMap(): void {
  const { scene } = state;
  if (!scene?.state.spawn || state.mapOpen) return;
  state.mapOpen = true;
  held.length = 0;
  setStick(null);
  stopBreaking();
  const at = coords();
  const resets = scene.state.resetsAt ? ` · new mine ${untilText(scene.state.resetsAt - Date.now())}` : '';
  ui.mapWhere.textContent = (at ? `You are at ${at.x},${at.y}` : '') + resets;
  ui.map.hidden = false;
  renderMap();
  send({ t: 'map' });
}

export function closeMap(): void {
  state.mapOpen = false;
  ui.map.hidden = true;
}

export function wireMap(): void {
  ui.mapButton.addEventListener('pointerdown', (e) => e.stopPropagation());
  ui.mapButton.addEventListener('click', openMap);
  ui.mapClose.addEventListener('click', closeMap);
  new ResizeObserver(() => state.mapOpen && renderMap()).observe(ui.mapCanvas);
}
