// engine_effects.js
// Effect resolution for hero and monster cards.
// All functions here are pure game-logic — no DOM access, no timers,
// no render() calls. The engine's run_resolve_step() is responsible for
// calling render() exactly once per step after effects have been applied.
//
// Called by engine.js during the Resolution phase.
//
// engine.js calls init_effects_bridge() once after the module graph resolves,
// supplying the engine helpers that effects need. This avoids a circular
// ES module import (engine → effects → engine).
//
// State access convention: all state reads/writes use the namespaced paths
// (state.run.*, state.fight.*, state.turn.*) that engine.js established.
//
// To add a new effect type: add a case to apply_hero_effect or
// apply_monster_effect and declare its shape in the card data files.

// Injected by engine.js via init_effects_bridge()
let _pick_random;
let _shuffle_array;
let _get_adjacent_cards;
let _get_opposite_cards;
let _create_card_instance;
let _find_card_def_by_id;
let _get_monster_pool;
let _log_entry;

/**
 * Called once by engine.js after it has initialised its own state.
 * Provides engine_effects with references it needs without importing from engine.
 * Note: render is intentionally absent — effects must not trigger intermediate
 * renders. The engine renders once per resolve step after all effects complete.
 */
export function init_effects_bridge(fns) {
  const REQUIRED = [
    'pick_random', 'shuffle_array', 'get_adjacent_cards', 'get_opposite_cards',
    'create_card_instance', 'find_card_def_by_id', 'get_monster_pool', 'log_entry',
  ];
  const missing = REQUIRED.filter(k => typeof fns[k] !== 'function');
  if (missing.length > 0) {
    throw new Error(
      `init_effects_bridge: missing helper functions: ${missing.join(', ')}. ` +
      `Ensure init_engine() passes all required helpers.`
    );
  }
  _pick_random          = fns.pick_random;
  _shuffle_array        = fns.shuffle_array;
  _get_adjacent_cards   = fns.get_adjacent_cards;
  _get_opposite_cards   = fns.get_opposite_cards;
  _create_card_instance = fns.create_card_instance;
  _find_card_def_by_id  = fns.find_card_def_by_id;
  _get_monster_pool     = fns.get_monster_pool;
  _log_entry            = fns.log_entry;
}

// ─────────────────────────────────────────────────────────────
// HERO EFFECT HANDLERS
// source_card  — the hero card that carries the effect
// slot_index   — the hero field slot of source_card
// ─────────────────────────────────────────────────────────────

