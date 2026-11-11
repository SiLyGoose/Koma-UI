import { OrthographicCamera, Scene, SRGBColorSpace, Vector2, Vector3, WebGLRenderer } from 'three';
import { letGo, toon } from '../heroes/model';
import type { Hero } from '../technomagic/heroes/body/hero';
import { loadHeroes } from '../technomagic/heroes/load';
import { lookOf } from '../technomagic/heroes/looks';
import { HEROES } from '../technomagic/sim/heroes';

/*
 * The member's hero walking the town, as King's Raid's town has the party's leader: its model (the TechnoMagic Raid's, in
 * the outfit it wears, drawn with the toon shader the heroes page uses) in a little canvas standing where the runner is
 * (../runner.ts's element: the canvas moves with it), turned the way it heads, running while it's on its way and resting
 * in its idle when it stops. Read only once picked (three.js and a hero's models are big), one at a time.
 */

/** The canvas, in map pixels (the map scales it), and how far above its bottom the hero's feet are. */
const SIZE = { width: 300, height: 380, feet: 30 };
/** Map pixels to a unit of the field: a grown hero (2.85 units) about 230 pixels tall, as the miner was. */
const PX = 82;
/** How far down the camera looks (King's Raid's town sees its heroes from above). */
const LOOK_DOWN = (28 * Math.PI) / 180;
/** How quickly it turns to where it heads (higher: sooner). */
const TURN = 12;
/** Its outline's width (CSS pixels). */
const OUTLINE = 1;

export interface Walker {
  /** The canvas (to put in the runner's element). */
  element: HTMLCanvasElement;
  /** Puts hero `id` in skin `skin` on the map: false when it can't be read (or another was asked for meanwhile). */
  show(id: string, skin: number): Promise<boolean>;
  /** The map's scale on the screen now (the canvas drawn as sharp as it shows). */
  scaled(scale: number): void;
  /** Draws it heading (dx, dy) on the map, running or not. */
  draw(now: number, dt: number, heading: { dx: number; dy: number; moving: boolean }): void;
  destroy(): void;
}

export function makeWalker(): Walker {
  const element = document.createElement('canvas');
  element.className = 'v2-walker';
  element.style.width = `${SIZE.width}px`;
  element.style.height = `${SIZE.height}px`;
  element.style.left = `${-SIZE.width / 2}px`;
  element.style.bottom = `${-SIZE.feet}px`;
  const renderer = new WebGLRenderer({ canvas: element, antialias: true, alpha: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const halfW = SIZE.width / PX / 2;
  const halfH = SIZE.height / PX / 2;
  const camera = new OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 100);
  // Its feet (the field's floor at its middle) SIZE.feet above the canvas's bottom.
  const target = new Vector3(0, (halfH - SIZE.feet / PX) / Math.cos(LOOK_DOWN), 0);
  camera.position.set(0, target.y + Math.sin(LOOK_DOWN) * 20, Math.cos(LOOK_DOWN) * 20);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  const outline = { value: new Vector2() };

  let shown: Hero | null = null;
  let asked = '';
  let gone = false;
  let turn = 0;
  let striding = false;

  function scaled(scale: number): void {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(16, Math.round(SIZE.width * scale * ratio));
    const h = Math.max(16, Math.round(SIZE.height * scale * ratio));
    if (element.width === w && element.height === h) return;
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    outline.value.set((2 * OUTLINE * ratio) / w, (2 * OUTLINE * ratio) / h);
  }

  async function show(id: string, skin: number): Promise<boolean> {
    const key = `${id}:${skin}`;
    asked = key;
    const def = HEROES.find((hero) => hero.id === id);
    if (!def) return false;
    let hero: Hero | null = null;
    try {
      const entrants = await loadHeroes([def], { skin });
      hero = (entrants.find((entrant) => entrant.skin === lookOf(id).assets.skins[skin]) ?? entrants[0])?.hero ?? null;
    } catch (error) {
      console.warn(error);
    }
    if (!hero) return false;
    if (gone || asked !== key) {
      letGo(hero);
      return false;
    }
    toon(hero.root, outline);
    if (shown) {
      scene.remove(shown.root);
      letGo(shown);
    }
    shown = hero;
    striding = false;
    scene.add(hero.root);
    // Stood at the field's middle: its feet where the canvas has them.
    hero.update(performance.now() / 1000, 0);
    hero.root.updateMatrixWorld(true);
    const feet = hero.place(new Vector3());
    hero.root.position.x -= feet.x;
    hero.root.position.z -= feet.z;
    hero.root.rotation.y = turn;
    return true;
  }

  function draw(now: number, dt: number, heading: { dx: number; dy: number; moving: boolean }): void {
    if (!shown) return;
    // Facing the way it heads: down the map is towards the camera (+z), right is +x.
    const want = Math.atan2(heading.dx, heading.dy);
    let delta = want - turn;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    turn += delta * (1 - Math.exp(-TURN * dt));
    shown.root.rotation.y = turn;
    if (heading.moving !== striding) {
      striding = heading.moving;
      shown.stride?.(striding ? 0.5 : null);
    } else if (striding) shown.stride?.(0.5);
    shown.update(now / 1000, dt);
    renderer.render(scene, camera);
  }

  function destroy(): void {
    gone = true;
    if (shown) letGo(shown);
    shown = null;
    renderer.dispose();
    element.remove();
  }

  return { element, show, scaled, draw, destroy };
}
