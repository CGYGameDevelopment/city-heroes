
import { MONSTER_SLOTS } from './00_core_constants.js';

import {
  init_engine,
  find_card_def_by_id,

  start_new_run, begin_fight, on_phase_btn, quick_play_all,
  on_hand_card_click, on_hero_slot_click,
  on_market_card_click, on_unlock_market_slot, on_upgrade_market_click,
  on_forge_click,
  apply_upgrade, apply_treasure, apply_event_choice,

  get_effective_market_size, get_slot_unlock_cost, get_card_cost,
  get_forge_cost,
  create_card_instance, shuffle_array,
} from './02_sys_engine.js';

import {
  render, log_entry, log_phase, flash_notification,
  clear_hand_selection,
  show_prefight_screen, show_upgrade_screen, show_summary_screen, show_screen,
  show_event_screen,
  setupEventListeners,
} from './03_ui_renderer.js';

const BIG_BAD_AUTO_ATTACK_SLOTS = 1;
const MIN_POSITIVE_AMOUNT       = 1;

const VALID_CARD_TYPES       = new Set(['starter', 'hero', 'promoted', 'monster', 'spell', 'curse']);
const VALID_ATK_TYPES        = new Set(['none', 'physical', 'magical']);
const VALID_ROLES            = new Set(['physical', 'magical', 'tactical']);
const VALID_TRANSFORM_ZONES  = new Set(['field', 'hand', 'deck', 'discard']);
const VALID_TARGET_SIDES     = new Set(['hero', 'monster']);
const VALID_STUN_SELECTIONS  = new Set(['random', 'opposite']);
const VALID_SCRAP_TARGETS    = new Set(['starter', 'any_hand', 'any_discard']);
const VALID_FIELD_CONDITIONS = new Set(['adjacent_role_match', 'field_count_gte', 'per_role_match']);
const VALID_FIELD_STATS      = new Set(['atk', 'gold', 'shield', 'morale']);
const VALID_EFFECT_TYPES     = new Set([
  'transform', 'stun', 'recur', 'shield_drain',
  'weaken_atk', 'stat_mod_all', 'kill_monster', 'cleanse', 'kill',
  'haste', 'slow', 'stop',
  'draw', 'scrap', 'cost_reduce', 'field_bonus',
  'ally_bonus', 'combo_bonus', 'pierce',

  'gain_gold', 'gain_morale', 'gain_shield', 'damage', 'summon_ally',
]);
const VALID_TRIGGERS = new Set([
  'on_recruit', 'on_play', 'on_resolve', 'on_death', 'on_turn_end', 'passive',
]);
const VALID_KEYWORDS = new Set([
  'pierce',
  'lifesteal',
  'taunt',
  'charge',
  'echo',
]);

