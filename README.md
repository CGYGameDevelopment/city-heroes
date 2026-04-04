# City Heroes

> *Three fights. One run. No mercy.*

A browser-based roguelike deck-builder. Command a band of heroes across three escalating battles to defend your city against a powerful Big Bad.

## How to Play

Open `index.html` in any modern browser — no build step, no dependencies.

1. **Pick your city** — each city has unique stats and a starting deck.
2. **Fight** — play cards from your hand each turn. Heroes resolve left-to-right; monsters resolve right-to-left.
3. **Recruit** — spend gold at the Bazaar to add heroes and upgrades to your deck.
4. **Survive all three fights** to win the run.

## Game Concepts

| Concept | Description |
|---|---|
| **Morale** | Your city's health. Reach zero and the run ends. |
| **Gold** | Spent at the Bazaar to recruit heroes and upgrade the market. |
| **Market level** | Unlock higher tiers to access stronger cards (costs 4 / 8 / 12 gold). |
| **Big Bad** | Each fight's boss — spawns monsters every turn and attacks directly. |

## Project Structure

```
index.html                  Entry point
00_core_constants.js        Shared numeric constants
00_core_registry.js         Global data registry (cards, enemies, cities)
00_core_app.js              Top-level app / screen controller
01_data_cards_*.js          Card definitions (starter, market, upgrades, monsters)
01_data_enemies.js          Big Bad definitions
01_data_levels.js           Fight / level configuration
02_sys_engine.js            Core game engine (turn loop, combat resolution)
02_sys_effects.js           Card effect handlers
03_ui_renderer.js           DOM rendering
03_ui_art_painters.js       Canvas sprite painters
03_ui_styles.css            Styles
04_boot_main.js             Entry-point module (wires everything together)
```
