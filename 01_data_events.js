
var events = [

  {
    id:    'wounded_knight',
    title: 'THE WOUNDED KNIGHT',
    desc:  'A bleeding soldier crawls into the courtyard. He swears fealty if you take him in — but his presence will cost you sleep.',
    choices: [
      {
        label:    'Take him in',
        desc:     'Add a Veteran to your deck. -3 max Morale next fight.',
        outcomes: [
          { type: 'add_card_to_deck', card_id: 'veteran' },
          { type: 'max_morale',       amount: -3 },
        ],
      },
      {
        label:    'Send him on',
        desc:     'Gain 5 Gold for the next fight.',
        outcomes: [
          { type: 'gold', amount: 5 },
        ],
      },
    ],
  },

  {
    id:    'heretics_scroll',
    title: "THE HERETIC'S SCROLL",
    desc:  'A blackened scroll lies in the rubble. Its sigils crawl when looked at directly.',
    choices: [
      {
        label:    'Read it',
        desc:     'Add the spell BANISH to your deck. Add 1 random Curse.',
        outcomes: [
          { type: 'add_card_to_deck', card_id: 'banish' },
          { type: 'add_curse',        count: 1 },
        ],
      },
      {
        label:    'Burn it',
        desc:     'Restore 5 max Morale for the rest of the run.',
        outcomes: [
          { type: 'max_morale', amount: 5 },
        ],
      },
    ],
  },

  {
    id:    'mysterious_stranger',
    title: 'THE MYSTERIOUS STRANGER',
    desc:  'A hooded figure offers you a trade. The price is steep, the goods finer than any market\'s.',
    choices: [
      {
        label:    'Buy a relic (cost: 1 Curse)',
        desc:     'Add a random Treasure. Add 1 Curse to your deck.',
        outcomes: [
          { type: 'add_treasure',     treasure_id: 'random' },
          { type: 'add_curse',        count: 1 },
        ],
      },
      {
        label:    'Refuse the trade',
        desc:     'Scrap a random Starter from your deck.',
        outcomes: [
          { type: 'scrap_random', target: 'starter' },
        ],
      },
    ],
  },

  {
    id:    'crossroads',
    title: 'THE CROSSROADS',
    desc:  'A merchant\'s caravan, abandoned. Wares scattered. Take what you need.',
    choices: [
      {
        label:    'Steel and silver',
        desc:     'Add a SOLDIER to your deck.',
        outcomes: [
          { type: 'add_card_to_deck', card_id: 'soldier' },
        ],
      },
      {
        label:    'Books and tinctures',
        desc:     'Add an APPRENTICE to your deck.',
        outcomes: [
          { type: 'add_card_to_deck', card_id: 'apprentice' },
        ],
      },
    ],
  },

];

Registry.register_events(events);
