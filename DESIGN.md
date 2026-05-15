# City Heroes — Design Document

A living document for game design. Code constraints live in `CLAUDE.md`; how-to-play lives in `HOW_TO_PLAY.md`. This file is for the *why* of design, the analysis of the current game, and the staged plan to make it better.

---

## 1. Current state — what works, what doesn't

### The hook

City Heroes is a 3-fight roguelike deck-builder where heroes line up in slots and resolve automatically. The visible board, the spatial adjacency between heroes, and the manipulation of the resolution order (haste/slow/stop) are the most distinctive things in the game. Everything else is a fairly standard Star Realms / Slay-the-Spire shape.

### Strengths to preserve

- **Spatial board + resolution order.** Heroes resolve left-to-right, monsters right-to-left. This means the *position* a card lands in matters — `field_bonus.adjacent_role_match` and `stun.opposite` are the only cards that lean into it today, but the geometry is real and visible.
- **Manipulable timeline.** `haste`, `slow`, `stop`, and the "inject late" mechanic for cards that activate mid-resolution are unusually rich. Players can bend the turn instead of merely playing into it.
- **Per-fight market reset with persistent promotions.** This is a clean roguelike loop: market resets each fight (so the meta is per-fight), but promoted heroes carry forward (so the run has a deck-building arc).
- **Auto-battler feel without being passive.** Hand placement gives the player one decision per turn that actually matters: which slot does each card go in. That's the same loop as Hearthstone Battlegrounds tavern → board.
- **Tight, readable card text.** Most cards are one or two clauses. This is a Star Realms strength and the current game has it.

### Weaknesses to address

These are the design weaknesses, not the code ones:

1. **Run length is too short for a deckbuilder.** Three fights gives ~8–15 turns of recruiting total. A player who picks the wrong starter strategy never gets to course-correct. Compare: Slay the Spire ~17 fights, Monster Train ~8 fights with multiple battles each, Star Realms 30+ turns.
2. **No archetypes.** Roles (`physical`/`magical`/`tactical`) exist but barely interact. There's one `field_bonus.adjacent_role_match` card. Compare: MTG colors, Star Realms factions (each has distinct synergies), HSBG tribes (each tribe has dedicated payoffs).
3. **No keywords.** Every effect is a custom JSON entry. There's no shared vocabulary the player can learn (taunt, deathrattle, scry, prowess, etc.). This makes new cards expensive to add and reduces card-to-card synergy potential.
4. **Monsters are stat blocks, not threats.** Only 4 monster card definitions across all tiers, and tier-3 has just two. Monster decks feel identical because they're sampled with replacement from a pool of 2.
5. **Big Bads barely differentiate.** Each one is `(hp, atk, monsters_per_turn, monster_pool)`. There are no boss mechanics, no phase changes, no telegraphed "next turn this happens" pressure.
6. **Cities are pre-fight stat tweaks.** Each city is just a number (more morale, more market slots, etc.). They don't change *how* you play.
7. **Promoted heroes are stat blocks.** They're slightly bigger market cards. They don't define a build.
8. **No risk/reward at the recruit step.** Buying is always strictly correct if you can afford it. There's no "this card hurts to play, but it's powerful," no event choices, no shop variety.
9. **No deck thinning beyond `scrap`.** Once your deck is ~14 cards, you draw 5, so any one card is seen ~36% of the time. Players need stronger ways to thin to make Promoted heroes pop.
10. **No build-around economy.** Star Realms has Trade Federation pure-economy curves; HSBG has greed-tier turns. Here, gold is purely transactional — there's no "I'm playing the gold deck" identity.
11. **The auto-resolution feels passive on hard turns.** The resolution sequence is computed and locked in at end-of-Heroes. Players can't react to what just happened. Some games (Battlegrounds) lean into this; here, given haste/slow exist, there's room for *interrupt*-style cards.
12. **No "treasure" or out-of-deck reward.** Every reward goes into the deck, which dilutes it. A relic / city-buff slot would let rewards compound.
13. **Endgame is thin.** Tier-3 has one Big Bad. After the first run, every fight 3 is the Lich Sovereign.
14. **No meta progression.** Optional, but most roguelike deckbuilders unlock cards/heroes over time so cold starts don't feel sparse.

