import { setConn } from '../ui/frame/frame';
import { freshLink } from './link';

/** The longest wait between tries to reconnect. */
const RETRY_MAX_MS = 5000;
/**
 * A game that expects word steadily (GameSocketOptions.steady): heard nothing for this long while the page is shown,
 * the connection is taken for dead (a phone back from asleep often still has one the bot dropped long since) and made
 * again. Looked at every CHECK_MS.
 */
const SILENT_MS = 3000;
const CHECK_MS = 1000;

export interface GameSocketOptions<In, Out> {
  /** The bot's WebSocket address. */
  server: string;
  /** The first thing said on every connection (who this page is: hello, or watch). */
  hello: () => Out;
  receive: (message: In) => void;
  /** Connected, before the hello. */
  onOpen?: () => void;
  /** Dropped, before trying again. */
  onDrop?: () => void;
  /** Whether the bot is saying something every moment right now (a fight going on), so silence means the connection is dead. */
  steady?: () => boolean;
}

export interface GameSocket<Out> {
  /** Says `message` to the bot; false when not connected right now. */
  send(message: Out): boolean;
  /** Connected right now. */
  open(): boolean;
  /** Gives up on the connection there is and makes another at once (the page has lost track of the game: the bot gives it all again on hello). */
  reconnect(): void;
  /** Stops reconnecting (the bot said this page is done: a bad link, opened somewhere else). */
  finish(): void;
}

/**
 * A game's connection to the bot, shown in the title bar's pill. Dropped (a phone asleep, a network
 * blip, the bot restarting, which takes a moment), it keeps trying for as long as the page is open,
 * waiting longer each time, up to RETRY_MAX_MS between tries; the page shown again (back from another
 * app), at once. One that has gone quiet when it shouldn't (`steady`) is dropped and made again. Each connection waits for
 * the link to be good for a while yet (./link.ts freshLink), so one made after hours away says hello with a renewed token.
 */
export function gameSocket<In, Out>(options: GameSocketOptions<In, Out>): GameSocket<Out> {
  let socket: WebSocket | null = null;
  let finished = false;
  let retries = 0;
  /** The next try to reconnect, waiting (0: none). */
  let retry = 0;
  /** When the bot was last heard from (or the page last shown again: performance.now()). */
  let heard = performance.now();
  /** A connection on its way: waiting for the link to be renewed (`socket` is still null). */
  let pending = false;

  function send(message: Out): boolean {
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(message));
    return true;
  }

  function connect(): void {
    clearTimeout(retry);
    retry = 0;
    setConn(retries === 0 ? 'Connecting…' : 'Reconnecting…', '');
    pending = true;
    void freshLink().then(() => {
      pending = false;
      if (!finished) open();
    });
  }

  function open(): void {
    const ws = new WebSocket(options.server);
    socket = ws;
    ws.addEventListener('open', () => {
      if (socket !== ws) return;
      retries = 0;
      heard = performance.now();
      options.onOpen?.();
      setConn('Connected', 'ok');
      send(options.hello());
    });
    ws.addEventListener('message', (e) => {
      // (Not one given up on as dead: another has taken its place.)
      if (socket !== ws) return;
      heard = performance.now();
      try {
        options.receive(JSON.parse(String(e.data)) as In);
      } catch (err) {
        console.error('Could not read a message from the bot:', err);
      }
    });
    ws.addEventListener('close', () => {
      if (socket !== ws) return;
      socket = null;
      if (finished) return;
      options.onDrop?.();
      const wait = Math.min(RETRY_MAX_MS, 500 * 2 ** retries++);
      setConn('Reconnecting…', 'bad');
      retry = window.setTimeout(connect, wait);
    });
  }

  /** Gives up on the connection there is (it is let go unheard) and makes another at once. */
  function redo(): void {
    const dead = socket;
    socket = null;
    dead?.close();
    if (finished) return;
    options.onDrop?.();
    connect();
  }

  // Shown again: dropped meanwhile, connected again at once; still connected, given a moment to be heard from.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || finished) return;
    heard = performance.now();
    if (!socket && !pending) connect();
  });
  window.setInterval(() => {
    if (finished || document.hidden || socket?.readyState !== WebSocket.OPEN || !options.steady?.()) return;
    if (performance.now() - heard > SILENT_MS) redo();
  }, CHECK_MS);

  connect();
  return {
    send,
    open: () => socket?.readyState === WebSocket.OPEN,
    reconnect: () => {
      if (!finished && !pending) redo();
    },
    finish: () => {
      finished = true;
      clearTimeout(retry);
    },
  };
}
