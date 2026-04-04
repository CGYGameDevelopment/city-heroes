// renderer.js
// All DOM rendering for City Heroes.
//
// Imports:  constants.js, app.js   (no engine.js — zero circular risk)
// Owns:     App.ui_state, App.notification_timer
// Exports:  render, log_entry, log_phase, flash_notification,
//           clear_hand_selection, show_*, setupEventListeners
//
// Engine functions needed for event wiring and screen helpers are injected
// once by startup_validator.js via setupEventListeners(fns). They are never
// imported directly, keeping the module graph acyclic.

import {
  FIELD_SIZE_MAX, MONSTER_SLOTS, FIGHTS_PER_RUN, UPGRADE_CHOICE_COUNT,
  LOG_MAX_ENTRIES, MARKET_LEVEL_MAX, MARKET_UPGRADE_COSTS,
} from './00_core_constants.js';

import { App } from './00_core_app.js';

// Engine functions injected by setupEventListeners(). Declared here so all
// renderer functions can reference them as closed-over variables.
let _start_new_run;
let _begin_fight;
let _on_phase_btn;
let _quick_play_all;
let _on_hand_card_click;
let _on_hero_slot_click;
let _on_market_card_click;
let _on_unlock_market_slot;
let _on_upgrade_market_click;
let _apply_upgrade;

// Engine query helpers injected by setupEventListeners().
let _get_effective_market_size;
let _get_slot_unlock_cost;
let _get_card_cost;
let _create_card_instance;
let _shuffle_array;

// ─────────────────────────────────────────────────────────────
// UI STATE — owned exclusively by renderer.js
// ─────────────────────────────────────────────────────────────

/** Called by engine.js (via bridge) to signal that the hand selection should clear. */
export function clear_hand_selection() {
  App.ui_state.selected_hand_uid = null;
}

// ─────────────────────────────────────────────────────────────
// ROOT RENDER
// ─────────────────────────────────────────────────────────────

export function render() {
  const state = App.game_state;
  if (!state) return;
  render_stats(state);
  render_big_bad(state);
  render_city(state);
  render_shields(state);
  render_field(state);
  render_hand(state);
  render_piles(state);
  render_market(state);
}

// ─────────────────────────────────────────────────────────────
// STATS BAR
// ─────────────────────────────────────────────────────────────

function render_stats(state) {
  const phase    = state.turn.phase;
  const phase_btn = document.getElementById('phase-btn');

  document.getElementById('turn-num').textContent        = state.turn.turn_number + 1;
  document.getElementById('gold-val').textContent        = state.fight.gold_pool;
  document.getElementById('market-gold-val').textContent = state.fight.gold_pool;

  if (phase === 'DRAW' || phase === 'BIG_BAD') {
    phase_btn.textContent = phase === 'DRAW' ? 'Drawing...' : 'Big Bad...';
    phase_btn.disabled    = true;
  } else if (phase === 'HEROES') {
    phase_btn.textContent = 'End Heroes';
    phase_btn.disabled    = false;
  } else if (phase.startsWith('RESOLVING')) {
    phase_btn.textContent = 'Resolving...';
    phase_btn.disabled    = true;
  } else if (phase === 'RECRUIT') {
    phase_btn.textContent = 'End Recruit';
    phase_btn.disabled    = false;
  } else {
    phase_btn.textContent = '—';
    phase_btn.disabled    = true;
  }

  const quick_play_btn = document.getElementById('quick-play-btn');
  quick_play_btn.style.display = (phase === 'HEROES') ? 'inline-block' : 'none';
}

function render_big_bad(state) {
  const bb = state.fight.big_bad;
  if (!bb) return;
  document.getElementById('bb-name').textContent = bb.name;
  document.getElementById('bb-sub').textContent  = bb.title;
  document.getElementById('bb-hp').textContent   = `${bb.hp}/${bb.max_hp}`;
  document.getElementById('bb-atk').textContent  = bb.atk;
  document.getElementById('bb-mpt').textContent  = bb.monsters_per_turn;
  paint_sprite_scaled(document.getElementById('bb-sprite'), big_bad_art[bb.id], 64, 64);
}

