
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

const SIDE_HERO              = 'H';
const SIDE_MONSTER           = 'M';
const WEAK_AGAINST_MULTIPLIER   = 1.5;
const STRONG_AGAINST_MULTIPLIER = 0.5;
const MIN_HERO_RECRUIT_COST     = 1;
const MIN_MARKET_RECRUIT_COST   = 1;
const MIN_CITY_MORALE_AFTER_MOD = 1;
const STEP_INDEX_BEFORE_FIRST   = -1;
const NO_CARDS_IN_POOL          = 0;
const POOL_TIER_MAX             = 3;
const DEFAULT_TIER_FALLBACK     = 3;
const FIGHT_NUMBER_EVENT_FIRST  = 2;
const FIGHT_NUMBER_EVENT_SECOND = 4;
const DEFAULT_CURSE_COUNT       = 1;

let _renderer = null;

export function init_engine(renderer_fns) {
  const REQUIRED_RENDERER_NAMES = [
    'render', 'log_entry', 'log_phase', 'flash_notification',
    'clear_hand_selection', 'show_prefight_screen', 'show_upgrade_screen',
    'show_summary_screen', 'show_event_screen', 'show_screen',
  ];
  const missing_renderer_names = REQUIRED_RENDERER_NAMES.filter(
    renderer_name => typeof renderer_fns[renderer_name] !== 'function'
  );
  if (missing_renderer_names.length > 0) {
    throw new Error(
      `init_engine: missing renderer functions: ${missing_renderer_names.join(', ')}. ` +
      `Ensure startup_validator.js calls init_engine() with all required fns.`
    );
  }
  _renderer = Object.freeze({ ...renderer_fns });

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

export function shuffle_array(source_array) {
  const shuffled_copy = [...source_array];
  for (let last_index = shuffled_copy.length - 1; last_index > 0; last_index--) {
    const swap_index = Math.floor(Math.random() * (last_index + 1));
    [shuffled_copy[last_index], shuffled_copy[swap_index]] = [shuffled_copy[swap_index], shuffled_copy[last_index]];
  }
  return shuffled_copy;
}

export function pick_random(source_array) {
  if (!source_array?.length) return null;
  return source_array[Math.floor(Math.random() * source_array.length)];
}

function atk_type_from_role(role) {
  return role === 'magical' ? 'atk-magical' : 'atk-physical';
}

export function find_taunt_blocker(state, monster_slot) {
  const candidate_slot_indices = [monster_slot, monster_slot + 1]
    .filter(slot_index => slot_index >= 0 && slot_index < FIELD_SIZE_MAX);
  for (const slot_index of candidate_slot_indices) {
    const candidate_card = state.fight.hero_field[slot_index];
    if (candidate_card && candidate_card.active && has_keyword(candidate_card, 'taunt')) {
      return { card: candidate_card, slot: slot_index };
    }
  }
  return null;
}

export function get_adjacent_cards(state, side, slot) {
  const target_field = side === SIDE_HERO ? state.fight.hero_field : state.fight.monster_field;
  return [slot - 1, slot + 1]
    .filter(adjacent_index => adjacent_index >= 0 && adjacent_index < target_field.length)
    .map(adjacent_index => target_field[adjacent_index])
    .filter(Boolean);
}

export function get_opposite_cards(state, side, slot) {
  if (side === SIDE_HERO) {
    return [slot - 1, slot]
      .filter(opposite_index => opposite_index >= 0 && opposite_index < MONSTER_SLOTS)
      .map(opposite_index => state.fight.monster_field[opposite_index])
      .filter(Boolean);
  }
  return [slot, slot + 1]
    .filter(opposite_index => opposite_index >= 0 && opposite_index < FIELD_SIZE_MAX)
    .map(opposite_index => state.fight.hero_field[opposite_index])
    .filter(Boolean);
}

export function create_card_instance(card_def) {
  return {
    ...card_def,
    effects:         card_def.effects  ? card_def.effects.map(effect_def => ({ ...effect_def })) : [],
    keywords:        card_def.keywords ? [...card_def.keywords]                                  : [],
    uid:             crypto.randomUUID(),
    active:          false,
    resolved:        false,
    injected:        false,
    corrupted:       false,
    temp_atk_mod:    0,
    resolution_pips: [],
  };
}

export function has_keyword(card, keyword) {
  return !!(card?.keywords?.includes(keyword));
}

export function apply_ally_bonus(state, card, slot_index) {
  const ally_bonus = card.ally_bonus;
  if (!ally_bonus?.faction) return;
  const has_matching_ally = state.fight.hero_field.some(
    (other_card, other_index) =>
      other_card && other_card.uid !== card.uid && other_card.role === ally_bonus.faction
  );
  if (!has_matching_ally) return;

  if (ally_bonus.atk)    card.temp_atk_mod += ally_bonus.atk;
  if (ally_bonus.gold)   card._ally_gold    = (card._ally_gold   ?? 0) + ally_bonus.gold;
  if (ally_bonus.morale) card._ally_morale  = (card._ally_morale ?? 0) + ally_bonus.morale;
  if (ally_bonus.shield) card._ally_shield  = (card._ally_shield ?? 0) + ally_bonus.shield;
  _renderer.log_entry(`${card.name}: ally bonus from a fellow ${ally_bonus.faction}!`, 'log-effect');
}

export function apply_faction_multiplier(big_bad, card, base_damage) {
  if (base_damage <= 0) return 0;
  if (big_bad.weak_against   === card.role) return Math.ceil(base_damage  * WEAK_AGAINST_MULTIPLIER);
  if (big_bad.strong_against === card.role) return Math.floor(base_damage * STRONG_AGAINST_MULTIPLIER);
  return base_damage;
}

function create_big_bad_instance(big_bad_def) {
  return { ...big_bad_def, hp: big_bad_def.max_hp, atk_weakened: 0 };
}

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

function init_run_state() {
  return {
    fight_number: 0,
    big_bads:     [],

    deck:         [],
    hand:         [],
    discard:      [],

    treasures:    [],

    permanent_extras: [],

    scrapped_starters: 0,
  };
}

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
    market:                null,
    fight_result:          null,

    next_intent:           null,

    forge_uses:            0,
  };
}

