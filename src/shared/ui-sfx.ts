import { sound } from './sfx';

/*
 * The sounds every page shares, through ./sfx.ts: a click on anything pressable (generic_select), and
 * the page's content showing once the loading screen has wiped off it (generic_select_load).
 *
 * Something with a sound of its own when it's pressed (an item, a raid action, a bet spot, a Mines
 * tile) is marked data-sfx="own", and its click plays only that.
 */

const SFX = (file: string): string => `${import.meta.env.BASE_URL}shared/sfx/${file}.mp3`;
const select = sound(SFX('generic_select'));
const loaded = sound(SFX('generic_select_load'));

/** What counts as pressable. (Not a label: its click is passed on to its field, which counts once.) */
const PRESSABLE = 'button, a[href], summary, select, input:is([type="checkbox"], [type="radio"], [type="button"], [type="submit"]), [role="button"], [role="tab"], [role="menuitem"], [role="option"], [role="radio"]';

let installed = false;

/** Every click on something pressable plays the click's sound (once per document). */
export function installClickSounds(): void {
  if (installed) return;
  installed = true;
  document.addEventListener(
    'click',
    (event) => {
      const target = (event.target as Element | null)?.closest?.(PRESSABLE);
      if (!target || target.closest('[data-sfx="own"]')) return;
      if ((target as HTMLButtonElement).disabled || target.getAttribute('aria-disabled') === 'true') return;
      select();
    },
    true,
  );
}

/** The page's content has shown (the loading screen wiped off it). */
export function playLoaded(): void {
  loaded();
}
