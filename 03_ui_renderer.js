
import {
  FIELD_SIZE_MAX, MONSTER_SLOTS, FIGHTS_PER_RUN, UPGRADE_CHOICE_COUNT,
  LOG_MAX_ENTRIES, MARKET_LEVEL_MAX, MARKET_UPGRADE_COSTS,
} from './00_core_constants.js';

import { App } from './00_core_app.js';

const SIDE_HERO                       = 'H';
const SIDE_MONSTER                    = 'M';
const SVG_NAMESPACE                   = 'http://www.w3.org/2000/svg';
const IN_FIGHT_SPRITE_SIZE            = 64;
const CARD_CANVAS_LARGE_WIDTH         = 180;
const CARD_CANVAS_LARGE_HEIGHT        = 140;
const CARD_CANVAS_NORMAL_WIDTH        = 120;
const CARD_CANVAS_NORMAL_HEIGHT       = 100;
const LOCKED_SLOT_CANVAS_WIDTH        = 128;
const LOCKED_SLOT_CANVAS_HEIGHT       = 148;
const NOTIFICATION_DURATION_MS        = 1200;
const BADGE_TWO_DIGIT_FONT_THRESHOLD  = 9;
const WEAK_BONUS_DISPLAY_PERCENT      = 50;
const RESIST_PENALTY_DISPLAY_PERCENT  = 50;

let _start_new_run;
let _begin_fight;
let _on_phase_btn;
let _quick_play_all;
let _on_hand_card_click;
let _on_hero_slot_click;
let _on_market_card_click;
let _on_unlock_market_slot;
let _on_upgrade_market_click;
let _on_forge_click;
let _get_forge_cost;
let _apply_upgrade;
let _apply_treasure;
let _apply_event_choice;

let _get_effective_market_size;
let _get_slot_unlock_cost;
let _get_card_cost;
let _create_card_instance;
let _shuffle_array;

export function clear_hand_selection() {
  App.ui_state.selected_hand_uid = null;
}

export function render() {
  const state = App.game_state;
  if (!state) return;
  render_stats(state);
  render_big_bad(state);
  render_city(state);
  render_shields(state);
  render_intent(state);
  render_treasures(state);
  render_field(state);
  render_hand(state);
  render_piles(state);
  render_market(state);
}

function render_treasures(state) {
  const treasure_panel = document.getElementById('treasure-inventory');
  if (!treasure_panel) return;
  treasure_panel.replaceChildren();
  const owned_treasures = state.run.treasures ?? [];
  if (owned_treasures.length === 0) return;
  for (const treasure of owned_treasures) {
    const treasure_chip = document.createElement('span');
    treasure_chip.className   = 'treasure-chip';
    treasure_chip.textContent = '✦ ' + treasure.name;
    treasure_chip.title       = treasure.desc;
    treasure_panel.appendChild(treasure_chip);
  }
}

function render_stats(state) {
  const phase          = state.turn.phase;
  const phase_btn_el   = document.getElementById('phase-btn');

  document.getElementById('turn-num').textContent        = state.turn.turn_number + 1;
  document.getElementById('gold-val').textContent        = state.fight.gold_pool;
  document.getElementById('market-gold-val').textContent = state.fight.gold_pool;

  if (phase === 'DRAW' || phase === 'BIG_BAD') {
    phase_btn_el.textContent = phase === 'DRAW' ? 'Drawing...' : 'Big Bad...';
    phase_btn_el.disabled    = true;
  } else if (phase === 'HEROES') {
    phase_btn_el.textContent = 'End Heroes';
    phase_btn_el.disabled    = false;
  } else if (phase.startsWith('RESOLVING')) {
    phase_btn_el.textContent = 'Resolving...';
    phase_btn_el.disabled    = true;
  } else if (phase === 'RECRUIT') {
    phase_btn_el.textContent = 'End Recruit';
    phase_btn_el.disabled    = false;
  } else {
    phase_btn_el.textContent = '—';
    phase_btn_el.disabled    = true;
  }

  const quick_play_btn_el = document.getElementById('quick-play-btn');
  quick_play_btn_el.style.display = (phase === 'HEROES') ? 'inline-block' : 'none';
}

function render_big_bad(state) {
  const big_bad = state.fight.big_bad;
  if (!big_bad) return;
  document.getElementById('bb-name').textContent = big_bad.name;
  document.getElementById('bb-sub').textContent  = big_bad.title;
  document.getElementById('bb-hp').textContent   = `${big_bad.hp}/${big_bad.max_hp}`;
  document.getElementById('bb-atk').textContent  = big_bad.atk;
  document.getElementById('bb-mpt').textContent  = big_bad.monsters_per_turn;
  paint_sprite_scaled(document.getElementById('bb-sprite'), big_bad_art[big_bad.id], IN_FIGHT_SPRITE_SIZE, IN_FIGHT_SPRITE_SIZE);
}

function render_city(state) {
  const city = state.fight.city;
  if (!city) return;
  document.getElementById('city-name').textContent        = city.name;
  document.getElementById('city-sub').textContent         = city.type;
  document.getElementById('city-morale').textContent      = `${state.fight.city_morale}/${city.max_morale}`;
  document.getElementById('city-def-display').textContent = state.fight.city_def;
  document.getElementById('city-effects-mini').textContent =
    city.effects.map(city_effect => city_effect.desc).join(' | ');

  const effective_market_size = _get_effective_market_size(state);
  document.getElementById('city-market-size').textContent = `${effective_market_size}/${FIELD_SIZE_MAX}`;

  paint_sprite_scaled(document.getElementById('city-sprite'), city_art[city.id], IN_FIGHT_SPRITE_SIZE, IN_FIGHT_SPRITE_SIZE);
}

