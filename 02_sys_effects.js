
const SIDE_HERO = 'H';
const SIDE_MONSTER = 'M';
const DEFAULT_MONSTER_TIER_FALLBACK = 3;
const DEFAULT_FIELD_COUNT_THRESHOLD = 2;
const DEFAULT_DRAW_COUNT = 1;
const DEFAULT_DAMAGE_AMOUNT = 0;
const MULTIPLIER_TRUE = 1;
const MULTIPLIER_FALSE = 0;

let _pick_random;
let _shuffle_array;
let _get_adjacent_cards;
let _get_opposite_cards;
let _create_card_instance;
let _find_card_def_by_id;
let _get_monster_pool;
let _log_entry;

export function init_effects_bridge(bridge_helpers) {
  const REQUIRED_HELPER_NAMES = [
    'pick_random', 'shuffle_array', 'get_adjacent_cards', 'get_opposite_cards',
    'create_card_instance', 'find_card_def_by_id', 'get_monster_pool', 'log_entry',
  ];
  const missing_helper_names = REQUIRED_HELPER_NAMES.filter(
    helper_name => typeof bridge_helpers[helper_name] !== 'function'
  );
  if (missing_helper_names.length > 0) {
    throw new Error(
      `init_effects_bridge: missing helper functions: ${missing_helper_names.join(', ')}. ` +
      `Ensure init_engine() passes all required helpers.`
    );
  }
  _pick_random          = bridge_helpers.pick_random;
  _shuffle_array        = bridge_helpers.shuffle_array;
  _get_adjacent_cards   = bridge_helpers.get_adjacent_cards;
  _get_opposite_cards   = bridge_helpers.get_opposite_cards;
  _create_card_instance = bridge_helpers.create_card_instance;
  _find_card_def_by_id  = bridge_helpers.find_card_def_by_id;
  _get_monster_pool     = bridge_helpers.get_monster_pool;
  _log_entry            = bridge_helpers.log_entry;
}

export const TRIGGERS = Object.freeze([
  'on_recruit',
  'on_play',
  'on_resolve',
  'on_death',
  'on_turn_end',
  'passive',
]);

const HERO_DISPATCHABLE = new Set(['on_recruit', 'on_play', 'on_resolve', 'on_death', 'on_turn_end']);

export function dispatch_effects(state, card, trigger, slot_index = 0, side = SIDE_HERO) {
  if (!card?.effects?.length) return;
  for (const effect of card.effects) {
    const effect_trigger = effect.trigger ?? 'on_resolve';
    if (effect_trigger !== trigger) continue;
    if (side === SIDE_HERO) apply_hero_effect(state, effect, card, slot_index);
    else                    apply_monster_effect(state, effect, card, slot_index);
  }
}

export function card_has_trigger(card, trigger) {
  if (!card?.effects?.length) return false;
  for (const effect of card.effects) {
    if ((effect.trigger ?? 'on_resolve') === trigger) return true;
  }
  return false;
}

