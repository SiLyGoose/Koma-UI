import { VIEW_COLS } from './constants';
import { state } from './state';
import { canvas, g, ui } from './ui';

/** Sizes the canvas to the view (sharp on any screen), and works out how big a block is. */
export function resize(): void {
  const rect = ui.wrap.getBoundingClientRect();
  if (rect.width === 0) return;
  const ratio = window.devicePixelRatio || 1;
  const cols = parseFloat(getComputedStyle(ui.wrap).getPropertyValue('--cols')) || VIEW_COLS;
  state.size = { w: rect.width, h: rect.height, block: rect.width / cols };
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  g.setTransform(canvas.width / rect.width, 0, 0, canvas.height / rect.height, 0, 0);
}

/** Moves the camera toward the character (all the way, with `snap`), keeping within the mine. */
export function centerCamera(snap: boolean): void {
  const { scene, size } = state;
  if (!scene || size.block === 0) return;
  const cols = size.w / size.block;
  const rows = size.h / size.block;
  const world = scene.state;
  const want = {
    x: Math.max(-1, Math.min(world.size + 1 - cols, scene.character.x + 0.5 - cols / 2)),
    y: Math.max(-1, Math.min(world.size + 1 - rows, scene.character.y + 0.5 - rows / 2)),
  };
  const k = snap ? 1 : 0.12;
  scene.cam.x += (want.x - scene.cam.x) * k;
  scene.cam.y += (want.y - scene.cam.y) * k;
}