function render_intent(state) {
  const intent_panel = document.getElementById('bb-intent-panel');
  if (!intent_panel) return;

  const next_intent = state.fight.next_intent;
  if (!next_intent) { intent_panel.replaceChildren(); intent_panel.classList.add('hidden'); return; }
  intent_panel.classList.remove('hidden');
  intent_panel.replaceChildren();

  const intent_label = document.createElement('span');
  intent_label.className   = 'bb-intent-label';
  intent_label.textContent = 'NEXT TURN:';
  intent_panel.appendChild(intent_label);

  const atk_pill = document.createElement('span');
  atk_pill.className   = 'bb-intent-pill bb-intent-atk';
  atk_pill.textContent = `⚔ ${next_intent.atk}`;
  atk_pill.title       = `${state.fight.big_bad.name} will strike the city for ${next_intent.atk} damage.`;
  intent_panel.appendChild(atk_pill);

  if (next_intent.monsters.length === 0) {
    const none_pill = document.createElement('span');
    none_pill.className   = 'bb-intent-pill bb-intent-empty';
    none_pill.textContent = 'no summons';
    intent_panel.appendChild(none_pill);
  } else {
    for (const monster_def of next_intent.monsters) {
      const monster_pill = document.createElement('span');
      monster_pill.className   = `bb-intent-pill bb-intent-monster role-${monster_def.role}`;
      monster_pill.textContent = monster_def.name;
      monster_pill.title       = monster_def.desc;
      intent_panel.appendChild(monster_pill);
    }
  }
}

function render_shields(state) {
  const show_pill = (pill_id, value_id, displayed_value) => {
    const pill_el  = document.getElementById(pill_id);
    const value_el = document.getElementById(value_id);
    if (displayed_value > 0) { pill_el.classList.remove('hidden'); value_el.textContent = displayed_value; }
    else                       pill_el.classList.add('hidden');
  };
  show_pill('city-def-pill',   'city-def-val',  state.fight.city_def);
  show_pill('mon-shield-pill', 'mon-shield-val', state.fight.monster_shield);
}

function render_field(state) {
  const phase              = state.turn.phase;
  const is_recruit_phase   = (phase === 'RECRUIT');
  const monster_row_el     = document.getElementById('monster-row');
  const hero_row_el        = document.getElementById('hero-row');
  const monster_arrow_el   = document.getElementById('monster-order-arrow');
  const hero_arrow_el      = document.getElementById('hero-order-arrow');

  if (is_recruit_phase) {
    monster_row_el.replaceChildren();
    hero_row_el.replaceChildren();
    monster_arrow_el.style.display = 'none';
    hero_arrow_el.style.display    = 'none';
    return;
  }

  let resolving_hero_slot    = -1;
  let resolving_monster_slot = -1;
  if (phase === 'RESOLVING') {
    const resolving_step = state.turn.active_resolution_sequence[state.turn.resolving_step];
    if (resolving_step) {
      if (resolving_step.side === SIDE_HERO)    resolving_hero_slot    = resolving_step.slot;
      if (resolving_step.side === SIDE_MONSTER) resolving_monster_slot = resolving_step.slot;
    }
  }

  monster_row_el.replaceChildren();
  monster_row_el.appendChild(make_spacer('monster-spacer-lead'));
  for (let monster_slot_index = 0; monster_slot_index < MONSTER_SLOTS; monster_slot_index++) {
    const monster_card = state.fight.monster_field[monster_slot_index];
    if (!monster_card) {
      const empty_slot_el = make_empty_slot('M' + (monster_slot_index + 1));
      empty_slot_el.style.cursor = 'default';
      monster_row_el.appendChild(empty_slot_el);
    } else {
      const monster_card_el = make_card_element(monster_card, false, monster_slot_index === resolving_monster_slot);
      if (monster_card.resolved) monster_card_el.classList.add('inactive');
      monster_row_el.appendChild(monster_card_el);
    }
    if (monster_slot_index < MONSTER_SLOTS - 1) monster_row_el.appendChild(make_spacer('monster-spacer'));
  }
  monster_row_el.appendChild(make_spacer('monster-spacer-lead'));

  const show_arrows = (phase === 'HEROES' || phase === 'RESOLVING');
  monster_arrow_el.style.display = show_arrows ? 'flex' : 'none';

  hero_row_el.replaceChildren();
  for (let hero_slot_index = 0; hero_slot_index < FIELD_SIZE_MAX; hero_slot_index++) {
    hero_row_el.appendChild(make_spacer('hero-spacer'));
    const hero_card = state.fight.hero_field[hero_slot_index];
    if (!hero_card) {
      const empty_slot_el = make_empty_slot('H' + (hero_slot_index + 1));
      if (phase === 'HEROES') empty_slot_el.addEventListener('click', () => _on_hero_slot_click(hero_slot_index));
      hero_row_el.appendChild(empty_slot_el);
    } else {
      const hero_card_el = make_card_element(hero_card, hero_card.uid === App.ui_state.selected_hand_uid, hero_slot_index === resolving_hero_slot);
      if (phase === 'HEROES') hero_card_el.addEventListener('click', () => _on_hero_slot_click(hero_slot_index));
      if (hero_card.resolved) hero_card_el.classList.add('inactive');
      hero_row_el.appendChild(hero_card_el);
    }
  }
  hero_row_el.appendChild(make_spacer('hero-spacer'));
  hero_arrow_el.style.display = show_arrows ? 'flex' : 'none';
}