function render_city(state) {
  const city = state.fight.city;
  if (!city) return;
  document.getElementById('city-name').textContent        = city.name;
  document.getElementById('city-sub').textContent         = city.type;
  document.getElementById('city-morale').textContent      = `${state.fight.city_morale}/${city.max_morale}`;
  document.getElementById('city-def-display').textContent = state.fight.city_def;
  document.getElementById('city-effects-mini').textContent =
    city.effects.map(e => e.desc).join(' | ');

  const effective = _get_effective_market_size(state);
  document.getElementById('city-market-size').textContent = `${effective}/${FIELD_SIZE_MAX}`;

  paint_sprite_scaled(document.getElementById('city-sprite'), city_art[city.id], 64, 64);
}

function render_shields(state) {
  const show_pill = (pill_id, val_id, value) => {
    const pill_el  = document.getElementById(pill_id);
    const value_el = document.getElementById(val_id);
    if (value > 0) { pill_el.classList.remove('hidden'); value_el.textContent = value; }
    else             pill_el.classList.add('hidden');
  };
  show_pill('city-def-pill',   'city-def-val',  state.fight.city_def);
  show_pill('mon-shield-pill', 'mon-shield-val', state.fight.monster_shield);
}

// ─────────────────────────────────────────────────────────────
// BOARD — FIELD & HAND
// ─────────────────────────────────────────────────────────────

function render_field(state) {
  const phase          = state.turn.phase;
  const is_recruit     = (phase === 'RECRUIT');
  const monster_row_el = document.getElementById('monster-row');
  const hero_row_el    = document.getElementById('hero-row');
  const monster_arr_el = document.getElementById('monster-order-arrow');
  const hero_arr_el    = document.getElementById('hero-order-arrow');

  if (is_recruit) {
    monster_row_el.replaceChildren();
    hero_row_el.replaceChildren();
    monster_arr_el.style.display = 'none';
    hero_arr_el.style.display    = 'none';
    return;
  }

  let resolving_hero_slot    = -1;
  let resolving_monster_slot = -1;
  if (phase === 'RESOLVING') {
    const step = state.turn.active_resolution_sequence[state.turn.resolving_step];
    if (step) {
      if (step.side === 'H') resolving_hero_slot    = step.slot;
      if (step.side === 'M') resolving_monster_slot = step.slot;
    }
  }

  monster_row_el.replaceChildren();
  monster_row_el.appendChild(make_spacer('monster-spacer-lead'));
  for (let i = 0; i < MONSTER_SLOTS; i++) {
    const card = state.fight.monster_field[i];
    if (!card) {
      const el = make_empty_slot('M' + (i + 1));
      el.style.cursor = 'default';
      monster_row_el.appendChild(el);
    } else {
      const el = make_card_element(card, false, i === resolving_monster_slot);
      if (card.resolved) el.classList.add('inactive');
      monster_row_el.appendChild(el);
    }
    if (i < MONSTER_SLOTS - 1) monster_row_el.appendChild(make_spacer('monster-spacer'));
  }
  monster_row_el.appendChild(make_spacer('monster-spacer-lead'));

  const show_arrows = (phase === 'HEROES' || phase === 'RESOLVING');
  monster_arr_el.style.display = show_arrows ? 'flex' : 'none';

  hero_row_el.replaceChildren();
  for (let i = 0; i < FIELD_SIZE_MAX; i++) {
    hero_row_el.appendChild(make_spacer('hero-spacer'));
    const card = state.fight.hero_field[i];
    if (!card) {
      const el = make_empty_slot('H' + (i + 1));
      if (phase === 'HEROES') el.addEventListener('click', () => _on_hero_slot_click(i));
      hero_row_el.appendChild(el);
    } else {
      const el = make_card_element(card, card.uid === App.ui_state.selected_hand_uid, i === resolving_hero_slot);
      if (phase === 'HEROES') el.addEventListener('click', () => _on_hero_slot_click(i));
      if (card.resolved) el.classList.add('inactive');
      hero_row_el.appendChild(el);
    }
  }
  hero_row_el.appendChild(make_spacer('hero-spacer'));
  hero_arr_el.style.display = show_arrows ? 'flex' : 'none';
}