function validate_card_def(card_def, source_label) {
  const error_messages = [];
  const error_tag      = `[${source_label}] Card '${card_def.id ?? '(no id)'}':`;

  if (typeof card_def.id     !== 'string'  || card_def.id.trim()   === '') error_messages.push(`${error_tag} missing or empty 'id'.`);
  if (typeof card_def.name   !== 'string'  || card_def.name.trim() === '') error_messages.push(`${error_tag} missing or empty 'name'.`);
  if (!VALID_CARD_TYPES.has(card_def.type))                                  error_messages.push(`${error_tag} invalid type '${card_def.type}'.`);
  if (typeof card_def.cost   !== 'number')                                  error_messages.push(`${error_tag} 'cost' must be a number.`);
  if (typeof card_def.level  !== 'number' || card_def.level < 0)            error_messages.push(`${error_tag} 'level' must be a non-negative number.`);
  if (!VALID_ROLES.has(card_def.role))                                       error_messages.push(`${error_tag} invalid role '${card_def.role}'.`);
  if (typeof card_def.atk    !== 'number')                                  error_messages.push(`${error_tag} 'atk' must be a number.`);
  if (!VALID_ATK_TYPES.has(card_def.atk_type))                              error_messages.push(`${error_tag} invalid atk_type '${card_def.atk_type}'.`);
  if (typeof card_def.gold   !== 'number')                                  error_messages.push(`${error_tag} 'gold' must be a number.`);
  if (typeof card_def.morale !== 'number')                                  error_messages.push(`${error_tag} 'morale' must be a number.`);
  if (typeof card_def.shield !== 'number')                                  error_messages.push(`${error_tag} 'shield' must be a number.`);
  if (typeof card_def.desc   !== 'string')                                  error_messages.push(`${error_tag} 'desc' must be a string.`);
  if (typeof card_def.art    !== 'function')                                error_messages.push(`${error_tag} 'art' must be a function.`);

  if (card_def.keywords !== undefined) {
    if (!Array.isArray(card_def.keywords)) {
      error_messages.push(`${error_tag} 'keywords' must be an array if present.`);
    } else {
      const unknown_keywords = card_def.keywords.filter(keyword => !VALID_KEYWORDS.has(keyword));
      if (unknown_keywords.length) {
        error_messages.push(`${error_tag} unknown keyword(s): '${unknown_keywords.join("', '")}'.`);
      }
    }
  }

  if (card_def.ally_bonus !== undefined) {
    if (typeof card_def.ally_bonus !== 'object' || card_def.ally_bonus === null) {
      error_messages.push(`${error_tag} 'ally_bonus' must be an object if present.`);
    } else if (!VALID_ROLES.has(card_def.ally_bonus.faction)) {
      error_messages.push(`${error_tag} 'ally_bonus.faction' must be a valid role.`);
    }
  }

  if (!Array.isArray(card_def.effects)) {
    error_messages.push(`${error_tag} 'effects' must be an array.`);
  } else {
    card_def.effects.forEach((effect_def, effect_index) => {
      if (!VALID_EFFECT_TYPES.has(effect_def.type)) {
        error_messages.push(`${error_tag} effect[${effect_index}] unknown type '${effect_def.type}'.`);
      }
      if (effect_def.trigger !== undefined && !VALID_TRIGGERS.has(effect_def.trigger)) {
        error_messages.push(`${error_tag} effect[${effect_index}] invalid trigger '${effect_def.trigger}'.`);
      }
      if (effect_def.type === 'transform') {
        if (!Array.isArray(effect_def.zones) || effect_def.zones.length === 0) {
          error_messages.push(`${error_tag} effect[${effect_index}] (transform) missing non-empty 'zones' array.`);
        } else {
          const invalid_zones = effect_def.zones.filter(zone_name => !VALID_TRANSFORM_ZONES.has(zone_name));
          if (invalid_zones.length) {
            error_messages.push(`${error_tag} effect[${effect_index}] (transform) invalid zone(s): '${invalid_zones.join("', '")}'.`);
          }
        }
        if (typeof effect_def.replace_with !== 'string' || !effect_def.replace_with.trim()) {
          error_messages.push(`${error_tag} effect[${effect_index}] (transform) missing 'replace_with'.`);
        } else if (find_card_def_by_id(effect_def.replace_with) === null) {
          error_messages.push(`${error_tag} effect[${effect_index}] (transform) unknown 'replace_with' id '${effect_def.replace_with}'.`);
        }
      }
      if (effect_def.type === 'stun' && !VALID_STUN_SELECTIONS.has(effect_def.selection)) {
        error_messages.push(`${error_tag} effect[${effect_index}] (stun) invalid selection '${effect_def.selection}'.`);
      }
      if (['haste', 'slow', 'stop'].includes(effect_def.type) && !VALID_TARGET_SIDES.has(effect_def.target_side)) {
        error_messages.push(`${error_tag} effect[${effect_index}] (${effect_def.type}) invalid target_side '${effect_def.target_side}'.`);
      }
      if (effect_def.type === 'draw' && (typeof effect_def.amount !== 'number' || effect_def.amount < MIN_POSITIVE_AMOUNT)) {
        error_messages.push(`${error_tag} effect[${effect_index}] (draw) 'amount' must be a positive number.`);
      }
      if (effect_def.type === 'scrap' && !VALID_SCRAP_TARGETS.has(effect_def.target)) {
        error_messages.push(`${error_tag} effect[${effect_index}] (scrap) invalid target '${effect_def.target}'.`);
      }
      if (effect_def.type === 'cost_reduce' && (typeof effect_def.amount !== 'number' || effect_def.amount < MIN_POSITIVE_AMOUNT)) {
        error_messages.push(`${error_tag} effect[${effect_index}] (cost_reduce) 'amount' must be a positive number.`);
      }
      if (effect_def.type === 'field_bonus') {
        if (!VALID_FIELD_CONDITIONS.has(effect_def.condition)) error_messages.push(`${error_tag} effect[${effect_index}] (field_bonus) invalid condition '${effect_def.condition}'.`);
        if (!VALID_FIELD_STATS.has(effect_def.stat))           error_messages.push(`${error_tag} effect[${effect_index}] (field_bonus) invalid stat '${effect_def.stat}'.`);
        if (typeof effect_def.amount !== 'number')             error_messages.push(`${error_tag} effect[${effect_index}] (field_bonus) 'amount' must be a number.`);
      }
    });
  }
  return error_messages;
}