function render_hand(state) {
  const hand_row_el = document.getElementById('hand-row');
  hand_row_el.replaceChildren();
  for (const hand_card of state.run.hand) {
    const hand_card_el = make_card_element(hand_card, hand_card.uid === App.ui_state.selected_hand_uid, false);
    if (state.turn.phase === 'HEROES') {
      hand_card_el.classList.add('hand-card');
      hand_card_el.addEventListener('click', () => _on_hand_card_click(hand_card.uid));
    }
    hand_row_el.appendChild(hand_card_el);
  }
}

function render_piles(state) {
  const draw_pile_count    = state.run.deck.length;
  const discard_pile_count = state.run.discard.length;

  const draw_pile_widget = document.getElementById('draw-pile-widget');
  document.getElementById('draw-pile-count').textContent = draw_pile_count;
  draw_pile_widget.classList.toggle('empty', draw_pile_count === 0);

  const discard_pile_widget = document.getElementById('discard-pile-widget');
  const discard_pile_face   = document.getElementById('discard-pile-face');
  document.getElementById('discard-pile-count').textContent = discard_pile_count;
  discard_pile_widget.classList.toggle('empty',   discard_pile_count === 0);
  discard_pile_face.classList.toggle('has-cards', discard_pile_count > 0);
}

function render_market(state) {
  const board_el    = document.getElementById('fight-board');
  const hero_row_el = document.getElementById('hero-row');

  if (state.turn.phase !== 'RECRUIT') {
    board_el.classList.remove('bazaar');
    document.getElementById('market-upgrade-slot').replaceChildren();
    document.getElementById('market-board-label').textContent = '';
    return;
  }

  board_el.classList.add('bazaar');
  hero_row_el.replaceChildren();
  document.getElementById('market-board-label').textContent =
    `⚔ Bazaar — Market Level ${state.fight.market_level} — Spend Gold to Recruit`;

  render_market_upgrade_slot(state);

  const effective_market_size = _get_effective_market_size(state);
  const slot_unlock_cost      = _get_slot_unlock_cost(state);

  for (let market_slot_index = 0; market_slot_index < FIELD_SIZE_MAX; market_slot_index++) {
    hero_row_el.appendChild(make_spacer('hero-spacer'));
    hero_row_el.appendChild(
      market_slot_index < effective_market_size
        ? make_market_active_slot(state, market_slot_index)
        : make_market_locked_slot(slot_unlock_cost, state.fight.gold_pool)
    );
  }
  hero_row_el.appendChild(make_spacer('hero-spacer'));
}

function render_market_upgrade_slot(state) {
  const upgrade_slot_container = document.getElementById('market-upgrade-slot');
  upgrade_slot_container.replaceChildren();

  const next_market_level = state.fight.market_level + 1;
  if (next_market_level > MARKET_LEVEL_MAX) {
    const maxed_label = document.createElement('div');
    maxed_label.className   = 'market-upgrade-maxed';
    maxed_label.textContent = 'Market fully unlocked';
    upgrade_slot_container.appendChild(maxed_label);
  } else {
    const upgrade_cost = MARKET_UPGRADE_COSTS[next_market_level];
    if (upgrade_cost === undefined) {
      console.warn(`render_market_upgrade_slot: no cost defined for level ${next_market_level}.`);
    } else {
      const can_afford_upgrade = state.fight.gold_pool >= upgrade_cost;
      const upgrade_btn        = document.createElement('button');
      upgrade_btn.className    = `market-upgrade-btn${can_afford_upgrade ? '' : ' locked'}`;
      upgrade_btn.textContent  = `Unlock Level ${next_market_level} Cards — ${upgrade_cost} Gold`;
      upgrade_btn.disabled     = !can_afford_upgrade;
      if (can_afford_upgrade) upgrade_btn.addEventListener('click', () => _on_upgrade_market_click());
      upgrade_slot_container.appendChild(upgrade_btn);
    }
  }

  const forge_cost = _get_forge_cost(state);
  if (forge_cost !== null) {
    const can_afford_forge = state.fight.gold_pool >= forge_cost;
    const forge_btn        = document.createElement('button');
    forge_btn.className    = `forge-btn${can_afford_forge ? '' : ' locked'}`;
    forge_btn.textContent  = `🔥 Forge: scrap a Starter — ${forge_cost} Gold`;
    forge_btn.title        = 'Permanently remove a random Starter from your deck. Cost rises with each use this fight.';
    forge_btn.disabled     = !can_afford_forge;
    if (can_afford_forge) forge_btn.addEventListener('click', () => _on_forge_click());
    upgrade_slot_container.appendChild(forge_btn);
  }
}

function make_market_active_slot(state, market_slot_index) {
  const market_card = state.fight.market[market_slot_index];
  if (!market_card) {
    const empty_slot_el = make_empty_slot('');
    empty_slot_el.style.cursor = 'default';
    return empty_slot_el;
  }
  const recruit_cost = _get_card_cost(market_card, state.fight.city);
  const can_afford   = state.fight.gold_pool >= recruit_cost;
  const card_el      = make_card_element(market_card, false, false, recruit_cost);
  if (can_afford) {
    card_el.addEventListener('click', () => _on_market_card_click(market_card.uid));
  } else {
    card_el.style.opacity = '0.5';
    card_el.style.cursor  = 'default';
  }
  return card_el;
}