function render_hand(state) {
  const hand_row_el = document.getElementById('hand-row');
  hand_row_el.replaceChildren();
  for (const card of state.run.hand) {
    const el = make_card_element(card, card.uid === App.ui_state.selected_hand_uid, false);
    if (state.turn.phase === 'HEROES') {
      el.classList.add('hand-card');
      el.addEventListener('click', () => _on_hand_card_click(card.uid));
    }
    hand_row_el.appendChild(el);
  }
}

function render_piles(state) {
  const draw_count    = state.run.deck.length;
  const discard_count = state.run.discard.length;

  const draw_widget = document.getElementById('draw-pile-widget');
  document.getElementById('draw-pile-count').textContent = draw_count;
  draw_widget.classList.toggle('empty', draw_count === 0);

  const discard_widget = document.getElementById('discard-pile-widget');
  const discard_face   = document.getElementById('discard-pile-face');
  document.getElementById('discard-pile-count').textContent = discard_count;
  discard_widget.classList.toggle('empty',     discard_count === 0);
  discard_face.classList.toggle('has-cards',   discard_count > 0);
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

  const effective_size = _get_effective_market_size(state);
  const slot_cost      = _get_slot_unlock_cost(state);

  for (let i = 0; i < FIELD_SIZE_MAX; i++) {
    hero_row_el.appendChild(make_spacer('hero-spacer'));
    hero_row_el.appendChild(
      i < effective_size
        ? make_market_active_slot(state, i)
        : make_market_locked_slot(slot_cost, state.fight.gold_pool)
    );
  }
  hero_row_el.appendChild(make_spacer('hero-spacer'));
}

function render_market_upgrade_slot(state) {
  const container  = document.getElementById('market-upgrade-slot');
  container.replaceChildren();

  const next_level = state.fight.market_level + 1;
  if (next_level > MARKET_LEVEL_MAX) {
    const maxed = document.createElement('div');
    maxed.className   = 'market-upgrade-maxed';
    maxed.textContent = 'Market fully unlocked';
    container.appendChild(maxed);
    return;
  }

  const cost = MARKET_UPGRADE_COSTS[next_level];
  if (cost === undefined) {
    console.warn(`render_market_upgrade_slot: no cost defined for level ${next_level}.`);
    return;
  }
  const can_afford = state.fight.gold_pool >= cost;
  const btn        = document.createElement('button');
  btn.className    = `market-upgrade-btn${can_afford ? '' : ' locked'}`;
  btn.textContent  = `Unlock Level ${next_level} Cards — ${cost} Gold`;
  btn.disabled     = !can_afford;
  if (can_afford) btn.addEventListener('click', () => _on_upgrade_market_click());
  container.appendChild(btn);
}

function make_market_active_slot(state, i) {
  const card = state.fight.market[i];
  if (!card) {
    const el = make_empty_slot('');
    el.style.cursor = 'default';
    return el;
  }
  const recruit_cost = _get_card_cost(card, state.fight.city);
  const can_afford   = state.fight.gold_pool >= recruit_cost;
  const el           = make_card_element(card, false, false, recruit_cost);
  if (can_afford) {
    el.addEventListener('click', () => _on_market_card_click(card.uid));
  } else {
    el.style.opacity = '0.5';
    el.style.cursor  = 'default';
  }
  return el;
}

function make_market_locked_slot(slot_cost, gold_pool) {
  const can_afford = slot_cost !== null && gold_pool >= slot_cost;
  const el         = make_locked_slot(slot_cost, can_afford);
  if (can_afford) el.addEventListener('click', () => _on_unlock_market_slot());
  return el;
}

