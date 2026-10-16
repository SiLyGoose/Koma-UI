import { Group, type Scene } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { EFFECTS, effectFolder, modelFolder, type HeroAssets } from '../assets';
import { isMesh, loadFbx, loadModels } from '../engine/models';

/*
 * What a skill brings onto the field for a while, more than a flash (../assets/ names them): each hero's own
 * (its assets' props: Lorraine's vines, Klaus's shield), drawn with their textures, and the shield any hero
 * may have on it (Common_Shield, drawn by ./wards.ts). A hero's fx put a copy where it goes and move it
 * each frame, until they are done with it.
 */

export interface Props {
  /** Reads a hero's own props (once, however often it's asked): until they are, copy() has none of them. */
  read(hero: HeroAssets): Promise<void>;
  /** A copy of one of a hero's props, by its name there, with bones of its own (null: it isn't on this computer, or hasn't been read). */
  copy(hero: HeroAssets, name: string): Group | null;
  /** The shield on a hero, as its file has it (its textures left for ./wards.ts to draw with). */
  readonly shield: Group | null;
  /** Puts `model` on the field, and has `step` move it each frame (`t`: seconds since), until it says it is done. */
  play(model: Group, step: (t: number, dt: number) => boolean): void;
  update(dt: number): void;
  /** Takes everything off the field. */
  clear(): void;
}

interface Playing {
  model: Group;
  step: (t: number, dt: number) => boolean;
  t: number;
}

/**
 * The shield, read; each hero's own props are read as its hero is (Props.read). One that isn't on this computer is
 * left out, and the page goes on without it.
 */
export async function loadProps(scene: Scene): Promise<Props> {
  const loaded = new Map<string, Group>();
  const reads = new Map<string, Promise<void>>();
  const key = (hero: HeroAssets, name: string): string => `${hero.folder}/${name}`;
  const shield = await loadFbx(effectFolder(EFFECTS.shield)).catch(() => null);
  const playing = new Set<Playing>();

  return {
    read(hero) {
      let reading = reads.get(hero.folder);
      if (!reading) {
        reading = Promise.all(
          Object.entries(hero.props ?? {}).map(async ([name, model]) => {
            const [made] = await loadModels([modelFolder(hero, model)]).catch(() => []);
            if (made) loaded.set(key(hero, name), made);
          }),
        ).then(() => undefined);
        reads.set(hero.folder, reading);
      }
      return reading;
    },
    copy(hero, name) {
      const model = loaded.get(key(hero, name));
      if (!model) return null;
      const made = clone(model) as Group;
      // Each copy its own materials, to fade by itself.
      made.traverse((o) => {
        if (isMesh(o)) o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
      });
      return made;
    },
    shield,
    play(model, step) {
      scene.add(model);
      playing.add({ model, step, t: 0 });
    },
    update(dt) {
      for (const one of playing) {
        one.t += dt;
        if (one.step(one.t, dt)) continue;
        scene.remove(one.model);
        playing.delete(one);
      }
    },
    clear() {
      for (const { model } of playing) scene.remove(model);
      playing.clear();
    },
  };
}
