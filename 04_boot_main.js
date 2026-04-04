// startup_validator.js
// Single ES module entry point for City Heroes.
//
// Responsibilities:
//   1. Wire engine → renderer bridge (init_engine)
//   2. Validate all data definitions from Registry
//   3. Gate the Begin Run button
//   4. Wire renderer ← engine by calling setupEventListeners(engine_fns)
//
// Import graph (acyclic):
//   startup_validator
//     → engine        (imports constants, app, engine_effects)
//     → renderer      (imports constants, app only)
//     → constants
//     → app
//
// Classic scripts (03_ui_art_painters.js, 01_data_*.js, 00_core_registry.js)
// run synchronously before DOMContentLoaded, so Registry is fully populated
// by the time this module's event listener fires.

import { MONSTER_SLOTS } from './00_core_constants.js';

import {
  init_engine,
  find_card_def_by_id,
  // Engine action handlers passed to renderer via setupEventListeners
  start_new_run, begin_fight, on_phase_btn, quick_play_all,
  on_hand_card_click, on_hero_slot_click,
  on_market_card_click, on_unlock_market_slot, on_upgrade_market_click,
  apply_upgrade,
  // Engine query helpers passed to renderer via setupEventListeners
  get_effective_market_size, get_slot_unlock_cost, get_card_cost,
  create_card_instance, shuffle_array,
} from './02_sys_engine.js';

import {
  render, log_entry, log_phase, flash_notification,
  clear_hand_selection,
  show_prefight_screen, show_upgrade_screen, show_summary_screen, show_screen,
  setupEventListeners,
} from './03_ui_renderer.js';

// ─────────────────────────────────────────────────────────────
// VALID VALUE SETS
// ─────────────────────────────────────────────────────────────

const VALID_CARD_TYPES       = new Set(['starter', 'hero', 'promoted', 'monster']);
const VALID_ATK_TYPES        = new Set(['none', 'physical', 'magical']);
const VALID_ROLES            = new Set(['physical', 'magical', 'tactical']);
const VALID_TRANSFORM_ZONES  = new Set(['field', 'hand', 'deck', 'discard']);
const VALID_TARGET_SIDES     = new Set(['hero', 'monster']);
const VALID_STUN_SELECTIONS  = new Set(['random', 'opposite']);
const VALID_SCRAP_TARGETS    = new Set(['starter', 'any_hand', 'any_discard']);
const VALID_FIELD_CONDITIONS = new Set(['adjacent_role_match', 'field_count_gte']);
const VALID_FIELD_STATS      = new Set(['atk', 'gold', 'shield', 'morale']);
const VALID_EFFECT_TYPES     = new Set([
  'transform', 'stun', 'recur', 'shield_drain',
  'weaken_atk', 'stat_mod_all', 'kill_monster', 'cleanse', 'kill',
  'haste', 'slow', 'stop',
  'draw', 'scrap', 'cost_reduce', 'field_bonus',
]);

// ─────────────────────────────────────────────────────────────
// CARD DEFINITION VALIDATOR
// ─────────────────────────────────────────────────────────────

