import { CanvasTexture, CircleGeometry, Color, Mesh, MeshBasicMaterial, OrthographicCamera, PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer, WebGLRenderTarget, type Object3D } from 'three';

/*
 * The field, seen from the side: the heroes on the left looking right, the boss on the right looking
 * left, both turned a little toward the camera. x runs along the field, y is up, and the camera stands
 * back along z, and up a little looking down, far enough that the whole width shows whatever the
 * canvas's shape.
 */

/** How much of the field shows across, and the least up and down, in the models' units (a hero is about 1.6 tall). */
// As the game frames a boss fight: the boss a little over half the picture's height, the floor its lower third.
const WIDTH = 34;
const HEIGHT = 20;
const FOV = 26;
/** What the camera looks at, and how far it looks down at it (radians). */
// Low, so the fight is in the upper part of the picture: the heroes' cards are along the bottom of it.
const LOOK = new Vector3(0, 2.6, 0);
// High enough that the heroes' back row shows above the front one: each hero, and its health, apart from the next.
const ELEVATION = 0.26;

export interface Stage {
  scene: Scene;
  /** Draws every frame, after `update` (the time in seconds, and since the last frame). */
  start(update: (now: number, dt: number) => void): void;
  /** Where a place on the field is on the page, from the canvas's top left (CSS pixels). */
  project(at: Vector3): { x: number; y: number };
  /** A picture (a data: address) of a model from a little under `at` (its head) up, with nothing behind it, seen from `turn` radians round it: a hero, for its card. */
  portrait(model: Object3D, at: Vector3, turn: number): string;
}

export function makeStage(canvas: HTMLCanvasElement): Stage {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  scene.background = dusk();
  const camera = new PerspectiveCamera(FOV, 16 / 9, 0.5, 400);

  // The floor: a dark disc, lighter under where the fight is.
  const floor = new Mesh(new CircleGeometry(60, 48), new MeshBasicMaterial({ color: 0x2a2233 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  scene.add(floor);

  const fit = (): void => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const half = Math.tan((FOV * Math.PI) / 360);
    const back = Math.max(HEIGHT / 2 / half, WIDTH / 2 / (half * camera.aspect));
    camera.position.set(LOOK.x, LOOK.y + Math.sin(ELEVATION) * back, LOOK.z + Math.cos(ELEVATION) * back);
    camera.lookAt(LOOK);
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(fit).observe(canvas);
  fit();

  const seen = new Vector3();
  return {
    scene,
    project(at) {
      camera.updateMatrixWorld();
      seen.copy(at).project(camera);
      return { x: (seen.x * 0.5 + 0.5) * canvas.clientWidth, y: (-seen.y * 0.5 + 0.5) * canvas.clientHeight };
    },
    portrait(model, at, turn) {
      const SIZE = 320;
      const HALF = 1.05;
      const DOWN = 0.4;
      const shot = new Scene();
      const home = model.parent;
      shot.add(model);
      const eye = new OrthographicCamera(-HALF, HALF, HALF, -HALF, 0.1, 40);
      eye.position.set(at.x + Math.sin(turn) * 10, at.y - DOWN, at.z + Math.cos(turn) * 10);
      eye.lookAt(at.x, at.y - DOWN, at.z);
      const target = new WebGLRenderTarget(SIZE, SIZE);
      const was = renderer.getClearAlpha();
      const colour = renderer.getClearColor(new Color());
      renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(target);
      renderer.render(shot, eye);
      renderer.setClearColor(colour, was);
      const pixels = new Uint8Array(SIZE * SIZE * 4);
      renderer.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, pixels);
      renderer.setRenderTarget(null);
      target.dispose();
      shot.remove(model);
      home?.add(model);
      // As read it is upside down, and its colours are as light adds up, not as a screen shows them.
      const picture = document.createElement('canvas');
      picture.width = picture.height = SIZE;
      const g = picture.getContext('2d') as CanvasRenderingContext2D;
      const image = g.createImageData(SIZE, SIZE);
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const from = ((SIZE - 1 - y) * SIZE + x) * 4;
          const to = (y * SIZE + x) * 4;
          for (let c = 0; c < 3; c++) image.data[to + c] = 255 * ((pixels[from + c] as number) / 255) ** (1 / 2.2);
          image.data[to + 3] = pixels[from + 3] as number;
        }
      }
      g.putImageData(image, 0, 0);
      return picture.toDataURL('image/png');
    },
    start(update) {
      let last = performance.now();
      const frame = (ms: number): void => {
        // (A frame's time can be a moment before the time this was started at: never less than nothing.)
        const dt = Math.max(0, Math.min(0.064, (ms - last) / 1000));
        last = ms;
        update(ms / 1000, dt);
        renderer.render(scene, camera);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },
  };
}

/** The sky behind the field: dusk, darkest at the top. */
function dusk(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  const sky = g.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#1b1a2b');
  sky.addColorStop(0.6, '#3b2a4a');
  sky.addColorStop(1, '#6a3f55');
  g.fillStyle = sky;
  g.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
