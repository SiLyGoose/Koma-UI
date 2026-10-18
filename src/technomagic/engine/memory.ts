import { store } from '../../shared/ui';

/*
 * Whether this device is short of memory, so the models' big textures are read at half their size (./models.ts; a
 * quarter of the memory): it says it has SHORT GB or less (Chrome's and Android's browsers say; Safari and Firefox
 * don't), or it was found struggling here within the last week (the field's drawing lost, or drawn too slowly:
 * ./stage.ts). That catches an iPhone too, from the second time. A week, so a phone once saving its battery (drawing
 * slowly then) isn't drawn less sharply for good.
 */

const SHORT = 4;
const KEY = 'technomagic-low-memory';
const FOR = 7 * 24 * 60 * 60 * 1000;

const said = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
/** Found struggling (in the last week, or on this page). */
let struggled = Date.now() - Number(store.get(localStorage, KEY) ?? 0) < FOR;

/** Whether this device is short of memory (textures read from now on are read small). */
export const lowMemory = (): boolean => (said !== undefined && said <= SHORT) || struggled;

/** This device found struggling: short of memory from now on, and here for a week. */
export function struggling(): void {
  struggled = true;
  store.set(localStorage, KEY, String(Date.now()));
}
