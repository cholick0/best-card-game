# Ember Pact — a duel of four suits

![Bounty](https://make.fun/badge/best-card-game-20261122-1826.svg)
![Rank](https://make.fun/badge/best-card-game-20261122-1826/cholick0/best-card-game/rank.svg)
![Reward](https://make.fun/badge/best-card-game-20261122-1826/cholick0/best-card-game/reward.svg)

Entry for the [make.fun "Make the best card game" bounty](https://make.fun/c/best-card-game-20261122-1826).

## The game

**Ember Pact** is an original duel card game. You face Vex, the Ember Warden,
across a moody green table. Each of you starts with 24 Flame. Every round you
both play one card face down, then reveal together — higher power wins the
clash and deals the gap (plus one) as damage. First to quench the other's
Flame wins; after round 15 the higher Flame wins, ties go to sudden death.

Four original suits, told apart by colour *and* shape:

| Suit | Colour | Shape | Beats | Trick |
| --- | --- | --- | --- | --- |
| Ember | red-orange | flame ▲ | Grove | Ember 8 is a Surge: +2 power, costs 2 Flame |
| Grove | green | leaf ❧ | Tide | Grove 8 Blooms: draws an extra card |
| Tide | blue | droplet ● | Ember | Tide 7 Mends: heals 4 Flame |
| Stone | gold | diamond ◆ | — | every Stone card Wards: no damage if it loses |

Combos: element advantage is +3 power, and playing the same suit as your
previous round gives +2 resonance. Vex has a readable strategy — she favours
Ember, counters your last suit, and *telegraphs* her lean (right about 3
times in 4) with table talk, so you can read her and counter her. One time in
five she bluffs with a weak card to bait your big one.

## Play

Open `game/index.html` in desktop Chrome (or run `node serve.ts` and open
http://localhost:8080). Click a card or press **1–3** to play it; **Enter**
starts and restarts. No build step, no network requests — everything lives
under `game/`.

## Files

- `game/index.html` — the page
- `game/style.css` — the table, the cards, the animations
- `game/src/deck.js` — the four suits and the 28-card deck
- `game/src/rules.js` — the pure rules (also runnable headlessly under Node)
- `game/src/ai.js` — Vex: scoring, telegraphs, bluffs
- `game/src/render.js` — cards, table, overlays
- `game/src/main.js` — screens, turns, keyboard + mouse input
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `/output/dossier.json` with `buildDossier`
- `screenshots/` — four renders of the game: table, title, win, loss
