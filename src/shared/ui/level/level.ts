import './level.css';

/*
 * A level to pick, in a popup over a game, as the raid has it before its lobby is up (Select Difficulty):
 * a header bar, the boss (its picture fading into its name), the level between two arrows, a line to say
 * more under it (empty: none), and a big button that takes the level picked. Its ✕, the dark around it,
 * and Escape close it; ← and → press the arrows.
 *
 * It only draws and wires: the game says what each press does (the level picked, how far it goes, who
 * may change it), and fills it in through the elements it hands back.
 */

export interface LevelOptions {
  /** The popup's id (and its parts', after it: `<id>-title` and so on). */
  id: string;
  /** Its header: Select Difficulty, Raid Settings… */
  title: string;
  /** Before the number: Lv, Stage… */
  label: string;
  /** The big button: Enter Raid, Confirm… */
  confirm: string;
  /** The arrows' names, for a screen reader. */
  down?: string;
  up?: string;
}

export interface LevelHandlers {
  step(by: 1 | -1): void;
  confirm(): void;
  close(): void;
}

export interface LevelPopup {
  /** The dark over the page, the popup in it (hidden until shown). */
  readonly root: HTMLElement;
  readonly picture: HTMLImageElement;
  readonly bossName: HTMLElement;
  readonly down: HTMLButtonElement;
  readonly up: HTMLButtonElement;
  readonly number: HTMLElement;
  /** A line under the level (hidden while empty). */
  readonly note: HTMLElement;
  readonly confirm: HTMLButtonElement;
  readonly close: HTMLButtonElement;
  /** Each arrow, the big button and the ways out, to what the game does with them. */
  bind(handlers: LevelHandlers): void;
}

const SVG = 'http://www.w3.org/2000/svg';

/** An arrow's picture: pointing left (down) or right (up). */
function arrow(path: string): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const line = document.createElementNS(SVG, 'path');
  line.setAttribute('d', path);
  svg.append(line);
  return svg;
}

function make<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function levelPopup({ id, title, label, confirm: confirmText, down: downName = 'Lower', up: upName = 'Higher' }: LevelOptions): LevelPopup {
  const root = make('div', 'level-pop');
  root.id = id;
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', `${id}-title`);

  const box = make('div', 'level-box');
  const head = make('div', 'level-head', title);
  head.id = `${id}-title`;

  const boss = make('div', 'level-boss');
  const picture = make('img', '');
  picture.alt = '';
  picture.draggable = false;
  const bossName = make('b', '');
  boss.append(picture, bossName);

  const pick = make('div', 'level-pick');
  const down = make('button', 'level-step');
  down.type = 'button';
  down.setAttribute('aria-label', downName);
  down.append(arrow('M20 12H5M11 5l-7 7 7 7'));
  const plate = make('div', 'level-plate');
  plate.setAttribute('aria-live', 'polite');
  const number = make('span', '');
  plate.append(make('small', '', label), number);
  const up = make('button', 'level-step');
  up.type = 'button';
  up.setAttribute('aria-label', upName);
  up.append(arrow('M4 12h15M13 5l7 7-7 7'));
  pick.append(down, plate, up);

  const note = make('p', 'level-note');

  const actions = make('div', 'level-actions');
  const confirm = make('button', 'level-confirm', confirmText);
  confirm.type = 'button';
  actions.append(confirm);

  const close = make('button', 'level-close', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');

  box.append(head, boss, pick, note, actions, close);
  root.append(box);

  return {
    root,
    picture,
    bossName,
    down,
    up,
    number,
    note,
    confirm,
    close,
    bind(on) {
      down.addEventListener('click', () => on.step(-1));
      up.addEventListener('click', () => on.step(1));
      confirm.addEventListener('click', () => on.confirm());
      close.addEventListener('click', () => on.close());
      root.addEventListener('click', (event) => {
        if (event.target === root) on.close();
      });
      document.addEventListener('keydown', (event) => {
        if (root.hidden) return;
        if (event.key === 'Escape') on.close();
        else if (event.key === 'ArrowLeft' && !down.disabled) on.step(-1);
        else if (event.key === 'ArrowRight' && !up.disabled) on.step(1);
        else return;
        event.preventDefault();
      });
    },
  };
}
