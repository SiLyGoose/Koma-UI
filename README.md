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

- **Minesweeper** (`/games/minesweeper/`): the classic game, played together. Everyone who opens it in a
  server plays the same board (Beginner to start, or Intermediate or Expert), sees the others' cursors over it, and one mine
  ends it for all, against the clock. The players are listed beside it, each with the boards they have helped
  clear and the mines they have opened. No bet: a board cleared pays out between everyone who opened its tiles, by how many
  each opened, and more the faster it's cleared.

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

## What this site shares with the bot

The bot (the Koma repo, checked out beside this one as `../Koma`) and this site share two things, and
**`yarn sync`** (`scripts/sync.mjs`) keeps them the same:

- **What the pages and the bot say to each other** is the bot's (its `src/protocol/`: every game's messages, and the
  chat's). `yarn sync` copies it into `src/protocol/`; don't edit the copies.
- **The TechnoMagic Raid's fight** is this site's (`src/technomagic/sim/`). `yarn sync` builds it into one file for the
  bot (`../Koma/vendor/technomagic-sim.mjs`, and its types), and writes its version (`sim/version.ts`: a hash of the
  sim, so any change to it is a new one; a page whose sim isn't the bot's is told to reload).

Run it whenever either changes, then deploy both. `yarn build` runs `yarn sync --check` first, which fails when
anything is out of date (on Vercel, with no `../Koma`, it checks only the sim's version); the bot's tests check the
same from its side.

## Files

- `index.html`, `src/site/`: the site's own pages (the front page, `/gear/`, `/heroes/`, `/forge/`, `/shop/`, `/dressing-room/`, `/databank/`) as one
  document. Each page is its own `.html` (imported `?raw`) and a `page.ts` that sets it up; `src/site/main.ts`
  swaps between them (and back and forward) through the page transition, `src/site/session.ts` keeps
  the login, the server picked and the header. `vercel.json` sends `/gear/`, `/heroes/`, `/forge/`, `/shop/` (and its
  tabs' paths), `/dressing-room/` and `/databank/` (and its sections' paths) to it, and the old `/banner/` to `/shop/wish/`.
- `src/hub/`: the front page.
- `src/protocol/`: what the pages and the bot say to each other, copied from the bot by `yarn sync`.
- `games/pinecraft/index.html`, `src/pinecraft/`: Pinecraft. `draw/` draws the world (`draw/textures.ts`
  the blocks), `net/` talks to the bot, `hud/` is what's drawn over the mine (with the leaderboard, `hud/leaderboard/`),
  `input/` the keys and the joystick.
- `games/mines/index.html`, `src/mines/`: Mines.
- `games/minesweeper/index.html`, `src/minesweeper/`: Minesweeper. `cursors.ts` draws the other players'
  cursors over the board (the site's hand, a name beside it, a colour each) and tells them this page's.
- `games/technomagic/index.html`, `src/technomagic/`: the TechnoMagic Raid, a boss fight seen from the side, drawn in 3D
  (three.js), against a boss (Galgoria so far), played as in King's Raid. Opened from the front page or Discord
  (`k!technomagic`, and the post the bot makes when someone opens a room), it is the server's room: getting ready
  (`prep/`), everyone puts heroes of their own (bought in the shop, geared on `/heroes/`) into a lineup of 9 (the host
  up to 4, everyone else up to 2; alone, up to 8 against an easier boss), says they're ready, and the host starts the
  fight. The bot runs the fight by its own clock with everyone's presses, and every page runs the same one, never past
  where the bot has got (what they say: `src/protocol/technomagic.ts`). Each player has a card for each of their own heroes. Heroes that fall stay down. A win gives each player
  TechnoMagic gear, while they have runs left that day that give it. Opened with no link (`yarn dev`), it is a field for
  trying things out, with nothing kept: every skin's card, heroes on and off the field, and buttons that set the boss
  attacking. Every blow is physical or magical, by who deals it, and is worn down by its target's defense against that
  kind and by a block. Its folders:
  - `sim/` is the fight itself, and everything that changes how one goes, with nothing drawn: worked out a step at a time
    (thirty a second) from a seed, with no `Math.random`, `pow`, `exp`, `sin` or `cos` in it, so the same seed and
    inputs make the same fight in any browser and in Node. Nothing in it names anything outside it (`yarn sync` won't
    build it otherwise). It has each hero (`sim/heroes/`: its stats, skills and passive, what comes of each as it lands,
    and how long each of its moves takes and when its blows land), each boss (`sim/bosses/`), how a blow is worked out
    (`sim/combat/`), the sets, unique weapons and additional skills, and what the page is to show for them
    (`sim/shown.ts`: names, words, icons, and whose picture, never where it is). The page draws what it says happened
    (its events); `sim/bot.ts` is what the bot has of it (`yarn sync` builds it for the bot).
  - `assets/` names every file the page shows and nothing else: a file for each hero (`assets/heroes/`: its skins'
    models, its skills' pictures, its portraits) and each boss (`assets/bosses/`), the effects they share, and
    `paths.ts`, where each is kept. Its files name each other with their `.ts`, so Node reads them too.
  - `engine/` is three.js and nothing of this fight: `models.ts` loads the models, `rig.ts` poses their bones in code
    (the game's models come with no animation), `track.ts` is a movement written as poses at times, `retarget.ts` plays
    one skeleton's animations on another, `stage.ts` is the field and its camera.
  - `heroes/` is how each hero is drawn: a folder for each (`fx.ts`: what is drawn for its skills; `moves.ts`: what its
    body does for them, written to fit the sim's timing), `looks.ts` (each one's files and how it stands), `body/` (a
    hero on the field: stood up from the game's files or from a skin rigged by Mixamo, and moved by poses written in
    code or by animations, as the sim times them), `moves/` (the moves every hero has, and the stances they are written
    with) and `load.ts`, which reads every skin.
  - `bosses/` is how each boss is drawn (`bosses/galgoria/`: its model and how it stands (`model.ts`), its heads' moves
    (`tracks.ts`), what is drawn for its skills (`fx.ts`), its venom); `models.ts` names each one's body.
  - `fight/` draws the sim's fight (`view.ts`) and what is drawn for the moves every hero has (`fx.ts`); `art.ts` finds
    the pictures the sim names.
  - `fx/` is what is drawn for a hit and a skill, `hud/` what is shown over the field (the cards, the boss's health and
    attacks), `prep/` getting ready in a room (the lineup, the heroes, the chat, who's in), `styles/` its CSS.

  To add a hero: its file in `sim/heroes/` (and a line in `sim/heroes/index.ts`, and its moves' timing in
  `sim/heroes/moves.ts`), a file in `assets/heroes/`, a folder in `heroes/` (and a line in `heroes/looks.ts`,
  `heroes/fx.ts` and `heroes/moves/index.ts`); a boss likewise (`sim/bosses/`, `bosses/models.ts`). Then `yarn sync`: the
  bot takes its heroes (and the sets' words) from the sim. `node scripts/kr-assets.mjs` copies its models from the game's
  files into `public/kr/`, which is committed and deployed with the site. They are kept there by whose they are: `heroes/<hero>/models/`, `skills/` and `portraits/`,
  `bosses/<boss>/models/`, and `effects/`. The skins' pictures that are committed are in `public/technomagic/portraits/`.
- `src/gear/`: the gear page. `src/databank/`: the databank: its way in (`/databank/`), the items (`/databank/items/`)
  and the raid bosses (`/databank/bosses/`).
- `src/heroes/`: the heroes page (`/heroes/`), laid out as the gear page (its styles are the gear page's, with its own
  on top): the TechnoMagic Raid's heroes down the left (the bot's `/api/heroes`), the one picked with its five slots
  (two weapons, two armors, a treasure), and the gear a hero can wear (the raid's, and the TechnoMagic Raid's own,
  which only heroes wear) or, on its Stats tab, its stats in the raid with and without its gear (`stats.ts`, from the
  raid's class stats). A copy can be on the member and on one of their heroes at once, but on one hero only.
  `src/shared/heroes.ts` is what the bot says of them, and their pictures (cut from the raid's portraits).
- `src/shop/`: the shop, its tabs down the left, each with its own path (`/shop/wish/`, `/shop/outfits/`, `/shop/heroes/`).
  `src/hero-shop/` is its Heroes tab, where members buy the TechnoMagic Raid's heroes (the bot's `/api/heroes`), laid
  out as the Outfits tab.
  `src/banner/` is its Wish tab, where members pull from the gacha (the bot's `/api/gacha`), with its
  wish: a star falling in the colour of the best item pulled (`sky.ts`), then each item revealed
  (`wish.ts`). `src/outfits/` is its Outfits tab, where they buy outfits (the bot's `/api/outfits`): the
  characters they're drawn as on the gear page and in Pinecraft (`src/shared/characters.ts`,
  `public/characters/`).
- `src/dressing/`: the dressing room (`/dressing-room/`), where they put on the outfits they have, each in
  the list as a close-up of its character, the one picked standing full height beside it. The gear
  page's shirt button opens it.
How the code is laid out: a component with its own styles is a folder of its own, its `.ts` and
`.css` side by side (`src/shared/ui/account/account.ts` and `account.css`), and builds its own markup
rather than having it copied into each page's HTML. A folder of related modules has an `index.ts` that
exports what the rest of the code uses, and the rest imports from the folder (`'../shared/ui'`); the
modules inside it import each other directly. A few imports go to the module itself instead, where going
through the `index.ts` would make an import cycle, and `ui/frame/` is imported directly because importing
it sets up a game's page. A page's own styles, split by area and by screen size, stay in its `styles/`.

- `src/shared/`: what more than one page uses.
  - `style.css`: styles shared by every page, with the site pages' surfaces (`--plaque`, `--sky`, `--tint`:
    what the buttons, tabs and name boards are drawn in, so no page copies them) and the name board (`.plaque`).
  - `ui/`: the parts every page shows, each in its own folder with its styles (`ui/account/account.ts`
    and `account.css`), all exported from `ui/index.ts`. `account/`: the login session and the profile
    button. `button/`: the site pages' buttons (`.action` with `.main` for what does something,
    `.secondary`, `.danger`, `.icon`, `.choice` for tabs and views, tinted blue when showing, `.large`), one
    rule per state for all of them, `working()` for a
    button waiting on the bot (disabled at once, a spinner in its words' place after 3 seconds) and
    `doneMark()` for "✓ Equipped" in place of a button. `close/`: the X that closes a popup or leaves a
    section (`closeMark()` draws it on a button or link in the page, `closeButton()` makes one; its size and
    colours are `--close-size`, `--close-ink` and `--close-lit`). `dropdown/`: the site's dropdown. `chat/`: the chat beside a game played together (the table games, poker, Minesweeper), where a picture can be pasted and a link to a picture or a GIF shows it. `live/`: who's online, and watching. `header/`: the site
    header. `frame/`: the blue frame round a game and its title bar, from the game's
    `<main class="frame" data-title="…">` (not in `index.ts`: importing it sets up a game's page, so
    games import `ui/frame/frame` themselves).
  - `audio/`: sound (`sfx.ts`). `util/`: small helpers (formatting numbers, waiting, storage).
  - `game/`: what every game shares: its link, the connection to the bot, and the box saying why it
    can't go on.
  - `transition/`: the page transition (`head.css` and `head.js` go inline in every page's `<head>`).
  - `items/`: the item cards, stars, art and detail panel shared by the gear page and the databank, and
    the armories' Filter (`items/armory-filter/`: type, stars, the databank's Owned only and the forge's
    Refineable, in a panel under its button).
- `src/table/`: the card table shared by Baccarat and Roulette.
