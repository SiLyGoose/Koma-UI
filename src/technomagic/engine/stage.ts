import {
  CanvasTexture,
  CircleGeometry,
  Color,
  Float32BufferAttribute,
  Fog,
  Group,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
  type BufferGeometry,
  type Object3D,
} from 'three';
import { loadKrMap } from './kr-map';
import { struggling } from './memory';

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
/**
 * How tall the screen is in the units King's Raid's own UI is made in (its banners: ../hud/banners.ts). It is seen from
 * the other side (left and right swapped): its effects are made mirrored, as all the game's are, for the field.
 */
const UI_HIGH = 12;
/** Seen up close (focus()): how far down the camera looks then (radians). */
const CLOSE_LOOK = 0.1;
/** Where a King's Raid map's own effects are played, of those it has: no further than this from the middle of the field. */
const NEAR = 60;
/** What the camera looks at, and how far it looks down at it (radians). */
// Low, so the fight is in the upper part of the picture: the heroes' cards are along the bottom of it.
const LOOK = new Vector3(0, 2.6, 0);
// High enough that the heroes' back row shows above the front one: each hero, and its health, apart from the next.
const ELEVATION = 0.26;

/**
 * How sharply the field is drawn: as many of the canvas's own pixels to a CSS pixel as the screen has, up to SHARPEST.
 * Drawn slower than SLOW_FPS frames a second for SLOW seconds on end (a slow phone, or one saving its battery), it is
 * drawn STEP less sharply from then on, down to SOFTEST: far fewer pixels to fill, the fight goes smoothly again.
 */
const SHARPEST = 2;
const SOFTEST = 1;
const SLOW_FPS = 45;
const SLOW = 3;
const STEP = 0.25;
/** Frames further apart than this (seconds: the tab away, or a long load) aren't counted. */
const GAP = 1;

/**
 * Where a fight is, painted beforehand (so nothing of it is made as a fight begins): a picture behind the field, on an
 * upright sheet across the back of it, of which the camera sees as much as the page's shape lets it; and the floor.
 */
export interface Scenery {
  /** The sheet's picture, and where it stands: at `z`, from `left` to `right` and `bottom` to `top` (in the field's units). */
  backdrop: { url: string; z: number; left: number; right: number; bottom: number; top: number };
  /** One tile of the floor, repeated: a tile is `tile` across. */
  ground: { url: string; tile: number };
  /** What the floor fades into toward the back (the colour of the backdrop's foot, so they meet unseen): from `near` beyond the middle of the field to `far`. */
  haze: { color: number; near: number; far: number };
  /**
   * King's Raid's own map of where it is fought (./kr-map.ts), in place of the painted sheet and floor (they are what is
   * shown should it not be read): its folder, where the middle of the field is on it (`at`, in the map's units), and how far it is turned about the
   * upright there (radians: the game sees its maps from the other side); and the colour of the floor beyond its own (its
   * floor is no deeper than the game's camera sees: ours sees further).
   */
  map?: { folder: string; at: readonly [number, number, number]; turn: number; floor: number; camera?: { look: number; fov: number }; grounded?: boolean; next?: number };
}

/** An effect a map has of its own (fog, sparks, a portal's glow), where it is on the field. */
export interface FieldEffect {
  code: string;
  at: Vector3;
  rotation: Quaternion;
  scale: number;
}

