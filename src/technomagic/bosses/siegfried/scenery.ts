import { LOCAL } from '../../assets';
import type { Scenery } from '../../engine/stage';
import { WASTELAND } from '../galgoria/scenery';

/**
 * Where Siegfried is fought, as in the game: King's Raid's own map of his raid (Chapter10.Field4_2, as CampaignDungeonTable's
 * BattleField names it for dungeons 1101 to 1109), its middle where the game's fights on it are (its CampaignFieldTable's
 * area, 2 to 5 m back). Galgoria's painted wasteland, of the same land, is what shows should the map not be read.
 */
export const DAWN_FIELD: Scenery = {
  ...WASTELAND,
  map: { folder: `${LOCAL}/bosses/siegfried/map`, at: [0, 0, -3.5], turn: Math.PI, floor: 0x2a2630, camera: { look: 25, fov: 25 }, grounded: true, apron: true },
};
