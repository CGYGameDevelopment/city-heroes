// app.js
// Single shared state container for City Heroes.
//
// Ownership:
//   game_state.run      — written only by engine.js; persists across fights
//   game_state.fight    — written only by engine.js; reset at fight start
//   game_state.turn     — written only by engine.js; reset at turn start
//   resolution_timer    — written only by engine.js
//   ui_state            — written only by renderer.js; read by renderer.js
//   notification_timer  — written only by renderer.js
//
// game_state is null between runs. Each sub-namespace is created by the
// engine initialiser functions and should only be accessed after a run starts.
//
// No game logic lives here. This module is a plain data holder so that
// every piece of mutable state has one named home rather than being a
// bare script-scope variable accessible from everywhere.

export const App = {
  /**
   * Full game state, split into three lifetime namespaces:
   *
   *   run   — survives for the whole run (fight count, accumulated deck,
   *            big bad history). Reset only when start_new_run() is called.
   *
   *   fight — valid for the duration of one fight (city, big bad instance,
   *            market, morale, gold, fields). Reset at advance_to_next_fight().
   *
   *   turn  — valid for one turn (phase, resolution sequence, resolved sets,
   *            per-turn modifiers). Reset at the start of each draw phase.
   *
   * @type {{ run: object, fight: object, turn: object } | null}
   */
  game_state: null,

  /** @type {ReturnType<typeof setTimeout>|null} Owned by engine.js. */
  resolution_timer: null,

  /**
   * UI-only state — not part of the game model.
   * selected_hand_uid: uid of the card currently highlighted in hand, or null.
   * Owned and mutated exclusively by renderer.js.
   */
  ui_state: {
    selected_hand_uid: null,
  },

  /** @type {ReturnType<typeof setTimeout>|null} Owned by renderer.js. */
  notification_timer: null,
};
