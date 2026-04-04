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
  MONSTER_SLOTS, FIGHTS_PER_RUN, DRAW_PHASE_DELAY_MS, RESOLVE_STEP_DELAY_MS,
  FIGHT_END_DELAY_MS, BIG_BAD_PHASE_DELAY_MS, MARKET_LEVEL_START,
  MARKET_LEVEL_MAX, MARKET_UPGRADE_COSTS, MARKET_SLOT_UNLOCK_BASE,
} from './00_core_constants.js';

import { App } from './00_core_app.js';

import {
  apply_hero_effect,
  apply_monster_effect,
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
    'show_summary_screen', 'show_screen',
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
    effects:         card_def.effects ? card_def.effects.map(e => ({ ...e })) : [],
    uid:             crypto.randomUUID(),
    active:          false,
    resolved:        false,
    injected:        false,
    corrupted:       false,
    temp_atk_mod:    0,
    resolution_pips: [],
  };
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

function advance_to_next_fight(state) {
  state.run.fight_number += 1;

  const big_bad_pool = get_big_bad_pool(state.run.fight_number);
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

  state.turn = init_turn_state();

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

  const fresh_deck      = Registry.cards_starter.map(def => create_card_instance(def));
  const starter_indices = fresh_deck.reduce((acc, c, i) => {
    if (c.type === 'starter') acc.push(i);
    return acc;
  }, []);

  for (const p of promoted) {
    if (starter_indices.length === 0) break;
    const pick          = Math.floor(Math.random() * starter_indices.length);
    const replace_index = starter_indices.splice(pick, 1)[0];
    const def           = find_card_def_by_id(p.id) ?? p;
    fresh_deck[replace_index] = create_card_instance(def);
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

/** Exported so engine_effects.js can receive it via init_effects_bridge. */
export function get_monster_pool(tier) {
  const getter = MONSTER_POOL_MAP[tier];
  if (!getter) {
    console.warn(`get_monster_pool: unexpected tier ${tier}, falling back to tier ${POOL_TIER_MAX}.`);
    return MONSTER_POOL_MAP[POOL_TIER_MAX]();
  }
  return getter();
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
  for (const pool of [Registry.cards_starter, Registry.cards_market, Registry.cards_upgrades]) {
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

function run_big_bad_phase(state) {
  state.turn.phase = 'BIG_BAD';
  _renderer.log_phase('-- Big Bad Phase --');
  _renderer.render();

  const big_bad = state.fight.big_bad;
  consume_atk_weaken(state);

  const monster_pool   = get_monster_pool(state.run.fight_number)
    .filter(def => !state.fight.monster_excluded_ids.has(def.id));
  const drawn_monsters = [];
  for (let i = 0; i < big_bad.monsters_per_turn; i++) {
    if (monster_pool.length === 0) break;
    drawn_monsters.push(create_card_instance(pick_random(monster_pool)));
  }

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

  const empty_slot = state.fight.hero_field.findIndex(s => s === null);
  if (empty_slot === -1) { _renderer.flash_notification('No empty hero slots!'); return; }

  const card = state.run.hand.splice(hand_idx, 1)[0];
  card.active   = true;
  card.resolved = false;
  state.fight.hero_field[empty_slot] = card;
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

/** Automatically places every hand card into the first available hero slot. */
export function quick_play_all() {
  const state = App.game_state;
  if (!state || state.turn.phase !== 'HEROES') return;
  _renderer.clear_hand_selection();

  for (let i = 0; i < state.fight.hero_field.length; i++) {
    if (state.fight.hero_field[i]) continue;
    if (state.run.hand.length === 0) break;
    const card = state.run.hand.shift();
    card.active   = true;
    card.resolved = false;
    state.fight.hero_field[i] = card;
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

  for (const effect of card.effects) {
    apply_hero_effect(state, effect, card, slot_index);
  }

  const effective_atk = card.atk + card.temp_atk_mod;
  card.temp_atk_mod = 0;

  if (effective_atk > 0) {
    const shield_absorbed    = Math.min(state.fight.monster_shield, effective_atk);
    const damage_dealt       = effective_atk - shield_absorbed;
    state.fight.monster_shield = Math.max(0, state.fight.monster_shield - shield_absorbed);
    if (damage_dealt > 0) {
      big_bad.hp = Math.max(0, big_bad.hp - damage_dealt);
      _renderer.log_entry(`${card.name} deals ${damage_dealt} ${card.atk_type} dmg to ${big_bad.name}.`, 'log-hero');
      card.resolution_pips.push({ type: atk_type_from_role(card.atk_type), value: damage_dealt });
    } else {
      _renderer.log_entry(`${card.name}: ATK fully absorbed by monster shield.`, 'log-hero');
      card.resolution_pips.push({ type: 'blocked', value: effective_atk });
    }
  }

  if (card.gold > 0) {
    state.fight.gold_pool += card.gold;
    _renderer.log_entry(`${card.name}: +${card.gold} Gold.`, 'log-hero');
    card.resolution_pips.push({ type: 'gold', value: card.gold });
  }

  if (card.shield > 0) {
    state.fight.city_def += card.shield;
    _renderer.log_entry(`${card.name}: +${card.shield} City defence.`, 'log-hero');
    card.resolution_pips.push({ type: 'shield', value: card.shield });
  }

  if (card.morale > 0) {
    state.fight.city_morale = Math.min(state.fight.city.max_morale, state.fight.city_morale + card.morale);
    _renderer.log_entry(`${card.name}: +${card.morale} Morale restored.`, 'log-morale');
    card.resolution_pips.push({ type: 'morale', value: card.morale });
  } else if (card.morale < 0) {
    state.fight.city_morale = Math.max(0, state.fight.city_morale + card.morale);
    _renderer.log_entry(`${card.name}: ${card.morale} Morale (self-inflicted).`, 'log-monster');
    card.resolution_pips.push({ type: 'morale-neg', value: card.morale });
  }
}

// -- Monster card resolution ----------------------------------

/**
 * Resolves a single monster card.
 * slot_index is accepted here (consistent with resolve_hero_card) so that
 * future spatial monster effects (opposite, adjacent) can be supported
 * without changing the call site.
 */
function resolve_monster_card(state, card, slot_index) {  // eslint-disable-line no-unused-vars
  const effective_atk = card.atk + card.temp_atk_mod;

  if (effective_atk > 0) {
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
    for (const effect of card.effects) {
      apply_monster_effect(state, effect, card, slot_index);
    }
  }

  card.temp_atk_mod = 0;
}

// -- Resolution end -------------------------------------------

function finish_resolution(state) {
  if (state.fight.fight_result) return;

  clear_resolution_pips(state);

  state.fight.hero_field.forEach((card, i) => {
    if (!card) return;
    card.active   = false;
    card.resolved = false;
    state.run.discard.push(card);
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
  state.run.discard.push(card);
  _renderer.log_entry(`Recruited ${card.name} (cost ${recruit_cost}).`, 'log-phase');
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
      if (state.run.fight_number < FIGHTS_PER_RUN) {
        _renderer.show_upgrade_screen(state);
      } else {
        _renderer.show_summary_screen(state, true);
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
