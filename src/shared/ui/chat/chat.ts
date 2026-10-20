import type { ChatClientMessage, ChatLine, ChatServerMessage } from '../../../protocol/chat';
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
 * What is said is the bot's (../../../protocol/chat.ts, copied by `yarn sync`).
 *
 *   page -> bot   chat     says `text` to everyone at the table, with a picture pasted in (`image`) or not
 *   bot -> page   chats    the last lines said, on joining
 *                 chat     a line just said (this page's own too)
 *
 * A picture can be said too: pasted into the box (or dropped on the chat), it waits above the box
 * until the line is sent, made small enough for the bot to take.
 * And a link in a line's words is one that can be pressed; a link to a picture or a GIF (its own
 * address, or its page on giphy.com or tenor.com) is shown as that picture under the words.
 *
 * What's said is only ever shown as text, never as markup: the links and pictures are built here,
 * from addresses checked first.
 */

/** What is said (../../../protocol/chat.ts). */
export type { ChatClientMessage, ChatLine, ChatServerMessage };

/** The most characters one line can have, and the least time between two (the bot's CHAT: it drops what breaks them). */
const MAX_LENGTH = 400;
const GAP_MS = 500;
/** The most characters a pasted picture can have as a `data:` address, and the least time before a line with one (the bot's CHAT too). */
const MAX_IMAGE_LENGTH = 200_000;
const IMAGE_GAP_MS = 2000;
/** The longest side a pasted picture is sent with, to start with. */
const IMAGE_SIDE = 1024;
/** The most lines kept on the page. */
const KEEP = 100;
/** A phone: the chat is behind its button (chat.css has the same width). */
const PHONE = '(max-width: 720px)';

