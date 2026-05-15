// 01_data_cards_starter.js
// The player's starting deck for every run.
// Cards are type 'starter', cost 0, and are not buyable from the market.
// Do not add engine logic to this file.
// 00_core_registry.js must load first.

const cards_starter = [

  {
    id:       'peddler_1',
    role:     'tactical',
    name:     "BARD APPRENTICE",
    type:     'starter',
    cost:     0,
    level:    0,
    atk:      0,
    atk_type: 'none',
    gold:     1,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     "A bard apprentice with a coin trick. Gain 1 Gold.",
    art:      make_art_painter('starter'),
  },

  {
    id:       'herald',
    role:     'tactical',
    name:     "BARD INITIATE",
    type:     'starter',
    cost:     0,
    level:    0,
    atk:      0,
    atk_type: 'none',
    gold:     2,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     "A young bard spreading word for tips. Gain 2 Gold.",
    art:      make_art_painter('starter'),
  },

  {
    id:       'town_guard',
    role:     'physical',
    name:     "FIGHTER RECRUIT",
    type:     'starter',
    cost:     0,
    level:    0,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   0,
    shield:   2,
    effects:  [
      { type: 'draw', amount: 1 },
    ],
    desc:     "A fighter recruit minds the wall. Gain 2 Defence. Draw 1 card.",
    art:      make_art_painter('starter'),
  },

  {
    id:       'militia_1',
    role:     'physical',
    name:     "BARBARIAN RECRUIT",
    type:     'starter',
    cost:     0,
    level:    0,
    atk:      2,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   1,
    effects:  [],
    desc:     "A barbarian recruit, fresh to rage. Deal 2 Physical damage. Gain 1 Defence.",
    art:      make_art_painter('starter'),
  },

  {
    id:       'militia_2',
    role:     'physical',
    name:     "BARBARIAN RECRUIT",
    type:     'starter',
    cost:     0,
    level:    0,
    atk:      2,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   1,
    effects:  [],
    desc:     "A barbarian recruit, fresh to rage. Deal 2 Physical damage. Gain 1 Defence.",
    art:      make_art_painter('starter'),
  },

];

Registry.register_cards_starter(cards_starter);
