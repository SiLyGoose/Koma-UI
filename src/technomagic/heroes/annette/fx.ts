import { Vector3 } from 'three';
import type { HeroFx } from '../../fight/fx';

/* What is drawn for Annette's attack and skills (what they do is ./index.ts). Rascal, floating beside her, fires them. */

/** Her colours: Rascal's technomagic cyan, the gold of its charge, and the mint of what heals. */
const CYAN = 0x4fd8ff;
const GOLD = 0xffd25a;
const MINT = 0x7dffb0;

const at = new Vector3();
const from = new Vector3();

export const ANNETTE_FX: HeroFx = {
  lands: {
    // Her attack: a beam out of Rascal into the boss.
    zap({ effects, magic, bossHit, bossFeet, floater }, who) {
      magic.ray(floater(who, from), bossHit, CYAN, 0.35);
      effects.play('impact', bossHit, 0, 0.7);
      magic.ring(bossFeet, CYAN, 3, 0.25);
    },
    // Blasting Ray: a great beam out of Rascal burning into the boss, gold in cyan.
    ray({ effects, magic, bossHit, bossFeet, floater }, who) {
      floater(who, from);
      magic.ray(from, bossHit, CYAN, 0.8, 3);
      magic.ray(from, bossHit, GOLD, 0.65, 1.6, 0.05);
      effects.play('blast', bossHit);
      effects.play('impact', bossHit, 0, 1.2);
      magic.ring(bossFeet, GOLD, 9, 0.45);
    },
    // Process of Elimination: the ball bursts on the boss.
    elimination({ effects, magic, bossHit, bossFeet }) {
      effects.play('blast', bossHit);
      effects.play('impact', bossHit, 0, 1.5);
      magic.beam(bossFeet, GOLD, 0.5, 1.5);
      magic.ring(bossFeet, CYAN, 14, 0.55);
    },
  },
  cues: {
    // Emergency Treatment: a ring of light round her, and a column of it on each ally it reaches.
    treatment({ magic, place }, who, targets) {
      magic.ring(place(who, at), MINT, 10, 0.5);
      for (const ally of targets) magic.beam(place(ally, at), MINT, 0.7, 0.9);
    },
  },
};
