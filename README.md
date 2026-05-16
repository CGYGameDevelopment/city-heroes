# City Heroes

> *Five fights. One run. No mercy.*

A browser-based roguelike deck-builder. Command a band of heroes across five escalating battles to defend your city against a sequence of Big Bads.

## How to Play

Run `python -m http.server 8000` in the project folder, then open `http://localhost:8000`. (See `HOW_TO_RUN_LOCALLY.md` for alternatives.)

1. **Get your city** — each city has unique stats and a passive that fires every turn or fight.
2. **Fight** — play cards from your hand each turn. Heroes resolve left-to-right; monsters resolve right-to-left.
3. **Recruit** — spend gold at the Bazaar to add heroes and spells to your deck. Use the Forge to scrap weak cards.
4. **Reward yourself** — between fights, choose a Promoted Hero or a Treasure. Some fights present an Event with a moral choice.
5. **Survive all five fights** to win the run.

## Game Concepts

| Concept | Description |
|---|---|
| **Morale** | Your city's health. Reach zero and the run ends. |
| **Gold** | Spent at the Bazaar to recruit heroes, upgrade the market, or use the Forge. |
| **Market level** | Unlock higher tiers to access stronger cards (costs 4 / 8 / 12 gold). |
| **Big Bad** | Each fight's boss. Telegraphs its next-turn intent. Has weaknesses and resistances. |
| **Treasures** | Persistent out-of-deck rewards. Trigger at hooks (start of turn, on recruit, etc.) |
| **Spells** | Cards that resolve immediately from hand. Some are consumed on use. |
| **Keywords** | Pierce, Lifesteal, Taunt, Charge, Echo — small re-usable card behaviours. |
| **Forge** | Pay gold during recruit to permanently scrap a starter. Cost ramps with each use. |
| **Events** | Between fights 2 and 4, a short narrative offers a moral choice. |

## Project Structure

```
index.html                  Entry point
00_core_constants.js        Shared numeric constants (FIGHTS_PER_RUN, FIGHT_TIER_SEQUENCE, …)
00_core_registry.js         Global data registry (cards, enemies, cities, treasures, events)
00_core_app.js              Top-level app / shared state container
01_data_cards_starter.js    Starter cards (Peddler, Militia)
01_data_cards_market.js     Market hero cards
01_data_cards_spells.js     Spell cards (resolve from hand, may consume)
01_data_cards_upgrades.js   Promoted heroes (post-fight rewards)
01_data_cards_curses.js     Curses (dead-draw cards added by greedy events)
01_data_cards_monster.js    Monster cards, organised by tier and tribe
01_data_enemies.js          Big Bad definitions (HP, ATK, intents, weaknesses)
01_data_levels.js           City definitions with passives
01_data_treasures.js        Treasure definitions (out-of-deck rewards)
01_data_events.js           Between-fight events with choice outcomes
02_sys_engine.js            Core game engine (turn loop, combat resolution, hooks)
02_sys_effects.js           Card effect handlers + trigger dispatch
03_ui_renderer.js           DOM rendering (board, intent panel, screens)
03_ui_art_painters.js       Canvas sprite painters
03_ui_styles.css            Styles
04_boot_main.js             ES module entry: validates data and wires bridges
```

## Design

`DESIGN.md` is the living design doc. It analyses the current game and lays out the staged improvements (Phases 0–10) inspired by Magic: The Gathering, Star Realms, and Hearthstone Battlegrounds.
