# Town home page (plan)

Status: brainstorm only, nothing built yet. Written 2026-10-08.

## Why

The site header (Games, Gear, Forge, Shop, Databank, plus Login or the profile button) is filling up as pages get
added. The idea is to replace it with a game-like town: a map of the town as the home page, with places to visit,
the player's info in a corner, and a dock of icon buttons.

## Reference

`town-reference.png` (next to this file), a screenshot of a gacha game's town:

- The cyan pads on the ground are the **stops**: the places the player can walk to.
- The player plate (portrait, level, name) is top left.
- The currencies are along the top.
- The dock of icon buttons with labels runs along the bottom left (Heroes, Inventory, Index, …).
- Buildings carry name boards (Forge, Ophelia's Workshop).
- "N" badges mark buttons with something new.

## Decided

### The map (PC only)

- A picture of the town with clickable places on it, bigger than the window.
- The player's character stands on the map. Clicking a **stop** walks them there, and the camera follows as they go.
- Clicking anywhere that isn't a stop does nothing: they don't move.
- The map is for PC only. Phones get a different layout, not designed yet (see the open questions).

### Around the map

- **Player plate**, top left, in place of the header.
- **Dock**, bottom left: icon buttons for pages that aren't places on the map (Gear, for one).

### Places

- One place for the games, named **Casino**, holding the casino games (Baccarat, Roulette, Poker, Mines).
- Others for the **Forge**, and the rest of the pages.

### Getting around

- **Inside a place** (the Forge, the Casino): a back button takes the player back to the map. The dock stays.
- **Inside a page within a place** (Baccarat, in the Casino): no dock. Leaving it goes back to the place it's in (the
  Casino), not straight to the map, since you leave the game but not the casino.

### Logged out

- The town still shows, with a login prompt where the player plate goes.
- The Databank is the only page that works without logging in, as it is today. That stays.

## Suggestions (not decided)

- **Split the games across several places** rather than having them all in the Casino:
  - the Casino for Baccarat, Roulette, Poker and Mines
  - a gate for Raid
  - a mine entrance for Pinecraft
- **Shop:** a market stall place, for wishes and outfits.
- **Dock:** Gear, Dressing Room and Databank. The Databank is reference material, like "Index" in the screenshot,
  so it suits the dock better than a place.
- **Player plate:**
  - their name, and the character they're wearing rather than their Discord avatar (`portrait` in
    `src/shared/characters.ts` already crops each character's face for the dressing room)
  - their points, which are per server
  - clicking it switches server (the server picker is on the front page today)
- **Badges:** "N" dots on places and dock buttons with something to do, such as a raid boss up or a free wish.
- **"PC" by screen width rather than device type**, reusing the site's 900px line (`src/shared/items/styles/page.css`).
- **Phones:**
  - the dock becomes a bottom tab bar (Town, Gear, Dressing Room, Databank)
  - the places become a list of themed cards, close to today's games list
- **Clicking a place while logged out** shows "log in to enter" rather than nothing.

## Open questions

- Does arriving at a stop enter the place at once, or show its name and an Enter button first?
- Does the player walk straight to a stop, or along the roads between stops?
- Coming back to the map, does the player stand at the stop they left from, or at a starting spot?
- Where does the Databank go: a place on the map, or the dock?
- Which places are there besides the Casino and the Forge (Raid, Pinecraft, Shop)?
- What does the town look like? The characters are small pixel art (`public/characters/`), so a pixel-art town
  would match them better than a painted one. The art is the biggest piece of work.
- What's the phone layout?

## How it fits the current code

- **Router:** the site's pages are one document, swapped by `src/site/main.ts`. The front page (`/`) is
  `src/hub/page.ts`. The town would replace it, and the other routes (`/gear/`, `/forge/`, …) stay as they are, so links
  and bookmarks keep working.
- **Header:** `src/shared/ui/header/header.ts`, put on every site page. The player plate, dock and back button would
  take its place. The router marks the current page by each link's `data-route`, which the dock can use too.
- **Back button:** always a link to the map (or to the place, from a page inside one), never "back in history". Someone
  who opened `/forge/` from a bookmark has no map behind them. A link with the `back` class already runs the page
  transition right to left (`src/shared/transition/leaving.ts`).
- **Games:** each is its own document (`games/<name>/`), framed by `src/shared/ui/frame/frame.ts`. Their ← link and
  the browser's back button (`catchBack(fallback)` in `src/shared/transition/back.ts`) go to the front page's games
  today. They would go to their place (the Casino).
- **Transitions:** the loading screen (a dark wipe with a bouncing character silhouette, `src/shared/transition/`)
  already suits moving between places.
- **Characters:** `src/shared/characters.ts` has each character's sprite, size and portrait. Pinecraft already draws
  characters on a canvas (`src/pinecraft/draw/character.ts`), which could help with the one walking around the map.
- **Player data:** `Me` in `src/site/session.ts` has the Discord name and avatar, and the balance in each server.

## A possible order

1. Replace the header with the player plate, the dock and the back button, on every page, keeping today's front page
   for now. This needs no map art, and it fixes the crowded header right away.
2. Make the Casino a place: a page with its games, with the games' back going to it.
3. Build the map at `/`: the picture, the stops, the character walking, the camera following.
4. Add the extras: badges, the logged-out prompt on places, and the phone layout.