function init_turn_state() {
  return {
    phase:                      'DRAW',
    turn_number:                0,
    atk_weakened_next:          0,
    cost_reduce_next:           0,
    resolving_step:             STEP_INDEX_BEFORE_FIRST,
    completed_slots:            { [SIDE_HERO]: new Set(), [SIDE_MONSTER]: new Set() },
    active_resolution_sequence: [],
  };
}

export function start_new_run() {
  if (App.resolution_timer) {
    clearTimeout(App.resolution_timer);
    App.resolution_timer = null;
  }
  _renderer.clear_hand_selection();

  App.game_state = {
    run:   init_run_state(),
    fight: null,
    turn:  null,
  };
  advance_to_next_fight(App.game_state);
}

function get_tier_for_fight(fight_number) {
  const tier_index = fight_number - 1;
  const last_tier  = FIGHT_TIER_SEQUENCE[FIGHT_TIER_SEQUENCE.length - 1];
  return FIGHT_TIER_SEQUENCE[tier_index] ?? last_tier;
}

function advance_to_next_fight(state) {
  state.run.fight_number += 1;

  const fight_tier   = get_tier_for_fight(state.run.fight_number);
  const big_bad_pool = get_big_bad_pool(fight_tier);
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

  if (state.run.pending_gold) {
    state.fight.gold_pool += state.run.pending_gold;
    state.run.pending_gold = 0;
  }
  if (state.run.max_morale_mod) {
    state.fight.city_morale = Math.max(MIN_CITY_MORALE_AFTER_MOD, state.fight.city_morale + state.run.max_morale_mod);
  }

  state.turn = init_turn_state();

  build_next_intent(state);

  _renderer.show_prefight_screen(state);
}

function rebuild_player_deck(state) {
  const run             = state.run;
  const all_zone_cards  = [...run.deck, ...run.hand, ...run.discard];
  const promoted_cards  = all_zone_cards.filter(zone_card => zone_card.type === 'promoted');

  const fresh_deck = Registry.cards_starter.map(starter_def => create_card_instance(starter_def));

  let starters_to_scrap = run.scrapped_starters ?? 0;
  while (starters_to_scrap > 0) {
    const starter_index = fresh_deck.findIndex(deck_card => deck_card.type === 'starter');
    if (starter_index === -1) break;
    fresh_deck.splice(starter_index, 1);
    starters_to_scrap--;
  }

  const starter_indices = fresh_deck.reduce((indices, deck_card, deck_index) => {
    if (deck_card.type === 'starter') indices.push(deck_index);
    return indices;
  }, []);

  for (const promoted_card of promoted_cards) {
    if (starter_indices.length === 0) break;
    const pick_offset           = Math.floor(Math.random() * starter_indices.length);
    const replacement_index     = starter_indices.splice(pick_offset, 1)[0];
    const promoted_card_def     = find_card_def_by_id(promoted_card.id) ?? promoted_card;
    fresh_deck[replacement_index] = create_card_instance(promoted_card_def);
  }

  for (const extra_card_def of (run.permanent_extras ?? [])) {
    if (extra_card_def.type === 'curse') {
      fresh_deck.push(create_card_instance(extra_card_def));
    } else if (starter_indices.length > 0) {
      const pick_offset       = Math.floor(Math.random() * starter_indices.length);
      const replacement_index = starter_indices.splice(pick_offset, 1)[0];
      fresh_deck[replacement_index] = create_card_instance(extra_card_def);
    } else {
      fresh_deck.push(create_card_instance(extra_card_def));
    }
  }

  run.deck    = shuffle_array(fresh_deck);
  run.hand    = [];
  run.discard = [];
}

function reset_turn_state(state) {

  const previous_turn_number = state.turn ? state.turn.turn_number : 0;
  state.turn = init_turn_state();
  state.turn.turn_number = previous_turn_number;
}

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

function get_big_bad_pool(tier) {
  const pool_getter = BIG_BAD_POOL_MAP[tier];
  if (!pool_getter) {
    console.warn(`get_big_bad_pool: unexpected tier ${tier}, falling back to tier ${POOL_TIER_MAX}.`);
    return BIG_BAD_POOL_MAP[POOL_TIER_MAX]();
  }
  return pool_getter();
}

