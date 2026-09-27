# Koma-UI

The web page [Koma](../Koma)'s mine is played on: a 5x5 field you walk around with WASD or the
arrow keys (or the pad and swipes on a phone), digging for ore and hoping not to hit dynamite.

The page holds no game logic that matters. The bot keeps the field and decides every dig; the page
connects to the bot's WebSocket, sends moves, and draws what it is told. It is only ever told what
has been dug, so nothing in the page or its dev tools gives away where the dynamite is.

## How a player gets here

1. In Discord, `k!mine` (or `k!mine 100` to start a run straight away) posts a message with an
   **Open the mine** button.
2. Pressing it (only that member can) replies privately with a link like
   `https://<this site>/games/mines/#t=<token>&s=wss://<bot>/mine`. The token is signed, good for 2 hours, and
   lets that member play with their points; it and the bot's address ride after the `#`, which
   browsers never send to Vercel.
3. The page connects to `s` and says `hello` with `t`. If a run is going it picks it up; otherwise it
   shows the lobby: the balance and a bet box. Runs are started, played and cashed out on the page,
   as many as the player likes. A run left 60 seconds without a move cashes out by itself.

## Develop

```bash
yarn
yarn dev           # http://localhost:5173/games/mines/
```

To play against a local bot, set these in the bot's `.env` and start it:

```
MINE_WEB_URL=http://localhost:5173/games/mines
MINE_WS_URL=ws://localhost:8787/mine
```

then start a run in Discord and press **Open the mine**.

## Deploy (Vercel)

Import this repo in Vercel. It is detected as Vite: build `yarn build`, output `dist`. No
environment variables are needed. The mine is at `/games/mines`: put that address (like
`https://koma-ui.vercel.app/games/mines`) in the bot's `MINE_WEB_URL`. The bot only accepts
connections from that site.

## Files

- `games/mines/index.html`: the mine's page, served at `/games/mines/` (see `vite.config.ts`).
- `src/protocol.ts`: the messages between the page and the bot. A copy of the bot's
  `src/web/mine-protocol.ts`; change both together.
- `src/main.ts`: the connection, input, and what is on screen.
- `src/draw.ts`: drawing the field on the canvas.
