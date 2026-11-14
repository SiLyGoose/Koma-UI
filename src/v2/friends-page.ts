import type { Friends, Game } from '../protocol/site';
import { FACE, heroCut } from '../shared/heroes';
import { navigate } from '../shared/transition';
import { withQuery } from '../site/game-link';
import { go } from '../site/nav';
import { playGame } from '../site/play';
import type { Page } from '../site/page';
import { api, currentMe, currentServer, hasSession, loadMe, prefetchFor } from '../site/session';

/*
 * Friends (v2's own page, opened by the lobby's Friends button, ./lobby.ts): everyone in the server picked who plays with the
 * bot (its GET /api/friends), those on the site now first, then the rest, offline. A row each, laid out as Genshin Impact's
 * friends list is (the user's reference): a long pill about a tenth of the screen high, the member's hero in a ring at its
 * left (the hero they walk the town as, else their first, else Roi, as the town walks them), their name and whether they're
 * online under it, what they're doing in the middle, and their Discord picture filling its right end, fading into the row
 * (where Genshin has the player's namecard). Laid out on v2's canvas (640 high, ./panel.ts), so it scales with the screen.
 * At its right end two buttons: Watch (only lit while they're in a game that can be watched, as /api/live says; otherwise
 * there but greyed and struck through; a raid's, getting ready or fighting, too) and Heroes, their roster on the heroes page
 * (/heroes/?user=; the one asking: their own). Before them, Join, only while they're in a TechnoMagic or Dragon Raid getting
 * ready with room (the bot's online.join): into that raid, as Find Raid joins one.
 * Asked again every REFRESH_MS while it's open.
 */

const REFRESH_MS = 6_000;

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

/** A Discord picture big enough to fill a row's end (the bot sends them 64 across). */
function bigAvatar(url: string): string {
  try {
    const big = new URL(url);
    if (big.hostname.endsWith('discordapp.com') && !big.pathname.startsWith('/embed/')) big.searchParams.set('size', '512');
    return big.href;
  } catch {
    return url;
  }
}

/** Watch's icon: a solid eye, drawn to match Heroes' (Honkai: Star Rail's AvatarIcon, public/shared/icons/heroes.webp). */
const EYE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12 4.5C6.6 4.5 2.4 8 .8 12c1.6 4 5.8 7.5 11.2 7.5S21.6 16 23.2 12C21.6 8 17.4 4.5 12 4.5Zm0 12.6a5.1 5.1 0 1 1 0-10.2 5.1 5.1 0 0 1 0 10.2Zm0-2.5a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z"/></svg>`;

const friendsPath = (guild: string): string => `/api/friends?guild=${guild}`;

const markup = `<section class="v2-friends-page">
  <header class="v2-fr-bar">
    <h1 class="v2-fr-title"><img alt="" src="${import.meta.env.BASE_URL}kr/ui/lobby/friends.webp" />Friends</h1>
    <p class="v2-fr-count" data-count hidden></p>
  </header>
  <p class="v2-fr-status" data-status hidden></p>
  <ul class="v2-fr-list" data-list></ul>
</section>`;

