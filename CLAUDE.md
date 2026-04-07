# CLAUDE.md — City Heroes

## Project overview

Browser-based roguelike deck-builder. Pure vanilla JS with no build step, no transpiler, no external libraries. All files must run directly in the browser via a local HTTP server (ES modules require one).

All code in this project is exclusively LLM-generated.

**Running locally:** Open a terminal in the project folder and run `python -m http.server 8000`, then open `http://localhost:8000`. Alternatively, use the VS Code Live Server extension (right-click `index.html` → Open with Live Server). See `HOW_TO_RUN_LOCALLY.md` for all options. Opening `index.html` directly via `file://` will not work due to CORS.

---

## File naming convention

The numeric prefix encodes the layer. It also controls classic-script load order in `index.html`.

| Prefix | Layer | Files |
|--------|-------|-------|
| `00_core_` | Foundation — no imports allowed | `constants.js`, `registry.js`, `app.js` |
| `01_data_` | Data definitions — register into Registry | `cards_*.js`, `enemies.js`, `levels.js` |
| `02_sys_` | Systems — game logic | `engine.js`, `effects.js` |
| `03_ui_` | UI — rendering and styles | `renderer.js`, `art_painters.js`, `styles.css` |
| `04_boot_` | Entry point — wires everything | `main.js` |

---

## Module loading architecture

There are two distinct loading mechanisms in `index.html`:

- **Classic scripts** (`<script src="...">`) — run synchronously before `DOMContentLoaded`. Used for: `00_core_registry.js`, all `01_data_*.js` files, and `03_ui_art_painters.js`. These populate `Registry` and define globals (`make_art_painter`, `big_bad_art`, `city_art`).
- **ES module** (`<script type="module">`) — only `04_boot_main.js`. Imports from `02_sys_engine.js` and `03_ui_renderer.js`. Runs after all classic scripts.

`Registry.lock()` is called at `DOMContentLoaded` in `04_boot_main.js`, after which all data pools are frozen.

