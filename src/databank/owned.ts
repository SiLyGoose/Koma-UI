import type { HeroesView } from '../shared/heroes';
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

/** The heroes they own in the server picked (the shop's /api/heroes); with none known, the heroes' Filter offers no Show owned. */
export async function loadOwnedHeroes(ctx: DatabankContext): Promise<void> {
  const server = currentServer();
  if (!server) return;
  const res = await api<HeroesView>(`/api/heroes?guild=${encodeURIComponent(server)}`);
  ctx.ownedHeroes = res.ok ? new Set(res.data.heroes.filter((hero) => hero.owned).map((hero) => hero.id)) : null;
  const shown = ctx.ownedHeroes !== null;
  if (shown !== (ctx.heroChoice.owned !== null)) ctx.heroChoice = { ...ctx.heroChoice, owned: shown ? false : null };
}

/** What goes by the server picked: what they own there (items and heroes), and how its raid stands. */
export async function loadServer(ctx: DatabankContext): Promise<void> {
  await Promise.all([loadOwned(ctx), loadOwnedHeroes(ctx), loadWeek(ctx)]);
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
