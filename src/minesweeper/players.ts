import { colourOf } from './cursors';
import { state } from './state';
import { ui } from './ui';

/** A number of a player's record, over what it counts. */
function stat(kind: 'won' | 'hit' | 'troll', n: number, label: string, title: string): HTMLElement {
  const cell = document.createElement('div');
  cell.className = `ms-stat ${kind}`;
  cell.title = title;
  const count = document.createElement('b');
  count.textContent = n.toLocaleString('en-US');
  cell.append(count, label);
  return cell;
}

/** The list beside the board: who's here, in their cursor's colour, with the boards they've helped clear, the mines they've opened and their trolls. */
export function renderPlayers(): void {
  const { room } = state;
  ui.playerCount.textContent = room ? String(room.players.length) : '';
  ui.players.replaceChildren(
    ...(room?.players ?? []).map((player) => {
      const li = document.createElement('li');
      li.className = 'ms-player';
      li.style.setProperty('--who', colourOf(player));
      const avatar = document.createElement('img');
      avatar.className = 'ms-player-avatar';
      avatar.src = player.avatar;
      avatar.alt = '';
      avatar.referrerPolicy = 'no-referrer';
      avatar.draggable = false;
      // The name is cut short if it's long, but the "you" tag after it always shows.
      const name = document.createElement('div');
      name.className = 'ms-player-name';
      const nameText = document.createElement('span');
      nameText.textContent = player.name;
      name.append(nameText);
      if (player.id === room?.you) {
        const tag = document.createElement('span');
        tag.className = 'ms-you';
        tag.textContent = 'you';
        name.append(tag);
      }
      li.append(
        avatar,
        name,
        stat('won', player.wins, 'won', 'Boards they helped clear'),
        stat('hit', player.bombs, 'mines', 'Mines they opened'),
        stat('troll', player.trolls, 'trolls', "Times their wrong flag sent someone else's chord into a mine"),
      );
      return li;
    }),
  );
}
