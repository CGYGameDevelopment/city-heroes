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
    weak_against:      'magical',  // burns easily; arcane fire breaks goblin morale
    strong_against:    'physical', // raw blade-on-blade favours the swarm
    monster_tribes:    ['goblinoid'],
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
    weak_against:      'physical',  // tough hide, but a focused strike fells beasts
    strong_against:    'tactical',  // gold and tricks won't stop a maddened animal
    monster_tribes:    ['beast'],
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
    weak_against:      'magical',  // arcane heat warps iron faster than steel can
    strong_against:    'physical', // its armour shrugs off mundane blades
    monster_tribes:    ['construct'],
    deck_desc:         'A heavily armoured construct. Its deck layers monster shields onto the board each turn. Brute-force physical attacks will be wasted.',
    victory_message:   'The golem crumbles to scrap. The foundry grows cold.',
    defeat_message:    'The golem\'s shields held. The city could not match its armour.',
  },

  {
    id:                'wickerman',
    role:              'magical',
    level:             20,
    name:              'WICKERMAN',
    title:             'Effigy of the Hollow Vow',
    tier:              2,
    max_hp:            60,
    atk:               2,
    monsters_per_turn: 3,
    weak_against:      'physical',
    strong_against:    'magical',
    monster_tribes:    ['goblinoid', 'beast'],
    deck_desc:         'A wood-and-bone idol that drowns the city in a tide of cultists and their feral pets. Lighter hits, more bodies — your hero slots will fill fast.',
    victory_message:   'The Wickerman collapses into ash. The cult disperses.',
    defeat_message:    'The cult\'s endless faithful overran the streets.',
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
    weak_against:      'physical', // a clean blade through the throat ends the dance
    strong_against:    'magical',  // serpent magic devours competing magic
    monster_tribes:    ['serpent'],
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
    weak_against:      'tactical', // cunning planning unravels a centuries-old strategy
    strong_against:    'magical',  // necromancy drinks lesser arcana
    monster_tribes:    ['undead', 'void'],
    deck_desc:         'An ancient undead lord. Its deck kills heroes outright and hits with overwhelming magical force. Expect to lose party members permanently.',
    victory_message:   'The Sovereign\'s phylactery shatters. The undead crumble to dust.',
    defeat_message:    'The Sovereign\'s armies were endless. The city fell to the dark.',
  },

];

// ---------------------------------------------------------------------------
// Tier 3 — additional bosses (Phase 8)
// ---------------------------------------------------------------------------

big_bads_tier_3.push(
  {
    id:                'voidweaver',
    role:              'magical',
    level:             20,
    name:              'VOIDWEAVER',
    title:             'The Hand Beyond the Veil',
    tier:              3,
    max_hp:            85,
    atk:               4,
    monsters_per_turn: 3,
    weak_against:      'tactical',
    strong_against:    'magical',
    monster_tribes:    ['void'],
    deck_desc:         'A cold geometry of monsters from outside. Its summons hit hard and fast — bring direct damage and discard-recovery.',
    victory_message:   'The Voidweaver unspools into the dark. The veil holds.',
    defeat_message:    'The void poured into the city and would not stop.',
  },

  {
    id:                'crimson_tyrant',
    role:              'physical',
    level:             20,
    name:              'CRIMSON TYRANT',
    title:             'King of the Burning Crag',
    tier:              3,
    max_hp:            120,
    atk:               6,
    monsters_per_turn: 2,
    weak_against:      'magical',
    strong_against:    'physical',
    monster_tribes:    ['beast', 'goblinoid'],
    deck_desc:         'A scaled warlord in red plate. Few summons, but each hit lands like a hammer. Stack defence and bring magical bursts.',
    victory_message:   'The Tyrant\'s flame guts out. The crag is silent.',
    defeat_message:    'The Tyrant\'s wrath broke the gates.',
  },
);

Registry.register_big_bads(1, big_bads_tier_1);
Registry.register_big_bads(2, big_bads_tier_2);
Registry.register_big_bads(3, big_bads_tier_3);