export function apply_hero_effect(state, effect, source_card, slot_index = 0) {
  switch (effect.type) {

    case 'transform': {
      const transform_candidates = [];
      for (const zone_key of (effect.zones ?? ['field'])) {
        if (zone_key === 'field') {
          for (let field_slot_index = 0; field_slot_index < state.fight.hero_field.length; field_slot_index++) {
            const field_card = state.fight.hero_field[field_slot_index];
            if (!field_card) continue;
            if (effect.target.match === 'id'   && field_card.id   === effect.target.value) transform_candidates.push({ zone: 'field', index: field_slot_index, card: field_card });
            if (effect.target.match === 'type' && field_card.type === effect.target.value) transform_candidates.push({ zone: 'field', index: field_slot_index, card: field_card });
          }
        } else {
          const zone_array = state.run[zone_key];
          if (!zone_array) continue;
          for (let zone_card_index = 0; zone_card_index < zone_array.length; zone_card_index++) {
            const zone_card = zone_array[zone_card_index];
            if (!zone_card) continue;
            if (effect.target.match === 'id'   && zone_card.id   === effect.target.value) transform_candidates.push({ zone: zone_key, index: zone_card_index, card: zone_card });
            if (effect.target.match === 'type' && zone_card.type === effect.target.value) transform_candidates.push({ zone: zone_key, index: zone_card_index, card: zone_card });
          }
        }
      }
      if (transform_candidates.length === 0) {
        _log_entry(`${source_card.name}: no transform target found.`, 'log-effect');
        break;
      }
      const chosen_candidate    = _pick_random(transform_candidates);
      const replacement_def     = _find_card_def_by_id(effect.replace_with);
      if (!replacement_def) break;
      const replacement_card = _create_card_instance(replacement_def);
      if (chosen_candidate.zone === 'field') {
        replacement_card.active = chosen_candidate.card.active;
        state.fight.hero_field[chosen_candidate.index] = replacement_card;
      } else {
        state.run[chosen_candidate.zone][chosen_candidate.index] = replacement_card;
      }
      _log_entry(`${source_card.name}: ${chosen_candidate.card.name} → ${replacement_card.name} (${chosen_candidate.zone}).`, 'log-effect');
      break;
    }

    case 'stun': {
      let stun_targets = [];
      if (effect.selection === 'opposite') {
        stun_targets = _get_opposite_cards(state, SIDE_HERO, slot_index).filter(Boolean);
      } else {
        const picked_monster = _pick_random(state.fight.monster_field.filter(Boolean));
        if (picked_monster) stun_targets = [picked_monster];
      }
      if (stun_targets.length === 0) {
        _log_entry(`${source_card.name}: stun — no target.`, 'log-effect');
        break;
      }
      for (const stun_target of stun_targets) {
        stun_target.active = false;
        _log_entry(`${source_card.name}: ${stun_target.name} stunned!`, 'log-effect');
      }
      break;
    }

    case 'recur': {
      const recur_candidates = state.run.discard.filter(discard_card =>
        discard_card.type === 'hero' || discard_card.type === 'starter' || discard_card.type === 'promoted'
      );
      if (recur_candidates.length === 0) {
        _log_entry(`${source_card.name}: no hero in discard to recur.`, 'log-effect');
        break;
      }
      const recur_target = _pick_random(recur_candidates);
      state.run.discard.splice(state.run.discard.indexOf(recur_target), 1);
      let placed_at_slot = -1;
      for (let hero_slot_index = 0; hero_slot_index < state.fight.hero_field.length; hero_slot_index++) {
        if (!state.fight.hero_field[hero_slot_index]) {
          recur_target.active   = true;
          recur_target.resolved = false;
          state.fight.hero_field[hero_slot_index] = recur_target;
          placed_at_slot = hero_slot_index;
          break;
        }
      }
      if (placed_at_slot !== -1) {
        recur_target.injected = true;
        state.turn.active_resolution_sequence.splice(state.turn.resolving_step + 1, 0, { side: SIDE_HERO, slot: placed_at_slot });
        _log_entry(`${source_card.name}: ${recur_target.name} recalled from discard.`, 'log-effect');
      } else {
        state.run.discard.push(recur_target);
        _log_entry(`${source_card.name}: recur — no empty slot, returned to discard.`, 'log-effect');
      }
      break;
    }

    case 'shield_drain': {
      const drained_amount = Math.min(state.fight.monster_shield, effect.amount);
      state.fight.monster_shield = Math.max(0, state.fight.monster_shield - drained_amount);
      _log_entry(`${source_card.name}: monster shield -${drained_amount}.`, 'log-effect');
      break;
    }

    case 'weaken_atk': {
      state.turn.atk_weakened_next += effect.amount;
      _log_entry(`${source_card.name}: ${state.fight.big_bad.name} ATK -${effect.amount} next turn.`, 'log-effect');
      break;
    }

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

    case 'kill_monster': {

      const monster_tier = state.fight.big_bad?.tier ?? DEFAULT_MONSTER_TIER_FALLBACK;
      const eligible_monster_pool = _get_monster_pool(monster_tier)
        .filter(monster_def => !state.fight.monster_excluded_ids.has(monster_def.id));
      if (eligible_monster_pool.length === 0) {
        _log_entry(`${source_card.name}: all monster types already purged.`, 'log-effect');
        break;
      }
      const purged_monster_def = _pick_random(eligible_monster_pool);
      state.fight.monster_excluded_ids.add(purged_monster_def.id);
      _log_entry(`${source_card.name}: ${purged_monster_def.name} banished from this fight!`, 'log-effect');
      break;
    }

    case 'cleanse': {
      let total_cleansed = 0;
      for (const zone_key of effect.zones) {
        const zone_cards = zone_key === 'field'
          ? state.fight.hero_field.filter(Boolean)
          : state.run[zone_key];
        if (!zone_cards) continue;
        const corrupted_cards = zone_cards.filter(zone_card => zone_card.corrupted);
        const cards_to_cleanse = effect.count === 'all'
          ? corrupted_cards
          : corrupted_cards.slice(0, effect.count);
        for (const card_to_cleanse of cards_to_cleanse) {
          card_to_cleanse.corrupted = false;
          total_cleansed++;
        }
      }
      _log_entry(`${source_card.name}: cleansed ${total_cleansed} corrupted card(s).`, 'log-effect');
      break;
    }

    case 'haste': {
      const next_pending = find_next_pending_step(state, effect.target_side);
      if (!next_pending) {
        _log_entry(`${source_card.name}: haste — no eligible ${effect.target_side} step pending.`, 'log-effect');
        break;
      }
      state.turn.active_resolution_sequence.splice(next_pending.seq_index, 1);
      state.turn.active_resolution_sequence.splice(state.turn.resolving_step + 1, 0, next_pending.step);
      const target_field = effect.target_side === 'hero' ? state.fight.hero_field : state.fight.monster_field;
      const target_label = target_field[next_pending.step.slot]?.name ?? effect.target_side;
      _log_entry(`${source_card.name}: ${target_label} hasted — acts next!`, 'log-effect');
      break;
    }

    case 'slow': {
      const next_pending = find_next_pending_step(state, effect.target_side);
      if (!next_pending) {
        _log_entry(`${source_card.name}: slow — no eligible ${effect.target_side} step pending.`, 'log-effect');
        break;
      }
      state.turn.active_resolution_sequence.splice(next_pending.seq_index, 1);
      state.turn.active_resolution_sequence.push(next_pending.step);
      const target_field = effect.target_side === 'hero' ? state.fight.hero_field : state.fight.monster_field;
      const target_label = target_field[next_pending.step.slot]?.name ?? effect.target_side;
      _log_entry(`${source_card.name}: ${target_label} slowed — acts last!`, 'log-effect');
      break;
    }

    case 'stop': {
      const next_pending = find_next_pending_step(state, effect.target_side);
      if (!next_pending) {
        _log_entry(`${source_card.name}: stop — no eligible ${effect.target_side} step pending.`, 'log-effect');
        break;
      }
      const target_side_key  = next_pending.step.side;
      const target_slot      = next_pending.step.slot;
      const pending_start_index = state.turn.resolving_step + 1;
      let removed_step_count = 0;
      state.turn.active_resolution_sequence = state.turn.active_resolution_sequence.filter(
        (sequence_step, sequence_index) => {
          if (sequence_index >= pending_start_index
              && sequence_step.side === target_side_key
              && sequence_step.slot === target_slot) {
            removed_step_count++;
            return false;
          }
          return true;
        }
      );
      const target_field = effect.target_side === 'hero' ? state.fight.hero_field : state.fight.monster_field;
      const target_label = target_field[target_slot]?.name ?? effect.target_side;
      _log_entry(`${source_card.name}: ${target_label} stopped — ${removed_step_count} step(s) removed!`, 'log-effect');
      break;
    }

    case 'draw': {
      const cards_to_draw = effect.amount ?? DEFAULT_DRAW_COUNT;
      let cards_drawn = 0;
      for (let draw_attempt = 0; draw_attempt < cards_to_draw; draw_attempt++) {
        if (state.run.deck.length === 0) {
          if (state.run.discard.length === 0) break;
          state.run.deck    = _shuffle_array(state.run.discard);
          state.run.discard = [];
          _log_entry('Deck reshuffled from discard.', 'log-phase');
        }
        state.run.hand.push(state.run.deck.pop());
        cards_drawn++;
      }
      if (cards_drawn > 0) _log_entry(`${source_card.name}: drew ${cards_drawn} card(s).`, 'log-effect');
      else                 _log_entry(`${source_card.name}: draw — no cards available.`, 'log-effect');
      break;
    }

    case 'scrap': {
      let scrap_candidates = [];
      if (effect.target === 'starter') {
        scrap_candidates = [
          ...state.run.hand.filter(hand_card => hand_card.type === 'starter'),
          ...state.run.discard.filter(discard_card => discard_card.type === 'starter'),
        ];
      } else if (effect.target === 'any_hand') {
        scrap_candidates = state.run.hand.filter(hand_card => hand_card.uid !== source_card.uid);
      } else if (effect.target === 'any_discard') {
        scrap_candidates = [...state.run.discard];
      }
      if (scrap_candidates.length === 0) {
        _log_entry(`${source_card.name}: scrap — no eligible target.`, 'log-effect');
        break;
      }
      const scrapped_card = _pick_random(scrap_candidates);
      state.run.hand    = state.run.hand.filter(hand_card => hand_card.uid !== scrapped_card.uid);
      state.run.discard = state.run.discard.filter(discard_card => discard_card.uid !== scrapped_card.uid);
      state.run.deck    = state.run.deck.filter(deck_card => deck_card.uid !== scrapped_card.uid);
      _log_entry(`${source_card.name}: ${scrapped_card.name} scrapped permanently!`, 'log-effect');
      break;
    }

    case 'cost_reduce': {
      state.turn.cost_reduce_next += effect.amount;
      _log_entry(`${source_card.name}: next recruit costs ${effect.amount} less Gold.`, 'log-effect');
      break;
    }

    case 'field_bonus': {
      let bonus_multiplier = MULTIPLIER_FALSE;
      if (effect.condition === 'adjacent_role_match') {
        bonus_multiplier = _get_adjacent_cards(state, SIDE_HERO, slot_index)
          .some(adjacent_card => adjacent_card.role === source_card.role) ? MULTIPLIER_TRUE : MULTIPLIER_FALSE;
      } else if (effect.condition === 'field_count_gte') {
        bonus_multiplier = state.fight.hero_field.filter(Boolean).length >= (effect.threshold ?? DEFAULT_FIELD_COUNT_THRESHOLD)
          ? MULTIPLIER_TRUE
          : MULTIPLIER_FALSE;
      } else if (effect.condition === 'per_role_match') {
        const target_role = effect.role ?? source_card.role;
        bonus_multiplier = state.fight.hero_field.filter(
          field_card => field_card && field_card.uid !== source_card.uid && field_card.role === target_role
        ).length;
      }
      if (bonus_multiplier === MULTIPLIER_FALSE) {
        _log_entry(`${source_card.name}: field bonus — condition not met.`, 'log-effect');
        break;
      }
      const total_bonus = effect.amount * bonus_multiplier;
      if (effect.stat === 'atk') {
        source_card.temp_atk_mod += total_bonus;
        _log_entry(`${source_card.name}: field bonus — +${total_bonus} ATK!`, 'log-effect');
      } else if (effect.stat === 'gold') {
        state.fight.gold_pool += total_bonus;
        _log_entry(`${source_card.name}: field bonus — +${total_bonus} Gold!`, 'log-effect');
      } else if (effect.stat === 'shield') {
        state.fight.city_def += total_bonus;
        _log_entry(`${source_card.name}: field bonus — +${total_bonus} Defence!`, 'log-effect');
      } else if (effect.stat === 'morale') {
        state.fight.city_morale = Math.min(state.fight.city.max_morale, state.fight.city_morale + total_bonus);
        _log_entry(`${source_card.name}: field bonus — +${total_bonus} Morale!`, 'log-effect');
      }
      break;
    }

    case 'gain_gold': {
      state.fight.gold_pool += effect.amount;
      _log_entry(`${source_card.name}: +${effect.amount} Gold.`, 'log-effect');
      break;
    }

    case 'gain_morale': {
      state.fight.city_morale = Math.min(
        state.fight.city.max_morale,
        state.fight.city_morale + effect.amount,
      );
      _log_entry(`${source_card.name}: +${effect.amount} Morale.`, 'log-morale');
      break;
    }

    case 'gain_shield': {
      state.fight.city_def += effect.amount;
      _log_entry(`${source_card.name}: +${effect.amount} City Defence.`, 'log-effect');
      break;
    }

    case 'damage': {
      const damage_amount = effect.amount ?? DEFAULT_DAMAGE_AMOUNT;
      const damage_target = effect.target ?? 'big_bad';
      if (damage_target !== 'big_bad') {
        console.warn(`damage: unsupported target '${damage_target}'.`);
        break;
      }
      const blocked_amount = effect.pierce ? 0 : Math.min(state.fight.monster_shield, damage_amount);
      const dealt_amount   = damage_amount - blocked_amount;
      if (!effect.pierce) state.fight.monster_shield -= blocked_amount;
      if (dealt_amount > 0) {
        state.fight.big_bad.hp = Math.max(0, state.fight.big_bad.hp - dealt_amount);
        _log_entry(`${source_card.name}: ${dealt_amount} damage to ${state.fight.big_bad.name}.`, 'log-hero');
      } else {
        _log_entry(`${source_card.name}: damage absorbed.`, 'log-hero');
      }
      break;
    }

    case 'summon_ally': {
      const ally_def = _find_card_def_by_id(effect.card_id);
      if (!ally_def) {
        console.warn(`summon_ally: unknown card id '${effect.card_id}'.`);
        break;
      }
      const empty_slot_index = state.fight.hero_field.indexOf(null);
      if (empty_slot_index === -1) {
        _log_entry(`${source_card.name}: summon — no empty slot.`, 'log-effect');
        break;
      }
      const summoned_card = _create_card_instance(ally_def);
      summoned_card.active   = true;
      summoned_card.resolved = false;
      summoned_card.injected = true;
      state.fight.hero_field[empty_slot_index] = summoned_card;
      state.turn.active_resolution_sequence.splice(
        state.turn.resolving_step + 1, 0, { side: SIDE_HERO, slot: empty_slot_index }
      );
      _log_entry(`${source_card.name}: summoned ${summoned_card.name}!`, 'log-effect');
      break;
    }

    default:
      console.warn(`apply_hero_effect: unknown effect type '${effect.type}' on card '${source_card.id}'.`);
      break;
  }
}