function make_market_locked_slot(slot_unlock_cost, available_gold) {
  const can_afford      = slot_unlock_cost !== null && available_gold >= slot_unlock_cost;
  const locked_slot_el  = make_locked_slot(slot_unlock_cost, can_afford);
  if (can_afford) locked_slot_el.addEventListener('click', () => _on_unlock_market_slot());
  return locked_slot_el;
}

function render_card_preview(card) {
  if (!card) { clear_card_preview(); return; }
  const preview_el = document.getElementById('preview-card');
  const type_class = card.subtype === 'atk' ? 'card-atk' : `card-${card.type}`;
  const role_class = card.role ? `role-${card.role}` : '';
  preview_el.className = `card ${type_class} ${role_class}`.trim();
  render_card_into_element(card, preview_el, true);
}

function clear_card_preview() {
  const preview_el     = document.getElementById('preview-card');
  preview_el.className = 'card';
  preview_el.replaceChildren();
}

function make_card_element(card, is_selected, is_resolving, display_cost = null) {
  const type_class = card.subtype === 'atk' ? 'card-atk' : `card-${card.type}`;
  const role_class = card.role ? `role-${card.role}` : '';
  const card_el    = document.createElement('div');
  card_el.className = `card ${type_class} ${role_class}`.trim();
  if (is_selected)  card_el.classList.add('selected-from-hand');
  if (is_resolving) card_el.classList.add('resolving');
  render_card_into_element(card, card_el, false, display_cost);
  card_el.addEventListener('mouseenter', () => render_card_preview(card));
  card_el.addEventListener('mouseleave', () => clear_card_preview());
  return card_el;
}

const LEVEL_COLOURS = {
   0:  { fill: '#6b7280', stroke: '#9ca3af', text: '#e5e7eb' },
   1:  { fill: '#16a34a', stroke: '#4ade80', text: '#dcfce7' },
   2:  { fill: '#1d4ed8', stroke: '#60a5fa', text: '#dbeafe' },
   3:  { fill: '#b91c1c', stroke: '#f87171', text: '#fee2e2' },
   4:  { fill: '#7e22ce', stroke: '#c084fc', text: '#f3e8ff' },
   5:  { fill: '#a16207', stroke: '#fbbf24', text: '#fef9c3' },
  20:  { fill: '#450a0a', stroke: '#991b1b', text: '#fca5a5' },
};
const LEVEL_COLOUR_DEFAULT = { fill: '#374151', stroke: '#6b7280', text: '#d1d5db' };

function make_badge(badge_value, colours, css_class) {
  const svg_el = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg_el.setAttribute('viewBox', '0 0 28 28');
  svg_el.setAttribute('width',   '26');
  svg_el.setAttribute('height',  '26');
  svg_el.classList.add(css_class);

  const ring_circle = document.createElementNS(SVG_NAMESPACE, 'circle');
  ring_circle.setAttribute('cx', '14'); ring_circle.setAttribute('cy', '14'); ring_circle.setAttribute('r', '13');
  ring_circle.setAttribute('fill', 'none'); ring_circle.setAttribute('stroke', '#ffffff');
  ring_circle.setAttribute('stroke-width', '2'); ring_circle.setAttribute('opacity', '0.25');

  const fill_circle = document.createElementNS(SVG_NAMESPACE, 'circle');
  fill_circle.setAttribute('cx', '14'); fill_circle.setAttribute('cy', '14'); fill_circle.setAttribute('r', '12');
  fill_circle.setAttribute('fill', colours.fill); fill_circle.setAttribute('stroke', colours.stroke);
  fill_circle.setAttribute('stroke-width', '1.5');

  const value_text_el = document.createElementNS(SVG_NAMESPACE, 'text');
  value_text_el.setAttribute('x', '14'); value_text_el.setAttribute('y', '19');
  value_text_el.setAttribute('text-anchor', 'middle');
  value_text_el.setAttribute('font-size',   badge_value > BADGE_TWO_DIGIT_FONT_THRESHOLD ? '11' : '13');
  value_text_el.setAttribute('font-weight', 'bold');
  value_text_el.setAttribute('font-family', 'sans-serif');
  value_text_el.setAttribute('fill',        colours.text);
  value_text_el.setAttribute('pointer-events', 'none');
  value_text_el.textContent = badge_value ?? '?';

  svg_el.appendChild(ring_circle); svg_el.appendChild(fill_circle); svg_el.appendChild(value_text_el);
  return svg_el;
}

function make_level_badge(level) {
  return make_badge(level, LEVEL_COLOURS[level] ?? LEVEL_COLOUR_DEFAULT, 'level-badge');
}

function make_cost_badge(cost) {
  return make_badge(cost, { fill: '#a16207', stroke: '#fbbf24', text: '#000000' }, 'cost-badge');
}

const PIP_CONFIG = {
  'atk-physical': { icon: '⚔',  label: 'DMG',     colour: '#dd5555' },
  'atk-magical':  { icon: '✦',  label: 'DMG',     colour: '#9977dd' },
  'blocked':      { icon: '🛡',  label: 'BLOCKED', colour: '#5599dd' },
  'shield':       { icon: '🛡',  label: 'DEF',     colour: '#5599dd' },
  'gold':         { icon: '◆',  label: 'GOLD',    colour: '#d4b050' },
  'drain':        { icon: '◆',  label: 'DRAIN',   colour: '#d4b050' },
  'morale':       { icon: '♥',  label: 'MORALE',  colour: '#55bb77' },
  'morale-neg':   { icon: '♥',  label: 'MORALE',  colour: '#dd5555' },
};