function validate_card_def(def, source) {
  const errors = [];
  const tag    = `[${source}] Card '${def.id ?? '(no id)'}':`; 

  if (typeof def.id     !== 'string'  || def.id.trim()   === '') errors.push(`${tag} missing or empty 'id'.`);
  if (typeof def.name   !== 'string'  || def.name.trim() === '') errors.push(`${tag} missing or empty 'name'.`);
  if (!VALID_CARD_TYPES.has(def.type))                            errors.push(`${tag} invalid type '${def.type}'.`);
  if (typeof def.cost   !== 'number')                            errors.push(`${tag} 'cost' must be a number.`);
  if (typeof def.level  !== 'number' || def.level < 0)           errors.push(`${tag} 'level' must be a non-negative number.`);
  if (!VALID_ROLES.has(def.role))                                 errors.push(`${tag} invalid role '${def.role}'.`);
  if (typeof def.atk    !== 'number')                            errors.push(`${tag} 'atk' must be a number.`);
  if (!VALID_ATK_TYPES.has(def.atk_type))                        errors.push(`${tag} invalid atk_type '${def.atk_type}'.`);
  if (typeof def.gold   !== 'number')                            errors.push(`${tag} 'gold' must be a number.`);
  if (typeof def.morale !== 'number')                            errors.push(`${tag} 'morale' must be a number.`);
  if (typeof def.shield !== 'number')                            errors.push(`${tag} 'shield' must be a number.`);
  if (typeof def.desc   !== 'string')                            errors.push(`${tag} 'desc' must be a string.`);
  if (typeof def.art    !== 'function')                          errors.push(`${tag} 'art' must be a function.`);

  if (!Array.isArray(def.effects)) {
    errors.push(`${tag} 'effects' must be an array.`);
  } else {
    def.effects.forEach((effect, i) => {
      if (!VALID_EFFECT_TYPES.has(effect.type)) {
        errors.push(`${tag} effect[${i}] unknown type '${effect.type}'.`);
      }
      if (effect.type === 'transform') {
        if (!Array.isArray(effect.zones) || effect.zones.length === 0) {
          errors.push(`${tag} effect[${i}] (transform) missing non-empty 'zones' array.`);
        } else {
          const bad = effect.zones.filter(z => !VALID_TRANSFORM_ZONES.has(z));
          if (bad.length) errors.push(`${tag} effect[${i}] (transform) invalid zone(s): '${bad.join("', '")}'.`);
        }
        if (typeof effect.replace_with !== 'string' || !effect.replace_with.trim()) {
          errors.push(`${tag} effect[${i}] (transform) missing 'replace_with'.`);
        } else if (find_card_def_by_id(effect.replace_with) === null) {
          errors.push(`${tag} effect[${i}] (transform) unknown 'replace_with' id '${effect.replace_with}'.`);
        }
      }
      if (effect.type === 'stun' && !VALID_STUN_SELECTIONS.has(effect.selection)) {
        errors.push(`${tag} effect[${i}] (stun) invalid selection '${effect.selection}'.`);
      }
      if (['haste', 'slow', 'stop'].includes(effect.type) && !VALID_TARGET_SIDES.has(effect.target_side)) {
        errors.push(`${tag} effect[${i}] (${effect.type}) invalid target_side '${effect.target_side}'.`);
      }
      if (effect.type === 'draw' && (typeof effect.amount !== 'number' || effect.amount < 1)) {
        errors.push(`${tag} effect[${i}] (draw) 'amount' must be a positive number.`);
      }
      if (effect.type === 'scrap' && !VALID_SCRAP_TARGETS.has(effect.target)) {
        errors.push(`${tag} effect[${i}] (scrap) invalid target '${effect.target}'.`);
      }
      if (effect.type === 'cost_reduce' && (typeof effect.amount !== 'number' || effect.amount < 1)) {
        errors.push(`${tag} effect[${i}] (cost_reduce) 'amount' must be a positive number.`);
      }
      if (effect.type === 'field_bonus') {
        if (!VALID_FIELD_CONDITIONS.has(effect.condition)) errors.push(`${tag} effect[${i}] (field_bonus) invalid condition '${effect.condition}'.`);
        if (!VALID_FIELD_STATS.has(effect.stat))           errors.push(`${tag} effect[${i}] (field_bonus) invalid stat '${effect.stat}'.`);
        if (typeof effect.amount !== 'number')             errors.push(`${tag} effect[${i}] (field_bonus) 'amount' must be a number.`);
      }
    });
  }
  return errors;
}

// ─────────────────────────────────────────────────────────────
// BIG BAD DEFINITION VALIDATOR
// ─────────────────────────────────────────────────────────────

