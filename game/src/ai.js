// ai.js — Vex, the Ember Warden. An AI opponent you can read and counter.
//
// Vex has a readable personality: she favours Ember, she chases resonance,
// and she telegraphs. Before you pick your card she shows a "tell" — a
// hint of the suit she is leaning toward, right about 3 times in 4 — plus a
// line of table talk. Her pick is a real decision: she scores every card in
// her hand against your last played suit (she remembers your pattern and
// counters it), and usually plays her best, but one time in five she bluffs
// with a weak card to bait your big one.

import { effectivePower } from './rules.js';
import { SUITS, suitBeats } from './deck.js';

export const AI_NAME = 'Vex, the Ember Warden';

const TELLS = {
  ember: ['Vex drums her fingers — the braziers flare.', 'Vex is watching the flames.', 'Emberlight flickers across Vex’s grin.'],
  grove: ['Vex brushes a leaf from the table.', 'Vex hums a low, root-deep tune.', 'Vex’s eyes flick to the green felt.'],
  tide: ['Vex taps the table like falling rain.', 'Vex is listening to the water.', 'A cold draught crosses the table.'],
  stone: ['Vex folds her arms and goes very still.', 'Vex sets her jaw like granite.', 'Vex will not be moved.'],
};

const TAUNTS = [
  '“The pact is sealed. Play.”',
  '“I have read your hand already.”',
  '“Ember remembers every card you burn.”',
  '“Choose. The table is waiting.”',
];

export function aiTelegraph(state, random = Math.random) {
  // Vex leans toward a suit: her favourite (Ember) most, then the suit that
  // counters the player's last suit. The tell names that suit — but she
  // bluffs one time in four, showing a different suit instead.
  const last = state.player.lastSuit;
  let lean = 'ember';
  if (last && random() < 0.55) {
    lean = Object.keys(SUITS).find((s) => suitBeats(s, last)) ?? 'ember';
  } else if (random() < 0.35) {
    lean = ['grove', 'tide', 'stone'][Math.floor(random() * 3)];
  }
  const shown = random() < 0.75 ? lean : ['ember', 'grove', 'tide', 'stone'][Math.floor(random() * 4)];
  return {
    suit: shown,
    truthful: shown === lean,
    line: TELLS[shown][Math.floor(random() * TELLS[shown].length)],
    taunt: TAUNTS[Math.floor(random() * TAUNTS.length)],
  };
}

// Score one of Vex's cards against the player's last suit and the player's
// hand size: she prefers winning clashes, loves advantage and resonance,
// keeps a Ward for when she expects a big hit, and spends Surge only when
// she can finish or when she is far ahead on Flame.
export function scoreAiCard(card, state) {
  const foeSuit = state.player.lastSuit;
  let score = card.value * 2;
  if (foeSuit && suitBeats(card.suit, foeSuit)) score += 9; // counter the player's pattern
  if (state.ai.lastSuit === card.suit) score += 5; // resonance
  if (card.ability === 'ward') score += state.player.damageDealt > 12 ? 6 : 2;
  if (card.ability === 'mend' && state.ai.flame <= 14) score += 8;
  if (card.ability === 'bloom') score += 3;
  if (card.ability === 'surge') {
    score += state.ai.flame <= 6 ? 10 : state.player.flame <= 8 ? 8 : 1;
    if (state.ai.flame <= 4) score -= 6; // too costly when nearly out
  }
  // Don't waste the big card on a round the player is likely to Ward.
  if (state.player.lastSuit === 'stone') score -= card.value;
  return score;
}

export function chooseAiCard(state, random = Math.random) {
  const hand = state.ai.hand;
  if (hand.length === 0) return null;
  if (random() < 0.2) {
    // Bluff: play a weak card and let the player overcommit.
    const weakest = hand.slice().sort((a, b) => a.value - b.value)[0];
    return weakest;
  }
  let best = hand[0];
  let bestScore = -Infinity;
  for (const card of hand) {
    const s = scoreAiCard(card, state) + random() * 2; // a little jitter
    if (s > bestScore) { bestScore = s; best = card; }
  }
  return best;
}

// A cheap preview of what a card would do, for the renderer's tooltips.
export function previewPower(card, state) {
  const foe = state.player.hand[0] ?? null;
  return effectivePower(card, state.ai.lastSuit, foe);
}
