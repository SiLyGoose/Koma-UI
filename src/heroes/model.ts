import {
  BackSide,
  FrontSide,
  type Material,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  type Object3D,
  OrthographicCamera,
  Scene,
  SkinnedMesh,
  SRGBColorSpace,
  type Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
  type WebGLProgramParametersWithUniforms,
} from 'three';
import type { KrEffects } from '../technomagic/fx/kr-effects';
import { SCALE, type Hero } from '../technomagic/heroes/body/hero';
import { loadHeroes } from '../technomagic/heroes/load';
import { lookOf } from '../technomagic/heroes/looks';
import { HEROES } from '../technomagic/sim/heroes';

/*
 * The hero on the heroes page's stage as King's Raid's Hero Info shows it (its Hero3DViewPanel, zoomed in): its model
 * standing in its idle (King's Raid's out-of-battle Idle, which the TechnoMagic Raid's heroes rest in too), facing the
 * camera, seen straight on (an orthographic camera, looking a little down) from over its head down to its hips, around its
 * head as its ClientCreatureTable says; drawn as its toon shader does (its edges darker, a blue rim light on them, a thin
 * black outline round it). Read only when the page first shows a hero (three.js and the models are big), in the skin asked
 * for (the outfit it wears), and only the one shown kept (another shown, the last one's let go of: a hero's models are 2-18 MB).
 * The outfit room (../hero-outfits/) shows it `whole`, from its head to its feet, every hero to one scale (a grown one 70% of
 * the view's height: WHOLE), and turns it as it is dragged.
 * Its models are under public/kr/: where one can't be read, show() says so and the page keeps the hero's picture. What its
 * look wears all the while (SkinAssets.wears: a Glory League tier's light) is on it as in the raid, King's Raid's effects
 * read only for a look that has some.
 */

/**
 * How King's Raid frames each hero (ClientCreatureTable's HeroViewZoomInViewSize and HeroViewZoomInOffset, in its units):
 * half the height shown, and where its middle is from the hero's head. Most are DEFAULT's; these, their own.
 */
const DEFAULT = { size: 0.55, offset: [0, -0.06] as const };
const FRAMES: Readonly<Record<string, { size: number; offset: readonly [number, number] }>> = {
  annette: { size: 0.55, offset: [0, 0] },
  crow: { size: 0.55, offset: [0, -0.08] },
  erze: { size: 0.52, offset: [0, -0.08] },
  evan: { size: 0.53, offset: [0, -0.08] },
  gau: { size: 0.75, offset: [0, -0.15] },
  gremory: { size: 0.6, offset: [-0.02, -0.04] },
  isolet: { size: 0.5, offset: [0, -0.08] },
  laias: { size: 0.55, offset: [0, -0.08] },
  lakrak: { size: 0.7, offset: [0, 0.03] },
  lavril: { size: 0.5, offset: [0, -0.06] },
  lilia: { size: 0.5, offset: [0, 0] },
  loman: { size: 0.55, offset: [0, -0.08] },
  lorraine: { size: 0.5, offset: [0, -0.08] },
  lucias: { size: 0.55, offset: [0, -0.08] },
  miruru: { size: 0.5, offset: [0, -0.02] },
  morrah: { size: 0.55, offset: [0, -0.08] },
  naila: { size: 0.53, offset: [0, -0.06] },
  neraxis: { size: 0.5, offset: [0, -0.08] },
  oddy: { size: 0.8, offset: [0, 0.02] },
  phillop: { size: 0.8, offset: [0, -0.05] },
  priscilla: { size: 0.5, offset: [0, -0.06] },
  'rebel-klaus': { size: 0.62, offset: [0, -0.08] },
  rehartna: { size: 0.48, offset: [0, -0.06] },
  theo: { size: 0.55, offset: [0, -0.08] },
  valance: { size: 0.53, offset: [0, -0.06] },
  yanne: { size: 0.55, offset: [0, -0.03] },
};
/**
 * Shown whole, every hero to one scale: a grown one (ADULT tall, the field's lengths: Kirze 2.81, Seria 2.84, Isaiah 2.88) is
 * TALL of the view's height, and the rest as tall as they are beside it (Lilia, Lavril and Oddy a child's height; Klaus,
 * Loman and Gau taller), all standing on one floor, FLOOR of the way up the view.
 */