// ─────────────────────────────────────────────────────────────
// CARD PREVIEW
// ─────────────────────────────────────────────────────────────

function render_card_preview(card) {
  if (!card) { clear_card_preview(); return; }
  const el         = document.getElementById('preview-card');
  const type_class = card.subtype === 'atk' ? 'card-atk' : `card-${card.type}`;
  const role_class = card.role ? `role-${card.role}` : '';
  el.className     = `card ${type_class} ${role_class}`.trim();
  render_card_into_element(card, el, true);
}

function clear_card_preview() {
  const el    = document.getElementById('preview-card');
  el.className = 'card';
  el.replaceChildren();
}

// ─────────────────────────────────────────────────────────────
// CARD DOM BUILDERS
// ─────────────────────────────────────────────────────────────

function make_card_element(card, is_selected, is_resolving, display_cost = null) {
  const type_class = card.subtype === 'atk' ? 'card-atk' : `card-${card.type}`;
  const role_class = card.role ? `role-${card.role}` : '';
  const el         = document.createElement('div');
  el.className     = `card ${type_class} ${role_class}`.trim();
  if (is_selected)  el.classList.add('selected-from-hand');
  if (is_resolving) el.classList.add('resolving');
  render_card_into_element(card, el, false, display_cost);
  el.addEventListener('mouseenter', () => render_card_preview(card));
  el.addEventListener('mouseleave', () => clear_card_preview());
  return el;
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

function make_badge(value, colours, css_class) {
  const ns  = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 28 28');
  svg.setAttribute('width',   '26');
  svg.setAttribute('height',  '26');
  svg.classList.add(css_class);

  const ring = document.createElementNS(ns, 'circle');
  ring.setAttribute('cx', '14'); ring.setAttribute('cy', '14'); ring.setAttribute('r', '13');
  ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#ffffff');
  ring.setAttribute('stroke-width', '2'); ring.setAttribute('opacity', '0.25');

  const circle = document.createElementNS(ns, 'circle');
  circle.setAttribute('cx', '14'); circle.setAttribute('cy', '14'); circle.setAttribute('r', '12');
  circle.setAttribute('fill', colours.fill); circle.setAttribute('stroke', colours.stroke);
  circle.setAttribute('stroke-width', '1.5');

  const text_el = document.createElementNS(ns, 'text');
  text_el.setAttribute('x', '14'); text_el.setAttribute('y', '19');
  text_el.setAttribute('text-anchor', 'middle');
  text_el.setAttribute('font-size',   value > 9 ? '11' : '13');
  text_el.setAttribute('font-weight', 'bold');
  text_el.setAttribute('font-family', 'sans-serif');
  text_el.setAttribute('fill',        colours.text);
  text_el.setAttribute('pointer-events', 'none');
  text_el.textContent = value ?? '?';

  svg.appendChild(ring); svg.appendChild(circle); svg.appendChild(text_el);
  return svg;
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
  const overlay = document.createElement('div');
  overlay.className = 'pip-overlay';
  for (const pip of pips) {
    const cfg = PIP_CONFIG[pip.type];
    if (!cfg) continue;
    const el = document.createElement('div');
    el.className = `pip pip-${pip.type}`;
    el.style.setProperty('--pip-colour', cfg.colour);
    const icon  = document.createElement('span'); icon.className  = 'pip-icon';  icon.textContent  = cfg.icon;
    const val   = document.createElement('span'); val.className   = 'pip-value'; val.textContent   = Math.abs(pip.value);
    const label = document.createElement('span'); label.className = 'pip-label'; label.textContent = cfg.label;
    el.appendChild(icon); el.appendChild(val); el.appendChild(label);
    overlay.appendChild(el);
  }
  return overlay;
}

function render_card_into_element(card, card_el, large = false, display_cost = null) {
  card_el.replaceChildren();

  const top_row = document.createElement('div');
  top_row.className = 'card-top';
  const name_span = document.createElement('span');
  name_span.className   = 'card-name';
  name_span.textContent = (card.name || '?').replace(
    /\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  );
  top_row.appendChild(name_span);
  card_el.appendChild(top_row);

  if (display_cost !== null && display_cost > 0) {
    const cb = make_cost_badge(display_cost);
    cb.classList.add('cost-badge-overlay');
    card_el.appendChild(cb);
  }

  if (card.level !== undefined) {
    const lb = make_level_badge(card.level);
    lb.classList.add('level-badge-overlay');
    card_el.appendChild(lb);
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'card-art';
  canvas.width     = large ? 180 : 120;
  canvas.height    = large ? 140 : 100;
  canvas.style.imageRendering = 'pixelated';
  card_el.appendChild(canvas);
  if (typeof card.art === 'function') card.art(canvas);

  if (card.resolution_pips.length > 0) {
    card_el.appendChild(make_resolution_pips(card.resolution_pips));
  }

  const desc_el = document.createElement('div');
  desc_el.className   = 'card-desc';
  desc_el.textContent = card.desc || '';
  card_el.appendChild(desc_el);
}

function make_empty_slot(label_text) {
  const el = document.createElement('div');
  el.className = 'card empty-slot';
  const label = document.createElement('span');
  label.className   = 'slot-label';
  label.textContent = label_text;
  el.appendChild(label);
  return el;
}

function make_locked_slot(cost, can_afford) {
  const el  = document.createElement('div');
  el.className = `card locked-slot${can_afford ? ' can-afford' : ''}`;
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 148; canvas.className = 'locked-slot-canvas';
  paint_locked_stall(canvas, can_afford);
  el.appendChild(canvas);
  const label = document.createElement('div');
  label.className   = 'locked-slot-label';
  label.textContent = cost !== null ? `${cost} ◆ Unlock` : '—';
  el.appendChild(label);
  return el;
}

function paint_locked_stall(canvas, can_afford) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = can_afford ? '#121008' : '#0e0e0e';
  ctx.fillRect(0, 0, w, h);

  const cx     = w / 2;
  const wood   = can_afford ? '#7a5a2a' : '#4a3a1a';
  const dwoof  = can_afford ? '#5a3a0a' : '#2a1a00';
  const thatch = can_afford ? '#8a6a2a' : '#4a3a0a';
  const rope   = can_afford ? '#9a8a4a' : '#5a4a1a';

  ctx.fillStyle = can_afford ? '#3a2a0a' : '#1a1400';
  ctx.fillRect(8, h * 0.72, w - 16, 3);

  ctx.save(); ctx.translate(cx - 32, h * 0.68); ctx.rotate(-0.06);
  ctx.fillStyle = dwoof; ctx.fillRect(-4, -h * 0.35, 8, h * 0.35); ctx.restore();
  ctx.save(); ctx.translate(cx + 32, h * 0.68); ctx.rotate(0.08);
  ctx.fillStyle = dwoof; ctx.fillRect(-4, -h * 0.32, 8, h * 0.32); ctx.restore();

  ctx.fillStyle = thatch;
  ctx.beginPath();
  ctx.moveTo(cx - 46, h * 0.28); ctx.lineTo(cx + 48, h * 0.24);
  ctx.quadraticCurveTo(cx + 10, h * 0.46, cx - 44, h * 0.44);
  ctx.closePath(); ctx.fill();

  ctx.strokeStyle = dwoof; ctx.lineWidth = 2; ctx.globalAlpha = 0.4;
  for (let x = cx - 38; x < cx + 42; x += 10) {
    ctx.beginPath(); ctx.moveTo(x, h * 0.28); ctx.lineTo(x - 4, h * 0.43); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = thatch; ctx.lineWidth = 2;
  for (let x = cx - 40; x < cx + 44; x += 7) {
    const len = 6 + (x * 3 % 8);
    ctx.beginPath(); ctx.moveTo(x, h * 0.43); ctx.lineTo(x + 1, h * 0.43 + len); ctx.stroke();
  }

  ctx.fillStyle = wood;
  ctx.save(); ctx.translate(cx, h * 0.58); ctx.rotate(0.03);
  ctx.fillRect(-38, -5, 76, 10); ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(cx - 36, h * 0.59, 74, 4);

  ctx.fillStyle = dwoof;
  ctx.fillRect(cx - 22, h * 0.50, 16, 10); ctx.fillRect(cx - 20, h * 0.47, 12, 6);
  ctx.strokeStyle = wood; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - 22, h * 0.50); ctx.lineTo(cx - 6, h * 0.60); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 6,  h * 0.50); ctx.lineTo(cx - 22, h * 0.60); ctx.stroke();

  ctx.strokeStyle = rope; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx + 30, h * 0.38);
  ctx.quadraticCurveTo(cx + 38, h * 0.52, cx + 28, h * 0.62); ctx.stroke();
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(cx + 28, h * 0.62);
    ctx.lineTo(cx + 24 + i * 4, h * 0.68); ctx.stroke();
  }

  const lx = cx, ly = h * 0.83;
  ctx.strokeStyle = can_afford ? '#b89840' : '#3a3a3a'; ctx.lineWidth = 2;
  ctx.fillStyle   = can_afford ? '#1a1200' : '#0a0a0a';
  ctx.beginPath(); ctx.arc(lx, ly - 7, 6, Math.PI, 0); ctx.stroke();
  ctx.fillRect(lx - 8, ly - 4, 16, 12); ctx.strokeRect(lx - 8, ly - 4, 16, 12);
  ctx.fillStyle = can_afford ? '#b89840' : '#3a3a3a';
  ctx.beginPath(); ctx.arc(lx, ly + 2, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(lx - 1.5, ly + 2, 3, 4);
}

