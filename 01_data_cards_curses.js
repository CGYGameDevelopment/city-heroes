// 01_data_cards_curses.js
// Curse card definitions (Phase 10).
//
// Curses are type 'curse' — they take a slot in the player's deck and hand
// but produce no payoff when resolved. They are the cost of greed: events
// that grant powerful rewards may also add a curse to the deck.
//
// Curses go through normal placement → resolve flow. Their resolve is a
// no-op (no atk/gold/morale/shield/effects) so the slot they take is wasted.
// They go to the discard like any other card and continue cycling unless
// scrapped (Forge, Sentinel, etc.).
//
// Curses are not buyable from the market. They are only added to the deck
// by events.

Registry.register_cards_curses([

  {
    id:       'curse_doubt',
    role:     'tactical',
    level:    0,
    name:     'DOUBT',
    type:     'curse',
    cost:     0,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'A curse — does nothing. Wastes a slot until scrapped.',
    art:      make_art_painter('starter'),
  },

  {
    id:       'curse_dread',
    role:     'tactical',
    level:    0,
    name:     'DREAD',
    type:     'curse',
    cost:     0,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'A curse — does nothing. Wastes a slot until scrapped.',
    art:      make_art_painter('starter'),
  },

]);
