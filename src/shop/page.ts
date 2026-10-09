import markup from './shop.html?raw';
import { wishTab } from '../banner/page';
import { outfitsTab } from '../outfits/page';
import type { Page } from '../site/page';
import type { ShopTab } from './tab';

/*
 * The shop, laid out as King's Raid's: a tab for each thing to get down the left (across the top on
 * phones), the one picked filling the rest. Wish (../banner/) pulls from the gacha; Outfits
 * (../outfits/) buys the characters to be drawn as. Each tab has its own path (/shop/wish/,
 * /shop/outfits/; /shop/ is the first), so a link can open one; picking another swaps it in place, and
 * the address follows without a new history entry (back leaves the shop).
 */

const TABS: readonly ShopTab[] = [wishTab, outfitsTab];

/** The tab for a path under /shop/ (the first for /shop/ itself, or one there isn't). */
const tabAt = (path: string): ShopTab => TABS.find((tab) => path.replace(/\/+$/, '') === `/shop/${tab.id}`) ?? (TABS[0] as ShopTab);

export const shopPage: Page = { path: '/shop', subpaths: true, title: 'Shop · Komaverse', icon: '🛍️', markup, needsLogin: true, mount };

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void; navigate: (url: URL) => void } {
  const rail = root.querySelector('.shop-rail') as HTMLElement;
  const panel = root.querySelector('.shop-panel') as HTMLElement;

  const buttons = TABS.map((tab) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shop-tab';
    button.setAttribute('role', 'tab');
    button.dataset.tab = tab.id;
    button.innerHTML = `<span class="shop-tab-icon" aria-hidden="true">${tab.icon}</span><span class="shop-tab-label"></span>`;
    (button.querySelector('.shop-tab-label') as HTMLElement).textContent = tab.label;
    button.addEventListener('click', () => {
      if (tab === shown?.tab) return;
      history.replaceState(history.state, '', `/shop/${tab.id}/`);
      void show(tab);
    });
    rail.append(button);
    return button;
  });

  let shown: { tab: ShopTab; unmount: () => void } | null = null;

  /** Puts `tab` in the panel, the one there before going first. Done once it has drawn itself. */
  function show(tab: ShopTab): Promise<void> {
    shown?.unmount();
    panel.innerHTML = tab.markup;
    const { drawn, unmount } = tab.mount(panel.firstElementChild as HTMLElement);
    shown = { tab, unmount };
    document.title = tab.title;
    panel.setAttribute('aria-label', tab.label);
    for (const button of buttons) button.setAttribute('aria-selected', String(button.dataset.tab === tab.id));
    return drawn;
  }

  return {
    drawn: show(tabAt(location.pathname)),
    unmount: () => shown?.unmount(),
    navigate: (url) => {
      const tab = tabAt(url.pathname);
      if (tab !== shown?.tab) void show(tab);
    },
  };
}
