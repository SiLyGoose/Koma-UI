import { fillServers } from '../shared/ui';
import { api, currentMe, currentServer, hasSession, loadMe } from '../site/session';
import type { DatabankContext } from './context';
import { loadWeek } from './week';

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

/** What goes by the server picked: the items they own there, and how its raid stands. */
export async function loadServer(ctx: DatabankContext): Promise<void> {
  await Promise.all([loadOwned(ctx), loadWeek(ctx)]);
}

/** Logged in: the server picker, what they own, and how the raid stands in the server picked. Anyone else just gets the lists. */
export async function loadMember(ctx: DatabankContext): Promise<void> {
  if (!hasSession()) return;
  const res = await loadMe();
  const me = currentMe();
  if (!res.ok || !me) return;
  fillServers(ctx.ui.server, me.servers, currentServer());
  await loadServer(ctx);
}
