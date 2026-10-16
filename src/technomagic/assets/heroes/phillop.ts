import type { HeroAssets, PartsModel, RiggedModel } from '../types.ts';

/*
 * Phillop, a dwarf, in his fourth look (Hero_Phillop_Vari04_…: his fifth's body has its colour picture spoiled, one
 * hue all over): his body (all of him in one), his shield on his left arm and his axe in his right, laid out along
 * what was its y. He stands, runs in, attacks and uses Earth Incarnate (a battle cry: a warrior's, his look being one's)
 * by animations of Mixamo's (the motions alone); his other skills are the poses written in code
 * (../../heroes/phillop/moves.ts). (His unique weapon's file is his axe and shield in one: he looks the same with it.)
 */

/**
 * How his right hand holds his axe for his animations: its handle out from his fist partway along his forearm (40° off
 * it), so it hangs at his side as he stands, rises behind him as he winds up, and comes down on the boss.
 */
const GRIPS = { R: { at: [0.111, 0.075, 0.008], turn: [-0.304, 0.496, -1.441] } } as const satisfies PartsModel['grips'];

/** What moves him. */
const MOVED_BY = {
  kind: 'rigged',
  folder: 'Phillop_Mixamo',
  idle: 'Standing Idle.fbx',
  run: 'Unarmed Run Forward.fbx',
  // His axe brought down on the boss: his hand is moving fastest 0.83 s in, and the blow lands just after (../../sim/heroes/phillop.ts).
  attack: [{ file: 'Standing Melee Attack Downward.fbx' }],
  skills: { incarnate: { file: 'Standing Taunt Battlecry.fbx' } },
} as const satisfies RiggedModel;

export const PHILLOP_ASSETS: HeroAssets = {
  name: 'Phillop',
  folder: 'heroes/phillop',
  skills: { from: 'https://kingsraid.shodyra.com/static/images/6/', files: ['s1.png', 's2.png', 's3.png', 's4.png'] },
  skins: [
    {
      name: 'Phillop',
      // His artwork (from the wiki, asked for as the PNG it was uploaded as), sitting by his barrels with a tankard: his head and helm in the crop (the meter's close-up is his face by itself).
      portrait: {
        file: 'Phillop.png',
        from: 'https://static.wikia.nocookie.net/charactah-account/images/b/bd/Phillop_Render_01.png/revision/latest?cb=20220927052432&format=original',
        crop: { x: 220, y: 180, size: 190 },
        head: { x: 250, y: 220, size: 120 },
      },
      model: {
        kind: 'parts',
        parts: ['Hero_Phillop_Vari04_Mesh'],
        left: 'Hero_Phillop_Vari04_Shield',
        right: 'Hero_Phillop_Vari04_Axe',
        blade: 'y',
        grips: GRIPS,
        movedBy: MOVED_BY,
      },
    },
  ],
};