function validate_big_bad_def(big_bad_def, source_label) {
  const error_messages = [];
  const error_tag      = `[${source_label}] Big Bad '${big_bad_def.id ?? '(no id)'}':`;

  if (typeof big_bad_def.id                !== 'string' || !big_bad_def.id.trim())     error_messages.push(`${error_tag} missing 'id'.`);
  if (typeof big_bad_def.name              !== 'string' || !big_bad_def.name.trim())   error_messages.push(`${error_tag} missing 'name'.`);
  if (typeof big_bad_def.title             !== 'string')                                error_messages.push(`${error_tag} 'title' must be a string.`);
  if (typeof big_bad_def.tier              !== 'number')                                error_messages.push(`${error_tag} 'tier' must be a number.`);
  if (typeof big_bad_def.max_hp            !== 'number' || big_bad_def.max_hp <= 0)     error_messages.push(`${error_tag} 'max_hp' must be positive.`);
  if (typeof big_bad_def.atk               !== 'number')                                error_messages.push(`${error_tag} 'atk' must be a number.`);
  if (typeof big_bad_def.monsters_per_turn !== 'number')                                error_messages.push(`${error_tag} 'monsters_per_turn' must be a number.`);
  if (!VALID_ROLES.has(big_bad_def.role))                                                error_messages.push(`${error_tag} invalid role '${big_bad_def.role}'.`);
  if (typeof big_bad_def.level             !== 'number' || big_bad_def.level < 0)       error_messages.push(`${error_tag} 'level' must be non-negative.`);
  if (typeof big_bad_def.deck_desc         !== 'string')                                error_messages.push(`${error_tag} 'deck_desc' must be a string.`);
  if (typeof big_bad_def.victory_message   !== 'string')                                error_messages.push(`${error_tag} 'victory_message' must be a string.`);
  if (typeof big_bad_def.defeat_message    !== 'string')                                error_messages.push(`${error_tag} 'defeat_message' must be a string.`);
  if (BIG_BAD_AUTO_ATTACK_SLOTS + big_bad_def.monsters_per_turn > MONSTER_SLOTS) {
    error_messages.push(
      `${error_tag} monsters_per_turn (${big_bad_def.monsters_per_turn}) exceeds ` +
      `MONSTER_SLOTS-${BIG_BAD_AUTO_ATTACK_SLOTS} (${MONSTER_SLOTS - BIG_BAD_AUTO_ATTACK_SLOTS}).`
    );
  }
  if (big_bad_def.weak_against   !== undefined && !VALID_ROLES.has(big_bad_def.weak_against))   error_messages.push(`${error_tag} 'weak_against' must be a valid role.`);
  if (big_bad_def.strong_against !== undefined && !VALID_ROLES.has(big_bad_def.strong_against)) error_messages.push(`${error_tag} 'strong_against' must be a valid role.`);
  if (big_bad_def.monster_tribes !== undefined) {
    if (!Array.isArray(big_bad_def.monster_tribes) || big_bad_def.monster_tribes.length === 0) {
      error_messages.push(`${error_tag} 'monster_tribes' must be a non-empty array if present.`);
    }
  }
  return error_messages;
}

