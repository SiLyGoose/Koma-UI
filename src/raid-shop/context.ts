import type { Busy } from '../shared/ui';
import type { RaidShopItem, RaidShopView } from './types';

/** The Raid Gear tab's elements, found once in its root. */
export interface RaidShopUi {
  server: HTMLSelectElement;
  gems: HTMLElement;
  strip: HTMLElement;
  timer: HTMLElement;
  refreshBox: HTMLElement;
  refreshLeft: HTMLElement;
  refresh: HTMLButtonElement;
  status: HTMLElement;
  shelf: HTMLElement;
  ask: HTMLElement;
  askArt: HTMLElement;
  askTitle: HTMLElement;
  askAbout: HTMLElement;
  askEffects: HTMLElement;
  askPrice: HTMLElement;
  askConfirm: HTMLButtonElement;
}

/** What the box is asking about: buying an item, or refreshing the shelf. */
export type Asking = { kind: 'buy'; item: RaidShopItem } | { kind: 'refresh' };

/** Everything the mounted tab knows. */
export interface RaidShopContext {
  ui: RaidShopUi;
  view: RaidShopView | null;
  asking: Asking | null;
  /** A buy or a refresh on its way (the box's button: 'confirm'): the cards wait for it. */
  busy: Busy | null;
}

export function createContext(root: HTMLElement): RaidShopContext {
  const $ = <T extends HTMLElement>(selector: string): T => root.querySelector(selector) as T;
  return {
    ui: {
      server: $<HTMLSelectElement>('#server'),
      gems: $('#gems'),
      strip: $('#strip'),
      timer: $('#timer'),
      refreshBox: $('#refresh-box'),
      refreshLeft: $('#refresh-left'),
      refresh: $<HTMLButtonElement>('#refresh'),
      status: $('#status'),
      shelf: $('#shelf'),
      ask: $('#ask'),
      askArt: $('#ask-art'),
      askTitle: $('#ask-title'),
      askAbout: $('#ask-about'),
      askEffects: $('#ask-effects'),
      askPrice: $('#ask-price'),
      askConfirm: $<HTMLButtonElement>('[data-ask="confirm"]'),
    },
    view: null,
    asking: null,
    busy: null,
  };
}

export function status(ctx: RaidShopContext, text: string | null, bad = false): void {
  ctx.ui.status.hidden = text === null;
  ctx.ui.status.textContent = text ?? '';
  ctx.ui.status.classList.toggle('bad', bad);
}
