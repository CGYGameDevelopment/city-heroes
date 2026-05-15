// cards_monster.js
// All monster card definitions, organised by tier.
// Each tier's cards form a shared pool used by all Big Bads of that tier.
// Cards are type 'monster', cost 0, and are never part of the player's deck.
// Do not add engine logic to this file.
//
// Phase 4 — Tribe field. Each monster carries a `tribe` tag. A Big Bad with
// `monster_tribes: ['undead', 'beast']` will only summon monsters whose tribe
// is in that list. If a Big Bad omits monster_tribes, the full tier pool is
// used (legacy behaviour).
//
// Tribes:
//   beast      — wild creatures, brute physical pressure
//   goblinoid  — light raiders, swarm pressure
//   construct  — armoured, shielded, slow
//   undead     — disruption, kill effects, gold drain
//   serpent    — venomous, gold drain, sustained pressure
//   void       — late-game terror, deck destruction

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
    tribe:    'goblinoid',
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
    tribe:    'beast',
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
    id:       'goblin_skirmisher',
    role:     'physical',
    level:    1,
    name:     'GOBLIN SKIRMISHER',
    type:     'monster',
    tribe:    'goblinoid',
    cost:     0,
    atk:      2,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   1,
    effects:  [],
    desc:     'Deal 2 Physical damage. +1 Monster Shield.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'rabid_wolf',
    role:     'physical',
    level:    2,
    name:     'RABID WOLF',
    type:     'monster',
    tribe:    'beast',
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
    id:       'shrieker',
    role:     'magical',
    level:    1,
    name:     'SHRIEKER',
    type:     'monster',
    tribe:    'beast',
    cost:     0,
    atk:      2,
    atk_type: 'magical',
    gold:     -1,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Deal 2 Magical damage. Drain 1 Gold.',
    art:      make_art_painter('magical'),
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
    tribe:    'undead',
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
    tribe:    'construct',
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
    id:       'venom_serpent',
    role:     'magical',
    level:    3,
    name:     'VENOM SERPENT',
    type:     'monster',
    tribe:    'serpent',
    cost:     0,
    atk:      3,
    atk_type: 'magical',
    gold:     -2,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Deal 3 Magical damage. Drain 2 Gold.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'forge_warden',
    role:     'physical',
    level:    3,
    name:     'FORGE WARDEN',
    type:     'monster',
    tribe:    'construct',
    cost:     0,
    atk:      4,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   2,
    effects:  [],
    desc:     'Deal 4 Physical damage. +2 Monster Shield.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'gnoll_chieftain',
    role:     'physical',
    level:    3,
    name:     'GNOLL CHIEFTAIN',
    type:     'monster',
    tribe:    'goblinoid',
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
    id:       'fang_witch',
    role:     'magical',
    level:    3,
    name:     'FANG WITCH',
    type:     'monster',
    tribe:    'serpent',
    cost:     0,
    atk:      2,
    atk_type: 'magical',
    gold:     -1,
    morale:   0,
    shield:   1,
    effects:  [],
    desc:     'Deal 2 Magical damage. Drain 1 Gold. +1 Monster Shield.',
    art:      make_art_painter('magical'),
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
    tribe:    'undead',
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
    tribe:    'void',
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
    id:       'bone_lord',
    role:     'magical',
    level:    4,
    name:     'BONE LORD',
    type:     'monster',
    tribe:    'undead',
    cost:     0,
    atk:      4,
    atk_type: 'magical',
    gold:     0,
    morale:   0,
    shield:   2,
    effects:  [],
    desc:     'Deal 4 Magical damage. +2 Monster Shield.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'plague_carrier',
    role:     'magical',
    level:    4,
    name:     'PLAGUE CARRIER',
    type:     'monster',
    tribe:    'undead',
    cost:     0,
    atk:      3,
    atk_type: 'magical',
    gold:     -1,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Deal 3 Magical damage. Drain 1 Gold.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'shadow_stalker',
    role:     'magical',
    level:    4,
    name:     'SHADOW STALKER',
    type:     'monster',
    tribe:    'void',
    cost:     0,
    atk:      6,
    atk_type: 'magical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Deal 6 Magical damage.',
    art:      make_art_painter('magical'),
  },

];

Registry.register_cards_monster(1, cards_monster_tier_1);
Registry.register_cards_monster(2, cards_monster_tier_2);
Registry.register_cards_monster(3, cards_monster_tier_3);
