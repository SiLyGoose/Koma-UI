import type { Friends, Game, Live } from '../protocol/site';
import { FACE, heroCut } from '../shared/heroes';
import { api, currentMe, currentServer, hasSession } from '../site/session';

/*
 * Friends (the lobby's WorldMap_Button_Friend, ./lobby.ts): a popup drawn as the profile's is (King's Raid's PayShop frame,
 * title bar and close), listing everyone in the server picked who plays with the bot (the bot's GET /api/friends): those on
 * the site now first, with what they're doing, then the rest, offline. Each shown by the hero they walk the town as (the
 * bot keeps it: POST /api/friends/hero, ./hero-pick.ts), else the first of theirs, else Roi, as the town walks them.
 *
 * Being in the town is being on the site: while it's in view the town asks the bot who's online (GET /api/live, every
 * LIVE_MS: the bot counts them for 30 s after each ask), and the button says how many others are. The list is asked for
 * afresh as it's opened, and every OPEN_MS while it's open.
 */

const LIVE_MS = 15_000;
const OPEN_MS = 6_000;

const ACTIVITY: Record<'hub' | Game, string> = {
  hub: 'In Orvel',
  mines: 'Playing Mines',
  pinecraft: 'Playing Pinecraft',
  baccarat: 'Playing Baccarat',
  roulette: 'Playing Roulette',
  poker: 'Playing Poker',
  raid: 'In the Weekly Boss',
  minesweeper: 'Playing Minesweeper',
  technomagic: 'In the TechnoMagic Raid',
  dragon: 'In the Dragon Raid',
  divine: 'In Divine Punishment',
  codedle: 'Playing Codedle',
};

