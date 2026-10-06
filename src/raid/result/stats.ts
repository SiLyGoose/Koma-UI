import { popupClosed } from '../../shared/items';
import { avatar, el, popupShown } from '../widgets';
import type { RaidView } from '../protocol';
import { nameOf, state } from '../state';
import { ui } from '../ui';
import { fmt } from '../words';
import { niceScale } from './nice-scale';

/* More stats: a popup over the end screen, charting one stat for every raider. */

/** What one raider did, as the end screen gets it. */
type RaiderStats = NonNullable<RaidView['over']>['players'][number];

/** The stats More stats can draw, in groups down its left (more to come). */
const MORE_STATS: { group: string; key: Exclude<keyof RaiderStats, 'userId'>; label: string }[] = [
  { group: 'Healing', key: 'healedSelf', label: 'Healing Done' },
  { group: 'Healing', key: 'healedAllies', label: 'Ally Healing' },
  { group: 'Defense', key: 'mitigated', label: 'Damage Mitigated' },
  { group: 'Defense', key: 'damageTaken', label: 'Damage Taken' },
];
let moreStat: (typeof MORE_STATS)[number]['key'] = 'healedSelf';

export function renderStats(v: RaidView): void {
  const o = v.over;
  if (!o) return;
  // The choices, once: a radio for each stat, under its group's heading.
  if (!ui.statsPick.childElementCount) {
    let group = '';
    for (const stat of MORE_STATS) {
      if (stat.group !== group) {
        group = stat.group;
        ui.statsPick.append(el('p', 'rd-stats-group', group));
      }
      const label = el('label', 'rd-stats-option');
      const input = el('input');
      input.type = 'radio';
      input.name = 'more-stat';
      input.value = stat.key;
      input.addEventListener('change', () => {
        moreStat = stat.key;
        if (state.view) renderStats(state.view);
      });
      label.append(input, el('span', 'rd-stats-radio'), el('span', '', stat.label));
      ui.statsPick.append(label);
    }
  }
  for (const input of ui.statsPick.querySelectorAll<HTMLInputElement>('input')) input.checked = input.value === moreStat;
  const stat = MORE_STATS.find((s) => s.key === moreStat) ?? MORE_STATS[0]!;
  ui.statsTitle.textContent = stat.label;

  // Every raider in the order they joined, a bar each against the scale.
  const values = o.players.map((p) => ({ userId: p.userId, value: p[stat.key] ?? 0 }));
  const { top, step } = niceScale(Math.max(0, ...values.map((r) => r.value)));
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const grid = el('div', 'rd-stats-grid');
  grid.setAttribute('aria-hidden', 'true');
  for (const tick of ticks) {
    const line = el('span');
    line.style.left = `${(tick / top) * 100}%`;
    grid.append(line);
  }
  ui.statsRows.replaceChildren(
    grid,
    ...values.map(({ userId, value }) => {
      const row = el('div', `rd-stats-row${userId === v.you ? ' you' : ''}`);
      row.title = `${nameOf(userId)}: ${fmt(value)}`;
      const face = el('span', 'rd-stats-face');
      face.append(avatar(userId, v));
      const track = el('span', 'rd-stats-track');
      const bar = el('span', 'rd-stats-bar');
      bar.style.width = `${(value / top) * 100}%`;
      track.append(bar, el('b', 'rd-stats-value', fmt(value)));
      row.append(face, track);
      return row;
    }),
  );
  ui.statsAxis.replaceChildren(
    ...ticks.map((tick) => {
      const label = el('span', '', fmt(tick));
      label.style.left = `${(tick / top) * 100}%`;
      return label;
    }),
  );
}

function openStats(): void {
  if (!state.view?.over) return;
  ui.statsPop.hidden = false;
  popupShown();
  renderStats(state.view);
  ui.statsClose.focus();
}

/** Closes More stats, with the popup's closing sound unless `quiet` (the end screen going took it down). */
export function closeStats(quiet = false): void {
  if (ui.statsPop.hidden) return;
  if (!quiet) popupClosed();
  ui.statsPop.hidden = true;
  popupShown();
  ui.moreStats.focus({ preventScroll: true });
}

/** More stats' button, and its ways out: its ✕, the dark around it, and Escape (when no gear is open over it). */
export function wireStats(): void {
  ui.moreStats.addEventListener('click', openStats);
  ui.statsClose.dataset.sfx = 'own';
  ui.statsClose.addEventListener('click', () => closeStats());
  ui.statsPop.addEventListener('click', (event) => {
    if (event.target === ui.statsPop) closeStats();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && ui.gearPop.hidden) closeStats();
  });
}