The import graph must remain acyclic: `renderer.js` never imports from `engine.js`. Both bridges are wired in `04_boot_main.js` (note: the file's internal header comment says `startup_validator.js` — this is a naming inconsistency in the codebase).

- **Engine → renderer** (`init_engine(renderer_fns)`): required functions — `render`, `log_entry`, `log_phase`, `flash_notification`, `clear_hand_selection`, `show_prefight_screen`, `show_upgrade_screen`, `show_summary_screen`, `show_screen`.
- **Renderer → engine** (`setupEventListeners(engine_fns)`): required functions — `start_new_run`, `begin_fight`, `on_phase_btn`, `quick_play_all`, `on_hand_card_click`, `on_hero_slot_click`, `on_market_card_click`, `on_unlock_market_slot`, `on_upgrade_market_click`, `apply_upgrade`, `get_effective_market_size`, `get_slot_unlock_cost`, `get_card_cost`, `create_card_instance`, `shuffle_array`.

---

## Registry pattern

All game data is registered through `00_core_registry.js` before the ES module fires.

```js
Registry.register_cards_market([...]);       // hero/market cards
Registry.register_cards_starter([...]);      // starter cards
Registry.register_cards_upgrades([...]);     // promoted cards
Registry.register_cards_monster(tier, [...]);// monster cards (tier 1–3)
Registry.register_big_bads(tier, [...]);     // big bads (tier 1–3)
Registry.register_cities([...]);             // city definitions
```

After `Registry.lock()`, any further `register_*()` call throws.

---

## Card definition shape

Every card (hero, starter, promoted, monster) must conform to this shape — validated at startup:

```js
{
  id:       'unique_string',      // unique across all card pools
  name:     'Display Name',
  type:     'starter' | 'hero' | 'promoted' | 'monster',
  cost:     0,                    // gold cost
  level:    2,                    // market tier required (0 = always available)
  role:     'physical' | 'magical' | 'tactical',
  atk:      0,
  atk_type: 'none' | 'physical' | 'magical',
  gold:     0,
  morale:   0,
  shield:   0,
  desc:     'Tooltip text.',
  art:      (ctx, x, y, w, h) => { /* canvas draw calls */ },
  effects:  [],                   // see Effect types below
}
```

---

## Effect types

Valid `effect.type` values and their required fields. Hero effects are in `apply_hero_effect`; monster effects in `apply_monster_effect`.

**Hero effects**

| Type | Required fields |
|------|----------------|
| `transform` | `zones` (array of `'field'\|'hand'\|'deck'\|'discard'`), `target: { match: 'id'\|'type', value }`, `replace_with` (card id) — note: only `zones` and `replace_with` are validated at startup; a missing `target` will fail silently at runtime |
| `stun` | `selection`: `'random'\|'opposite'` |
| `draw` | `amount` |
| `scrap` | `target`: `'starter'\|'any_hand'\|'any_discard'` |
| `cost_reduce` | `amount` — reduces cost of next recruit by this much |
| `field_bonus` | `condition`: `'adjacent_role_match'\|'field_count_gte'`, `stat`: `'atk'\|'gold'\|'shield'\|'morale'`, `amount`; `threshold` required when condition is `'field_count_gte'` |
| `haste` | `target_side`: `'hero'\|'monster'` — moves a pending step to act next |
| `slow` | `target_side`: `'hero'\|'monster'` — moves a pending step to act last |
| `stop` | `target_side`: `'hero'\|'monster'` — removes all remaining steps for the target |
| `recur` | *(no extra fields)* — pulls a random hero/starter/promoted from discard into an empty field slot |
| `shield_drain` | `amount` — reduces monster shield by this much |
| `weaken_atk` | `amount` — reduces Big Bad ATK by this much next turn |
| `stat_mod_all` | `stat`: `'atk'`, `amount` — buffs all active hero field cards; `duration` is stored and logged but not enforced (no expiry logic) |
| `kill_monster` | *(no extra fields)* — permanently banishes a random monster type from this fight |
| `cleanse` | `zones` (array), `count`: `'all'\|number` — removes `corrupted` flag from cards |

**Monster effects**

| Type | Required fields |
|------|----------------|
| `kill` | *(no extra fields)* — permanently deletes a random hero card from the run |

---

## Big Bad definition shape

```js
{
  id:                'unique_string',
  name:              'Display Name',
  title:             'Subtitle',
  tier:              1 | 2 | 3,
  max_hp:            20,
  atk:               2,
  monsters_per_turn: 2,           // max MONSTER_SLOTS − 1 (4); one slot is reserved for the Big Bad's own ATK card
  role:              'physical' | 'magical' | 'tactical',
  level:             0,           // passed through to the Big Bad's ATK card instance (used by renderer for display)
  deck_desc:         'Describes monster pool.',
  victory_message:   '...',
  defeat_message:    '...',
}
```

Each Big Bad must also have an entry in `big_bad_art` (defined in `03_ui_art_painters.js`).

---

## City definition shape

```js
{
  id:                  'unique_string',
  name:                'City Name',
  type:                'description string',
  max_morale:          40,
  market_size:         3,         // starting visible market slots
  starting_def:        0,
  hero_cost_discount:  0,
  bonus_gold_per_turn: 0,
  effects:             [],        // optional
}
```

Each city must also have an entry in `city_art`.

---

## Key constants (`00_core_constants.js`)

| Constant | Value | Meaning |
|----------|-------|---------|
| `HAND_SIZE` | 5 | Cards drawn per turn |
| `FIELD_SIZE_MAX` | 6 | Max hero slots |
| `MARKET_ARRAY_SIZE` | 6 | Length of market array (matches `FIELD_SIZE_MAX` by design) |
| `MONSTER_SLOTS` | 5 | Max monster slots |
| `FIGHTS_PER_RUN` | 3 | Fights before win |
| `MARKET_LEVEL_START` | 2 | Market tier at run start — cards with `level <= 2` are visible; `level: 0` means always available |
| `MARKET_LEVEL_MAX` | 5 | Highest market tier |
| `UPGRADE_CHOICE_COUNT` | 3 | Promoted cards offered between fights |
| `MARKET_UPGRADE_COSTS` | `{3:4, 4:8, 5:12}` | Gold cost to unlock each market tier |
| `MARKET_SLOT_UNLOCK_BASE` | 5 | Base cost per extra market slot; cost = `(slots_unlocked + 1) * base` |

Timing constants (`DRAW_PHASE_DELAY_MS`, `RESOLVE_STEP_DELAY_MS`, `FIGHT_END_DELAY_MS`, `BIG_BAD_PHASE_DELAY_MS`) control animation pacing.

---

## Startup validation

`04_boot_main.js` runs a comprehensive validation sequence before enabling the game:

1. **Pool existence** — all required Registry pools are present (`cards_starter`, `cards_market`, `cards_upgrades`, `cards_monster_tier_1/2/3`, `big_bads_tier_1/2/3`, `cities`).
2. **Global presence** — `make_art_painter` global is defined.
3. **Shape validation** — `validate_card_def`, `validate_big_bad_def`, `validate_city_def` against every registered definition.
4. **Art coverage** — bidirectional: every Big Bad and city must have an art entry, and no orphaned art entries are allowed.
5. **ID uniqueness** — card `id` values must be unique across all card pools.

If any errors are found, the Begin Run button shows `FAILED TO LOAD` and all errors are printed to the browser console. Always check the console after adding new data.

---

## Game state namespaces

`App.game_state` has three sub-objects. All engine and effect functions receive the full state object.

| Namespace | Lifetime | Key fields |
|-----------|----------|------------|
| `state.run` | Entire run | `fight_number`, `deck`, `hand`, `discard`, `big_bads` (fight history) |
| `state.fight` | Single fight | `city`, `big_bad`, `city_morale`, `city_def`, `monster_shield`, `gold_pool`, `hero_field`, `monster_field`, `monster_excluded_ids`, `market_level`, `market_unlocked_slots`, `market`, `fight_result` |
| `state.turn` | Single turn | `phase`, `turn_number`, `atk_weakened_next`, `cost_reduce_next`, `resolving_step`, `active_resolution_sequence`, `completed_slots` |

`state.fight` is `null` until `advance_to_next_fight()` runs. `state.turn` is `null` until the first draw phase.

---

## Code style

Follow best industry practice for vanilla JS. Specific constraints of this project:
- No external libraries or npm packages
- No build step — no transpiling, no bundling
- No classes — use plain objects and functions
- `00_core_constants.js` must remain import-free (safe to import from anywhere)
