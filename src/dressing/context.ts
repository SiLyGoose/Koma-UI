import type { OutfitsView } from '../shared/outfits';
import { doneMark, type Busy } from '../shared/ui';

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
  /** "✓ Equipped", in Wear's place for the outfit worn. */
  worn: HTMLElement;
  get: HTMLAnchorElement;
}

/** Everything the mounted dressing room knows. */
export interface DressingContext {
  ui: DressingUi;
  view: OutfitsView | null;
  /** The outfit picked in the list, standing on the right (the one worn, to begin with). */
  picked: string | null;
  /** Putting one on (its button: 'wear:<outfit>'): the button waits for it. */
  busy: Busy | null;
}

export function createContext(root: HTMLElement): DressingContext {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector(`#${id}`) as T;
  const worn = doneMark('Equipped');
  worn.hidden = true;
  $('wear').after(worn);
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
      worn,
      get: $<HTMLAnchorElement>('get'),
    },
    view: null,
    picked: null,
    busy: null,
  };
}

export function status(ctx: DressingContext, text: string | null, bad = false): void {
  ctx.ui.status.hidden = text === null;
  ctx.ui.status.textContent = text ?? '';
  ctx.ui.status.classList.toggle('bad', bad);
}
