import type { Live } from '../protocol/site';
import { api, currentMe, currentServer, hasSession } from '../site/session';

/*
 * The town's side of Friends: the lobby's Friends button (./lobby.ts) opens its page (./friends-page.ts); this puts on it
 * how many others in the server picked are online. And being in the town is being on the site: while it's in view the town
 * asks the bot who's online (GET /api/live, every LIVE_MS: the bot counts them for 30 s after each ask), so the others see
 * them "In Orvel".
 */

const LIVE_MS = 15_000;

export interface FriendsCount {
  /** Asks again as things are now (logged in or out, another server picked). */
  render(): void;
}

export function makeFriendsCount(button: HTMLButtonElement): FriendsCount {
  const badge = document.createElement('span');
  badge.className = 'v2-menu-badge';
  badge.hidden = true;
  button.append(badge);

  /** The server it's about (null: logged out, or none picked). */
  const server = (): string | null => (hasSession() && currentMe() ? currentServer() : null);

  function show(others: number | null): void {
    badge.hidden = !others;
    badge.textContent = others ? String(others) : '';
    button.setAttribute('aria-label', others ? `Friends: ${others} online` : 'Friends');
  }

  let timer = 0;
  let asking = false;
  async function ask(): Promise<void> {
    if (asking) return;
    clearTimeout(timer);
    const guild = server();
    if (!guild) return show(null);
    if (document.hidden) return;
    asking = true;
    try {
      const res = await api<Live>(`/api/live?guild=${encodeURIComponent(guild)}`);
      if (server() === guild) show(res.ok ? res.data.players.filter((p) => p.userId !== res.data.you).length : null);
    } finally {
      asking = false;
    }
    if (!document.hidden) timer = window.setTimeout(() => void ask(), LIVE_MS);
  }
  document.addEventListener('visibilitychange', () => void (document.hidden ? clearTimeout(timer) : ask()));

  void ask();
  return { render: () => void ask() };
}
