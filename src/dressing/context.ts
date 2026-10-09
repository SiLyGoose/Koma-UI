import type { OutfitsView } from '../shared/outfits';

/** The dressing room's elements, found once in its root. */
export interface DressingUi {
  server: HTMLSelectElement;
  status: HTMLElement;
  room: HTMLElement;
  list: HTMLElement;
  model: HTMLImageElement;
  name: HTMLElement;
  state: HTMLElement;
  wear: HTMLButtonElement;
  get: HTMLAnchorElement;
}

/** Everything the mounted dressing room knows. */
export interface DressingContext {
  ui: DressingUi;
  view: OutfitsView | null;
  /** The outfit picked in the list, standing on the right (the one worn, to begin with). */
  picked: string | null;
  /** Putting one on: the button waits for it. */
  busy: boolean;
}

export function createContext(root: HTMLElement): DressingContext {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector(`#${id}`) as T;
  return {
    ui: {
      server: $<HTMLSelectElement>('server'),
      status: $('status'),
      room: $('room'),
      list: $('list'),
      model: $<HTMLImageElement>('model'),
      name: $('model-name'),
      state: $('model-state'),
      wear: $<HTMLButtonElement>('wear'),
      get: $<HTMLAnchorElement>('get'),
    },
    view: null,
    picked: null,
    busy: false,
  };
}

export function status(ctx: DressingContext, text: string | null, bad = false): void {
  ctx.ui.status.hidden = text === null;
  ctx.ui.status.textContent = text ?? '';
  ctx.ui.status.classList.toggle('bad', bad);
}
