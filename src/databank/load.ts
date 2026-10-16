import { api, type ApiResult } from '../site/session';
import type { Databank } from './types';

/*
 * The bot's /api/databank: the same for everyone, and changed only when the bot is updated. Asked for the first time
 * it's wanted, and kept while the site is open, so going back to the databank doesn't download it again.
 */

let asked: Promise<ApiResult<Databank>> | null = null;

/** The databank, asked for once (one that couldn't be read is asked for again next time). */
export function loadDatabank(): Promise<ApiResult<Databank>> {
  asked ??= api<Databank>('/api/databank').then((res): ApiResult<Databank> => {
    if (!res.ok) {
      asked = null;
      return res;
    }
    return { ok: true, data: withPools(res.data) };
  });
  return asked;
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
