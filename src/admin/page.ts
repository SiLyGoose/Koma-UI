import markup from './admin.html?raw';
import type { SettingProblem, SettingsSaved, SettingsView } from '../protocol/admin';
import { API, busyWith, working } from '../shared/ui';
import type { Page } from '../site/page';
import { api, currentMe, loadMe, logOut, prefetch } from '../site/session';
import { createContext, status, type AdminContext } from './context';
import { changed, fieldText, filter, groupId, plain, refreshField, refreshPending, render, wireText } from './render';

/*
 * The admin page: every one of the bot's settings (the bot's /api/admin/settings, what `k!config` lists), by group, each
 * with what it does, its default and what it can be. Any number of them are changed in their fields, then saved
 * together (the bot checks them all, and the rules between them, and saves all or none: what's wrong is said by each
 * field, or in the save bar for a rule between them). For the bot admin only: the header's menu offers it to them.
 */

const SETTINGS = '/api/admin/settings';

export const adminPage: Page = { title: 'Admin · Komaverse', icon: '🛠️', markup, mount, prefetch: () => (API && currentMe()?.admin ? prefetch(SETTINGS) : undefined) };

/** How long "Saved…" stays up. */
const NOTE_MS = 6000;

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void } {
  const ctx = createContext(root);
  const { ui } = ctx;

  ui.list.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const key = target.closest<HTMLElement>('[data-key]')?.dataset.key;
    const field = key ? ctx.fields.get(key) : undefined;
    if (!field) return;
    // The colour's swatch writes its colour in the field.
    if (target === field.color) field.input.value = target.value.toUpperCase();
    ctx.problems.delete(field.setting.key);
    ctx.problems.delete(null);
    refreshField(ctx, field);
    refreshPending(ctx);
  });
  ui.list.addEventListener('click', (e) => {
    const key = (e.target as HTMLElement).closest<HTMLElement>('[data-use-default]')?.dataset.useDefault;
    const field = key ? ctx.fields.get(key) : undefined;
    if (!field) return;
    field.input.value = fieldText(field.setting, field.setting.default);
    field.input.dispatchEvent(new Event('input', { bubbles: true }));
    field.input.focus();
  });
  // The groups: their section, without the address changing (which the router would take as going somewhere).
  ui.groups.addEventListener('click', (e) => {
    const group = (e.target as HTMLElement).closest<HTMLElement>('[data-group]')?.dataset.group;
    if (!group) return;
    e.preventDefault();
    root.querySelector(`#${groupId(group)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  ui.search.addEventListener('input', () => filter(ctx, ui.search.value));
  ui.discard.addEventListener('click', () => {
    if (!ctx.view || ctx.busy) return;
    ctx.problems.clear();
    render(ctx, ctx.view);
    filter(ctx, ui.search.value);
    refreshPending(ctx);
  });
  ui.save.addEventListener('click', () => void save(ctx));
  // Enter in a field saves.
  ui.list.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).matches('.admin-input')) void save(ctx);
  });

  // Changes not saved yet: asked about before leaving them, for another page of the site or another site altogether.
  const unsaved = (): boolean => [...ctx.fields.values()].some(changed);
  const onLink = (e: MouseEvent): void => {
    const link = (e.target as Element | null)?.closest?.('a[href]');
    if (!link || root.contains(link) || !unsaved()) return;
    if (confirm('Leave without saving your changes?')) return;
    e.preventDefault();
    e.stopPropagation();
  };
  const onUnload = (e: BeforeUnloadEvent): void => {
    if (unsaved()) e.preventDefault();
  };
  // On the window, so it's before the site's own links (../shared/transition/, on the document) take the click.
  window.addEventListener('click', onLink, true);
  window.addEventListener('beforeunload', onUnload);

  return {
    drawn: start(ctx),
    unmount: () => {
      window.removeEventListener('click', onLink, true);
      window.removeEventListener('beforeunload', onUnload);
      clearTimeout(ctx.noteTimer);
    },
  };
}

async function start(ctx: AdminContext): Promise<void> {
  if (!API) return status(ctx, 'This site is not set up yet: VITE_API_URL (the bot’s address) is missing.', true);
  status(ctx, 'Loading…');
  const res = await loadMe();
  if (!res.ok) return failed(ctx, res, 'Could not check who you are.');
  if (!res.data.admin) return status(ctx, 'This page is for the bot admin.');
  await load(ctx);
}

/** Says why asking the bot didn't work (or, for a login that ran out, logs out). */
function failed(ctx: AdminContext, res: { status: number; error: string }, what: string): void {
  if (res.status === 401) return logOut();
  status(ctx, res.error === 'not_admin' ? 'This page is for the bot admin.' : res.status === 404 ? 'The bot doesn’t have an admin page yet.' : what, true);
}

/** The settings, drawn afresh; with `typed` (setting -> field), those fields keep what's in them. */
async function load(ctx: AdminContext, typed?: ReadonlyMap<string, string>): Promise<void> {
  const res = await api<SettingsView>(SETTINGS);
  if (!res.ok) return failed(ctx, res, 'Could not load the settings.');
  status(ctx, null);
  show(ctx, res.data, typed);
}

function show(ctx: AdminContext, view: SettingsView, typed?: ReadonlyMap<string, string>): void {
  const { ui } = ctx;
  render(ctx, view, typed);
  ui.board.hidden = false;
  ui.search.hidden = false;
  filter(ctx, ui.search.value);
  refreshPending(ctx);
}

/** What's in the fields that have changed, by setting. */
const typedNow = (ctx: AdminContext): Map<string, string> =>
  new Map([...ctx.fields.values()].filter(changed).map((field) => [field.setting.key, field.input.value]));

/** Saves every field that's changed, together. */
async function save(ctx: AdminContext): Promise<void> {
  const { ui } = ctx;
  const pending = [...ctx.fields.values()].filter(changed);
  if (ctx.busy || pending.length === 0) return;
  const changes = Object.fromEntries(pending.map((field) => [field.setting.key, wireText(field.setting, field.input.value)]));
  ctx.busy = busyWith('save');
  working(ui.save, ctx.busy, 'save');
  ui.discard.disabled = true;
  const res = await api<SettingsSaved>(SETTINGS, { method: 'POST', body: JSON.stringify({ changes }) });
  ctx.busy = null;
  working(ui.save, null, 'save');
  ui.discard.disabled = false;
  ctx.problems.clear();

  if (res.ok) {
    show(ctx, res.data.settings);
    const lines = res.data.changed.filter((change) => change.oldValue !== change.newValue).map((change) => `${change.key}: ${change.oldValue} → ${change.newValue}`);
    note(ctx, lines.length === 0 ? 'Saved: nothing was different.' : `Saved. ${lines.join(' · ')}`);
    return;
  }
  // No answer ("Reconnecting…" waited for the bot to be back): it may have gone through. What's there now, the fields
  // keeping what's in them (those that went through then match, and aren't changes any more).
  if (res.status === 0) return load(ctx, typedNow(ctx));
  if (res.status === 401) return logOut();
  if (res.error === 'invalid_setting' && Array.isArray(res.detail?.problems)) {
    for (const problem of res.detail.problems as SettingProblem[]) ctx.problems.set(problem.key, plain(problem.error));
    const first = [...ctx.fields.values()].find((field) => ctx.problems.has(field.setting.key));
    if (first) {
      first.row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      first.input.focus({ preventScroll: true });
    }
  } else ctx.problems.set(null, res.error === 'not_admin' ? 'Only the bot admin can change settings.' : 'Could not save. Try again.');
  for (const field of ctx.fields.values()) refreshField(ctx, field);
  refreshPending(ctx);
}

/** Says what was saved, for a few seconds. */
function note(ctx: AdminContext, text: string): void {
  const { note: line } = ctx.ui;
  line.textContent = text;
  line.hidden = false;
  clearTimeout(ctx.noteTimer);
  ctx.noteTimer = window.setTimeout(() => (line.hidden = true), NOTE_MS);
}
