import { Box3, Color, Group, SRGBColorSpace, TextureLoader, Vector3, type MeshBasicMaterial, type Texture } from 'three';
import { FALLEN_FREY_ASSETS, modelFolder } from '../../assets';
import { fileUrl, isMesh } from '../../engine/models';
import type { Props } from '../../fx/props';
import { SCALE } from '../body/hero';

/*
 * Fallen Frey's dark self (her body as the game's effects have it, ../../assets/heroes/fallen-frey.ts: hands together,
 * with a picture of noise to burn it away by): rising up behind her, greater than she is, dark and see-through, coming out
 * of nothing and burning away again from its noise, its edges alight as they go.
 */

/** The picture of noise it burns away by (in its folder). */
const NOISE = 'Boss_Frey_Fallen_EffectNoise.png';
/**
 * How much greater than she is, how far behind her (away from the boss) and how high it stands; how far it rises while it is
 * there; how long it takes to come, stays, and burns away; how dark it is drawn (its colours times this) and how see-through;
 * the light at its burning edges, and how wide they are (a share of the noise).
 */
const SELF = { size: 1.6, back: 1.4, high: 0.35, rises: 0.35, come: 0.35, stay: 0.55, go: 0.9, dark: [0.55, 0.32, 0.85], solid: 0.8, edge: 0xc27bff, edgeWidth: 0.12 };

let noise: Promise<Texture | null> | null = null;
const readNoise = (): Promise<Texture | null> =>
  (noise ??= new TextureLoader()
    .loadAsync(fileUrl(modelFolder(FALLEN_FREY_ASSETS, FALLEN_FREY_ASSETS.props?.self ?? ''), NOISE))
    .then((map) => {
      map.colorSpace = SRGBColorSpace;
      return map;
    })
    .catch(() => null));

/** Her dark self rising behind her: `at` where she stands, `facing` the way she is turned (radians, as the field turns its heroes). */
export function rise(props: Props, at: Vector3, facing: number): void {
  const model = props.copy(FALLEN_FREY_ASSETS, 'self');
  if (!model) return;
  void readNoise().then((map) => {
    if (!map) return;
    // How far it is burnt away (0: all there, 1: gone), for each of its materials.
    const cut = { value: 1 };
    model.traverse((o) => {
      if (!isMesh(o)) return;
      for (const material of [o.material].flat() as MeshBasicMaterial[]) {
        material.transparent = true;
        material.depthWrite = false;
        material.opacity = SELF.solid;
        material.color.setRGB(SELF.dark[0] as number, SELF.dark[1] as number, SELF.dark[2] as number);
        material.onBeforeCompile = (shader) => {
          shader.uniforms.noiseMap = { value: map };
          shader.uniforms.cut = cut;
          shader.uniforms.edge = { value: new Color(SELF.edge) };
          shader.fragmentShader = shader.fragmentShader
            .replace('void main() {', `uniform sampler2D noiseMap;\nuniform float cut;\nuniform vec3 edge;\nvoid main() {`)
            .replace(
              '#include <alphatest_fragment>',
              `#include <alphatest_fragment>
              #ifdef USE_MAP
                float burnt = texture2D(noiseMap, vMapUv).r;
                if (burnt < cut) discard;
                float lit = 1.0 - smoothstep(cut, cut + ${SELF.edgeWidth.toFixed(2)}, burnt);
                diffuseColor.rgb = mix(diffuseColor.rgb, edge, lit * step(0.001, cut));
              #endif`,
            );
        };
        material.needsUpdate = true;
      }
    });
    // Its file has it stood somewhere else: its feet put under where it is, here.
    const box = new Box3().setFromObject(model);
    const middle = box.getCenter(new Vector3());
    model.position.set(-middle.x, -box.min.y, -middle.z);
    const self = new Group();
    self.add(model);
    self.scale.setScalar(SCALE * SELF.size);
    self.rotation.y = facing;
    // Behind her: back the way she faces.
    const where = new Vector3(Math.sin(facing), 0, Math.cos(facing)).multiplyScalar(-SELF.back).add(at);
    const { come, stay, go } = SELF;
    props.play(self, (t) => {
      cut.value = t < come ? 1 - t / come : t < come + stay ? 0 : Math.min(1, (t - come - stay) / go);
      self.position.set(where.x, SELF.high + SELF.rises * Math.min(1, t / (come + stay + go)), where.z);
      return t < come + stay + go;
    });
  });
}
