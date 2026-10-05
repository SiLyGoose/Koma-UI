import { setConn } from '../frame';

/** The longest wait between tries to reconnect. */
const RETRY_MAX_MS = 5000;

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
}

export interface GameSocket<Out> {
  /** Says `message` to the bot; false when not connected right now. */
  send(message: Out): boolean;
  /** Connected right now. */
  open(): boolean;
  /** Stops reconnecting (the bot said this page is done: a bad link, opened somewhere else). */
  finish(): void;
}

/**
 * A game's connection to the bot, shown in the title bar's pill. Dropped (a phone asleep, a network
 * blip, the bot restarting, which takes a moment), it keeps trying for as long as the page is open,
 * waiting longer each time, up to RETRY_MAX_MS between tries.
 */
export function gameSocket<In, Out>(options: GameSocketOptions<In, Out>): GameSocket<Out> {
  let socket: WebSocket | null = null;
  let finished = false;
  let retries = 0;

  function send(message: Out): boolean {
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(message));
    return true;
  }

  function connect(): void {
    setConn(retries === 0 ? 'Connecting…' : 'Reconnecting…', '');
    const ws = new WebSocket(options.server);
    socket = ws;
    ws.addEventListener('open', () => {
      retries = 0;
      options.onOpen?.();
      setConn('Connected', 'ok');
      send(options.hello());
    });
    ws.addEventListener('message', (e) => {
      try {
        options.receive(JSON.parse(String(e.data)) as In);
      } catch (err) {
        console.error('Could not read a message from the bot:', err);
      }
    });
    ws.addEventListener('close', () => {
      if (socket === ws) socket = null;
      if (finished) return;
      options.onDrop?.();
      const wait = Math.min(RETRY_MAX_MS, 500 * 2 ** retries++);
      setConn('Reconnecting…', 'bad');
      setTimeout(connect, wait);
    });
  }

  connect();
  return {
    send,
    open: () => socket?.readyState === WebSocket.OPEN,
    finish: () => {
      finished = true;
    },
  };
}
