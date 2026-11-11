import { LOCAL } from '../../assets';
import type { Scenery } from '../../engine/stage';
import { WASTELAND } from '../galgoria/scenery';

/**
 * Where Ascalon is fought, as in the game: King's Raid's own map of his raid (Chapter10.Field4_3, as CampaignDungeonTable's
 * BattleField names it for dungeons 1201 to 1209), its middle where the game's fights on it are (its CampaignFieldTable's area,
 * 3 to 7 m back). Its file is the very one Siegfried's Chapter10.Field4_2 is (the same pieces and pictures), so his folder's
 * is read. The fight moves on along it as each of the waves before him is over (`next`: the map one long loop of road).
 * Galgoria's painted wasteland, of the same land, is what shows should the map not be read.
 */
export const SANCTUARY_FIELD: Scenery = {
  ...WASTELAND,
  map: { folder: `${LOCAL}/bosses/siegfried/map`, at: [0, 0, -5], turn: Math.PI, floor: 0x2a2630, camera: { look: 25, fov: 25 }, grounded: true, apron: true, next: 30 },
};