const VALID_TREASURE_HOOKS = new Set([
  'start_of_turn', 'start_of_fight', 'on_recruit', 'on_turn_end',
]);

function validate_treasure_def(treasure_def, source_label) {
  const error_messages = [];
  const error_tag      = `[${source_label}] Treasure '${treasure_def.id ?? '(no id)'}':`;

  if (typeof treasure_def.id     !== 'string' || !treasure_def.id.trim())   error_messages.push(`${error_tag} missing 'id'.`);
  if (typeof treasure_def.name   !== 'string' || !treasure_def.name.trim()) error_messages.push(`${error_tag} missing 'name'.`);
  if (typeof treasure_def.desc   !== 'string')                              error_messages.push(`${error_tag} 'desc' must be a string.`);
  if (!VALID_TREASURE_HOOKS.has(treasure_def.hook))                         error_messages.push(`${error_tag} invalid 'hook' value '${treasure_def.hook}'.`);
  if (typeof treasure_def.effect !== 'object' || treasure_def.effect === null) {
    error_messages.push(`${error_tag} 'effect' must be an object.`);
  } else if (!VALID_EFFECT_TYPES.has(treasure_def.effect.type)) {
    error_messages.push(`${error_tag} effect type '${treasure_def.effect.type}' not in VALID_EFFECT_TYPES.`);
  }
  return error_messages;
}

const VALID_EVENT_OUTCOMES = new Set([
  'add_card_to_deck', 'add_curse', 'add_treasure', 'gold', 'max_morale', 'scrap_random',
]);

function validate_event_def(event_def, source_label) {
  const error_messages = [];
  const error_tag      = `[${source_label}] Event '${event_def.id ?? '(no id)'}':`;
  if (typeof event_def.id    !== 'string' || !event_def.id.trim())    error_messages.push(`${error_tag} missing 'id'.`);
  if (typeof event_def.title !== 'string' || !event_def.title.trim()) error_messages.push(`${error_tag} missing 'title'.`);
  if (typeof event_def.desc  !== 'string')                            error_messages.push(`${error_tag} 'desc' must be a string.`);
  if (!Array.isArray(event_def.choices) || event_def.choices.length === 0) {
    error_messages.push(`${error_tag} 'choices' must be a non-empty array.`);
  } else {
    event_def.choices.forEach((choice, choice_index) => {
      if (typeof choice.label !== 'string') error_messages.push(`${error_tag} choice[${choice_index}] missing 'label'.`);
      if (typeof choice.desc  !== 'string') error_messages.push(`${error_tag} choice[${choice_index}] missing 'desc'.`);
      if (!Array.isArray(choice.outcomes)) {
        error_messages.push(`${error_tag} choice[${choice_index}] 'outcomes' must be an array.`);
      } else {
        choice.outcomes.forEach((outcome, outcome_index) => {
          if (!VALID_EVENT_OUTCOMES.has(outcome.type)) {
            error_messages.push(`${error_tag} choice[${choice_index}].outcomes[${outcome_index}] unknown type '${outcome.type}'.`);
          }
        });
      }
    });
  }
  return error_messages;
}

