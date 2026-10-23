import type { BannerView } from '../protocol/gacha';
import type { GearView } from '../protocol/gear';
import type { HeroesView } from '../protocol/heroes';
import type { RaidShopView } from '../protocol/raid-shop';
import type { ApiResult } from '../site/session';

/** What the inventory's tabs show, each the bot's answer to one GET (page.ts's PATHS): asked for once a server, whichever tab asks first. */
export interface Sources {
  /** GET /api/gear: their copies (the player gear's and the hero gear's). */
  gear: GearView;
  /** GET /api/heroes: the hero gear as heroes wear it, their runes, komaGems and hero essences. */
  heroes: HeroesView;
  /** GET /api/raid-shop: their komaDust, and what a komaGem takes of it. */
  shop: RaidShopView;
  /** GET /api/gacha: their komaTokens. */
  gacha: BannerView;
}

export type Source = keyof Sources;

/** What a tab has from the page (page.ts) around it. */
export interface InventoryHost {
  /** The server picked. */
  server(): string;
  /** What the bot says of `what` in the server picked: asked for once (again with `fresh`). */
  load<K extends Source>(what: K, fresh?: boolean): Promise<ApiResult<Sources[K]>>;
  /** Keeps `data` as what the bot says of `what` now (a change's answer), so the other tabs show it too. */
  keep<K extends Source>(what: K, data: Sources[K]): void;
  /** Their zeiucoins in the server picked (the header's), or null when not known. */
  balance(): number | null;
  /** The line under the tabs: `text` (null hides it), in red when `bad`. */
  status(text: string | null, bad?: boolean): HTMLElement;
  /** Says why asking the bot didn't work, as `what` unless it says more (a login that ran out logs out). */
  failed(res: { status: number; error: string }, what: string): void;
}

/** One of the inventory's tabs, as its bar shows it and the panel under it holds it. */
export interface InventoryTab {
  /** Its path under /inventory/ (/inventory/runes/). */
  id: string;
  label: string;
  /** Its picture on the bar: an inline SVG drawn in currentColor. */
  icon: string;
  /** What it asks the bot for (for the page's prefetch, as the transition covers the page before). */
  uses: readonly Source[];
  /** Sets it up in `root` (the panel, emptied), as a site page does (../site/page.ts). */
  mount(root: HTMLElement, host: InventoryHost): { drawn: Promise<void>; unmount: () => void };
}
