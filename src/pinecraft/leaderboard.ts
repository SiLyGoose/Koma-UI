import './leaderboard.css';

/*
 * Pinecraft's leaderboard: a 🏆 chip in the stats bar that opens a popup of the server's best
 * miners (the bot's /api/pinecraft/leaderboard), with a header to switch between blocks mined and
 * coins earned from ores, both all told. The one asking is marked, and shown at the bottom when
 * they aren't in the top 10.
 */

type Stat = 'dug' | 'earned';

interface Leaderboard {
  stat: Stat;
  rows: { rank: number; userId: string; name: string; avatar: string; value: number }[];
  you: { rank: number; value: number } | null;
}

export interface LeaderboardOptions {
  /** Where the 🏆 chip goes (the stats bar): it is put at the end of this. */
  mount: HTMLElement;
  /** The bot's address, and the Authorization header to ask with. */
  api: string;
  auth: () => string;
  /** The one asking (to mark their row), once known. */
  you: () => string | null;
}

const TABS: { stat: Stat; label: string }[] = [
  { stat: 'dug', label: 'Blocks mined' },
  { stat: 'earned', label: 'Coins earned' },
];
const MEDALS = ['🥇', '🥈', '🥉'];
const STAT_KEY = 'pinecraft.leaderboard';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const points = (n: number): string => n.toLocaleString('en-US');

function coin(): HTMLImageElement {
  const img = el('img', 'lb-coin');
  img.src = `${import.meta.env.BASE_URL}shared/zeiucoin.png`;
  img.alt = 'coins';
  return img;
}

/** Puts the 🏆 chip in, and the popup behind it. Returns whether the popup is open (the game ignores its keys then). */
export function startLeaderboard(options: LeaderboardOptions): { isOpen: () => boolean } {
  const button = el('button', 'stat lb-button');
  button.type = 'button';
  button.title = 'Leaderboard';
  button.setAttribute('aria-label', 'Leaderboard');
  button.setAttribute('aria-haspopup', 'dialog');
  button.append(el('span', 'lb-button-icon', '🏆'), el('span', 'label lb-button-label', 'Leaderboard'));
  options.mount.append(button);

  const overlay = el('div', 'lb-overlay');
  overlay.hidden = true;
  const card = el('div', 'lb-card');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Pinecraft leaderboard');
  const head = el('div', 'lb-head');
  const title = el('h2', 'lb-title', '🏆 Leaderboard');
  const close = el('button', 'lb-close', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  head.append(title, close);
  const tabs = el('div', 'lb-tabs');
  tabs.setAttribute('role', 'tablist');
  const tabButtons = TABS.map(({ stat, label }) => {
    const tab = el('button', 'lb-tab', label);
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.addEventListener('click', () => show(stat));
    tabs.append(tab);
    return { stat, tab };
  });
  const list = el('ol', 'lb-list no-scrollbar');
  const note = el('p', 'lb-note', 'All time, in this server. Mines start over every Saturday; these totals don’t.');
  const you = el('div', 'lb-you');
  card.append(head, tabs, list, you, note);
  overlay.append(card);
  document.body.append(overlay);

  let stat: Stat = 'dug';
  try {
    if (localStorage.getItem(STAT_KEY) === 'earned') stat = 'earned';
  } catch {
    // No storage: start on blocks.
  }
  /** Which stat is on screen (answers to an earlier one are dropped). */
  let asking = 0;

  function row(rank: number, avatar: string | null, name: string, value: number, mine: boolean, tagged = mine): HTMLLIElement {
    const li = el('li', `lb-row${mine ? ' mine' : ''}${rank <= 3 ? ` top${rank}` : ''}`);
    li.append(el('span', 'lb-rank', MEDALS[rank - 1] ?? `#${rank}`));
    if (avatar) {
      const img = el('img', 'lb-avatar');
      img.src = avatar;
      img.alt = '';
      li.append(img);
    }
    const who = el('span', 'lb-name', name);
    if (tagged) who.append(el('span', 'lb-tag', 'you'));
    const amount = el('span', 'lb-value', points(value));
    if (stat === 'earned') amount.append(coin());
    else amount.append(el('span', 'lb-unit', value === 1 ? ' block' : ' blocks'));
    li.append(who, amount);
    return li;
  }

  async function show(next: Stat): Promise<void> {
    stat = next;
    try {
      localStorage.setItem(STAT_KEY, stat);
    } catch {
      // Not remembered.
    }
    for (const { stat: s, tab } of tabButtons) {
      tab.classList.toggle('on', s === stat);
      tab.setAttribute('aria-selected', String(s === stat));
    }
    const mine = ++asking;
    list.replaceChildren(el('li', 'lb-empty', 'Loading…'));
    you.hidden = true;
    let board: Leaderboard;
    try {
      const res = await fetch(`${options.api}/api/pinecraft/leaderboard?stat=${stat}`, { headers: { Authorization: options.auth() } });
      if (!res.ok) throw new Error(String(res.status));
      board = (await res.json()) as Leaderboard;
    } catch {
      if (mine === asking) list.replaceChildren(el('li', 'lb-empty', "Couldn't load the leaderboard. Try again in a moment."));
      return;
    }
    if (mine !== asking) return;
    const me = options.you();
    list.replaceChildren(...board.rows.map((r) => row(r.rank, r.avatar, r.name, r.value, r.userId === me)));
    if (board.rows.length === 0) list.replaceChildren(el('li', 'lb-empty', stat === 'dug' ? 'Nobody has dug anything yet.' : 'No ores found yet.'));
    // Not in the top: where they stand, underneath.
    if (board.you && !board.rows.some((r) => r.userId === me)) {
      you.replaceChildren(row(board.you.rank, null, 'You', board.you.value, true, false));
      you.hidden = false;
    }
  }

  const open = (): void => {
    overlay.hidden = false;
    void show(stat);
  };
  const shut = (): void => {
    overlay.hidden = true;
    button.focus();
  };
  button.addEventListener('click', open);
  close.addEventListener('click', shut);
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) shut();
  });
  window.addEventListener('keydown', (e) => {
    if (!overlay.hidden && e.key === 'Escape') shut();
  });
  return { isOpen: () => !overlay.hidden };
}