function validate_city_def(city_def, source_label) {
  const error_messages = [];
  const error_tag      = `[${source_label}] City '${city_def.id ?? '(no id)'}':`;

  if (typeof city_def.id                  !== 'string' || !city_def.id.trim())       error_messages.push(`${error_tag} missing 'id'.`);
  if (typeof city_def.name                !== 'string' || !city_def.name.trim())     error_messages.push(`${error_tag} missing 'name'.`);
  if (typeof city_def.type                !== 'string')                              error_messages.push(`${error_tag} 'type' must be a string.`);
  if (typeof city_def.max_morale          !== 'number' || city_def.max_morale <= 0)  error_messages.push(`${error_tag} 'max_morale' must be positive.`);
  if (typeof city_def.market_size         !== 'number')                              error_messages.push(`${error_tag} 'market_size' must be a number.`);
  if (typeof city_def.starting_def        !== 'number')                              error_messages.push(`${error_tag} 'starting_def' must be a number.`);
  if (typeof city_def.hero_cost_discount  !== 'number')                              error_messages.push(`${error_tag} 'hero_cost_discount' must be a number.`);
  if (typeof city_def.bonus_gold_per_turn !== 'number')                              error_messages.push(`${error_tag} 'bonus_gold_per_turn' must be a number.`);
  if (city_def.effects !== undefined && !Array.isArray(city_def.effects))            error_messages.push(`${error_tag} 'effects' must be an array.`);
  if (city_def.passives !== undefined) {
    if (!Array.isArray(city_def.passives)) {
      error_messages.push(`${error_tag} 'passives' must be an array if present.`);
    } else {
      city_def.passives.forEach((passive, passive_index) => {
        if (!VALID_TREASURE_HOOKS.has(passive.hook)) error_messages.push(`${error_tag} passive[${passive_index}] invalid hook '${passive.hook}'.`);
        if (!passive.effect || typeof passive.effect !== 'object') {
          error_messages.push(`${error_tag} passive[${passive_index}] missing 'effect' object.`);
        } else if (!VALID_EFFECT_TYPES.has(passive.effect.type)) {
          error_messages.push(`${error_tag} passive[${passive_index}] effect type '${passive.effect.type}' not in VALID_EFFECT_TYPES.`);
        }
      });
    }
  }
  return error_messages;
}