### What should NOT change

- The 3-act structure. Three escalating bosses is a clean run shape — keep it. *Length per act* should grow.
- Auto-resolution. Don't add real-time inputs during resolution. The pause-and-watch is part of the satisfaction.
- Pure vanilla JS, no build step. (Code constraint, but it shapes design — no fancy animations or third-party effect libraries.)
- The Bazaar between turns. Recruiting at the same cadence as combat is a great rhythm; don't move it to a separate screen.

---

## 2. First-pass design pitches

These are direct lifts from the inspiration games, adapted to City Heroes' shape.

### A. Keywords as the shared vocabulary
**From:** MTG, Hearthstone

Replace one-off `effects` JSON with a small set of keyword effects that recur across many cards:

- **Vigilant** — does not exhaust after resolving. Resolves again next turn if it survives. (MTG "Vigilance" / HS "no end-of-turn discard")
- **Charge** — when recruited, immediately enters the field this turn instead of going to discard. (MTG/HS Charge)
- **Taunt** — monsters opposite this slot must hit Taunt heroes before reaching the city. (HS Taunt)
- **Lifesteal** — ATK damage dealt also restores that much Morale. (HS Lifesteal)
- **Pierce** — ignores monster shield. (universal)
- **Overload N** — when this resolves, your next draw is reduced by N. (HS Overload, balances powerful turns)
- **Echo** — when this resolves, returns to hand instead of discard. (MTG Echo / HS Echo)
- **Deathrattle: X** — when this card is killed (by a `kill` monster effect), trigger X. (HS Deathrattle)
- **Battlecry: X** — when this card is placed (not resolved), trigger X. (HS Battlecry)
- **Spell** — non-creature card. Has effects but no body, doesn't take a slot at resolution time. (Star Realms / MTG instants)

These give players a vocabulary. Every keyword is a hook for new cards.

### B. Factions / colour-pie
**From:** MTG, Star Realms

Promote `role` to a real faction system. Each faction has a clear identity:

- **Physical (Red)** — raw damage, charge, berserker buffs. Weak to magical shields. Synergy: "+ATK if adjacent to Physical."
- **Magical (Purple)** — disruption, stuns, kill effects, summon. Synergy: "draw on Magical resolve."
- **Tactical (Gold)** — gold, draw, cost reduction, scry. Synergy: "free recruit if you played 2+ Tactical this turn."
- **NEW: Divine (White)** — morale, healing, protection, taunt. Synergy: "Lifesteal when adjacent to Divine."
- **NEW: Shadow (Black)** — sacrifice, scrap, deathrattle, recursion. Synergy: "+effect when a card dies."

Multi-faction cards (gold/purple "Spellblade") fill the synergy gap. Each Big Bad is *strong* against one faction and *weak* to another.

### C. Star Realms-style "ally" triggers
**From:** Star Realms

Add an `ally_bonus` clause to a card: it gets a bonus *when another card of the same faction is on the field this turn*. Star Realms' core mechanic. Encourages building decks that lean into one or two factions and rewards drawing them together.

```js
// e.g. on a Physical card
ally_bonus: { faction: 'physical', atk: 2 }
// "This card has +2 ATK when another Physical hero is on the field."
```

### D. Tribes for monsters
**From:** Hearthstone Battlegrounds

Give monsters tribes (`undead`, `beast`, `construct`, `cultist`, `demon`). Big Bads have a tribe affinity, and certain hero cards become anti-tribe specialists ("Banish Undead: deal 4 extra damage to Undead monsters").

This solves the "monsters all feel the same" problem and makes pre-fight reveal more strategic.

### E. Treasures (out-of-deck buffs)
**From:** Slay the Spire relics, Monster Train artifacts

A persistent slot for non-card rewards earned by clearing fights. Examples:

- **Banner of Stonehaven** — +1 Defence at start of each turn.
- **Merchant's Ledger** — first recruit each fight costs 1 less Gold.
- **Tactician's Compass** — your leftmost hero each turn gets +1 ATK.
- **Phylactery Shard** — when a hero would die to a monster `kill` effect, scrap a starter instead.