export interface Stage {
  scene: Scene;
  /** What the field is seen from (what faces it is turned to: the effects' flat pictures). */
  camera: PerspectiveCamera;
  /** Drawn over the field, flat on the screen (King's Raid's banners): what, and seen how (the screen `UI_HIGH` tall, its middle at 0). */
  overlay: { scene: Scene; camera: OrthographicCamera };
  /** Puts the fight in `scenery`, in place of the plain field (once its pictures are read): the effects its map has of its own, where they are on the field. */
  dress(scenery: Scenery): Promise<readonly FieldEffect[]>;
  /**
   * Draws every frame, after `update` (the time in seconds, and since the last frame: no more than a frame's, however long
   * it has been, and how long it has really been).
   */
  start(update: (now: number, dt: number, gap: number) => void): void;
  /** Whether the field is covered over (getting ready: ../prep/), so it isn't drawn meanwhile (`update` still is called). */
  cover(covered: boolean): void;
  /**
   * Darkens the field by `amount` (0 not at all, 1 black) as it is drawn from now on, but for what is `lit` (on the
   * field): that is drawn as bright as ever, over the dark.
   */
  dim(amount: number, lit: readonly Object3D[]): void;
  /** Looks at `at` from close by, so much (`high`) of the field seen up and down; null: back to the field as a whole. */
  focus(target: { at: Vector3; high: number } | null): void;
  /**
   * A raid of more than one wave: the map moved on `platforms` from its first, each by its `next` (the next platform comes to
   * where the fight is; part way: on the move between two), `moved` told how far along the field (the field's units) that
   * moves it from where it was (for what stands on it: its effects). 0: back on its first.
   */
  moveOn(platforms: number, moved: (dx: number) => void): void;
  /** Moves the camera along the field: `by` across from where it stands (less than 0: to the left), looking the same way. */
  pan(by: number): void;
  /** Where a place on the field is on the page, from the canvas's top left (CSS pixels). */
  project(at: Vector3): { x: number; y: number };
  /** A picture (a data: address) of a model from a little under `at` (its head) up, with nothing behind it, seen from `turn` radians round it: a hero, for its card. */
  portrait(model: Object3D, at: Vector3, turn: number): string;
}