document.addEventListener('DOMContentLoaded', () => {

  Registry.lock();

  init_engine({
    render,
    log_entry,
    log_phase,
    flash_notification,
    clear_hand_selection,
    show_prefight_screen,
    show_upgrade_screen,
    show_summary_screen,
    show_event_screen,
    show_screen,
  });

  const startup_errors = [];

  const required_pool_keys = [
    'cards_starter', 'cards_market', 'cards_upgrades', 'cards_curses',
    'cards_monster_tier_1', 'cards_monster_tier_2', 'cards_monster_tier_3',
    'big_bads_tier_1', 'big_bads_tier_2', 'big_bads_tier_3',
    'cities', 'treasures',
  ];
  required_pool_keys
    .filter(pool_key => !Array.isArray(Registry[pool_key]))
    .forEach(pool_key => startup_errors.push(
      `Registry missing pool '${pool_key}' — check that the data file loaded before startup_validator.js.`
    ));

  if (typeof make_art_painter !== 'function') {
    startup_errors.push(`Global 'make_art_painter' not found — check that art.js loaded.`);
  }

  const card_pool_descriptors = [
    { key: 'cards_starter',        source: '01_data_cards_starter.js'          },
    { key: 'cards_market',         source: '01_data_cards_market.js'           },
    { key: 'cards_upgrades',       source: '01_data_cards_upgrades.js'         },
    { key: 'cards_curses',         source: '01_data_cards_curses.js'           },
    { key: 'cards_monster_tier_1', source: '01_data_cards_monster.js (tier 1)' },
    { key: 'cards_monster_tier_2', source: '01_data_cards_monster.js (tier 2)' },
    { key: 'cards_monster_tier_3', source: '01_data_cards_monster.js (tier 3)' },
  ];
  for (const { key: pool_key, source: source_label } of card_pool_descriptors) {
    if (!Array.isArray(Registry[pool_key])) continue;
    const card_defs = pool_key === 'cards_starter' ? [...new Set(Registry[pool_key])] : Registry[pool_key];
    for (const card_def of card_defs) startup_errors.push(...validate_card_def(card_def, source_label));
  }

  for (const { key: pool_key, source: source_label } of [
    { key: 'big_bads_tier_1', source: '01_data_enemies.js (tier 1)' },
    { key: 'big_bads_tier_2', source: '01_data_enemies.js (tier 2)' },
    { key: 'big_bads_tier_3', source: '01_data_enemies.js (tier 3)' },
  ]) {
    if (!Array.isArray(Registry[pool_key])) continue;
    for (const big_bad_def of Registry[pool_key]) startup_errors.push(...validate_big_bad_def(big_bad_def, source_label));
  }

  if (Array.isArray(Registry.cities)) {
    for (const city_def of Registry.cities) startup_errors.push(...validate_city_def(city_def, '01_data_levels.js'));
  }

  if (Array.isArray(Registry.treasures)) {
    for (const treasure_def of Registry.treasures) startup_errors.push(...validate_treasure_def(treasure_def, '01_data_treasures.js'));
  }

  if (Array.isArray(Registry.events)) {
    for (const event_def of Registry.events) startup_errors.push(...validate_event_def(event_def, '01_data_events.js'));
  }

  const all_big_bad_defs = [
    ...(Registry.big_bads_tier_1 ?? []),
    ...(Registry.big_bads_tier_2 ?? []),
    ...(Registry.big_bads_tier_3 ?? []),
  ];
  if (typeof big_bad_art !== 'undefined') {
    const big_bad_ids = new Set(all_big_bad_defs.map(big_bad_def => big_bad_def.id).filter(Boolean));
    for (const big_bad_def of all_big_bad_defs) {
      if (big_bad_def.id && !(big_bad_def.id in big_bad_art)) {
        startup_errors.push(`[art.js] No big_bad_art entry for '${big_bad_def.id}'.`);
      }
    }
    for (const art_id of Object.keys(big_bad_art)) {
      if (!big_bad_ids.has(art_id)) startup_errors.push(`[art.js] big_bad_art has orphaned entry '${art_id}'.`);
    }
  }
  if (Array.isArray(Registry.cities) && typeof city_art !== 'undefined') {
    const city_ids = new Set(Registry.cities.map(city_def => city_def.id).filter(Boolean));
    for (const city_def of Registry.cities) {
      if (city_def.id && !(city_def.id in city_art)) {
        startup_errors.push(`[art.js] No city_art entry for '${city_def.id}'.`);
      }
    }
    for (const art_id of Object.keys(city_art)) {
      if (!city_ids.has(art_id)) startup_errors.push(`[art.js] city_art has orphaned entry '${art_id}'.`);
    }
  }

  const seen_card_ids = new Map();
  for (const { key: pool_key, source: source_label } of card_pool_descriptors) {
    if (!Array.isArray(Registry[pool_key])) continue;
    const card_defs = pool_key === 'cards_starter' ? [...new Set(Registry[pool_key])] : Registry[pool_key];
    for (const card_def of card_defs) {
      if (!card_def.id) continue;
      if (seen_card_ids.has(card_def.id)) {
        startup_errors.push(`Duplicate card id '${card_def.id}' in '${seen_card_ids.get(card_def.id)}' and '${source_label}'.`);
      } else {
        seen_card_ids.set(card_def.id, source_label);
      }
    }
  }

  const begin_run_btn = document.getElementById('begin-run-btn');
  if (!begin_run_btn) {
    console.error('City Heroes: #begin-run-btn not found — cannot gate startup.');
    return;
  }

  if (startup_errors.length > 0) {
    begin_run_btn.textContent = 'FAILED TO LOAD';
    begin_run_btn.title       = `${startup_errors.length} error(s) — see console.`;
    startup_errors.forEach(error_message => console.error('City Heroes:', error_message));
    return;
  }

  setupEventListeners({

    start_new_run,
    begin_fight,
    on_phase_btn,
    quick_play_all,
    on_hand_card_click,
    on_hero_slot_click,
    on_market_card_click,
    on_unlock_market_slot,
    on_upgrade_market_click,
    on_forge_click,
    apply_upgrade,
    apply_treasure,
    apply_event_choice,

    get_effective_market_size,
    get_slot_unlock_cost,
    get_card_cost,
    get_forge_cost,
    create_card_instance,
    shuffle_array,
  });

  begin_run_btn.disabled = false;
});