function make_spacer(css_class) {
  const el = document.createElement('div');
  el.className = css_class;
  return el;
}

// ─────────────────────────────────────────────────────────────
// SCREEN MANAGEMENT
// ─────────────────────────────────────────────────────────────

export function show_screen(screen_id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById(screen_id).classList.add('active');
}

// ─────────────────────────────────────────────────────────────
// SCREEN BUILDERS
// ─────────────────────────────────────────────────────────────

export function show_prefight_screen(state) {
  const bb   = state.fight.big_bad;
  const city = state.fight.city;

  document.getElementById('prefight-fight-label').textContent =
    `— FIGHT ${state.run.fight_number} OF ${FIGHTS_PER_RUN} —`;
  document.getElementById('prefight-bb-name').textContent  = bb.name;
  document.getElementById('prefight-bb-title').textContent = bb.title;
  document.getElementById('prefight-bb-deck').textContent  = bb.deck_desc;
  document.getElementById('prefight-bb-stats').textContent =
    `HP: ${bb.max_hp} | ATK: ${bb.atk} | Monsters: ${bb.monsters_per_turn}/turn`;
  document.getElementById('prefight-city-name').textContent   = city.name;
  document.getElementById('prefight-city-type').textContent   = city.type;
  document.getElementById('prefight-city-effect').textContent = city.effects.map(e => e.desc).join(' ');
  document.getElementById('prefight-city-stats').textContent  = `Morale: ${city.max_morale}`;

  paint_sprite(document.getElementById('prefight-bb-sprite'),   big_bad_art[bb.id]);
  paint_sprite(document.getElementById('prefight-city-sprite'), city_art[city.id]);

  show_screen('screen-prefight');
}