function validate_big_bad_def(def, source) {
  const errors = [];
  const tag    = `[${source}] Big Bad '${def.id ?? '(no id)'}':`; 

  if (typeof def.id                !== 'string' || !def.id.trim())   errors.push(`${tag} missing 'id'.`);
  if (typeof def.name              !== 'string' || !def.name.trim()) errors.push(`${tag} missing 'name'.`);
  if (typeof def.title             !== 'string')                      errors.push(`${tag} 'title' must be a string.`);
  if (typeof def.tier              !== 'number')                      errors.push(`${tag} 'tier' must be a number.`);
  if (typeof def.max_hp            !== 'number' || def.max_hp <= 0)   errors.push(`${tag} 'max_hp' must be positive.`);
  if (typeof def.atk               !== 'number')                      errors.push(`${tag} 'atk' must be a number.`);
  if (typeof def.monsters_per_turn !== 'number')                      errors.push(`${tag} 'monsters_per_turn' must be a number.`);
  if (!VALID_ROLES.has(def.role))                                      errors.push(`${tag} invalid role '${def.role}'.`);
  if (typeof def.level             !== 'number' || def.level < 0)     errors.push(`${tag} 'level' must be non-negative.`);
  if (typeof def.deck_desc         !== 'string')                      errors.push(`${tag} 'deck_desc' must be a string.`);
  if (typeof def.victory_message   !== 'string')                      errors.push(`${tag} 'victory_message' must be a string.`);
  if (typeof def.defeat_message    !== 'string')                      errors.push(`${tag} 'defeat_message' must be a string.`);
  if (1 + def.monsters_per_turn > MONSTER_SLOTS) {
    errors.push(`${tag} monsters_per_turn (${def.monsters_per_turn}) exceeds MONSTER_SLOTS-1 (${MONSTER_SLOTS - 1}).`);
  }
  return errors;
}

// ─────────────────────────────────────────────────────────────
// CITY DEFINITION VALIDATOR
// ─────────────────────────────────────────────────────────────

function validate_city_def(def, source) {
  const errors = [];
  const tag    = `[${source}] City '${def.id ?? '(no id)'}':`; 

  if (typeof def.id                  !== 'string' || !def.id.trim())   errors.push(`${tag} missing 'id'.`);
  if (typeof def.name                !== 'string' || !def.name.trim()) errors.push(`${tag} missing 'name'.`);
  if (typeof def.type                !== 'string')                     errors.push(`${tag} 'type' must be a string.`);
  if (typeof def.max_morale          !== 'number' || def.max_morale <= 0) errors.push(`${tag} 'max_morale' must be positive.`);
  if (typeof def.market_size         !== 'number')                     errors.push(`${tag} 'market_size' must be a number.`);
  if (typeof def.starting_def        !== 'number')                     errors.push(`${tag} 'starting_def' must be a number.`);
  if (typeof def.hero_cost_discount  !== 'number')                     errors.push(`${tag} 'hero_cost_discount' must be a number.`);
  if (typeof def.bonus_gold_per_turn !== 'number')                     errors.push(`${tag} 'bonus_gold_per_turn' must be a number.`);
  if (def.effects !== undefined && !Array.isArray(def.effects))        errors.push(`${tag} 'effects' must be an array.`);
  return errors;
}

