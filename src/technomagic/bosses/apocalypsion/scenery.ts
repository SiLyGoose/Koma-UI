import { LOCAL } from '../../assets';
import type { FieldView, Scenery } from '../../engine/stage';
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

/** A hero's box, as King's Raid frames its fighters (RenderFacadeBuilder: SizeMm across, HeightMm tall): the heroes' usual, 0.5 m and 1.9 m. */
const HERO: readonly [number, number, number] = [1, 1.9, 1];

/**
 * The camera at Apocalypsion's wave: King's Raid's PunishmentMapView3 (GameSetting's BattleView.CustomBattleCameraList, which
 * Raid 1005's WaveGimmickValues ["2", "WorldBoss.ApocalypsionField2", "PunishmentMapView3"] changes to with her field), from
 * behind the heroes' left, turned 53.78° round toward her and looking 11.7° down, 30° wide; framing the page's field as the
 * game frames its fighters: the heroes' furthest spots (sim/rules.ts formation: the frontline's ring round her, the backline's
 * hindmost) and her (creature 60002: 3 m across each side of her, 4.5 m tall), each a box as the game's are. (Tersio's wave
 * is PunishmentMapView1, the raid's own BattleCameraName: a low wide view from beside the heroes, 66.22° round, 1.36° down,
 * 65° wide, its margins negative; ours sees his bridge from the side, `camera`.)
 */
const PUNISHMENT_MAP_VIEW3: FieldView = {
  look: 11.7,
  horizon: 53.78,
  fov: 30,
  minHeight: 0,
  margin: [0, 0, 0],
  offset: [-0.94, 0.38, -2.22],
  bounds: [
    { at: [-15.5, 0, 0], size: HERO },
    { at: [-15.5, 0, -2.6], size: HERO },
    { at: [-0.5, 0, 0], size: HERO },
    { at: [2.9, 0, 7], size: HERO },
    { at: [2.9, 0, -7], size: HERO },
    // (Where she stands: ./model.ts APOCALYPSION_LOOK.)
    { at: [7, 0, 0], size: [6, 4.5, 6] },
  ],
};

/**
 * Where Tersio and Apocalypsion are fought, as in the game: King's Raid's own map of their raid (Raid 1005, dungeon 70000/5:
 * WorldBoss.ApocalypsionField1, then Field2), lit by its lightmaps; the painted wasteland what shows should it not be read.
 * Seen as ours sees a field on his bridge, and from her wave as the game sees her arena (`views`: going over in a second).
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
    views: [null, PUNISHMENT_MAP_VIEW3],
  },
};
