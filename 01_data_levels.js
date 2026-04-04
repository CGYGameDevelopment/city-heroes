// cities.js
// All city definitions. A new city is randomly selected at the start of each fight.
// City effects are always-on. Conditional auto-triggers are not yet implemented —
// all effects use trigger: 'always_on'. Do not add engine logic to this file.

var cities = [

  {
    id:                 'stonehaven',
    name:               'STONEHAVEN',
    type:               'Trading Post',
    max_morale:         35,
    market_size:        3,
    starting_def:       0,
    hero_cost_discount: 0,
    bonus_gold_per_turn: 0,
    effects: [
      {
        trigger: 'always_on',
        desc:    'The market opens with 3 slots.',
      },
    ],
  },

  {
    id:                 'ironhold',
    name:               'IRONHOLD',
    type:               'Mountain Fortress',
    max_morale:         50,
    market_size:        3,
    starting_def:       5,
    hero_cost_discount: 0,
    bonus_gold_per_turn: 0,
    effects: [
      {
        trigger: 'always_on',
        desc:    'The city starts each fight with 5 City defence already in the pool.',
      },
    ],
  },

  {
    id:                 'duskwater',
    name:               'DUSKWATER',
    type:               'Coastal Refuge',
    max_morale:         30,
    market_size:        4,
    starting_def:       0,
    hero_cost_discount: 0,
    bonus_gold_per_turn: 0,
    effects: [
      {
        trigger: 'always_on',
        desc:    'The market opens with 4 slots instead of the default 3.',
      },
    ],
  },

  {
    id:                 'ashenveil',
    name:               'ASHENVEIL',
    type:               'Cursed Settlement',
    max_morale:         25,
    market_size:        3,
    starting_def:       0,
    hero_cost_discount: 1,
    bonus_gold_per_turn: 0,
    effects: [
      {
        trigger: 'always_on',
        desc:    'All hero cards cost 1 less Gold to recruit (minimum 1).',
      },
    ],
  },

  {
    id:                 'gilded_reach',
    name:               'GILDED REACH',
    type:               'Merchant Republic',
    max_morale:         40,
    market_size:        3,
    starting_def:       0,
    hero_cost_discount: 0,
    bonus_gold_per_turn: 2,
    effects: [
      {
        trigger: 'always_on',
        desc:    'At the start of each Recruit phase, 2 bonus Gold is added to the Gold Pool.',
      },
    ],
  },

];

Registry.register_cities(cities);
