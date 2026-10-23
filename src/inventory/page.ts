import markup from './inventory.html?raw';
import { API, dropdown, fillServers } from '../shared/ui';
import type { Page } from '../site/page';
import { api, currentMe, currentServer, loadMe, logOut, prefetchFor, setServer, type ApiResult } from '../site/session';
import { craftTab } from './tabs/craft';
import { heroGearTab, playerGearTab } from './tabs/gear';
import { othersTab } from './tabs/others';
import { runesTab } from './tabs/runes';
import type { InventoryHost, InventoryTab, Source, Sources } from './tab';

/*
 * The inventory, laid out as King's Raid's window (its tabs, slots and bar King's Raid's own: public/kr/ui/inventory/): its tabs
 * across the top, the one picked under them. Player Gear (the members'
 * own gear) and Hero Gear (./tabs/gear.ts), each copy's card on parchment and its details beside them; Runes (./tabs/runes.ts),
 * the runes they have that aren't socketed; Others (./tabs/others.ts), their currencies; Craft (./tabs/craft.ts), making
 * things from komaDust. What's done with gear (wearing it, selling it, socketing runes) stays on the Player and Heroes pages:
 * the details link there. Each tab has its own path (/inventory/player-gear/, …; /inventory/ is the first), so a link can
 * open one; picking another swaps it in place, and the address follows without a new history entry (as the shop's tabs).
 * What the bot says is asked for once a server, whichever tab asks first, and kept while the page is open.
 */

const TABS: readonly InventoryTab[] = [playerGearTab, heroGearTab, runesTab, othersTab, craftTab];

/** Where each of the bot's answers comes from, in the server `guild` (ready to go in an address). */
const PATHS: Record<Source, (guild: string) => string> = {
  gear: (guild) => `/api/gear?guild=${guild}`,
  heroes: (guild) => `/api/heroes?guild=${guild}`,
  shop: (guild) => `/api/raid-shop?guild=${guild}`,
  gacha: (guild) => `/api/gacha?guild=${guild}&banner=standard`,
};

/** The tab for a path under /inventory/ (the first for /inventory/ itself, or one there isn't). */
const tabAt = (path: string): InventoryTab => TABS.find((tab) => path.replace(/\/+$/, '') === `/inventory/${tab.id}`) ?? (TABS[0] as InventoryTab);

export const inventoryPage: Page = {
  title: 'Inventory · Komaverse',
  icon: '🎒',
  markup,
  mount,
  prefetch: (url) => prefetchFor(...tabAt(url.pathname).uses.map((what) => PATHS[what])),
};

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void; navigate: (url: URL) => void } {
  const bar = root.querySelector('.inv-tabs') as HTMLElement;
  const panel = root.querySelector('.inv-panel') as HTMLElement;
  const serverSelect = root.querySelector('#inv-server') as HTMLSelectElement;
  const statusLine = root.querySelector('#inv-status') as HTMLElement;
  const serverPicker = dropdown(serverSelect);

  /** The bot's answers for the server shown, by what they are. */
  let known = new Map<Source, Promise<ApiResult<unknown>>>();
  let shown: { tab: InventoryTab; unmount: () => void } | null = null;
  /** Whether the page can show anything (logged in, in a server with Koma): set once start() has asked. */
  let ready = false;

  const status = (text: string | null, bad = false): HTMLElement => {
    statusLine.hidden = text === null;
    statusLine.textContent = text ?? '';
    statusLine.classList.toggle('bad', bad);
    return statusLine;
  };

  const host: InventoryHost = {
    server: () => currentServer() ?? '',
    load<K extends Source>(what: K, fresh = false): Promise<ApiResult<Sources[K]>> {
      let answer = fresh ? undefined : known.get(what);
      if (!answer) {
        answer = api<Sources[K]>(PATHS[what](encodeURIComponent(host.server())));
        // Not kept when it didn't work: the next tab to ask, asks again.
        const asked = answer;
        void asked.then((res) => {
          if (!res.ok && known.get(what) === asked) known.delete(what);
        });
        known.set(what, answer);
      }
      return answer as Promise<ApiResult<Sources[K]>>;
    },
    keep(what, data) {
      known.set(what, Promise.resolve({ ok: true, data }));
    },
    balance: () => currentMe()?.servers.find((s) => s.id === currentServer())?.balance ?? null,
    status,
    failed(res, what) {
      if (res.status === 401) return logOut();
      status(res.error === 'not_member' ? "You don't seem to be in that server any more. Log out and in again to refresh it." : what, true);
    },
  };

  const buttons = TABS.map((tab) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'inv-tab';
    button.setAttribute('role', 'tab');
    button.dataset.tab = tab.id;
    button.textContent = tab.label;
    button.addEventListener('click', () => {
      if (tab === shown?.tab) return;
      history.replaceState(history.state, '', `/inventory/${tab.id}/`);
      void show(tab);
    });
    bar.append(button);
    return button;
  });

  /** Puts `tab` in the panel, the one there before going first. Done once it has drawn itself. */
  function show(tab: InventoryTab): Promise<void> {
    shown?.unmount();
    for (const button of buttons) button.setAttribute('aria-selected', String(button.dataset.tab === tab.id));
    panel.setAttribute('aria-label', tab.label);
    panel.dataset.tab = tab.id;
    document.title = `${tab.label} · Inventory · Komaverse`;
    // On a phone the tabs scroll sideways: the one picked into view (only the bar moves, never the page).
    const picked = buttons.find((button) => button.dataset.tab === tab.id);
    if (picked && bar.scrollWidth > bar.clientWidth) {
      const left = picked.offsetLeft - bar.offsetLeft;
      if (left < bar.scrollLeft || left + picked.offsetWidth > bar.scrollLeft + bar.clientWidth) bar.scrollTo({ left: left - (bar.clientWidth - picked.offsetWidth) / 2, behavior: 'smooth' });
    }
    panel.textContent = '';
    if (!ready) {
      shown = { tab, unmount: () => undefined };
      return Promise.resolve();
    }
    status(null);
    const { drawn, unmount } = tab.mount(panel, host);
    shown = { tab, unmount };
    return drawn;
  }

  serverSelect.addEventListener('change', () => {
    setServer(serverSelect.value);
    known = new Map();
    if (shown) void show(shown.tab);
  });

  async function start(): Promise<void> {
    if (!API) return void status('This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
    status('Loading…');
    const res = await loadMe();
    if (!res.ok) return host.failed(res, 'Could not load your servers.');
    if (!currentServer()) return void status('None of your servers have Koma in them yet.');
    const me = currentMe();
    if (me) fillServers(serverSelect, me.servers, currentServer());
    serverPicker.refresh();
    ready = true;
    await show(tabAt(location.pathname));
  }

  return {
    drawn: start(),
    unmount: () => {
      shown?.unmount();
      serverPicker.destroy();
    },
    navigate: (url) => {
      const tab = tabAt(url.pathname);
      if (tab !== shown?.tab) void show(tab);
    },
  };
}
