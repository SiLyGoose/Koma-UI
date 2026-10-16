import { HERO_ASSETS, skillPicture, type HeroAssets } from './assets';
import type { Art } from './sim/shown';

/* Where the pictures the fight names are (../sim/shown.ts's Art: it only says whose each is). */

/** Each unique weapon's picture: its item's (the bot's catalog id, public/gear/items/weapons/), by its hero. */
const UNIQUE_PICTURES: Readonly<Record<string, string>> = {
  klaus: '/gear/items/weapons/the-guardian-exian.png',
  kirze: '/gear/items/weapons/judgment-edge-elicipira.png',
  'fallen-frey': '/gear/items/weapons/angels-despair-rosmerta.png',
  gremory: '/gear/items/weapons/gateway-to-purgatory-pigritia.png',
  annette: '/gear/items/weapons/crystallized-technomagic-rascal.png',
  morrah: '/gear/items/weapons/flame-of-victory-carprain.png',
  laias: '/gear/items/weapons/flowing-circle-eltoirre.png',
  seria: '/gear/items/weapons/executioner-of-domains-elsion.png',
  ezekiel: '/gear/items/weapons/jailer-of-despair-barbatos.png',
  lorraine: '/gear/items/weapons/world-trees-will-roburu.png',
  valance: '/gear/items/weapons/wonder-of-magos-le-flamme-corbeau-rose.png',
  lucikiel: '/gear/items/weapons/form-of-ultimate-destruction-barbatos-gigante.png',
  selene: '/gear/items/weapons/green-winds-notos.png',
  crow: '/gear/items/weapons/hellhound-akistra.png',
  oddy: '/gear/items/weapons/moonshade-countdown-tempodiana.png',
  phillop: '/gear/items/weapons/dragons-ruins-atein.png',
  naila: '/gear/items/weapons/cursed-claws-baroro.png',
  yanne: '/gear/items/weapons/dragonbane-svelta.png',
  neraxis: '/gear/items/weapons/roaring-dragonmaw-acravita.png',
  erze: '/gear/items/weapons/essence-of-greed-perion.png',
  loman: '/gear/items/weapons/wave-of-protection-gaiamenes.png',
  gau: '/gear/items/weapons/holy-bird-numinu.png',
  tanya: '/gear/items/weapons/demon-of-the-calm-caethasis.png',
};

/** A hero's files, by its id (its folder under public/kr/heroes/). */
const heroAssets = (id: string): HeroAssets | undefined => HERO_ASSETS.find((hero) => hero.folder === `heroes/${id}`);

/** The address of a picture the fight names (none: it names none, or there is none for it). */
export function artPicture(art: Art | undefined): string | undefined {
  if (!art) return undefined;
  if ('uw' in art) return UNIQUE_PICTURES[art.uw];
  const hero = heroAssets(art.hero);
  return hero && skillPicture(hero, art.skill);
}
