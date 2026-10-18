import type { Camera, Object3D, Quaternion, Vector3 } from 'three';
import { LOCAL } from '../assets';
import { KrEffect, loadKrEffect, type KrEffectAsset } from './kr-vfx-player.js';

/*
 * King's Raid's own effects (public/kr/effects/kr/: KR-extracted/scripts/tm-vfx.mjs, played by ./kr-vfx-player.js): each
 * read the first time it is wanted (the heroes in a fight have theirs read as it begins), and played on whoever it goes
 * with (hung on them: it goes where they go, its parts on their bones) or at a place on the field. One not read yet is
 * left out that time; one that isn't on this computer, every time.
 */

const FOLDER = `${LOCAL}/effects/kr/`;

/** Where an effect is played: on someone (`on`: hung on them, its parts on their bones), or at a place, turned `turn` radians about the upright and `scale` times as big as the game has it. */
export interface KrWhere {
  on?: Object3D;
  at?: Vector3;
  turn?: number;
  /** Turned this way instead (about every axis: a map's own, as it sets them). */
  rotation?: Quaternion;
  scale?: number;
  /** One that goes on until it is stopped (a loop: the game stops it as what it goes with ends) is stopped after this long (seconds). */
  lasts?: number;
}

/** How long a loop is let go on when nothing says (seconds). */
const LOOP = 2.5;

export interface KrEffects {
  /** Starts reading these (each once), for what is about to be played. */
  read(codes: Iterable<string>): void;
  /** Whether one has been read (and is on this computer). */
  ready(code: string): boolean;
  /** Plays one (by its code, its "Effect." left out): what stops it early (one that goes on until it is: a status's). */
  play(code: string, where: KrWhere): () => void;
  /** These go on all the while (a map's own: its fog, its sparks), each begun again as it ends or is taken off. */
  ambient(effects: readonly { code: string; at: Vector3; rotation: Quaternion; scale: number }[]): void;
  /** What the map has of its own moves along the field by `dx` (as the map does). */
  shift(dx: number): void;
  update(dt: number): void;
  /** Takes every one off (the fight is done with). */
  clear(): void;
}

/** A bone's name as the game has it, as our models have it (three.js's: spaces made underscores, some marks left out). */
const ours = (name: string): string => name.replace(/\s/g, '_').replace(/[[\].:/]/g, '');

/** Effects played in `scene` (the field's light: kept bright when it goes dark) and seen by `camera`. */
export function makeKrEffects(scene: Object3D, camera: Camera): KrEffects {
  const assets = new Map<string, KrEffectAsset | null>();
  const reading = new Set<string>();
  const playing = new Set<KrEffect>();
  /** When each loop is to be stopped (seconds from now, counted down). */
  const loops = new Map<KrEffect, number>();
  /** The map's own, each with the one of it going on now. */
  const always: { code: string; at: Vector3; rotation: Quaternion; scale: number; fx: KrEffect | null }[] = [];
  const read = (code: string): void => {
    if (assets.has(code) || reading.has(code)) return;
    reading.add(code);
    loadKrEffect(`${FOLDER}${code}.json`, FOLDER).then(
      (asset) => assets.set(code, asset),
      () => {
        console.warn(`The effect ${code} isn't on this computer`);
        assets.set(code, null);
      },
    );
  };
  const off = (fx: KrEffect): void => {
    fx.removeFromParent();
    fx.dispose();
    playing.delete(fx);
    loops.delete(fx);
  };
  /** Begins one (null: not read yet, or not on this computer). */
  const start = (code: string, { on, at, turn = 0, rotation, scale = 1, lasts }: KrWhere): KrEffect | null => {
    const asset = assets.get(code);
    if (!asset) {
      read(code);
      return null;
    }
    const fx = new KrEffect(asset, { findNode: (name) => on?.getObjectByName(ours(name)) ?? null });
    if (on) on.add(fx);
    else {
      if (at) fx.position.copy(at);
      if (rotation) fx.quaternion.copy(rotation);
      else fx.rotation.y = turn;
      scene.add(fx);
    }
    fx.scale.setScalar(scale);
    playing.add(fx);
    // (The game's own length for one that goes on until it is stopped: a loop.)
    if (asset.def.length > 60 || lasts !== undefined) loops.set(fx, lasts ?? LOOP);
    return fx;
  };
  return {
    read(codes) {
      for (const code of codes) read(code);
    },
    ready: (code) => Boolean(assets.get(code)),
    play(code, where) {
      const fx = start(code, where);
      return fx ? () => fx.stop() : () => {};
    },
    ambient(effects) {
      always.splice(0, always.length, ...effects.map((effect) => ({ ...effect, fx: null })));
      for (const effect of effects) read(effect.code);
    },
    shift(dx) {
      for (const one of always) {
        one.at.x += dx;
        if (one.fx) one.fx.position.x += dx;
      }
    },
    update(dt) {
      for (const one of always) if (!one.fx || !playing.has(one.fx)) one.fx = start(one.code, { at: one.at, rotation: one.rotation, scale: one.scale, lasts: Infinity });
      for (const fx of playing) {
        const left = loops.get(fx);
        if (left !== undefined) {
          if (left - dt <= 0) {
            fx.stop();
            loops.delete(fx);
          } else loops.set(fx, left - dt);
        }
        fx.update(dt, camera);
        if (fx.done) off(fx);
      }
    },
    clear() {
      for (const fx of playing) off(fx);
    },
  };
}
