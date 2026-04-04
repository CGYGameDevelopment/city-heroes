// cards_upgrades.js
// All promoted hero definitions available in the post-fight upgrade pool.
// Cards are type 'promoted', cost 0, and are never part of the market.
// Do not add engine logic to this file.

var cards_upgrades = [

  {
    id:       'warlord',
    role:     'physical',
    level:    4,
    name:     'WARLORD',
    type:     'promoted',
    cost:     0,
    atk:      6,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Deal 6 Physical damage.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'archmage',
    role:     'magical',
    level:    5,
    name:     'ARCHMAGE',
    type:     'promoted',
    cost:     0,
    atk:      5,
    atk_type: 'magical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      {
        type:      'stun',
        selection: 'random',
      },
    ],
    desc:     'Deal 5 Magical damage. Stun a random Monster.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'high_priest',
    role:     'magical',
    level:    4,
    name:     'HIGH PRIEST',
    type:     'promoted',
    cost:     0,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   6,
    shield:   4,
    effects:  [],
    desc:     'Restore 6 Morale. Gain 4 Defence.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'spymaster',
    role:     'tactical',
    level:    4,
    name:     'SPYMASTER',
    type:     'promoted',
    cost:     0,
    atk:      3,
    atk_type: 'physical',
    gold:     3,
    morale:   0,
    shield:   0,
    effects:  [
      {
        type:   'weaken_atk',
        amount: 2,
      },
    ],
    desc:     'Deal 3 Physical damage. Gain 3 Gold. Weaken Enemy ATK by 2.',
    art:      make_art_painter('tactical'),
  },

  {
    id:       'battle_cleric',
    role:     'magical',
    level:    5,
    name:     'BATTLE CLERIC',
    type:     'promoted',
    cost:     0,
    atk:      3,
    atk_type: 'magical',
    gold:     0,
    morale:   3,
    shield:   0,
    effects:  [
      {
        type:      'recur',
        selection: 'random',
      },
    ],
    desc:     'Deal 3 Magical damage. Restore 3 Morale. Recall a random Hero from discard.',
    art:      make_art_painter('magical'),
  },

];
