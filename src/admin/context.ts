import type { SettingView, SettingsView } from '../protocol/admin';
import type { Busy } from '../shared/ui';

/** The admin page's elements, found once in its root. */
export interface AdminUi {
  search: HTMLInputElement;
  status: HTMLElement;
  /** What was saved, for a few seconds after. */
  note: HTMLElement;
  board: HTMLElement;
  groups: HTMLElement;
  list: HTMLElement;
  /** "No settings match", at the end of the list. */
  empty: HTMLElement;
  savebar: HTMLElement;
  pending: HTMLElement;
  problem: HTMLElement;
  discard: HTMLButtonElement;
  save: HTMLButtonElement;
}

/** One setting's row, as drawn (render.ts). */
export interface Field {
  setting: SettingView;
  row: HTMLElement;
  input: HTMLInputElement;
  error: HTMLElement;
  useDefault: HTMLButtonElement;
  /** The embeds' colour's swatch. */
  color?: HTMLInputElement;
}

/** Everything the mounted admin page knows. */
export interface AdminContext {
  ui: AdminUi;
  view: SettingsView | null;
  /** Each setting's row, by its name. */
  fields: Map<string, Field>;
  /** What the bot said is wrong with the last save: by setting, or (null) with them together. */
  problems: Map<string | null, string>;
  /** Saving (the Save button: 'save'). */
  busy: Busy | null;
  /** The note's timer. */
  noteTimer: number | undefined;
}

export function createContext(root: HTMLElement): AdminContext {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector(`#${id}`) as T;
  const empty = document.createElement('p');
  empty.className = 'status admin-empty';
  empty.textContent = 'No settings match.';
  empty.hidden = true;
  return {
    ui: {
      search: $<HTMLInputElement>('search'),
      status: $('status'),
      note: $('note'),
      board: $('board'),
      groups: $('groups'),
      list: $('list'),
      empty,
      savebar: $('savebar'),
      pending: $('pending'),
      problem: $('problem'),
      discard: $<HTMLButtonElement>('discard'),
      save: $<HTMLButtonElement>('save'),
    },
    view: null,
    fields: new Map(),
    problems: new Map(),
    busy: null,
    noteTimer: undefined,
  };
}

export function status(ctx: AdminContext, text: string | null, bad = false): void {
  ctx.ui.status.hidden = text === null;
  ctx.ui.status.textContent = text ?? '';
  ctx.ui.status.classList.toggle('bad', bad);
}
