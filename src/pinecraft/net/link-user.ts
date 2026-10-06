import { token } from '../../shared/game';

/** Who this page's link is for (from its token), to mark them on the leaderboard. */
export const linkUser = ((): string | null => {
  try {
    const body = (token ?? '').split('.')[0] ?? '';
    const json = atob(body.replace(/-/g, '+').replace(/_/g, '/'));
    const u = (JSON.parse(json) as { u?: unknown }).u;
    return typeof u === 'string' ? u : null;
  } catch {
    return null;
  }
})();