export function apply_hero_effect(state, effect, source_card, slot_index = 0) {
  switch (effect.type) {

    // ── transform ─────────────────────────────────────────────
    case 'transform': {
      const candidates = [];
      for (const zone_key of (effect.zones ?? ['field'])) {
        if (zone_key === 'field') {
          for (let i = 0; i < state.fight.hero_field.length; i++) {
            const card = state.fight.hero_field[i];
            if (!card) continue;
            if (effect.target.match === 'id'   && card.id   === effect.target.value) candidates.push({ zone: 'field', index: i, card });
            if (effect.target.match === 'type' && card.type === effect.target.value) candidates.push({ zone: 'field', index: i, card });
          }
        } else {
          const zone_array = state.run[zone_key];
          if (!zone_array) continue;
          for (let i = 0; i < zone_array.length; i++) {
            const card = zone_array[i];
            if (!card) continue;
            if (effect.target.match === 'id'   && card.id   === effect.target.value) candidates.push({ zone: zone_key, index: i, card });
            if (effect.target.match === 'type' && card.type === effect.target.value) candidates.push({ zone: zone_key, index: i, card });
          }
        }
      }
      if (candidates.length === 0) {
        _log_entry(`${source_card.name}: no transform target found.`, 'log-effect');
        break;
      }
      const chosen          = _pick_random(candidates);
      const replacement_def = _find_card_def_by_id(effect.replace_with);
      if (!replacement_def) break;
      const replacement_card = _create_card_instance(replacement_def);
      if (chosen.zone === 'field') {
        replacement_card.active = chosen.card.active;
        state.fight.hero_field[chosen.index] = replacement_card;
      } else {
        state.run[chosen.zone][chosen.index] = replacement_card;
      }
      _log_entry(`${source_card.name}: ${chosen.card.name} → ${replacement_card.name} (${chosen.zone}).`, 'log-effect');
      break;
    }

    // ── stun ─────────────────────────────────────────────────
    case 'stun': {
      let targets = [];
      if (effect.selection === 'opposite') {
        targets = _get_opposite_cards(state, 'H', slot_index).filter(Boolean);
      } else {
        const picked = _pick_random(state.fight.monster_field.filter(Boolean));
        if (picked) targets = [picked];
      }
      if (targets.length === 0) {
        _log_entry(`${source_card.name}: stun — no target.`, 'log-effect');
        break;
      }
      for (const target of targets) {
        target.active = false;
        _log_entry(`${source_card.name}: ${target.name} stunned!`, 'log-effect');
      }
      break;
    }

    // ── recur ─────────────────────────────────────────────────
    case 'recur': {
      const recur_candidates = state.run.discard.filter(c =>
        c.type === 'hero' || c.type === 'starter' || c.type === 'promoted'
      );
      if (recur_candidates.length === 0) {
        _log_entry(`${source_card.name}: no hero in discard to recur.`, 'log-effect');
        break;
      }
      const recur_target = _pick_random(recur_candidates);
      state.run.discard.splice(state.run.discard.indexOf(recur_target), 1);
      let placed_at = -1;
      for (let i = 0; i < state.fight.hero_field.length; i++) {
        if (!state.fight.hero_field[i]) {
          recur_target.active   = true;
          recur_target.resolved = false;
          state.fight.hero_field[i] = recur_target;
          placed_at = i;
          break;
        }
      }
      if (placed_at !== -1) {
        recur_target.injected = true;
        state.turn.active_resolution_sequence.splice(state.turn.resolving_step + 1, 0, { side: 'H', slot: placed_at });
        _log_entry(`${source_card.name}: ${recur_target.name} recalled from discard.`, 'log-effect');
      } else {
        state.run.discard.push(recur_target);
        _log_entry(`${source_card.name}: recur — no empty slot, returned to discard.`, 'log-effect');
      }
      break;
    }

    // ── shield_drain ─────────────────────────────────────────
    case 'shield_drain': {
      const drained = Math.min(state.fight.monster_shield, effect.amount);
      state.fight.monster_shield = Math.max(0, state.fight.monster_shield - drained);
      _log_entry(`${source_card.name}: monster shield -${drained}.`, 'log-effect');
      break;
    }

    // ── weaken_atk ───────────────────────────────────────────
    case 'weaken_atk': {
      state.turn.atk_weakened_next += effect.amount;
      _log_entry(`${source_card.name}: ${state.fight.big_bad.name} ATK -${effect.amount} next turn.`, 'log-effect');
      break;
    }

    // ── stat_mod_all ──────────────────────────────────────────
    case 'stat_mod_all': {
      for (const hero_card of state.fight.hero_field) {
        if (!hero_card || !hero_card.active) continue;
        if (effect.stat === 'atk') {
          hero_card.temp_atk_mod += effect.amount;
          _log_entry(`${source_card.name}: ${hero_card.name} atk +${effect.amount} (${effect.duration}).`, 'log-effect');
        } else {
          console.warn(`stat_mod_all: unhandled stat '${effect.stat}' on card '${source_card.id}'.`);
        }
      }
      break;
    }

    // ── kill_monster ─────────────────────────────────────────
    case 'kill_monster': {
      const pool = _get_monster_pool(state.run.fight_number)
        .filter(def => !state.fight.monster_excluded_ids.has(def.id));
      if (pool.length === 0) {
        _log_entry(`${source_card.name}: all monster types already purged.`, 'log-effect');
        break;
      }
      const purged = _pick_random(pool);
      state.fight.monster_excluded_ids.add(purged.id);
      _log_entry(`${source_card.name}: ${purged.name} banished from this fight!`, 'log-effect');
      break;
    }

    // ── cleanse ───────────────────────────────────────────────
    case 'cleanse': {
      let total = 0;
      for (const zone_key of effect.zones) {
        const zone_cards = zone_key === 'field'
          ? state.fight.hero_field.filter(Boolean)
          : state.run[zone_key];
        if (!zone_cards) continue;
        const corrupted  = zone_cards.filter(c => c.corrupted);
        const to_cleanse = effect.count === 'all' ? corrupted : corrupted.slice(0, effect.count);
        for (const c of to_cleanse) { c.corrupted = false; total++; }
      }
      _log_entry(`${source_card.name}: cleansed ${total} corrupted card(s).`, 'log-effect');
      break;
    }

    // ── haste ─────────────────────────────────────────────────
    case 'haste': {
      const step = find_next_pending_step(state, effect.target_side);
      if (!step) {
        _log_entry(`${source_card.name}: haste — no eligible ${effect.target_side} step pending.`, 'log-effect');
        break;
      }
      state.turn.active_resolution_sequence.splice(step.seq_index, 1);
      state.turn.active_resolution_sequence.splice(state.turn.resolving_step + 1, 0, step.step);
      const field = effect.target_side === 'hero' ? state.fight.hero_field : state.fight.monster_field;
      const label = field[step.step.slot]?.name ?? effect.target_side;
      _log_entry(`${source_card.name}: ${label} hasted — acts next!`, 'log-effect');
      break;
    }

    // ── slow ──────────────────────────────────────────────────
    case 'slow': {
      const step = find_next_pending_step(state, effect.target_side);
      if (!step) {
        _log_entry(`${source_card.name}: slow — no eligible ${effect.target_side} step pending.`, 'log-effect');
        break;
      }
      state.turn.active_resolution_sequence.splice(step.seq_index, 1);
      state.turn.active_resolution_sequence.push(step.step);
      const field = effect.target_side === 'hero' ? state.fight.hero_field : state.fight.monster_field;
      const label = field[step.step.slot]?.name ?? effect.target_side;
      _log_entry(`${source_card.name}: ${label} slowed — acts last!`, 'log-effect');
      break;
    }

    // ── stop ──────────────────────────────────────────────────
    case 'stop': {
      const step = find_next_pending_step(state, effect.target_side);
      if (!step) {
        _log_entry(`${source_card.name}: stop — no eligible ${effect.target_side} step pending.`, 'log-effect');
        break;
      }
      const t_side  = step.step.side;
      const t_slot  = step.step.slot;
      const p_start = state.turn.resolving_step + 1;
      let removed   = 0;
      state.turn.active_resolution_sequence = state.turn.active_resolution_sequence.filter((s, i) => {
        if (i >= p_start && s.side === t_side && s.slot === t_slot) { removed++; return false; }
        return true;
      });
      const field = effect.target_side === 'hero' ? state.fight.hero_field : state.fight.monster_field;
      const label = field[t_slot]?.name ?? effect.target_side;
      _log_entry(`${source_card.name}: ${label} stopped — ${removed} step(s) removed!`, 'log-effect');
      break;
    }

    // ── draw ──────────────────────────────────────────────────
    case 'draw': {
      const count = effect.amount ?? 1;
      let drawn = 0;
      for (let i = 0; i < count; i++) {
        if (state.run.deck.length === 0) {
          if (state.run.discard.length === 0) break;
          state.run.deck    = _shuffle_array(state.run.discard);
          state.run.discard = [];
          _log_entry('Deck reshuffled from discard.', 'log-phase');
        }
        state.run.hand.push(state.run.deck.pop());
        drawn++;
      }
      if (drawn > 0) _log_entry(`${source_card.name}: drew ${drawn} card(s).`, 'log-effect');
      else           _log_entry(`${source_card.name}: draw — no cards available.`, 'log-effect');
      break;
    }

    // ── scrap ─────────────────────────────────────────────────
    case 'scrap': {
      let candidates = [];
      if (effect.target === 'starter') {
        candidates = [
          ...state.run.hand.filter(c => c.type === 'starter'),
          ...state.run.discard.filter(c => c.type === 'starter'),
        ];
      } else if (effect.target === 'any_hand') {
        candidates = state.run.hand.filter(c => c.uid !== source_card.uid);
      } else if (effect.target === 'any_discard') {
        candidates = [...state.run.discard];
      }
      if (candidates.length === 0) {
        _log_entry(`${source_card.name}: scrap — no eligible target.`, 'log-effect');
        break;
      }
      const scrapped    = _pick_random(candidates);
      state.run.hand    = state.run.hand.filter(c => c.uid !== scrapped.uid);
      state.run.discard = state.run.discard.filter(c => c.uid !== scrapped.uid);
      state.run.deck    = state.run.deck.filter(c => c.uid !== scrapped.uid);
      _log_entry(`${source_card.name}: ${scrapped.name} scrapped permanently!`, 'log-effect');
      break;
    }

    // ── cost_reduce ───────────────────────────────────────────
    case 'cost_reduce': {
      state.turn.cost_reduce_next += effect.amount;
      _log_entry(`${source_card.name}: next recruit costs ${effect.amount} less Gold.`, 'log-effect');
      break;
    }

    // ── field_bonus ───────────────────────────────────────────
    case 'field_bonus': {
      let condition_met = false;
      if (effect.condition === 'adjacent_role_match') {
        condition_met = _get_adjacent_cards(state, 'H', slot_index).some(c => c.role === source_card.role);
      } else if (effect.condition === 'field_count_gte') {
        condition_met = state.fight.hero_field.filter(Boolean).length >= (effect.threshold ?? 2);
      }
      if (!condition_met) {
        _log_entry(`${source_card.name}: field bonus — condition not met.`, 'log-effect');
        break;
      }
      if (effect.stat === 'atk') {
        source_card.temp_atk_mod += effect.amount;
        _log_entry(`${source_card.name}: field bonus — +${effect.amount} ATK!`, 'log-effect');
      } else if (effect.stat === 'gold') {
        state.fight.gold_pool += effect.amount;
        _log_entry(`${source_card.name}: field bonus — +${effect.amount} Gold!`, 'log-effect');
      } else if (effect.stat === 'shield') {
        state.fight.city_def += effect.amount;
        _log_entry(`${source_card.name}: field bonus — +${effect.amount} Defence!`, 'log-effect');
      } else if (effect.stat === 'morale') {
        state.fight.city_morale = Math.min(state.fight.city.max_morale, state.fight.city_morale + effect.amount);
        _log_entry(`${source_card.name}: field bonus — +${effect.amount} Morale!`, 'log-effect');
      }
      break;
    }

    default:
      console.warn(`apply_hero_effect: unknown effect type '${effect.type}' on card '${source_card.id}'.`);
      break;
  }
}