// ─────────────────────────────────────────────────────────────
// BOOTSTRAP
// ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // Lock the Registry — all classic data scripts have now run.
  // Any register_*() call after this point will throw.
  Registry.lock();

  // ── Step 1: Wire engine → renderer ─────────────────────────
  // Must happen before validation so find_card_def_by_id (used by transform
  // validation) has access to the renderer log functions it needs.
  init_engine({
    render,
    log_entry,
    log_phase,
    flash_notification,
    clear_hand_selection,
    show_prefight_screen,
    show_upgrade_screen,
    show_summary_screen,
    show_screen,
  });

  // ── Step 2: Validate ───────────────────────────────────────
  const errors = [];

  // Required Registry pools
  const required_pools = [
    'cards_starter', 'cards_market', 'cards_upgrades',
    'cards_monster_tier_1', 'cards_monster_tier_2', 'cards_monster_tier_3',
    'big_bads_tier_1', 'big_bads_tier_2', 'big_bads_tier_3',
    'cities',
  ];
  required_pools
    .filter(k => !Array.isArray(Registry[k]))
    .forEach(k => errors.push(`Registry missing pool '${k}' — check that the data file loaded before startup_validator.js.`));

  if (typeof make_art_painter !== 'function') {
    errors.push(`Global 'make_art_painter' not found — check that art.js loaded.`);
  }

  // Card shapes
  const card_pools = [
    { key: 'cards_starter',        source: '01_data_cards_starter.js'          },
    { key: 'cards_market',         source: '01_data_cards_market.js'           },
    { key: 'cards_upgrades',       source: '01_data_cards_upgrades.js'         },
    { key: 'cards_monster_tier_1', source: '01_data_cards_monster.js (tier 1)' },
    { key: 'cards_monster_tier_2', source: '01_data_cards_monster.js (tier 2)' },
    { key: 'cards_monster_tier_3', source: '01_data_cards_monster.js (tier 3)' },
  ];
  for (const { key, source } of card_pools) {
    if (!Array.isArray(Registry[key])) continue;
    const defs = key === 'cards_starter' ? [...new Set(Registry[key])] : Registry[key];
    for (const def of defs) errors.push(...validate_card_def(def, source));
  }

  // Big Bad shapes
  for (const { key, source } of [
    { key: 'big_bads_tier_1', source: '01_data_enemies.js (tier 1)' },
    { key: 'big_bads_tier_2', source: '01_data_enemies.js (tier 2)' },
    { key: 'big_bads_tier_3', source: '01_data_enemies.js (tier 3)' },
  ]) {
    if (!Array.isArray(Registry[key])) continue;
    for (const def of Registry[key]) errors.push(...validate_big_bad_def(def, source));
  }

  // City shapes
  if (Array.isArray(Registry.cities)) {
    for (const def of Registry.cities) errors.push(...validate_city_def(def, '01_data_levels.js'));
  }

  // Art coverage
  const all_bb_defs = [
    ...(Registry.big_bads_tier_1 ?? []),
    ...(Registry.big_bads_tier_2 ?? []),
    ...(Registry.big_bads_tier_3 ?? []),
  ];
  if (typeof big_bad_art !== 'undefined') {
    const bb_ids = new Set(all_bb_defs.map(d => d.id).filter(Boolean));
    for (const def of all_bb_defs) {
      if (def.id && !(def.id in big_bad_art)) errors.push(`[art.js] No big_bad_art entry for '${def.id}'.`);
    }
    for (const art_id of Object.keys(big_bad_art)) {
      if (!bb_ids.has(art_id)) errors.push(`[art.js] big_bad_art has orphaned entry '${art_id}'.`);
    }
  }
  if (Array.isArray(Registry.cities) && typeof city_art !== 'undefined') {
    const city_ids = new Set(Registry.cities.map(d => d.id).filter(Boolean));
    for (const def of Registry.cities) {
      if (def.id && !(def.id in city_art)) errors.push(`[art.js] No city_art entry for '${def.id}'.`);
    }
    for (const art_id of Object.keys(city_art)) {
      if (!city_ids.has(art_id)) errors.push(`[art.js] city_art has orphaned entry '${art_id}'.`);
    }
  }

  // ID uniqueness across card pools
  const seen_ids = new Map();
  for (const { key, source } of card_pools) {
    if (!Array.isArray(Registry[key])) continue;
    const defs = key === 'cards_starter' ? [...new Set(Registry[key])] : Registry[key];
    for (const def of defs) {
      if (!def.id) continue;
      if (seen_ids.has(def.id)) {
        errors.push(`Duplicate card id '${def.id}' in '${seen_ids.get(def.id)}' and '${source}'.`);
      } else {
        seen_ids.set(def.id, source);
      }
    }
  }

  // ── Step 3: Gate Begin Run ─────────────────────────────────
  const begin_run_btn = document.getElementById('begin-run-btn');
  if (!begin_run_btn) {
    console.error('City Heroes: #begin-run-btn not found — cannot gate startup.');
    return;
  }

  if (errors.length > 0) {
    begin_run_btn.textContent = 'FAILED TO LOAD';
    begin_run_btn.title       = `${errors.length} error(s) — see console.`;
    errors.forEach(e => console.error('City Heroes:', e));
    return;
  }

  // ── Step 4: Wire renderer ← engine ─────────────────────────
  // All engine function references flow into renderer here.
  // renderer.js never imports from engine.js — no circular dependency.
  setupEventListeners({
    // Action handlers
    start_new_run,
    begin_fight,
    on_phase_btn,
    quick_play_all,
    on_hand_card_click,
    on_hero_slot_click,
    on_market_card_click,
    on_unlock_market_slot,
    on_upgrade_market_click,
    apply_upgrade,
    // Query helpers
    get_effective_market_size,
    get_slot_unlock_cost,
    get_card_cost,
    create_card_instance,
    shuffle_array,
  });

  begin_run_btn.disabled = false;
});
