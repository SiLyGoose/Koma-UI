import type { Warning } from '../sim/bosses/boss';
import { flag, shown } from './dom';
import { makeWarning } from './warning';

/*
 * The boss's pattern alarm across the top of the field, as King's Raid's PatternAlarm window shows one: its text alarm (its
 * Box4(S) panel, the words over it in their colour, shaded down to a darker one), or its image alarm ("WARNING": ./warning.ts),
 * drawn as far in as the fight is. Up as long as the fight says (Fight.alarm), gone once the boss is beaten. Which, and its
 * words, are the game's BossWarningTable's (each boss's attacks' `warning`).
 */

/** NGUI's gradient on its label, bottom (its top is white): its words' colour times this at their foot. */
const FOOT = [0xdb, 0x97, 0x05] as const;

/** A colour (#rrggbb) times FOOT, as NGUI tints a gradient by its words' colour. */
function footOf(colour: string): string {
  const n = Number.parseInt(colour.slice(1), 16);
  const times = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((part, i) => Math.round((part * (FOOT[i] as number)) / 255));
  return `rgb(${times.join(' ')})`;
}

export interface Alarm {
  /** The alarm up now, and how long it stays yet (null: none). */
  draw(warning: (Warning & { left: number }) | null): void;
}

/** `root` holds the words (a <span> in a <p>: each of its lines shaded on its own) and the picture's layers (a <div>); its look is ../styles/alarm.css. */
export function makeAlarm(root: HTMLElement): Alarm {
  const words = root.querySelector('p span') as HTMLElement;
  const picture = makeWarning(root.querySelector('.tm-warning') as HTMLElement);
  root.setAttribute('role', 'status');
  let said = '';
  return {
    draw(warning) {
      shown(root, warning !== null);
      const image = warning !== null && 'image' in warning;
      flag(root, 'image', image);
      picture.draw(image ? warning.lasts - warning.left : null);
      if (!warning || !('text' in warning)) return;
      const now = `${warning.colour}|${warning.text}`;
      if (now === said) return;
      said = now;
      words.textContent = warning.text;
      root.style.setProperty('--alarm', warning.colour);
      root.style.setProperty('--alarm-foot', footOf(warning.colour));
    },
  };
}
