import type { Outfit, OutfitsView } from '../shared/outfits';

/** The Outfits tab's elements, found once in its root. */
export interface OutfitsUi {
  server: HTMLSelectElement;
  balance: HTMLElement;
  status: HTMLElement;
  list: HTMLElement;
  buy: HTMLElement;
  buySprite: HTMLImageElement;
  buyTitle: HTMLElement;
  buyPrice: HTMLElement;
  buyNote: HTMLElement;
  buyConfirm: HTMLButtonElement;
}

/** Everything the mounted tab knows. */
export interface OutfitsContext {
  ui: OutfitsUi;
  view: OutfitsView | null;
  /** The outfit the buy box is asking about. */
  buying: Outfit | null;
  /** A buy on its way: the cards wait for it. */
  busy: boolean;
}

export function createContext(root: HTMLElement): OutfitsContext {
  const $ = <T extends HTMLElement>(selector: string): T => root.querySelector(selector) as T;
  return {
    ui: {
      server: $<HTMLSelectElement>('#server'),
      balance: $('#balance'),
      status: $('#status'),
      list: $('#outfits'),
      buy: $('#buy'),
      buySprite: $<HTMLImageElement>('#buy-sprite'),
      buyTitle: $('#buy-title'),
      buyPrice: $('#buy-price'),
      buyNote: $('#buy-note'),
      buyConfirm: $<HTMLButtonElement>('[data-buy="confirm"]'),
    },
    view: null,
    buying: null,
    busy: false,
  };
}

export function status(ctx: OutfitsContext, text: string | null, bad = false): void {
  ctx.ui.status.hidden = text === null;
  ctx.ui.status.textContent = text ?? '';
  ctx.ui.status.classList.toggle('bad', bad);
}
