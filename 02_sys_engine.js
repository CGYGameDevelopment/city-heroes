// engine.js
// Core game runtime: state management, phase sequencing, card resolution,
// run setup, market, and upgrade logic.
//
// Imports:  constants.js, app.js, engine_effects.js
// Owns:     App.game_state, App.resolution_timer
// Calls:    renderer functions via init_engine() renderer bridge
//
// ui_state is NOT touched here. Engine functions that previously cleared
// ui_state.selected_hand_uid now call clear_hand_selection() (renderer.js),
// which owns ui_state exclusively.
//
// ── State lifetime namespaces ────────────────────────────────
//   App.game_state.run   — persists across all fights in one run
//   App.game_state.fight — reset at the start of each new fight
//   App.game_state.turn  — reset at the start of each draw phase
//
// Renderer and effects functions always receive the full game_state object
// so they can read across namespaces when needed without coupling to the
// split structure directly.

import {
  HAND_SIZE, MARKET_SIZE_DEFAULT, FIELD_SIZE_MAX, MARKET_ARRAY_SIZE,
  MONSTER_SLOTS, FIGHTS_PER_RUN, FIGHT_TIER_SEQUENCE,
  DRAW_PHASE_DELAY_MS, RESOLVE_STEP_DELAY_MS,
  FIGHT_END_DELAY_MS, BIG_BAD_PHASE_DELAY_MS, MARKET_LEVEL_START,
  MARKET_LEVEL_MAX, MARKET_UPGRADE_COSTS, MARKET_SLOT_UNLOCK_BASE,
  FORGE_BASE_COST, FORGE_STEP_COST,
} from './00_core_constants.js';

import { App } from './00_core_app.js';

import {
  apply_hero_effect,
  dispatch_effects,
  init_effects_bridge,
} from './02_sys_effects.js';

// ─────────────────────────────────────────────────────────────
// RENDERER BRIDGE
// Renderer functions called by engine are supplied via init_engine()
// rather than imported directly, because renderer.js imports from engine.js
// (for game logic helpers) which would form a circular dependency.
// startup_validator.js calls init_engine() once all modules are loaded.
// The bridge is stored as a frozen object so callers get a clear error if
// init_engine() was never called rather than a silent undefined call.
// ─────────────────────────────────────────────────────────────

let _renderer = null;

/**
 * Called once by startup_validator.js after all modules have loaded.
 * Validates that every expected renderer function is present, then wires
 * engine → renderer and engine → effects bridges.
 *
 * @param {object} renderer_fns — must contain all keys listed in REQUIRED_RENDERER_FNS.
 */
export function init_engine(renderer_fns) {
  const REQUIRED = [
    'render', 'log_entry', 'log_phase', 'flash_notification',
    'clear_hand_selection', 'show_prefight_screen', 'show_upgrade_screen',
    'show_summary_screen', 'show_event_screen', 'show_screen',
  ];
  const missing = REQUIRED.filter(k => typeof renderer_fns[k] !== 'function');
  if (missing.length > 0) {
    throw new Error(
      `init_engine: missing renderer functions: ${missing.join(', ')}. ` +
      `Ensure startup_validator.js calls init_engine() with all required fns.`
    );
  }
  _renderer = Object.freeze({ ...renderer_fns });

  // Supply engine_effects.js with the helpers it needs.
  // Note: render is intentionally NOT passed — effects must not trigger
  // intermediate renders. The engine's run_resolve_step() renders once per step.
  init_effects_bridge({
    pick_random,
    shuffle_array,
    get_adjacent_cards,
    get_opposite_cards,
    create_card_instance,
    find_card_def_by_id,
    get_monster_pool,
    log_entry: _renderer.log_entry,
  });
}

// ─────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────