export function get_monster_pool(tier) {
  const pool_getter = MONSTER_POOL_MAP[tier];
  if (!pool_getter) {
    console.warn(`get_monster_pool: unexpected tier ${tier}, falling back to tier ${POOL_TIER_MAX}.`);
    return MONSTER_POOL_MAP[POOL_TIER_MAX]();
  }
  const full_pool        = pool_getter();
  const current_big_bad  = App.game_state?.fight?.big_bad;
  const monster_tribes   = current_big_bad?.monster_tribes;
  if (!monster_tribes?.length) return full_pool;
  const tribe_filtered_pool = full_pool.filter(monster_def => monster_tribes.includes(monster_def.tribe));

  return tribe_filtered_pool.length > 0 ? tribe_filtered_pool : full_pool;
}

export function get_city_market_size(city) {
  return city.market_size ?? MARKET_SIZE_DEFAULT;
}

export function get_city_initial_def(city) {
  return city.starting_def ?? 0;
}

export function find_card_def_by_id(card_id) {
  for (const card_pool of [
    Registry.cards_starter,
    Registry.cards_market,
    Registry.cards_upgrades,
    Registry.cards_curses,
  ]) {
    if (!card_pool) continue;
    const found_card_def = card_pool.find(card_def => card_def.id === card_id);
    if (found_card_def) return found_card_def;
  }
  return null;
}

function get_available_market_pool(market_level) {
  return Registry.cards_market.filter(card_def => card_def.level <= market_level);
}

function fill_market(market_size, market_level) {
  const market_pool = get_available_market_pool(market_level);
  if (market_pool.length === NO_CARDS_IN_POOL) {
    console.warn(`fill_market: no cards available at market level ${market_level}.`);
    return Array(MARKET_ARRAY_SIZE).fill(null);
  }
  return Array.from({ length: MARKET_ARRAY_SIZE }, (_unused, market_slot_index) =>
    market_slot_index < market_size ? create_card_instance(pick_random(market_pool)) : null
  );
}

function refill_market(state) {
  const market_pool         = get_available_market_pool(state.fight.market_level);
  const effective_size      = get_effective_market_size(state);
  if (market_pool.length === NO_CARDS_IN_POOL) {
    console.warn(`refill_market: no cards available at market level ${state.fight.market_level}.`);
    return;
  }
  for (let market_slot_index = 0; market_slot_index < effective_size; market_slot_index++) {
    state.fight.market[market_slot_index] = create_card_instance(pick_random(market_pool));
  }
  for (let market_slot_index = effective_size; market_slot_index < MARKET_ARRAY_SIZE; market_slot_index++) {
    state.fight.market[market_slot_index] = null;
  }
}

export function get_card_cost(card, city) {
  let final_cost = card.cost;
  if (card.type === 'hero') {
    final_cost = Math.max(MIN_HERO_RECRUIT_COST, final_cost - (city.hero_cost_discount ?? 0));
  } else {
    final_cost = Math.max(0, final_cost);
  }
  return final_cost;
}

export function begin_fight() {
  _renderer.show_screen('screen-fight');

  fire_city_hooks(App.game_state,     'start_of_fight');
  fire_treasure_hooks(App.game_state, 'start_of_fight');
  run_draw_phase(App.game_state);
}

export function on_phase_btn() {
  const state = App.game_state;
  if (!state) return;
  if      (state.turn.phase === 'HEROES')  begin_resolution(state);
  else if (state.turn.phase === 'RECRUIT') end_recruit_phase(state);
  else console.warn(`on_phase_btn: called during unexpected phase '${state.turn.phase}'.`);
}

function run_draw_phase(state) {
  reset_turn_state(state);
  state.turn.phase = 'DRAW';
  _renderer.log_phase('Draw Phase');
  _renderer.render();
  setTimeout(() => {

    fire_city_hooks(state,    'start_of_turn');
    fire_treasure_hooks(state, 'start_of_turn');
    draw_cards(state, HAND_SIZE);
    _renderer.render();
    run_big_bad_phase(state);
  }, DRAW_PHASE_DELAY_MS);
}

function draw_cards(state, draw_count) {
  const run = state.run;
  for (let cards_drawn = 0; cards_drawn < draw_count; cards_drawn++) {
    if (run.deck.length === 0) {
      if (run.discard.length === 0) {
        console.warn(`draw_cards: deck and discard both empty after ${cards_drawn} of ${draw_count} draws.`);
        break;
      }
      run.deck    = shuffle_array(run.discard);
      run.discard = [];
      _renderer.log_entry('Deck reshuffled from discard.', 'log-phase');
    }
    run.hand.push(run.deck.pop());
  }
}

function consume_atk_weaken(state) {
  state.fight.big_bad.atk_weakened = state.turn.atk_weakened_next;
  state.turn.atk_weakened_next     = 0;
}