// ─────────────────────────────────────────────────────────────
// SEQUENCE HELPERS
// ─────────────────────────────────────────────────────────────

function find_next_pending_step(state, target_side) {
  const side_key      = target_side === 'hero' ? 'H' : 'M';
  const field         = target_side === 'hero' ? state.fight.hero_field : state.fight.monster_field;
  const pending_start = state.turn.resolving_step + 1;
  const seen_slots    = new Set();
  const candidates    = [];
  for (let i = pending_start; i < state.turn.active_resolution_sequence.length; i++) {
    const s = state.turn.active_resolution_sequence[i];
    if (s.side !== side_key)    continue;
    if (seen_slots.has(s.slot)) continue;
    if (!field[s.slot])         continue;
    if (!field[s.slot].active)  continue;
    seen_slots.add(s.slot);
    candidates.push({ step: s, seq_index: i });
  }
  return candidates.length === 0 ? null : _pick_random(candidates);
}

// ─────────────────────────────────────────────────────────────
// MONSTER EFFECT HANDLERS
// source_card  — the monster card that carries the effect
// slot_index   — the monster field slot of source_card (for future spatial effects)
// ─────────────────────────────────────────────────────────────

export function apply_monster_effect(state, effect, source_card, slot_index = 0) {  // eslint-disable-line no-unused-vars
  switch (effect.type) {

    // ── kill ─────────────────────────────────────────────────
    case 'kill': {
      const killable = state.fight.hero_field.filter(Boolean);
      if (killable.length === 0) {
        _log_entry(`${source_card.name}: kill — no hero target.`, 'log-effect');
        break;
      }
      const killed     = _pick_random(killable);
      const kill_index = state.fight.hero_field.indexOf(killed);
      state.fight.hero_field[kill_index] = null;
      state.run.deck    = state.run.deck.filter(c => c.uid !== killed.uid);
      state.run.hand    = state.run.hand.filter(c => c.uid !== killed.uid);
      state.run.discard = state.run.discard.filter(c => c.uid !== killed.uid);
      _log_entry(`${source_card.name}: ${killed.name} slain and deleted from the run!`, 'log-monster');
      break;
    }

    default:
      console.warn(`apply_monster_effect: unknown effect type '${effect.type}' on card '${source_card.id}'.`);
      break;
  }
}
