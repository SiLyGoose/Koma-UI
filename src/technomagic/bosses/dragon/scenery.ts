import { KEPT, LOCAL } from '../../assets';
import type { Scenery } from '../../engine/stage';

/**
 * Where each dragon is fought, as King's Raid names their lairs: Dragia, the mountain of red lava (Temeraire); Turandana,
 * the land of ice (Scalaxia); Grimvine, the swamp of death (Zyrrkinoth); Ashen Nox, the Black Sun (Armarta). Painted once
 * by scripts/lairs.py (whose sheet and hazes these are: a change to one is a change to the other), and kept with the page.
 */
const lair = (folder: string, haze: number, map: Scenery['map']): Scenery => ({
  backdrop: { url: `${KEPT}/scenery/${folder}/backdrop.webp`, z: -22, left: -60, right: 60, bottom: -1, top: 35 },
  ground: { url: `${KEPT}/scenery/${folder}/ground.webp`, tile: 14 },
  haze: { color: haze, near: 7, far: 22 },
  ...(map && { map }),
});

/**
 * King's Raid's own map of a dragon's raid (Raid.FireField1, Raid.IceField1_3D, Raid.PoisonField1_3D, GuildRaid.BlackField1,
 * as CampaignDungeonTable's BattleField names them): its first platform (the game's x 37), the fight moving on 60 along to the
 * next as each wave of its raid is over (97, then 157: `next`), or Armarta's one. Our x is the game's turned round: less than 0.
 */
const own = (dragon: string, at: readonly [number, number, number], floor: number, next?: number): Scenery['map'] => ({ folder: `${LOCAL}/bosses/${dragon}/map`, at, turn: Math.PI, floor, ...(next && { next }) });

export const DRAGIA = lair('dragia', 0x3a1f1a, own('temeraire', [-37, 0, 0], 0x3a1f1a, 60));
export const TURANDANA = lair('turandana', 0x9aa9b8, own('scalaxia', [-37, 0, 0], 0x9aa9b8, 60));
export const GRIMVINE = lair('grimvine', 0x2c3626, own('zyrrkinoth', [-37, 0, 0], 0x2c3626, 60));
export const ASHEN_NOX = lair('ashen-nox', 0x1d1a22, own('armarta', [-37, 0, 0], 0x1d1a22));