export function fire_city_hooks(state, hook) {
  const city_passives = state.fight?.city?.passives;
  if (!city_passives?.length) return;
  for (const passive of city_passives) {
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

export function fire_treasure_hooks(state, hook) {
  const owned_treasures = state.run.treasures ?? [];
  if (owned_treasures.length === 0) return;
  for (const treasure of owned_treasures) {
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

    apply_hero_effect(state, treasure.effect, synthetic_source, 0);
  }
}

export function build_next_intent(state) {
  const big_bad = state.fight.big_bad;
  const monster_pool = get_monster_pool(get_tier_for_fight(state.run.fight_number))
    .filter(monster_def => !state.fight.monster_excluded_ids.has(monster_def.id));

  const planned_monster_defs = [];
  for (let monster_index = 0; monster_index < big_bad.monsters_per_turn; monster_index++) {
    if (monster_pool.length === 0) break;
    planned_monster_defs.push(pick_random(monster_pool));
  }

  state.fight.next_intent = {
    atk:       Math.max(0, big_bad.atk - state.turn.atk_weakened_next),
    monsters:  planned_monster_defs,
  };
}

function run_big_bad_phase(state) {
  state.turn.phase = 'BIG_BAD';
  _renderer.log_phase('Big Bad Phase');
  _renderer.render();

  const big_bad = state.fight.big_bad;
  consume_atk_weaken(state);

  let monster_defs = state.fight.next_intent?.monsters;
  if (!monster_defs) {
    const monster_pool = get_monster_pool(get_tier_for_fight(state.run.fight_number))
      .filter(monster_def => !state.fight.monster_excluded_ids.has(monster_def.id));
    monster_defs = [];
    for (let monster_index = 0; monster_index < big_bad.monsters_per_turn; monster_index++) {
      if (monster_pool.length === 0) break;
      monster_defs.push(pick_random(monster_pool));
    }
  }
  const drawn_monsters = monster_defs.map(monster_def => create_card_instance(monster_def));

  if (1 + big_bad.monsters_per_turn > MONSTER_SLOTS) {
    console.warn(
      `Big Bad '${big_bad.id}' monsters_per_turn (${big_bad.monsters_per_turn}) ` +
      `exceeds MONSTER_SLOTS-1 (${MONSTER_SLOTS - 1}). Extra cards truncated.`
    );
  }

  const all_monster_cards = shuffle_array([create_atk_card(big_bad), ...drawn_monsters])
    .slice(0, MONSTER_SLOTS);

  state.fight.monster_field = Array(MONSTER_SLOTS).fill(null);

  const shuffled_slot_indices = shuffle_array([...Array(MONSTER_SLOTS).keys()]);
  for (let placement_index = 0; placement_index < all_monster_cards.length; placement_index++) {
    all_monster_cards[placement_index].active   = true;
    all_monster_cards[placement_index].resolved = false;
    state.fight.monster_field[shuffled_slot_indices[placement_index]] = all_monster_cards[placement_index];
  }

  state.fight.city_def       = get_city_initial_def(state.fight.city);
  state.fight.monster_shield = 0;

  setTimeout(() => {
    state.turn.phase = 'HEROES';
    _renderer.render();
  }, BIG_BAD_PHASE_DELAY_MS);
}

export function on_hand_card_click(uid) {
  const state = App.game_state;
  if (!state || state.turn.phase !== 'HEROES') return;

  const hand_card_index = state.run.hand.findIndex(hand_card => hand_card.uid === uid);
  if (hand_card_index === -1) return;

  const clicked_card = state.run.hand[hand_card_index];

  if (clicked_card.type === 'spell') {
    state.run.hand.splice(hand_card_index, 1);
    _renderer.log_entry(`Cast ${clicked_card.name}.`, 'log-effect');
    dispatch_effects(state, clicked_card, 'on_resolve', 0, SIDE_HERO);

    if (!clicked_card.consume) state.run.discard.push(clicked_card);
    else _renderer.log_entry(`${clicked_card.name}: consumed.`, 'log-effect');
    _renderer.clear_hand_selection();
    _renderer.render();
    if (check_fight_end(state)) return;
    return;
  }

  const empty_slot_index = state.fight.hero_field.findIndex(field_slot => field_slot === null);
  if (empty_slot_index === -1) { _renderer.flash_notification('No empty hero slots!'); return; }

  const placed_card = state.run.hand.splice(hand_card_index, 1)[0];
  placed_card.active   = true;
  placed_card.resolved = false;
  state.fight.hero_field[empty_slot_index] = placed_card;
  dispatch_effects(state, placed_card, 'on_play', empty_slot_index, SIDE_HERO);
  _renderer.clear_hand_selection();
  _renderer.render();
}

export function on_hero_slot_click(slot_index) {
  const state = App.game_state;
  if (!state || state.turn.phase !== 'HEROES') return;

  const slot_card = state.fight.hero_field[slot_index];
  if (slot_card) {
    slot_card.active = false;
    state.run.hand.push(slot_card);
    state.fight.hero_field[slot_index] = null;
    _renderer.render();
  }
}

export function quick_play_all() {
  const state = App.game_state;
  if (!state || state.turn.phase !== 'HEROES') return;
  _renderer.clear_hand_selection();

  for (let field_slot_index = 0; field_slot_index < state.fight.hero_field.length; field_slot_index++) {
    if (state.fight.hero_field[field_slot_index]) continue;

    let next_hand_index = -1;
    for (let hand_index = 0; hand_index < state.run.hand.length; hand_index++) {
      if (state.run.hand[hand_index].type !== 'spell') { next_hand_index = hand_index; break; }
    }
    if (next_hand_index === -1) break;
    const played_card = state.run.hand.splice(next_hand_index, 1)[0];
    played_card.active   = true;
    played_card.resolved = false;
    state.fight.hero_field[field_slot_index] = played_card;
    dispatch_effects(state, played_card, 'on_play', field_slot_index, SIDE_HERO);
  }
  _renderer.render();
}

function begin_resolution(state) {
  _renderer.clear_hand_selection();
  state.turn.phase           = 'RESOLVING';
  state.turn.resolving_step  = 0;
  state.turn.completed_slots = { [SIDE_HERO]: new Set(), [SIDE_MONSTER]: new Set() };

  state.turn.active_resolution_sequence = build_resolution_sequence(state);

  _renderer.log_phase('Resolution');
  schedule_next_resolve_step(state);
}

function build_resolution_sequence(state) {
  const hero_slot_indices    = [];
  const monster_slot_indices = [];
  for (let hero_slot_index = 0; hero_slot_index < FIELD_SIZE_MAX; hero_slot_index++) {
    if (state.fight.hero_field[hero_slot_index]) hero_slot_indices.push(hero_slot_index);
  }
  for (let monster_slot_index = MONSTER_SLOTS - 1; monster_slot_index >= 0; monster_slot_index--) {
    if (state.fight.monster_field[monster_slot_index]) monster_slot_indices.push(monster_slot_index);
  }

  const resolution_sequence = [];
  const interleave_length   = Math.max(hero_slot_indices.length, monster_slot_indices.length);
  for (let interleave_index = 0; interleave_index < interleave_length; interleave_index++) {
    if (interleave_index < hero_slot_indices.length)    resolution_sequence.push({ side: SIDE_HERO, slot: hero_slot_indices[interleave_index] });
    if (interleave_index < monster_slot_indices.length) resolution_sequence.push({ side: SIDE_MONSTER, slot: monster_slot_indices[interleave_index] });
  }
  return resolution_sequence;
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

    const resolved_card = side === SIDE_HERO
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
  for (const field_card of [...state.fight.hero_field, ...state.fight.monster_field]) {
    if (field_card) field_card.resolution_pips = [];
  }
}

function inject_late_activated_cards(state) {
  const insert_at_index   = state.turn.resolving_step + 1;
  const pending_sequence  = state.turn.active_resolution_sequence.slice(insert_at_index);
  let   injected_count    = 0;

  for (let hero_slot_index = 0; hero_slot_index < FIELD_SIZE_MAX; hero_slot_index++) {
    const hero_card = state.fight.hero_field[hero_slot_index];
    if (
      hero_card && hero_card.active && !hero_card.injected &&
      state.turn.completed_slots[SIDE_HERO].has(hero_slot_index) &&
      !pending_sequence.some(pending_step => pending_step.side === SIDE_HERO && pending_step.slot === hero_slot_index)
    ) {
      hero_card.injected = true;
      state.turn.active_resolution_sequence.splice(
        insert_at_index + injected_count, 0, { side: SIDE_HERO, slot: hero_slot_index }
      );
      injected_count++;
      _renderer.log_entry(`${hero_card.name} queued for late resolution (inserted after current step).`, 'log-effect');
    }
  }
  for (let monster_slot_index = 0; monster_slot_index < MONSTER_SLOTS; monster_slot_index++) {
    const monster_card = state.fight.monster_field[monster_slot_index];
    if (
      monster_card && monster_card.active && !monster_card.injected &&
      state.turn.completed_slots[SIDE_MONSTER].has(monster_slot_index) &&
      !pending_sequence.some(pending_step => pending_step.side === SIDE_MONSTER && pending_step.slot === monster_slot_index)
    ) {
      monster_card.injected = true;
      state.turn.active_resolution_sequence.splice(
        insert_at_index + injected_count, 0, { side: SIDE_MONSTER, slot: monster_slot_index }
      );
      injected_count++;
      _renderer.log_entry(`${monster_card.name} queued for late resolution (inserted after current step).`, 'log-effect');
    }
  }
}

function resolve_current_step(state, side, slot) {
  if (side === SIDE_HERO) {
    const hero_card = state.fight.hero_field[slot];
    if (!hero_card) return;
    if (hero_card.active) resolve_hero_card(state, hero_card, slot);
    else _renderer.log_entry(`${hero_card.name} is inactive — skipped.`, 'log-effect');
  } else {
    const monster_card = state.fight.monster_field[slot];
    if (!monster_card) return;
    if (monster_card.active) resolve_monster_card(state, monster_card, slot);
    else _renderer.log_entry(`${monster_card.name} is inactive — skipped.`, 'log-effect');
  }
}

function resolve_hero_card(state, card, slot_index) {
  const big_bad = state.fight.big_bad;

  dispatch_effects(state, card, 'on_resolve', slot_index, SIDE_HERO);

  apply_ally_bonus(state, card, slot_index);

  const effective_atk = card.atk + card.temp_atk_mod;
  card.temp_atk_mod = 0;

  if (effective_atk > 0) {

    const pierce             = has_keyword(card, 'pierce');
    const shield_absorbed    = pierce ? 0 : Math.min(state.fight.monster_shield, effective_atk);
    const post_shield_damage = effective_atk - shield_absorbed;
    if (!pierce) state.fight.monster_shield = Math.max(0, state.fight.monster_shield - shield_absorbed);

    const damage_dealt = apply_faction_multiplier(big_bad, card, post_shield_damage);
    if (damage_dealt > 0) {
      big_bad.hp = Math.max(0, big_bad.hp - damage_dealt);
      const damage_tags = [];
      if (pierce) damage_tags.push('pierce');
      if (damage_dealt > post_shield_damage) damage_tags.push('weak!');
      if (damage_dealt < post_shield_damage) damage_tags.push('resisted');
      const tag_suffix = damage_tags.length ? ` (${damage_tags.join(', ')})` : '';
      _renderer.log_entry(`${card.name} deals ${damage_dealt} ${card.atk_type} dmg${tag_suffix} to ${big_bad.name}.`, 'log-hero');
      card.resolution_pips.push({ type: atk_type_from_role(card.atk_type), value: damage_dealt });

      if (has_keyword(card, 'lifesteal')) {
        const morale_healed = Math.min(state.fight.city.max_morale - state.fight.city_morale, damage_dealt);
        if (morale_healed > 0) {
          state.fight.city_morale += morale_healed;
          _renderer.log_entry(`${card.name}: lifesteal restores ${morale_healed} Morale.`, 'log-morale');
          card.resolution_pips.push({ type: 'morale', value: morale_healed });
        }
      }
    } else {
      _renderer.log_entry(`${card.name}: ATK fully absorbed by monster shield.`, 'log-hero');
      card.resolution_pips.push({ type: 'blocked', value: effective_atk });
    }
  }

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

function resolve_monster_card(state, card, slot_index) {
  const effective_atk = card.atk + card.temp_atk_mod;

  if (effective_atk > 0) {

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
    const drain_amount = Math.abs(card.gold);
    state.fight.gold_pool = Math.max(0, state.fight.gold_pool - drain_amount);
    _renderer.log_entry(`${card.name}: -${drain_amount} Gold drained.`, 'log-monster');
    card.resolution_pips.push({ type: 'drain', value: drain_amount });
  }

  if (card.subtype !== 'atk') {
    dispatch_effects(state, card, 'on_resolve', slot_index, SIDE_MONSTER);
  }

  card.temp_atk_mod = 0;
}

function finish_resolution(state) {
  if (state.fight.fight_result) return;

  clear_resolution_pips(state);

  for (let hero_slot_index = 0; hero_slot_index < state.fight.hero_field.length; hero_slot_index++) {
    const hero_card = state.fight.hero_field[hero_slot_index];
    if (!hero_card) continue;
    dispatch_effects(state, hero_card, 'on_turn_end', hero_slot_index, SIDE_HERO);
  }

  fire_city_hooks(state,     'on_turn_end');
  fire_treasure_hooks(state, 'on_turn_end');

  state.fight.hero_field.forEach((field_card, field_slot_index) => {
    if (!field_card) return;
    field_card.active   = false;
    field_card.resolved = false;

    if (has_keyword(field_card, 'echo')) {
      state.run.hand.push(field_card);
    } else {
      state.run.discard.push(field_card);
    }
    state.fight.hero_field[field_slot_index] = null;
  });

  state.run.discard.push(...state.run.hand);
  state.run.hand = [];

  state.fight.monster_field.fill(null);

  state.fight.city_def       = 0;
  state.fight.monster_shield = 0;
  state.turn.phase           = 'RECRUIT';

  const bonus_gold = state.fight.city.bonus_gold_per_turn ?? 0;
  if (bonus_gold > 0) {
    state.fight.gold_pool += bonus_gold;
    _renderer.log_entry(`${state.fight.city.name}: +${bonus_gold} bonus Gold.`, 'log-effect');
  }

  build_next_intent(state);

  _renderer.render();
}

function check_fight_end(state) {
  if (state.fight.big_bad.hp <= 0)     { end_fight(state, 'won');  return true; }
  if (state.fight.city_morale <= 0)    { end_fight(state, 'lost'); return true; }
  return false;
}

export function on_market_card_click(uid) {
  const state = App.game_state;
  if (!state || state.turn.phase !== 'RECRUIT') return;

  const market_slot_index = state.fight.market.findIndex(market_card => market_card?.uid === uid);
  if (market_slot_index === -1) return;

  const market_card  = state.fight.market[market_slot_index];
  const recruit_cost = Math.max(
    MIN_MARKET_RECRUIT_COST,
    get_card_cost(market_card, state.fight.city) - state.turn.cost_reduce_next
  );

  if (state.fight.gold_pool < recruit_cost) { _renderer.flash_notification('Not enough Gold!'); return; }

  state.fight.gold_pool             -= recruit_cost;
  state.turn.cost_reduce_next        = 0;
  state.fight.market[market_slot_index] = null;

  if (has_keyword(market_card, 'charge')) {
    state.run.deck.push(market_card);
    _renderer.log_entry(`Recruited ${market_card.name} (cost ${recruit_cost}, Charge: top of deck).`, 'log-phase');
  } else {
    state.run.discard.push(market_card);
    _renderer.log_entry(`Recruited ${market_card.name} (cost ${recruit_cost}).`, 'log-phase');
  }
  dispatch_effects(state, market_card, 'on_recruit', 0, SIDE_HERO);
  fire_city_hooks(state,     'on_recruit');
  fire_treasure_hooks(state, 'on_recruit');
  _renderer.render();
}

export function get_effective_market_size(state) {
  return Math.min(
    MARKET_ARRAY_SIZE,
    get_city_market_size(state.fight.city) + state.fight.market_unlocked_slots
  );
}

export function get_slot_unlock_cost(state) {
  if (get_effective_market_size(state) >= MARKET_ARRAY_SIZE) return null;
  return (state.fight.market_unlocked_slots + 1) * MARKET_SLOT_UNLOCK_BASE;
}

export function on_unlock_market_slot() {
  const state = App.game_state;
  if (!state || state.turn.phase !== 'RECRUIT') return;

  const unlock_cost = get_slot_unlock_cost(state);
  if (unlock_cost === null) return;
  if (state.fight.gold_pool < unlock_cost) { _renderer.flash_notification('Not enough Gold!'); return; }

  state.fight.gold_pool             -= unlock_cost;
  state.fight.market_unlocked_slots += 1;
  _renderer.log_entry(`Market slot unlocked (cost ${unlock_cost} Gold).`, 'log-phase');
  _renderer.render();
}

export function on_upgrade_market_click() {
  const state = App.game_state;
  if (!state || state.turn.phase !== 'RECRUIT') return;

  const target_market_level = state.fight.market_level + 1;
  if (target_market_level > MARKET_LEVEL_MAX) return;

  const upgrade_cost = MARKET_UPGRADE_COSTS[target_market_level];
  if (upgrade_cost === undefined) {
    console.warn(`on_upgrade_market_click: no cost defined for market level ${target_market_level}.`);
    return;
  }
  if (state.fight.gold_pool < upgrade_cost) { _renderer.flash_notification('Not enough Gold!'); return; }

  state.fight.gold_pool    -= upgrade_cost;
  state.fight.market_level  = target_market_level;
  _renderer.log_entry(`Market upgraded to Level ${target_market_level}! (cost ${upgrade_cost} Gold)`, 'log-phase');
  _renderer.render();
}

export function get_forge_cost(state) {
  const scrappable_starters = state.run.deck.concat(state.run.discard, state.run.hand)
    .filter(any_zone_card => any_zone_card.type === 'starter');
  if (scrappable_starters.length === 0) return null;
  return FORGE_BASE_COST + state.fight.forge_uses * FORGE_STEP_COST;
}

export function on_forge_click() {
  const state = App.game_state;
  if (!state || state.turn.phase !== 'RECRUIT') return;

  const forge_cost = get_forge_cost(state);
  if (forge_cost === null) {
    _renderer.flash_notification('No starters left to scrap.');
    return;
  }
  if (state.fight.gold_pool < forge_cost) {
    _renderer.flash_notification('Not enough Gold!');
    return;
  }

  const scrap_candidates = [];
  for (const deck_card of state.run.deck) {
    if (deck_card.type === 'starter') scrap_candidates.push({ zone: 'deck', uid: deck_card.uid, name: deck_card.name });
  }
  for (const discard_card of state.run.discard) {
    if (discard_card.type === 'starter') scrap_candidates.push({ zone: 'discard', uid: discard_card.uid, name: discard_card.name });
  }
  for (const hand_card of state.run.hand) {
    if (hand_card.type === 'starter') scrap_candidates.push({ zone: 'hand', uid: hand_card.uid, name: hand_card.name });
  }

  const chosen_for_scrap = pick_random(scrap_candidates);
  state.run.deck    = state.run.deck.filter(deck_card    => deck_card.uid    !== chosen_for_scrap.uid);
  state.run.discard = state.run.discard.filter(discard_card => discard_card.uid !== chosen_for_scrap.uid);
  state.run.hand    = state.run.hand.filter(hand_card    => hand_card.uid    !== chosen_for_scrap.uid);

  state.fight.gold_pool -= forge_cost;
  state.fight.forge_uses += 1;

  state.run.scrapped_starters = (state.run.scrapped_starters ?? 0) + 1;
  _renderer.log_entry(
    `Forge: ${chosen_for_scrap.name} scrapped from ${chosen_for_scrap.zone} (cost ${forge_cost} Gold).`,
    'log-phase'
  );
  _renderer.render();
}

function end_recruit_phase(state) {
  refill_market(state);

  state.turn.cost_reduce_next = 0;
  state.turn.turn_number     += 1;
  run_draw_phase(state);
}

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

export function apply_upgrade(state, chosen_card_def) {
  const promoted_card = create_card_instance(chosen_card_def);
  state.run.discard.push(promoted_card);
  _renderer.log_entry(`${chosen_card_def.name} added to the run deck.`, 'log-phase');
  advance_to_next_fight(state);
}

export function apply_treasure(state, treasure_def) {
  state.run.treasures.push(treasure_def);
  _renderer.log_entry(`${treasure_def.name} added to your treasures.`, 'log-phase');
  advance_to_next_fight(state);
}

export function should_show_event(state) {
  const fight_number = state.run.fight_number;
  return (fight_number === FIGHT_NUMBER_EVENT_FIRST || fight_number === FIGHT_NUMBER_EVENT_SECOND)
    && fight_number < FIGHTS_PER_RUN
    && (Registry.events?.length > 0);
}

export function pick_event() {
  return pick_random(Registry.events ?? []);
}

export function apply_event_choice(state, event_def, choice_index) {
  const chosen_choice = event_def.choices?.[choice_index];
  if (!chosen_choice) {
    console.warn(`apply_event_choice: invalid choice_index ${choice_index} for event '${event_def.id}'.`);
    _renderer.show_upgrade_screen(state);
    return;
  }
  _renderer.log_entry(`${event_def.title}: chose "${chosen_choice.label}".`, 'log-phase');
  for (const outcome of (chosen_choice.outcomes ?? [])) {
    apply_event_outcome(state, outcome);
  }

  _renderer.show_upgrade_screen(state);
}

function apply_event_outcome(state, outcome) {
  switch (outcome.type) {
    case 'add_card_to_deck': {
      const added_card_def = find_card_def_by_id(outcome.card_id);
      if (!added_card_def) { console.warn(`event: unknown card_id '${outcome.card_id}'.`); break; }

      state.run.permanent_extras.push(added_card_def);
      _renderer.log_entry(`Added ${added_card_def.name} to your deck.`, 'log-effect');
      break;
    }
    case 'add_curse': {
      const curse_count = outcome.count ?? DEFAULT_CURSE_COUNT;
      const curse_pool  = Registry.cards_curses ?? [];
      if (curse_pool.length === 0) { console.warn('event: no curses registered.'); break; }
      for (let curse_index = 0; curse_index < curse_count; curse_index++) {
        const curse_def = pick_random(curse_pool);
        state.run.permanent_extras.push(curse_def);
        _renderer.log_entry(`Added ${curse_def.name} (Curse) to your deck.`, 'log-monster');
      }
      break;
    }
    case 'add_treasure': {
      const treasure_pool = Registry.treasures ?? [];
      let chosen_treasure;
      if (outcome.treasure_id === 'random') {
        const owned_treasure_ids = new Set(state.run.treasures.map(owned_treasure => owned_treasure.id));
        const unowned_treasures  = treasure_pool.filter(treasure => !owned_treasure_ids.has(treasure.id));
        chosen_treasure = pick_random(unowned_treasures.length > 0 ? unowned_treasures : treasure_pool);
      } else {
        chosen_treasure = treasure_pool.find(treasure => treasure.id === outcome.treasure_id);
      }
      if (!chosen_treasure) { console.warn(`event: no treasure '${outcome.treasure_id}' available.`); break; }
      state.run.treasures.push(chosen_treasure);
      _renderer.log_entry(`Added treasure: ${chosen_treasure.name}.`, 'log-effect');
      break;
    }
    case 'gold': {

      state.run.pending_gold = (state.run.pending_gold ?? 0) + outcome.amount;
      _renderer.log_entry(`+${outcome.amount} Gold (next fight).`, 'log-effect');
      break;
    }
    case 'max_morale': {

      state.run.max_morale_mod = (state.run.max_morale_mod ?? 0) + outcome.amount;
      _renderer.log_entry(`Max Morale ${outcome.amount >= 0 ? '+' : ''}${outcome.amount}.`, 'log-effect');
      break;
    }
    case 'scrap_random': {

      const scrap_target_type   = outcome.target ?? 'starter';
      const matches_scrap_target = candidate_card =>
        scrap_target_type === 'starter' ? candidate_card.type === 'starter' : true;
      const scrap_pool = [...state.run.deck, ...state.run.discard, ...state.run.hand]
        .filter(matches_scrap_target);
      if (scrap_pool.length === 0) { _renderer.log_entry('Nothing to scrap.', 'log-effect'); break; }
      const scrapped_card = pick_random(scrap_pool);
      state.run.deck    = state.run.deck.filter(deck_card => deck_card.uid !== scrapped_card.uid);
      state.run.discard = state.run.discard.filter(discard_card => discard_card.uid !== scrapped_card.uid);
      state.run.hand    = state.run.hand.filter(hand_card => hand_card.uid !== scrapped_card.uid);

      const extras_index = (state.run.permanent_extras ?? []).findIndex(extra_def => extra_def.id === scrapped_card.id);
      if (extras_index !== -1) {
        state.run.permanent_extras.splice(extras_index, 1);
      } else if (scrapped_card.type === 'starter') {
        state.run.scrapped_starters = (state.run.scrapped_starters ?? 0) + 1;
      }
      _renderer.log_entry(`Scrapped ${scrapped_card.name}.`, 'log-effect');
      break;
    }
    default:
      console.warn(`apply_event_outcome: unknown outcome type '${outcome.type}'.`);
  }
}
