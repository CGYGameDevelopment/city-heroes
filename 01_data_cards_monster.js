// cards_monster.js
// All monster card definitions, organised by tier.
// Each tier's cards form a shared pool used by all Big Bads of that tier.
// Cards are type 'monster', cost 0, and are never part of the player's deck.
// Do not add engine logic to this file.

// ---------------------------------------------------------------------------
// Tier 1
// Simple and readable — pure damage, minor drain.
// ---------------------------------------------------------------------------

var cards_monster_tier_1 = [

  {
    id:       'gnoll_raider',
    role:     'physical',
    level:    1,
    name:     'GNOLL RAIDER',
    type:     'monster',
    cost:     0,
    atk:      3,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Deal 3 Physical damage.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'cave_bat',
    role:     'physical',
    level:    2,
    name:     'CAVE BAT',
    type:     'monster',
    cost:     0,
    atk:      2,
    atk_type: 'physical',
    gold:     -1,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Deal 2 Physical damage. Drain 1 Gold.',
    art:      make_art_painter('physical'),
  },

];

// ---------------------------------------------------------------------------
// Tier 2
// Introduces disruption — corruption, debuffs.
// ---------------------------------------------------------------------------

var cards_monster_tier_2 = [

  {
    id:       'cursed_herald',
    role:     'magical',
    level:    3,
    name:     'CURSED HERALD',
    type:     'monster',
    cost:     0,
    atk:      2,
    atk_type: 'magical',
    gold:     -3,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Deal 2 Magical damage. Drain 3 Gold.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'iron_sentinel',
    role:     'physical',
    level:    2,
    name:     'IRON SENTINEL',
    type:     'monster',
    cost:     0,
    atk:      3,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   4,
    effects:  [],
    desc:     'Deal 3 Physical damage. Gain 4 Monster Shield.',
    art:      make_art_painter('physical'),
  },

];

// ---------------------------------------------------------------------------
// Tier 3
// Escalates to deck destruction and healing.
// ---------------------------------------------------------------------------

var cards_monster_tier_3 = [

  {
    id:       'death_wraith',
    role:     'magical',
    level:    5,
    name:     'DEATH WRAITH',
    type:     'monster',
    cost:     0,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      {
        type:      'kill',
        selection: 'random',
        fallback:  'none',
      },
    ],
    desc:     'Slay a random Hero.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'void_leviathan',
    role:     'magical',
    level:    4,
    name:     'VOID LEVIATHAN',
    type:     'monster',
    cost:     0,
    atk:      5,
    atk_type: 'magical',
    gold:     -2,
    morale:   0,
    shield:   3,
    effects:  [],
    desc:     'Deal 5 Magical damage. Drain 2 Gold. Gain 3 Monster Shield.',
    art:      make_art_painter('magical'),
  },

];
