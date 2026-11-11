import type { HeroesView } from '../protocol/heroes';
import { skinOf } from '../shared/hero-outfits';
import { FACE, heroCut } from '../shared/heroes';
import { store } from '../shared/ui';
import { api, currentMe, currentServer, hasSession } from '../site/session';

/*
 * Who walks the town: a button by the member's name (the face of the hero walking, or the miner's lamp) opening a list
 * of the heroes they own in the server picked (the heroes page's /api/heroes), and the miner. Their pick is kept on this
 * device, for them in that server (heroes are owned server by server: a hero and the outfit it wears), and checked against
 * what they own whenever the list is read again.
 */

/** The hero walking: its id and the skin it's in (null: the miner). */
export interface WalkerChoice {
  id: string;
  skin: number;
}

const KEY = (user: string, server: string): string => `koma.v2.walker.${user}.${server}`;

export interface HeroPick {
  /** The member's kept pick (null: the miner, or no one logged in). */
  saved(): WalkerChoice | null;
  /** Reads what they own again: their pick let go of if they don't own it here (or its outfit changed); shown too. */
  check(): Promise<void>;
  /** Shows the button as who's logged in now has it. */
  render(): void;
}

export function makeHeroPick(into: HTMLElement, chose: (choice: WalkerChoice | null) => void): HeroPick {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'v2-round v2-hero-button';
  button.setAttribute('aria-label', 'Pick who walks the town');
  button.setAttribute('aria-haspopup', 'dialog');
  button.hidden = true;
  const face = document.createElement('img');
  face.alt = '';
  face.hidden = true;
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a5 5 0 0 1 5 5v1h1a1 1 0 0 1 0 2h-1.3A5 5 0 0 1 12 13a5 5 0 0 1-4.7-3H6a1 1 0 0 1 0-2h1V7a5 5 0 0 1 5-5zm-6 20a6 6 0 0 1 12 0z"/></svg>`;
  button.append(face);

  const panel = document.createElement('div');
  panel.className = 'v2-heroes';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Who walks the town');
  panel.hidden = true;
  panel.innerHTML = `<div class="v2-heroes-head"><b>Who walks the town</b><button type="button" class="v2-heroes-close" aria-label="Close">×</button></div>
    <p class="v2-heroes-status" hidden></p>
    <div class="v2-heroes-grid"></div>`;
  into.append(button, panel);
  const status = panel.querySelector('.v2-heroes-status') as HTMLElement;
  const grid = panel.querySelector('.v2-heroes-grid') as HTMLElement;
  (panel.querySelector('.v2-heroes-close') as HTMLElement).addEventListener('click', () => close());

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
  let reading: Promise<void> | null = null;
  function read(): Promise<void> {
    const server = currentServer();
    if (ownedIn !== server) owned = null;
    if (!hasSession() || !server) return Promise.resolve();
    reading ??= api<HeroesView>(`/api/heroes?guild=${encodeURIComponent(server)}`)
      .then((res) => {
        if (currentServer() !== server) return;
        ownedIn = server;
        owned = res.ok
          ? res.data.heroes
              .filter((hero) => hero.owned)
              .map((hero) => ({ id: hero.id, name: hero.name, skin: skinOf(hero.id, hero.outfit) }))
              .sort((a, b) => a.name.localeCompare(b.name))
          : null;
      })
      .finally(() => (reading = null));
    return reading;
  }

  async function check(): Promise<void> {
    const kept = saved();
    if (!kept) return render();
    await read();
    if (saved() !== null && saved()?.id !== kept.id) return;
    if (!owned) return render();
    const now = owned.find((hero) => hero.id === kept.id);
    const next = now ? { id: now.id, skin: now.skin } : null;
    if (!next || next.skin !== kept.skin) {
      keep(next);
      chose(next);
    }
    render();
    if (!panel.hidden) fill();
  }

  function pick(choice: WalkerChoice | null): void {
    keep(choice);
    chose(choice);
    render();
    close();
  }

  function tile(label: string, picked: boolean, picture: (img: HTMLImageElement) => void, then: () => void): HTMLButtonElement {
    const tileButton = document.createElement('button');
    tileButton.type = 'button';
    tileButton.className = 'v2-heroes-tile';
    tileButton.classList.toggle('picked', picked);
    tileButton.setAttribute('aria-pressed', String(picked));
    const img = document.createElement('img');
    img.alt = '';
    const name = document.createElement('span');
    name.textContent = label;
    tileButton.append(img, name);
    picture(img);
    tileButton.addEventListener('click', then);
    return tileButton;
  }

  function fill(): void {
    const kept = saved();
    grid.replaceChildren();
    const say = (text: string | null): void => {
      status.hidden = text === null;
      status.textContent = text ?? '';
    };
    if (!hasSession()) return say('Log in to walk the town as one of your heroes.');
    if (!currentServer()) return say('Pick a server to see your heroes.');
    if (!owned) return say(reading ? 'Reading your heroes…' : 'Could not read your heroes. Try again.');
    say(owned.length ? null : "You don't own a hero here yet: the Shop has them.");
    grid.append(
      tile('Miner', !kept, (img) => img.classList.add('v2-heroes-miner'), () => pick(null)),
      ...owned.map((hero) =>
        tile(hero.name, kept?.id === hero.id, (img) => void heroCut(hero.id, FACE, 96).then((src) => src && (img.src = src)), () => pick({ id: hero.id, skin: hero.skin })),
      ),
    );
  }

  function open(): void {
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    fill();
    void read().then(() => !panel.hidden && fill());
  }
  function close(): void {
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }
  button.addEventListener('click', () => (panel.hidden ? open() : close()));
  document.addEventListener('pointerdown', (e) => {
    if (!panel.hidden && !panel.contains(e.target as Node) && !button.contains(e.target as Node)) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      e.stopPropagation();
      close();
      button.focus();
    }
  });

  function render(): void {
    button.hidden = !currentMe();
    const kept = saved();
    face.hidden = !kept;
    button.classList.toggle('has-hero', !!kept);
    if (kept) void heroCut(kept.id, FACE, 96).then((src) => src && saved()?.id === kept.id && (face.src = src));
  }

  render();
  return { saved, check, render };
}
