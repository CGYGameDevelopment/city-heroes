# City Heroes — How to Play

## Setup

City Heroes runs entirely in the browser with no installs or build steps required, but it does need a local HTTP server because it uses ES modules.

1. Download or clone the repository so all files are in the same folder.
2. In a terminal in that folder, run `python -m http.server 8000`.
3. Open `http://localhost:8000` in any modern browser.

> No Node.js, no npm, no internet connection required. All files are self-contained. See `HOW_TO_RUN_LOCALLY.md` for alternatives (VS Code Live Server, etc.).

---

## Overview

City Heroes is a roguelike deck-builder. You command a band of heroes across **five escalating battles** to defend your city from a series of Big Bads. Each run is randomised — a different city and different bosses every time.

**Win condition:** Survive all five fights.
**Lose condition:** Your city's Morale reaches zero.

The fights escalate in tier: two Tier-1 warmups, two Tier-2 mid fights, and a Tier-3 climax.

---

## Starting a Run

When you launch the game you will be shown a city and your first Big Bad opponent. Your starting deck contains:

- **Peddlers** — generate gold
- **Militia** — deal damage and provide defence

You cannot change these before the first fight.

---

## Cities

Your city determines your starting bonuses AND a passive that triggers every turn or fight. Five cities are available, selected randomly each run:

| City | Static stats | Passive |
|---|---|---|
| Stonehaven | 35 Morale, 3 market slots | +1 Gold at the start of every turn |
| Ironhold | 50 Morale, +5 Defence at fight start | +1 Defence at the start of every turn |
| Duskwater | 30 Morale, 4 market slots | Draw 1 extra card at the start of each fight |
| Ashenveil | 25 Morale, hero cards cost 1 less gold | On every recruit, deal 1 piercing damage to the Big Bad |
| Gilded Reach | 40 Morale, +2 Gold per turn | +1 Morale at the end of every turn |

---

## Resources

| Resource | What it does |
|---|---|
| **Morale** | Your city's health. Reach zero and the run ends. |
| **Gold** | Spent at the Bazaar to recruit heroes and upgrade the market. |
| **Defence** | Absorbs incoming damage before it hits Morale. Resets each turn. |

---

## How a Fight Works

Each fight is a single battle against one Big Bad. The fight plays out in turns automatically.

### Each Turn

1. **Draw** — Five cards are drawn from your deck into your active field.
2. **Resolution** — Heroes and Monsters act simultaneously:
   - Your heroes resolve **left to right**.
   - Enemy monsters resolve **right to left**.
3. **End of turn** — The field is cleared, cards go to the discard pile, and the next turn begins.
4. **Between turns** — Spend gold at the Bazaar to recruit heroes or upgrade the market.

The Big Bad spawns new monsters every turn. The pressure increases as fights progress.

---

## Hero Cards

Heroes are the cards in your deck. Each has some combination of:

- **ATK** — damage dealt to monsters (Physical or Magical)
- **Defence** — shields added to your city
- **Gold** — currency generated this turn
- **Special effects** — draw extra cards, stun enemies, transform weak cards, and more

### Card Tiers

| Tier | Cost | Description |
|---|---|---|
| Starter | 0 | Peddler and Militia. Weak but free. |
| Market | 2–4 gold | The main pool of recruitable heroes. |
| Promoted | 0 | Powerful upgrades earned between fights. |

---

## The Bazaar (Market)

Between turns during a fight, you can spend gold at the Bazaar:

- **Recruit a hero** — pay the card's gold cost to add it to your deck (cards reset between fights; only Promoted heroes and Treasures persist).
- **Unlock a new market slot** — costs 5 / 10 / 15 gold progressively.
- **Upgrade the market tier** — costs 4 / 8 / 12 gold progressively. Higher tiers contain stronger heroes.
- **Use the Forge** — pay gold to permanently scrap a random Starter from your deck. Cost ramps with each use this fight.

## Keywords

Many cards carry small re-usable behaviours. Watch for these chips on the cards:

| Keyword | Effect |
|---|---|
| **Pierce** | ATK damage ignores Monster Shield. |
| **Lifesteal** | ATK damage dealt also restores that much Morale. |
| **Taunt** | Opposite Monster ATK is absorbed by this Hero. The Hero forfeits its action this turn. |
| **Charge** | When recruited, this card goes to the top of your deck — guaranteed in your next draw. |
| **Echo** | After resolving, returns to your hand instead of the discard pile. |

## Spells

Some market cards are **Spells** — they resolve immediately when clicked from your hand and don't take a hero slot. Spells with `Consume` are removed from the run after use, naturally thinning your deck.

## Faction synergies

Heroes have a **role**: Physical, Magical, or Tactical. Many cards have an **ally bonus** that fires when another card of the same role is on the field. Stack matching roles to compound the bonus.

Each Big Bad has a weakness and a resistance. The pre-fight screen tells you which:
- Heroes of the **weak-against** role deal **+50%** damage.
- Heroes of the **strong-against** role deal **−50%** damage.

---

## Between Fights

After surviving a fight you are offered **three rewards**: usually two Promoted Heroes and one Treasure. Pick one to keep for the rest of the run.

- **Promoted Heroes** replace a random Starter in your deck. They cost nothing to play and are significantly stronger than market cards.
- **Treasures** sit outside your deck and trigger at hooks (start of turn, on recruit, end of turn, start of fight). They never dilute your draw.

After fights 2 and 4, an **Event** fires before the reward screen. Each event presents a moral choice with permanent consequences — usually a "power vs purity" trade. Greedy choices may add a **Curse** card (a dead draw) to your deck.

## Big Bad Intent

Above the monster row, the **Big Bad Intent panel** shows exactly what the Big Bad will do next turn — its ATK damage and the names of the monsters it will summon. Use this to plan your recruits.

---

## Big Bads

Bosses are split across three tiers. Each run plays out as **two Tier-1 fights, two Tier-2 fights, then one Tier-3 climax** (sequence: 1, 1, 2, 2, 3).

| Tier | Examples | Threat profile |
|---|---|---|
| 1 | Goblin Warchief, Plagued Bear | Light pressure, low HP. Tribe-themed monster pools (goblinoid / beast). |
| 2 | Iron Golem, Serpent Queen, Wickerman | Medium difficulty. Shields, gold drain, or swarm pressure. |
| 3 | Lich Sovereign, Voidweaver, Crimson Tyrant | High HP, high ATK, deck-killing or burst damage. |

Each Big Bad pulls from a constrained monster pool by **tribe** (goblinoid, beast, construct, undead, serpent, void). Reading the Big Bad's pre-fight description tells you what to expect.

---

## Combat Detail

- **Monster Shield Drain** reduces an enemy's defence before your damage is applied.
- **Stun** disables a monster for the current turn — it cannot act.
- **Transform** upgrades a weak card (usually a Militia or Peddler) into a stronger hero mid-run.
- **Recur** returns a discarded hero back into play.
- Magical and Physical ATK are treated the same way unless a card specifies otherwise.

---

## Tips

- Peddlers are weak in combat but fund your recruits early. Replace them as the market unlocks stronger tiers.
- Defence stacks across multiple cards played in a turn. Prioritise it against fast-attacking Tier 2 and 3 bosses.
- The Lich Sovereign (Tier 3) spawns three monsters per turn. Reach fight three with strong ATK output or a stun strategy.
- Cities like Ashenveil and Gilded Reach let you recruit and upgrade faster — take advantage of the discount early.
- Promoted heroes cost zero gold to play. Even one in a deck of ten cards has a huge impact.
