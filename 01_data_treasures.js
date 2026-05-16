
var treasures = [

  {
    id:     'banner_of_stonehaven',
    name:   'BANNER OF STONEHAVEN',
    desc:   '+1 City Defence at the start of every turn.',
    hook:   'start_of_turn',
    effect: { type: 'gain_shield', amount: 1 },
  },

  {
    id:     'merchants_ledger',
    name:   "MERCHANT'S LEDGER",
    desc:   '+1 Gold at the start of every turn.',
    hook:   'start_of_turn',
    effect: { type: 'gain_gold', amount: 1 },
  },

  {
    id:     'healers_kit',
    name:   "HEALER'S KIT",
    desc:   '+1 Morale at the end of every turn.',
    hook:   'on_turn_end',
    effect: { type: 'gain_morale', amount: 1 },
  },

  {
    id:     'tacticians_compass',
    name:   "TACTICIAN'S COMPASS",
    desc:   'Draw 1 extra card at the start of every fight.',
    hook:   'start_of_fight',
    effect: { type: 'draw', amount: 1 },
  },

  {
    id:     'war_drum',
    name:   'WAR DRUM',
    desc:   'At the start of every turn, deal 2 damage to the Big Bad.',
    hook:   'start_of_turn',
    effect: { type: 'damage', amount: 2, target: 'big_bad' },
  },

  {
    id:     'philosophers_stone',
    name:   "PHILOSOPHER'S STONE",
    desc:   '+2 Gold at the start of every fight.',
    hook:   'start_of_fight',
    effect: { type: 'gain_gold', amount: 2 },
  },

  {
    id:     'bulwark_charm',
    name:   'BULWARK CHARM',
    desc:   '+3 City Defence at the start of every fight.',
    hook:   'start_of_fight',
    effect: { type: 'gain_shield', amount: 3 },
  },

  {
    id:     'sigil_of_pierce',
    name:   'SIGIL OF PIERCE',
    desc:   'On every recruit, deal 1 damage to the Big Bad (ignores shield).',
    hook:   'on_recruit',
    effect: { type: 'damage', amount: 1, target: 'big_bad', pierce: true },
  },

  {
    id:     'crown_of_thorns',
    name:   'CROWN OF THORNS',
    desc:   'At the end of every turn, deal 1 piercing damage to the Big Bad.',
    hook:   'on_turn_end',
    effect: { type: 'damage', amount: 1, target: 'big_bad', pierce: true },
  },

  {
    id:     'rune_of_renewal',
    name:   'RUNE OF RENEWAL',
    desc:   '+2 Morale at the start of every fight.',
    hook:   'start_of_fight',
    effect: { type: 'gain_morale', amount: 2 },
  },

  {
    id:     'spellbook',
    name:   'SPELLBOOK',
    desc:   'Draw 1 extra card at the start of every turn.',
    hook:   'start_of_turn',
    effect: { type: 'draw', amount: 1 },
  },

  {
    id:     'gilded_vault',
    name:   'GILDED VAULT',
    desc:   'On every recruit, gain 1 Gold.',
    hook:   'on_recruit',
    effect: { type: 'gain_gold', amount: 1 },
  },

];

Registry.register_treasures(treasures);