Treasures don't dilute the deck. Pick one per fight, alternate path to "promoted hero."

### F. Hand-shaping mechanics
**From:** MTG (scry, surveil), Slay the Spire

- **Scry N** — look at the top N cards of your deck, return them in any order or discard one.
- **Tutor** — search your deck for a card of type/role X.
- **Foretell** — set aside a card from hand, play it for reduced cost on a later turn.

These reward planning and reduce the variance complaint.

### G. Meaningful Big Bad mechanics
**From:** Hearthstone bosses, Slay the Spire elites

Each Big Bad gets a "trait" effect that fires on a schedule:

- **Goblin Warchief** — every 3rd turn, summons +2 monsters.
- **Plagued Bear** — at end of each turn, infects a random hero in discard with `corrupted` (deals -1 ATK).
- **Iron Golem** — gains +5 Monster Shield at start of each turn (already kind of does this).
- **Serpent Queen** — at the end of every turn, drains 1 Gold from each unspent Gold pool.
- **Lich Sovereign** — at the start of every 3rd turn, casts "Death Wave" — deals 5 damage to the city ignoring defence.

Telegraph these in the pre-fight screen and on the board ("Death Wave in 2 turns").

### H. Events between fights
**From:** Slay the Spire events, Monster Train

Between fights, before the upgrade choice, offer one event:

- **Mysterious Stranger** — pay 5 Gold to add a random Promoted card OR pay 10 Morale to scrap any card from your deck.
- **The Crossroads** — choose one of three Treasure cards.
- **Mercenary Camp** — recruit a Tier-5 hero from outside the market for 8 Gold.

Events add narrative variety and force interesting choices that aren't "pick best stat block."

### I. Hearthstone Battlegrounds-style tier curve
**From:** HSBG

Today, market level 2 → 5 progression is *one button*. Make it richer:

- Each tier has more powerful but more *specialised* cards. Tier 2 generalist beats tier 5 specialist if you can't combo it.
- Add a "refresh market for 2 gold" button (HSBG reroll). Currently market only refreshes between turns — letting players pay to reroll mid-fight gives them agency.
- Show "next tier preview" — one card from the next market level is visible, locked. Pay to unlock and you also get to recruit it.

### J. Spells (non-permanent cards)
**From:** MTG sorceries, Star Realms scrap-actions

Add `type: 'spell'` cards that:
- Don't go to a hero slot — resolve from hand directly.
- Have one big one-shot effect (Lightning Bolt: 8 damage; Time Warp: take an extra turn).
- Either go to discard normally OR have a "scrap on use" flag to remove them from the deck.

Spells feel different from creatures and let you put burst effects on the table.

---

## 3. Second-pass design pitches — refined

This section iterates on the first pass. Some pitches get folded together, others get sharpened, and a few new ones surface that depend on the first pass landing first.

### Refined: keywords drive a layered effect system

Don't just add keywords — *redesign* the effect system around two layers:

- **Triggers** — when an effect fires. `on_play`, `on_resolve`, `on_death`, `on_turn_end`, `on_card_played`, `on_recruit`, `passive`. (MTG abilities, HSBG triggers.)
- **Effects** — what happens. `damage`, `gain_gold`, `summon`, `draw`, `transform`, `destroy`, etc.

A card describes itself as a list of `(trigger, effect)` pairs:

```js
abilities: [
  { trigger: 'on_resolve',   effect: { type: 'damage', amount: 5, target: 'big_bad' } },
  { trigger: 'on_death',     effect: { type: 'damage', amount: 2, target: 'random_monster' } },
]
```

This is the same shape MTG and HS land on after years of iteration. It cleanly supports keywords (a keyword *expands* to one or more `(trigger, effect)` pairs at validation time) and lets one card carry multiple behaviours without each effect type needing a custom JSON shape.

The current game already does most of the second half — it just lacks the trigger axis. Adding it is the single biggest unlock for design space.

### Refined: factions with overlap, not silos

