import { avatar, el, markdown } from '../widgets';
import { openGear } from '../gear/gear-popup';
import type { RaidView } from '../protocol';
import { nameOf, state } from '../state';
import { ui } from '../ui';
import { fmt, plural } from '../words';

/** How the end screen's table is sorted: by one column, either way (most damage first, to start with). */
type ResultSortKey = 'name' | 'damage' | 'healed' | 'mitigated';
let resultSort: { key: ResultSortKey; dir: 'asc' | 'desc' } = { key: 'damage', dir: 'desc' };

/** ", with 800 / 2,211 HP left", when the boss's HP at the end is known (not for a raid read back from the database). */
const hpLeft = (o: { bossHp: number | null; bossMaxHp: number | null }): string =>
  o.bossHp === null || o.bossMaxHp === null ? '' : `, with ${fmt(o.bossHp)} / ${fmt(o.bossMaxHp)} HP left`;

/** The end of a fight fought out: VICTORY or DEFEAT, and what each raider did, the most damage first. */
export function renderResult(v: RaidView): void {
  const o = v.over!;
  const won = o.end === 'won';
  ui.result.classList.toggle('won', won);
  ui.resultTitle.textContent = won ? 'Victory' : 'Defeat';
  // What the winners got, with the currencies' emojis (a bot from before sends only the numbers: in words then).
  const reward: (Node | string)[] = o.rewardText
    ? [' Everyone who fought gets ', ...markdown(o.rewardText, v.names)]
    : o.reward
      ? [` Everyone who fought gets ${fmt(o.reward.points)} points${o.reward.tokens ? `, ${plural(o.reward.tokens, 'token', 'tokens')}` : ''}${o.reward.gems ? ` and ${plural(o.reward.gems, 'komaGem', 'komaGems')}` : ''}`]
      : [];
  ui.resultText.replaceChildren(
    ...(won
      ? [`${v.boss.name} beaten in ${plural(o.rounds, 'round', 'rounds')}${o.lastHit ? `, the final blow by ${nameOf(o.lastHit)}` : ''}.`, ...reward]
      : [o.end === 'fled' ? `${v.boss.name} got away after ${plural(o.rounds, 'round', 'rounds')}${hpLeft(o)}.` : `The party fell after ${plural(o.rounds, 'round', 'rounds')}${hpLeft(o)}.`]),
  );

  // The columns' headers: which one it's sorted by, and which way.
  for (const button of ui.resultSorts) {
    const on = button.dataset.sort === resultSort.key;
    const th = button.parentElement as HTMLElement;
    th.setAttribute('aria-sort', on ? (resultSort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
    button.classList.toggle('on', on);
    button.dataset.dir = on ? resultSort.dir : '';
  }

  ui.resultRows.textContent = '';
  const nameFor = (id: string): string => v.names[id] ?? 'Someone';
  const { key, dir } = resultSort;
  const rows = [...o.players].sort((a, b) => {
    const by = key === 'name' ? nameFor(a.userId).localeCompare(nameFor(b.userId), undefined, { sensitivity: 'base' }) : a[key] - b[key];
    return dir === 'asc' ? by : -by;
  });
  const party = o.players.map((p) => p.userId);
  for (const p of rows) {
    const tr = el('tr', p.userId === v.you ? 'you' : '');
    // A row shows their gear as they fought (when the bot kept it).
    if (o.gear) {
      tr.classList.add('open');
      tr.tabIndex = 0;
      tr.title = `${nameFor(p.userId)}: see their gear as they fought`;
      tr.addEventListener('click', () => openGear(v, party, p.userId, true));
      tr.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openGear(v, party, p.userId, true);
        }
      });
    }
    // Their picture and name together in the first cell (in a box of their own, so the cell stays a table cell).
    const who = el('div', 'rd-result-who');
    const face = el('span', 'rd-result-face');
    face.append(avatar(p.userId, v));
    who.append(face, el('span', 'rd-result-name', v.names[p.userId] ?? 'Someone'));
    if (p.userId === o.lastHit) who.append(el('span', 'rd-result-star', '⭐'));
    const whoCell = el('td');
    whoCell.append(who);
    tr.append(whoCell, el('td', 'num dmg', fmt(p.damage)), el('td', 'num heal', fmt(p.healed)), el('td', 'num guard', fmt(p.mitigated)));
    ui.resultRows.append(tr);
  }
}

/** The table's headers sort it by their column. */
export function wireResultSort(): void {
  for (const button of ui.resultSorts) {
    button.addEventListener('click', () => {
      const key = button.dataset.sort as ResultSortKey;
      // The same column again: the other way round. Another: most first (names from A).
      resultSort = key === resultSort.key ? { key, dir: resultSort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' };
      if (state.view?.over) renderResult(state.view);
    });
  }
}
