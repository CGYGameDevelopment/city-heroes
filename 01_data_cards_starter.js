// 01_data_cards_starter.js
// The player's starting deck for every run.
// Cards are type 'starter', cost 0, and are not buyable from the market.
// Do not add engine logic to this file.
// 00_core_registry.js must load first.

var cards_starter = [

  {
    id:       'peddler_1',
    role:     'tactical',
    name:     'PEDDLER',
    type:     'starter',
    cost:     0,
    level:    0,
    atk:      0,
    atk_type: 'none',
    gold:     1,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Gain 1 Gold.',
    art:      make_art_painter('starter'),
  },

  {
    id:       'peddler_2',
    role:     'tactical',
    name:     'PEDDLER',
    type:     'starter',
    cost:     0,
    level:    0,
    atk:      0,
    atk_type: 'none',
    gold:     1,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Gain 1 Gold.',
    art:      make_art_painter('starter'),
  },

  {
    id:       'peddler_3',
    role:     'tactical',
    name:     'PEDDLER',
    type:     'starter',
    cost:     0,
    level:    0,
    atk:      0,
    atk_type: 'none',
    gold:     1,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Gain 1 Gold.',
    art:      make_art_painter('starter'),
  },

  {
    id:       'militia_1',
    role:     'physical',
    name:     'MILITIA',
    type:     'starter',
    cost:     0,
    level:    0,
    atk:      1,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   1,
    effects:  [],
    desc:     'Deal 1 Physical damage. Gain 1 Defence.',
    art:      make_art_painter('starter'),
  },

  {
    id:       'militia_2',
    role:     'physical',
    name:     'MILITIA',
    type:     'starter',
    cost:     0,
    level:    0,
    atk:      1,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   1,
    effects:  [],
    desc:     'Deal 1 Physical damage. Gain 1 Defence.',
    art:      make_art_painter('starter'),
  },

];

Registry.register_cards_starter(cards_starter);