Don't use 5 strict factions — that's too many for a small card pool. Use the existing 3 (Physical/Magical/Tactical) but allow **dual-role** cards. Card schema becomes:

```js
roles: ['physical', 'tactical']  // was: role: 'physical'
```

A "Knight Errant" is `['physical', 'divine']`-equivalent in flavour but mechanically `['physical', 'tactical']` (because it gives gold *and* hits hard). This is the MTG colour-pair approach and it triples the synergy possibilities without tripling the card pool. Promoted heroes are *the* place dual-role cards live — they're the rare, powerful "guild" cards.

### Refined: ally triggers as a passive every faction card has

Every market hero gets a small `ally_bonus` clause as standard. Cards with `gold > 0` get `ally_bonus: { faction: 'tactical', gold: 1 }`. Cards with `atk > 0` get `ally_bonus: { faction: 'physical', atk: 1 }`. This makes faction-stacking *always* correct in subtle ways even if the player isn't building around it, and creates "wow" moments when the bonus is large.

### Refined: monster decks as designed sequences, not random pools

Today's monster pool sampling is uniform random with replacement. Replace it with **monster waves**: each Big Bad has 3–4 hand-curated wave compositions (e.g., "Wave 1: 2x Gnoll Raider; Wave 2: 1x Cave Bat + 1x Iron Sentinel; Wave 3 (turn 5+): Death Wraith + 2x Cave Bat"). The Big Bad cycles through waves on a fixed schedule.

This makes fights *learnable*. The first time you fight Plagued Bear you don't know it summons two Cave Bats on turn 4. The second time, you plan for it. This is the Slay the Spire boss-pattern model and it's the difference between a fight that feels random and a fight that feels designed.

### Refined: Big Bad telegraph UI

Add a **"Big Bad Intent" panel** to the fight screen. Each turn it shows what the Big Bad will do *next* turn (HS-style intent / Slay-the-Spire monster intents):

- ⚔ "Attack: 5"
- ☠ "Summon Death Wraith"
- ⚡ "Death Wave in 2 turns"

Players love being told "this is coming." It transforms boss fights from reactive to puzzle-like. This is the single highest-impact UX change and depends on (refined) monster waves to drive the predicted text.

### Refined: Treasures with synergy, not stat lines

Treasures should *enable* strategies that aren't otherwise possible, not just add static numbers. Better treasure ideas:

- **Spellbook** — every 3rd hero card you recruit costs 0 gold.
- **War Drum** — your leftmost and rightmost heroes both get +2 ATK. (Encourages thin field.)
- **Seer's Eye** — at the start of each turn, you may discard one card from your hand to draw two.
- **Iron Standard** — the first time a hero would die each fight, scrap a starter instead.
- **Phoenix Egg** — when this fight ends in victory, recover all scrapped cards. (One-shot per fight, valuable for high-scrap strategies.)

Each treasure pushes a build direction. Treasures replace "promoted hero" on alternating fights — fight 1 promoted, fight 2 treasure, fight 3 promoted. Three fights = one of each.

### Refined: spells as a cheap, self-clearing recruit option

Spells need a sharp identity vs heroes. The clean rule is:

- Spells go to hand, not field. They resolve immediately when played and self-discard.
- They cost 1 gold less than a comparable hero (no body to defend with).
- All spells have `consume: true` — first use only. This automatically thins the deck, which makes them strictly attractive even when they're slightly weak.

Spell examples:
- **Bolt** (1 gold, consume) — Deal 4 magical damage.
- **Rally** (2 gold, consume) — All heroes on the field gain +2 ATK this turn.
- **Recall** (3 gold, consume) — Return a hero from your discard to your hand.

Three slots in the market should be reserved for spell rotation so they stay visible.

### Refined: events are moral choices, not stat tradeoffs

Events should ask the player to *commit* to something — ideology, not just numbers:

- **The Wounded Knight** — A wounded soldier begs for sanctuary.
  - **Take him in.** Add a Veteran (Tier 3 promoted) to your discard. -3 max Morale this fight.
  - **Send him on.** Gain 5 Gold.
