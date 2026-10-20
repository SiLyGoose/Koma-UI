import type BlurIndex from 'virtual:blur';

/*
 * An item's picture blurred while it loads, in place of nothing (styles/art.css): the build shrinks every item picture into
 * one sheet (scripts/blur.mjs), and a card still waiting for its picture shows its square of that, blurred, the picture
 * fading in over it once it's in. The sheet and its index come once, the first time a picture has to wait. Where there's
 * none (`yarn dev` before `node scripts/pictures.mjs`), it waits as before.
 */

type Index = NonNullable<typeof BlurIndex>;

/** How long a picture takes to fade in over its blurred self (ms: art.css's). */
const FADE_MS = 250;

let loading: Promise<Index | null> | null = null;
/** Once loaded: the index, and where each picture is on the sheet (by its address). Null: there is none. */
let known: { index: Index; at: Map<string, number> } | null | undefined;

/** The index (the sheet, what's where on it, and King's Raid's hero gear's icons by item id): asked for once. */
export function blurIndex(): Promise<Index | null> {
  loading ??= import('virtual:blur').then(({ default: index }) => {
    known = index ? { index, at: new Map(index.pictures.map((address, i) => [address, i])) } : null;
    return index;
  });
  return loading;
}

/** `box`'s picture `img` (from `address`, as the pages ask for it), blurred in the box until it's in; nothing if it's in already. */
export function blurWhileLoading(box: HTMLElement, img: HTMLImageElement, address: string): void {
  if (img.complete && img.naturalWidth > 0) return;
  box.classList.add('blur');
  img.addEventListener(
    'load',
    () => {
      box.classList.add('loaded');
      setTimeout(() => box.classList.remove('blur', 'loaded'), FADE_MS);
    },
    { once: true },
  );
  const place = (): void => {
    const at = known?.at.get(address);
    if (!known || at === undefined || !box.classList.contains('blur')) return;
    const { sheet, across, down } = known.index;
    const x = across > 1 ? ((at % across) / (across - 1)) * 100 : 0;
    const y = down > 1 ? (Math.floor(at / across) / (down - 1)) * 100 : 0;
    box.style.setProperty('--blur', `url('${sheet}') ${x}% ${y}% / ${across * 100}% ${down * 100}% no-repeat`);
  };
  if (known !== undefined) place();
  else void blurIndex().then(place);
}

/** Its picture didn't come (its slot's icon in its place): not waiting for it any more. */
export function stopBlur(box: HTMLElement): void {
  box.classList.remove('blur', 'loaded');
  box.style.removeProperty('--blur');
}
