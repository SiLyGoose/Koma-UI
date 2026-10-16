import { api, type ApiResult } from '../site/session';
import type { Databank } from './types';

/*
 * The bot's /api/databank: the same for everyone, changed by the bot's settings (re-read while it runs) or an update.
 * The browser keeps it, and asks the bot each visit whether it has changed (its ETag): unchanged, nothing is downloaded
 * again. Here, one answer serves the page's prefetch (as the transition covers the page before) and the page itself.
 */

/** How long an answer is shared: from the prefetch to the page set up under the transition, a second or so. */
const SHARED_MS = 10_000;

let asked: { at: number; answer: Promise<ApiResult<Databank>> } | null = null;

/** The databank, asked for (the answer asked for a moment ago, if there is one). */
export function loadDatabank(): Promise<ApiResult<Databank>> {
  if (asked && performance.now() - asked.at < SHARED_MS) return asked.answer;
  const answer = api<Databank>('/api/databank').then((res): ApiResult<Databank> => (res.ok ? { ok: true, data: withPools(res.data) } : res));
  asked = { at: performance.now(), answer };
  return answer;
}

/**
 * Each item's levels with the lines it shares with others put back in front of them: the bot sends those once
 * (Databank.pools), not with each of the hundred-odd items that have them. (A bot from before them sends none.)
 */
function withPools(databank: Databank): Databank {
  const pools: Partial<Databank['pools']> = databank.pools ?? {};
  return {
    ...databank,
    items: databank.items.map((item) => {
      const pool = item.pool && pools[item.pool];
      return pool ? { ...item, effects: item.effects.map((lines) => [...pool, ...lines]) } : item;
    }),
  };
}
