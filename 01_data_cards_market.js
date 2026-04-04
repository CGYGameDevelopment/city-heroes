// cards_market.js
// All recruitable hero cards available in the Market pool.
// Cards are type 'hero' and have a non-zero cost.
// Do not add engine logic to this file.
// Calls Registry.register_cards_market() — registry.js must load first.

Registry.register_cards_market([

  // ─────────────────────────────────────────────────────────────
  // PHYSICAL — Level 1
  // ─────────────────────────────────────────────────────────────

  {
    id:       'soldier',
    role:     'physical',
    level:    1,
    name:     'SOLDIER',
    type:     'hero',
    cost:     3,
    atk:      5,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Deal 5 Physical damage.',
    art:      make_art_painter('physical'),
  },

  // ─────────────────────────────────────────────────────────────
  // PHYSICAL — Level 2
  // ─────────────────────────────────────────────────────────────

  {
    id:       'spearman',
    role:     'physical',
    level:    2,
    name:     'SPEARMAN',
    type:     'hero',
    cost:     3,
    atk:      4,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   2,
    effects:  [],
    desc:     'Deal 4 Physical damage. Gain 2 Defence.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'outrider',
    role:     'physical',
    level:    2,
    name:     'OUTRIDER',
    type:     'hero',
    cost:     3,
    atk:      2,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'draw', amount: 1 },
    ],
    desc:     'Deal 2 Physical damage. Draw 1 card.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'novice_brawler',
    role:     'physical',
    level:    2,
    name:     'NOVICE BRAWLER',
    type:     'hero',
    cost:     2,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'stun', selection: 'random' },
    ],
    desc:     'Stun a random Monster.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'sentinel',
    role:     'physical',
    level:    2,
    name:     'SENTINEL',
    type:     'hero',
    cost:     3,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   0,
    shield:   3,
    effects:  [
      { type: 'scrap', target: 'starter' },
    ],
    desc:     'Gain 3 Defence. Scrap a random Starter from your deck.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'recruiter',
    role:     'physical',
    level:    2,
    name:     'RECRUITER',
    type:     'hero',
    cost:     3,
    atk:      2,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      {
        type:         'transform',
        target:       { match: 'type', value: 'starter' },
        replace_with: 'soldier',
        zones:        ['field'],
        selection:    'random',
        fallback:     'none',
      },
    ],
    desc:     'Deal 2 Physical damage. Transform a random Starter on the field into a Soldier.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'corsair',
    role:     'physical',
    level:    2,
    name:     'CORSAIR',
    type:     'hero',
    cost:     3,
    atk:      2,
    atk_type: 'physical',
    gold:     2,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'shield_drain', amount: 2 },
    ],
    desc:     'Deal 2 Physical damage. Gain 2 Gold. Drain 2 Monster Shield.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'berserker',
    role:     'physical',
    level:    2,
    name:     'BERSERKER',
    type:     'hero',
    cost:     3,
    atk:      4,
    atk_type: 'physical',
    gold:     0,
    morale:   -2,
    shield:   0,
    effects:  [],
    desc:     'Deal 4 Physical damage. Deal 2 Morale damage.',
    art:      make_art_painter('physical'),
  },

  // ─────────────────────────────────────────────────────────────
  // PHYSICAL — Level 3
  // ─────────────────────────────────────────────────────────────

  {
    id:       'veteran',
    role:     'physical',
    level:    3,
    name:     'VETERAN',
    type:     'hero',
    cost:     4,
    atk:      5,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      {
        type:      'field_bonus',
        condition: 'adjacent_role_match',
        stat:      'atk',
        amount:    2,
      },
    ],
    desc:     'Deal 5 Physical damage. +2 ATK if an adjacent Hero is also Physical.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'duellist',
    role:     'physical',
    level:    3,
    name:     'DUELLIST',
    type:     'hero',
    cost:     4,
    atk:      3,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'stun', selection: 'opposite' },
    ],
    desc:     'Deal 3 Physical damage. Stun all opposite Monsters.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'war_priest',
    role:     'physical',
    level:    3,
    name:     'WAR PRIEST',
    type:     'hero',
    cost:     4,
    atk:      4,
    atk_type: 'physical',
    gold:     0,
    morale:   2,
    shield:   0,
    effects:  [],
    desc:     'Deal 4 Physical damage. Restore 2 Morale.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'blood_knight',
    role:     'physical',
    level:    3,
    name:     'BLOOD KNIGHT',
    type:     'hero',
    cost:     4,
    atk:      6,
    atk_type: 'physical',
    gold:     0,
    morale:   -3,
    shield:   0,
    effects:  [],
    desc:     'Deal 6 Physical damage. Deal 3 Morale damage.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'gladiator',
    role:     'physical',
    level:    3,
    name:     'GLADIATOR',
    type:     'hero',
    cost:     5,
    atk:      8,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Deal 8 Physical damage.',
    art:      make_art_painter('physical'),
  },

  // ─────────────────────────────────────────────────────────────
  // PHYSICAL — Level 4
  // ─────────────────────────────────────────────────────────────

  {
    id:       'warbringer',
    role:     'physical',
    level:    4,
    name:     'WARBRINGER',
    type:     'hero',
    cost:     5,
    atk:      6,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'stat_mod_all', stat: 'atk', amount: 1, duration: 'turn' },
    ],
    desc:     'Deal 6 Physical damage. All Heroes gain +1 ATK this turn.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'oath_knight',
    role:     'physical',
    level:    4,
    name:     'OATH KNIGHT',
    type:     'hero',
    cost:     5,
    atk:      4,
    atk_type: 'physical',
    gold:     0,
    morale:   2,
    shield:   5,
    effects:  [],
    desc:     'Deal 4 Physical damage. Gain 5 Defence. Restore 2 Morale.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'brawler',
    role:     'physical',
    level:    4,
    name:     'BRAWLER',
    type:     'hero',
    cost:     4,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'stun', selection: 'opposite' },
    ],
    desc:     'Stun all Monsters opposite this card\'s slot.',
    art:      make_art_painter('physical'),
  },

  // ─────────────────────────────────────────────────────────────
  // PHYSICAL — Level 5
  // ─────────────────────────────────────────────────────────────

  {
    id:       'dragonslayer',
    role:     'physical',
    level:    5,
    name:     'DRAGONSLAYER',
    type:     'hero',
    cost:     6,
    atk:      10,
    atk_type: 'physical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Deal 10 Physical damage.',
    art:      make_art_painter('physical'),
  },

  {
    id:       'apprentice',
    role:     'magical',
    level:    1,
    name:     'APPRENTICE',
    type:     'hero',
    cost:     2,
    atk:      3,
    atk_type: 'magical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Deal 3 Magical damage.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'black_mage',
    role:     'magical',
    level:    1,
    name:     'BLACK MAGE',
    type:     'hero',
    cost:     3,
    atk:      4,
    atk_type: 'magical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Deal 4 Magical damage.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'white_mage',
    role:     'magical',
    level:    1,
    name:     'WHITE MAGE',
    type:     'hero',
    cost:     3,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   3,
    shield:   0,
    effects:  [],
    desc:     'Restore 3 Morale.',
    art:      make_art_painter('magical'),
  },

  // ─────────────────────────────────────────────────────────────
  // MAGICAL — Level 2
  // ─────────────────────────────────────────────────────────────

  {
    id:       'conjurer',
    role:     'magical',
    level:    2,
    name:     'CONJURER',
    type:     'hero',
    cost:     3,
    atk:      4,
    atk_type: 'magical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'draw', amount: 1 },
    ],
    desc:     'Deal 4 Magical damage. Draw 1 card.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'runesmith',
    role:     'magical',
    level:    2,
    name:     'RUNESMITH',
    type:     'hero',
    cost:     3,
    atk:      2,
    atk_type: 'magical',
    gold:     0,
    morale:   0,
    shield:   3,
    effects:  [],
    desc:     'Deal 2 Magical damage. Gain 3 Defence.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'seer',
    role:     'magical',
    level:    2,
    name:     'SEER',
    type:     'hero',
    cost:     3,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   3,
    shield:   0,
    effects:  [
      { type: 'draw', amount: 1 },
    ],
    desc:     'Restore 3 Morale. Draw 1 card.',
    art:      make_art_painter('magical'),
  },

  // ─────────────────────────────────────────────────────────────
  // MAGICAL — Level 3
  // ─────────────────────────────────────────────────────────────

  {
    id:       'hexblade',
    role:     'magical',
    level:    3,
    name:     'HEXBLADE',
    type:     'hero',
    cost:     4,
    atk:      3,
    atk_type: 'magical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'stun', selection: 'random' },
    ],
    desc:     'Deal 3 Magical damage. Stun a random Monster.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'enchantress',
    role:     'magical',
    level:    3,
    name:     'ENCHANTRESS',
    type:     'hero',
    cost:     4,
    atk:      3,
    atk_type: 'magical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'cost_reduce', amount: 2 },
    ],
    desc:     'Deal 3 Magical damage. Your next recruit this turn costs 2 less Gold.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'war_mage',
    role:     'magical',
    level:    3,
    name:     'WAR MAGE',
    type:     'hero',
    cost:     4,
    atk:      5,
    atk_type: 'magical',
    gold:     0,
    morale:   0,
    shield:   2,
    effects:  [],
    desc:     'Deal 5 Magical damage. Gain 2 Defence.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'soul_binder',
    role:     'magical',
    level:    3,
    name:     'SOUL BINDER',
    type:     'hero',
    cost:     4,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   2,
    shield:   0,
    effects:  [
      { type: 'recur', selection: 'random', fallback: 'none' },
    ],
    desc:     'Restore 2 Morale. Recall a random Hero from discard.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'necromancer',
    role:     'magical',
    level:    3,
    name:     'NECROMANCER',
    type:     'hero',
    cost:     3,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'recur', selection: 'random', fallback: 'none' },
    ],
    desc:     'Recall a random Hero from discard.',
    art:      make_art_painter('magical'),
  },

  // ─────────────────────────────────────────────────────────────
  // MAGICAL — Level 4
  // ─────────────────────────────────────────────────────────────

  {
    id:       'oracle',
    role:     'magical',
    level:    4,
    name:     'ORACLE',
    type:     'hero',
    cost:     4,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   4,
    shield:   2,
    effects:  [
      { type: 'stun', selection: 'random' },
    ],
    desc:     'Restore 4 Morale. Gain 2 Defence. Stun a random Monster.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'pyromancer',
    role:     'magical',
    level:    4,
    name:     'PYROMANCER',
    type:     'hero',
    cost:     5,
    atk:      7,
    atk_type: 'magical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'stun', selection: 'random' },
    ],
    desc:     'Deal 7 Magical damage. Stun a random Monster.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'chronomancer',
    role:     'magical',
    level:    4,
    name:     'CHRONOMANCER',
    type:     'hero',
    cost:     5,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'haste', target_side: 'monster' },
      { type: 'draw', amount: 1 },
    ],
    desc:     'Force a random Monster to act next in sequence. Draw 1 card.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'mind_breaker',
    role:     'magical',
    level:    4,
    name:     'MIND BREAKER',
    type:     'hero',
    cost:     5,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'stop', target_side: 'monster' },
      { type: 'weaken_atk', amount: 2 },
    ],
    desc:     'Stop a random Monster from acting this turn. Weaken Enemy ATK by 2.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'freeze_mage',
    role:     'magical',
    level:    4,
    name:     'FREEZE MAGE',
    type:     'hero',
    cost:     5,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'stun', selection: 'opposite' },
    ],
    desc:     'Stun all Monsters opposite this card\'s slot.',
    art:      make_art_painter('magical'),
  },

  // ─────────────────────────────────────────────────────────────
  // MAGICAL — Level 5
  // ─────────────────────────────────────────────────────────────

  {
    id:       'grand_wizard',
    role:     'magical',
    level:    5,
    name:     'GRAND WIZARD',
    type:     'hero',
    cost:     6,
    atk:      8,
    atk_type: 'magical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'draw', amount: 1 },
    ],
    desc:     'Deal 8 Magical damage. Draw 1 card.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'storm_witch',
    role:     'magical',
    level:    5,
    name:     'STORM WITCH',
    type:     'hero',
    cost:     6,
    atk:      6,
    atk_type: 'magical',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'stun', selection: 'opposite' },
    ],
    desc:     'Deal 6 Magical damage. Stun all opposite Monsters.',
    art:      make_art_painter('magical'),
  },

  {
    id:       'exorcist',
    role:     'magical',
    level:    5,
    name:     'EXORCIST',
    type:     'hero',
    cost:     5,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'kill_monster', selection: 'random', fallback: 'none' },
    ],
    desc:     'Banish a random Monster permanently.',
    art:      make_art_painter('magical'),
  },

  // ─────────────────────────────────────────────────────────────
  // TACTICAL — Level 1
  // ─────────────────────────────────────────────────────────────

  {
    id:       'merchant',
    role:     'tactical',
    level:    1,
    name:     'MERCHANT',
    type:     'hero',
    cost:     3,
    atk:      0,
    atk_type: 'none',
    gold:     3,
    morale:   0,
    shield:   0,
    effects:  [],
    desc:     'Gain 3 Gold.',
    art:      make_art_painter('tactical'),
  },

  {
    id:       'fence',
    role:     'tactical',
    level:    1,
    name:     'FENCE',
    type:     'hero',
    cost:     2,
    atk:      0,
    atk_type: 'none',
    gold:     2,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'draw', amount: 1 },
    ],
    desc:     'Gain 2 Gold. Draw 1 card.',
    art:      make_art_painter('tactical'),
  },

  {
    id:       'scout',
    role:     'tactical',
    level:    1,
    name:     'SCOUT',
    type:     'hero',
    cost:     2,
    atk:      0,
    atk_type: 'none',
    gold:     1,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'scrap', target: 'starter' },
    ],
    desc:     'Gain 1 Gold. Scrap a random Starter from your deck.',
    art:      make_art_painter('tactical'),
  },

  // ─────────────────────────────────────────────────────────────
  // TACTICAL — Level 2
  // ─────────────────────────────────────────────────────────────

  {
    id:       'informant',
    role:     'tactical',
    level:    2,
    name:     'INFORMANT',
    type:     'hero',
    cost:     3,
    atk:      0,
    atk_type: 'none',
    gold:     3,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'weaken_atk', amount: 1 },
    ],
    desc:     'Gain 3 Gold. Weaken Enemy ATK by 1.',
    art:      make_art_painter('tactical'),
  },

  {
    id:       'alchemist',
    role:     'tactical',
    level:    2,
    name:     'ALCHEMIST',
    type:     'hero',
    cost:     3,
    atk:      0,
    atk_type: 'none',
    gold:     2,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'cost_reduce', amount: 2 },
    ],
    desc:     'Gain 2 Gold. Your next recruit this turn costs 2 less Gold.',
    art:      make_art_painter('tactical'),
  },

  // ─────────────────────────────────────────────────────────────
  // TACTICAL — Level 3
  // ─────────────────────────────────────────────────────────────

  {
    id:       'guildmaster',
    role:     'tactical',
    level:    3,
    name:     'GUILDMASTER',
    type:     'hero',
    cost:     4,
    atk:      0,
    atk_type: 'none',
    gold:     1,
    morale:   0,
    shield:   0,
    effects:  [
      {
        type:         'transform',
        target:       { match: 'id', value: 'peddler' },
        replace_with: 'merchant',
        zones:        ['field'],
        selection:    'random',
        fallback:     'none',
      },
    ],
    desc:     'Gain 1 Gold. Transform a random Peddler on the field into a Merchant.',
    art:      make_art_painter('tactical'),
  },

  {
    id:       'duelist_captain',
    role:     'tactical',
    level:    3,
    name:     'DUELIST CAPTAIN',
    type:     'hero',
    cost:     4,
    atk:      2,
    atk_type: 'physical',
    gold:     2,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'stun', selection: 'random' },
    ],
    desc:     'Deal 2 Physical damage. Gain 2 Gold. Stun a random Monster.',
    art:      make_art_painter('tactical'),
  },

  {
    id:       'quartermaster',
    role:     'tactical',
    level:    3,
    name:     'QUARTERMASTER',
    type:     'hero',
    cost:     4,
    atk:      0,
    atk_type: 'none',
    gold:     2,
    morale:   0,
    shield:   3,
    effects:  [
      { type: 'draw', amount: 1 },
    ],
    desc:     'Gain 2 Gold. Gain 3 Defence. Draw 1 card.',
    art:      make_art_painter('tactical'),
  },

  {
    id:       'strategist',
    role:     'tactical',
    level:    3,
    name:     'STRATEGIST',
    type:     'hero',
    cost:     4,
    atk:      0,
    atk_type: 'none',
    gold:     0,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'stat_mod_all', stat: 'atk', amount: 2, duration: 'turn' },
    ],
    desc:     'All Heroes gain +2 ATK this turn.',
    art:      make_art_painter('tactical'),
  },

  {
    id:       'spymaster_adept',
    role:     'tactical',
    level:    4,
    name:     'SPYMASTER ADEPT',
    type:     'hero',
    cost:     5,
    atk:      3,
    atk_type: 'physical',
    gold:     3,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'weaken_atk', amount: 2 },
    ],
    desc:     'Deal 3 Physical damage. Gain 3 Gold. Weaken Enemy ATK by 2.',
    art:      make_art_painter('tactical'),
  },

  {
    id:       'war_profiteer',
    role:     'tactical',
    level:    4,
    name:     'WAR PROFITEER',
    type:     'hero',
    cost:     5,
    atk:      0,
    atk_type: 'none',
    gold:     5,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'draw', amount: 1 },
    ],
    desc:     'Gain 5 Gold. Draw 1 card.',
    art:      make_art_painter('tactical'),
  },

  {
    id:       'rogue_assassin',
    role:     'tactical',
    level:    4,
    name:     'ROGUE ASSASSIN',
    type:     'hero',
    cost:     5,
    atk:      4,
    atk_type: 'physical',
    gold:     2,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'stop', target_side: 'monster' },
    ],
    desc:     'Deal 4 Physical damage. Gain 2 Gold. Stop a random Monster from acting this turn.',
    art:      make_art_painter('tactical'),
  },

  // ─────────────────────────────────────────────────────────────
  // TACTICAL — Level 5
  // ─────────────────────────────────────────────────────────────

  {
    id:       'shadowlord',
    role:     'tactical',
    level:    5,
    name:     'SHADOWLORD',
    type:     'hero',
    cost:     6,
    atk:      3,
    atk_type: 'physical',
    gold:     4,
    morale:   0,
    shield:   0,
    effects:  [
      { type: 'stun', selection: 'opposite' },
      { type: 'weaken_atk', amount: 1 },
    ],
    desc:     'Deal 3 Physical damage. Gain 4 Gold. Stun all opposite Monsters. Weaken Enemy ATK by 1.',
    art:      make_art_painter('tactical'),
  },

]);