const since = (ms: number): string => {
  const minutes = Math.floor((Date.now() - ms) / 60_000);
  return minutes < 1 ? 'just now' : minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export interface FriendsList {
  /** Asks again as things are now (logged in or out, another server picked). */
  render(): void;
}

/**
 * Friends behind `button` (the lobby's), its popup over the town in `host` (the HUD). Logged out or with no server
 * picked, pressing it says so with `note`.
 */
export function makeFriends(button: HTMLButtonElement, host: HTMLElement, note: (text: string | null, login?: boolean) => void): FriendsList {
  button.setAttribute('aria-haspopup', 'dialog');
  const badge = document.createElement('span');
  badge.className = 'v2-menu-badge';
  badge.hidden = true;
  button.append(badge);

  const shade = document.createElement('div');
  shade.className = 'v2-pop';
  shade.hidden = true;
  shade.innerHTML = `<section class="v2-pop-frame v2-friends" role="dialog" aria-modal="true" aria-labelledby="v2-friends-title">
      <header class="v2-pop-title"><h2 id="v2-friends-title">Friends</h2><button type="button" class="v2-pop-close" aria-label="Close"></button></header>
      <div class="v2-pop-body">
        <p class="v2-pop-status" hidden></p>
        <h3 class="v2-pop-section v2-friends-on" hidden></h3>
        <ul class="v2-friends-list v2-friends-online"></ul>
        <h3 class="v2-pop-section v2-friends-off" hidden></h3>
        <ul class="v2-friends-list v2-friends-offline"></ul>
      </div>
    </section>`;
  host.append(shade);
  const $ = <T extends HTMLElement>(selector: string): T => shade.querySelector(selector) as T;
  const frame = $('.v2-pop-frame');
  const status = $('.v2-pop-status');
  const onTitle = $('.v2-friends-on');
  const offTitle = $('.v2-friends-off');
  const onList = $('.v2-friends-online');
  const offList = $('.v2-friends-offline');
  const say = (text: string | null): void => {
    status.hidden = text === null;
    status.textContent = text ?? '';
  };

  /** The server it's about (null: logged out, or none picked). */
  const server = (): string | null => (hasSession() && currentMe() ? currentServer() : null);

  // ---- Who's online: the button's count, and the town counted as being on the site.

  let liveTimer = 0;
  let liveAsking = false;
  async function askLive(): Promise<void> {
    if (liveAsking) return;
    clearTimeout(liveTimer);
    const guild = server();
    if (!guild) return showCount(null);
    if (document.hidden) return;
    liveAsking = true;
    try {
      const res = await api<Live>(`/api/live?guild=${encodeURIComponent(guild)}`);
      if (server() === guild) showCount(res.ok ? res.data.players.filter((p) => p.userId !== res.data.you).length : null);
    } finally {
      liveAsking = false;
    }
    if (!document.hidden) liveTimer = window.setTimeout(() => void askLive(), LIVE_MS);
  }
  function showCount(others: number | null): void {
    badge.hidden = !others;
    badge.textContent = others ? String(others) : '';
    button.setAttribute('aria-label', others ? `Friends: ${others} online` : 'Friends');
  }
  document.addEventListener('visibilitychange', () => void (document.hidden ? clearTimeout(liveTimer) : askLive()));

  // ---- The list.

  let list: Friends | null = null;
  let listOf: string | null = null;
  let drawn = '';
  let openTimer = 0;
  let asking = false;

  async function askList(): Promise<void> {
    clearTimeout(openTimer);
    const guild = server();
    if (shade.hidden || !guild) return;
    if (!asking) {
      asking = true;
      if (listOf !== guild) {
        list = null;
        draw();
      }
      try {
        const res = await api<Friends>(`/api/friends?guild=${encodeURIComponent(guild)}`);
        if (server() === guild) {
          if (res.ok) {
            list = res.data;
            listOf = guild;
            showCount(list.friends.filter((f) => f.online && f.userId !== list?.you).length);
          } else if (!list) say('Could not read who is here. Trying again…');
          draw();
        }
      } finally {
        asking = false;
      }
    }
    if (!shade.hidden && !document.hidden) openTimer = window.setTimeout(() => void askList(), OPEN_MS);
  }

  function row(friend: Friends['friends'][number], you: boolean): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'v2-friend';
    li.classList.toggle('offline', !friend.online);
    const hero = document.createElement('span');
    hero.className = 'v2-friend-hero';
    const face = document.createElement('img');
    face.alt = '';
    hero.append(face);
    void heroCut(friend.hero, FACE, 96).then((src) => src && (face.src = src));
    const text = document.createElement('div');
    text.className = 'v2-friend-text';
    const name = document.createElement('b');
    name.className = 'v2-friend-name';
    name.textContent = friend.name;
    if (you) {
      const tag = document.createElement('span');
      tag.className = 'v2-friend-you';
      tag.textContent = 'you';
      name.append(tag);
    }
    const what = document.createElement('span');
    what.className = 'v2-friend-what';
    if (friend.online) {
      const dot = document.createElement('i');
      dot.className = 'v2-friend-dot';
      dot.setAttribute('aria-hidden', 'true');
      what.append(dot, `${ACTIVITY[friend.online.activity] ?? 'Online'}${friend.online.status ? ` · ${friend.online.status}` : ''} · ${since(friend.online.since)}`);
    } else what.textContent = 'Offline';
    text.append(name, what);
    const avatar = document.createElement('img');
    avatar.className = 'v2-friend-avatar';
    avatar.alt = '';
    avatar.src = friend.avatar;
    li.append(hero, text, avatar);
    return li;
  }

  function draw(): void {
    if (!list) {
      onTitle.hidden = offTitle.hidden = true;
      onList.replaceChildren();
      offList.replaceChildren();
      drawn = '';
      return say('Looking for who is here…');
    }
    // (Only when it would say something else: the times are in minutes.)
    const key = `${Math.floor(Date.now() / 60_000)}|${JSON.stringify(list)}`;
    if (key === drawn) return;
    drawn = key;
    say(null);
    const on = list.friends.filter((f) => f.online);
    const off = list.friends.filter((f) => !f.online);
    onTitle.hidden = false;
    onTitle.textContent = `Online · ${on.length}`;
    offTitle.hidden = off.length === 0;
    offTitle.textContent = `Offline · ${off.length}`;
    const you = list.you;
    onList.replaceChildren(...on.map((f) => row(f, f.userId === you)));
    offList.replaceChildren(...off.map((f) => row(f, f.userId === you)));
  }

  // ---- Opening and closing (as the profile's popup: a press on the shade, Escape or the close).

  let before: HTMLElement | null = null;
  function open(): void {
    if (!hasSession()) return note('Log in to see your friends.', true);
    if (!server()) return note('Pick a server in your profile to see your friends there.');
    note(null);
    before = document.activeElement as HTMLElement | null;
    shade.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    if (listOf !== server()) list = null;
    drawn = '';
    draw();
    void askList();
    $('.v2-pop-close').focus();
  }
  function close(): void {
    if (shade.hidden) return;
    shade.hidden = true;
    clearTimeout(openTimer);
    button.setAttribute('aria-expanded', 'false');
    before?.focus();
  }
  button.addEventListener('click', open);
  $('.v2-pop-close').addEventListener('click', close);
  shade.addEventListener('pointerdown', (e) => {
    if (!frame.contains(e.target as Node)) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !shade.hidden) {
      e.stopPropagation();
      close();
    }
  });

  function render(): void {
    if (!server()) close();
    else if (!shade.hidden) void askList();
    void askLive();
  }

  render();
  return { render };
}