/** Returns a new Fisher-Yates shuffle of source_array. Does not mutate. */
export function shuffle_array(source_array) {
  const shuffled = [...source_array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Returns a random element from array, or null if empty/falsy. */
export function pick_random(array) {
  if (!array?.length) return null;
  return array[Math.floor(Math.random() * array.length)];
}

/** Maps a card/big-bad role to its ATK type string for resolution pip display. */
function atk_type_from_role(role) {
  return role === 'magical' ? 'atk-magical' : 'atk-physical';
}

// ─────────────────────────────────────────────────────────────
// FIELD SPATIAL RELATIONSHIPS
// Board geometry (0-based slot indices):
//   Monster row:  M0  M1  M2  M3  M4          (MONSTER_SLOTS = 5)
//   Hero row:   H0  H1  H2  H3  H4  H5        (FIELD_SIZE_MAX = 6)
// ─────────────────────────────────────────────────────────────

/**
 * Finds a Taunt hero in a slot opposite to (M, monster_slot) that is still
 * active (i.e. hasn't already taken a hit this turn). Returns
 * { card, slot } or null.
 *
 * Preference order: leftmost opposite Taunt hero. Stable so behaviour is
 * predictable in replays.
 */
export function find_taunt_blocker(state, monster_slot) {
  const opposite_indices = [monster_slot, monster_slot + 1]
    .filter(i => i >= 0 && i < FIELD_SIZE_MAX);
  for (const i of opposite_indices) {
    const c = state.fight.hero_field[i];
    if (c && c.active && has_keyword(c, 'taunt')) return { card: c, slot: i };
  }
  return null;
}

/** Returns all occupied cards adjacent (±1 index, same side) to (side, slot). */
export function get_adjacent_cards(state, side, slot) {
  const field = side === 'H' ? state.fight.hero_field : state.fight.monster_field;
  return [slot - 1, slot + 1]
    .filter(i => i >= 0 && i < field.length)
    .map(i => field[i])
    .filter(Boolean);
}

/**
 * Returns all occupied cards opposite to (side, slot) across the board.
 * Hero Hn is opposite M(n-1) and Mn.
 * Monster Mn is opposite Hn and H(n+1).
 */
export function get_opposite_cards(state, side, slot) {
  if (side === 'H') {
    return [slot - 1, slot]
      .filter(i => i >= 0 && i < MONSTER_SLOTS)
      .map(i => state.fight.monster_field[i])
      .filter(Boolean);
  }
  return [slot, slot + 1]
    .filter(i => i >= 0 && i < FIELD_SIZE_MAX)
    .map(i => state.fight.hero_field[i])
    .filter(Boolean);
}

// ─────────────────────────────────────────────────────────────
// CARD / ENTITY FACTORIES
// ─────────────────────────────────────────────────────────────

/** Creates a fresh card instance from a definition, deep-copying its effects array. */
export function create_card_instance(card_def) {
  return {
    ...card_def,
    effects:         card_def.effects  ? card_def.effects.map(e => ({ ...e })) : [],
    keywords:        card_def.keywords ? [...card_def.keywords]                : [],
    uid:             crypto.randomUUID(),
    active:          false,
    resolved:        false,
    injected:        false,
    corrupted:       false,
    temp_atk_mod:    0,
    resolution_pips: [],
  };
}

/** True if a card has the given keyword. Safe on cards without a keywords array. */
export function has_keyword(card, kw) {
  return !!(card?.keywords?.includes(kw));
}

/**
 * Phase 3 — Faction synergy. If `card.ally_bonus` is present and another active
 * field hero shares the named faction (role), apply the listed bonuses to the
 * card. Stat bonuses go through temp_atk_mod (atk) or directly to fight pools
 * (gold/morale/shield) when the card resolves.
 *
 * Schema: ally_bonus = { faction: 'physical'|'magical'|'tactical', atk?, gold?, morale?, shield? }
 */
export function apply_ally_bonus(state, card, slot_index) {
  const bonus = card.ally_bonus;
  if (!bonus?.faction) return;
  const has_ally = state.fight.hero_field.some((other, i) =>
    other && other.uid !== card.uid && other.role === bonus.faction
  );
  if (!has_ally) return;
  // Stash the live values onto the card so the resolution loop adds them in.
  if (bonus.atk)    card.temp_atk_mod += bonus.atk;
  if (bonus.gold)   card._ally_gold    = (card._ally_gold   ?? 0) + bonus.gold;
  if (bonus.morale) card._ally_morale  = (card._ally_morale ?? 0) + bonus.morale;
  if (bonus.shield) card._ally_shield  = (card._ally_shield ?? 0) + bonus.shield;
  _renderer.log_entry(`${card.name}: ally bonus from a fellow ${bonus.faction}!`, 'log-effect');
}

/**
 * Returns the damage to apply to the Big Bad after faction multipliers.
 *
 * Big Bad fields:
 *   weak_against:    role string — heroes of this role deal +50% damage (rounded up).
 *   strong_against:  role string — heroes of this role deal -50% damage (rounded down).
 */
export function apply_faction_multiplier(big_bad, card, base_damage) {
  if (base_damage <= 0) return 0;
  if (big_bad.weak_against   === card.role) return Math.ceil(base_damage  * 1.5);
  if (big_bad.strong_against === card.role) return Math.floor(base_damage * 0.5);
  return base_damage;
}

/** Creates a fresh big-bad instance from a definition. */
function create_big_bad_instance(big_bad_def) {
  return { ...big_bad_def, hp: big_bad_def.max_hp, atk_weakened: 0 };
}

/**
 * Creates the ATK card that represents a direct big-bad strike.
 * art_id (big_bad.id) is stored on the card so the renderer can resolve
 * the paint function via big_bad_art — keeping engine.js decoupled from canvas ops.
 * atk_type is stored directly on the card (matching card schema) rather than
 * being derived from role at resolution time.
 */
function create_atk_card(big_bad) {
  const base_attack = Math.max(0, big_bad.atk - big_bad.atk_weakened);
  return create_card_instance({
    id:       'big_bad_atk',
    name:     big_bad.name,
    type:     'monster',
    subtype:  'atk',
    level:    big_bad.level,
    role:     big_bad.role,
    cost:     0,
    atk:      base_attack,
    atk_type: big_bad.role === 'magical' ? 'magical' : 'physical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     `Big Bad direct attack — ${base_attack} damage to the city.`,
    art_id:   big_bad.id,
  });
}

// ─────────────────────────────────────────────────────────────
// STATE INITIALISERS
// ─────────────────────────────────────────────────────────────

/**
 * Creates the run-scoped state that persists across all fights.
 * Holds the player's accumulated card pool (deck/hand/discard carry forward
 * into rebuild_player_deck) and the run history.
 */
function init_run_state() {
  return {
    fight_number: 0,   // incremented by advance_to_next_fight
    big_bads:     [],  // { name, result } records appended after each fight
    // Player's cross-fight card pool. Populated by rebuild_player_deck.
    // Kept here so promoted cards survive between fights.
    deck:         [],
    hand:         [],
    discard:      [],
    // Phase 5 — Treasures collected this run. Each entry is a treasure def.
    // Treasures fire at engine hooks ('start_of_turn', 'start_of_fight',
    // 'on_recruit', 'on_turn_end') via fire_treasure_hooks.
    treasures:    [],
    // Phase 10 — Cards added permanently by events. rebuild_player_deck
    // injects fresh instances of these into every fight (just like promoted
    // cards). Lets non-promoted cards (e.g. spells, curses, base heroes)
    // persist across the run when granted by events. Holds card defs.
    permanent_extras: [],
    // Phase 7 — Number of starter slots permanently scrapped via the Forge
    // or scrap_random outcomes. rebuild_player_deck removes this many
    // starters from the fresh deck before promoting/extras.
    scrapped_starters: 0,
  };
}

/**
 * Creates the fight-scoped state that is reset at the start of each fight.
 * Receives the city and big_bad instances for this fight.
 */
function init_fight_state(city, big_bad) {
  return {
    city,
    big_bad,
    city_morale:           city.max_morale,
    city_def:              get_city_initial_def(city),
    monster_shield:        0,
    gold_pool:             0,
    hero_field:            Array(FIELD_SIZE_MAX).fill(null),
    monster_field:         Array(MONSTER_SLOTS).fill(null),
    monster_excluded_ids:  new Set(),
    market_level:          MARKET_LEVEL_START,
    market_unlocked_slots: 0,
    market:                null,  // filled after city is known
    fight_result:          null,  // 'won' | 'lost' | null
    // Phase 1 — Big Bad intent: pre-rolled monster lineup for the upcoming
    // turn. Lets the renderer show "next turn: ATK 5 + Goblin Raider + Cave Bat"
    // and lets the player plan for it. Refreshed in finish_resolution and at
    // fight start.
    next_intent:           null,
    // Phase 7 — Forge usage counter. Each forge use within a fight raises
    // the next use's cost. Reset at fight start.
    forge_uses:            0,
  };
}

/**
 * Creates the turn-scoped state reset at the start of each draw phase.
 * Holds ephemeral per-turn values: phase, carry-forward modifiers, and
 * the resolution sequence for this turn.
 */
function init_turn_state() {
  return {
    phase:                      'DRAW',
    turn_number:                0,
    atk_weakened_next:          0,  // applied to big bad ATK at start of Big Bad phase
    cost_reduce_next:           0,  // deducted from next recruit cost
    resolving_step:             -1,
    completed_slots:            { H: new Set(), M: new Set() },
    active_resolution_sequence: [],
  };
}

// ─────────────────────────────────────────────────────────────
// RUN / FIGHT SETUP
// ─────────────────────────────────────────────────────────────

export function start_new_run() {
  if (App.resolution_timer) {
    clearTimeout(App.resolution_timer);
    App.resolution_timer = null;
  }
  _renderer.clear_hand_selection();

  // game_state is the single object passed around everywhere.
  // Its three sub-objects are always present after start_new_run().
  App.game_state = {
    run:   init_run_state(),
    fight: null,   // set by advance_to_next_fight
    turn:  null,   // set by reset_turn_state
  };
  advance_to_next_fight(App.game_state);
}

/**
 * Maps a 1-indexed fight number to its tier. Reads FIGHT_TIER_SEQUENCE
 * with a fallback to the last tier for safety if a run somehow exceeds
 * the sequence length.
 */
function get_tier_for_fight(fight_number) {
  const idx  = fight_number - 1;
  const last = FIGHT_TIER_SEQUENCE[FIGHT_TIER_SEQUENCE.length - 1];
  return FIGHT_TIER_SEQUENCE[idx] ?? last;
}

function advance_to_next_fight(state) {
  state.run.fight_number += 1;

  const tier         = get_tier_for_fight(state.run.fight_number);
  const big_bad_pool = get_big_bad_pool(tier);
  if (!big_bad_pool?.length) {
    throw new Error(
      `advance_to_next_fight: empty big bad pool at fight ${state.run.fight_number}. ` +
      `Check big_bads.js and ensure startup_validator.js ran cleanly.`
    );
  }

  const big_bad = create_big_bad_instance(pick_random(big_bad_pool));
  const city    = pick_random(Registry.cities);

  rebuild_player_deck(state);

  state.fight = init_fight_state(city, big_bad);
  state.fight.market = fill_market(get_city_market_size(city), state.fight.market_level);

  // Apply persistent run modifiers from events (Phase 10).
  // pending_gold: one-shot, consumed on this fight start.
  // max_morale_mod: persistent shift applied every fight.
  if (state.run.pending_gold) {
    state.fight.gold_pool += state.run.pending_gold;
    state.run.pending_gold = 0;
  }
  if (state.run.max_morale_mod) {
    state.fight.city_morale = Math.max(1, state.fight.city_morale + state.run.max_morale_mod);
  }

  state.turn = init_turn_state();

  // Pre-roll the first turn's monster lineup so the prefight screen can
  // already show the player what they're walking into.
  build_next_intent(state);

  _renderer.show_prefight_screen(state);
}

/**
 * Rebuilds the player's deck for the next fight from the run's card pool.
 * Promoted cards accumulated through upgrades are carried forward,
 * each replacing a random starter in the fresh deck.
 */
function rebuild_player_deck(state) {
  const run = state.run;
  const all_zones = [...run.deck, ...run.hand, ...run.discard];
  const promoted  = all_zones.filter(c => c.type === 'promoted');

  const fresh_deck = Registry.cards_starter.map(def => create_card_instance(def));

  // Apply permanent starter scrapping (Forge / scrap_random events). Pull
  // random starters out of the fresh deck before any promotion/extras.
  let to_scrap = run.scrapped_starters ?? 0;
  while (to_scrap > 0) {
    const starter_idx = fresh_deck.findIndex(c => c.type === 'starter');
    if (starter_idx === -1) break;
    fresh_deck.splice(starter_idx, 1);
    to_scrap--;
  }

  const starter_indices = fresh_deck.reduce((acc, c, i) => {
    if (c.type === 'starter') acc.push(i);
    return acc;
  }, []);

  // Promoted heroes earned via the upgrade screen. Each replaces a starter
  // in the fresh deck so the deck doesn't grow unbounded across fights.
  for (const p of promoted) {
    if (starter_indices.length === 0) break;
    const pick          = Math.floor(Math.random() * starter_indices.length);
    const replace_index = starter_indices.splice(pick, 1)[0];
    const def           = find_card_def_by_id(p.id) ?? p;
    fresh_deck[replace_index] = create_card_instance(def);
  }

  // Phase 10 — Event-granted permanent cards (heroes, spells, curses).
  // Curses are appended (they grow the deck — that's the *cost* of the
  // greedy reward that came with them). Heroes and spells replace a
  // starter when one is available, otherwise they just append.
  for (const def of (run.permanent_extras ?? [])) {
    if (def.type === 'curse') {
      fresh_deck.push(create_card_instance(def));
    } else if (starter_indices.length > 0) {
      const pick          = Math.floor(Math.random() * starter_indices.length);
      const replace_index = starter_indices.splice(pick, 1)[0];
      fresh_deck[replace_index] = create_card_instance(def);
    } else {
      fresh_deck.push(create_card_instance(def));
    }
  }

  run.deck    = shuffle_array(fresh_deck);
  run.hand    = [];
  run.discard = [];
}

/** Resets turn-scoped state to starting values. Called at the top of each draw phase. */
function reset_turn_state(state) {
  // Preserve turn_number across resets — it counts full turns, not phases.
  const prev_turn = state.turn ? state.turn.turn_number : 0;
  state.turn = init_turn_state();
  state.turn.turn_number = prev_turn;
}

// ─────────────────────────────────────────────────────────────
// DATA LOOKUPS
// ─────────────────────────────────────────────────────────────

// Pool getters are thunks (functions returning the array) so they read from
// Registry at call time rather than at module parse time.
const BIG_BAD_POOL_MAP = Object.freeze({
  1: () => Registry.big_bads_tier_1,
  2: () => Registry.big_bads_tier_2,
  3: () => Registry.big_bads_tier_3,
});
const MONSTER_POOL_MAP = Object.freeze({
  1: () => Registry.cards_monster_tier_1,
  2: () => Registry.cards_monster_tier_2,
  3: () => Registry.cards_monster_tier_3,
});
const POOL_TIER_MAX = 3;

function get_big_bad_pool(tier) {
  const getter = BIG_BAD_POOL_MAP[tier];
  if (!getter) {
    console.warn(`get_big_bad_pool: unexpected tier ${tier}, falling back to tier ${POOL_TIER_MAX}.`);
    return BIG_BAD_POOL_MAP[POOL_TIER_MAX]();
  }
  return getter();
}

/**
 * Returns the monster pool for the given tier. If a Big Bad with a
 * `monster_tribes` array is present in the active fight, the pool is filtered
 * to only include monsters whose `tribe` matches one of those tribes
 * (Phase 4 — themed Big Bads).
 *
 * Exported so engine_effects.js can receive it via init_effects_bridge.
 */
export function get_monster_pool(tier) {
  const getter = MONSTER_POOL_MAP[tier];
  if (!getter) {
    console.warn(`get_monster_pool: unexpected tier ${tier}, falling back to tier ${POOL_TIER_MAX}.`);
    return MONSTER_POOL_MAP[POOL_TIER_MAX]();
  }
  const full_pool = getter();
  const big_bad   = App.game_state?.fight?.big_bad;
  const tribes    = big_bad?.monster_tribes;
  if (!tribes?.length) return full_pool;
  const filtered = full_pool.filter(def => tribes.includes(def.tribe));
  // Defensive: if no monster matches the tribe filter, fall back to the full
  // pool so the Big Bad isn't softlocked. Should never happen if data is sane.
  return filtered.length > 0 ? filtered : full_pool;
}

export function get_city_market_size(city) {
  return city.market_size ?? MARKET_SIZE_DEFAULT;
}

export function get_city_initial_def(city) {
  return city.starting_def ?? 0;
}

/**
 * Searches all card pools in the Registry for a card def by id.
 * Searches cards_starter (via Registry, after migration) first, then market,
 * then upgrades. Used by the transform effect and rebuild_player_deck.
 */
export function find_card_def_by_id(card_id) {
  for (const pool of [
    Registry.cards_starter,
    Registry.cards_market,
    Registry.cards_upgrades,
    Registry.cards_curses,
  ]) {
    if (!pool) continue;
    const found = pool.find(def => def.id === card_id);
    if (found) return found;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// MARKET
// ─────────────────────────────────────────────────────────────

function get_available_market_pool(market_level) {
  return Registry.cards_market.filter(def => def.level <= market_level);
}

/**
 * Fills the market array for a new fight.
 *
 * Sampling strategy: pick_random samples with replacement, so the same card
 * definition can appear in multiple market slots simultaneously. This is
 * intentional — it keeps the fill logic simple and stateless, and means a
 * player can see duplicates. If unique-per-slot behaviour is ever desired,
 * replace with a shuffle-and-slice of the pool.
 */
function fill_market(size, market_level) {
  const pool = get_available_market_pool(market_level);
  if (pool.length === 0) {
    console.warn(`fill_market: no cards available at market level ${market_level}.`);
    return Array(MARKET_ARRAY_SIZE).fill(null);
  }
  return Array.from({ length: MARKET_ARRAY_SIZE }, (_, i) =>
    i < size ? create_card_instance(pick_random(pool)) : null
  );
}

function refill_market(state) {
  const pool           = get_available_market_pool(state.fight.market_level);
  const effective_size = get_effective_market_size(state);
  if (pool.length === 0) {
    console.warn(`refill_market: no cards available at market level ${state.fight.market_level}.`);
    return;
  }
  for (let i = 0; i < effective_size; i++) {
    state.fight.market[i] = create_card_instance(pick_random(pool));
  }
  for (let i = effective_size; i < MARKET_ARRAY_SIZE; i++) {
    state.fight.market[i] = null;
  }
}

/**
 * Returns the effective recruit cost of a card, applying city discounts.
 * The global minimum of 0 ensures non-hero card types (starter, promoted)
 * can never go negative if a discount is accidentally applied.
 * Hero cards have a separate minimum of 1 — they are never free to recruit.
 */
export function get_card_cost(card, city) {
  let cost = card.cost;
  if (card.type === 'hero') {
    cost = Math.max(1, cost - (city.hero_cost_discount ?? 0));
  } else {
    cost = Math.max(0, cost);
  }
  return cost;
}

// ─────────────────────────────────────────────────────────────
// FIGHT START
// ─────────────────────────────────────────────────────────────

export function begin_fight() {
  _renderer.show_screen('screen-fight');
  // City + treasure hooks: start_of_fight fires once when the player commits
  // to entering the fight (after the prefight reveal). This is the place for
  // one-shot per-fight bonuses (extra gold, extra defence, an extra draw).
  fire_city_hooks(App.game_state,     'start_of_fight');
  fire_treasure_hooks(App.game_state, 'start_of_fight');
  run_draw_phase(App.game_state);
}

// ─────────────────────────────────────────────────────────────
// PHASE LOOP
// ─────────────────────────────────────────────────────────────

export function on_phase_btn() {
  const state = App.game_state;
  if (!state) return;
  if      (state.turn.phase === 'HEROES')  begin_resolution(state);
  else if (state.turn.phase === 'RECRUIT') end_recruit_phase(state);
  else console.warn(`on_phase_btn: called during unexpected phase '${state.turn.phase}'.`);
}

// -- Phase 1 -- Draw ------------------------------------------

function run_draw_phase(state) {
  reset_turn_state(state);
  state.turn.phase = 'DRAW';
  _renderer.log_phase('-- Draw Phase --');
  _renderer.render();
  setTimeout(() => {
    // Treasure + city hooks: start_of_turn fires before the draw so an
    // extra-card treasure (Spellbook) actually adds a card this turn.
    fire_city_hooks(state,    'start_of_turn');
    fire_treasure_hooks(state, 'start_of_turn');
    draw_cards(state, HAND_SIZE);
    _renderer.render();
    run_big_bad_phase(state);
  }, DRAW_PHASE_DELAY_MS);
}

function draw_cards(state, count) {
  const run = state.run;
  for (let i = 0; i < count; i++) {
    if (run.deck.length === 0) {
      if (run.discard.length === 0) {
        console.warn(`draw_cards: deck and discard both empty after ${i} of ${count} draws.`);
        break;
      }
      run.deck    = shuffle_array(run.discard);
      run.discard = [];
      _renderer.log_entry('Deck reshuffled from discard.', 'log-phase');
    }
    run.hand.push(run.deck.pop());
  }
}

// -- Phase 2 -- Big Bad ---------------------------------------

function consume_atk_weaken(state) {
  state.fight.big_bad.atk_weakened = state.turn.atk_weakened_next;
  state.turn.atk_weakened_next     = 0;
}

/**
 * Cities (Phase 9) — fire any city passive whose `hook` matches the given
 * hook. Cities use the same effect schema as treasures and cards. The
 * `passives` array on a city def lists `{ hook, effect }` pairs.
 *
 * Cities and treasures fire at the same hook points, so this delegates to
 * the same machinery as fire_treasure_hooks.
 */
export function fire_city_hooks(state, hook) {
  const passives = state.fight?.city?.passives;
  if (!passives?.length) return;
  for (const passive of passives) {
    if (passive.hook !== hook) continue;
    const synthetic_source = {
      uid:             `city-${state.fight.city.id}-${passive.hook}`,
      id:              state.fight.city.id,
      name:            state.fight.city.name,
      role:            'tactical',
      atk_type:        'none',
      effects:         [],
      keywords:        [],
      resolution_pips: [],
      temp_atk_mod:    0,
    };
    apply_hero_effect(state, passive.effect, synthetic_source, 0);
  }
}

/**
 * Treasures (Phase 5) — fire any treasure whose `hook` matches the given hook.
 * Treasures don't have a card body, so we synthesize a lightweight source
 * with just the fields the effect handler reads (name, uid, etc.).
 *
 * Valid hooks: 'start_of_turn', 'start_of_fight', 'on_recruit', 'on_turn_end'.
 */
export function fire_treasure_hooks(state, hook) {
  const treasures = state.run.treasures ?? [];
  if (treasures.length === 0) return;
  for (const treasure of treasures) {
    if (treasure.hook !== hook) continue;
    const synthetic_source = {
      uid:             `treasure-${treasure.id}`,
      id:              treasure.id,
      name:            treasure.name,
      role:            'tactical',
      atk_type:        'none',
      effects:         [],
      keywords:        [],
      resolution_pips: [],
      temp_atk_mod:    0,
    };
    // Treasures use the hero effect handler — they grant gold, draw, damage,
    // etc., all defined under apply_hero_effect.
    apply_hero_effect(state, treasure.effect, synthetic_source, 0);
  }
}

/**
 * Pre-rolls the next turn's monster summon list. Stored on
 * state.fight.next_intent so the renderer can show the player what's coming.
 * The Big Bad phase consumes this lineup directly rather than rolling fresh
 * — keeps the displayed intent honest.
 */
export function build_next_intent(state) {
  const big_bad = state.fight.big_bad;
  const pool    = get_monster_pool(get_tier_for_fight(state.run.fight_number))
    .filter(def => !state.fight.monster_excluded_ids.has(def.id));

  const monster_defs = [];
  for (let i = 0; i < big_bad.monsters_per_turn; i++) {
    if (pool.length === 0) break;
    monster_defs.push(pick_random(pool));
  }

  state.fight.next_intent = {
    atk:       Math.max(0, big_bad.atk - state.turn.atk_weakened_next),
    monsters:  monster_defs,  // array of card defs (read-only references)
  };
}

function run_big_bad_phase(state) {
  state.turn.phase = 'BIG_BAD';
  _renderer.log_phase('-- Big Bad Phase --');
  _renderer.render();

  const big_bad = state.fight.big_bad;
  consume_atk_weaken(state);

  // Use the pre-rolled intent if available (Phase 1 telegraphing).
  // Falls back to a fresh roll if intent was never built (defensive — shouldn't
  // happen after fight setup, but keeps the engine forgiving).
  let monster_defs = state.fight.next_intent?.monsters;
  if (!monster_defs) {
    const monster_pool = get_monster_pool(get_tier_for_fight(state.run.fight_number))
      .filter(def => !state.fight.monster_excluded_ids.has(def.id));
    monster_defs = [];
    for (let i = 0; i < big_bad.monsters_per_turn; i++) {
      if (monster_pool.length === 0) break;
      monster_defs.push(pick_random(monster_pool));
    }
  }
  const drawn_monsters = monster_defs.map(def => create_card_instance(def));

  if (1 + big_bad.monsters_per_turn > MONSTER_SLOTS) {
    console.warn(
      `Big Bad '${big_bad.id}' monsters_per_turn (${big_bad.monsters_per_turn}) ` +
      `exceeds MONSTER_SLOTS-1 (${MONSTER_SLOTS - 1}). Extra cards truncated.`
    );
  }

  const all_monster_cards = shuffle_array([create_atk_card(big_bad), ...drawn_monsters])
    .slice(0, MONSTER_SLOTS);

  state.fight.monster_field = Array(MONSTER_SLOTS).fill(null);

  const available_slots = shuffle_array([...Array(MONSTER_SLOTS).keys()]);
  for (let i = 0; i < all_monster_cards.length; i++) {
    all_monster_cards[i].active   = true;
    all_monster_cards[i].resolved = false;
    state.fight.monster_field[available_slots[i]] = all_monster_cards[i];
  }

  state.fight.city_def       = get_city_initial_def(state.fight.city);
  state.fight.monster_shield = 0;

  setTimeout(() => {
    state.turn.phase = 'HEROES';
    _renderer.render();
  }, BIG_BAD_PHASE_DELAY_MS);
}

// -- Phase 3a -- Hero placement -------------------------------

export function on_hand_card_click(uid) {
  const state = App.game_state;
  if (!state || state.turn.phase !== 'HEROES') return;

  const hand_idx = state.run.hand.findIndex(c => c.uid === uid);
  if (hand_idx === -1) return;

  const card = state.run.hand[hand_idx];

  // Spells (Phase 6) resolve immediately from hand and don't take a field slot.
  if (card.type === 'spell') {
    state.run.hand.splice(hand_idx, 1);
    _renderer.log_entry(`Cast ${card.name}.`, 'log-effect');
    dispatch_effects(state, card, 'on_resolve', 0, 'H');
    // consume: removes the card from the run; otherwise it goes to discard.
    if (!card.consume) state.run.discard.push(card);
    else _renderer.log_entry(`${card.name}: consumed.`, 'log-effect');
    _renderer.clear_hand_selection();
    _renderer.render();
    if (check_fight_end(state)) return;
    return;
  }

  const empty_slot = state.fight.hero_field.findIndex(s => s === null);
  if (empty_slot === -1) { _renderer.flash_notification('No empty hero slots!'); return; }

  const placed_card = state.run.hand.splice(hand_idx, 1)[0];
  placed_card.active   = true;
  placed_card.resolved = false;
  state.fight.hero_field[empty_slot] = placed_card;
  dispatch_effects(state, placed_card, 'on_play', empty_slot, 'H');
  _renderer.clear_hand_selection();
  _renderer.render();
}

export function on_hero_slot_click(slot_index) {
  const state = App.game_state;
  if (!state || state.turn.phase !== 'HEROES') return;

  const card = state.fight.hero_field[slot_index];
  if (card) {
    card.active = false;
    state.run.hand.push(card);
    state.fight.hero_field[slot_index] = null;
    _renderer.render();
  }
}

/**
 * Automatically places every hand card into the first available hero slot.
 * Skips spell cards — those resolve from hand on click and have no body.
 */
export function quick_play_all() {
  const state = App.game_state;
  if (!state || state.turn.phase !== 'HEROES') return;
  _renderer.clear_hand_selection();

  for (let i = 0; i < state.fight.hero_field.length; i++) {
    if (state.fight.hero_field[i]) continue;
    // Find next non-spell hand card to place
    let next_idx = -1;
    for (let h = 0; h < state.run.hand.length; h++) {
      if (state.run.hand[h].type !== 'spell') { next_idx = h; break; }
    }
    if (next_idx === -1) break;
    const card = state.run.hand.splice(next_idx, 1)[0];
    card.active   = true;
    card.resolved = false;
    state.fight.hero_field[i] = card;
    dispatch_effects(state, card, 'on_play', i, 'H');
  }
  _renderer.render();
}

// -- Phase 3b -- Resolution -----------------------------------

function begin_resolution(state) {
  _renderer.clear_hand_selection();
  state.turn.phase           = 'RESOLVING';
  state.turn.resolving_step  = 0;
  state.turn.completed_slots = { H: new Set(), M: new Set() };

  state.turn.active_resolution_sequence = build_resolution_sequence(state);

  _renderer.log_phase('-- Resolution --');
  schedule_next_resolve_step(state);
}

/**
 * Builds the interleaved H/M step sequence for the current turn.
 * Heroes left→right, monsters right→left (so first hero/monster face spatially).
 */
function build_resolution_sequence(state) {
  const hero_slots    = [];
  const monster_slots = [];
  for (let i = 0; i < FIELD_SIZE_MAX; i++)        { if (state.fight.hero_field[i])    hero_slots.push(i); }
  for (let i = MONSTER_SLOTS - 1; i >= 0; i--)    { if (state.fight.monster_field[i]) monster_slots.push(i); }

  const seq = [];
  const len = Math.max(hero_slots.length, monster_slots.length);
  for (let i = 0; i < len; i++) {
    if (i < hero_slots.length)    seq.push({ side: 'H', slot: hero_slots[i] });
    if (i < monster_slots.length) seq.push({ side: 'M', slot: monster_slots[i] });
  }
  return seq;
}

function schedule_next_resolve_step(state) {
  if (App.resolution_timer) {
    clearTimeout(App.resolution_timer);
    App.resolution_timer = null;
  }
  App.resolution_timer = setTimeout(() => {
    if (state.turn.phase !== 'RESOLVING') return;
    run_resolve_step(state);
  }, RESOLVE_STEP_DELAY_MS);
}

function run_resolve_step(state) {
  try {
    clear_resolution_pips(state);
    inject_late_activated_cards(state);

    if (state.turn.resolving_step >= state.turn.active_resolution_sequence.length) {
      finish_resolution(state);
      return;
    }

    const { side, slot } = state.turn.active_resolution_sequence[state.turn.resolving_step];
    resolve_current_step(state, side, slot);

    state.turn.completed_slots[side].add(slot);

    if (check_fight_end(state)) return;

    const resolved_card = side === 'H'
      ? state.fight.hero_field[slot]
      : state.fight.monster_field[slot];
    if (resolved_card) {
      resolved_card.resolved = true;
      resolved_card.active   = false;
    }

    _renderer.render();
    state.turn.resolving_step++;
    schedule_next_resolve_step(state);
  } catch (err) {
    console.error('run_resolve_step error:', err);
    _renderer.log_entry(`ERROR: resolution halted — ${err.message}. Check console.`, 'log-phase');
    _renderer.render();
  }
}

function clear_resolution_pips(state) {
  for (const card of [...state.fight.hero_field, ...state.fight.monster_field]) {
    if (card) card.resolution_pips = [];
  }
}

/**
 * Scans the field for active cards in already-completed slots and injects
 * a new resolution step for each immediately after the current position.
 * Uses injected flag to prevent re-queuing.
 */
function inject_late_activated_cards(state) {
  const insert_at   = state.turn.resolving_step + 1;
  const pending_seq = state.turn.active_resolution_sequence.slice(insert_at);
  let   injected    = 0;

  for (let i = 0; i < FIELD_SIZE_MAX; i++) {
    const hero = state.fight.hero_field[i];
    if (
      hero && hero.active && !hero.injected &&
      state.turn.completed_slots.H.has(i) &&
      !pending_seq.some(s => s.side === 'H' && s.slot === i)
    ) {
      hero.injected = true;
      state.turn.active_resolution_sequence.splice(insert_at + injected, 0, { side: 'H', slot: i });
      injected++;
      _renderer.log_entry(`${hero.name} queued for late resolution (inserted after current step).`, 'log-effect');
    }
  }
  for (let i = 0; i < MONSTER_SLOTS; i++) {
    const monster = state.fight.monster_field[i];
    if (
      monster && monster.active && !monster.injected &&
      state.turn.completed_slots.M.has(i) &&
      !pending_seq.some(s => s.side === 'M' && s.slot === i)
    ) {
      monster.injected = true;
      state.turn.active_resolution_sequence.splice(insert_at + injected, 0, { side: 'M', slot: i });
      injected++;
      _renderer.log_entry(`${monster.name} queued for late resolution (inserted after current step).`, 'log-effect');
    }
  }
}

function resolve_current_step(state, side, slot) {
  if (side === 'H') {
    const card = state.fight.hero_field[slot];
    if (!card) return;
    if (card.active) resolve_hero_card(state, card, slot);
    else _renderer.log_entry(`${card.name} is inactive — skipped.`, 'log-effect');
  } else {
    const card = state.fight.monster_field[slot];
    if (!card) return;
    if (card.active) resolve_monster_card(state, card, slot);
    else _renderer.log_entry(`${card.name} is inactive — skipped.`, 'log-effect');
  }
}

// -- Hero card resolution -------------------------------------

function resolve_hero_card(state, card, slot_index) {
  const big_bad = state.fight.big_bad;

  dispatch_effects(state, card, 'on_resolve', slot_index, 'H');

  // Ally bonus (Phase 3): if any other ACTIVE field hero shares the named
  // role/faction, this card gains the listed stat bonuses. Applied additively
  // before the damage calc and the gold/morale/shield distribution below.
  apply_ally_bonus(state, card, slot_index);

  const effective_atk = card.atk + card.temp_atk_mod;
  card.temp_atk_mod = 0;

  if (effective_atk > 0) {
    // Pierce: ignores monster_shield entirely.
    const pierce             = has_keyword(card, 'pierce');
    const shield_absorbed    = pierce ? 0 : Math.min(state.fight.monster_shield, effective_atk);
    const post_shield        = effective_atk - shield_absorbed;
    if (!pierce) state.fight.monster_shield = Math.max(0, state.fight.monster_shield - shield_absorbed);
    // Big Bad weak/strong-against multiplier (Phase 3).
    const damage_dealt = apply_faction_multiplier(big_bad, card, post_shield);
    if (damage_dealt > 0) {
      big_bad.hp = Math.max(0, big_bad.hp - damage_dealt);
      const tags = [];
      if (pierce) tags.push('pierce');
      if (damage_dealt > post_shield) tags.push('weak!');
      if (damage_dealt < post_shield) tags.push('resisted');
      const tag_str = tags.length ? ` (${tags.join(', ')})` : '';
      _renderer.log_entry(`${card.name} deals ${damage_dealt} ${card.atk_type} dmg${tag_str} to ${big_bad.name}.`, 'log-hero');
      card.resolution_pips.push({ type: atk_type_from_role(card.atk_type), value: damage_dealt });
      // Lifesteal: heal city for damage dealt (post-shield).
      if (has_keyword(card, 'lifesteal')) {
        const healed = Math.min(state.fight.city.max_morale - state.fight.city_morale, damage_dealt);
        if (healed > 0) {
          state.fight.city_morale += healed;
          _renderer.log_entry(`${card.name}: lifesteal restores ${healed} Morale.`, 'log-morale');
          card.resolution_pips.push({ type: 'morale', value: healed });
        }
      }
    } else {
      _renderer.log_entry(`${card.name}: ATK fully absorbed by monster shield.`, 'log-hero');
      card.resolution_pips.push({ type: 'blocked', value: effective_atk });
    }
  }

  // Effective gold/shield/morale include ally bonuses computed earlier.
  const total_gold   = card.gold   + (card._ally_gold   ?? 0);
  const total_shield = card.shield + (card._ally_shield ?? 0);
  const total_morale = card.morale + (card._ally_morale ?? 0);
  card._ally_gold = card._ally_morale = card._ally_shield = 0;

  if (total_gold > 0) {
    state.fight.gold_pool += total_gold;
    _renderer.log_entry(`${card.name}: +${total_gold} Gold.`, 'log-hero');
    card.resolution_pips.push({ type: 'gold', value: total_gold });
  }

  if (total_shield > 0) {
    state.fight.city_def += total_shield;
    _renderer.log_entry(`${card.name}: +${total_shield} City defence.`, 'log-hero');
    card.resolution_pips.push({ type: 'shield', value: total_shield });
  }

  if (total_morale > 0) {
    state.fight.city_morale = Math.min(state.fight.city.max_morale, state.fight.city_morale + total_morale);
    _renderer.log_entry(`${card.name}: +${total_morale} Morale restored.`, 'log-morale');
    card.resolution_pips.push({ type: 'morale', value: total_morale });
  } else if (total_morale < 0) {
    state.fight.city_morale = Math.max(0, state.fight.city_morale + total_morale);
    _renderer.log_entry(`${card.name}: ${total_morale} Morale (self-inflicted).`, 'log-monster');
    card.resolution_pips.push({ type: 'morale-neg', value: total_morale });
  }
}

// -- Monster card resolution ----------------------------------

/**
 * Resolves a single monster card.
 * slot_index is accepted here (consistent with resolve_hero_card) so that
 * future spatial monster effects (opposite, adjacent) can be supported
 * without changing the call site.
 */
function resolve_monster_card(state, card, slot_index) {
  const effective_atk = card.atk + card.temp_atk_mod;

  if (effective_atk > 0) {
    // Taunt: an active hero in an opposite slot absorbs the monster's ATK
    // entirely. The hero's atk for this turn is forfeited (set inactive)
    // — the trade is "I block this hit; I don't get to attack."
    const taunt_target = find_taunt_blocker(state, slot_index);
    if (taunt_target) {
      taunt_target.card.active   = false;
      taunt_target.card.resolved = true;
      taunt_target.card.resolution_pips.push({ type: 'blocked', value: effective_atk });
      _renderer.log_entry(
        `${taunt_target.card.name} taunts and absorbs ${effective_atk} damage from ${card.name}!`,
        'log-effect',
      );
      card.resolution_pips.push({ type: 'blocked', value: effective_atk });
    } else {
      const defence_absorbed   = Math.min(state.fight.city_def, effective_atk);
      const damage_dealt       = effective_atk - defence_absorbed;
      state.fight.city_def     = Math.max(0, state.fight.city_def - defence_absorbed);
      if (damage_dealt > 0) {
        state.fight.city_morale = Math.max(0, state.fight.city_morale - damage_dealt);
        _renderer.log_entry(
          `${card.name} deals ${damage_dealt} damage to city.` +
          `${defence_absorbed > 0 ? ` (${defence_absorbed} blocked)` : ''}`,
          'log-monster'
        );
        card.resolution_pips.push({ type: atk_type_from_role(card.atk_type), value: damage_dealt });
      } else {
        _renderer.log_entry(`${card.name}: ATK fully absorbed by city defence.`, 'log-monster');
        card.resolution_pips.push({ type: 'blocked', value: effective_atk });
      }
    }
  }

  if (card.shield > 0) {
    state.fight.monster_shield += card.shield;
    _renderer.log_entry(`${card.name}: +${card.shield} monster shield.`, 'log-monster');
    card.resolution_pips.push({ type: 'shield', value: card.shield });
  }

  if (card.gold < 0) {
    const drain = Math.abs(card.gold);
    state.fight.gold_pool = Math.max(0, state.fight.gold_pool - drain);
    _renderer.log_entry(`${card.name}: -${drain} Gold drained.`, 'log-monster');
    card.resolution_pips.push({ type: 'drain', value: drain });
  }

  if (card.subtype !== 'atk') {
    dispatch_effects(state, card, 'on_resolve', slot_index, 'M');
  }

  card.temp_atk_mod = 0;
}

// -- Resolution end -------------------------------------------

function finish_resolution(state) {
  if (state.fight.fight_result) return;

  clear_resolution_pips(state);

  // Fire on_turn_end for any hero on the field — passive cards (lifesteal,
  // taunt holders) and end-of-turn riders depend on this hook.
  for (let i = 0; i < state.fight.hero_field.length; i++) {
    const card = state.fight.hero_field[i];
    if (!card) continue;
    dispatch_effects(state, card, 'on_turn_end', i, 'H');
  }
  // City + treasure end-of-turn hooks (e.g. Healer's Kit, Crown of Thorns).
  fire_city_hooks(state,     'on_turn_end');
  fire_treasure_hooks(state, 'on_turn_end');

  state.fight.hero_field.forEach((card, i) => {
    if (!card) return;
    card.active   = false;
    card.resolved = false;
    // Echo: return to hand instead of discard. Lets a card come back next
    // turn without waiting for a reshuffle. Echo cards are valuable enough
    // that the design is they cost more or have weaker stats; balance later.
    if (has_keyword(card, 'echo')) {
      state.run.hand.push(card);
    } else {
      state.run.discard.push(card);
    }
    state.fight.hero_field[i] = null;
  });

  state.run.discard.push(...state.run.hand);
  state.run.hand = [];

  state.fight.monster_field.fill(null);

  // city_def reset to 0 here is intentional and transient — run_big_bad_phase
  // restores it to get_city_initial_def() at the start of the next turn.
  state.fight.city_def       = 0;
  state.fight.monster_shield = 0;
  state.turn.phase           = 'RECRUIT';

  const bonus_gold = state.fight.city.bonus_gold_per_turn ?? 0;
  if (bonus_gold > 0) {
    state.fight.gold_pool += bonus_gold;
    _renderer.log_entry(`${state.fight.city.name}: +${bonus_gold} bonus Gold.`, 'log-effect');
  }

  // Roll the *next* turn's monster lineup so the player can plan their
  // recruit phase around it. Visible in the Big Bad Intent panel.
  build_next_intent(state);

  _renderer.render();
}

// -- Fight-end check ------------------------------------------

function check_fight_end(state) {
  if (state.fight.big_bad.hp <= 0)     { end_fight(state, 'won');  return true; }
  if (state.fight.city_morale <= 0)    { end_fight(state, 'lost'); return true; }
  return false;
}

// -- Phase 4 -- Recruit ---------------------------------------

export function on_market_card_click(uid) {
  const state = App.game_state;
  if (!state || state.turn.phase !== 'RECRUIT') return;

  const idx = state.fight.market.findIndex(c => c?.uid === uid);
  if (idx === -1) return;

  const card         = state.fight.market[idx];
  const recruit_cost = Math.max(1, get_card_cost(card, state.fight.city) - state.turn.cost_reduce_next);

  if (state.fight.gold_pool < recruit_cost) { _renderer.flash_notification('Not enough Gold!'); return; }

  state.fight.gold_pool       -= recruit_cost;
  state.turn.cost_reduce_next  = 0;
  state.fight.market[idx]      = null;
  // Charge: card goes to the top of the deck instead of discard, so it is
  // guaranteed in next turn's draw. Other cards take the standard path
  // (discard → reshuffle later).
  if (has_keyword(card, 'charge')) {
    state.run.deck.push(card);  // top of deck (last popped)
    _renderer.log_entry(`Recruited ${card.name} (cost ${recruit_cost}, Charge: top of deck).`, 'log-phase');
  } else {
    state.run.discard.push(card);
    _renderer.log_entry(`Recruited ${card.name} (cost ${recruit_cost}).`, 'log-phase');
  }
  dispatch_effects(state, card, 'on_recruit', 0, 'H');
  fire_city_hooks(state,     'on_recruit');
  fire_treasure_hooks(state, 'on_recruit');
  _renderer.render();
}

export function get_effective_market_size(state) {
  return Math.min(MARKET_ARRAY_SIZE, get_city_market_size(state.fight.city) + state.fight.market_unlocked_slots);
}

export function get_slot_unlock_cost(state) {
  if (get_effective_market_size(state) >= MARKET_ARRAY_SIZE) return null;
  return (state.fight.market_unlocked_slots + 1) * MARKET_SLOT_UNLOCK_BASE;
}

export function on_unlock_market_slot() {
  const state = App.game_state;
  if (!state || state.turn.phase !== 'RECRUIT') return;

  const cost = get_slot_unlock_cost(state);
  if (cost === null) return;
  if (state.fight.gold_pool < cost) { _renderer.flash_notification('Not enough Gold!'); return; }

  state.fight.gold_pool             -= cost;
  state.fight.market_unlocked_slots += 1;
  _renderer.log_entry(`Market slot unlocked (cost ${cost} Gold).`, 'log-phase');
  _renderer.render();
}

export function on_upgrade_market_click() {
  const state = App.game_state;
  if (!state || state.turn.phase !== 'RECRUIT') return;

  const target_level = state.fight.market_level + 1;
  if (target_level > MARKET_LEVEL_MAX) return;

  const cost = MARKET_UPGRADE_COSTS[target_level];
  if (cost === undefined) {
    console.warn(`on_upgrade_market_click: no cost defined for market level ${target_level}.`);
    return;
  }
  if (state.fight.gold_pool < cost) { _renderer.flash_notification('Not enough Gold!'); return; }

  state.fight.gold_pool    -= cost;
  state.fight.market_level  = target_level;
  _renderer.log_entry(`Market upgraded to Level ${target_level}! (cost ${cost} Gold)`, 'log-phase');
  _renderer.render();
}

/**
 * Forge cost (Phase 7) — ramps with each use this fight so the player
 * can't trivialise their deck by scrapping every starter. Returns null if
 * no valid scrap target remains (e.g. all starters already gone).
 */
export function get_forge_cost(state) {
  const targets = state.run.deck.concat(state.run.discard, state.run.hand)
    .filter(c => c.type === 'starter');
  if (targets.length === 0) return null;
  return FORGE_BASE_COST + state.fight.forge_uses * FORGE_STEP_COST;
}

/**
 * Use the Forge during the recruit phase. Removes one random Starter card
 * from the player's run pool (deck + discard + hand) and pays the cost.
 */
export function on_forge_click() {
  const state = App.game_state;
  if (!state || state.turn.phase !== 'RECRUIT') return;

  const cost = get_forge_cost(state);
  if (cost === null) {
    _renderer.flash_notification('No starters left to scrap.');
    return;
  }
  if (state.fight.gold_pool < cost) {
    _renderer.flash_notification('Not enough Gold!');
    return;
  }

  // Pick a random starter across all zones.
  const candidates = [];
  for (const c of state.run.deck)    if (c.type === 'starter') candidates.push({ zone: 'deck',    uid: c.uid, name: c.name });
  for (const c of state.run.discard) if (c.type === 'starter') candidates.push({ zone: 'discard', uid: c.uid, name: c.name });
  for (const c of state.run.hand)    if (c.type === 'starter') candidates.push({ zone: 'hand',    uid: c.uid, name: c.name });

  const chosen = pick_random(candidates);
  state.run.deck    = state.run.deck.filter(c => c.uid !== chosen.uid);
  state.run.discard = state.run.discard.filter(c => c.uid !== chosen.uid);
  state.run.hand    = state.run.hand.filter(c => c.uid !== chosen.uid);

  state.fight.gold_pool -= cost;
  state.fight.forge_uses += 1;
  // Persist the scrap so it survives rebuild_player_deck for the next fight.
  state.run.scrapped_starters = (state.run.scrapped_starters ?? 0) + 1;
  _renderer.log_entry(`Forge: ${chosen.name} scrapped from ${chosen.zone} (cost ${cost} Gold).`, 'log-phase');
  _renderer.render();
}

function end_recruit_phase(state) {
  refill_market(state);
  // cost_reduce_next safety reset — also zeroed in on_market_card_click on purchase.
  state.turn.cost_reduce_next = 0;
  state.turn.turn_number     += 1;
  run_draw_phase(state);
}

// ─────────────────────────────────────────────────────────────
// FIGHT END
// ─────────────────────────────────────────────────────────────

function end_fight(state, result) {
  if (App.resolution_timer) {
    clearTimeout(App.resolution_timer);
    App.resolution_timer = null;
  }
  state.fight.fight_result = result;
  state.turn.phase = 'FIGHT_END';
  _renderer.render();

  const big_bad = state.fight.big_bad;
  state.run.big_bads.push({ name: big_bad.name, result });

  setTimeout(() => {
    if (state.fight.fight_result === 'won') {
      _renderer.log_entry(big_bad.victory_message, 'log-win');
      if (state.run.fight_number >= FIGHTS_PER_RUN) {
        _renderer.show_summary_screen(state, true);
      } else if (should_show_event(state)) {
        _renderer.show_event_screen(state, pick_event());
      } else {
        _renderer.show_upgrade_screen(state);
      }
    } else {
      _renderer.log_entry(big_bad.defeat_message, 'log-lose');
      _renderer.show_summary_screen(state, false);
    }
  }, FIGHT_END_DELAY_MS);
}

// ─────────────────────────────────────────────────────────────
// UPGRADE
// ─────────────────────────────────────────────────────────────

export function apply_upgrade(state, chosen_card_def) {
  const promoted = create_card_instance(chosen_card_def);
  state.run.discard.push(promoted);
  _renderer.log_entry(`${chosen_card_def.name} added to the run deck.`, 'log-phase');
  advance_to_next_fight(state);
}

/**
 * Equip a treasure: persists across all remaining fights of this run.
 * Phase 5 — alternative reward path on the upgrade screen.
 */
export function apply_treasure(state, treasure_def) {
  state.run.treasures.push(treasure_def);
  _renderer.log_entry(`${treasure_def.name} added to your treasures.`, 'log-phase');
  advance_to_next_fight(state);
}

// ─────────────────────────────────────────────────────────────
// EVENTS (Phase 10)
// Between certain fights, show a 2-choice event. The choice's outcomes
// mutate run state immediately. Then proceed to the upgrade screen.
// ─────────────────────────────────────────────────────────────

/**
 * Returns true if an event should fire after the just-completed fight.
 * Currently: after fights 2 and 4 (a fixed cadence — predictable, not
 * random). The last fight (5) goes straight to summary.
 */
export function should_show_event(state) {
  const f = state.run.fight_number;
  return (f === 2 || f === 4) && f < FIGHTS_PER_RUN && (Registry.events?.length > 0);
}

/** Picks a random event from the registry. */
export function pick_event() {
  return pick_random(Registry.events ?? []);
}

/**
 * Apply a chosen event option's outcomes to run state. Each outcome is a
 * small action; see 01_data_events.js for the supported types.
 */
export function apply_event_choice(state, event_def, choice_index) {
  const choice = event_def.choices?.[choice_index];
  if (!choice) {
    console.warn(`apply_event_choice: invalid choice_index ${choice_index} for event '${event_def.id}'.`);
    _renderer.show_upgrade_screen(state);
    return;
  }
  _renderer.log_entry(`${event_def.title}: chose "${choice.label}".`, 'log-phase');
  for (const outcome of (choice.outcomes ?? [])) {
    apply_event_outcome(state, outcome);
  }
  // Event resolution flows into the upgrade screen — events sit BETWEEN
  // the win and the upgrade choice, not in place of it.
  _renderer.show_upgrade_screen(state);
}

function apply_event_outcome(state, outcome) {
  switch (outcome.type) {
    case 'add_card_to_deck': {
      const def = find_card_def_by_id(outcome.card_id);
      if (!def) { console.warn(`event: unknown card_id '${outcome.card_id}'.`); break; }
      // Push to permanent_extras so rebuild_player_deck reinjects this card
      // every fight (events grant *permanent* additions, not single-fight ones).
      state.run.permanent_extras.push(def);
      _renderer.log_entry(`Added ${def.name} to your deck.`, 'log-effect');
      break;
    }
    case 'add_curse': {
      const count = outcome.count ?? 1;
      const pool  = Registry.cards_curses ?? [];
      if (pool.length === 0) { console.warn('event: no curses registered.'); break; }
      for (let i = 0; i < count; i++) {
        const def = pick_random(pool);
        state.run.permanent_extras.push(def);
        _renderer.log_entry(`Added ${def.name} (Curse) to your deck.`, 'log-monster');
      }
      break;
    }
    case 'add_treasure': {
      const treasure_pool = Registry.treasures ?? [];
      let chosen;
      if (outcome.treasure_id === 'random') {
        const owned = new Set(state.run.treasures.map(t => t.id));
        const eligible = treasure_pool.filter(t => !owned.has(t.id));
        chosen = pick_random(eligible.length > 0 ? eligible : treasure_pool);
      } else {
        chosen = treasure_pool.find(t => t.id === outcome.treasure_id);
      }
      if (!chosen) { console.warn(`event: no treasure '${outcome.treasure_id}' available.`); break; }
      state.run.treasures.push(chosen);
      _renderer.log_entry(`Added treasure: ${chosen.name}.`, 'log-effect');
      break;
    }
    case 'gold': {
      // Stash a pending gold credit; consumed on next fight start.
      state.run.pending_gold = (state.run.pending_gold ?? 0) + outcome.amount;
      _renderer.log_entry(`+${outcome.amount} Gold (next fight).`, 'log-effect');
      break;
    }
    case 'max_morale': {
      // Persistent shift; applied to every subsequent fight's max_morale.
      state.run.max_morale_mod = (state.run.max_morale_mod ?? 0) + outcome.amount;
      _renderer.log_entry(`Max Morale ${outcome.amount >= 0 ? '+' : ''}${outcome.amount}.`, 'log-effect');
      break;
    }
    case 'scrap_random': {
      // Scrap permanently — pulls from current zones AND permanent_extras
      // so the card doesn't come back next fight via rebuild_player_deck.
      const target = outcome.target ?? 'starter';
      const matches_target = c =>
        target === 'starter' ? c.type === 'starter' : true;
      const pool = [...state.run.deck, ...state.run.discard, ...state.run.hand]
        .filter(matches_target);
      if (pool.length === 0) { _renderer.log_entry('Nothing to scrap.', 'log-effect'); break; }
      const scrapped = pick_random(pool);
      state.run.deck    = state.run.deck.filter(c => c.uid !== scrapped.uid);
      state.run.discard = state.run.discard.filter(c => c.uid !== scrapped.uid);
      state.run.hand    = state.run.hand.filter(c => c.uid !== scrapped.uid);
      // If the scrapped card was originally a permanent_extras grant, remove
      // its def from there so it doesn't respawn next fight. Otherwise if it
      // was a starter, bump the persistent scrap counter.
      const idx = (state.run.permanent_extras ?? []).findIndex(def => def.id === scrapped.id);
      if (idx !== -1) {
        state.run.permanent_extras.splice(idx, 1);
      } else if (scrapped.type === 'starter') {
        state.run.scrapped_starters = (state.run.scrapped_starters ?? 0) + 1;
      }
      _renderer.log_entry(`Scrapped ${scrapped.name}.`, 'log-effect');
      break;
    }
    default:
      console.warn(`apply_event_outcome: unknown outcome type '${outcome.type}'.`);
  }
}
