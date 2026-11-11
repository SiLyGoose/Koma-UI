import { LOCAL } from '../../assets';
import type { Scenery } from '../../engine/stage';
import { WASTELAND } from '../galgoria/scenery';

/**
 * Where the middle of the field is on Apocalypsion's map (King's Raid's WorldBoss.ApocalypsionField1, in its units, its x
 * mirrored as the meshes are): Tersio's, on its bridge (his wave's area at the game's -30 m: here a little further on, so he
 * shows beyond its end); and hers, the arena below it, where the game's Field2 has its middle. Field2 is Field1 itself moved
 * on so (every piece of it 96.444 on, 14.856 up: its sky alone is its own), so the field moves on to it at her wave (the
 * game's WaveGimmick for Raid 1005: map WorldBoss.ApocalypsionField2 at wave 2) as a Dragon Raid's does to its next platform.
 */
const BRIDGE: readonly [number, number, number] = [15, 0, 0];
const ARENA: readonly [number, number, number] = [-96.444, -14.856, 0.007];

/**
 * Where Tersio and Apocalypsion are fought, as in the game: King's Raid's own map of their raid (Raid 1005, dungeon 70000/5:
 * WorldBoss.ApocalypsionField1, then Field2), lit by its lightmaps; the painted wasteland what shows should it not be read.
 */
export const APOCALYPSION_FIELD: Scenery = {
  ...WASTELAND,
  map: {
    folder: `${LOCAL}/bosses/apocalypsion/map`,
    at: BRIDGE,
    turn: Math.PI,
    floor: 0x15121c,
    camera: { look: 25, fov: 25 },
    next: [BRIDGE[0] - ARENA[0], BRIDGE[1] - ARENA[1], BRIDGE[2] - ARENA[2]],
    // (The bridge's balustrade and statues on the camera's side, which the game's camera, nearer, has behind it: ours would see the field through them.)
    cut: [{ from: [-10, 0.3, -60], to: [140, 40, -12] }],
  },
};
