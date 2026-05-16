
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

  if (def.keywords !== undefined) {
    if (!Array.isArray(def.keywords)) {
      errors.push(`${tag} 'keywords' must be an array if present.`);
    } else {
      const bad = def.keywords.filter(k => !VALID_KEYWORDS.has(k));
      if (bad.length) errors.push(`${tag} unknown keyword(s): '${bad.join("', '")}'.`);
    }
  }

  if (def.ally_bonus !== undefined) {
    if (typeof def.ally_bonus !== 'object' || def.ally_bonus === null) {
      errors.push(`${tag} 'ally_bonus' must be an object if present.`);
    } else if (!VALID_ROLES.has(def.ally_bonus.faction)) {
      errors.push(`${tag} 'ally_bonus.faction' must be a valid role.`);
    }
  }

  if (!Array.isArray(def.effects)) {
    errors.push(`${tag} 'effects' must be an array.`);
  } else {
    def.effects.forEach((effect, i) => {
      if (!VALID_EFFECT_TYPES.has(effect.type)) {
        errors.push(`${tag} effect[${i}] unknown type '${effect.type}'.`);
      }
      if (effect.trigger !== undefined && !VALID_TRIGGERS.has(effect.trigger)) {
        errors.push(`${tag} effect[${i}] invalid trigger '${effect.trigger}'.`);
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
  if (def.weak_against   !== undefined && !VALID_ROLES.has(def.weak_against))   errors.push(`${tag} 'weak_against' must be a valid role.`);
  if (def.strong_against !== undefined && !VALID_ROLES.has(def.strong_against)) errors.push(`${tag} 'strong_against' must be a valid role.`);
  if (def.monster_tribes !== undefined) {
    if (!Array.isArray(def.monster_tribes) || def.monster_tribes.length === 0) {
      errors.push(`${tag} 'monster_tribes' must be a non-empty array if present.`);
    }
  }
  return errors;
}

const VALID_TREASURE_HOOKS = new Set([
  'start_of_turn', 'start_of_fight', 'on_recruit', 'on_turn_end',
]);

function validate_treasure_def(def, source) {
  const errors = [];
  const tag    = `[${source}] Treasure '${def.id ?? '(no id)'}':`;

  if (typeof def.id     !== 'string' || !def.id.trim())   errors.push(`${tag} missing 'id'.`);
  if (typeof def.name   !== 'string' || !def.name.trim()) errors.push(`${tag} missing 'name'.`);
  if (typeof def.desc   !== 'string')                     errors.push(`${tag} 'desc' must be a string.`);
  if (!VALID_TREASURE_HOOKS.has(def.hook))                errors.push(`${tag} invalid 'hook' value '${def.hook}'.`);
  if (typeof def.effect !== 'object' || def.effect === null) {
    errors.push(`${tag} 'effect' must be an object.`);
  } else if (!VALID_EFFECT_TYPES.has(def.effect.type)) {
    errors.push(`${tag} effect type '${def.effect.type}' not in VALID_EFFECT_TYPES.`);
  }
  return errors;
}

const VALID_EVENT_OUTCOMES = new Set([
  'add_card_to_deck', 'add_curse', 'add_treasure', 'gold', 'max_morale', 'scrap_random',
]);

function validate_event_def(def, source) {
  const errors = [];
  const tag    = `[${source}] Event '${def.id ?? '(no id)'}':`;
  if (typeof def.id    !== 'string' || !def.id.trim())    errors.push(`${tag} missing 'id'.`);
  if (typeof def.title !== 'string' || !def.title.trim()) errors.push(`${tag} missing 'title'.`);
  if (typeof def.desc  !== 'string')                      errors.push(`${tag} 'desc' must be a string.`);
  if (!Array.isArray(def.choices) || def.choices.length === 0) {
    errors.push(`${tag} 'choices' must be a non-empty array.`);
  } else {
    def.choices.forEach((choice, i) => {
      if (typeof choice.label !== 'string') errors.push(`${tag} choice[${i}] missing 'label'.`);
      if (typeof choice.desc  !== 'string') errors.push(`${tag} choice[${i}] missing 'desc'.`);
      if (!Array.isArray(choice.outcomes)) {
        errors.push(`${tag} choice[${i}] 'outcomes' must be an array.`);
      } else {
        choice.outcomes.forEach((o, j) => {
          if (!VALID_EVENT_OUTCOMES.has(o.type)) {
            errors.push(`${tag} choice[${i}].outcomes[${j}] unknown type '${o.type}'.`);
          }
        });
      }
    });
  }
  return errors;
}

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
  if (def.passives !== undefined) {
    if (!Array.isArray(def.passives)) {
      errors.push(`${tag} 'passives' must be an array if present.`);
    } else {
      def.passives.forEach((passive, i) => {
        if (!VALID_TREASURE_HOOKS.has(passive.hook)) errors.push(`${tag} passive[${i}] invalid hook '${passive.hook}'.`);
        if (!passive.effect || typeof passive.effect !== 'object') errors.push(`${tag} passive[${i}] missing 'effect' object.`);
        else if (!VALID_EFFECT_TYPES.has(passive.effect.type)) errors.push(`${tag} passive[${i}] effect type '${passive.effect.type}' not in VALID_EFFECT_TYPES.`);
      });
    }
  }
  return errors;
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

  const errors = [];

  const required_pools = [
    'cards_starter', 'cards_market', 'cards_upgrades', 'cards_curses',
    'cards_monster_tier_1', 'cards_monster_tier_2', 'cards_monster_tier_3',
    'big_bads_tier_1', 'big_bads_tier_2', 'big_bads_tier_3',
    'cities', 'treasures',
  ];
  required_pools
    .filter(k => !Array.isArray(Registry[k]))
    .forEach(k => errors.push(`Registry missing pool '${k}' — check that the data file loaded before startup_validator.js.`));

  if (typeof make_art_painter !== 'function') {
    errors.push(`Global 'make_art_painter' not found — check that art.js loaded.`);
  }

  const card_pools = [
    { key: 'cards_starter',        source: '01_data_cards_starter.js'          },
    { key: 'cards_market',         source: '01_data_cards_market.js'           },
    { key: 'cards_upgrades',       source: '01_data_cards_upgrades.js'         },
    { key: 'cards_curses',         source: '01_data_cards_curses.js'           },
    { key: 'cards_monster_tier_1', source: '01_data_cards_monster.js (tier 1)' },
    { key: 'cards_monster_tier_2', source: '01_data_cards_monster.js (tier 2)' },
    { key: 'cards_monster_tier_3', source: '01_data_cards_monster.js (tier 3)' },
  ];
  for (const { key, source } of card_pools) {
    if (!Array.isArray(Registry[key])) continue;
    const defs = key === 'cards_starter' ? [...new Set(Registry[key])] : Registry[key];
    for (const def of defs) errors.push(...validate_card_def(def, source));
  }

  for (const { key, source } of [
    { key: 'big_bads_tier_1', source: '01_data_enemies.js (tier 1)' },
    { key: 'big_bads_tier_2', source: '01_data_enemies.js (tier 2)' },
    { key: 'big_bads_tier_3', source: '01_data_enemies.js (tier 3)' },
  ]) {
    if (!Array.isArray(Registry[key])) continue;
    for (const def of Registry[key]) errors.push(...validate_big_bad_def(def, source));
  }

  if (Array.isArray(Registry.cities)) {
    for (const def of Registry.cities) errors.push(...validate_city_def(def, '01_data_levels.js'));
  }

  if (Array.isArray(Registry.treasures)) {
    for (const def of Registry.treasures) errors.push(...validate_treasure_def(def, '01_data_treasures.js'));
  }

  if (Array.isArray(Registry.events)) {
    for (const def of Registry.events) errors.push(...validate_event_def(def, '01_data_events.js'));
  }

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
