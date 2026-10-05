import { CONTROL, MAX_H, MAX_W } from './tuning';

/**
 * Finds what's pressable under the mouse. What's pressable at each element looked at is kept: working
 * it out makes the browser go over the whole page's styles, so it's done once, until something changes
 * whether it would be (a class or a button turned on or off, a press: `forget`).
 */
export function pressableFinder(): { pressable: (target: Element | null) => Element | null; forget: () => void } {
  const html = document.documentElement;
  let known = new WeakMap<Element, Element | null>();
  const forget = (): void => {
    known = new WeakMap();
  };
  new MutationObserver(forget).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'disabled'] });

  /**
   * What's pressable at `target`: the outermost element up from it with a hand pointer, if any (the
   * pointer being inherited, what's in a button has one too), or the first control on the way up if
   * there's one, so a button in a clickable card boxes the button. The page's own pointers are read with the
   * reticle's hiding of them lifted for a moment.
   */
  function pressable(target: Element | null): Element | null {
    if (!target || !target.isConnected) return null;
    let el = known.get(target);
    if (el === undefined) {
      html.classList.remove('reticle-on');
      try {
        el = null;
        if (getComputedStyle(target).cursor === 'pointer') {
          el = target;
          while (!el.matches(CONTROL) && el.parentElement && getComputedStyle(el.parentElement).cursor === 'pointer') el = el.parentElement;
        }
      } finally {
        html.classList.add('reticle-on');
      }
      known.set(target, el);
    }
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    if (rect.width > innerWidth * MAX_W && rect.height > innerHeight * MAX_H) return null;
    return el;
  }

  return { pressable, forget };
}
