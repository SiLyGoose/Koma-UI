import { notes } from '../shared/audio';

/*
 * The vault events' sounds, made here from notes (no files), as the duck race's are (../duckrace/sfx.ts). The page's
 * sound button mutes them all (common.ts: setMuted).
 *
 * Hot Potato: a tick that comes faster the longer a potato has been out (never from its fuse, which is hidden), a
 * whoosh when it's passed, an oops when someone grabs it, a boom when it goes off. Laser Grid: a charge as a round
 * waits for the laser, a zap when it fires, a ding for a duck, a buzz for being caught. Both: a fanfare for winning,
 * and a pop for a reaction.
 */

export type EventSound = 'tick' | 'whoosh' | 'oops' | 'boom' | 'serve' | 'charge' | 'zap' | 'ding' | 'buzz' | 'fanfare' | 'pop';

export function play(sound: EventSound, heat = 0): void {
  switch (sound) {
    case 'tick':
      // Higher and louder as it heats up.
      return notes([660 + heat * 440], { type: 'square', volume: 0.025 + heat * 0.03, length: 0.04 });
    case 'whoosh':
      return notes([300, 520, 860], { type: 'sine', volume: 0.07, length: 0.09, spacing: 0.035 });
    case 'oops':
      return notes([520, 390, 290], { type: 'triangle', volume: 0.09, length: 0.12, spacing: 0.08 });
    case 'boom':
      notes([110, 82, 55], { type: 'sawtooth', volume: 0.16, length: 0.45, spacing: 0.04 });
      return notes([60], { type: 'square', volume: 0.1, length: 0.6 });
    case 'serve':
      return notes([392, 523], { type: 'triangle', volume: 0.07, length: 0.1, spacing: 0.07 });
    case 'charge':
      return notes([220, 262, 311, 370], { type: 'sine', volume: 0.04, length: 0.18, spacing: 0.12 });
    case 'zap':
      return notes([1760, 1320, 880], { type: 'sawtooth', volume: 0.06, length: 0.07, spacing: 0.03 });
    case 'ding':
      return notes([1319, 1760], { type: 'triangle', volume: 0.09, length: 0.16, spacing: 0.06 });
    case 'buzz':
      return notes([140, 120], { type: 'square', volume: 0.08, length: 0.22, spacing: 0.12 });
    case 'fanfare':
      return notes([523, 659, 784, 1047], { type: 'triangle', volume: 0.09, length: 0.22, spacing: 0.13 });
    case 'pop':
      return notes([880 + Math.random() * 300], { type: 'sine', volume: 0.04, length: 0.06 });
  }
}
