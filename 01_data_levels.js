// cities.js
// All city definitions. A new city is randomly selected at the start of each fight.
//
// Static stats (max_morale, market_size, starting_def, hero_cost_discount,
// bonus_gold_per_turn) shape the *baseline* of a fight. Phase 9 adds an
// optional `passives` array that fires effects at engine hooks
// ('start_of_turn', 'start_of_fight', 'on_recruit', 'on_turn_end') —
// same schema as treasures.
//
// Do not add engine logic to this file.

const cities = [

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
      { trigger: 'always_on', desc: 'The market opens with 3 slots. +1 Gold at the start of every turn.' },
    ],
    passives: [
      { hook: 'start_of_turn', effect: { type: 'gain_gold', amount: 1 } },
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
      { trigger: 'always_on', desc: 'Starts each fight with 5 Defence. +1 Defence at the start of every turn.' },
    ],
    passives: [
      { hook: 'start_of_turn', effect: { type: 'gain_shield', amount: 1 } },
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
      { trigger: 'always_on', desc: 'Market opens with 4 slots. Draw 1 extra card at the start of each fight.' },
    ],
    passives: [
      { hook: 'start_of_fight', effect: { type: 'draw', amount: 1 } },
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
      { trigger: 'always_on', desc: 'Hero cards cost 1 less Gold (min 1). On every recruit, deal 1 piercing damage to the Big Bad.' },
    ],
    passives: [
      { hook: 'on_recruit', effect: { type: 'damage', amount: 1, target: 'big_bad', pierce: true } },
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
      { trigger: 'always_on', desc: '+2 Gold per turn. +1 Morale at the end of every turn.' },
    ],
    passives: [
      { hook: 'on_turn_end', effect: { type: 'gain_morale', amount: 1 } },
    ],
  },

];

Registry.register_cities(cities);