export const friendsPage: Page = {
  title: 'Friends · Komaverse',
  icon: '🤝',
  markup,
  mount,
  prefetch: () => prefetchFor(friendsPath),
};

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void } {
  const list = root.querySelector('[data-list]') as HTMLElement;
  const status = root.querySelector('[data-status]') as HTMLElement;
  const count = root.querySelector('[data-count]') as HTMLElement;
  const say = (text: string | null): void => {
    status.hidden = text === null;
    status.textContent = text ?? '';
  };

  /** The rows drawn, by member (kept as they are when only what they say changes, so their pictures don't load again). */
  const rows = new Map<string, { li: HTMLLIElement; key: string }>();

  function row(friend: Friends['friends'][number], you: boolean): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'v2-fr-row';
    li.innerHTML = `<span class="v2-fr-art" aria-hidden="true"><img alt="" /></span>
      <span class="v2-fr-hero"><img alt="" /></span>
      <div class="v2-fr-who"><b class="v2-fr-name"></b><span class="v2-fr-state"><i class="v2-fr-dot" aria-hidden="true"></i><span></span></span></div>
      <p class="v2-fr-what"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.5 3 2 6.6 2 11c0 2.4 1.3 4.5 3.4 6L4.5 21l4.4-2.4c1 .3 2 .4 3.1.4 5.5 0 10-3.6 10-8s-4.5-8-10-8m-4 9.3a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6m4 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6m4 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6"/></svg><span></span></p>
      <div class="v2-fr-acts"><button type="button" class="v2-fr-act v2-fr-join" data-join hidden>Join</button><button type="button" class="v2-fr-act v2-fr-icon" data-watch>${EYE}</button><button type="button" class="v2-fr-act v2-fr-icon" data-roster><i class="v2-fr-ico-heroes" aria-hidden="true"></i></button></div>`;
    const art = li.querySelector('.v2-fr-art img') as HTMLImageElement;
    // (A picture that won't load: no picture, the row's own colour there.)
    art.addEventListener('error', () => art.remove(), { once: true });
    art.src = bigAvatar(friend.avatar);
    const face = li.querySelector('.v2-fr-hero img') as HTMLImageElement;
    void heroCut(friend.hero, FACE, 128).then((src) => src && (face.src = src));
    const name = li.querySelector('.v2-fr-name') as HTMLElement;
    name.textContent = friend.name;
    if (you) {
      li.classList.add('you');
      const tag = document.createElement('span');
      tag.className = 'v2-fr-you';
      tag.textContent = 'You';
      name.append(tag);
    }
    const roster = li.querySelector('[data-roster]') as HTMLButtonElement;
    roster.title = you ? 'Your heroes' : `${friend.name}'s heroes`;
    roster.setAttribute('aria-label', roster.title);
    roster.addEventListener('click', () => go(you ? '/heroes/' : `/heroes/?user=${encodeURIComponent(friend.userId)}`));
    const watch = li.querySelector('[data-watch]') as HTMLButtonElement;
    watch.addEventListener('click', () => void watching(friend.userId, watch));
    const join = li.querySelector('[data-join]') as HTMLButtonElement;
    join.addEventListener('click', () => void joining(friend.userId, join));
    fill(li, friend);
    return li;
  }

  /** What each row's Watch would watch (the game they're in), as last asked: null, nothing to watch. */
  const games = new Map<string, Game>();

  /** What each row's Join would join (the raid they're in, getting ready with room), as last asked. */
  const raids = new Map<string, { game: Game; boss: string; room: string }>();

  async function joining(userId: string, button: HTMLButtonElement): Promise<void> {
    const raid = raids.get(userId);
    if (!raid) return;
    button.disabled = true;
    button.classList.add('opening');
    button.textContent = 'Opening…';
    // (As v2's: its back arrow to Adventure, as one opened there.)
    const refused = await playGame(raid.game, { boss: raid.boss, room: raid.room, v2: raid.game });
    if (!refused || gone) return;
    button.disabled = false;
    button.classList.remove('opening');
    button.textContent = 'Join';
    say(refused === 'not_member' ? "You don't seem to be in that server any more." : 'Could not open the raid. Try again.');
  }

  async function watching(userId: string, button: HTMLButtonElement): Promise<void> {
    const game = games.get(userId);
    const server = currentServer();
    if (!game || !server) return;
    button.disabled = true;
    button.classList.add('opening');
    const res = await api<{ url: string }>(`/api/watch?guild=${encodeURIComponent(server)}`, { method: 'POST', body: JSON.stringify({ game, target: userId }) });
    if (gone) return;
    // (A TechnoMagic or Dragon Raid as v2's, its way back to Adventure.)
    if (res.ok) return navigate(game === 'technomagic' || game === 'dragon' ? withQuery(res.data.url, { v2: game }) : res.data.url);
    // (Not in that game any more: greyed till the next answer says otherwise.)
    games.delete(userId);
    button.classList.remove('opening');
    button.title = 'Not playing now';
    void ask();
  }

  /** What a row says that changes: online or not, and what they're doing. */
  function fill(li: HTMLLIElement, friend: Friends['friends'][number]): void {
    const on = friend.online;
    li.classList.toggle('offline', !on);
    (li.querySelector('.v2-fr-state > span') as HTMLElement).textContent = on ? 'Online' : 'Offline';
    const what = li.querySelector('.v2-fr-what') as HTMLElement;
    what.hidden = !on;
    (what.querySelector('span') as HTMLElement).textContent = on ? `${ACTIVITY[on.activity] ?? 'On the site'}${on.status ? ` · ${on.status}` : ''} · ${since(on.since)}` : '';
    const watch = li.querySelector('[data-watch]') as HTMLButtonElement;
    const game = on?.watchable && on.activity !== 'hub' ? on.activity : null;
    if (game) games.set(friend.userId, game);
    else games.delete(friend.userId);
    const join = li.querySelector('[data-join]') as HTMLButtonElement;
    const raid = on?.join && on.activity !== 'hub' ? { game: on.activity, ...on.join } : null;
    if (raid) raids.set(friend.userId, raid);
    else raids.delete(friend.userId);
    if (!join.classList.contains('opening')) {
      join.hidden = !raid;
      join.title = raid ? `Join ${friend.name}'s raid (${ACTIVITY[raid.game]})` : '';
    }
    if (watch.classList.contains('opening')) return;
    watch.disabled = !game;
    watch.title = game ? `Watch ${friend.name} (${ACTIVITY[game]})` : li.classList.contains('you') ? "You can't watch yourself" : on ? 'Not in a game that can be watched' : 'Offline';
    watch.setAttribute('aria-label', game ? `Watch ${friend.name}` : `Watch ${friend.name} (${watch.title.toLowerCase()})`);
  }

  function draw(data: Friends): void {
    const on = data.friends.filter((f) => f.online).length;
    count.hidden = false;
    count.innerHTML = '';
    count.append('Online ', Object.assign(document.createElement('b'), { textContent: `${on}/${data.friends.length}` }));
    if (!data.friends.length) say('No one in this server plays with Koma yet.');
    else say(null);
    const seen = new Set<string>();
    const order: HTMLLIElement[] = [];
    for (const friend of data.friends) {
      seen.add(friend.userId);
      const key = `${friend.name}|${friend.hero}|${friend.avatar}`;
      let kept = rows.get(friend.userId);
      if (!kept || kept.key !== key) {
        kept = { li: row(friend, friend.userId === data.you), key };
        rows.set(friend.userId, kept);
      } else fill(kept.li, friend);
      order.push(kept.li);
    }
    for (const id of [...rows.keys()]) if (!seen.has(id)) rows.delete(id);
    // (Only moved where the order changed: the rest stay put, their pictures with them.)
    order.forEach((li, i) => list.children[i] !== li && list.insertBefore(li, list.children[i] ?? null));
    while (list.children.length > order.length) list.lastElementChild?.remove();
  }

  let timer = 0;
  let gone = false;
  let drawnOnce = false;
  async function ask(): Promise<void> {
    clearTimeout(timer);
    const server = currentServer();
    if (gone) return;
    if (!hasSession()) return say('Log in from the town to see your friends.');
    if (!currentMe()) await loadMe();
    if (!server || !currentMe()?.servers.some((s) => s.id === server)) return say('Pick a server in the town first.');
    if (!document.hidden) {
      const res = await api<Friends>(friendsPath(encodeURIComponent(server)));
      if (gone || currentServer() !== server) return;
      if (res.ok) {
        draw(res.data);
        drawnOnce = true;
      } else if (!drawnOnce) say('Could not read who is here. Trying again…');
    }
    timer = window.setTimeout(() => void ask(), REFRESH_MS);
  }
  const back = (): void => void (!document.hidden && ask());
  document.addEventListener('visibilitychange', back);

  say('Looking for who is here…');
  return {
    drawn: ask(),
    unmount: () => {
      gone = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', back);
    },
  };
}
