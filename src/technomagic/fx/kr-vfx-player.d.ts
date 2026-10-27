import type { Camera, Group, Object3D, TextureLoader } from 'three';

/** A King's Raid effect read (its definition, pictures and meshes), to be played as often as wanted. */
export interface KrEffectAsset {
  readonly def: { readonly code: string; readonly length: number };
}

/** Reads an effect (`url`: its .json; `base`: where its textures/ are). */
export function loadKrEffect(url: string, base?: string, loader?: TextureLoader): Promise<KrEffectAsset>;

/** One playing of an effect: put it in the scene, update it every frame, take it out once `done`. */
export class KrEffect extends Group {
  /** `findNode`: the bone of whoever casts it that a part of it hangs on (by the game's name for it). */
  constructor(asset: KrEffectAsset, opts?: { findNode?: (name: string) => Object3D | undefined | null });
  done: boolean;
  update(dt: number, camera: Camera | null): void;
  /** Ends one that goes on until told: its models now, its particles living out. */
  stop(): void;
  /** Done with, once taken out of the scene: its materials given back to its asset for the next playing of it. */
  dispose(): void;
}
