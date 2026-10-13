import './chat.css';

/*
 * The chat beside a game played together (the shared tables, poker and minesweeper): what the players
 * at one table say to each other while they play. The bot keeps each table's last lines and tells
 * everyone at it what's said; this is the box that shows them and takes this page's own.
 *
 * On a computer it sits in the game's page (where the game says, `mount`), its lines scrolling in a
 * box that doesn't grow. On a phone it's out of the way: a round button floats at the bottom right,
 * with how many lines have been said since it was last looked at, and opens the chat over the game.
 *
 * Its messages are a copy of the bot's src/web/games/chat.ts (in the Koma repo): change both together.
 *
 *   page -> bot   chat     says `text` to everyone at the table
 *   bot -> page   chats    the last lines said, on joining
 *                 chat     a line just said (this page's own too)
 *
 * What's said is only ever shown as text, never as markup.
 */

/** Something said at a table. */
export interface ChatLine {
  /** Counts up with every line said at the table, so a page knows one it has shown. */
  no: number;
  /** Who said it: the member's id, and their name then. */
  id: string;
  name: string;
  text: string;
  /** When (ms). */
  at: number;
}

export type ChatClientMessage = { t: 'chat'; text: string };
export type ChatServerMessage = { t: 'chats'; lines: ChatLine[] } | { t: 'chat'; line: ChatLine };

/** The most characters one line can have, and the least time between two (the bot's CHAT: it drops what breaks them). */
const MAX_LENGTH = 200;
const GAP_MS = 500;
/** The most lines kept on the page. */
const KEEP = 100;
/** A phone: the chat is behind its button (chat.css has the same width). */
const PHONE = '(max-width: 720px)';

const BUBBLE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9.5L5 21.5V18H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 5v2h10V8H7Zm0 4v2h7v-2H7Z"/></svg>`;

export interface ChatOptions {
  /** Where in the game's page the chat goes (on a computer). */
  mount: HTMLElement;
  /** Says a line to the bot; false when not connected right now (the words stay in the box). */
  send: (message: ChatClientMessage) => boolean;
  /** This page's player (their own lines are marked), once known. */
  you: () => string | null;
  /** The colour a player's name is written in (minesweeper: their cursor's). None: the same for everyone. */
  colour?: (id: string) => string | null;
  /** Whether this page can say anything (not when only watching). */
  canSay?: boolean;
}

export interface ChatBox {
  /** What the bot said about the chat. */
  receive(message: ChatServerMessage): void;
}

/** A game's chat, put in its page. */
export function chatBox({ mount, send, you, colour, canSay = true }: ChatOptions): ChatBox {
  const root = document.createElement('section');
  root.className = 'chat';
  root.innerHTML = `
    <div class="chat-head">
      <h2 class="chat-title">Chat</h2>
      <button type="button" class="chat-close" aria-label="Close the chat">✕</button>
    </div>
    <ol class="chat-lines" aria-live="polite"></ol>
    <form class="chat-form" autocomplete="off">
      <input class="chat-input" type="text" maxlength="${MAX_LENGTH}" placeholder="Say something…" aria-label="Say something to the table" enterkeyhint="send" />
      <button type="submit" class="chat-send">Send</button>
    </form>`;
  const list = root.querySelector('.chat-lines') as HTMLElement;
  const form = root.querySelector('.chat-form') as HTMLFormElement;
  const input = root.querySelector('.chat-input') as HTMLInputElement;
  form.hidden = !canSay;

  // The phone's button, with how many lines haven't been seen.
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chat-fab';
  button.innerHTML = `${BUBBLE}<span class="chat-fab-count" hidden></span>`;
  const count = button.querySelector('.chat-fab-count') as HTMLElement;
  document.body.append(button);

  const phone = matchMedia(PHONE);
  /** Open over the game (a phone). */
  let open = false;
  let unread = 0;
  /** The last line shown. */
  let lastNo = 0;
  let saidAt = 0;

  const toEnd = (): void => {
    list.scrollTop = list.scrollHeight;
  };

  function showUnread(): void {
    count.hidden = unread === 0;
    count.textContent = unread > 99 ? '99+' : String(unread);
    button.setAttribute('aria-label', unread === 0 ? 'Open the chat' : `Open the chat: ${unread} new`);
  }

  function setOpen(next: boolean): void {
    open = next;
    root.classList.toggle('open', open);
    button.hidden = open;
    if (!open) return;
    unread = 0;
    showUnread();
    toEnd();
  }

  /**
   * On a phone the chat is taken out of the game's page and put over it (fixed to the window, which
   * it can only be from the body: a game's own boxes hold on to what's fixed inside them); on a
   * computer it's back where the game put it, and always in view.
   */
  function place(): void {
    if (phone.matches) document.body.append(root);
    else mount.append(root);
    setOpen(false);
    unread = 0;
    showUnread();
    toEnd();
  }

  function add(line: ChatLine): void {
    const li = document.createElement('li');
    li.className = 'chat-line';
    if (line.id === you()) li.classList.add('mine');
    li.title = new Date(line.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const name = document.createElement('b');
    name.textContent = line.name;
    const shade = colour?.(line.id);
    if (shade) name.style.color = shade;
    const text = document.createElement('span');
    text.textContent = line.text;
    li.append(name, ' ', text);
    list.append(li);
    while (list.childElementCount > KEEP) list.firstElementChild?.remove();
    lastNo = line.no;
  }

  /** Shows what `change` adds, keeping the newest in view unless the player has scrolled up to read. */
  function show(change: () => void): void {
    const atEnd = list.scrollHeight - list.scrollTop - list.clientHeight < 24;
    change();
    if (atEnd) toEnd();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    const now = performance.now();
    if (!text || now - saidAt < GAP_MS) return;
    if (!send({ t: 'chat', text })) return;
    saidAt = now;
    input.value = '';
  });
  button.addEventListener('click', () => setOpen(true));
  (root.querySelector('.chat-close') as HTMLElement).addEventListener('click', () => setOpen(false));
  phone.addEventListener('change', place);
  place();

  return {
    receive(message) {
      if (message.t === 'chats') {
        // Joined (or back after the connection dropped): the table's lines as it has them.
        list.textContent = '';
        lastNo = 0;
        show(() => message.lines.forEach(add));
        toEnd();
      } else if (message.line.no > lastNo) {
        show(() => add(message.line));
        // Said by someone else while the chat is behind its button.
        if (phone.matches && !open && message.line.id !== you()) {
          unread++;
          showUnread();
        }
      }
    },
  };
}
