import { api, currentServer } from '../site/session';
import type { DatabankContext } from './context';
import type { RaidWeekView } from './types';

/** How the raid stands in the server picked: this week's boss there, and how far its difficulty is unlocked. Nothing from a bot that doesn't say. */
export async function loadWeek(ctx: DatabankContext): Promise<void> {
  const server = currentServer();
  ctx.week = null;
  if (!server) return;
  const res = await api<RaidWeekView>(`/api/raid/week?guild=${encodeURIComponent(server)}`);
  if (res.ok) ctx.week = res.data;
}
