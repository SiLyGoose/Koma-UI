/*
 * v2 is played on its side, always: the site's pages there keep their wide-screen layout on every screen, a phone's too,
 * laid out on a canvas of their own (./panel.ts) and scaled to it. So the site's styles, as v2 takes them in, are
 * rewritten: every screen-size condition (`@media (max-width: 899px)`, `(min-width: 900px)`, `(max-height: 820px)`, an
 * orientation) is answered for a wide desktop screen, DESKTOP, whatever the screen really is (or, for a sheet given a
 * width, a screen that wide: one whose narrow layout v2 wants, as the shop's rows of heroes); and the screen's units (vh,
 * vw and their d/s/l kinds) become the canvas's (--v2-vh, --v2-vw, a hundredth of its height and width). Conditions on
 * anything else (hover, reduced motion) are left as they are. The site's own pages, outside v2, are untouched.
 */

/** The screen every size condition is answered for: the site's widest layout, none of its smaller-screen ones. */
const DESKTOP = { width: 1600, height: 900 };

/**
 * A small screen (a phone, on its side or not), as it really is: where v2 lays some pages out its own way, King's Raid's
 * (the shop's heroes one row that scrolls sideways). A bigger one keeps the site's desktop layout. (v2.css says it too.)
 */
export const SMALL_SCREEN = '(max-width: 899.98px), (max-height: 599.98px)';
const BIG_SCREEN = '(min-width: 900px) and (min-height: 600px)';

const TRUE = '(min-width: 0px)';
const FALSE = '(max-width: 0px)';

function holds(feature: string, op: string, value: number, width: number): boolean {
  const size = feature === 'width' ? width : DESKTOP.height;
  switch (op) {
    case 'min':
    case '>=':
      return size >= value;
    case 'max':
    case '<=':
      return size <= value;
    case '>':
      return size > value;
    case '<':
      return size < value;
    default:
      return size === value;
  }
}

/** A media query's conditions on the screen's size answered for a screen `width` wide: each one always true or never. */
function query(prelude: string, width: number): string {
  return prelude
    .replace(/\(\s*(min-|max-)?(width|height)\s*:\s*([\d.]+)px\s*\)/g, (_all, side: string | undefined, feature: string, value: string) =>
      holds(feature, side ? side.slice(0, 3) : '=', Number(value), width) ? TRUE : FALSE,
    )
    .replace(/\(\s*(width|height)\s*(<=|>=|<|>)\s*([\d.]+)px\s*\)/g, (_all, feature: string, op: string, value: string) =>
      holds(feature, op, Number(value), width) ? TRUE : FALSE,
    )
    .replace(/\(\s*orientation\s*:\s*(landscape|portrait)\s*\)/g, (_all, way: string) => (way === 'landscape' ? TRUE : FALSE));
}

/** The site's CSS as v2 takes it in: its layout that of a screen `width` wide (the wide screen's), its screen units the canvas's. */
export function landscapeCss(css: string, width: number = DESKTOP.width): string {
  return css
    .replace(/@media([^{]+)\{/g, (_all, prelude: string) => `@media${query(prelude, width)}{`)
    .replace(/(-?\d*\.?\d+)[dsl]?vh\b/g, (_all, n: string) => `calc(${n} * var(--v2-vh, 1vh))`)
    .replace(/(-?\d*\.?\d+)[dsl]?vw\b/g, (_all, n: string) => `calc(${n} * var(--v2-vw, 1vw))`);
}

/** The screen's units in a value (vh, vw and their kinds), and the canvas's in their place. */
const UNITS = /(-?\d*\.?\d+)[dsl]?v([hw])\b/g;
const canvasUnits = (value: string): string => value.replace(UNITS, (_all, n: string, axis: string) => `calc(${n} * var(--v2-v${axis}, 1v${axis}))`);

/**
 * The same rewrite, done in place on the stylesheets a page has loaded and on any it loads later: a game's (opened from
 * v2: ../shared/ui/frame/v2-game.ts), whose styles come in with its code rather than through v2's ?inline imports. Its
 * media rules' size conditions answered for a screen `width` wide, its declarations' screen units the canvas's. (A sheet
 * from elsewhere, which can't be read, is left as it is.)
 */
export function landscapeSheets(width: number = DESKTOP.width): void {
  const done = new WeakSet<CSSStyleSheet>();
  const rewrite = (rules: CSSRuleList): void => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule) {
        const text = rule.media.mediaText;
        const answered = query(text, width);
        if (answered !== text) rule.media.mediaText = answered;
      }
      if (rule instanceof CSSStyleRule) {
        const { style } = rule;
        for (let i = 0; i < style.length; i++) {
          const property = style.item(i);
          const value = style.getPropertyValue(property);
          UNITS.lastIndex = 0;
          if (UNITS.test(value)) style.setProperty(property, canvasUnits(value), style.getPropertyPriority(property));
        }
      }
      if ('cssRules' in rule) rewrite((rule as CSSGroupingRule).cssRules);
    }
  };
  const scan = (): void => {
    for (const sheet of Array.from(document.styleSheets)) {
      if (done.has(sheet)) continue;
      // Not the page transition's (vite.config.ts marks it): its loading screen covers the screen itself, not the canvas.
      if ((sheet.ownerNode as Element | null)?.hasAttribute?.('data-transition')) continue;
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      done.add(sheet);
      rewrite(rules);
    }
  };
  scan();
  // (A sheet put in later, or a <style> whose text changes: a new sheet to rewrite. A <link> once it has loaded.)
  new MutationObserver(scan).observe(document.head, { childList: true, subtree: true, characterData: true });
  document.addEventListener('load', (e) => e.target instanceof HTMLLinkElement && scan(), true);
}

/**
 * Puts the site's styles in, rewritten, before any of v2's own (which then outweigh them, coming later), in the order given.
 * A sheet given with a width is, on a small screen (SMALL_SCREEN), answered for a screen that wide, and on a bigger one
 * for a desktop's as the rest are.
 */
export function useLandscapeCss(sheets: readonly (string | readonly [string, number])[]): void {
  const styles: HTMLStyleElement[] = [];
  const put = (css: string, media?: string): void => {
    const last = styles[styles.length - 1];
    if (last && !media && !last.media) return void (last.textContent += `\n${css}`);
    const style = document.createElement('style');
    style.dataset.v2 = 'site';
    if (media) style.media = media;
    style.textContent = css;
    styles.push(style);
  };
  for (const sheet of sheets) {
    if (typeof sheet === 'string') put(landscapeCss(sheet));
    else {
      put(landscapeCss(sheet[0]), BIG_SCREEN);
      put(landscapeCss(sheet[0], sheet[1]), SMALL_SCREEN);
    }
  }
  document.head.prepend(...styles);
}