export function show_upgrade_screen(state) {
  const upgrade_card_defs = _shuffle_array([...Registry.cards_upgrades]).slice(0, UPGRADE_CHOICE_COUNT);

  document.getElementById('upgrade-victory-msg').textContent = state.fight.big_bad.victory_message;

  const container = document.getElementById('upgrade-choices');
  container.replaceChildren();

  for (const card_def of upgrade_card_defs) {
    const instance = _create_card_instance(card_def);

    const wrap = document.createElement('div');
    wrap.className = 'upgrade-choice';

    const label = document.createElement('div');
    label.className = 'upgrade-label'; label.textContent = 'PROMOTED HERO';

    const card_display = document.createElement('div');
    card_display.className = 'upgrade-card';
    card_display.id        = `upgcard-${instance.uid}`;

    const sublabel = document.createElement('div');
    sublabel.className = 'upgrade-sublabel'; sublabel.textContent = instance.desc;

    wrap.appendChild(label);
    wrap.appendChild(card_display);
    wrap.appendChild(sublabel);
    wrap.addEventListener('click', () => _apply_upgrade(state, card_def));
    container.appendChild(wrap);

    render_card_into_element(instance, card_display, false);
    wrap.addEventListener('mouseenter', () => render_card_preview(instance));
    wrap.addEventListener('mouseleave', () => clear_card_preview());
  }
  show_screen('screen-upgrade');
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
  for (const record of state.run.big_bads) {
    const fight_div  = document.createElement('div');  fight_div.className  = 'summary-fight';
    const name_div   = document.createElement('div');  name_div.className   = 'summary-fight-name';   name_div.textContent   = record.name;
    const result_div = document.createElement('div');  result_div.className = `summary-fight-result ${record.result}`;
    result_div.textContent = record.result === 'won' ? '★ DEFEATED' : '✕ FELL';
    fight_div.appendChild(name_div); fight_div.appendChild(result_div);
    fights_el.appendChild(fight_div);
  }
  show_screen('screen-summary');
}

