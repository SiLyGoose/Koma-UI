import { CONTROL, MAX_H, MAX_W } from './tuning';

/**
 * The page's own pointer, copied beside every `cursor` in its stylesheets (and over links, in
 * cursor.css, where it's the browser's own). A custom property goes through the cascade and inherits
 * just as `cursor` does, but the reticle's `cursor: none !important` doesn't cover it, so it can be read
 * as the page has it with nothing on the page changed to read it. (Lifting the reticle's hiding to read
 * `cursor` itself made the browser go over the whole page's styles twice, on every new thing the mouse
 * went over.)
 */
const PAGE_CURSOR = '--page-cursor';

/** Copies each rule's `cursor` into PAGE_CURSOR, in @media, @supports, @layer and nested rules too. */
function mirror(rules: CSSRuleList): void {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      const value = rule.style.getPropertyValue('cursor');
      // The reticle's own hiding of the pointer isn't the page's.
      if (value && !rule.selectorText.includes('reticle-on')) rule.style.setProperty(PAGE_CURSOR, value, rule.style.getPropertyPriority('cursor'));
    }
    if ('cssRules' in rule) mirror((rule as CSSGroupingRule).cssRules);
  }
}

/**
 * Finds what's pressable under the mouse, by the page's own pointers (PAGE_CURSOR). Reading them
 * changes nothing, so it's cheap enough to work out afresh every time, with nothing kept.
 */
export function pressableFinder(): { pressable: (target: Element | null) => Element | null } {
  const mirrored = new WeakSet<CSSStyleSheet>();
  /** Mirrors any stylesheet not done yet: all of them the first time, then any put in since. */
  const mirrorSheets = (): void => {
    for (const sheet of Array.from(document.styleSheets)) {
      if (mirrored.has(sheet)) continue;
      mirrored.add(sheet);
      try {
        mirror(sheet.cssRules);
      } catch {
        // Another site's (the fonts): no pointers there.
      }
    }
  };
  mirrorSheets();
  const pointer = (el: Element): boolean => getComputedStyle(el).getPropertyValue(PAGE_CURSOR).trim() === 'pointer';

  /**
   * What's pressable at `target`: the outermost element up from it with a hand pointer, if any (the
   * pointer being inherited, what's in a button has one too), or the first control on the way up if
   * there's one, so a button in a clickable card boxes the button.
   */
  function pressable(target: Element | null): Element | null {
    if (!target || !target.isConnected) return null;
    mirrorSheets();
    if (!pointer(target)) return null;
    let el = target;
    while (!el.matches(CONTROL) && el.parentElement && pointer(el.parentElement)) el = el.parentElement;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    if (rect.width > innerWidth * MAX_W && rect.height > innerHeight * MAX_H) return null;
    return el;
  }

  return { pressable };
}
