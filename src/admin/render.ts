import type { SettingView, SettingsView } from '../protocol/admin';
import type { AdminContext, Field } from './context';

/*
 * Drawing the admin page's settings: a section for each group, a row for each setting (its name, what it does, its
 * default and range, and its field), and the groups down the side to jump to. A percentage's field holds 40 for 40%
 * and a multiplier's 2.5 for 2.5x, with the % or x beside it.
 */

/** A setting's value as its field holds it. */
export function fieldText(setting: SettingView, value: number | string = setting.value): string {
  if (typeof value === 'string') return value;
  // 0.07 * 100 is 7.000000000000001.
  return String(setting.percent ? Number((value * 100).toFixed(6)) : value);
}

/** What a field says, as the bot reads it (its % or x put back). */
export function wireText(setting: SettingView, text: string): string {
  const typed = text.trim();
  if (typed === '') return typed;
  if (setting.percent && !typed.endsWith('%')) return `${typed}%`;
  if (setting.multiplier && !/x$/i.test(typed)) return `${typed}x`;
  return typed;
}

/** A bound of a setting, as the bot shows its values. */
function bound(setting: SettingView, n: number): string {
  if (setting.percent) return `${Number((n * 100).toFixed(6))}%`;
  if (setting.multiplier) return `${n}x`;
  return n.toLocaleString('en-US');
}

/** "0% to 100%", "at least 1" or nothing. */
function range(setting: SettingView): string {
  const { min, max } = setting;
  if (min !== undefined && max !== undefined) return `${bound(setting, min)} to ${bound(setting, max)}`;
  if (min !== undefined) return `at least ${bound(setting, min)}`;
  if (max !== undefined) return `at most ${bound(setting, max)}`;
  return '';
}

/** The bot's messages are written for Discord: without its `code` and **bold** marks. */
export const plain = (text: string): string => text.replace(/\*\*|`/g, '');

/** A group's section's id. */
export const groupId = (group: string): string => `group-${group.toLowerCase()}`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
};

function row(setting: SettingView): Field {
  const id = `setting-${setting.key}`;
  const line = el('div', 'admin-row');
  line.dataset.key = setting.key;

  const text = el('div', 'admin-row-text');
  const name = el('label', 'admin-key', setting.key);
  name.htmlFor = id;
  const about = el('p', 'admin-desc', setting.description);
  const facts = el('p', 'admin-facts');
  const fallback = el('span', 'admin-default', `Default ${setting.defaultShown}`);
  facts.append(fallback);
  const bounds = range(setting) || setting.expects;
  if (bounds) facts.append(el('span', 'admin-range', bounds));
  const error = el('p', 'admin-error');
  error.id = `${id}-error`;
  error.hidden = true;
  text.append(name, about, facts, error);

  const field = el('div', 'admin-field');
  const input = el('input', 'admin-input');
  input.id = id;
  input.type = 'text';
  input.value = fieldText(setting);
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-describedby', error.id);
  if (setting.type !== 'string') {
    input.inputMode = setting.type === 'int' && (setting.min ?? 0) >= 0 ? 'numeric' : 'decimal';
    input.classList.add('number');
  }
  if (setting.expects) input.placeholder = setting.expects;
  if (setting.locked) {
    input.disabled = true;
    input.title = setting.locked;
    about.after(el('p', 'admin-locked', setting.locked));
  }
  const box = el('div', 'admin-input-box');
  box.append(input);
  if (setting.percent || setting.multiplier) box.append(el('span', 'admin-unit', setting.percent ? '%' : 'x'));
  field.append(box);

  // The embeds' colour: a swatch to pick it with, beside its #RRGGBB.
  let color: HTMLInputElement | undefined;
  if (setting.key === 'embedColor' && typeof setting.value === 'string') {
    color = el('input', 'admin-color');
    color.type = 'color';
    color.value = setting.value.toLowerCase();
    color.setAttribute('aria-label', 'Pick the embed colour');
    color.disabled = input.disabled;
    box.prepend(color);
  }

  const useDefault = el('button', 'action secondary admin-use-default', 'Use default');
  useDefault.type = 'button';
  useDefault.dataset.useDefault = setting.key;
  useDefault.setAttribute('aria-label', `Use the default for ${setting.key}`);
  field.append(useDefault);

  line.append(text, field);
  return { setting, row: line, input, error, useDefault, color };
}

/**
 * Draws every setting of `view` afresh, with the fields in `typed` (setting -> what was in its field) holding that
 * instead of the setting's value: changes not saved yet, kept through a reload.
 */
export function render(ctx: AdminContext, view: SettingsView, typed: ReadonlyMap<string, string> = new Map()): void {
  const { ui } = ctx;
  ctx.view = view;
  ctx.fields.clear();
  const sections: HTMLElement[] = [];
  const links: HTMLElement[] = [];
  for (const group of view.groups) {
    const settings = view.settings.filter((setting) => setting.group === group);
    if (settings.length === 0) continue;
    const section = el('section', 'admin-group');
    section.id = groupId(group);
    section.dataset.group = group;
    const title = el('h2', 'admin-group-title', group);
    title.id = `${section.id}-title`;
    section.setAttribute('aria-labelledby', title.id);
    section.append(title);
    for (const setting of settings) {
      const field = row(setting);
      const kept = typed.get(setting.key);
      if (kept !== undefined && !field.input.disabled) field.input.value = kept;
      ctx.fields.set(setting.key, field);
      section.append(field.row);
    }
    sections.push(section);

    const link = el('a', 'admin-group-link', group);
    link.href = `#${section.id}`;
    link.dataset.group = group;
    links.push(link);
  }
  ui.list.replaceChildren(...sections, ui.empty);
  ui.groups.replaceChildren(...links);
  for (const field of ctx.fields.values()) refreshField(ctx, field);
}

