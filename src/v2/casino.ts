import type { Game } from '../protocol/site';
import type { Page } from '../site/page';
import { playGame } from '../site/play';
import { currentMe, currentServer, hasSession, loadMe } from '../site/session';

/*
 * The casino (v2's own page, opened at the town's Casino): its tables, each opened as the front page's Play buttons open
 * them (../site/play.ts, a link from the bot in the server picked).
 */

interface Table {
  game: Game;
  name: string;
  suit: string;
  text: string;
}

const TABLES: readonly Table[] = [
  { game: 'baccarat', name: 'Baccarat', suit: '♦', text: 'Player, Banker or Tie, dealt for the whole table every minute. Closest to 9 wins.' },
  { game: 'roulette', name: 'Roulette', suit: '♥', text: 'Chips on numbers, splits, corners, colours or dozens. A single number pays 35 to 1.' },
  { game: 'poker', name: 'Poker', suit: '♠', text: "No-limit Texas hold'em for up to 8, bots to fill the seats." },
  { game: 'mines', name: 'Mine', suit: '♣', text: 'Every ore raises your multiplier, dynamite ends the run. Cash out whenever you like.' },
];

const markup = `<section class="v2-casino">
  <div class="page-bar">
    <div class="page-bar-left">
      <a class="action secondary icon back" href="/" aria-label="Back to town">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 5 3.5 12l7 7v-4.5H20v-5h-9.5z" /></svg>
      </a>
    </div>
    <h1 class="page-bar-title">Casino</h1>
    <div class="page-bar-right"><span class="v2-casino-balance" data-balance hidden></span></div>
  </div>
  <p class="status v2-casino-status" data-status hidden></p>
  <div class="v2-casino-tables" data-tables></div>
</section>`;

const points = (n: number): string => n.toLocaleString('en-US');

export const casinoPage: Page = { title: 'Casino · Komaverse', icon: '🎰', markup, mount };

function mount(root: HTMLElement): { drawn: Promise<void>; unmount: () => void } {
  const status = root.querySelector('[data-status]') as HTMLElement;
  const balance = root.querySelector('[data-balance]') as HTMLElement;
  const list = root.querySelector('[data-tables]') as HTMLElement;
  const say = (text: string | null, bad = false): void => {
    status.hidden = text === null;
    status.textContent = text ?? '';
    status.classList.toggle('bad', bad);
  };

  const buttons = TABLES.map((table) => {
    const card = document.createElement('article');
    card.className = 'v2-table';
    card.innerHTML = `<div class="v2-table-suit" aria-hidden="true"></div><h2></h2><p></p><button type="button" class="action main">Play</button>`;
    const suit = card.querySelector('.v2-table-suit') as HTMLElement;
    suit.textContent = table.suit;
    suit.classList.toggle('red', table.suit === '♥' || table.suit === '♦');
    (card.querySelector('h2') as HTMLElement).textContent = table.name;
    (card.querySelector('p') as HTMLElement).textContent = table.text;
    const button = card.querySelector('button') as HTMLButtonElement;
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Opening…';
      const refused = await playGame(table.game, {});
      if (!refused) return;
      button.disabled = false;
      button.textContent = 'Play';
      say(refused === 'not_member' ? "You don't seem to be in that server any more." : refused === 'no_server' ? 'Pick a server first.' : 'Could not open the table. Try again.', true);
    });
    list.append(card);
    return { table, button };
  });

  function render(): void {
    const me = currentMe();
    const server = currentServer();
    const here = me?.servers.find((s) => s.id === server);
    balance.hidden = !here;
    balance.textContent = here ? `${points(here.balance)} zeiucoins` : '';
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

  return { drawn: start(), unmount: () => undefined };
}