function find_next_pending_step(state, target_side) {
  const side_key            = target_side === 'hero' ? SIDE_HERO : SIDE_MONSTER;
  const target_field        = target_side === 'hero' ? state.fight.hero_field : state.fight.monster_field;
  const pending_start_index = state.turn.resolving_step + 1;
  const seen_slot_indexes   = new Set();
  const pending_candidates  = [];
  for (let sequence_index = pending_start_index; sequence_index < state.turn.active_resolution_sequence.length; sequence_index++) {
    const sequence_step = state.turn.active_resolution_sequence[sequence_index];
    if (sequence_step.side !== side_key)             continue;
    if (seen_slot_indexes.has(sequence_step.slot))   continue;
    if (!target_field[sequence_step.slot])           continue;
    if (!target_field[sequence_step.slot].active)    continue;
    seen_slot_indexes.add(sequence_step.slot);
    pending_candidates.push({ step: sequence_step, seq_index: sequence_index });
  }
  return pending_candidates.length === 0 ? null : _pick_random(pending_candidates);
}

export function apply_monster_effect(state, effect, source_card, slot_index = 0) {
  switch (effect.type) {

    case 'kill': {
      const killable_heroes = state.fight.hero_field.filter(Boolean);
      if (killable_heroes.length === 0) {
        _log_entry(`${source_card.name}: kill — no hero target.`, 'log-effect');
        break;
      }
      const killed_hero     = _pick_random(killable_heroes);
      const killed_hero_slot_index = state.fight.hero_field.indexOf(killed_hero);

      for (const death_effect of (killed_hero.effects ?? [])) {
        if ((death_effect.trigger ?? 'on_resolve') === 'on_death') {
          apply_hero_effect(state, death_effect, killed_hero, killed_hero_slot_index);
        }
      }

      if (killed_hero.death_prevented) {
        killed_hero.death_prevented = false;
        _log_entry(`${source_card.name}: ${killed_hero.name} survived a killing blow!`, 'log-effect');
        break;
      }

      state.fight.hero_field[killed_hero_slot_index] = null;
      state.run.deck    = state.run.deck.filter(deck_card    => deck_card.uid    !== killed_hero.uid);
      state.run.hand    = state.run.hand.filter(hand_card    => hand_card.uid    !== killed_hero.uid);
      state.run.discard = state.run.discard.filter(discard_card => discard_card.uid !== killed_hero.uid);
      _log_entry(`${source_card.name}: ${killed_hero.name} slain and deleted from the run!`, 'log-monster');
      break;
    }

    default:
      console.warn(`apply_monster_effect: unknown effect type '${effect.type}' on card '${source_card.id}'.`);
      break;
  }
}
