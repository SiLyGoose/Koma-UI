// Throwaway: the raid cards' pictures, cut as the page cuts them. Not part of the page.
import { HERO_ASSETS, portraitPicture } from '../src/technomagic/assets';
import { cutFace } from '../src/technomagic/hud/portrait';
for (const hero of HERO_ASSETS)
  for (const skin of hero.skins) {
    if (!skin.portrait) continue;
    const face = await cutFace(portraitPicture(hero, skin.portrait), skin.portrait);
    const img = document.createElement('img');
    if (face) img.src = face;
    document.body.append(img);
  }
document.title = 'done';
