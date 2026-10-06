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

Log in with Discord on the front page (the bot does the login, at `VITE_API_URL`), pick a server
and press Play. The login is kept in the browser for a week. `k!mines` and `k!pinecraft` in
Discord post a button to the front page that anyone can press, like `/?play=mines&guild=<server>`:
the front page logs them in if need be and opens that game in that server.

Play opens the game page with a link like `https://<this site>/games/<game>/#t=<token>&s=wss://<bot>/<game>`.
The token is signed, good for 2 hours, and lets that member play in that server; it and the bot's
address ride after the `#`, which browsers never send to Vercel. A link with `#w=` instead is a
watch link: it opens someone else's game, watch-only (the online list's Watch button).

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

- `index.html`, `src/site/`: the site's own pages (the front page, `/gear/`, `/databank/`) as one
  document. Each page is its own `.html` (imported `?raw`) and a `page.ts` that sets it up; `src/site/main.ts`
  swaps between them (and back and forward) through the page transition, `src/site/session.ts` keeps
  the login, the server picked and the header. `vercel.json` sends `/gear/` and `/databank/` to it.
- `src/hub/`: the front page.
- `games/pinecraft/index.html`, `src/pinecraft/`: Pinecraft. `protocol.ts` is a copy of the bot's
  `src/web/pinecraft-protocol.ts` (change both together), `draw.ts` draws the world, `textures.ts`
  the blocks.
- `games/mines/index.html`, `src/mines/`: Mines. `protocol.ts` is a copy of the bot's
  `src/web/mines-protocol.ts` (change both together).
- `src/gear/`: the gear page. `src/databank/`: the databank. `src/banner/`: the banner, where members
  pull from the gacha (the bot's `/api/gacha`), with its wish: a star falling in the colour of the best
  item pulled (`sky.ts`), then each item revealed (`wish.ts`).
- `src/shared/`: what more than one page uses.
  - `style.css`: styles shared by every page. `header.css`: the site header (front page, gear, databank).
  - `account.ts`: the login session and the profile button. `dropdown.ts`: the site's dropdown.
  - `frame.ts`: the blue frame round a game. `live.ts`: who's online, and watching. `sfx.ts`: sound.
  - `items/`: the item cards, stars, art and detail panel shared by the gear page and the databank.
- `src/table/`: the card table shared by Baccarat and Roulette.
