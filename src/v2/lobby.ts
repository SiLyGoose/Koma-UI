import { makeAdventure, type Adventure } from './adventure';

/*
 * King's Raid's lobby menus over the town's bottom corners. At the bottom left, its RightMenu row (MenuAnchor's Buttons:
 * 140-unit WorldMap_Button_* at 0.9, 148 apart, a 32-unit gold label under each): Heroes, Inventory, Index (the
 * Archive) and Shop (WorldMap_Button_PayShop), each opening its page at once, as the game's menu does. At the bottom right, Adventure (the lobby's Battle
 * emblem): its window of battles (./adventure.ts), the kinds on its left, their bosses on its right.
 * Its art: public/kr/ui/lobby/ (KR-extracted/scripts/kr-lobby-ui.py). Laid out in King's Raid's units, scaled by --kr.
 */

const UI = `${import.meta.env.BASE_URL}kr/ui/lobby/`;

/** The bottom-left row: its button's art, its label, the page it opens (an old-site path). */
const MENU: readonly { art: string; label: string; path: string }[] = [
  { art: 'heroes', label: 'Heroes', path: '/heroes' },
  { art: 'inventory', label: 'Inventory', path: '/inventory' },
  { art: 'index', label: 'Index', path: '/databank' },
  { art: 'shop', label: 'Shop', path: '/shop' },
];

export interface Lobby {
  adventure: Adventure;
  /** Shows what can be pressed now (logged in, a server picked, the games the bot plays there). */
  render(): void;
}

export function makeLobby(
  into: HTMLElement,
  opens: (path: string) => void,
  note: (text: string | null, login?: boolean) => void,
  adventureShown: (open: boolean) => void,
): Lobby {
  const menu = document.createElement('nav');
  menu.className = 'v2-menu';
  menu.setAttribute('aria-label', 'Menu');
  for (const item of MENU) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'v2-menu-button';
    button.innerHTML = `<img alt="" src="${UI}${item.art}.webp" /><span class="v2-kr-label"></span>`;
    (button.querySelector('span') as HTMLElement).textContent = item.label;
    button.addEventListener('click', () => opens(item.path));
    menu.append(button);
  }

  const adventureButton = document.createElement('button');
  adventureButton.type = 'button';
  adventureButton.className = 'v2-adventure-button';
  adventureButton.setAttribute('aria-haspopup', 'dialog');
  adventureButton.innerHTML = `<img alt="" src="${UI}adventure.webp" /><span class="v2-kr-label">Adventure</span>`;
  into.append(menu, adventureButton);

  const adventure = makeAdventure(into, note, adventureShown);
  adventureButton.addEventListener('click', () => adventure.open());

  return { adventure, render: () => adventure.render() };
}