/** A link in a line's words. */
const LINK = /https?:\/\/[^\s<>"']+/g;
/** What a link's address ends in when it's a picture's own. */
const PICTURE_FILE = /\.(?:gif|png|jpe?g|webp|avif)$/i;
/** A giphy.com page about a GIF: the GIF itself is at i.giphy.com/<id>.gif. */
const GIPHY_HOST = /^(?:www\.)?giphy\.com$/;
const GIPHY_PAGE = /^\/(?:gifs|stickers)\/(?:.*-)?([A-Za-z0-9]+)\/?$/;
/** A picture as the bot passes one on: pasted (never SVG, which can hold a script), or a GIF's address. */
const SAID_IMAGE = /^(?:data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}|https:\/\/[^\s<>"']+)$/;

const BUBBLE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9.5L5 21.5V18H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 5v2h10V8H7Zm0 4v2h7v-2H7Z"/></svg>`;

/** The picture a link is to, if it is to one: the address itself, or a giphy.com page's GIF. Only ever https. */
function pictureOf(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (PICTURE_FILE.test(url.pathname)) return url.href;
  const giphy = GIPHY_HOST.test(url.hostname) ? GIPHY_PAGE.exec(url.pathname) : null;
  return giphy ? `https://i.giphy.com/${giphy[1]}.gif` : null;
}

function readAsAddress(file: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * A picture as the bot takes one: a `data:` address of at most MAX_IMAGE_LENGTH characters. A GIF
 * that already fits goes as it is (so it still moves); anything else is drawn smaller, and then
 * smaller again, until it does. Null when it isn't a picture, or can't be made to fit.
 */
async function shrink(file: Blob): Promise<string | null> {
  if (file.type === 'image/gif' && file.size * 1.34 + 64 < MAX_IMAGE_LENGTH) return readAsAddress(file);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  const canvas = document.createElement('canvas');
  const pen = canvas.getContext('2d');
  let side = IMAGE_SIDE;
  let quality = 0.85;
  let address: string | null = null;
  for (let tries = 0; pen && !address && tries < 8; tries++) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    pen.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let drawn = canvas.toDataURL('image/webp', quality);
    // A browser that can't write WebP writes a PNG instead.
    if (!drawn.startsWith('data:image/webp')) drawn = canvas.toDataURL('image/jpeg', quality);
    if (drawn.length <= MAX_IMAGE_LENGTH) address = drawn;
    side *= 0.75;
    quality = Math.max(0.5, quality - 0.1);
  }
  bitmap.close();
  return address;
}

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
    <div class="chat-attached" hidden>
      <img class="chat-attached-image" alt="" />
      <span class="chat-attached-note"></span>
      <button type="button" class="chat-attached-drop" aria-label="Take the picture off">✕</button>
    </div>
    <form class="chat-form" autocomplete="off">
      <input class="chat-input" type="text" maxlength="${MAX_LENGTH}" placeholder="Say something…" aria-label="Say something to the table" enterkeyhint="send" />
      <button type="submit" class="chat-send">Send</button>
    </form>`;
  const list = root.querySelector('.chat-lines') as HTMLElement;
  const form = root.querySelector('.chat-form') as HTMLFormElement;
  const input = root.querySelector('.chat-input') as HTMLInputElement;
  const attached = root.querySelector('.chat-attached') as HTMLElement;
  const attachedImage = root.querySelector('.chat-attached-image') as HTMLImageElement;
  const attachedNote = root.querySelector('.chat-attached-note') as HTMLElement;
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
  /** The picture waiting above the box to be said with the next line. */
  let picture: string | null = null;
  /** Counts the pictures put in, so one still being made smaller is dropped when another is put in after it. */
  let attaching = 0;
  /** The newest line is kept in view: until the player scrolls up to read, and again once they're back down. */
  let follow = true;

  const toEnd = (): void => {
    list.scrollTop = list.scrollHeight;
    follow = true;
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

  /** Shows what waits above the box: a picture, or `note` (why there isn't one), or nothing. */
  function showAttached(next: string | null, note = ''): void {
    picture = next;
    attached.hidden = !next && !note;
    attachedImage.hidden = !next;
    if (next) attachedImage.src = next;
    else attachedImage.removeAttribute('src');
    attachedNote.textContent = note;
    // The lines' box is that much shorter, or taller.
    if (follow) toEnd();
  }

  /** Puts `picked` above the box, made small enough to send. */
  async function attach(picked: Blob): Promise<void> {
    const mine = ++attaching;
    showAttached(null, 'Getting the picture ready…');
    const address = await shrink(picked);
    if (mine !== attaching) return;
    if (address) showAttached(address);
    else showAttached(null, 'That picture can’t be sent.');
  }

  /** The first picture among `files` (pasted or dropped), if there is one. */
  const pictureIn = (files: FileList | null | undefined): File | undefined => [...(files ?? [])].find((f) => f.type.startsWith('image/'));

  /** A link that opens in a tab of its own, telling where it goes nothing of this page. */
  function linkTo(address: string): HTMLAnchorElement {
    const a = document.createElement('a');
    a.href = address;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }

  /** A line's picture, from `address` (a link, when it came from one: pressing the picture opens it). */
  function pictureFor(address: string, link: string | null): HTMLElement {
    const img = document.createElement('img');
    img.className = 'chat-image';
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    const shown = link ? linkTo(link) : img;
    if (link) shown.append(img);
    img.addEventListener('load', () => {
      if (follow) toEnd();
    });
    // Not a picture after all: the link in the words is what's left.
    img.addEventListener('error', () => shown.remove());
    img.src = address;
    return shown;
  }

  function add(line: ChatLine): void {
    const li = document.createElement('li');
    li.className = 'chat-line';
    if (line.id === you()) li.classList.add('mine');
    // When it was said, hh:mm, before who said it.
    const said = new Date(line.at);
    const time = document.createElement('time');
    time.dateTime = said.toISOString();
    time.textContent = `${String(said.getHours()).padStart(2, '0')}:${String(said.getMinutes()).padStart(2, '0')}`;
    const name = document.createElement('b');
    name.textContent = line.name;
    const shade = colour?.(line.id);
    if (shade) name.style.color = shade;
    // The words, their links ones that can be pressed.
    const text = document.createElement('span');
    /** The first link to a picture, and that picture. */
    let linked: { link: string; picture: string } | null = null;
    let from = 0;
    for (const match of line.text.matchAll(LINK)) {
      // What ends a sentence isn't part of its link.
      const link = match[0].replace(/[.,!?;:)\]]+$/, '');
      const a = linkTo(link);
      a.textContent = link;
      text.append(line.text.slice(from, match.index), a);
      from = match.index + link.length;
      const found: string | null = linked ? null : pictureOf(link);
      if (found) linked = { link, picture: found };
    }
    text.append(line.text.slice(from));
    li.append(time, ' ', name, ' ', text);
    // Its picture: the one said with it (pasted, or the bot's reading of a link to a GIF's page), or the one its words link to.
    const image = line.image && SAID_IMAGE.test(line.image) ? line.image : null;
    if (image) li.append(pictureFor(image, image.startsWith('data:') ? null : image));
    else if (linked) li.append(pictureFor(linked.picture, linked.link));
    list.append(li);
    while (list.childElementCount > KEEP) list.firstElementChild?.remove();
    lastNo = line.no;
  }

  /** Shows what `change` adds, keeping the newest in view unless the player has scrolled up to read. */
  function show(change: () => void): void {
    change();
    if (follow) toEnd();
  }

  list.addEventListener('scroll', () => {
    follow = list.scrollHeight - list.scrollTop - list.clientHeight < 24;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    const now = performance.now();
    if ((!text && !picture) || now - saidAt < (picture ? IMAGE_GAP_MS : GAP_MS)) return;
    if (!send(picture ? { t: 'chat', text, image: picture } : { t: 'chat', text })) return;
    saidAt = now;
    input.value = '';
    showAttached(null);
  });
  // A picture: pasted into the box, or dropped on the chat.
  input.addEventListener('paste', (e) => {
    const pasted = pictureIn(e.clipboardData?.files);
    if (!pasted) return;
    e.preventDefault();
    void attach(pasted);
  });
  root.addEventListener('dragover', (e) => {
    if (canSay && e.dataTransfer?.types.includes('Files')) e.preventDefault();
  });
  root.addEventListener('drop', (e) => {
    const dropped = canSay ? pictureIn(e.dataTransfer?.files) : undefined;
    if (!dropped) return;
    e.preventDefault();
    void attach(dropped);
  });
  (root.querySelector('.chat-attached-drop') as HTMLElement).addEventListener('click', () => {
    attaching++;
    showAttached(null);
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