const WHOLE = { adult: 2.85, tall: 0.7, floor: 0.04 };
/** How far down the camera looks (GameSetting Ui.Hero3dView.CameraAngle: 5°). */
const LOOK_DOWN = (5 * Math.PI) / 180;

/**
 * Its toon shader (Vespa/ToonShading2, as a hero's materials set it): its colour times EMISSIVE + COLOR × (how much it
 * faces the camera)^FALLOFF, so darker toward its edges; and the rim light the game sets for every hero (GameSharedSetting:
 * its colour, and its direction on the view), as sharp as its materials have it.
 */
const TOON = { emissive: 0.5, color: 0.588, falloff: 0.3 };
const RIM = { color: [0.669, 0.836, 1] as const, direction: new Vector3(-0.4, -0.4, 1).normalize(), shininess: 10 };
/** Its outline: how wide (CSS pixels). */
const OUTLINE = 1.2;

export interface Showcase {
  /** Puts the hero with this id on the stage, in skin `skin` (its own look: 0): false when it can't be read, or another was asked for meanwhile. */
  show(id: string, skin?: number): Promise<boolean>;
  /** Turns the one shown about its middle, by `by` radians (to its left). */
  turn(by: number): void;
  /** Stops drawing, and lets go of what it was drawn with. */
  destroy(): void;
}