/** Whether a field holds something other than its setting's value (a change not saved yet). */
export const changed = (field: Field): boolean => !field.input.disabled && field.input.value.trim() !== fieldText(field.setting);

/** One row as its field stands: changed or not, its problem, and whether Use default would change anything. */
export function refreshField(ctx: AdminContext, field: Field): void {
  const { setting, row: line, input, error, useDefault, color } = field;
  line.classList.toggle('changed', changed(field));
  const problem = ctx.problems.get(setting.key);
  error.hidden = problem === undefined;
  error.textContent = problem ?? '';
  input.setAttribute('aria-invalid', String(problem !== undefined));
  useDefault.hidden = input.disabled || input.value.trim() === fieldText(setting, setting.default);
  if (color && /^#[0-9a-f]{6}$/i.test(input.value.trim())) color.value = input.value.trim().toLowerCase();
}

/** The save bar, and the groups' dots, as the fields stand. */
export function refreshPending(ctx: AdminContext): void {
  const { ui } = ctx;
  const pending = [...ctx.fields.values()].filter(changed);
  ui.savebar.hidden = pending.length === 0 && !ctx.problems.has(null);
  ui.pending.textContent = pending.length === 1 ? '1 change not saved' : `${pending.length} changes not saved`;
  const general = ctx.problems.get(null);
  ui.problem.hidden = general === undefined;
  ui.problem.textContent = general ?? '';
  const groups = new Set(pending.map((field) => field.setting.group));
  for (const link of ui.groups.querySelectorAll<HTMLElement>('[data-group]')) link.classList.toggle('changed', groups.has(link.dataset.group ?? ''));
}

/** Shows only the settings whose name or description has every word of `query`, and the groups with any. */
export function filter(ctx: AdminContext, query: string): void {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  let shown = 0;
  const groups = new Set<string>();
  for (const { setting, row: line } of ctx.fields.values()) {
    const haystack = `${setting.key} ${setting.description}`.toLowerCase();
    const match = words.every((word) => haystack.includes(word));
    line.hidden = !match;
    if (match) {
      shown++;
      groups.add(setting.group);
    }
  }
  for (const section of ctx.ui.list.querySelectorAll<HTMLElement>('.admin-group')) section.hidden = !groups.has(section.dataset.group ?? '');
  for (const link of ctx.ui.groups.querySelectorAll<HTMLElement>('[data-group]')) link.hidden = !groups.has(link.dataset.group ?? '');
  ctx.ui.empty.hidden = shown > 0;
}
