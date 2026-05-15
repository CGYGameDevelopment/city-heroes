// constants.js
// Shared numeric and configuration constants for City Heroes.
// No imports. Safe to import from any module.

export const HAND_SIZE              = 5;
export const MARKET_SIZE_DEFAULT    = 3;
export const FIELD_SIZE_MAX         = 6;
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

/**
 * Number of fights in a single run. Phase 8 — bumped from 3 to 5 so the
 * deckbuilder has room to breathe. Pair with FIGHT_TIER_SEQUENCE which
 * controls which tier of Big Bad each fight pulls from.
 */
export const FIGHTS_PER_RUN         = 5;

/**
 * Maps fight_number (1-indexed) → big-bad/monster tier. Length must be
 * >= FIGHTS_PER_RUN. The pacing is two warmup fights, two mid fights, then
 * the climactic tier-3 fight.
 */
export const FIGHT_TIER_SEQUENCE    = Object.freeze([1, 1, 2, 2, 3]);
export const DRAW_PHASE_DELAY_MS    = 500;
export const RESOLVE_STEP_DELAY_MS  = 700;
export const FIGHT_END_DELAY_MS     = 1200;
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

/**
 * Phase 7 — Forge: lets the player scrap a starter from their deck during
 * the recruit phase. Cost = base + uses * step. Resets per fight.
 */
export const FORGE_BASE_COST = 4;
export const FORGE_STEP_COST = 2;
