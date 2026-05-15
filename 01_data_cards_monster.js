// cards_monster.js
// All monster card definitions, organised by tier.
// Each tier's cards form a shared pool used by all Big Bads of that tier.
// Cards are type 'monster', cost 0, and are never part of the player's deck.
// Do not add engine logic to this file.

// ---------------------------------------------------------------------------
// Tier 1
// Simple and readable — pure damage, minor drain.
// ---------------------------------------------------------------------------

const cards_monster_tier_1 = [

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

  {
    id:       'goblin_archer',
    role:     'physical',
    level:    1,
    name:     'GOBLIN ARCHER',
    type:     'monster',
    cost:     0,
    atk:      2,
    atk_type: 'physical',
    gold:     0,
    morale:   -2,
    shield:   0,
    effects:  [],
    desc:     'Deal 2 Physical damage. Drain 2 City Morale.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'dire_wolf',
    role:     'physical',
    level:    1,
    name:     'DIRE WOLF',
    type:     'monster',
    cost:     0,
    atk:      5,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Deal 5 Physical damage.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'orc_brute',
    role:     'physical',
    level:    1,
    name:     'ORC BRUTE',
    type:     'monster',
    cost:     0,
    atk:      4,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Deal 4 Physical damage.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'road_bandit',
    role:     'tactical',
    level:    1,
    name:     'ROAD BANDIT',
    type:     'monster',
    cost:     0,
    atk:      2,
    atk_type: 'physical',
    gold:     -2,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Deal 2 Physical damage. Drain 2 Gold.',
    art:      make_art_painter('tactical'),
  },

];

// ---------------------------------------------------------------------------
// Tier 2
// Introduces disruption — corruption, debuffs.
// ---------------------------------------------------------------------------

const cards_monster_tier_2 = [

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

  {
    id:       'plague_bearer',
    role:     'magical',
    level:    3,
    name:     'PLAGUE BEARER',
    type:     'monster',
    cost:     0,
    atk:      2,
    atk_type: 'magical',
    gold:     -1,
    morale:   -3,
    shield:   0,
    effects:  [],
    desc:     'Deal 2 Magical damage. Drain 1 Gold and 3 City Morale.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'stone_golem',
    role:     'physical',
    level:    2,
    name:     'STONE GOLEM',
    type:     'monster',
    cost:     0,
    atk:      4,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   5,
    effects:  [],
    desc:     'Deal 4 Physical damage. Gain 5 Monster Shield.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'siege_troll',
    role:     'physical',
    level:    2,
    name:     'SIEGE TROLL',
    type:     'monster',
    cost:     0,
    atk:      5,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   2,
    effects:  [],
    desc:     'Deal 5 Physical damage. Gain 2 Monster Shield.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'plague_rat',
    role:     'magical',
    level:    2,
    name:     'PLAGUE RAT',
    type:     'monster',
    cost:     0,
    atk:      1,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'corrupt', count: 1 },
    ],
    desc:     'Deal 1 Physical damage. Corrupt 1 of your cards.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'bloodhound',
    role:     'physical',
    level:    2,
    name:     'BLOODHOUND',
    type:     'monster',
    cost:     0,
    atk:      2,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'enrage', amount: 1 },
    ],
    desc:     'Deal 2 Physical damage. Enrage Big Bad — ATK +1 for the rest of this fight.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'nightmare_sprite',
    role:     'magical',
    level:    3,
    name:     'NIGHTMARE SPRITE',
    type:     'monster',
    cost:     0,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   -5,
    shield:   0,
    effects:  [],
    desc:     'Drain 5 City Morale.',
    art:      make_art_painter('magical'),
  },

];

// ---------------------------------------------------------------------------
// Tier 3
// Escalates to deck destruction and healing.
// ---------------------------------------------------------------------------

const cards_monster_tier_3 = [

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

  {
    id:       'chaos_knight',
    role:     'physical',
    level:    4,
    name:     'CHAOS KNIGHT',
    type:     'monster',
    cost:     0,
    atk:      6,
    atk_type: 'physical',
    gold:     0,
    morale:   -2,
    shield:   3,
    effects:  [],
    desc:     'Deal 6 Physical damage. Drain 2 City Morale. Gain 3 Monster Shield.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'banshee',
    role:     'magical',
    level:    5,
    name:     'BANSHEE',
    type:     'monster',
    cost:     0,
    atk:      0,
    atk_type: 'none',
    gold:     -2,
    morale:   -8,
    shield:   0,
    effects:  [
      {
        type:      'kill',
        selection: 'random',
        fallback:  'none',
      },
    ],
    desc:     'Drain 8 City Morale and 2 Gold. Slay a random Hero.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'shadow_titan',
    role:     'physical',
    level:    5,
    name:     'SHADOW TITAN',
    type:     'monster',
    cost:     0,
    atk:      7,
    atk_type: 'physical',
    gold:     0,
    morale:   -3,
    shield:   0,
    effects:  [],
    desc:     'Deal 7 Physical damage. Drain 3 City Morale.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'soul_leech',
    role:     'magical',
    level:    4,
    name:     'SOUL LEECH',
    type:     'monster',
    cost:     0,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   -2,
    shield:   0,
    effects:  [
      { type: 'corrupt', count: 2 },
    ],
    desc:     'Drain 2 City Morale. Corrupt 2 of your cards.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'fury_warbeast',
    role:     'physical',
    level:    4,
    name:     'FURY WARBEAST',
    type:     'monster',
    cost:     0,
    atk:      3,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   2,
    effects:  [
      { type: 'enrage', amount: 2 },
    ],
    desc:     'Deal 3 Physical damage. Gain 2 Monster Shield. Enrage Big Bad — ATK +2 for the rest of this fight.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'void_weaver',
    role:     'magical',
    level:    5,
    name:     'VOID WEAVER',
    type:     'monster',
    cost:     0,
    atk:      3,
    atk_type: 'magical',
    gold:     -2,
    morale:   0,
    shield:   6,
    effects:  [],
    desc:     'Deal 3 Magical damage. Drain 2 Gold. Gain 6 Monster Shield.',
    art:      make_art_painter('magical'),
  },

];

Registry.register_cards_monster(1, cards_monster_tier_1);
Registry.register_cards_monster(2, cards_monster_tier_2);
Registry.register_cards_monster(3, cards_monster_tier_3);
