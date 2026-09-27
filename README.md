# Koma-UI

The web site [Koma](../Koma)'s games are played on:

- **The front page** (`/`): log in with Discord, pick a server you play Koma in, pick a game.
- **Pinecraft** (`/games/pinecraft/`): a mine of your own, all underground. You start in a small room
  with dirt all around; hold WASD or the arrow keys against a block to break it (harder blocks take
  longer). Every block takes one energy (which comes back over time), and the ores you find pay
  points straight away; rarer ores pay more. No bet. Your tunnels stay dug between visits.
- **Mines** (`/games/mines/`): like Stake's Mines. Bet, pick how many mines (1 to 24) hide on a 5x5
  board, then turn over tiles: every gem raises the multiplier, a mine loses the bet. Cash out
  whenever you like.

The pages hold no game logic that matters. The bot keeps the worlds and decides every dig; a page
connects to the bot's WebSocket, sends moves, and draws what it is told. It is only told what the
player can see, so nothing in the page or its dev tools gives away where the mines or the ores are.

## How a player gets to a game

Either way, the game page is opened with a link like
`https://<this site>/games/<game>/#t=<token>&s=wss://<bot>/<game>`. The token is signed, good for 2
hours, and lets that member play in that server; it and the bot's address ride after the `#`,
which browsers never send to Vercel.

- **From the front page:** log in with Discord (the bot does the login, at `VITE_API_URL`), pick a
  server and press Play. The login is kept in the browser for a week.
- **From Discord:** `k!pinecraft`, or `k!mine` (`k!mine 100 3` starts a round with 3 mines straight away), posts a
  message with an Open button. Pressing it (only that member can) replies privately with the link.

## Develop

```bash
yarn
VITE_API_URL=http://localhost:8787 yarn dev     # http://localhost:5173/
```

To play against a local bot, set these in the bot's `.env` and start it:

```
WEB_URL=http://localhost:5173
WEB_API_URL=http://localhost:8787
DS_CLIENT_SECRET=...   # only for logging in on the front page
```

and add `http://localhost:5173/` under Redirects in the Developer Portal (OAuth2).

## Deploy (Vercel)

Import this repo in Vercel. It is detected as Vite: build `yarn build`, output `dist`. Set one
environment variable, `VITE_API_URL`: the bot's public address, like `https://koma.duckdns.org`.

## Block pictures

`public/blocks/` holds the blocks' pictures: `dirt.png` and `stone.png`. Pinecraft draws a stand-in
for each ore (stone with coloured gems) until there is a picture for it: drop `coal.png`,
`iron.png`, `gold.png`, `diamond.png`, `ruby.png` or `emerald.png` in there and it is used instead.
Any square size works.

## Files

- `index.html`, `src/hub/`: the front page.
- `games/pinecraft/index.html`, `src/pinecraft/`: Pinecraft. `protocol.ts` is a copy of the bot's
  `src/web/pinecraft-protocol.ts` (change both together), `draw.ts` draws the world, `textures.ts`
  the blocks.
- `games/mines/index.html`, `src/main.ts`, `src/mines.css`, `src/protocol.ts`: Mines.
  `src/protocol.ts` is a copy of the bot's `src/web/mine-protocol.ts`.
- `src/style.css`: styles shared by every page.
