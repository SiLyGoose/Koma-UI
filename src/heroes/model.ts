import { PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer } from 'three';
import { HEROES } from '../technomagic/heroes';
import type { Hero } from '../technomagic/heroes/body/hero';
import { loadHeroes } from '../technomagic/heroes/load';

/*
 * The hero on the heroes page's stage as the TechnoMagic Raid has it (../technomagic/heroes/): its model,
 * standing in its idle and breathing, seen from the front from its head down to its thighs, behind its
 * slots. Read only when the page first shows a hero (three.js and the models are big), each hero once.
 * Its models are kept on this computer only (public/kr/): where one can't be read, show() says so and the
 * page keeps the hero's picture.
 */

/** How far it is turned from facing the camera (radians): a little to its left, as the game has it. */
const TURN = 0.3;
/** What shows, from this far over its head down to this far under it, in the models' units. */
const ABOVE = 0.4;
const BELOW = 1.75;
const FOV = 22;

export interface Showcase {
  /** Puts the hero with this id on the stage: false when it can't be read, or another was asked for meanwhile. */
  show(id: string): Promise<boolean>;
  /** Stops drawing, and lets go of what it was drawn with. */
  destroy(): void;
}

export function makeShowcase(canvas: HTMLCanvasElement): Showcase {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  const read = new Map<string, Promise<Hero | null>>();
  let shown: Hero | null = null;
  let asked: string | null = null;
  let frame = 0;
  let gone = false;
  let last = performance.now();

  /** Its default skin, moved as in the raid; null when that skin (or the hero) isn't on this computer. */
  const load = (id: string): Promise<Hero | null> => {
    let reading = read.get(id);
    if (!reading) {
      const def = HEROES.find((hero) => hero.assets.folder === `heroes/${id}`);
      reading = def
        ? loadHeroes([def]).then(
            (entrants) => (entrants.find((entrant) => entrant.skin === def.assets.skins[0]) ?? entrants[0])?.hero ?? null,
            (error: unknown) => {
              console.warn(error);
              return null;
            },
          )
        : Promise.resolve(null);
      read.set(id, reading);
    }
    return reading;
  };

  /** Frames it: its head near the top, its thighs at the bottom, whatever the canvas's shape. */
  const head = new Vector3();
  const fit = (): void => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (shown) {
      shown.root.updateMatrixWorld(true);
      shown.head(head);
      const middle = head.y + (ABOVE - BELOW) / 2;
      const back = (ABOVE + BELOW) / 2 / Math.tan((FOV * Math.PI) / 360);
      camera.position.set(head.x, middle, head.z + back);
      camera.lookAt(head.x, middle, head.z);
    }
    camera.updateProjectionMatrix();
  };
  const sized = new ResizeObserver(fit);
  sized.observe(canvas);

  const draw = (ms: number): void => {
    const dt = Math.max(0, Math.min(0.064, (ms - last) / 1000));
    last = ms;
    shown?.update(ms / 1000, dt);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  };

  return {
    async show(id) {
      asked = id;
      const hero = await load(id);
      if (gone || asked !== id || !hero) return false;
      if (shown) scene.remove(shown.root);
      shown = hero;
      hero.root.rotation.y = TURN;
      scene.add(hero.root);
      // Stood as it rests before it is framed, so its head is where it will be.
      hero.update(performance.now() / 1000, 0);
      fit();
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
      return true;
    },
    destroy() {
      gone = true;
      cancelAnimationFrame(frame);
      sized.disconnect();
      renderer.dispose();
    },
  };
}
