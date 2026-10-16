import { Vector3 } from 'three';
import type { BossFx } from '../../fight/fx';
import { IMPRISONMENT, SWAMP } from '../../sim/bosses/galgoria/skills';

/* What is drawn for what Galgoria's skills do (./skills.ts), beyond its body's own moves (./model.ts). */

/** Its colours: the swamp's green, its venom's purple, and the light blue of the cage it shuts a hero in. */
const SWAMPY = 0x5fd35a;
const VENOMOUS = 0xb04dff;
const ARCANE = 0x7fdcff;

const at = new Vector3();

export const GALGORIA_FX: BossFx = {
  // The hero that has dealt the most is shut in a cage of light in the swamp.
  imprison({ magic, place }, [top]) {
    if (top === undefined) return;
    place(top, at);
    magic.beam(at, SWAMPY, 0.8, 1.6);
    magic.ring(at, SWAMPY, 6, 0.5);
    magic.cage((into) => place(top, into), ARCANE, IMPRISONMENT.lasts);
  },
  // And comes back out.
  free({ magic, place }, [hero]) {
    if (hero !== undefined) magic.ring(place(hero, at), SWAMPY, 5, 0.45);
  },
  // All three heads down into the swamp, over the whole field.
  destroyer({ magic, bossFeet, place }, heroes) {
    magic.ring(bossFeet, SWAMPY, 30, 0.8);
    magic.ring(bossFeet, VENOMOUS, 18, 0.6);
    for (const hero of heroes) magic.ring(place(hero, at), SWAMPY, 4, 0.4);
  },
  // The swamp, under every hero on the field.
  swamp({ magic, place }, heroes) {
    if (heroes.length === 0) return;
    const middle = new Vector3();
    for (const hero of heroes) middle.add(place(hero, at));
    middle.divideScalar(heroes.length).setY(0);
    const across = Math.max(...heroes.map((hero) => place(hero, at).setY(0).distanceTo(middle)));
    magic.pool(middle, SWAMPY, across * 2 + 4, SWAMP.lasts);
    magic.ring(middle, SWAMPY, across * 2 + 8, 0.7);
  },
  // Its venom bursting on every hero.
  explosion({ magic, place }, heroes) {
    for (const hero of heroes) magic.ring(place(hero, at), VENOMOUS, 5, 0.4);
  },
  fatal({ magic, place }, heroes) {
    for (const hero of heroes) magic.beam(place(hero, at), VENOMOUS, 0.5, 0.8);
  },
};