// ─────────────────────────────────────────────────────────────
// COMBAT LOG
// ─────────────────────────────────────────────────────────────

export function log_entry(text, css_class = '') {
  const container = document.getElementById('log-entries');
  if (!container) return;
  const el = document.createElement('div');
  el.className   = `log-entry ${css_class}`;
  el.textContent = text;
  container.appendChild(el);
  while (container.children.length > LOG_MAX_ENTRIES) container.firstElementChild.remove();
  container.scrollTop = container.scrollHeight;
}

export function log_phase(text) { log_entry(text, 'log-phase'); }

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────

export function flash_notification(text) {
  const el = document.getElementById('notification');
  el.textContent = text;
  el.classList.add('visible');
  if (App.notification_timer) clearTimeout(App.notification_timer);
  App.notification_timer = setTimeout(() => el.classList.remove('visible'), 1200);
}

// ─────────────────────────────────────────────────────────────
// EVENT LISTENER SETUP
// Called once by startup_validator.js after all modules are loaded and
// validation passes. All engine function references arrive here as fns.*
// so renderer.js never needs to import from engine.js.
// ─────────────────────────────────────────────────────────────

export function setupEventListeners(fns) {
  // Store injected engine functions for use in render callbacks
  _start_new_run          = fns.start_new_run;
  _begin_fight            = fns.begin_fight;
  _on_phase_btn           = fns.on_phase_btn;
  _quick_play_all         = fns.quick_play_all;
  _on_hand_card_click     = fns.on_hand_card_click;
  _on_hero_slot_click     = fns.on_hero_slot_click;
  _on_market_card_click   = fns.on_market_card_click;
  _on_unlock_market_slot  = fns.on_unlock_market_slot;
  _on_upgrade_market_click = fns.on_upgrade_market_click;
  _apply_upgrade          = fns.apply_upgrade;

  // Query helpers used by render functions
  _get_effective_market_size = fns.get_effective_market_size;
  _get_slot_unlock_cost      = fns.get_slot_unlock_cost;
  _get_card_cost             = fns.get_card_cost;
  _create_card_instance      = fns.create_card_instance;
  _shuffle_array             = fns.shuffle_array;

  // Attach button listeners
  document.getElementById('begin-run-btn')?.addEventListener('click', () => _start_new_run());
  document.getElementById('prefight-btn')?.addEventListener('click', () => _begin_fight());
  document.getElementById('quick-play-btn')?.addEventListener('click', () => _quick_play_all());
  document.getElementById('phase-btn')?.addEventListener('click', () => _on_phase_btn());
  document.querySelector('#screen-summary .btn-gold')?.addEventListener('click', () => show_screen('screen-menu'));
}