/** Shown `whole`: its head to its feet, every hero to one scale (the outfit room's: WHOLE), not King's Raid's Hero Info's close-up. */
export function makeShowcase(canvas: HTMLCanvasElement, { whole = false }: { whole?: boolean } = {}): Showcase {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  /** The outline's width on the view (both ways), as the canvas is sized. */
  const outline = { value: new Vector2() };
  /** The one being read, by its id and skin (`<id>:<skin>`; asked again meanwhile: the same reading). */
  let reading: { id: string; hero: Promise<Hero | null> } | null = null;
  let shown: Hero | null = null;
  let shownId: string | null = null;
  let asked: string | null = null;
  let frame = 0;
  let gone = false;
  let last = performance.now();
  /** King's Raid's effects (made the first time a look wears some), and what the one shown wears not on it yet. */
  let kr: Promise<KrEffects> | null = null;
  let krMade: KrEffects | null = null;
  const toWear = new Set<string>();
  /** Takes what the one shown wears off it (before it's let go of: on its bones). */
  const unwear = (): void => {
    toWear.clear();
    krMade?.clear();
  };

  /** It in skin `skin`, moved as in the raid, drawn as King's Raid draws it; null when that skin (or the hero) isn't on this computer. */
  const load = (id: string, skin: number): Promise<Hero | null> => {
    const key = `${id}:${skin}`;
    if (reading?.id === key) return reading.hero;
    const def = HEROES.find((hero) => hero.id === id);
    const hero = def
      ? loadHeroes([def], { skin }).then(
          (entrants) => {
            const found = (entrants.find((entrant) => entrant.skin === lookOf(def.id).assets.skins[skin]) ?? entrants[0])?.hero ?? null;
            if (found) toon(found.root, outline);
            return found;
          },
          (error: unknown) => {
            console.warn(error);
            return null;
          },
        )
      : Promise.resolve(null);
    reading = { id: key, hero };
    return hero;
  };

  /** Frames it as King's Raid does, whatever the canvas's shape: as tall a view round its head, as wide as the canvas lets it be. */
  const head = new Vector3();
  const fit = (): void => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(w, h, false);
    outline.value.set((2 * OUTLINE) / w, (2 * OUTLINE) / h);
    if (shown && shownId) {
      const { size, offset } = whole ? { size: WHOLE.adult / WHOLE.tall / 2, offset: [0, 0] as const } : (FRAMES[shownId.split(':')[0] as string] ?? DEFAULT);
      shown.root.updateMatrixWorld(true);
      shown.head(head);
      // (Whole: the same view for every hero, its floor under its feet, the view's middle as far over it as the floor is under it.)
      const half = whole ? size : size * SCALE;
      if (whole) head.y = shown.place(new Vector3()).y + half - WHOLE.floor * 2 * half;
      camera.top = half;
      camera.bottom = -half;
      camera.left = (-half * w) / h;
      camera.right = (half * w) / h;
      const at = new Vector3(head.x + offset[0] * SCALE, head.y + offset[1] * SCALE, head.z);
      camera.position.set(at.x, at.y + Math.sin(LOOK_DOWN) * 20, at.z + Math.cos(LOOK_DOWN) * 20);
      camera.lookAt(at);
    }
    camera.updateProjectionMatrix();
  };
  const sized = new ResizeObserver(fit);
  sized.observe(canvas);

  const draw = (ms: number): void => {
    const dt = Math.max(0, Math.min(0.064, (ms - last) / 1000));
    last = ms;
    shown?.update(ms / 1000, dt);
    if (krMade && shown) {
      for (const code of toWear)
        if (krMade.ready(code)) {
          krMade.play(code, { on: shown.root, scale: SCALE, lasts: Infinity });
          toWear.delete(code);
        }
      krMade.update(dt);
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  };
  // Drawn only while the stage is on the screen (scrolled past it, to a tab's perks or gear on a phone: not drawn for nothing).
  let seen = true;
  const start = (): void => {
    if (frame || !seen || !shown || gone) return;
    last = performance.now();
    frame = requestAnimationFrame(draw);
  };
  const stop = (): void => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  const watched = new IntersectionObserver(([entry]) => {
    seen = entry?.isIntersecting ?? true;
    if (seen) start();
    else stop();
  });
  watched.observe(canvas);

  return {
    async show(id, skin = 0) {
      const key = `${id}:${skin}`;
      asked = key;
      if (shownId === key && shown) return true;
      const hero = await load(id, skin);
      if (gone || asked !== key || !hero) {
        // (Read for nothing: another was asked for meanwhile.)
        if (hero && hero !== shown) letGo(hero);
        return false;
      }
      if (shown && shown !== hero) {
        unwear();
        scene.remove(shown.root);
        letGo(shown);
      }
      shown = hero;
      shownId = key;
      // (Facing the camera, as King's Raid turns it.)
      hero.root.rotation.y = 0;
      scene.add(hero.root);
      const wears = lookOf(id).assets.skins[skin]?.wears ?? [];
      if (wears.length) {
        kr ??= import('../technomagic/fx/kr-effects').then(({ makeKrEffects }) => (krMade = makeKrEffects(scene, camera)));
        for (const code of wears) toWear.add(code);
        void kr.then((made) => made.read(wears));
      }
      // Stood as it rests before it is framed, so its head is where it will be.
      hero.update(performance.now() / 1000, 0);
      fit();
      start();
      return true;
    },
    turn(by) {
      if (shown) shown.root.rotation.y += by;
    },
    destroy() {
      gone = true;
      stop();
      watched.disconnect();
      sized.disconnect();
      unwear();
      if (shown) letGo(shown);
      renderer.dispose();
    },
  };
}

/** The normal on the view (`kr_normal`), as the vertex shader has it: skinned, where it is. */
const VIEW_NORMAL = /* glsl */ `
#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
  vec3 kr_normal = normalize( transformedNormal );
#else
  vec3 kr_normal = normalize( normalMatrix * normal );
#endif
`;

/**
 * Each of its parts drawn as King's Raid's toon shader draws it (its own copy of its material: darker toward its edges, the
 * rim light on them), and a black outline round each opaque one (its back faces, pushed out on the view by `outline`).
 */
