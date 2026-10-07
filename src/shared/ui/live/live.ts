import './live.css';
import { navigate } from '../../transition';

/*
 * Who's on the site right now (the bot's /api/live): a "🟢 3 online" button that drops down a list
 * of each member, what they're doing, and a button to watch anyone who is in a game (/api/watch
 * gives the link). And, for someone playing, how many are watching them.
 *
 * The games put it in the frame's title bar and ask with their link's token; the front page puts it
 * by the member's profile and asks with their login.
 */

type Activity = 'hub' | 'mines' | 'pinecraft' | 'baccarat' | 'roulette' | 'poker' | 'raid';

interface Live {
  you: string;
  players: { userId: string; name: string; avatar: string; activity: Activity; status: string; watchers: number; since: number; watchable: boolean }[];
}

export interface LiveOptions {
  /** Where the button goes: it is put at the start of this. */
  mount: HTMLElement;
  /** The bot's address, like https://koma.duckdns.org. */
  api: string;
  /** The Authorization header to ask with (null: not yet, like before logging in). */
  auth: () => string | null;
  /** Extra to put after /api/live and /api/watch, like "?guild=123" (the front page's server). */
  query?: () => string;
  /** Open watch links in a new tab (a game page, so the game isn't left). */
  newTab?: boolean;
}

const ACTIVITY: Record<Activity, string> = { hub: '🏠 Home', mines: '💎 Mines', pinecraft: '🌲 Pinecraft', baccarat: '🃏 Baccarat', roulette: '🎡 Roulette', poker: '♠️ Poker', raid: '⚔️ Raid' };
const POLL_MS = 10_000;
const POLL_OPEN_MS = 4_000;

/** The bot's https address, from a game's WebSocket address (wss://bot/mine is https://bot). */
export function apiFromSocket(socket: string): string {
  const url = new URL(socket);
  return `${url.protocol === 'wss:' ? 'https:' : 'http:'}//${url.host}`;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const since = (ms: number): string => {
  const minutes = Math.floor((Date.now() - ms) / 60_000);
  return minutes < 1 ? 'just now' : minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

/** Puts the online button in, and keeps it up to date. */
export function startLive(options: LiveOptions): void {
  const wrap = el('div', 'live');
  const button = el('button', 'live-button');
  button.type = 'button';
  button.setAttribute('aria-haspopup', 'true');
  button.setAttribute('aria-expanded', 'false');
  button.hidden = true;
  const panel = el('div', 'live-panel no-scrollbar');
  panel.hidden = true;
  wrap.append(button, panel);
  options.mount.prepend(wrap);

  let live: Live | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const url = (path: string): string => `${options.api}${path}${options.query?.() ?? ''}`;

  function render(): void {
    if (!live) return;
    const count = live.players.length;
    button.hidden = false;
    button.innerHTML = '<span class="live-dot"></span>';
    button.append(`${count} online`);
    panel.textContent = '';
    panel.append(el('div', 'live-head', count === 1 ? 'Just you here' : `${count} on the site`));
    for (const p of live.players) {
      const row = el('div', 'live-row');
      const avatar = el('img', 'live-avatar');
      avatar.src = p.avatar;
      avatar.alt = '';
      const text = el('div', 'live-text');
      const name = el('div', 'live-name', p.name);
      if (p.userId === live.you) name.append(el('span', 'live-you', 'you'));
      const what = el('div', 'live-what', p.status ? `${ACTIVITY[p.activity]} · ${p.status}` : ACTIVITY[p.activity]);
      const meta = el('div', 'live-meta', `${since(p.since)}${p.watchers > 0 ? ` · 👁 ${p.watchers} watching` : ''}`);
      text.append(name, what, meta);
      row.append(avatar, text);
      if (p.watchable) {
        const watch = el('button', 'live-watch', '👁 Watch');
        watch.type = 'button';
        watch.title = `Watch ${p.name}`;
        watch.addEventListener('click', () => void startWatching(p.activity as Exclude<Activity, 'hub'>, p.userId, watch));
        row.append(watch);
      }
      panel.append(row);
    }
  }

  async function refresh(): Promise<void> {
    if (timer) clearTimeout(timer);
    timer = null;
    const auth = options.auth();
    if (auth) {
      try {
        const res = await fetch(url('/api/live'), { headers: { Authorization: auth } });
        if (res.ok) {
          live = (await res.json()) as Live;
          render();
        }
      } catch {
        // The bot didn't answer: try again next time.
      }
    }
    timer = setTimeout(() => void refresh(), panel.hidden ? POLL_MS : POLL_OPEN_MS);
  }

  async function startWatching(game: Exclude<Activity, 'hub'>, target: string, watch: HTMLButtonElement): Promise<void> {
    const auth = options.auth();
    if (!auth) return;
    // Opened now, while the click still counts, so the browser doesn't block it; the link goes in once it's here.
    const tab = options.newTab ? window.open('', '_blank') : null;
    watch.disabled = true;
    watch.textContent = 'Opening…';
    try {
      const res = await fetch(url('/api/watch'), { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ game, target }) });
      if (!res.ok) throw new Error(String(res.status));
      const { url: link } = (await res.json()) as { url: string };
      if (tab) tab.location.href = link;
      else navigate(link);
      close();
    } catch {
      tab?.close();
      watch.textContent = 'Not playing now';
      void refresh();
    } finally {
      watch.disabled = false;
    }
  }

  function open(): void {
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    void refresh();
  }

  function close(): void {
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }

  button.addEventListener('click', () => (panel.hidden ? open() : close()));
  document.addEventListener('pointerdown', (e) => {
    if (!panel.hidden && !wrap.contains(e.target as Node)) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) close();
  });
  void refresh();
}

/** For someone playing: how many are watching, as "👁 2" in the title bar (hidden at 0). */
export function showWatchers(count: number): void {
  let badge = document.getElementById('watchers');
  if (!badge) {
    badge = el('span', 'live-watchers');
    badge.id = 'watchers';
    badge.title = 'Watching you play';
    document.querySelector('.frame > .top')?.append(badge);
  }
  badge.hidden = count <= 0;
  badge.textContent = `👁 ${count}`;
}

/** For a watch-only page: says whose game it is, in the title bar. */
export function showWatching(name: string, away = false): void {
  let banner = document.getElementById('watching');
  if (!banner) {
    banner = el('span', 'live-watching');
    banner.id = 'watching';
    document.querySelector('.frame > .top h1')?.after(banner);
  }
  banner.textContent = away ? `👁 ${name} left the game` : `👁 Watching ${name}`;
  banner.classList.toggle('away', away);
}

/**
 * Watching, the player's page went away: after AWAY_GRACE_MS (long enough for a reload or a blip)
 * `show` tells the watcher they left, with the way home. If their game comes back before (or after),
 * `watchBack` puts things as they were.
 */
const AWAY_GRACE_MS = 4000;
let awayTimer: ReturnType<typeof setTimeout> | null = null;
let awayHide: (() => void) | null = null;

export function watchAway(show: () => void, hide: () => void): void {
  if (awayTimer) clearTimeout(awayTimer);
  awayTimer = setTimeout(() => {
    awayTimer = null;
    show();
    awayHide = hide;
  }, AWAY_GRACE_MS);
}

/** Watching: the player's game is back (a message about it came). */
export function watchBack(): void {
  if (awayTimer) clearTimeout(awayTimer);
  awayTimer = null;
  awayHide?.();
  awayHide = null;
}