- **The Heretic's Scroll** — A forbidden tome lies in the rubble.
  - **Read it.** Add a powerful spell (Soulfire, free) to your hand. Permanently corrupt a random hero in your deck.
  - **Burn it.** Restore 5 Morale.

Events that ask "do you want a relic now or a relic later" are boring. Events that ask "what kind of run is this" are not.

### Refined: deck-thinning is a verb the player owns

The current game has `scrap` as a one-off card effect. Promote it to a player verb:

- **The Forge** — visible during recruit phase. Cost: 6 Gold to scrap one card from your discard or deck. Cost goes up by 2 each use this fight.
- **Bazaar pity timer** — every 3rd recruit, your next recruit also scraps a random starter from your deck. (Star Realms scrap-on-trade.)

Without active thinning, Promoted heroes feel weak because you don't see them often. With aggressive thinning, the late-run deck of 5 promoted + 3 scouts + 2 starters is brutal in the best way. Power fantasy unlocked.

### Refined: 5 fights, not 3 — but the 3-act shape stays

Increase `FIGHTS_PER_RUN` to 5: two tier-1 elites, two tier-2 elites, one tier-3 boss. The Big Bad pacing stays "easy → hard," but two extra fights gives the player two extra deckbuilding turns and twice the Treasure/Promoted variety. Compare:

- 3 fights × 1 reward = 3 deck additions over a run (current)
- 5 fights × 1 reward = 5 deck additions over a run (proposed)

The current Big Bad pool already supports this for tier 1/2 (2 each); add 2 more tier-3 Big Bads and the rotation feels fresh on every run.

### Refined: a "next fight preview" before every recruit phase

After each fight, show the *next* Big Bad's identity, intent summary, and weak/strong factions. The player then recruits with knowledge of what's coming. This:
- Makes deckbuilding directional ("I need anti-shield against the Iron Golem").
- Rewards building a flexible toolkit, not just a stat curve.
- Makes the upgrade choice meaningful: "I'd take Warlord normally, but next fight is Lich and Warlord can't kill its summons."

### Refined: city as a passive engine, not a stat bonus

Cities should each *do* something every turn:

- **Stonehaven** — the first hero placed each turn gains +1 ATK.
- **Ironhold** — at the start of each turn, gain 2 Defence per occupied hero slot.
- **Duskwater** — at the start of each fight, draw 2 extra cards.
- **Ashenveil** — first recruit each fight costs 0 Gold; max Morale -10.
- **Gilded Reach** — at the end of each turn, convert 1 unspent Gold into 1 Morale (cap 5).

Cities go from "pre-game stat sheet" to "active mechanic the player builds around." This is the same upgrade Slay the Spire characters got from "different starting deck" to "different mechanics" (Defect's orbs, Watcher's stances).

### Refined: a "Curse" mechanic for risky rewards

When the player takes high-power rewards (early Tier-5 unlocks, certain events), they earn a **Curse** card that shuffles into the deck. Curses are dead draws (do nothing on resolve, take a hand slot). They're the cost of greed.

This lets us put truly bonkers rewards into the game without wrecking balance — "gain a Pyromancer for free, but add 2 Curses to your deck" is a compelling choice in a way that "gain 5 gold" is not.

### Refined: post-run unlocks

Light meta progression to give cold starts texture:

- 1st run completion — unlock Tier-5 Big Bad #2 (Voidweaver).
- 5 wins — unlock a 4th faction (Divine).
- 10 wins — unlock a Daily Run mode with a fixed seed.

Don't gate *fundamental* fun behind unlocks — the first run should be complete. But unlock new variety to chase across runs. Skip if the project doesn't want save state.

---

## 4. Implementation plan

Ordered by impact-to-effort ratio. Each phase is independently shippable. Earlier phases should land before later ones because later ones depend on the new abstractions.

### Phase 0 — Foundations (no player-visible change)

Refactor the effect system to support triggers without changing card behaviour yet. This is pure plumbing.

**Files touched:** `02_sys_effects.js`, `02_sys_engine.js`, `04_boot_main.js` (validator).

