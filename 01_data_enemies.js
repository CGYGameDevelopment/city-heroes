// big_bads.js
// All Big Bad definitions, organised by tier.
// One Big Bad is drawn at random per fight from the pool matching that fight's tier.
// Do not add engine logic to this file.

// ---------------------------------------------------------------------------
// Tier 1
// Low HP, low ATK, low monster pressure — an accessible opener.
// ---------------------------------------------------------------------------

var big_bads_tier_1 = [

  {
    id:                'goblin_warchief',
    role:              'physical',
    level:             20,
    name:              'GOBLIN WARCHIEF',
    title:             'Ruler of the Scrag Warrens',
    tier:              1,
    max_hp:            45,
    atk:               2,
    monsters_per_turn: 2,
    deck_desc:         'A swarm of quick, light raiders. Expect sustained physical pressure every turn.',
    victory_message:   'The Warchief lies defeated. The warrens fall silent.',
    defeat_message:    'The goblin tide overwhelmed the city walls.',
  },

  {
    id:                'plagued_bear',
    role:              'physical',
    level:             20,
    name:              'PLAGUED BEAR',
    title:             'Beast of the Rotwood',
    tier:              1,
    max_hp:            50,
    atk:               3,
    monsters_per_turn: 1,
    deck_desc:         'A slow but powerful beast. Fewer cards per turn, but each hit lands hard.',
    victory_message:   'The beast collapses into the mud. The Rotwood is quiet.',
    defeat_message:    'The bear\'s relentless charges broke the city\'s resolve.',
  },

];

// ---------------------------------------------------------------------------
// Tier 2
// Higher HP and ATK, mixed monster decks with disruption.
// ---------------------------------------------------------------------------

var big_bads_tier_2 = [

  {
    id:                'iron_golem',
    role:              'physical',
    level:             20,
    name:              'IRON GOLEM',
    title:             'Forged in the Sunken Foundry',
    tier:              2,
    max_hp:            70,
    atk:               3,
    monsters_per_turn: 2,
    deck_desc:         'A heavily armoured construct. Its deck layers monster shields onto the board each turn. Brute-force physical attacks will be wasted.',
    victory_message:   'The golem crumbles to scrap. The foundry grows cold.',
    defeat_message:    'The golem\'s shields held. The city could not match its armour.',
  },

  {
    id:                'serpent_queen',
    role:              'magical',
    level:             20,
    name:              'SERPENT QUEEN',
    title:             'Empress of the Amber Depths',
    tier:              2,
    max_hp:            65,
    atk:               4,
    monsters_per_turn: 2,
    deck_desc:         'A cunning predator. Her deck bleeds your Gold Pool and deals magical damage. Expect to recruit fewer heroes than planned.',
    victory_message:   'The Serpent Queen dissolves into the deep. The amber grows still.',
    defeat_message:    'Her venom drained the city\'s coffers before the walls could hold.',
  },

];

// ---------------------------------------------------------------------------
// Tier 3
// High HP, high ATK, aggressive monster decks with deck destruction.
// ---------------------------------------------------------------------------

var big_bads_tier_3 = [

  {
    id:                'lich_sovereign',
    role:              'magical',
    level:             20,
    name:              'LICH SOVEREIGN',
    title:             'The Undying Throne',
    tier:              3,
    max_hp:            100,
    atk:               5,
    monsters_per_turn: 3,
    deck_desc:         'An ancient undead lord. Its deck kills heroes outright and hits with overwhelming magical force. Expect to lose party members permanently.',
    victory_message:   'The Sovereign\'s phylactery shatters. The undead crumble to dust.',
    defeat_message:    'The Sovereign\'s armies were endless. The city fell to the dark.',
  },

];

Registry.register_big_bads(1, big_bads_tier_1);
Registry.register_big_bads(2, big_bads_tier_2);
Registry.register_big_bads(3, big_bads_tier_3);
