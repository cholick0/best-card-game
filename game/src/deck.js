// deck.js — the Ember Pact deck: four original suits, one deck, no copies.
//
// Suits are told apart by colour AND shape, never by text alone:
//   ember — red-orange flame   (beats grove)
//   grove — green leaf         (beats tide)
//   tide  — blue droplet       (beats ember)
//   stone — gold diamond       (beats nothing, loses to nothing: the Ward suit)
// A card's value is its power. A few cards carry a named ability:
//   surge — Ember 8: +2 power, but costs its owner 2 life to play.
//   mend  — Tide 7: heals its owner 4 life when played.
//   bloom — Grove 8: draws one extra card after the round.
//   ward  — every Stone card: if it loses a clash, its owner takes no damage.

export const SUITS = {
  ember: { name: 'Ember', color: '#e2483d', dark: '#8f1d16', glyph: '▲', shape: 'flame', beats: 'grove' },
  grove: { name: 'Grove', color: '#3fae5a', dark: '#1d5c2e', glyph: '❧', shape: 'leaf', beats: 'tide' },
  tide: { name: 'Tide', color: '#3d8fe2', dark: '#174a7d', glyph: '●', shape: 'drop', beats: 'ember' },
  stone: { name: 'Stone', color: '#d9a441', dark: '#7a5514', glyph: '◆', shape: 'gem', beats: null },
};

export const SUIT_ORDER = ['ember', 'grove', 'tide', 'stone'];

export const CARD_NAMES = {
  ember: ['Spark', 'Cinder', 'Bonfire', 'Wildfire', 'Pyre', 'Inferno', 'Cinder Surge'],
  grove: ['Sprout', 'Thicket', 'Bramble', 'Canopy', 'Overgrowth', 'Ancient Root', 'Wildbloom'],
  tide: ['Ripple', 'Stream', 'Current', 'Surge Tide', 'Maelstrom', 'Deep Mend', 'Abyssal Pull'],
  stone: ['Pebble', 'Cobble', 'Boulder', 'Monolith', 'Bedrock', 'Summit', 'Aegis Slab'],
};

// The ability a card carries, or null. Only the named cards have one.
export function cardAbility(suit, value) {
  if (suit === 'ember' && value === 8) return 'surge';
  if (suit === 'tide' && value === 7) return 'mend';
  if (suit === 'grove' && value === 8) return 'bloom';
  if (suit === 'stone') return 'ward';
  return null;
}

export function makeCard(suit, value) {
  const names = CARD_NAMES[suit];
  return {
    id: `${suit}-${value}`,
    suit,
    value,
    name: names[value - 2],
    ability: cardAbility(suit, value),
  };
}

// A fresh 28-card deck: values 2..8 in each of the four suits.
export function buildDeck() {
  const deck = [];
  for (const suit of SUIT_ORDER) {
    for (let value = 2; value <= 8; value++) deck.push(makeCard(suit, value));
  }
  return deck;
}

export function shuffleDeck(deck, random = Math.random) {
  const shuffled = deck.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Draw one card, reshuffling the discard pile when the deck runs out.
export function drawCard(state) {
  if (state.deck.length === 0) {
    state.deck = shuffleDeck(state.discard, state.random);
    state.discard.length = 0;
  }
  return state.deck.pop() ?? null;
}

export function suitBeats(attackerSuit, defenderSuit) {
  return SUITS[attackerSuit].beats === defenderSuit;
}