1. Add a `trigger` field to all existing card effects (default `on_resolve` for hero, `on_resolve` for monster).
2. Refactor `apply_hero_effect` / `apply_monster_effect` into `dispatch_effect(state, trigger, source_card, slot)` that walks the card's effects list and only fires those matching the current trigger.
3. Add hook points in the engine:
   - `on_recruit` — fires in `on_market_card_click`.
   - `on_play` — fires when a card is placed in a hero slot.
   - `on_resolve` — current `apply_*_effect` site.
   - `on_death` — new, fires in `kill` monster effect.
   - `on_turn_end` — fires in `finish_resolution`.
4. Update validator to accept `trigger` field on all effect types.

**Win condition:** All existing cards work identically. New design space is open.

### Phase 1 — Big Bad Intent panel (high-UX, low-engineering)

The single change with the biggest perceived-quality jump.

**Files touched:** `index.html`, `03_ui_renderer.js`, `02_sys_engine.js`, `01_data_enemies.js`.

1. Add `intents` array to each Big Bad def: a list of "this turn the Big Bad will do X" predictions.
2. Engine pre-computes next-turn intent at end of resolve phase.
3. Renderer adds a panel above the monster row: "Next turn: ⚔ 5 + summon Death Wraith".
4. Existing Big Bads get hand-authored intent strings for now (can be simple).

**Win condition:** Player always knows what's coming next turn. Boss fights feel like puzzles.

### Phase 2 — Keyword vocabulary

Pick the 5 highest-leverage keywords and ship them all together with cards that use them.

Recommended starter set:
- **Pierce** — ATK ignores monster shield.
- **Lifesteal** — ATK damage heals city for that amount.
- **Taunt** — opposite monsters must hit Taunt heroes before reaching the city.
- **Charge** — when recruited, place into hero field this turn.
- **Echo** — returns to hand after resolving instead of discard.

**Files touched:** `02_sys_effects.js` (apply each at the right hook), `01_data_cards_market.js` (add 6–8 new cards using these keywords; retag existing cards where appropriate), `03_ui_renderer.js` (keyword icons on cards), `04_boot_main.js` (validator), `CLAUDE.md` (document).

**Win condition:** A player can read a card and recognise the same keyword on another. The vocabulary is established.

### Phase 3 — Faction synergies

Activate the existing `role` field as a real strategic axis.

1. Add `ally_bonus` to most market cards.
2. Add 3–4 new market cards that explicitly reward mono-faction or 2-faction decks (e.g., "Spellblade — +1 ATK per Magical hero on field").
3. Update the prefight UI to show "this Big Bad is weak to: Physical / strong against: Magical."
4. Make Big Bads have `weak_against` and `strong_against` fields (multipliers on damage taken/dealt).

**Files touched:** `02_sys_engine.js` (resolve_hero_card applies bonuses), `01_data_cards_market.js`, `01_data_enemies.js`, `03_ui_renderer.js`, `04_boot_main.js`.

**Win condition:** Players make different recruiting choices based on who they're fighting.

### Phase 4 — Monster waves & expanded monster pool

Replace random sampling with curated waves; add monster variety.

1. Each Big Bad gets a `waves` array — each wave is a list of monster ids drawn at scheduled turns.
2. Engine reads from the wave queue instead of `pick_random` from the pool.
3. Add 8–10 new monster card definitions (mix of physical / magical / "boss-only" cards like *Plague Carrier*).
4. Add monster `tribe` tags (`undead`, `beast`, `construct`, `cultist`).

**Files touched:** `02_sys_engine.js` (monster summoning logic), `01_data_cards_monster.js` (new cards), `01_data_enemies.js` (wave definitions), `04_boot_main.js`.

**Win condition:** Each Big Bad fights distinctly. Monsters have names a player remembers.

### Phase 5 — Treasures (out-of-deck rewards)

Add the alternate reward path.

1. New file `01_data_treasures.js` with 12–15 treasure definitions.
2. New `state.run.treasures` array (persists across fights).
3. New screen `screen-treasure` (or reuse `screen-upgrade` pattern with a tab).
4. Treasure effects integrated via the new trigger system from Phase 0.
5. Reward sequence for fights 1–5 alternates promoted / treasure / promoted / treasure / promoted (or player picks which type each time).

