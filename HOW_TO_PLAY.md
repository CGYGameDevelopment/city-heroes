# City Heroes — How to Play

## Setup

City Heroes runs entirely in the browser with no installs or build steps required.

1. Download or clone the repository so all files are in the same folder.
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).
3. That's it — the game loads instantly.

> No Node.js, no npm, no internet connection required. All files are self-contained.

---

## Overview

City Heroes is a roguelike deck-builder. You command a band of heroes across **three escalating battles** to defend your city from a series of Big Bads. Each run is randomised — a different city and different bosses every time.

**Win condition:** Survive all three fights.
**Lose condition:** Your city's Morale reaches zero.

---

## Starting a Run

When you launch the game you will be shown a city and your first Big Bad opponent. Your starting deck contains:

- **Peddlers** — generate gold
- **Militia** — deal damage and provide defence

You cannot change these before the first fight.

---

## Cities

Your city determines your starting bonuses. Five cities are available, selected randomly each run:

| City | Trait |
|---|---|
| Stonehaven | Standard start — balanced stats |
| Ironhold | 50 Morale, +5 Defence at the start of each fight |
| Duskwater | 4 market slots instead of 3 |
| Ashenveil | All heroes cost 1 less gold to recruit |
| Gilded Reach | +2 gold generated per turn |

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

- **Recruit a hero** — pay the card's gold cost to add it permanently to your deck.
- **Unlock a new market slot** — costs 5 / 10 / 15 gold progressively.
- **Upgrade the market tier** — costs 4 / 8 / 12 gold progressively. Higher tiers contain stronger heroes.

---

## Between Fights

After surviving a fight you are offered **three Promoted Hero cards**. Pick one to add to your deck permanently before the next fight begins.

Promoted heroes are significantly stronger than market cards and cost nothing to play. Choose one that complements your current strategy.

---

## Big Bads

There are nine bosses split across three tiers of difficulty. Each run assigns one boss per fight, escalating in tier:

| Tier | Examples | Threat level |
|---|---|---|
| 1 | Goblin Warchief, Plagued Bear | Light pressure, low HP and ATK |
| 2 | Iron Golem, Serpent Queen | Medium difficulty, shields or gold drain |
| 3 | Lich Sovereign | High HP, 5 ATK, spawns 3 monsters per turn |

Each Big Bad has a unique monster pool it draws from. Some monsters deal damage, others drain your gold or disrupt your field.

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