function toon(root: Object3D, outline: { value: Vector2 }): void {
  const meshes: Mesh[] = [];
  root.traverse((part) => {
    if (part instanceof Mesh) meshes.push(part);
  });
  for (const mesh of meshes) {
    const materials = [mesh.material].flat() as Material[];
    const shaded = materials.map((material) => (material instanceof MeshBasicMaterial && material.blending === NormalBlending ? toonOf(material) : material));
    mesh.material = Array.isArray(mesh.material) ? shaded : (shaded[0] as Material);
    // (Not round what is see-through or glows, a veil or an effect; nor round a part seen from both sides, like hair, whose
    // back faces would be seen.)
    if (materials.some((material) => material.transparent || material.blending !== NormalBlending || material.side !== FrontSide)) continue;
    const lines = materials.map((material) => outlineOf(material as MeshBasicMaterial, outline));
    const line = mesh instanceof SkinnedMesh ? new SkinnedMesh(mesh.geometry, lines) : new Mesh(mesh.geometry, lines);
    if (line instanceof SkinnedMesh) line.bind((mesh as SkinnedMesh).skeleton, (mesh as SkinnedMesh).bindMatrix);
    line.frustumCulled = false;
    line.raycast = () => {};
    mesh.add(line);
  }
}

/** A part's material, drawn as the toon shader draws it. */
function toonOf(material: MeshBasicMaterial): MeshBasicMaterial {
  const shaded = material.clone();
  shaded.customProgramCacheKey = () => 'kr-toon';
  shaded.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    const [r, g, b] = RIM.color;
    const d = RIM.direction;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vKrNormal;')
      .replace('#include <fog_vertex>', `#include <fog_vertex>\n${VIEW_NORMAL}\n  vKrNormal = kr_normal;`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vKrNormal;').replace(
      '#include <opaque_fragment>',
      /* glsl */ `
  vec3 krN = normalize( vKrNormal ) * ( gl_FrontFacing ? 1.0 : -1.0 );
  outgoingLight *= ${TOON.emissive.toFixed(3)} + ${TOON.color.toFixed(3)} * pow( max( 0.0, krN.z ), ${TOON.falloff.toFixed(3)} );
  vec3 krR = vec3( 0.0, 0.0, 1.0 ) - 2.0 * krN.z * krN;
  outgoingLight += vec3( ${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)} ) * pow( clamp( dot( vec3( ${d.x.toFixed(4)}, ${d.y.toFixed(4)}, ${d.z.toFixed(4)} ), krR ), 0.0, 1.0 ), ${RIM.shininess.toFixed(1)} );
  #include <opaque_fragment>`,
    );
  };
  return shaded;
}

/** A part's outline: its back faces in black (where its picture is solid), pushed out along their normals on the view. */
function outlineOf(material: MeshBasicMaterial, outline: { value: Vector2 }): MeshBasicMaterial {
  const line = new MeshBasicMaterial({ color: 0x000000, side: BackSide, map: material.map, alphaTest: Math.max(0.5, material.alphaTest) });
  line.customProgramCacheKey = () => 'kr-outline';
  line.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.krOutline = outline;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform vec2 krOutline;').replace(
      '#include <project_vertex>',
      /* glsl */ `#include <project_vertex>
${VIEW_NORMAL}
  vec2 krPush = ( projectionMatrix * vec4( kr_normal, 0.0 ) ).xy;
  if ( dot( krPush, krPush ) > 0.0 ) gl_Position.xy += normalize( krPush ) * krOutline * gl_Position.w;`,
    );
  };
  return line;
}

/** What a hero was drawn with, given back (its meshes' geometry, materials and their pictures). */
function letGo(hero: Hero): void {
  hero.root.traverse((part) => {
    if (!(part instanceof Mesh)) return;
    part.geometry.dispose();
    for (const material of [part.material].flat() as Material[]) {
      for (const value of Object.values(material)) if ((value as Texture | null)?.isTexture) (value as Texture).dispose();
      material.dispose();
    }
  });
}
