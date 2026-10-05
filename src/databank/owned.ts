import { fillServers } from '../shared/server-options';
import { api, currentMe, currentServer, hasSession, loadMe } from '../site/session';
import type { DatabankContext } from './context';

/** What they own in the server picked (from their gear), by item. */
export async function loadOwned(ctx: DatabankContext): Promise<void> {
  const server = currentServer();
  if (!server) return;
  const res = await api<{ copies: { itemId: string; level: number }[] }>(`/api/gear?guild=${encodeURIComponent(server)}`);
  if (!res.ok) {
    ctx.owned = null;
    ctx.onlyOwned = false;
    return;
  }
  const owned = new Map<string, { count: number; best: number }>();
  for (const copy of res.data.copies) {
    const mine = owned.get(copy.itemId);
    if (mine) {
      mine.count += 1;
      mine.best = Math.max(mine.best, copy.level);
    } else owned.set(copy.itemId, { count: 1, best: copy.level });
  }
  ctx.owned = owned;
}

/** Logged in: the server picker, and what they own. Anyone else just gets the list. */
export async function loadMember(ctx: DatabankContext): Promise<void> {
  if (!hasSession()) return;
  const res = await loadMe();
  const me = currentMe();
  if (!res.ok || !me) return;
  fillServers(ctx.ui.server, me.servers, currentServer());
  await loadOwned(ctx);
}
