import type { HeroesView } from '../protocol/heroes';
import { skinOf } from '../shared/hero-outfits';
import { FACE, heroCut } from '../shared/heroes';
import { store } from '../shared/ui';
import { api, currentMe, currentServer, hasSession } from '../site/session';

/*
 * Who walks the town: always one of the member's heroes. Their pick (the profile's popup, ./profile.ts, lists the heroes they
 * own in the server picked: the heroes page's /api/heroes), else the first of their heroes, else, owning none, Roi: given to
 * them for nothing (POST /api/heroes/starter, the bot's, only while they have no hero). Logged out, or with no server
 * picked, Roi walks it. Their pick is kept on this device, for them in that server (heroes are owned server by server: a
 * hero and the outfit it wears), and checked against what they own whenever the list is read.
 */

/** The hero walking: its id and the skin it's in. */
export interface WalkerChoice {
  id: string;
  skin: number;
}

/** Who walks for someone with no hero (and is given to them): King's Raid's Roi (the bot's STARTER_HERO). */
export const STARTER: WalkerChoice = { id: 'roi', skin: 0 };

const KEY = (user: string, server: string): string => `koma.v2.walker.${user}.${server}`;

export interface HeroPick {
  /** Works out who walks now (and, owning no hero, gives them Roi), saying so to `chose`. */
  settle(): Promise<void>;
  /** Who walks now. */
  walking(): WalkerChoice;
  /** Lists their heroes in `grid` (picking one walks it), saying with `say` why there are none; read again first. */
  list(grid: HTMLElement, say: (text: string | null) => void): void;
}

export function makeHeroPick(chose: (choice: WalkerChoice) => void): HeroPick {
  /** Where their pick is kept: for who's logged in, in the server picked (null: no one, or no server). */
  const where = (): string | null => {
    const who = currentMe()?.user.id;
    const server = currentServer();
    return who && server ? KEY(who, server) : null;
  };
  function saved(): WalkerChoice | null {
    const key = where();
    if (!key) return null;
    try {
      const kept = JSON.parse(store.get(localStorage, key) ?? 'null') as WalkerChoice | null;
      return kept && typeof kept.id === 'string' && Number.isInteger(kept.skin) ? kept : null;
    } catch {
      return null;
    }
  }
  function keep(choice: WalkerChoice | null): void {
    const key = where();
    if (key) store.set(localStorage, key, choice ? JSON.stringify(choice) : null);
  }

  /** What they own in server `ownedIn`, as last read (null: not read, or it couldn't be). */
  let owned: { id: string; name: string; skin: number }[] | null = null;
  let ownedIn: string | null = null;
  const heroesOf = (view: HeroesView): { id: string; name: string; skin: number }[] =>
    view.heroes
      .filter((hero) => hero.owned)
      .map((hero) => ({ id: hero.id, name: hero.name, skin: skinOf(hero.id, hero.outfit) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  let reading: Promise<void> | null = null;
  function read(): Promise<void> {
    const server = currentServer();
    if (ownedIn !== server) owned = null;
    if (!hasSession() || !server) return Promise.resolve();
    reading ??= api<HeroesView>(`/api/heroes?guild=${encodeURIComponent(server)}`)
      .then((res) => {
        if (currentServer() !== server) return;
        ownedIn = server;
        owned = res.ok ? heroesOf(res.data) : null;
      })
      .finally(() => (reading = null));
    return reading;
  }

  /** Who walks now, as last worked out. */
  let walking: WalkerChoice = STARTER;
  const walk = (choice: WalkerChoice): void => {
    walking = choice;
    chose(choice);
  };

  /** Bumped by each settle: one overtaken (another server picked meanwhile) leaves it to the newer. */
  let settling = 0;
  async function settle(): Promise<void> {
    const run = ++settling;
    const server = currentServer();
    if (!currentMe() || !server) return walk(STARTER);
    // (Their pick at once, while what they own is read.)
    const kept = saved();
    if (kept) walk(kept);
    await read();
    if (run !== settling) return;
    if (!owned) {
      if (!kept) walk(STARTER);
      return;
    }
    if (owned.length === 0) {
      // None: Roi, given to them (only while they have no hero: 'owned', they got one meanwhile).
      const res = await api<HeroesView>('/api/heroes/starter', { method: 'POST', body: JSON.stringify({ guild: server }) });
      if (run !== settling) return;
      if (res.ok) {
        owned = heroesOf(res.data);
        ownedIn = server;
      } else await read();
      if (run !== settling) return;
    }
    const theirs = owned ?? [];
    const now = (kept && theirs.find((hero) => hero.id === kept.id)) ?? theirs[0];
    // (Their pick gone, or in another outfit now: kept as it is.)
    if (kept && (!now || now.id !== kept.id)) keep(null);
    else if (kept && now && now.skin !== kept.skin) keep({ id: now.id, skin: now.skin });
    walk(now ? { id: now.id, skin: now.skin } : STARTER);
    shown?.();
  }

  function pick(choice: WalkerChoice): void {
    keep(choice);
    walk(choice);
    shown?.();
  }

  function tile(hero: { id: string; name: string; skin: number }): HTMLButtonElement {
    const picked = walking.id === hero.id;
    const tileButton = document.createElement('button');
    tileButton.type = 'button';
    tileButton.className = 'v2-heroes-tile';
    tileButton.classList.toggle('picked', picked);
    tileButton.setAttribute('aria-pressed', String(picked));
    const img = document.createElement('img');
    img.alt = '';
    const name = document.createElement('span');
    name.textContent = hero.name;
    tileButton.append(img, name);
    void heroCut(hero.id, FACE, 96).then((src) => src && (img.src = src));
    tileButton.addEventListener('click', () => pick({ id: hero.id, skin: hero.skin }));
    return tileButton;
  }

  /** The list shown (redrawn as what they own is read, or they pick), till another is asked for. */
  let shown: (() => void) | null = null;
  function list(grid: HTMLElement, say: (text: string | null) => void): void {
    const fill = (): void => {
      grid.replaceChildren();
      if (!hasSession()) return say('Log in to walk the town as one of your heroes.');
      if (!currentServer()) return say('Pick a server to see your heroes.');
      if (!owned) return say(reading ? 'Reading your heroes…' : 'Could not read your heroes. Try again.');
      say(null);
      grid.append(...owned.map(tile));
    };
    shown = fill;
    fill();
    void read().then(() => shown === fill && fill());
  }

  return { settle, walking: () => walking, list };
}
