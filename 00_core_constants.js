// constants.js
// Shared numeric and configuration constants for City Heroes.
// No imports. Safe to import from any module.

export const HAND_SIZE              = 5;
export const MARKET_SIZE_DEFAULT    = 3;
export const FIELD_SIZE_MAX         = 6;
/**
 * Maximum stacks of monster 'enrage' that can apply to a single Big Bad in
 * one fight. Caps a degenerate case where many small enrage cards could
 * permanently push the Big Bad's ATK to game-ending levels with no counterplay.
 * The hero 'inspire' effect clears all current enrage stacks (resets to base).
 */
export const ENRAGE_MAX_STACK       = 4;
/**
 * Number of city options offered to the player at run start.
 * Chosen city persists for the entire run.
 */
export const CITY_CHOICE_COUNT      = 3;
/**
 * Number of recruited (hero-type) cards that survive into the next fight.
 * After each victorious fight, this many hero cards from the player's
 * cumulative recruit history are added to the next fight's deck (in addition
 * to the standard starters + any promoted cards). null means "keep all".
 */
export const RECRUITS_KEPT_PER_FIGHT = null;
/**
 * Length of the market array. Currently equal to FIELD_SIZE_MAX because the
 * market row and hero field share the same width by design — one slot per hero
 * position. Kept as a separate constant so market logic does not silently depend
 * on the hero field width and changes to either stay independent.
 */
export const MARKET_ARRAY_SIZE      = FIELD_SIZE_MAX;
export const MONSTER_SLOTS          = 5;
export const UPGRADE_CHOICE_COUNT   = 3;
export const LOG_MAX_ENTRIES        = 28;
export const FIGHTS_PER_RUN         = 3;
export const DRAW_PHASE_DELAY_MS    = 700;
export const RESOLVE_STEP_DELAY_MS  = 1200;
export const FIGHT_END_DELAY_MS     = 1600;
/** Delay between Big Bad phase completing and Heroes phase becoming active. */
export const BIG_BAD_PHASE_DELAY_MS = DRAW_PHASE_DELAY_MS;
export const MARKET_LEVEL_START     = 2;
export const MARKET_LEVEL_MAX       = 5;

/** Cost to unlock each market tier, keyed by target level. */
export const MARKET_UPGRADE_COSTS = Object.freeze({ 3: 4, 4: 8, 5: 12 });

/**
 * Base cost to unlock an extra market slot.
 * Cost = (slots_already_unlocked + 1) * base.
 */
export const MARKET_SLOT_UNLOCK_BASE = 5;