export function makeStage(canvas: HTMLCanvasElement): Stage {
  // (Smoothing the edges: not on a sharp screen, where they hardly show and it costs a phone the most.)
  const renderer = new WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2 });
  // (A shader's errors asked for only in `yarn dev`: asking waits for it to be compiled there and then, a stall each time a
  // new one first draws mid-fight; three.js's own advice for a site.)
  renderer.debug.checkShaderErrors = import.meta.env.DEV;
  // The drawing lost (most often a phone out of memory; Safari reloads the page then): its textures read small the next time.
  canvas.addEventListener('webglcontextlost', struggling);
  renderer.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  scene.background = dusk();
  const camera = new PerspectiveCamera(FOV, 16 / 9, 0.5, 400);

  // The floor: a dark disc, lighter under where the fight is.
  const floor = new Mesh<BufferGeometry, MeshBasicMaterial>(new CircleGeometry(60, 48), new MeshBasicMaterial({ color: 0x2a2233 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  scene.add(floor);

  // How far the camera is from the middle of the field: the haze is measured from there, as that changes with the page's shape.
  let back = 0;
  // How far down it looks (radians) and how wide (degrees): as a King's Raid map has the game see it, where the field is one.
  let elevation = ELEVATION;
  let wide = FOV;
  /** What moves on the map (its glows, its fogs), each frame. */
  let mapTick: ((dt: number) => void) | null = null;
  /** The map, how far it moves on to its next platform (null: none). */
  let mapAt: { map: Object3D; next: number; turn: number } | null = null;
  /** How far the map has moved on from its first platform (its own units). */
  let slid = 0;
  // How far along the field it is moved (pan()).
  let panned = 0;
  const look = new Vector3();
  /** What it is looking at up close (focus()), or null. */
  let close: { at: Vector3; high: number } | null = null;
  const aim = (): void => {
    if (close) {
      const away = close.high / 2 / Math.tan((wide * Math.PI) / 360);
      camera.position.set(close.at.x, close.at.y + Math.sin(CLOSE_LOOK) * away, close.at.z + Math.cos(CLOSE_LOOK) * away);
      camera.lookAt(close.at);
      return;
    }
    look.copy(LOOK).setX(LOOK.x + panned);
    camera.position.set(look.x, look.y + Math.sin(elevation) * back, look.z + Math.cos(elevation) * back);
    camera.lookAt(look);
  };
  let haze: Scenery['haze'] | undefined;
  const fog = (): void => {
    if (!(scene.fog instanceof Fog) || !haze) return;
    scene.fog.near = back + haze.near;
    scene.fog.far = back + haze.far;
  };

  /** The sharpest it is drawn now (SHARPEST, until it was found too slow). */
  let sharpest = SHARPEST;
  // Over the field, flat on the screen: seen from the front, looking along +z as King's Raid's camera does (its effects are
  // mirrored in x, ../fx/kr-vfx-player.js), so what is further along is drawn behind (a banner's shade behind its word).
  const overlay = new Scene();
  const flatUi = new OrthographicCamera(-UI_HIGH / 2, UI_HIGH / 2, UI_HIGH / 2, -UI_HIGH / 2, -1000, 1000);
  flatUi.rotation.y = Math.PI;
  flatUi.updateMatrixWorld();
  const fit = (): void => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setPixelRatio(Math.min(sharpest, window.devicePixelRatio));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = wide;
    const half = Math.tan((wide * Math.PI) / 360);
    back = Math.max(HEIGHT / 2 / half, WIDTH / 2 / (half * camera.aspect));
    aim();
    camera.updateProjectionMatrix();
    flatUi.left = (-UI_HIGH / 2) * camera.aspect;
    flatUi.right = (UI_HIGH / 2) * camera.aspect;
    flatUi.updateProjectionMatrix();
    fog();
  };
  new ResizeObserver(fit).observe(canvas);
  fit();

  // The dark over the field (dim()): a black sheet over the whole picture, drawn between the field and what is lit.
  const shade = new Mesh(new PlaneGeometry(2, 2), new MeshBasicMaterial({ color: 0x000000, transparent: true, depthTest: false, depthWrite: false }));
  shade.position.z = -0.5;
  shade.frustumCulled = false;
  const shadeScene = new Scene().add(shade);
  const flat = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let dark = 0;
  let lit: readonly Object3D[] = [];
  /** Covered over (cover()): not drawn. */
  let covered = false;
  const over = (): void => {
    if (overlay.children.length === 0) return;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(overlay, flatUi);
    renderer.autoClear = true;
  };
  const draw = (): void => {
    field();
    over();
  };
  const field = (): void => {
    if (dark <= 0) {
      renderer.render(scene, camera);
      return;
    }
    // The field without what is lit, the dark over it, then what is lit over that (each where the field doesn't stand before it).
    const shown = lit.filter((o) => o.visible && o.parent);
    for (const o of shown) o.visible = false;
    renderer.render(scene, camera);
    for (const o of shown) o.visible = true;
    shade.material.opacity = dark;
    renderer.autoClear = false;
    renderer.render(shadeScene, flat);
    for (const o of shown) renderer.render(o, camera);
    renderer.autoClear = true;
  };

  const seen = new Vector3();
  return {
    scene,
    camera,
    overlay: { scene: overlay, camera: flatUi },
    moveOn(platforms, moved) {
      if (!mapAt) return;
      const step = mapAt.next * platforms - slid;
      if (step === 0) return;
      mapAt.map.position.x += step;
      slid += step;
      moved(step * Math.cos(mapAt.turn));
    },
    focus(target) {
      close = target && { at: target.at.clone(), high: target.high };
      aim();
    },
    async dress(scenery) {
      if (scenery.map) {
        const { folder, at, turn, floor: beyond, camera: own, grounded } = scenery.map;
        const read = await loadKrMap(folder, grounded).catch((error: unknown) => {
          console.warn(error);
          return null;
        });
        if (read) {
          // (Its middle of the field at the field's, turned about it.)
          const field = new Group();
          read.map.position.set(-at[0], -at[1], -at[2]);
          field.add(read.map);
          field.rotation.y = turn;
          scene.add(field);
          mapTick = read.update;
          if (scenery.map.next) mapAt = { map: read.map, next: scenery.map.next, turn };
          // (Under it, and in front of its floor: drawn before the map, which is painted over it.)
          floor.material.color.set(beyond);
          floor.material.depthWrite = false;
          floor.renderOrder = -20_000;
          scene.background = new Color(scenery.haze.color);
          // (As the game sees it, unless the scenery sees it its own way: a map the game's files have no camera for.)
          const seen = own ?? read.camera;
          elevation = (seen.look * Math.PI) / 180;
          wide = seen.fov;
          fit();
          // Its own effects, those near the fight, where they are on the field.
          field.updateMatrixWorld(true);
          return read.effects.flatMap((effect) => {
            const where = read.map.localToWorld(new Vector3(...effect.position));
            const rotation = field.quaternion.clone().multiply(new Quaternion(...effect.rotation));
            // (A map moved on along its platforms: those of each of them.)
            const near = NEAR + 2 * (scenery.map?.next ?? 0);
            return Math.hypot(where.x, where.z) > near ? [] : [{ code: effect.code, at: where, rotation, scale: effect.scale }];
          });
        }
      }
      const pictures = new TextureLoader();
      const [backdrop, ground] = await Promise.all([pictures.loadAsync(scenery.backdrop.url), pictures.loadAsync(scenery.ground.url)]);
      backdrop.colorSpace = ground.colorSpace = SRGBColorSpace;

      const { z, left, right, bottom, top } = scenery.backdrop;
      const sheet = new Mesh(new PlaneGeometry(right - left, top - bottom), new MeshBasicMaterial({ map: backdrop, fog: false }));
      sheet.position.set((left + right) / 2, (top + bottom) / 2, z);
      scene.add(sheet);

      // The floor, from the sheet's foot to well in front of the camera however far back it stands; darker away from the fight.
      const across = right - left;
      const deep = 160;
      const plane = new PlaneGeometry(across, deep, 48, 48);
      const at = plane.getAttribute('position');
      const shade: number[] = [];
      for (let i = 0; i < at.count; i++) {
        // (Laid flat, the plane's y runs toward the back of the field.)
        const away = Math.hypot(at.getX(i) / 30, (z + deep / 2 - at.getY(i)) / 22);
        const k = 1 - 0.3 * Math.min(1, Math.max(0, away - 0.5));
        shade.push(k, k, k);
      }
      plane.setAttribute('color', new Float32BufferAttribute(shade, 3));
      ground.wrapS = ground.wrapT = RepeatWrapping;
      ground.repeat.set(across / scenery.ground.tile, deep / scenery.ground.tile);
      ground.anisotropy = renderer.capabilities.getMaxAnisotropy();
      floor.geometry.dispose();
      floor.material.dispose();
      floor.geometry = plane;
      floor.material = new MeshBasicMaterial({ map: ground, vertexColors: true });
      floor.position.set((left + right) / 2, -0.02, z + deep / 2);

      haze = scenery.haze;
      scene.background = new Color(haze.color);
      scene.fog = new Fog(haze.color, 0, 1);
      fog();
      return [];
    },
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
    dim(amount, those) {
      dark = Math.min(1, Math.max(0, amount));
      lit = those;
    },
    pan(by) {
      if (by === panned) return;
      panned = by;
      aim();
    },
    cover(on) {
      covered = on;
    },
    start(update) {
      let last = performance.now();
      // How fast it is drawn: the frames drawn since `since` (ms), and how many seconds on end were too slow.
      let since = last;
      let frames = 0;
      let slow = 0;
      const frame = (ms: number): void => {
        const gap = (ms - last) / 1000;
        // (A frame's time can be a moment before the time this was started at: never less than nothing.)
        const dt = Math.max(0, Math.min(0.064, gap));
        last = ms;
        update(ms / 1000, dt, Math.max(0, gap));
        mapTick?.(dt);
        if (covered || gap > GAP) {
          since = ms;
          frames = slow = 0;
        }
        if (!covered) {
          draw();
          frames++;
          if (ms - since >= 1000) {
            slow = (frames * 1000) / (ms - since) < SLOW_FPS ? slow + 1 : 0;
            since = ms;
            frames = 0;
            const now = Math.min(sharpest, window.devicePixelRatio);
            if (slow >= SLOW && now > SOFTEST) {
              sharpest = Math.max(SOFTEST, now - STEP);
              slow = 0;
              fit();
              // (A device that slow: its textures read small from now on, and the next time it's here.)
              struggling();
            }
          }
        }
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
