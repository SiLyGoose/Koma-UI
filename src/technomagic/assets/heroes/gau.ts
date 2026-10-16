import type { HeroAssets, PartsModel, RiggedModel } from '../types.ts';

/*
 * Gau, a beastman, in his fourth look (Hero_Gau_Vari04_…: his fifth's body has its colour picture spoiled, one hue all
 * over): his body (all of him in one), and his great axe in his right hand, laid out along what was its y. He stands, runs
 * in, attacks and roars Battle Roar by animations of Mixamo's (the motions alone: Phillop's); his other skills are the
 * poses written in code (../../heroes/gau/moves.ts).
 */

/**
 * How his right hand holds his axe for his animations: its handle out from his fist partway along his forearm (40° off
 * it, as Phillop holds his), so it hangs at his side as he stands, rises over him as he winds up, and comes down on the boss
 * edge first (turned a quarter round its handle from how Phillop holds his: held so, it came down flat).
 */
const GRIPS = { R: { at: [0.111, 0.075, 0.008], turn: [1.011, -0.232, -1.57] } } as const satisfies PartsModel['grips'];

/** What moves him. */
const MOVED_BY = {
  kind: 'rigged',
  folder: 'Gau_Mixamo',
  idle: 'Standing Idle.fbx',
  run: 'Unarmed Run Forward.fbx',
  // His axe brought down on the boss: his hand is moving fastest 0.83 s in, and the blow lands just after (../../sim/heroes/gau.ts).
  attack: [{ file: 'Standing Melee Attack Downward.fbx' }],
  skills: { warcry: { file: 'Standing Taunt Battlecry.fbx' } },
} as const satisfies RiggedModel;

export const GAU_ASSETS: HeroAssets = {
  name: 'Gau',
  folder: 'heroes/gau',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/5/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  // His unique weapon, wielded: Numinu, his axe.
  unique: { Hero_Gau_Vari04_Weapon: 'Hero_Gau_Unique01_Weapon' },
  skins: [
    {
      name: 'Gau',
      // His artwork (the King's Raid Index's): his head and mane in the crop (the meter's close-up is his face by itself).
      portrait: { file: 'Gau.png', from: 'https://raw.githubusercontent.com/IcyDipity/KingsRaidIndex/master/images/heroes/Gau/Gau.png', crop: { x: 490, y: 75, size: 180 }, head: { x: 520, y: 110, size: 120 } },
      model: {
        kind: 'parts',
        parts: ['Hero_Gau_Vari04_Mesh'],
        right: 'Hero_Gau_Vari04_Weapon',
        blade: 'y',
        grips: GRIPS,
        movedBy: MOVED_BY,
      },
    },
  ],
};
