---
name: add-tm-hero
description: Add a King's Raid hero to the TechnoMagic Raid (its sim, model, animations, sounds, effects, portrait, UW/UTs and the bot's catalog), with the site's optimizations. Use when the user asks to add one or more TM heroes.
---

# Adding a TechnoMagic Raid hero

Everything that needs no judgement is done by one tool, `tm-new-hero.mjs`, in `C:/Users/simon/Downloads/KR-extracted/scripts/`
(beside the other generators; it needs the King's Raid playtest client and the model export in Downloads). What is left is
the hero's fight (its sim file), its UW's numbers, its portrait's crop, and the checks. For several heroes, do each step
for all of them before the next: the generators are quicker run once for many.

## 1. Who it is

- **Names:** match what the user wrote to a King's Raid hero (they may misspell: "Kira" was Kara, "ascelica" Aselica,
  "zaafir" Zafir). The game's internal names differ now and then: Pansirone is `Pancironne`, Laias `Ell`, Klaus
  `Clause`. Say which you took in the end.
- **Its line in `roster.mjs`** (its header explains each field):
  - `index`: its creature index in the playtest's tables. Look the name up in `KR-extracted/loc-en.json`
    (`CREATURE_NAME_<index>`), or check the bundles' `Creature_Hero_<code>_*` names.
  - `shodyra`: kingsraid.shodyra.com/info/<n>.
  - `creature`: its code, and any of `tree` / `bundle` / `hit` / `effect` / `icon` that differ from it.
  - `skills`: its three skills' moves, short lower-case names that are new to `sim/heroes/moves.ts`.
  - `extras`: alternate skills sharing a slot, as `[move, KR skill index, slot]` (Kara's siege skills, Evan's other form).
- **No skins/costumes** unless the user names them: only its default look.

## 2. Run the tool

```
node tm-new-hero.mjs <id>
```

It goes through every step (its header lists them). Read what it prints. Each line ending in a warning needs acting on:

- **NO PORTRAIT:** its Drive folder has no picture. Look in the KingsRaidIndex repo's images too; if none, ask the user
  for a link. Don't use shodyra's 124 px icon.
- **NOT SURE which hand:** set `left` / `right` (and `offHand: 'held'` for a held off-hand weapon) yourself, and look.
- **NO unique weapon model:** search `Downloads/Heroes-001/Creature Hero` for its `Unique01` folders.
- **A texture with no transparency half:** find the alpha picture in the model's folder and name it as the page looks for it
  (`…_D(RGB).png` with `…_D(AS).png`, `…_D.png` with `…_AS.png`).

## 3. Its fight: `src/technomagic/sim/heroes/<id>.ts`

Write it from `KR-extracted/briefs/<id>.md`, which has the live game's words and the playtest's numbers side by side.
Use a hero alike as the pattern: Theo (a damage dealer), Rehartna (a buffer), Aselica (a knight healer), Kara or Evan
(alternate skills). The rules:

- **Numbers:** mechanics, costs, cooldowns and perks come from the playtest's dump. Its words are the live game's
  (shodyra), with the numbers filled in. UTs and the UW use shodyra's 1★–5★ rows (as tiers 1–5).
- **Max level skills:** books are maxed (`kr.ts` `books`), and the words show them through `bookDmg` / `bookHeal`.
- **Damage:** `played(kind, ratio‰, flat)`. Heals and shields: `playedHeal(kind, ratio, flat)`.
- **Heal books:** the fight applies a heal's or shield's books itself when it's given `by` (`bookShare`), so don't
  multiply them in again. A heal that is a share of HP or DEF, or of damage dealt, is given without `by` but with
  `from` (`fight.heal(ally, amount, undefined, self)`), or it won't count toward the hero's HPS and Healing Done.
