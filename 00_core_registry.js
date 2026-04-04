// registry.js
// Global data registry for City Heroes.
// Populated by classic data files (cards_*.js, big_bads.js, cities.js) via
// Registry.register_*() before the ES module entry point runs.
//
// Must load before any data file. No other dependencies.

const Registry = {
  cards_starter:        [],
  cards_market:         [],
  cards_upgrades:       [],
  cards_monster_tier_1: [],
  cards_monster_tier_2: [],
  cards_monster_tier_3: [],
  big_bads_tier_1:      [],
  big_bads_tier_2:      [],
  big_bads_tier_3:      [],
  cities:               [],

  /** Register starter card definitions. */
  register_cards_starter(arr)        { this.cards_starter.push(...arr); },
  /** Register hero / market card definitions. */
  register_cards_market(arr)         { this.cards_market.push(...arr); },
  /** Register promoted (upgrade) card definitions. */
  register_cards_upgrades(arr)       { this.cards_upgrades.push(...arr); },
  /** Register monster card definitions for a specific tier (1–3). */
  register_cards_monster(tier, arr)  { this[`cards_monster_tier_${tier}`].push(...arr); },
  /** Register big bad definitions for a specific tier (1–3). */
  register_big_bads(tier, arr)       { this[`big_bads_tier_${tier}`].push(...arr); },
  /** Register city definitions. */
  register_cities(arr)               { this.cities.push(...arr); },

  /**
   * Called once by 04_boot_main.js after all data files have loaded.
   * Freezes every pool so no classic script can accidentally mutate them after validation.
   * register_*() calls after lock() will throw because push() is not allowed on a frozen array.
   */
  lock() {
    const pools = [
      'cards_starter', 'cards_market', 'cards_upgrades',
      'cards_monster_tier_1', 'cards_monster_tier_2', 'cards_monster_tier_3',
      'big_bads_tier_1', 'big_bads_tier_2', 'big_bads_tier_3',
      'cities',
    ];
    for (const key of pools) Object.freeze(this[key]);
    Object.freeze(this);
  },
};
