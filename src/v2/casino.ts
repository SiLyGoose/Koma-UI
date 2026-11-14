import type { Game } from '../protocol/site';
import type { Page } from '../site/page';
import { playGame } from '../site/play';
import { currentMe, currentServer, hasSession, loadMe } from '../site/session';

/*
 * The casino (v2's own page, opened at the town's Casino), its games picked as King's Raid's event dungeons are (its
 * EventDungeonList window, from the playtest's prefab: Resources/Prefab2/Window/EventDungeon/EventDungeonList): under the
 * top bar's back button and name, a framed window of tall cards side by side (EventDungeonComponent, 500 by 926, a row of
 * 530): each game's portrait over a green curtain between gold lines, its kind in gold, its name, what it is, and a wide
 * button to play it, opened as the front page's Play buttons open them (../site/play.ts, a link from the bot in the server
 * picked). Laid out in the game's units on its 1080-high screen, as wide as this one; the cards shrink to fit side by side
 * (to 3/4 of their size), then scroll. Art: public/kr/ui/casino/ (KR-extracted/scripts/kr-lobby-ui.py).
 */

interface Table {
  game: Game;
  name: string;
  /** Its line over its name (the card's Name_Prefix). */
  kind: string;
  text: string;
}

const TABLES: readonly Table[] = [
  { game: 'baccarat', name: 'Baccarat', kind: 'Live Table', text: 'Player, Banker or Tie, dealt for the whole table every minute. Closest to 9 wins.' },
  { game: 'roulette', name: 'Roulette', kind: 'Live Table', text: 'Chips on numbers, splits, corners, colours or dozens. A single number pays 35 to 1.' },
  { game: 'poker', name: 'Poker', kind: 'Up to 8 Players', text: "No-limit Texas hold'em for up to 8, bots to fill the seats." },
  { game: 'mines', name: 'Mine', kind: 'Solo', text: 'Every ore raises your multiplier, dynamite ends the run. Cash out whenever you like.' },
];

const ART = `${import.meta.env.BASE_URL}kr/ui/casino/`;
const BACK = `${import.meta.env.BASE_URL}kr/ui/portal/back.webp`;

/** King's Raid's screen: 1080 high, 1920 wide at least (wider on a wider screen). */
const SCREEN = { width: 1920, height: 1080 };
/** A card's row (530) and the card (500 by 926); the window's frame (80 in from each side of the screen). */
const CELL = 530;
const SIDE = 80;

const markup = `<section class="v2-casino">
  <div class="v2-cas-stage">
    <span class="v2-cas-topbar" aria-hidden="true"></span>
    <a class="v2-adv-back v2-cas-back" href="/" aria-label="Back to town"><img alt="" src="${BACK}" /></a>
    <span class="v2-cas-balance" data-balance hidden><img class="v2-cas-coin" src="${import.meta.env.BASE_URL}shared/zeiucoin.png" alt="zeiucoins"><b></b></span>
    <p class="v2-cas-status" data-status hidden></p>
    <div class="v2-cas-window">
      <ol class="v2-cas-cards" data-tables></ol>
    </div>
  </div>
</section>`;

const points = (n: number): string => n.toLocaleString('en-US');

export const casinoPage: Page = { title: 'Casino · Komaverse', icon: '🎰', markup, mount };

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void } {
  const stage = root.querySelector('.v2-cas-stage') as HTMLElement;
  const status = root.querySelector('[data-status]') as HTMLElement;
  const balance = root.querySelector('[data-balance]') as HTMLElement;
  const list = root.querySelector('[data-tables]') as HTMLElement;
  const say = (text: string | null, bad = false): void => {
    status.hidden = text === null;
    status.textContent = text ?? '';
    status.classList.toggle('bad', bad);
  };

  // The game's screen scaled to this one: 1080 high (1920 wide at least), as wide as it then is; the cards as large as
  // fit side by side in the window, down to 3/4 (then the row scrolls).
  const fit = new ResizeObserver(() => {
    const scale = Math.min(root.clientWidth / SCREEN.width, root.clientHeight / SCREEN.height) || 1;
    const width = root.clientWidth / scale;
    stage.style.setProperty('--s', String(scale));
    stage.style.width = `${width}px`;
    const room = width - SIDE * 2 - 40;
    stage.style.setProperty('--c', String(Math.max(0.75, Math.min(1, room / (CELL * TABLES.length)))));
  });
  fit.observe(root);

  const buttons = TABLES.map((table) => {
    const cell = document.createElement('li');
    cell.className = 'v2-cas-cell';
    cell.innerHTML = `<article class="v2-cas-card">
        <span class="v2-cas-card-line" aria-hidden="true"></span><span class="v2-cas-card-curtain" aria-hidden="true"></span>
        <img class="v2-cas-card-art" alt="" /><p class="v2-cas-card-kind"></p><h2 class="v2-cas-card-name"></h2>
        <p class="v2-cas-card-about"></p><button type="button" class="v2-cas-card-play">Play</button>
      </article>`;
    (cell.querySelector('img') as HTMLImageElement).src = `${ART}${table.game}.webp`;
    (cell.querySelector('.v2-cas-card-kind') as HTMLElement).textContent = table.kind;
    (cell.querySelector('h2') as HTMLElement).textContent = table.name;
    (cell.querySelector('.v2-cas-card-about') as HTMLElement).textContent = table.text;
    const button = cell.querySelector('button') as HTMLButtonElement;
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Opening…';
      const refused = await playGame(table.game, { v2: true });
      if (!refused) return;
      button.disabled = false;
      button.textContent = 'Play';
      say(refused === 'not_member' ? "You don't seem to be in that server any more." : refused === 'no_server' ? 'Pick a server first.' : 'Could not open the table. Try again.', true);
    });
    list.append(cell);
    return { table, button };
  });

  function render(): void {
    const me = currentMe();
    const server = currentServer();
    const here = me?.servers.find((s) => s.id === server);
    balance.hidden = !here;
    (balance.querySelector('b') as HTMLElement).textContent = here ? points(here.balance) : '';
    for (const { table, button } of buttons) button.disabled = !me || !server || !me.games.includes(table.game);
    if (!hasSession()) say('Log in from the town to sit at a table.');
    else if (me && !server) say('Pick a server in the town first.');
    else say(null);
  }

  async function start(): Promise<void> {
    render();
    if (!hasSession()) return;
    await loadMe(true);
    render();
  }

  return { drawn: start(), unmount: () => fit.disconnect() };
}