- **Flat ATK buffs** (`ModPower`): a share of the ally's ATK, `flat / ally.stats.atk`, worked out as it is put on.
- **Other book effects:** books that do anything else (an ATK buff's ×1.5) are applied by hand.
- **On each attack** (OnBaseAttack): once per attack part, through `attackStarts(id)`.
- **Non-Hero parts:** keep "Non-Hero" damage separate in both the words and the numbers, since PvP is planned.
- **Skills sharing a slot:** while an alternate skill is offered, set `self.lastUsed[slot] = -Infinity`, or Auto never
  picks it. Keep the other skill's cooldown apart.
- **Its UW:** in `sim/unique.ts`, a constant with its tiers, its `ABOUT` words, its `NAMES` entry, and a `*_UP` buff when it
  shows one.
- **Registering it:** `node tm-new-hero.mjs <id> --only=register` again, which puts it in `sim/heroes/index.ts`.
- **Type check:** `npx tsc --noEmit -p .`

## 4. Its portrait

```
node tm-new-hero.mjs <id> --only=crop
```

Look at `.shots/<id>-portrait.png`, which has a grid. Then run it again with `--crop=x,y,size --head=x,y,size` and look
at `.shots/<id>-crop.png`, until the crop holds its head and hair and the face square its face, eyes in the middle.

**Its perk pictures:** its own transcendence perks need 10 pictures in `public/technomagic/transcend/<id>/`, shodyra's files
as they are (`https://kingsraid.shodyra.com/static/images/<n>/`, curl with a browser User-Agent): `s1-Light.png` …
`s4-Dark.png` saved as `s1-light.png` … `s4-dark.png`, and `hero-light.png` / `hero-dark.png` as `t5-light.png` /
`t5-dark.png`. Without them the Transcend tab shows empty frames.

## 5. Checks (all of them, before committing)

- **The fight:** `node tm-check-sim.mjs <id ...> --perks`. Nothing should throw, and it should use every skill. Damage
  should be in line with Kirze's.
  - **A perk that changes nothing** must have a reason the boss explains: it fights alone, has no mana or buffs, deals
    only magic, isn't slowed, or its CC resist cuts the effect to nothing.
  - **Dragons:** try `--boss=temeraire` too, which goes on to the minion waves.
- **The page:** with `yarn dev` running, `node tm-shots.mjs <id ...> --fight`. Look at `.shots/heroes.png` and at the
  fight screenshots. Things to catch:
  - **An orange or one-colour model:** its textures are the bundles' tinted copies (`python -I kr-tints.py --write <id>=<code>`).
    It also looks in `Star05` and other `Star*` bundles, where Isolet's hair and hat were.
  - **White eyes (or any part blank white):** its material got no picture. Either the colour half is missing (only
    `…(AS).png` in its folder: take `…(RGB)` from the hero's bundles), or its file links the picture in a way three.js drops
    (Priscilla's eyes). Name it in the model's `pictures`.
  - **Something over its face:** a mesh the game keeps for its story scenes (Tanya's fox mask). Leave it out with the
    model's `hidden`.
  - **Bald:** its `Hair_01` isn't in its parts.
  - **A weapon at its feet:** it belongs in a hand (`left`/`right`).
  - **Lying down or twisted:** its clips are another skin's. Miruru's rig starts at `Bone_Bip`, and kr-anims.py
    handles that now.
  - **Extra parts:** Kara's `_Ordeal` / `_Trans` forms, Aselica's misnamed `_Hiar` copy. Remove them from `parts`.
  - **A floating weapon** (Gremory's cube, Annette's Rascal): use the skin's `floating`.
  - **"missing" lines** in its output: a file the page asked for that isn't there.
- **The bot:** `node scripts/sync.mjs` (writes `../Koma/vendor/technomagic-sim.mjs`), then `npm test` in `../Koma`.
  Thirteen TM tests already fail on the committed sim (the playtest rebalance), so compare with that, don't count on 0.

## 6. Commit

- **Where:** on the checked-out branch (master), in themed steps:
  - Koma-UI: the sim, then the hero's files, then its item pictures.
  - Koma: the catalog, the test and the synced sim.
- **What:** only your own files, since another session may be working too. Don't push.
- **Tell the user:** the bot needs redeploying for the new sim and catalog. Also mention:
  - any name you guessed;
  - any missing portrait;
  - where the playtest and the live game differ;
  - balance outliers (a hero far above or below Kirze, or a support that multiplies others).

## What comes on its own

These need nothing per hero:
- textures built as WebP, and big ones at half size for low-memory devices (`scripts/pictures.mjs`);
- clips built as `.krc`, half the size of the gzipped JSON (`scripts/clips.mjs`);
- face and bust cut-outs (`scripts/hero-cuts.mjs`);
- reading only the heroes wanted: a room's party, and practice's field first;
- cache headers (`vercel.json` already covers `/kr/` and `/built/`).

Don't preload all heroes anywhere.
