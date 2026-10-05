/** Someone in the roster (the bot's GET /api/gear/members). */
export interface Member {
  userId: string;
  name: string;
  avatar: string;
  /** How many copies they own (left out when it isn't known: the raid's party). */
  copies?: number;
  you: boolean;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

/** Where the gear view gets what it shows, and how it changes it. */
export interface GearHost {
  /** Asks the bot (errors are { status, error }; status 0: no answer). */
  api<T>(path: string, init?: RequestInit): Promise<ApiResult<T>>;
  /** The bot's address is set (the site's is built with it). */
  ready: boolean;
  /** Who's looking (null until loadMe has answered), and their servers. */
  me(): { user: { name: string }; servers: { id: string; name: string }[] } | null;
  loadMe(fresh?: boolean): Promise<ApiResult<unknown>>;
  server(): string | null;
  setServer(id: string): void;
  logOut(): void;
  go(href: string): void;
  /**
   * A party's gear (the raid's): they're the roster (in their order, with no server picker), `first` is
   * shown first, and only with `edit` can the one marked `you` change what they wear (equip, unequip,
   * switch loadouts; never sell, upgrade or lock). Nobody else's is theirs to change.
   */
  party?: { members: Member[]; first: string; edit?: boolean };
}