**Files touched:** new data file, new HTML screen, `03_ui_renderer.js`, `02_sys_engine.js`, `02_sys_effects.js`, `04_boot_main.js`.

**Win condition:** Players can build a non-deck reward stack. Run identity diversifies.

### Phase 6 — Spells

Add spell-type cards.

1. New card type `spell`. They live in the deck/hand but never go to the field.
2. Spells resolve immediately when clicked from hand, then go to discard (or scrap if `consume: true`).
3. Add 6–8 spell defs to the market pool.
4. Renderer treats spells visually distinctly.

**Files touched:** `02_sys_engine.js` (`on_hand_card_click` branches on type), `01_data_cards_market.js`, new `01_data_cards_spells.js`, `04_boot_main.js`.

**Win condition:** The market has card-type variety. Burst turns are possible.

### Phase 7 — Active deck thinning (the Forge)

Player-driven scrap during recruit phase.

1. Add a "Forge" UI element next to the market upgrade slot during recruit phase.
2. Cost ramps per use within a fight.
3. Removes the chosen card permanently from the run pool.
4. Optional: scry-style "view your deck" modal so players choose what to scrap.

**Files touched:** `02_sys_engine.js`, `03_ui_renderer.js`, `index.html`, `03_ui_styles.css`.

**Win condition:** Players can sculpt their deck. Promoted heroes feel impactful.

### Phase 8 — 5-fight runs + fight preview

Extend run length and surface upcoming Big Bads.

1. Bump `FIGHTS_PER_RUN` to 5 with a `[1, 1, 2, 2, 3]` tier sequence.
2. Add 2–3 new Big Bad defs (one tier-2, two tier-3) to keep variety.
3. After each fight, prefight screen also shows a small "later this run" panel previewing the next Big Bad's name + intent summary.

**Files touched:** `00_core_constants.js`, `02_sys_engine.js`, `01_data_enemies.js`, `03_ui_renderer.js`.

**Win condition:** Run length feels like a deckbuilder. Players plan two fights ahead.

### Phase 9 — Active cities

Move city effects from "stat tweak" to "every-turn passive."

1. Add a `city_passives` config to each city def.
2. Engine triggers city passives at appropriate hooks (start_of_turn, end_of_turn, on_recruit).
3. Existing city stat-bonuses retained but augmented.

**Files touched:** `01_data_levels.js`, `02_sys_engine.js`, `03_ui_renderer.js`.

**Win condition:** City selection materially changes how a fight plays.

### Phase 10 — Events & curses

Between-fight events with moral choices, plus the Curse system as a knob for high-risk rewards.

1. New file `01_data_events.js` with 8–12 events.
2. New screen `screen-event` shown between fights with 30% probability (or always on fights 2 and 4).
3. New card type `curse` — dead draw, takes hand slot, exists to be a cost.
4. Update `apply_upgrade` flow to optionally insert events.

**Files touched:** new data, new HTML screen, `03_ui_renderer.js`, `02_sys_engine.js`.

**Win condition:** Runs have narrative texture. Risk/reward decisions exist outside the recruit phase.

### Phase 11 — Polish, balance, second-pass keywords

After 0–10 land, do a balance pass on stats/costs and add second-tier keywords:
- **Overload N** — your next draw count is reduced by N. Lets us cost-down powerful cards.
- **Battlecry** / **Deathrattle** — once the trigger system is mature, retag existing cards.
- **Vigilant** — does not exhaust on resolve.

This phase is open-ended. Use it for whatever needs fixing once everything else is live.

---

## 5. Out of scope (for now)

Listed so we remember we considered them:

- Multiplayer / async PvP — not on the roadmap, would require server.
- Animations beyond CSS transitions — vanilla JS constraint.
- Mobile-specific UI — desktop-first.
- Save/resume mid-run — every run is a single sitting.
- Difficulty modes — let baseline get balanced first.
- Cosmetics / card frames / custom themes — flavour layer can come last.
- Localisation — single-language for now.
