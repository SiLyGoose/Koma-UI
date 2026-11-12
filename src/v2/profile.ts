import { FACE, heroCut } from '../shared/heroes';
import { coin } from '../shared/util/coin';
import { currentMe, currentServer, hasSession, logOut, setServer } from '../site/session';
import type { HeroPick } from './hero-pick';

/*
 * The member at the town's top left, as King's Raid's lobby has its player (TopmostMenu's ProfileUi_Root: the
 * WorldMap_UserInfo_Frame, 410x162 in its units, the leader hero in its ring, the level in the dark plate, the name on the
 * bar, the EXP gauge under it): here the hero walking the town in the ring, their Discord picture in the plate, their name,
 * and the server picked on the gauge. Pressing it opens their profile, drawn as King's Raid's InspectUserInfoPopup is (its
 * PayShop frame, title bar and close): who they are, the server (picked there), who walks the town (../hero-pick.ts), and
 * Log out. Logged out, it shows Roi and logs in. Its art: public/kr/ui/lobby/ (KR-extracted/scripts/kr-lobby-ui.py).
 */

export interface Profile {
  /** Shows who's logged in, the server and the hero walking as they are now. */
  render(): void;
}

const points = (n: number): string => n.toLocaleString('en-US');

export function makeProfile(into: HTMLElement, pick: HeroPick, logIn: () => void, serverChanged: () => void, loggedOut: () => void): Profile {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'v2-profile';
  button.setAttribute('aria-haspopup', 'dialog');
  // The hero and the Discord picture under the frame (its ring and its plate's window over them), the words over it.
  button.innerHTML = `<span class="v2-profile-hero"><img alt="" /></span><span class="v2-profile-plate"><img alt="" /></span>
    <span class="v2-profile-frame" aria-hidden="true"></span><span class="v2-profile-name"></span><span class="v2-profile-server"></span>`;
  into.append(button);
  const $ = <T extends HTMLElement>(root: HTMLElement, selector: string): T => root.querySelector(selector) as T;
  const hero = $<HTMLImageElement>(button, '.v2-profile-hero img');
  const avatar = $<HTMLImageElement>(button, '.v2-profile-plate img');
  const name = $(button, '.v2-profile-name');
  const server = $(button, '.v2-profile-server');

  // The popup: a shade over the town (a press on it closes it, as King's Raid's Outside_ClickClose), and its frame.
  const shade = document.createElement('div');
  shade.className = 'v2-pop';
  shade.hidden = true;
  shade.innerHTML = `<section class="v2-pop-frame" role="dialog" aria-modal="true" aria-labelledby="v2-profile-title">
      <header class="v2-pop-title"><h2 id="v2-profile-title"></h2><button type="button" class="v2-pop-close" aria-label="Close"></button></header>
      <div class="v2-pop-body">
        <div class="v2-pop-who"><img class="v2-pop-avatar" alt="" /><div><b class="v2-pop-name"></b><span class="v2-pop-sub">Logged in with Discord</span></div></div>
        <h3 class="v2-pop-section">Server</h3>
        <div class="v2-pop-servers"></div>
        <h3 class="v2-pop-section">Walks the town</h3>
        <p class="v2-pop-status" hidden></p>
        <div class="v2-pop-heroes"></div>
        <div class="v2-pop-actions"><button type="button" class="v2-pop-button v2-pop-logout">Log out</button></div>
      </div>
    </section>`;
  // (Over the town with the rest of the HUD, so it turns with the page when it is turned by hand.)
  (into.closest('.v2-hud') ?? document.body).append(shade);
  const frame = $(shade, '.v2-pop-frame');
  const title = $(shade, '#v2-profile-title');
  const popAvatar = $<HTMLImageElement>(shade, '.v2-pop-avatar');
  const popName = $(shade, '.v2-pop-name');
  const servers = $(shade, '.v2-pop-servers');
  const status = $(shade, '.v2-pop-status');
  const heroes = $(shade, '.v2-pop-heroes');
  const say = (text: string | null): void => {
    status.hidden = text === null;
    status.textContent = text ?? '';
  };

  function fillServers(): void {
    const me = currentMe();
    servers.replaceChildren();
    if (!me) return;
    if (!me.servers.length) {
      const none = document.createElement('p');
      none.className = 'v2-pop-status';
      none.textContent = 'None of your servers have Koma in them yet.';
      return void servers.append(none);
    }
    const picked = currentServer();
    for (const s of me.servers) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'v2-pop-server';
      row.classList.toggle('picked', s.id === picked);
      row.setAttribute('aria-pressed', String(s.id === picked));
      const icon = document.createElement(s.icon ? 'img' : 'span');
      icon.className = 'v2-pop-server-icon';
      if (s.icon) (icon as HTMLImageElement).src = s.icon;
      else icon.textContent = s.name.slice(0, 1).toUpperCase();
      const label = document.createElement('span');
      label.className = 'v2-pop-server-name';
      label.textContent = s.name;
      const balance = document.createElement('span');
      balance.className = 'v2-pop-server-balance';
      balance.append(coin('v2-pop-coin'), points(s.balance));
      row.append(icon, label, balance);
      row.addEventListener('click', () => {
        if (s.id === currentServer()) return;
        setServer(s.id);
        fillServers();
        serverChanged();
        pick.list(heroes, say);
      });
      servers.append(row);
    }
  }

  let before: HTMLElement | null = null;
  function open(): void {
    const me = currentMe();
    if (!me) return logIn();
    title.textContent = me.user.name;
    popName.textContent = me.user.name;
    popAvatar.hidden = !me.user.avatar;
    if (me.user.avatar) popAvatar.src = me.user.avatar;
    fillServers();
    pick.list(heroes, say);
    before = document.activeElement as HTMLElement | null;
    shade.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    $(shade, '.v2-pop-close').focus();
  }
  function close(): void {
    if (shade.hidden) return;
    shade.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    before?.focus();
  }
  button.addEventListener('click', open);
  $(shade, '.v2-pop-close').addEventListener('click', close);
  shade.addEventListener('pointerdown', (e) => {
    if (!frame.contains(e.target as Node)) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !shade.hidden) {
      e.stopPropagation();
      close();
    }
  });
  $(shade, '.v2-pop-logout').addEventListener('click', () => {
    close();
    logOut();
    loggedOut();
  });

  let faceOf = '';
  function render(): void {
    const me = currentMe();
    name.textContent = me ? me.user.name : hasSession() ? '…' : 'Log in';
    avatar.hidden = !me?.user.avatar;
    if (me?.user.avatar) avatar.src = me.user.avatar;
    const here = me?.servers.find((s) => s.id === currentServer());
    server.textContent = here ? here.name : me ? 'Pick a server' : 'with Discord';
    button.setAttribute('aria-label', me ? `${me.user.name}: profile, server and hero` : 'Log in with Discord');
    const walking = pick.walking().id;
    if (faceOf !== walking) {
      const id = (faceOf = walking);
      void heroCut(id, FACE, 128).then((src) => src && faceOf === id && (hero.src = src));
    }
    if (!shade.hidden && me) fillServers();
  }

  render();
  return { render };
}