function make_resolution_pips(pips) {
  const pip_overlay = document.createElement('div');
  pip_overlay.className = 'pip-overlay';
  for (const pip of pips) {
    const pip_config = PIP_CONFIG[pip.type];
    if (!pip_config) continue;
    const pip_el = document.createElement('div');
    pip_el.className = `pip pip-${pip.type}`;
    pip_el.style.setProperty('--pip-colour', pip_config.colour);
    const icon_el  = document.createElement('span'); icon_el.className  = 'pip-icon';  icon_el.textContent  = pip_config.icon;
    const value_el = document.createElement('span'); value_el.className = 'pip-value'; value_el.textContent = Math.abs(pip.value);
    const label_el = document.createElement('span'); label_el.className = 'pip-label'; label_el.textContent = pip_config.label;
    pip_el.appendChild(icon_el); pip_el.appendChild(value_el); pip_el.appendChild(label_el);
    pip_overlay.appendChild(pip_el);
  }
  return pip_overlay;
}

function render_card_into_element(card, card_el, large = false, display_cost = null) {
  card_el.replaceChildren();

  const top_row_el = document.createElement('div');
  top_row_el.className = 'card-top';
  const name_span_el = document.createElement('span');
  name_span_el.className   = 'card-name';
  name_span_el.textContent = (card.name || '?').replace(
    /\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
  top_row_el.appendChild(name_span_el);
  card_el.appendChild(top_row_el);

  if (display_cost !== null && display_cost > 0) {
    const cost_badge_el = make_cost_badge(display_cost);
    cost_badge_el.classList.add('cost-badge-overlay');
    card_el.appendChild(cost_badge_el);
  }

  if (card.level !== undefined) {
    const level_badge_el = make_level_badge(card.level);
    level_badge_el.classList.add('level-badge-overlay');
    card_el.appendChild(level_badge_el);
  }

  const art_canvas = document.createElement('canvas');
  art_canvas.className = 'card-art';
  art_canvas.width     = large ? CARD_CANVAS_LARGE_WIDTH  : CARD_CANVAS_NORMAL_WIDTH;
  art_canvas.height    = large ? CARD_CANVAS_LARGE_HEIGHT : CARD_CANVAS_NORMAL_HEIGHT;
  art_canvas.style.imageRendering = 'pixelated';
  card_el.appendChild(art_canvas);
  if (typeof card.art === 'function') card.art(art_canvas);

  if (card.resolution_pips.length > 0) {
    card_el.appendChild(make_resolution_pips(card.resolution_pips));
  }

  if (card.keywords?.length) {
    const keyword_row_el = document.createElement('div');
    keyword_row_el.className = 'card-keywords';
    for (const keyword of card.keywords) {
      const keyword_chip = document.createElement('span');
      keyword_chip.className   = `kw-chip kw-${keyword}`;
      keyword_chip.textContent = KEYWORD_LABELS[keyword] ?? keyword;
      keyword_chip.title       = KEYWORD_DESCRIPTIONS[keyword] ?? keyword;
      keyword_row_el.appendChild(keyword_chip);
    }
    card_el.appendChild(keyword_row_el);
  }

  const desc_el = document.createElement('div');
  desc_el.className   = 'card-desc';
  desc_el.textContent = card.desc || '';
  card_el.appendChild(desc_el);
}

const KEYWORD_LABELS = {
  pierce:    'PIERCE',
  lifesteal: 'LIFESTEAL',
  taunt:     'TAUNT',
  charge:    'CHARGE',
  echo:      'ECHO',
};
const KEYWORD_DESCRIPTIONS = {
  pierce:    'ATK damage ignores Monster Shield.',
  lifesteal: 'ATK damage dealt also restores that much Morale.',
  taunt:     'Opposite Monster ATK is absorbed by this Hero. The Hero forfeits its action this turn.',
  charge:    'On recruit, this card goes to the top of your deck — guaranteed in your next draw.',
  echo:      'After resolving, returns to your hand instead of the discard pile.',
};

function make_empty_slot(label_text) {
  const slot_el = document.createElement('div');
  slot_el.className = 'card empty-slot';
  const label_el = document.createElement('span');
  label_el.className   = 'slot-label';
  label_el.textContent = label_text;
  slot_el.appendChild(label_el);
  return slot_el;
}

function make_locked_slot(unlock_cost, can_afford) {
  const slot_el = document.createElement('div');
  slot_el.className = `card locked-slot${can_afford ? ' can-afford' : ''}`;
  const stall_canvas = document.createElement('canvas');
  stall_canvas.width  = LOCKED_SLOT_CANVAS_WIDTH;
  stall_canvas.height = LOCKED_SLOT_CANVAS_HEIGHT;
  stall_canvas.className = 'locked-slot-canvas';
  paint_locked_stall(stall_canvas, can_afford);
  slot_el.appendChild(stall_canvas);
  const cost_label_el = document.createElement('div');
  cost_label_el.className   = 'locked-slot-label';
  cost_label_el.textContent = unlock_cost !== null ? `${unlock_cost} ◆ Unlock` : '—';
  slot_el.appendChild(cost_label_el);
  return slot_el;
}

function paint_locked_stall(canvas, can_afford) {
  const canvas_ctx    = canvas.getContext('2d');
  const canvas_width  = canvas.width;
  const canvas_height = canvas.height;
  canvas_ctx.clearRect(0, 0, canvas_width, canvas_height);

  canvas_ctx.fillStyle = can_afford ? '#121008' : '#0e0e0e';
  canvas_ctx.fillRect(0, 0, canvas_width, canvas_height);

  const center_x  = canvas_width / 2;
  const wood      = can_afford ? '#7a5a2a' : '#4a3a1a';
  const dark_wood = can_afford ? '#5a3a0a' : '#2a1a00';
  const thatch    = can_afford ? '#8a6a2a' : '#4a3a0a';
  const rope      = can_afford ? '#9a8a4a' : '#5a4a1a';

  canvas_ctx.fillStyle = can_afford ? '#3a2a0a' : '#1a1400';
  canvas_ctx.fillRect(8, canvas_height * 0.72, canvas_width - 16, 3);

  canvas_ctx.save(); canvas_ctx.translate(center_x - 32, canvas_height * 0.68); canvas_ctx.rotate(-0.06);
  canvas_ctx.fillStyle = dark_wood; canvas_ctx.fillRect(-4, -canvas_height * 0.35, 8, canvas_height * 0.35); canvas_ctx.restore();
  canvas_ctx.save(); canvas_ctx.translate(center_x + 32, canvas_height * 0.68); canvas_ctx.rotate(0.08);
  canvas_ctx.fillStyle = dark_wood; canvas_ctx.fillRect(-4, -canvas_height * 0.32, 8, canvas_height * 0.32); canvas_ctx.restore();

  canvas_ctx.fillStyle = thatch;
  canvas_ctx.beginPath();
  canvas_ctx.moveTo(center_x - 46, canvas_height * 0.28); canvas_ctx.lineTo(center_x + 48, canvas_height * 0.24);
  canvas_ctx.quadraticCurveTo(center_x + 10, canvas_height * 0.46, center_x - 44, canvas_height * 0.44);
  canvas_ctx.closePath(); canvas_ctx.fill();

  canvas_ctx.strokeStyle = dark_wood; canvas_ctx.lineWidth = 2; canvas_ctx.globalAlpha = 0.4;
  for (let thatch_x = center_x - 38; thatch_x < center_x + 42; thatch_x += 10) {
    canvas_ctx.beginPath(); canvas_ctx.moveTo(thatch_x, canvas_height * 0.28); canvas_ctx.lineTo(thatch_x - 4, canvas_height * 0.43); canvas_ctx.stroke();
  }
  canvas_ctx.globalAlpha = 1;
  canvas_ctx.strokeStyle = thatch; canvas_ctx.lineWidth = 2;
  for (let thatch_x = center_x - 40; thatch_x < center_x + 44; thatch_x += 7) {
    const whisker_length = 6 + (thatch_x * 3 % 8);
    canvas_ctx.beginPath();
    canvas_ctx.moveTo(thatch_x, canvas_height * 0.43);
    canvas_ctx.lineTo(thatch_x + 1, canvas_height * 0.43 + whisker_length);
    canvas_ctx.stroke();
  }

  canvas_ctx.fillStyle = wood;
  canvas_ctx.save(); canvas_ctx.translate(center_x, canvas_height * 0.58); canvas_ctx.rotate(0.03);
  canvas_ctx.fillRect(-38, -5, 76, 10); canvas_ctx.restore();
  canvas_ctx.fillStyle = 'rgba(0,0,0,0.5)'; canvas_ctx.fillRect(center_x - 36, canvas_height * 0.59, 74, 4);

  canvas_ctx.fillStyle = dark_wood;
  canvas_ctx.fillRect(center_x - 22, canvas_height * 0.50, 16, 10); canvas_ctx.fillRect(center_x - 20, canvas_height * 0.47, 12, 6);
  canvas_ctx.strokeStyle = wood; canvas_ctx.lineWidth = 1;
  canvas_ctx.beginPath(); canvas_ctx.moveTo(center_x - 22, canvas_height * 0.50); canvas_ctx.lineTo(center_x - 6,  canvas_height * 0.60); canvas_ctx.stroke();
  canvas_ctx.beginPath(); canvas_ctx.moveTo(center_x - 6,  canvas_height * 0.50); canvas_ctx.lineTo(center_x - 22, canvas_height * 0.60); canvas_ctx.stroke();

  canvas_ctx.strokeStyle = rope; canvas_ctx.lineWidth = 1.5;
  canvas_ctx.beginPath();
  canvas_ctx.moveTo(center_x + 30, canvas_height * 0.38);
  canvas_ctx.quadraticCurveTo(center_x + 38, canvas_height * 0.52, center_x + 28, canvas_height * 0.62); canvas_ctx.stroke();
  const FRINGE_STRAND_COUNT = 3;
  for (let strand_index = 0; strand_index < FRINGE_STRAND_COUNT; strand_index++) {
    canvas_ctx.beginPath();
    canvas_ctx.moveTo(center_x + 28, canvas_height * 0.62);
    canvas_ctx.lineTo(center_x + 24 + strand_index * 4, canvas_height * 0.68);
    canvas_ctx.stroke();
  }

  const lock_center_x = center_x;
  const lock_center_y = canvas_height * 0.83;
  canvas_ctx.strokeStyle = can_afford ? '#b89840' : '#3a3a3a';
  canvas_ctx.lineWidth   = 2;
  canvas_ctx.fillStyle   = can_afford ? '#1a1200' : '#0a0a0a';
  canvas_ctx.beginPath(); canvas_ctx.arc(lock_center_x, lock_center_y - 7, 6, Math.PI, 0); canvas_ctx.stroke();
  canvas_ctx.fillRect(lock_center_x - 8, lock_center_y - 4, 16, 12); canvas_ctx.strokeRect(lock_center_x - 8, lock_center_y - 4, 16, 12);
  canvas_ctx.fillStyle = can_afford ? '#b89840' : '#3a3a3a';
  canvas_ctx.beginPath(); canvas_ctx.arc(lock_center_x, lock_center_y + 2, 2.5, 0, Math.PI * 2); canvas_ctx.fill();
  canvas_ctx.fillRect(lock_center_x - 1.5, lock_center_y + 2, 3, 4);
}

function make_spacer(css_class) {
  const spacer_el = document.createElement('div');
  spacer_el.className = css_class;
  return spacer_el;
}

export function show_screen(screen_id) {
  document.querySelectorAll('.screen').forEach(screen_el => screen_el.classList.remove('active'));
  document.getElementById(screen_id).classList.add('active');
}

export function show_prefight_screen(state) {
  const big_bad = state.fight.big_bad;
  const city    = state.fight.city;

  document.getElementById('prefight-fight-label').textContent =
    `— FIGHT ${state.run.fight_number} OF ${FIGHTS_PER_RUN} —`;
  document.getElementById('prefight-bb-name').textContent  = big_bad.name;
  document.getElementById('prefight-bb-title').textContent = big_bad.title;
  document.getElementById('prefight-bb-deck').textContent  = big_bad.deck_desc;
  const stats_parts = [
    `HP: ${big_bad.max_hp}`,
    `ATK: ${big_bad.atk}`,
    `Monsters: ${big_bad.monsters_per_turn}/turn`,
  ];
  if (big_bad.weak_against)   stats_parts.push(`weak to ${big_bad.weak_against.toUpperCase()} (+${WEAK_BONUS_DISPLAY_PERCENT}%)`);
  if (big_bad.strong_against) stats_parts.push(`resists ${big_bad.strong_against.toUpperCase()} (-${RESIST_PENALTY_DISPLAY_PERCENT}%)`);
  document.getElementById('prefight-bb-stats').textContent = stats_parts.join(' | ');
  document.getElementById('prefight-city-name').textContent   = city.name;
  document.getElementById('prefight-city-type').textContent   = city.type;
  document.getElementById('prefight-city-effect').textContent = city.effects.map(city_effect => city_effect.desc).join(' ');
  document.getElementById('prefight-city-stats').textContent  = `Morale: ${city.max_morale}`;

  paint_sprite(document.getElementById('prefight-bb-sprite'),   big_bad_art[big_bad.id]);
  paint_sprite(document.getElementById('prefight-city-sprite'), city_art[city.id]);

  show_screen('screen-prefight');
}

export function show_event_screen(state, event_def) {
  if (!event_def) {

    show_upgrade_screen(state);
    return;
  }
  document.getElementById('event-title').textContent = event_def.title;
  document.getElementById('event-desc').textContent  = event_def.desc;
  const choices_container = document.getElementById('event-choices');
  choices_container.replaceChildren();
  event_def.choices.forEach((choice, choice_index) => {
    const choice_btn = document.createElement('button');
    choice_btn.className = 'event-choice-btn';
    const choice_label_el = document.createElement('div');
    choice_label_el.className   = 'event-choice-label';
    choice_label_el.textContent = choice.label;
    const choice_desc_el = document.createElement('div');
    choice_desc_el.className   = 'event-choice-desc';
    choice_desc_el.textContent = choice.desc;
    choice_btn.appendChild(choice_label_el);
    choice_btn.appendChild(choice_desc_el);
    choice_btn.addEventListener('click', () => _apply_event_choice(state, event_def, choice_index));
    choices_container.appendChild(choice_btn);
  });
  show_screen('screen-event');
}

export function show_upgrade_screen(state) {

  const owned_treasure_ids = new Set((state.run.treasures ?? []).map(owned_treasure => owned_treasure.id));
  const unowned_treasures  = (Registry.treasures ?? []).filter(treasure => !owned_treasure_ids.has(treasure.id));

  const shuffled_upgrades = _shuffle_array([...Registry.cards_upgrades]);
  const choice_candidates = [
    { kind: 'promoted', def: shuffled_upgrades[0] },
    { kind: 'promoted', def: shuffled_upgrades[1] },
    unowned_treasures.length > 0
      ? { kind: 'treasure', def: _shuffle_array([...unowned_treasures])[0] }
      : { kind: 'promoted', def: shuffled_upgrades[2] },
  ].filter(candidate => candidate.def);

  const display_choices = _shuffle_array(choice_candidates);

  document.getElementById('upgrade-victory-msg').textContent = state.fight.big_bad.victory_message;

  const choices_container = document.getElementById('upgrade-choices');
  choices_container.replaceChildren();

  for (const choice of display_choices) {
    if (choice.kind === 'promoted') {
      choices_container.appendChild(make_promoted_choice(state, choice.def));
    } else {
      choices_container.appendChild(make_treasure_choice(state, choice.def));
    }
  }
  show_screen('screen-upgrade');
}

function make_promoted_choice(state, card_def) {
  const card_instance = _create_card_instance(card_def);

  const choice_wrapper = document.createElement('div');
  choice_wrapper.className = 'upgrade-choice';

  const label_el = document.createElement('div');
  label_el.className   = 'upgrade-label';
  label_el.textContent = 'PROMOTED HERO';

  const card_display_el = document.createElement('div');
  card_display_el.className = 'upgrade-card';
  card_display_el.id        = `upgcard-${card_instance.uid}`;

  const sublabel_el = document.createElement('div');
  sublabel_el.className   = 'upgrade-sublabel';
  sublabel_el.textContent = card_instance.desc;

  choice_wrapper.appendChild(label_el);
  choice_wrapper.appendChild(card_display_el);
  choice_wrapper.appendChild(sublabel_el);
  choice_wrapper.addEventListener('click', () => _apply_upgrade(state, card_def));

  render_card_into_element(card_instance, card_display_el, false);
  choice_wrapper.addEventListener('mouseenter', () => render_card_preview(card_instance));
  choice_wrapper.addEventListener('mouseleave', () => clear_card_preview());
  return choice_wrapper;
}

function make_treasure_choice(state, treasure_def) {
  const choice_wrapper = document.createElement('div');
  choice_wrapper.className = 'upgrade-choice upgrade-choice-treasure';

  const label_el = document.createElement('div');
  label_el.className   = 'upgrade-label upgrade-label-treasure';
  label_el.textContent = 'TREASURE';

  const card_display_el = document.createElement('div');
  card_display_el.className = 'upgrade-card upgrade-card-treasure';

  const icon_el = document.createElement('div');
  icon_el.className   = 'treasure-icon';
  icon_el.textContent = '✦';
  const name_el = document.createElement('div');
  name_el.className   = 'treasure-name';
  name_el.textContent = treasure_def.name;
  card_display_el.appendChild(icon_el);
  card_display_el.appendChild(name_el);

  const sublabel_el = document.createElement('div');
  sublabel_el.className   = 'upgrade-sublabel';
  sublabel_el.textContent = treasure_def.desc;

  choice_wrapper.appendChild(label_el);
  choice_wrapper.appendChild(card_display_el);
  choice_wrapper.appendChild(sublabel_el);
  choice_wrapper.addEventListener('click', () => _apply_treasure(state, treasure_def));
  return choice_wrapper;
}

export function show_summary_screen(state, is_victory) {
  const title_el  = document.getElementById('summary-title');
  const msg_el    = document.getElementById('summary-msg');
  const fights_el = document.getElementById('summary-fights');

  title_el.textContent = is_victory ? 'VICTORY' : 'DEFEAT';
  title_el.className   = `summary-title ${is_victory ? 'victory' : 'defeat'}`;
  msg_el.textContent   = is_victory
    ? 'The realm stands. Three battles won. Your heroes are legend.'
    : 'The city has fallen. The darkness spreads. Another run awaits.';

  fights_el.replaceChildren();
  for (const fight_record of state.run.big_bads) {
    const fight_row_el = document.createElement('div'); fight_row_el.className = 'summary-fight';
    const name_el      = document.createElement('div'); name_el.className      = 'summary-fight-name';   name_el.textContent      = fight_record.name;
    const result_el    = document.createElement('div'); result_el.className    = `summary-fight-result ${fight_record.result}`;
    result_el.textContent = fight_record.result === 'won' ? '★ DEFEATED' : '✕ FELL';
    fight_row_el.appendChild(name_el); fight_row_el.appendChild(result_el);
    fights_el.appendChild(fight_row_el);
  }
  show_screen('screen-summary');
}

export function log_entry(text, css_class = '') {
  const log_container = document.getElementById('log-entries');
  if (!log_container) return;
  const entry_el = document.createElement('div');
  entry_el.className   = `log-entry ${css_class}`;
  entry_el.textContent = text;
  log_container.appendChild(entry_el);
  while (log_container.children.length > LOG_MAX_ENTRIES) log_container.firstElementChild.remove();
  log_container.scrollTop = log_container.scrollHeight;
}

export function log_phase(text) { log_entry(text, 'log-phase'); }

export function flash_notification(text) {
  const notification_el = document.getElementById('notification');
  notification_el.textContent = text;
  notification_el.classList.add('visible');
  if (App.notification_timer) clearTimeout(App.notification_timer);
  App.notification_timer = setTimeout(() => notification_el.classList.remove('visible'), NOTIFICATION_DURATION_MS);
}

export function setupEventListeners(engine_fns) {

  _start_new_run           = engine_fns.start_new_run;
  _begin_fight             = engine_fns.begin_fight;
  _on_phase_btn            = engine_fns.on_phase_btn;
  _quick_play_all          = engine_fns.quick_play_all;
  _on_hand_card_click      = engine_fns.on_hand_card_click;
  _on_hero_slot_click      = engine_fns.on_hero_slot_click;
  _on_market_card_click    = engine_fns.on_market_card_click;
  _on_unlock_market_slot   = engine_fns.on_unlock_market_slot;
  _on_upgrade_market_click = engine_fns.on_upgrade_market_click;
  _on_forge_click          = engine_fns.on_forge_click;
  _get_forge_cost          = engine_fns.get_forge_cost;
  _apply_upgrade           = engine_fns.apply_upgrade;
  _apply_treasure          = engine_fns.apply_treasure;
  _apply_event_choice      = engine_fns.apply_event_choice;

  _get_effective_market_size = engine_fns.get_effective_market_size;
  _get_slot_unlock_cost      = engine_fns.get_slot_unlock_cost;
  _get_card_cost             = engine_fns.get_card_cost;
  _create_card_instance      = engine_fns.create_card_instance;
  _shuffle_array             = engine_fns.shuffle_array;

  document.getElementById('begin-run-btn')?.addEventListener('click', () => _start_new_run());
  document.getElementById('prefight-btn')?.addEventListener('click', () => _begin_fight());
  document.getElementById('quick-play-btn')?.addEventListener('click', () => _quick_play_all());
  document.getElementById('phase-btn')?.addEventListener('click', () => _on_phase_btn());
  document.querySelector('#screen-summary .btn-gold')?.addEventListener('click', () => show_screen('screen-menu'));
}
