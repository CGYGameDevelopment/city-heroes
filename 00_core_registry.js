
const Registry = {
  cards_starter:        [],
  cards_market:         [],
  cards_upgrades:       [],
  cards_curses:         [],
  cards_monster_tier_1: [],
  cards_monster_tier_2: [],
  cards_monster_tier_3: [],
  big_bads_tier_1:      [],
  big_bads_tier_2:      [],
  big_bads_tier_3:      [],
  cities:               [],
  treasures:            [],
  events:               [],

  register_cards_starter(starter_cards)        { this.cards_starter.push(...starter_cards); },

  register_cards_market(market_cards)          { this.cards_market.push(...market_cards); },

  register_cards_upgrades(upgrade_cards)       { this.cards_upgrades.push(...upgrade_cards); },

  register_cards_curses(curse_cards)           { this.cards_curses.push(...curse_cards); },

  register_cards_monster(tier, monster_cards)  { this[`cards_monster_tier_${tier}`].push(...monster_cards); },

  register_big_bads(tier, big_bad_definitions) { this[`big_bads_tier_${tier}`].push(...big_bad_definitions); },

  register_cities(city_definitions)            { this.cities.push(...city_definitions); },

  register_treasures(treasure_definitions)     { this.treasures.push(...treasure_definitions); },

  register_events(event_definitions)           { this.events.push(...event_definitions); },

  lock() {
    const pool_names = [
      'cards_starter', 'cards_market', 'cards_upgrades', 'cards_curses',
      'cards_monster_tier_1', 'cards_monster_tier_2', 'cards_monster_tier_3',
      'big_bads_tier_1', 'big_bads_tier_2', 'big_bads_tier_3',
      'cities', 'treasures', 'events',
    ];
    for (const pool_name of pool_names) Object.freeze(this[pool_name]);
    Object.freeze(this);
  },
};
