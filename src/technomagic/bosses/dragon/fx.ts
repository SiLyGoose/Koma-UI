import { Vector3 } from 'three';
import type { BossFx } from '../../fight/fx';

/*
 * What is drawn for what a dragon's skills do (../../sim/bosses/<dragon>/skills.ts), beyond its body's own moves and its
 * breath (./model.ts): the same for every dragon, in each one's colours, with what one of them has of its own beside it.
 */

const at = new Vector3();
/** The CC gauge broken: a white ring, and stars. */
const DAZED = 0xfff3a8;

/** A dragon's fx, in its colours: `main` its own (its fire, ice, venom or black flame), `glow` what is brighter in it. */
export function dragonFx(main: number, glow: number, own: BossFx = {}): BossFx {
  /** A ring under each hero it is on. */
  const under =
    (size: number, life: number, colour = main): BossFx[string] =>
    ({ magic, place }, heroes) => {
      for (const hero of heroes) magic.ring(place(hero, at), colour, size, life);
    };
  return {
    // Its CC gauge broken: down it goes.
    gauge({ magic, bossFeet }) {
      magic.ring(bossFeet, DAZED, 16, 0.7);
      magic.ring(bossFeet, 0xffffff, 9, 0.5);
    },
    sweep: under(4, 0.4),
    smash: under(4.5, 0.45),
    // Its breath, landing on each hero.
    flame: under(3.5, 0.35, glow),
    frost: under(3.5, 0.35, glow),
    venom: under(3.5, 0.35, glow),
    black: under(3.5, 0.35, glow),
    // Down from the air on the whole field.
    eruption({ magic, bossFeet, place }, heroes) {
      magic.ring(bossFeet, main, 30, 0.8);
      magic.ring(bossFeet, glow, 18, 0.6);
      for (const hero of heroes) magic.beam(place(hero, at), main, 0.6, 1.2);
    },
    ...own,
  };
}
