import { holdReveal } from '../shared/transition';
import { backdrop } from '../shared/ui';
import type { Page } from '../site/page';
import { pageAt, type SitePage } from './places';

/*
 * A site page over the town, filling the screen (no header): the page's own module, set up as src/site/main.ts does
 * (its markup copied in, mount(), unmount() as it goes), in a layer that scrolls by itself. Its paths are the old site's
 * (/shop/outfits): the page reads them from the URL it's handed, not from the address bar (which is v2's: /v2/shop/outfits/).
 * Behind it, the site's backdrop (its gold star chart), as the old site has behind every page. Over it, King's Raid's top
 * bar: its back button (Common_TopBar_Button_Back3) and the page's name, back to the town (as Adventure's window has it);
 * a page with its own (the casino's) has only that.
 */

export interface Panel {
  element: HTMLElement;
  /** The page showing (null: the town). */
  showing(): SitePage | null;
  /** Shows the page at old-site `url` (another of the same page's paths: in place). Done once it has drawn. */
  open(url: URL): Promise<void>;
  /** Takes the page down (back to the town). */
  close(): void;
}

export function makePanel(into: HTMLElement, back: () => void): Panel {
  const element = document.createElement('div');
  element.className = 'v2-panel';
  element.hidden = true;
  const view = document.createElement('div');
  view.className = 'v2-panel-view';
  const bar = document.createElement('header');
  bar.className = 'v2-panel-bar';
  bar.innerHTML = `<button type="button" class="v2-adv-back" aria-label="Back to town"><img alt="" src="${import.meta.env.BASE_URL}kr/ui/portal/back.webp" /><span class="v2-adv-back-label"></span></button>`;
  const barName = bar.querySelector('.v2-adv-back-label') as HTMLElement;
  (bar.querySelector('button') as HTMLButtonElement).addEventListener('click', back);
  element.append(backdrop(), view, bar);
  into.append(element);

  let current: { site: SitePage; page: Page; unmount: () => void; navigate?: (url: URL) => void } | null = null;
  let asked = 0;

  async function open(url: URL): Promise<void> {
    const site = pageAt(url.pathname);
    if (!site) return close();
    if (current?.site === site) {
      current.navigate?.(url);
      return;
    }
    const mine = ++asked;
    const release = holdReveal();
    try {
      const page = await site.page();
      if (mine !== asked) return;
      page.prefetch?.(url);
      current?.unmount();
      view.innerHTML = page.markup;
      const root = view.firstElementChild as HTMLElement;
      element.hidden = false;
      view.scrollTop = 0;
      document.title = page.title;
      barName.textContent = page.title.split(' · ')[0] ?? '';
      element.classList.toggle('own-bar', !!root.querySelector('.v2-adv-back'));
      const { drawn, unmount, navigate } = page.mount(root);
      current = { site, page, unmount, navigate };
      // A page with tabs read its tab from the address bar as it was set up (v2's, which it doesn't know): its own path now.
      if (site.subpaths) navigate?.(url);
      await drawn.catch(() => undefined);
    } finally {
      release();
    }
  }

  function close(): void {
    asked++;
    current?.unmount();
    current = null;
    view.textContent = '';
    element.hidden = true;
    document.title = 'Komaverse';
  }

  return { element, showing: () => current?.site ?? null, open, close };
}
