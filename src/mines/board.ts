import { coin, points } from '../shared/util';
import { watching } from '../shared/game';
import { times, TILES } from './multiplier';
import { pick } from './round';
import { playing, state } from './state';
import { GEM_SVG, MINE_SVG } from './tile-art';
import { ui } from './ui';

let tiles: HTMLButtonElement[] = [];

/** The board's 25 tiles. */
export function buildBoard(): void {
  tiles = Array.from({ length: TILES }, (_, i) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'mx-tile';
    tile.setAttribute('aria-label', `Tile ${i + 1}`);
    tile.disabled = true;
    // Turning a tile over has its own sound (a gem or a mine), not the plain click's.
    tile.dataset.sfx = 'own';
    tile.addEventListener('click', () => pick(i));
    ui.board.append(tile);
    return tile;
  });
}

/** The tiles as the round has them, and how it ended. */
export function renderBoard(): void {
  const { run, pending } = state;
  const over = run !== null && run.status !== 'playing';
  tiles.forEach((tile, i) => {
    const seen = run?.tiles[i] ?? null;
    const shown = seen !== null;
    const turned = run?.revealed[i] ?? false;
    tile.classList.toggle('open', shown);
    tile.classList.toggle('dim', shown && over && !turned);
    tile.classList.toggle('boom', seen === 'mine' && turned);
    tile.classList.toggle('pending', pending?.index === i);
    if (tile.dataset.shows !== (seen ?? '')) {
      tile.innerHTML = seen === 'gem' ? GEM_SVG : seen === 'mine' ? MINE_SVG : '';
      tile.dataset.shows = seen ?? '';
    }
    tile.disabled = watching || !playing() || shown || pending !== null;
  });

  // How the round ended.
  if (run && over && run.bet > 0) {
    const lost = run.status === 'boom' || run.payout === 0;
    ui.result.classList.toggle('lost', lost);
    ui.resultMult.textContent = lost ? '💣 Boom' : times(run.multiplier);
    const why = run.status === 'idle' ? ' (left alone)' : run.status === 'done' ? (run.multiplier >= run.maxMultiplier ? ' (max win)' : ' (board cleared)') : '';
    if (run.status === 'failed' && run.payout === null) ui.resultText.textContent = 'Cashed out at the multiplier reached';
    else if (lost) ui.resultText.textContent = `−${points(run.bet)}`;
    else ui.resultText.replaceChildren(`+${points(run.payout ?? 0)} `, coin(), why);
    ui.result.hidden = false;
  } else {
    ui.result.hidden = true;
  }
}
